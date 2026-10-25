import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteMemoryChat, isValidDbId, updateMemoryChatTitle } from '@/lib/memoryChatStore';
import { ownsChat, resolveChatIdentity } from '@/lib/chatIdentity';

type Context = { params: Promise<{ id: string }> };

async function authorizedChat(req: Request, rawId: string) {
  const identity = await resolveChatIdentity(req);
  let chatId = Number(rawId);
  if (!isValidDbId(chatId) && typeof chatId === 'number' && chatId > 0) {
    chatId = (chatId % 2000000000) + 1;
  }
  if (!isValidDbId(chatId) || !(await ownsChat(identity, chatId))) return null;
  return { identity, chatId };
}

export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizedChat(req, id);
  if (!access) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
  const { identity, chatId } = access;

  if (identity.kind === 'user' && process.env.DATABASE_URL) {
    try {
      await prisma.chat.deleteMany({ where: { id: chatId, userId: identity.userId } });
    } catch (error) {
      console.warn('Prisma chat delete failed; deleting owner-scoped memory fallback:', error);
    }
  }
  deleteMemoryChat(identity.ownerKey, chatId);
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizedChat(req, id);
  if (!access) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const title = (body as { title?: unknown })?.title;
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return NextResponse.json({ error: 'Title must be between 1 and 200 characters.' }, { status: 400 });
  }

  const { identity, chatId } = access;
  updateMemoryChatTitle(identity.ownerKey, chatId, title.trim());
  if (identity.kind === 'user' && process.env.DATABASE_URL) {
    try {
      const updated = await prisma.chat.updateMany({
        where: { id: chatId, userId: identity.userId },
        data: { title: title.trim() },
      });
      if (updated.count > 0) {
        const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: identity.userId } });
        if (chat) return NextResponse.json(chat);
      }
    } catch (error) {
      console.warn('Prisma chat update failed; updated owner-scoped memory fallback:', error);
    }
  }
  return NextResponse.json({ id: chatId, title: title.trim() });
}
