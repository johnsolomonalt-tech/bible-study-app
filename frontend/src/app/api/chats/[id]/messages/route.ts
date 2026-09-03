import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Best available models as of September 2026
const CHAT_MODEL = 'gemini-3.8-flash';          // Latest stable Flash — best for chat + vision
const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image'; // Nano Banana 2 — stable image generation

const SYSTEM_INSTRUCTION = "You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and answer theological questions thoughtfully. You can also generate images when asked — just let the system handle that. STRICT RULES: Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app.";

// Keywords that suggest the user wants an image generated
const IMAGE_GEN_KEYWORDS = [
  'draw', 'generate an image', 'create an image', 'make an image', 'paint',
  'illustrate', 'visualize', 'show me a picture', 'create a picture',
  'generate a picture', 'make a picture', 'create a visual', 'depict',
  'render', 'generate art', 'create art', 'make art', 'imagine',
  'show me what', 'generate a photo', 'create a photo', 'make a photo'
];

function isImageGenerationRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return IMAGE_GEN_KEYWORDS.some(kw => lower.includes(kw));
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
    try {
      const imgResponse = await ai.models.generateContent({
        model: IMAGE_GEN_MODEL,
        contents: `You are a Bible-themed image generator. Generate a beautiful, reverent, artistic image for this request: ${content}. Keep the content family-friendly and spiritually appropriate.`,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

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

      // Build the AI message content — embed a special marker the frontend can parse
      const aiContent = generatedImageBase64
        ? `__GENERATED_IMAGE__${generatedImageBase64}__END_IMAGE__${textResponse ? `\n\n${textResponse}` : ''}`
        : textResponse || "I wasn't able to generate that image. Please try a different description.";

      const aiMessage = await prisma.message.create({
        data: {
          content: aiContent,
          role: 'model',
          chatId,
        },
      });

      return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
    } catch (err) {
      console.error('Image generation failed, falling back to text:', err);
      // Fall through to normal text response
    }
  }

  // --- Route: Normal Text / Vision Response ---
  const pastMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });

  const history = pastMessages
    .filter(m => m.id !== userMessage.id)
    // Strip generated image markers from history so the model doesn't get confused
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

  // Use @google/genai for the chat session with the latest model
  const chatSession = ai.chats.create({
    model: CHAT_MODEL,
    history,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  const result = await chatSession.sendMessage({ message: messageParts });
  const aiResponseText = result.text ?? '';

  const aiMessage = await prisma.message.create({
    data: {
      content: aiResponseText,
      role: 'model',
      chatId,
    },
  });

  return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
}
