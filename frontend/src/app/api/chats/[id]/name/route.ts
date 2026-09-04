import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const NAME_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

function isRetryable(e: unknown): boolean {
  try {
    const code = JSON.parse((e as Error).message)?.error?.code;
    return code === 503 || code === 429;
  } catch { return false; }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chatId = parseInt(id);
  const { userMessage } = await req.json();

  const chat = await prisma.chat.findUnique({ where: { id: chatId, userId } });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  try {
    let title = '';
    for (const model of NAME_MODELS) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: `Generate a very short, concise title (3-6 words max) for a Bible study conversation that started with this message: "${userMessage}". Only return the title itself, no quotes, no punctuation at the end, no extra text.`,
        });
        title = (result.text ?? '').trim().replace(/^["']|["']$/g, '');
        break;
      } catch (e) {
        if (!isRetryable(e)) throw e;
        console.warn(`Name model ${model} unavailable, trying next...`);
      }
    }

    const updated = await prisma.chat.update({
      where: { id: chatId, userId },
      data: { title: title || 'New Conversation' }
    });

    return NextResponse.json({ title: updated.title });
  } catch (error) {
    console.error('Auto-naming failed:', error);
    return NextResponse.json({ title: 'New Conversation' });
  }
}
