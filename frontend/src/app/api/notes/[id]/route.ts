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

  const effectiveUserId = userId || 'guest_user';
  const numId = parseInt(id, 10);

  try {
    const { title, content } = await req.json();

    if (userId && process.env.DATABASE_URL && !isNaN(numId) && numId <= 2147483647) {
      try {
        const note = await prisma.note.update({
          where: { id: numId, userId },
          data: { title, content },
        });
        return NextResponse.json(note);
      } catch (dbErr) {
        console.warn('Prisma updateNote failed, falling back to in-memory:', dbErr);
      }
    }

    const updated = updateMemoryNote(effectiveUserId, numId, { title, content });
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

  const effectiveUserId = userId || 'guest_user';
  const numId = parseInt(id, 10);

  try {
    if (userId && process.env.DATABASE_URL && !isNaN(numId) && numId <= 2147483647) {
      try {
        await prisma.note.delete({
          where: { id: numId, userId },
        });
        return NextResponse.json({ success: true });
      } catch (dbErr) {
        console.warn('Prisma deleteNote failed, falling back to in-memory:', dbErr);
      }
    }

    deleteMemoryNote(effectiveUserId, numId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
