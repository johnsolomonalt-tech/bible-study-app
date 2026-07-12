import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chats = await prisma.chat.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(chats);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { title } = await req.json();
  const chat = await prisma.chat.create({
    data: {
      userId,
      title: title || 'New Chat',
    },
    include: { messages: true }
  });
  return NextResponse.json(chat, { status: 201 });
}
