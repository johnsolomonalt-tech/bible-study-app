const fs = require('fs');
const path = require('path');

const routes = {
  'src/app/api/notes/route.ts': `
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { title, content } = await req.json();
  const note = await prisma.note.create({
    data: {
      userId,
      title: title || 'Untitled Note',
      content: content || '',
    },
  });
  return NextResponse.json(note, { status: 201 });
}
  `,
  'src/app/api/notes/[id]/route.ts': `
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { title, content } = await req.json();
  const note = await prisma.note.update({
    where: { id: parseInt(params.id), userId },
    data: { title, content },
  });
  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  await prisma.note.delete({
    where: { id: parseInt(params.id), userId },
  });
  return NextResponse.json({ success: true });
}
  `,
  'src/app/api/tracker/route.ts': `
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const records = await prisma.tracker.findMany({
    where: { userId },
    orderBy: { chapterId: 'asc' }
  });
  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { chapterId } = await req.json();
  
  const existing = await prisma.tracker.findUnique({
    where: { userId_chapterId: { userId, chapterId } }
  });
  
  if (existing) {
    await prisma.tracker.delete({ where: { userId_chapterId: { userId, chapterId } } });
    return NextResponse.json({ deleted: true });
  } else {
    const record = await prisma.tracker.create({
      data: { userId, chapterId }
    });
    return NextResponse.json(record, { status: 201 });
  }
}
  `,
  'src/app/api/chats/route.ts': `
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
  `,
  'src/app/api/chats/[id]/route.ts': `
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chat = await prisma.chat.findUnique({
    where: { id: parseInt(params.id), userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  await prisma.message.deleteMany({
    where: { chatId: parseInt(params.id) },
  });

  await prisma.chat.delete({
    where: { id: parseInt(params.id), userId },
  });
  return NextResponse.json({ success: true });
}
  `,
  'src/app/api/chats/[id]/messages/route.ts': `
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chat = await prisma.chat.findUnique({
    where: { id: parseInt(params.id), userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const messages = await prisma.message.findMany({
    where: { chatId: parseInt(params.id) },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chatId = parseInt(params.id);
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

  const chatSession = model.startChat({ history });
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
  `
};

Object.entries(routes).forEach(([filepath, content]) => {
  const fullpath = path.resolve(filepath);
  fs.mkdirSync(path.dirname(fullpath), { recursive: true });
  fs.writeFileSync(fullpath, content.trim() + '\n');
});
