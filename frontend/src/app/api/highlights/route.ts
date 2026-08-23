import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');
  
  if (!book || !chapter) {
    return NextResponse.json({ error: 'Book and chapter are required' }, { status: 400 });
  }
  
  try {
    const highlights = await prisma.highlight.findMany({
      where: {
        userId: 'legacy',
        book,
        chapter: parseInt(chapter, 10),
      }
    });
    return NextResponse.json(highlights);
  } catch (error) {
    console.error('Failed to fetch highlights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book, chapter, verse, text, color } = body;
    
    if (!book || !chapter || !verse || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const highlight = await prisma.highlight.create({
      data: {
        userId: 'legacy',
        book,
        chapter: parseInt(chapter, 10),
        verse: parseInt(verse, 10),
        text: text || '',
        color
      }
    });
    
    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Failed to create highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
