import { NextResponse } from 'next/server';
import { recordAnalyticsEvent } from '@/lib/analyticsService';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    const eventType = typeof body.eventType === 'string' ? body.eventType.trim() : '';
    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    // Optional user ID from Clerk (will be one-way hashed for privacy, never stored raw)
    let clerkUserId: string | null = null;
    try {
      const clerkAuth = await auth();
      clerkUserId = clerkAuth.userId;
    } catch {
      // Unauthenticated / guest session
    }

    const rawId = clerkUserId || body.anonymousId || 'anon';
    await recordAnalyticsEvent(eventType, rawId, body.metadata);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Telemetry logging error' }, { status: 500 });
  }
}
