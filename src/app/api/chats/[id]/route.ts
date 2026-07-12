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
