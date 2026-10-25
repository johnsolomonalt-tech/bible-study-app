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
    const body = await req.json();

    // Support batch chapter operations (e.g. mark/unmark all chapters of a book in one click)
    if (Array.isArray(body?.chapterIds)) {
      const validIds = body.chapterIds
        .filter((id: unknown): id is string => typeof id === 'string' && id.length <= 50 && /^[1-3]?[A-Za-z ]+-\d+$/.test(id));

      if (validIds.length === 0) {
        return NextResponse.json({ error: 'No valid chapter IDs provided' }, { status: 400 });
      }

      const action = body.action === 'unmark' ? 'unmark' : 'mark';
      if (action === 'unmark') {
        await prisma.tracker.deleteMany({
          where: { userId, chapterId: { in: validIds } }
        });
        return NextResponse.json({ success: true, count: validIds.length, action: 'unmark' });
      } else {
        const data = validIds.map((chapterId: string) => ({ userId, chapterId }));
        await prisma.tracker.createMany({
          data,
          skipDuplicates: true
        });
        return NextResponse.json({ success: true, count: validIds.length, action: 'mark' });
      }
    }

    const chapterId = typeof body?.chapterId === 'string' ? body.chapterId.trim() : '';

    if (!chapterId || chapterId.length > 50 || !/^[1-3]?[A-Za-z ]+-\d+$/.test(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapterId format. Expected {Book}-{Chapter}' }, { status: 400 });
    }

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
