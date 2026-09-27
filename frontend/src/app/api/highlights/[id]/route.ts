import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    await prisma.highlight.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    if (existing.userId !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    const body = await request.json();
    const { color } = body;
    
    if (!color) {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }
    
    const highlight = await prisma.highlight.update({
      where: { id },
      data: { color }
    });
    
    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Failed to update highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
