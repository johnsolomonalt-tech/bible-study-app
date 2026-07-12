import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { title, content } = await req.json();
  const note = await prisma.note.update({
    where: { id: parseInt(id), userId },
    data: { title, content },
  });
  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  await prisma.note.delete({
    where: { id: parseInt(id), userId },
  });
  return NextResponse.json({ success: true });
}
