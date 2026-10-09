import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { recordAnalyticsEvent } from '@/lib/analyticsService';

import { findCanonicalBook } from '@/lib/bibleCanon';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');
  
  try {
    const where: any = { userId };
    if (book) {
      const bookMeta = findCanonicalBook(book);
      const possibleBooks = bookMeta 
        ? Array.from(new Set([book, bookMeta.name, bookMeta.code, ...bookMeta.aliases]))
        : [book];
      where.OR = possibleBooks.map(b => ({
        book: {
          equals: b,
          mode: 'insensitive',
        }
      }));
    }
    if (chapter) {
      where.chapter = parseInt(chapter, 10);
    }

    const highlights = await prisma.highlight.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(highlights);
  } catch (error) {
    console.error('Failed to fetch highlights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { book, chapter, verse, text, color } = body;
    
    if (!book || !chapter || !verse || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numChapter = parseInt(chapter, 10);
    const numVerse = parseInt(verse, 10);
    const bookMeta = findCanonicalBook(book);
    const bookNames = bookMeta 
      ? Array.from(new Set([book, bookMeta.name, bookMeta.code, ...bookMeta.aliases]))
      : [book];

    // Find any existing highlights for this user on the same book, chapter, and verse
    const existing = await prisma.highlight.findMany({
      where: {
        userId,
        chapter: numChapter,
        verse: numVerse,
        OR: bookNames.map(b => ({
          book: { equals: b, mode: 'insensitive' }
        }))
      }
    });

    const newNorm = (text || '').toLowerCase().trim();

    // Clean up any existing highlights that are identical or superseded/overlapping
    const toDeleteIds: number[] = [];
    for (const ex of existing) {
      const exNorm = (ex.text || '').toLowerCase().trim();
      if (exNorm === newNorm || exNorm.includes(newNorm) || newNorm.includes(exNorm)) {
        toDeleteIds.push(ex.id);
      }
    }

    if (toDeleteIds.length > 0) {
      await prisma.highlight.deleteMany({
        where: { id: { in: toDeleteIds } }
      });
    }
    
    const highlight = await prisma.highlight.create({
      data: {
        userId,
        book,
        chapter: numChapter,
        verse: numVerse,
        text: text || '',
        color
      }
    });
    
    recordAnalyticsEvent('highlight_created', userId, { feature: 'highlights', mode: color }).catch(() => {});

    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    console.error('Failed to create highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const ids = searchParams.get('ids');
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');
  const verse = searchParams.get('verse');

  try {
    if (ids) {
      const idList = ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n < 1000000000000);
      if (idList.length > 0) {
        await prisma.highlight.deleteMany({
          where: {
            userId,
            id: { in: idList }
          }
        });
      }
      return NextResponse.json({ success: true });
    }

    if (id) {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId) && parsedId < 1000000000000) {
        await prisma.highlight.deleteMany({
          where: {
            userId,
            id: parsedId
          }
        });
      }
      return NextResponse.json({ success: true });
    }

    if (book && chapter && verse) {
      const numChapter = parseInt(chapter, 10);
      const numVerse = parseInt(verse, 10);
      const bookMeta = findCanonicalBook(book);
      const possibleBooks = bookMeta 
        ? Array.from(new Set([book, bookMeta.name, bookMeta.code, ...bookMeta.aliases]))
        : [book];

      await prisma.highlight.deleteMany({
        where: {
          userId,
          chapter: numChapter,
          verse: numVerse,
          OR: possibleBooks.map(b => ({
            book: { equals: b, mode: 'insensitive' }
          }))
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing criteria for deletion' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete highlights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
