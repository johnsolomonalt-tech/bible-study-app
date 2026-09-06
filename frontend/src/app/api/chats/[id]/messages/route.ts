import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Ordered fallback chain — newest first. On 503/overload we try the next one.
const CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

// Image gen model — Nano Banana 2, fall back to 2.5-flash-image
const IMAGE_GEN_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const SYSTEM_INSTRUCTION = "You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and act as a guide through Christianity. STRICT RULES: Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app. IMPORTANT THEOLOGICAL GUIDELINES: You are specifically a Christian guide. If a user asks you for reasons to believe in other religions (like Islam, the Quran, Hinduism, Buddhism, etc.), you must politely decline and state that your purpose is to guide them through Christianity and the Bible. Do not defend, promote, or provide apologetics for other religions. Keep all answers firmly rooted in a Christian perspective.";

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
      const pixazoKey = process.env.PIXAZO_API_KEY;
      
      if (!pixazoKey) {
        // Fallback message if no API key is provided
        const aiMessage = await prisma.message.create({
          data: {
            content: "Image generation requires a Pixazo API key. Please add PIXAZO_API_KEY to your environment variables to enable Flux image generation.\n\nI can still help with Bible study — just ask me any question about scripture!",
            role: 'model',
            chatId,
          },
        });
        return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
      }

      // 0. Verify if the image request is related to the Bible/Christianity
      const validationResponse = await withModelFallback(CHAT_MODELS, (model) =>
        ai.models.generateContent({
          model,
          contents: `Does the following image request relate to the Bible, Christianity, or biblical history/theology? Respond strictly with "YES" or "NO".\n\nRequest: "${content}"`,
          config: { temperature: 0.1 }
        })
      );
      
      const isBibleRelatedText = validationResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';
      const isBibleRelated = isBibleRelatedText.includes('YES');
      
      if (!isBibleRelated) {
        const aiMessage = await prisma.message.create({
          data: {
            content: "I'd love to help, but I can only generate images that are related to the Bible, Christianity, or biblical history. Please feel free to ask for any scriptural scenes or theological illustrations!",
            role: 'model',
            chatId,
          },
        });
        return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
      }

      // 1. Call Pixazo API for image generation
      const prompt = `A beautiful, reverent, artistic Bible-themed image: ${content}`;
      const pixazoRes = await fetch('https://gateway.pixazo.ai/flux-1-schnell/v1/getData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Ocp-Apim-Subscription-Key': pixazoKey,
        },
        body: JSON.stringify({
          prompt: prompt,
          num_steps: 4,
          height: 512,
          width: 512,
          seed: Math.floor(Math.random() * 100000)
        })
      });

      if (!pixazoRes.ok) {
        throw new Error(`Pixazo API Error: ${pixazoRes.status} ${pixazoRes.statusText}`);
      }

      const data = await pixazoRes.json();
      const imageUrl = data.output;
      
      if (!imageUrl) {
        throw new Error("No output URL returned from Pixazo API");
      }

      // 2. Fetch the actual image from the returned URL to convert to base64
      const imageFetchRes = await fetch(imageUrl);
      if (!imageFetchRes.ok) {
         throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
      }
      
      const imageBuffer = await imageFetchRes.arrayBuffer();
      const generatedImageBase64 = Buffer.from(imageBuffer).toString('base64');
      const textResponse = "Here is the image you requested.";

      const aiContent = `__GENERATED_IMAGE__${generatedImageBase64}__END_IMAGE__\n\n${textResponse}`;

      const aiMessage = await prisma.message.create({
        data: { content: aiContent, role: 'model', chatId },
      });

      imageGenSucceeded = true;
      return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
    } catch (err: unknown) {
      console.error('Image generation failed, falling back to text:', err);
      // Fall through to normal text response if anything fails
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
