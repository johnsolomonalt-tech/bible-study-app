import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMemoryChats, addMemoryChat } from '@/lib/memoryChatStore';
import { createGuestChatSession, createGuestChatToken, GUEST_CHAT_COOKIE, resolveChatIdentity } from '@/lib/chatIdentity';
import { randomInt } from 'node:crypto';

export async function GET(req: Request) {
  const identity = await resolveChatIdentity(req);
  const userId = identity?.userId || null;

  // Unauthenticated guests maintain local state on their device; do not leak shared server state
  if (!userId) {
    return NextResponse.json([]);
  }

  if (process.env.DATABASE_URL) {
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

  const list = getMemoryChats(identity?.ownerKey || `user:${userId}`);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const identity = await resolveChatIdentity(req);
  const userId = identity?.userId || null;

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

  let ownerKey = identity?.ownerKey;
  let guestSession: string | null = null;
  if (!userId && !ownerKey) {
    guestSession = createGuestChatSession();
    if (!guestSession) {
      return NextResponse.json({ error: 'Guest chat sessions are unavailable until GUEST_CHAT_SECRET is configured.' }, { status: 503 });
    }
    // The key is signed and verified on every subsequent request.
    const sessionId = guestSession.slice(0, guestSession.lastIndexOf('.'));
    ownerKey = `guest:${sessionId}`;
  }

  const clientChat = {
    id: randomInt(1, 2147483647),
    userId: userId || 'guest',
    title,
    createdAt: new Date().toISOString(),
    messages: []
  };

  addMemoryChat(ownerKey || `user:${userId}`, clientChat);

  const response = NextResponse.json({
    ...clientChat,
    ...(!userId ? { guestChatToken: createGuestChatToken(ownerKey!, clientChat.id) } : {}),
  }, { status: 201 });
  if (guestSession) {
    response.cookies.set(GUEST_CHAT_COOKIE, guestSession, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
