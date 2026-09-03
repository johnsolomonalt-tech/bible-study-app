import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chatId = parseInt(id);
  const { userMessage } = await req.json();

  const chat = await prisma.chat.findUnique({ where: { id: chatId, userId } });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  try {
    const result = await model.generateContent(
      `Generate a very short, concise title (3-6 words max) for a Bible study conversation that started with this message: "${userMessage}". 
      Only return the title itself, no quotes, no punctuation at the end, no extra text.`
    );
    const title = result.response.text().trim().replace(/^["']|["']$/g, '');

    const updated = await prisma.chat.update({
      where: { id: chatId, userId },
      data: { title }
    });

    return NextResponse.json({ title: updated.title });
  } catch (error) {
    console.error('Auto-naming failed:', error);
    return NextResponse.json({ title: 'New Conversation' });
  }
}
