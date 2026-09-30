import { NextRequest, NextResponse } from 'next/server';
import { recordAnalyticsEvent } from '@/lib/analyticsService';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`analytics:${ip}`, {
      windowMs: 60 * 1000,
      maxRequests: 60,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetSeconds) } }
      );
    }

    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else {
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
    }

    const eventType = typeof body.eventType === 'string' ? body.eventType.trim() : '';
    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    // 1. Check Clerk server-side auth
    let clerkUserId: string | null = null;
    try {
      const clerkAuth = await auth();
      clerkUserId = clerkAuth.userId;
    } catch {
      // Unauthenticated
    }

    // 2. Check client-reported userId
    if (!clerkUserId && typeof body.userId === 'string' && body.userId.startsWith('user_')) {
      clerkUserId = body.userId;
    }

    // 3. Check persistent first-party cookie
    let visitorCookie = req.cookies.get('th_vid')?.value;
    let shouldSetCookie = false;

    // 4. Check client-passed anonymousId
    const clientAnonId = typeof body.anonymousId === 'string' && body.anonymousId.length > 5 ? body.anonymousId : null;

    if (!visitorCookie) {
      if (clientAnonId) {
        visitorCookie = clientAnonId;
      } else {
        // Fallback to deterministic IP + User-Agent hash
        const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const ip = forwarded || req.headers.get('x-real-ip') || '127.0.0.1';
        const ua = req.headers.get('user-agent') || 'default-agent';
        visitorCookie = 'vid_' + crypto.createHash('sha256').update(ip + ua).digest('hex').substring(0, 16);
      }
      shouldSetCookie = true;
    }

    // Priority for deterministic visitor identifier:
    // Clerk User ID (logged-in account) > Visitor Cookie > Client ID
    const rawId = clerkUserId || visitorCookie || clientAnonId || 'guest_visitor';

    await recordAnalyticsEvent(eventType, rawId, body.metadata);

    const response = NextResponse.json({ success: true }, { status: 200 });

    if (shouldSetCookie && visitorCookie) {
      response.cookies.set({
        name: 'th_vid',
        value: visitorCookie,
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Telemetry logging error' }, { status: 500 });
  }
}
