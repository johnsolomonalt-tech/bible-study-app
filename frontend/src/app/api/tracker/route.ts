import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const records = await prisma.tracker.findMany({
      where: { userId },
      orderBy: { chapterId: 'asc' }
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('Failed to fetch tracker records:', error);
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { chapterId } = await req.json();
    
    const existing = await prisma.tracker.findUnique({
      where: { userId_chapterId: { userId, chapterId } }
    });
    
    if (existing) {
      await prisma.tracker.delete({ where: { userId_chapterId: { userId, chapterId } } });
      return NextResponse.json({ deleted: true });
    } else {
      const record = await prisma.tracker.create({
        data: { userId, chapterId }
      });
      return NextResponse.json(record, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to update tracker:', error);
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }
}
