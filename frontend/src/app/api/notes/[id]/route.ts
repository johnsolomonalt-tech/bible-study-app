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
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  try {
    const { title, content } = await req.json();

    if (!userId) {
      // Unauthenticated guests maintain notes in local browser storage
      return NextResponse.json({ id: numId, title, content, updatedAt: new Date().toISOString() });
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
    return NextResponse.json({ id: numId, title, content, updatedAt: new Date().toISOString() });
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
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  try {
    if (!userId) {
      return NextResponse.json({ success: true });
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
