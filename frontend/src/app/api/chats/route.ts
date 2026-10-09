import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// In-memory fallback for local/guest users or when Prisma/database is not configured
const memoryChats = new Map<string, any[]>();

export async function GET() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const effectiveUserId = userId || 'guest_user';

  if (userId && process.env.DATABASE_URL) {
    try {
      const chats = await prisma.chat.findMany({
        where: { userId },
        include: { messages: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(chats);
    } catch (error) {
      console.warn('Prisma unavailable, using in-memory chat fallback:', error);
    }
  }

  const list = memoryChats.get(effectiveUserId) || [];
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const effectiveUserId = userId || 'guest_user';
  let title = 'New Chat';
  try {
    const body = await req.json();
    if (body?.title) title = body.title;
  } catch {}

  if (userId && process.env.DATABASE_URL) {
    try {
      const chat = await prisma.chat.create({
        data: {
          userId,
          title,
        },
        include: { messages: true }
      });
      return NextResponse.json(chat, { status: 201 });
    } catch (error) {
      console.warn('Prisma chat create failed, falling back to in-memory:', error);
    }
  }

  const guestChat = {
    id: Date.now(),
    userId: effectiveUserId,
    title,
    createdAt: new Date().toISOString(),
    messages: []
  };

  const current = memoryChats.get(effectiveUserId) || [];
  memoryChats.set(effectiveUserId, [guestChat, ...current]);

  return NextResponse.json(guestChat, { status: 201 });
}
