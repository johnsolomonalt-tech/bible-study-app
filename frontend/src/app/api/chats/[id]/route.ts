import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidDbId, deleteMemoryChat, updateMemoryChatTitle } from '@/lib/memoryChatStore';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id) || 0;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  deleteMemoryChat(numId);

  if (userId && process.env.DATABASE_URL && isValidDbId(numId)) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: numId, userId }
      });
      if (chat) {
        await prisma.message.deleteMany({
          where: { chatId: numId },
        });
        await prisma.chat.delete({
          where: { id: numId, userId },
        });
      }
    } catch (err) {
      console.warn('Prisma chat delete failed:', err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id) || 0;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const { title } = await req.json();
  updateMemoryChatTitle(numId, title);

  if (userId && process.env.DATABASE_URL && isValidDbId(numId)) {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: numId, userId }
      });
      if (chat) {
        const updatedChat = await prisma.chat.update({
          where: { id: numId, userId },
          data: { title },
        });
        return NextResponse.json(updatedChat);
      }
    } catch (err) {
      console.warn('Prisma chat update failed:', err);
    }
  }

  return NextResponse.json({ id: numId, title });
}
