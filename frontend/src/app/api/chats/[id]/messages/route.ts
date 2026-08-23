import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

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
  const { content } = await req.json();

  const chat = await prisma.chat.findUnique({
    where: { id: chatId, userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const userMessage = await prisma.message.create({
    data: {
      content,
      role: 'user',
      chatId,
    },
  });

  const pastMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });

  const history = pastMessages
    .filter(m => m.id !== userMessage.id)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

  const chatSession = model.startChat({ 
    history,
    systemInstruction: { parts: [{ text: "You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and answer theological questions thoughtfully. STRICT RULES: Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app." }] }
  });
  const result = await chatSession.sendMessage(content);
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
