import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Ordered fallback chain — fastest operational models prioritized
const CHAT_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];

// Image gen model — Nano Banana 2, fall back to 2.5-flash-image
const IMAGE_GEN_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const SYSTEM_INSTRUCTION = `You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and act as a guide through Christianity.

STRICT RULES:
1. Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app.
2. IMPORTANT THEOLOGICAL GUIDELINES: You are specifically a Christian guide. If a user asks you for reasons to believe in other religions (like Islam, the Quran, Hinduism, Buddhism, etc.), you must politely decline and state that your purpose is to guide them through Christianity and the Bible. Do not defend, promote, or provide apologetics for other religions. Keep all answers firmly rooted in a Christian perspective.

SCRIPTURE CITATION FORMATTING:
Whenever citing or referencing Bible passages or verses in your response, always cite them clearly in standard canonical book and chapter/verse notation (for example: **John 14:27**, **Romans 8:28**, **Genesis 1:1**, **Psalm 23:1**, **1 Corinthians 13:4-7**). Standard references are automatically converted into interactive links for the user to open and read directly in the application's Bible reader.

ORIGINAL LANGUAGE & ROOT WORD MANDATE:
Whenever a user asks a question about scripture, theology, biblical doctrines, Christian living, or Bible stories, in addition to providing your thorough biblical answer and relevant verses, you MUST always include the original Hebrew (for Old Testament concepts or texts) and/or Greek (for New Testament concepts or texts) root words.
For each key root word you introduce:
- Provide the original script (Hebrew characters e.g. חֶסֶד or Greek alphabet e.g. ἀγάπη).
- Provide the phonetic transliteration (e.g., *chesed*, *agape*, *shalom*, *logos*).
- Provide the Strong's Concordance reference number if available (e.g., Strong's H7965, Strong's G26).
- Explain its lexical and etymological meaning, showing how the original linguistic depth enriches the user's understanding of the biblical text or concept.
Blend these original language insights naturally and clearly into your response alongside scripture citations and practical applications.`;

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

/** Returns true for errors that mean "try next model in fallback chain" */
function isRetryable(e: unknown): boolean {
  try {
    const err = e as any;
    const status = err?.status || err?.statusCode;
    if (status === 503 || status === 429 || status === 404 || status === 500) return true;
    const msg = String(err?.message || '');
    if (
      msg.includes('503') || msg.includes('429') || msg.includes('404') || msg.includes('500') ||
      msg.includes('NOT_FOUND') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('overloaded') || msg.includes('quota') || msg.includes('rate limit') ||
      msg.includes('Model not found') || msg.includes('not supported')
    ) {
      return true;
    }
    const parsedCode = JSON.parse(msg)?.error?.code;
    return parsedCode === 503 || parsedCode === 429 || parsedCode === 404 || parsedCode === 500;
  } catch {
    return true;
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
