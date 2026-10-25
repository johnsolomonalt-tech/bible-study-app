import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getLegalDocument, saveLegalDocument, LegalDocSlug } from '@/lib/legalContentStore';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const validSlugs: LegalDocSlug[] = ['privacy', 'terms', 'legal'];
  if (!validSlugs.includes(slug as LegalDocSlug)) {
    return NextResponse.json({ error: 'Legal document not found' }, { status: 404 });
  }

  const doc = getLegalDocument(slug as LegalDocSlug);
  return NextResponse.json(doc, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. Admin credentials required to modify legal terms.' }, { status: 401 });
  }

  const { slug } = await params;
  const validSlugs: LegalDocSlug[] = ['privacy', 'terms', 'legal'];
  if (!validSlugs.includes(slug as LegalDocSlug)) {
    return NextResponse.json({ error: 'Invalid document slug' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { content, title } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    const updated = saveLegalDocument(slug as LegalDocSlug, content, title);
    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error('Failed to update legal document:', error);
    return NextResponse.json({ error: 'Failed to update legal document' }, { status: 500 });
  }
}
