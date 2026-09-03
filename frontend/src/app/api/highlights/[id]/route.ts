import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    await prisma.highlight.delete({
      where: {
        id,
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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
