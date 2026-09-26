import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { getAnalyticsDashboardStats } from '@/lib/analyticsService';

export async function GET(req: Request) {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get('range') || '7d';
  let days = 7;
  if (rangeParam === '24h') days = 1;
  else if (rangeParam === '14d') days = 14;
  else if (rangeParam === '30d') days = 30;

  try {
    const stats = await getAnalyticsDashboardStats(days);
    return NextResponse.json({
      success: true,
      stats,
      admin: {
        userId: guard.userId,
        email: guard.email,
      },
    });
  } catch (err: any) {
    console.error('Failed to compute analytics stats:', err);
    return NextResponse.json({ error: 'Failed to compute analytics stats' }, { status: 500 });
  }
}
