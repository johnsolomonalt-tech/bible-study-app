import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function calculateStreakNumber(activeDates: string[]): { streak: number; isGraceActive: boolean } {
  if (!activeDates || activeDates.length === 0) {
    return { streak: 0, isGraceActive: false };
  }

  const uniqueSorted = Array.from(new Set(activeDates)).sort().reverse();
  const todayStr = getLocalDateString();
  const todayIdx = uniqueSorted.indexOf(todayStr);

  const hasDoneToday = todayIdx !== -1;
  const referenceDateStr = hasDoneToday ? todayStr : getLocalDateString(new Date(Date.now() - 86400000));

  const refIdx = uniqueSorted.indexOf(referenceDateStr);
  if (refIdx === -1) {
    const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 86400000 * 2));
    const twoDaysIdx = uniqueSorted.indexOf(twoDaysAgoStr);
    if (twoDaysIdx !== -1) {
      let streak = 0;
      let checkDate = parseLocalDate(twoDaysAgoStr);
      while (true) {
        const checkStr = getLocalDateString(checkDate);
        if (uniqueSorted.includes(checkStr)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
      return { streak, isGraceActive: true };
    }
    return { streak: 0, isGraceActive: false };
  }

  let streak = 0;
  let checkDate = parseLocalDate(referenceDateStr);
  while (true) {
    const checkStr = getLocalDateString(checkDate);
    if (uniqueSorted.includes(checkStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return { streak, isGraceActive: false };
}

async function getTrackerDates(userId: string): Promise<string[]> {
  try {
    const trackerRecords = await prisma.tracker.findMany({
      where: { userId },
      select: { completedAt: true },
    });
    return trackerRecords.map((r: { completedAt: Date }) => {
      const d = new Date(r.completedAt);
      return getLocalDateString(d);
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let accountStreak: any = {};
    let accountPrayers: any = [];

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      accountStreak = (user.unsafeMetadata?.theologica_streak as any) || {};
      accountPrayers = (user.unsafeMetadata?.theologica_prayers as any) || [];
    } catch (clerkErr) {
      console.warn('Clerk user lookup in GET /api/streak:', clerkErr);
    }

    const trackerDates = await getTrackerDates(userId);
    const existingDates = Array.isArray(accountStreak.activeDates) ? accountStreak.activeDates : [];

    // Union of all active dates
    const allDates = Array.from(new Set([...existingDates, ...trackerDates]))
      .filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    const { streak: currentStreak, isGraceActive } = calculateStreakNumber(allDates);
    const longestStreak = Math.max(Number(accountStreak.longestStreak) || 0, currentStreak);
    const todayStr = getLocalDateString();
    const isCompletedToday = allDates.includes(todayStr);

    const dailyChapterGoal = typeof accountStreak.dailyChapterGoal === 'number' && accountStreak.dailyChapterGoal > 0
      ? accountStreak.dailyChapterGoal
      : 3;

    return NextResponse.json({
      streak: {
        activeDates: allDates,
        currentStreak,
        longestStreak,
        lastActiveDate: allDates[allDates.length - 1] || '',
        dailyChapterGoal,
        isCompletedToday,
        isGraceActive,
        todayGoals: accountStreak.todayGoals || {
          scripture: false,
          devotional: false,
          prayer: false,
          chaptersCompletedToday: 0,
        },
        updatedAt: accountStreak.updatedAt || Date.now(),
      },
      prayers: Array.isArray(accountPrayers) ? accountPrayers : [],
    });
  } catch (error) {
    console.error('Failed to fetch streak from account:', error);
    return NextResponse.json({ error: 'Failed to retrieve account streak' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    let client: any = null;
    let user: any = null;
    let accountStreak: any = {};
    let accountPrayers: any = [];

    try {
      client = await clerkClient();
      user = await client.users.getUser(userId);
      accountStreak = (user.unsafeMetadata?.theologica_streak as any) || {};
      accountPrayers = (user.unsafeMetadata?.theologica_prayers as any) || [];
    } catch (clerkErr) {
      console.warn('Clerk user lookup in POST /api/streak:', clerkErr);
    }

    const trackerDates = await getTrackerDates(userId);
    const serverDates = Array.isArray(accountStreak.activeDates) ? accountStreak.activeDates : [];
    const clientDates = Array.isArray(body?.activeDates) ? body.activeDates : [];

    // Full union of active dates across server, client, and tracker table
    const allDates = Array.from(new Set([...serverDates, ...clientDates, ...trackerDates]))
      .filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    const { streak: currentStreak, isGraceActive } = calculateStreakNumber(allDates);
    const incomingLongest = typeof body?.longestStreak === 'number' ? body.longestStreak : 0;
    const serverLongest = typeof accountStreak.longestStreak === 'number' ? accountStreak.longestStreak : 0;
    const longestStreak = Math.max(serverLongest, incomingLongest, currentStreak);

    const todayStr = getLocalDateString();
    const isCompletedToday = allDates.includes(todayStr);

    // Goal: prioritize newest incoming if valid, else server, else default 3
    const dailyChapterGoal = typeof body?.dailyChapterGoal === 'number' && body.dailyChapterGoal > 0
      ? body.dailyChapterGoal
      : (typeof accountStreak.dailyChapterGoal === 'number' && accountStreak.dailyChapterGoal > 0
        ? accountStreak.dailyChapterGoal
        : 3);

    // Habits: union boolean flags and max chapters
    const serverHabits = accountStreak.todayGoals || {};
    const clientHabits = body?.todayGoals || {};
    const mergedHabits = {
      scripture: Boolean(serverHabits.scripture || clientHabits.scripture),
      devotional: Boolean(serverHabits.devotional || clientHabits.devotional),
      prayer: Boolean(serverHabits.prayer || clientHabits.prayer),
      chaptersCompletedToday: Math.max(
        Number(serverHabits.chaptersCompletedToday || 0),
        Number(clientHabits.chaptersCompletedToday || 0)
      ),
    };

    // Prayers: deduplicate and merge by id, keeping latest updatedAt
    const prayerMap = new Map();
    if (Array.isArray(accountPrayers)) {
      accountPrayers.forEach((p: any) => { if (p?.id) prayerMap.set(p.id, p); });
    }
    if (Array.isArray(body?.prayers)) {
      body.prayers.forEach((p: any) => {
        if (p?.id) {
          const existing = prayerMap.get(p.id);
          if (!existing || (p.updatedAt && p.updatedAt >= (existing.updatedAt || ''))) {
            prayerMap.set(p.id, p);
          }
        }
      });
    }
    const mergedPrayers = Array.from(prayerMap.values()).slice(0, 50);

    const mergedStreakPayload = {
      activeDates: allDates,
      longestStreak,
      lastActiveDate: allDates[allDates.length - 1] || '',
      dailyChapterGoal,
      todayGoals: mergedHabits,
      updatedAt: Date.now(),
    };

    // Persist to Clerk user metadata if client is available
    if (client && user) {
      try {
        await client.users.updateUserMetadata(userId, {
          unsafeMetadata: {
            ...user.unsafeMetadata,
            theologica_streak: mergedStreakPayload,
            theologica_prayers: mergedPrayers,
          },
        });
      } catch (saveErr) {
        console.warn('Clerk user metadata update warning:', saveErr);
      }
    }

    return NextResponse.json({
      streak: {
        ...mergedStreakPayload,
        currentStreak,
        isCompletedToday,
        isGraceActive,
      },
      prayers: mergedPrayers,
    });
  } catch (error) {
    console.error('Failed to sync streak to account:', error);
    return NextResponse.json({ error: 'Failed to sync streak to account' }, { status: 500 });
  }
}
