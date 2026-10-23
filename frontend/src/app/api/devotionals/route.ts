import { NextResponse } from 'next/server';
import devotionalsData from '@/lib/devotionalsData.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDay = searchParams.get('day');
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const defaultDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const day = rawDay ? parseInt(rawDay, 10) : defaultDay;
  const entries = devotionalsData as any[];
  const match = entries.find(d => d.dayOfYear === day) || entries[(Math.max(1, day) - 1) % entries.length] || entries[0];

  return NextResponse.json(match, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
