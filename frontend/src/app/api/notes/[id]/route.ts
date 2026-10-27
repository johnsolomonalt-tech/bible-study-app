import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateMemoryNote, deleteMemoryNote } from '@/lib/memoryNoteStore';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const numId = parseInt(id, 10);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(numId) || numId < 1) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  try {
    let body;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        (body.title !== undefined && typeof body.title !== 'string') ||
        (body.content !== undefined && typeof body.content !== 'string')) {
      return NextResponse.json({ error: 'Title and content must be strings.' }, { status: 400 });
    }
    const { title, content } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Sign in required to update notes.' }, { status: 401 });
    }

    if (process.env.DATABASE_URL && numId <= 2147483647) {
      try {
        const note = await prisma.note.update({
          where: { id: numId, userId },
          data: { title, content },
        });
        return NextResponse.json(note);
      } catch (dbErr: any) {
        if (dbErr?.code === 'P2025') {
          return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
        }
        console.error('Prisma updateNote error:', dbErr);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }

    const updated = updateMemoryNote(userId, numId, { title, content });
    if (updated) {
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
  } catch (error) {
    console.error('Failed to update note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {}

  const numId = parseInt(id, 10);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(numId) || numId < 1) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Sign in required to delete notes.' }, { status: 401 });
    }

    if (process.env.DATABASE_URL && numId <= 2147483647) {
      try {
        await prisma.note.delete({
          where: { id: numId, userId },
        });
        return NextResponse.json({ success: true });
      } catch (dbErr: any) {
        if (dbErr?.code === 'P2025') {
          return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
        }
        console.error('Prisma deleteNote error:', dbErr);
        return NextResponse.json({ error: 'Database delete failed' }, { status: 500 });
      }
    }

    deleteMemoryNote(userId, numId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
