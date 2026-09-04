import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Ordered fallback chain — newest first. On 503/overload we try the next one.
const CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

// Image gen model — Nano Banana 2, fall back to 2.5-flash-image
const IMAGE_GEN_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const SYSTEM_INSTRUCTION = "You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and answer theological questions thoughtfully. STRICT RULES: Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app.";

// Keywords that suggest the user wants an image generated
const IMAGE_GEN_KEYWORDS = [
  'draw', 'generate an image', 'create an image', 'make an image', 'paint',
  'illustrate', 'visualize', 'show me a picture', 'create a picture',
  'generate a picture', 'make a picture', 'create a visual', 'depict',
  'render', 'generate art', 'create art', 'make art',
  'show me what', 'generate a photo', 'create a photo', 'make a photo'
];

function isImageGenerationRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return IMAGE_GEN_KEYWORDS.some(kw => lower.includes(kw));
}

/** Returns true for errors that mean "model is busy, retry with next one" */
function isRetryable(e: unknown): boolean {
  try {
    const msg = (e as Error).message || '';
    const code = JSON.parse(msg)?.error?.code;
    // 503 = UNAVAILABLE (overloaded), 429 = RESOURCE_EXHAUSTED (quota)
    return code === 503 || code === 429;
  } catch {
    return false;
  }
}

/** Run fn against each model in the chain until one succeeds */
async function withModelFallback<T>(
  models: string[],
  fn: (model: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (e) {
      lastError = e;
      if (!isRetryable(e)) throw e; // non-retryable — bubble immediately
      console.warn(`Model ${model} unavailable, trying next...`);
    }
  }
  throw lastError;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chat = await prisma.chat.findUnique({
    where: { id: parseInt(id), userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const messages = await prisma.message.findMany({
    where: { chatId: parseInt(id) },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chatId = parseInt(id);
  const { content, image } = await req.json();

  const chat = await prisma.chat.findUnique({
    where: { id: chatId, userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const userMessage = await prisma.message.create({
    data: {
      content: content || '',
      role: 'user',
      chatId,
    },
  });

  // --- Route: Image Generation ---
  if (isImageGenerationRequest(content) && !image) {
    let imageGenSucceeded = false;
    try {
      const imgResponse = await withModelFallback(IMAGE_GEN_MODELS, (model) =>
        ai.models.generateContent({
          model,
          contents: `You are a Bible-themed image generator. Generate a beautiful, reverent, artistic image for this request: ${content}. Keep the content family-friendly and spiritually appropriate.`,
          config: { responseModalities: ['IMAGE', 'TEXT'] },
        })
      );

      let generatedImageBase64: string | null = null;
      let textResponse = '';

      const parts = imgResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
        } else if (part.text) {
          textResponse += part.text;
        }
      }

      const aiContent = generatedImageBase64
        ? `__GENERATED_IMAGE__${generatedImageBase64}__END_IMAGE__${textResponse ? `\n\n${textResponse}` : ''}`
        : textResponse || "I wasn't able to generate that image. Please try a different description.";

      const aiMessage = await prisma.message.create({
        data: { content: aiContent, role: 'model', chatId },
      });

      imageGenSucceeded = true;
      return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
    } catch (err: unknown) {
      // Check if this is a quota/billing error
      let isQuotaError = false;
      try { isQuotaError = JSON.parse((err as Error).message)?.error?.code === 429; } catch {}

      if (isQuotaError && !imageGenSucceeded) {
        // Image generation needs a paid API key — return a helpful message
        const aiMessage = await prisma.message.create({
          data: {
            content: "Image generation requires a paid API plan and isn't enabled on this account yet.\n\nI can still help with Bible study — just ask me any question about scripture!",
            role: 'model',
            chatId,
          },
        });
        return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
      }

      console.error('Image generation failed, falling back to text:', err);
      // Fall through to normal text response for non-quota errors
    }
  }

  // --- Route: Normal Text / Vision Response ---
  const pastMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });

  const history = pastMessages
    .filter(m => m.id !== userMessage.id)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content.replace(/__GENERATED_IMAGE__[\s\S]*?__END_IMAGE__/g, '[generated image]') }],
    }));

  // Build current message parts — support optional inline image
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const messageParts: Part[] = [];
  if (image?.base64 && image?.mimeType) {
    messageParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  messageParts.push({ text: content || 'Please describe this image in the context of Bible study.' });

  const aiResponseText = await withModelFallback(CHAT_MODELS, async (model) => {
    const chatSession = ai.chats.create({
      model,
      history,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    const result = await chatSession.sendMessage({ message: messageParts });
    return result.text ?? '';
  });

  const aiMessage = await prisma.message.create({
    data: { content: aiResponseText, role: 'model', chatId },
  });

  return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
}
