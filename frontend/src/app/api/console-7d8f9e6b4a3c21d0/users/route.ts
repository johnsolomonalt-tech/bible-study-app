import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export interface DevUserStreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeDatesCount: number;
  isCompletedToday: boolean;
  isGraceActive: boolean;
  dailyChapterGoal: number;
  targetMilestoneDays: number;
  todayGoals: {
    scripture: boolean;
    devotional: boolean;
    prayer: boolean;
    chaptersCompletedToday: number;
  };
  totalChaptersRead: number;
  totalNotes: number;
  totalCanvases: number;
  totalHighlights: number;
}

export interface DevUserAccountResponse {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  imageUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
  lastUsedAt: string | null;
  streak: DevUserStreakInfo;
}

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

export async function GET() {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });

    const rawUsers = Array.isArray(response) ? response : (response?.data || []);
    const totalCount = (response as any)?.totalCount ?? rawUsers.length;
    const userIds = rawUsers.map((u) => u.id);

    // Batch query Prisma records for all users
    // Strict Privacy Guardrail: We query strictly operational counts and timestamps from Prisma models
    // NEVER content, note text, canvas diagrams, or chat messages!
    const trackersByUser = new Map<string, Date[]>();
    const noteCountsByUser = new Map<string, { count: number; lastDate: Date | null }>();
    const canvasCountsByUser = new Map<string, { count: number; lastDate: Date | null }>();
    const highlightCountsByUser = new Map<string, { count: number; lastDate: Date | null }>();
    const chatCountsByUser = new Map<string, { count: number; lastDate: Date | null }>();

    if (userIds.length > 0) {
      try {
        const [trackers, noteGroups, canvasGroups, highlightGroups, chatGroups] = await Promise.all([
          prisma.tracker.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, completedAt: true },
          }),
          prisma.note.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
            _max: { updatedAt: true },
          }),
          prisma.canvas.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
            _max: { updatedAt: true },
          }),
          prisma.highlight.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
            _max: { createdAt: true },
          }),
          prisma.chat.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
            _max: { createdAt: true },
          }),
        ]);

        for (const t of trackers) {
          if (!trackersByUser.has(t.userId)) trackersByUser.set(t.userId, []);
          trackersByUser.get(t.userId)!.push(t.completedAt);
        }
        for (const g of noteGroups) {
          noteCountsByUser.set(g.userId, { count: g._count._all, lastDate: g._max.updatedAt });
        }
        for (const g of canvasGroups) {
          canvasCountsByUser.set(g.userId, { count: g._count._all, lastDate: g._max.updatedAt });
        }
        for (const g of highlightGroups) {
          highlightCountsByUser.set(g.userId, { count: g._count._all, lastDate: g._max.createdAt });
        }
        for (const g of chatGroups) {
          chatCountsByUser.set(g.userId, { count: g._count._all, lastDate: g._max.createdAt });
        }
      } catch (dbErr) {
        console.warn('[DevConsole] Batch query DB error:', dbErr);
      }
    }

    const todayStr = getLocalDateString();

    const users: DevUserAccountResponse[] = rawUsers.map((u) => {
      const emailAddresses = u.emailAddresses || [];
      const phoneNumbers = u.phoneNumbers || [];

      const primaryEmail =
        emailAddresses.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress ||
        emailAddresses[0]?.emailAddress ||
        null;

      const primaryPhone =
        phoneNumbers.find((p: any) => p.id === u.primaryPhoneNumberId)?.phoneNumber ||
        phoneNumbers[0]?.phoneNumber ||
        null;

      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;

      // Extract streak metadata
      const accountStreak = (u.unsafeMetadata?.theologica_streak as any) || {};
      const existingDates = Array.isArray(accountStreak.activeDates) ? accountStreak.activeDates : [];

      const userTrackers = trackersByUser.get(u.id) || [];
      const trackerDates = userTrackers.map((d) => getLocalDateString(new Date(d)));

      const allDates = Array.from(new Set([...existingDates, ...trackerDates]))
        .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();

      const { streak: currentStreak, isGraceActive } = calculateStreakNumber(allDates);
      const longestStreak = Math.max(Number(accountStreak.longestStreak) || 0, currentStreak);

      const rawGoals = accountStreak.todayGoals || {};
      const todayGoals = {
        scripture: Boolean(rawGoals.scripture),
        devotional: Boolean(rawGoals.devotional),
        prayer: Boolean(rawGoals.prayer),
        chaptersCompletedToday: Number(rawGoals.chaptersCompletedToday) || 0,
      };

      const isCompletedToday =
        allDates.includes(todayStr) ||
        todayGoals.scripture ||
        todayGoals.devotional ||
        todayGoals.prayer;

      const dailyChapterGoal =
        typeof accountStreak.dailyChapterGoal === 'number' && accountStreak.dailyChapterGoal > 0
          ? accountStreak.dailyChapterGoal
          : 3;

      const targetMilestoneDays =
        typeof accountStreak.targetMilestoneDays === 'number' && accountStreak.targetMilestoneDays > 0
          ? accountStreak.targetMilestoneDays
          : 7;

      const lastActiveDate = allDates[allDates.length - 1] || accountStreak.lastActiveDate || null;

      const noteInfo = noteCountsByUser.get(u.id);
      const canvasInfo = canvasCountsByUser.get(u.id);
      const highlightInfo = highlightCountsByUser.get(u.id);
      const chatInfo = chatCountsByUser.get(u.id);

      const dbCandidateDates = [
        noteInfo?.lastDate,
        canvasInfo?.lastDate,
        highlightInfo?.lastDate,
        chatInfo?.lastDate,
        userTrackers.length > 0 ? new Date(Math.max(...userTrackers.map((d) => d.getTime()))) : null,
      ].filter((d): d is Date => Boolean(d));

      const dbLastActiveDate =
        dbCandidateDates.length > 0
          ? new Date(Math.max(...dbCandidateDates.map((d) => d.getTime())))
          : null;

      const clerkCreatedAt = u.createdAt ? new Date(u.createdAt) : null;
      const clerkLastSignIn = u.lastSignInAt ? new Date(u.lastSignInAt) : null;
      const clerkLastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;

      const candidateDates = [
        clerkLastActive,
        clerkLastSignIn,
        dbLastActiveDate,
      ].filter((d): d is Date => Boolean(d));

      const lastUsedAtDate =
        candidateDates.length > 0
          ? new Date(Math.max(...candidateDates.map((d) => d.getTime())))
          : clerkLastSignIn || clerkCreatedAt;

      return {
        id: u.id,
        username: u.username || null,
        fullName,
        email: primaryEmail,
        phoneNumber: primaryPhone,
        imageUrl: u.imageUrl || null,
        createdAt: clerkCreatedAt ? clerkCreatedAt.toISOString() : new Date().toISOString(),
        lastSignInAt: clerkLastSignIn ? clerkLastSignIn.toISOString() : null,
        lastActiveAt: clerkLastActive ? clerkLastActive.toISOString() : null,
        lastUsedAt: lastUsedAtDate ? lastUsedAtDate.toISOString() : null,
        streak: {
          currentStreak,
          longestStreak,
          lastActiveDate,
          activeDatesCount: allDates.length,
          isCompletedToday,
          isGraceActive,
          dailyChapterGoal,
          targetMilestoneDays,
          todayGoals,
          totalChaptersRead: userTrackers.length,
          totalNotes: noteInfo?.count || 0,
          totalCanvases: canvasInfo?.count || 0,
          totalHighlights: highlightInfo?.count || 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      totalCount,
      users,
    });
  } catch (err: any) {
    console.error('[DevConsole] Failed to fetch users list:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch registered users list',
        users: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
