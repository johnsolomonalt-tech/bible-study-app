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
