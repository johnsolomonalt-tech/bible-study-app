import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { getRecentAnonymousEvents, clearAllAnalyticsEvents } from '@/lib/analyticsService';

export async function GET(req: Request) {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200);

  try {
    const events = await getRecentAnonymousEvents(limit);
    return NextResponse.json({
      success: true,
      events,
    });
  } catch (err: any) {
    console.error('Failed to fetch recent events:', err);
    return NextResponse.json({ error: 'Failed to fetch recent events' }, { status: 500 });
  }
}

export async function DELETE() {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  try {
    await clearAllAnalyticsEvents();
    return NextResponse.json({
      success: true,
      message: 'All telemetry events have been reset successfully',
    });
  } catch (err: any) {
    console.error('Failed to clear events:', err);
    return NextResponse.json({ error: 'Failed to clear events' }, { status: 500 });
  }
}
