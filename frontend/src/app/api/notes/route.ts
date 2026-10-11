import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMemoryNotes, addMemoryNote } from '@/lib/memoryNoteStore';

export async function GET() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const effectiveUserId = userId || 'guest_user';

  if (userId && process.env.DATABASE_URL) {
    try {
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(notes);
    } catch (error) {
      console.warn('Prisma unavailable, using in-memory notes fallback:', error);
    }
  }

  const list = getMemoryNotes(effectiveUserId);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const effectiveUserId = userId || 'guest_user';
  let title = 'Untitled Note';
  let content = '';

  try {
    const body = await req.json();
    if (body?.title) title = body.title;
    if (body?.content) content = body.content;
  } catch {}

  if (userId && process.env.DATABASE_URL) {
    try {
      const note = await prisma.note.create({
        data: {
          userId,
          title,
          content,
        },
      });
      return NextResponse.json(note, { status: 201 });
    } catch (error) {
      console.warn('Prisma note create failed, falling back to in-memory:', error);
    }
  }

  const newNote = {
    id: Date.now(),
    userId: effectiveUserId,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  addMemoryNote(effectiveUserId, newNote);
  return NextResponse.json(newNote, { status: 201 });
}
