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

  // Unauthenticated guests maintain local state on their device; do not leak shared server state
  if (!userId) {
    return NextResponse.json([]);
  }

  if (process.env.DATABASE_URL) {
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

  const list = getMemoryNotes(userId);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. Sign in required to save notes to cloud.' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      (body.title !== undefined && typeof body.title !== 'string') ||
      (body.content !== undefined && typeof body.content !== 'string')) {
    return NextResponse.json({ error: 'Title and content must be strings.' }, { status: 400 });
  }
  const title = body.title || 'Untitled Note';
  const content = body.content || '';

  if (process.env.DATABASE_URL) {
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

  const clientNote = {
    id: Date.now(),
    userId,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  addMemoryNote(userId, clientNote);

  return NextResponse.json(clientNote, { status: 201 });
}
