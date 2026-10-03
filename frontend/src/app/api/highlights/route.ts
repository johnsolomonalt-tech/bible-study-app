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
    
    const highlight = await prisma.highlight.create({
      data: {
        userId,
        book,
        chapter: parseInt(chapter, 10),
        verse: parseInt(verse, 10),
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
