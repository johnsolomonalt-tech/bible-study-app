import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

// New SDK for image generation
const genAINew = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
      const imgResponse = await genAINew.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
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

  const chatSession = model.startChat({ 
    history,
    systemInstruction: { role: 'system', parts: [{ text: "You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and answer theological questions thoughtfully. You can also generate images when asked — just let the system handle that. STRICT RULES: Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app." }] }
  });

  // Build message parts — support optional inline image
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const messageParts: Part[] = [];
  if (image?.base64 && image?.mimeType) {
    messageParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  messageParts.push({ text: content || 'Please describe this image in the context of Bible study.' });

  const result = await chatSession.sendMessage(messageParts);
  const aiResponseText = result.response.text();

  const aiMessage = await prisma.message.create({
    data: {
      content: aiResponseText,
      role: 'model',
      chatId,
    },
  });

  return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
}
