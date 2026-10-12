import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { getAnalyticsDashboardStats } from '@/lib/analyticsService';
import { clerkClient } from '@clerk/nextjs/server';
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

    // Compute Platform Streak & Habit Metrics
    const streakStats = {
      totalTrackedUsers: 0,
      activeStreaksCount: 0,
      topPlatformStreak: 0,
      averageActiveStreak: 0,
      usersCompletedToday: 0,
      usersInGrace: 0,
      milestoneDistribution: {
        oneToThree: 0,
        fourToSeven: 0,
        eightToFourteen: 0,
        fifteenToThirty: 0,
        thirtyPlus: 0,
      },
      todayHabitBreakdown: {
        scriptureCount: 0,
        devotionalCount: 0,
        prayerCount: 0,
      },
      platformTotals: {
        totalChaptersRead: 0,
        totalNotesCreated: 0,
        totalCanvasesCreated: 0,
        totalHighlightsCreated: 0,
        totalChatsCreated: 0,
      },
      leaderboard: [] as Array<{
        id: string;
        username: string | null;
        fullName: string | null;
        email: string | null;
        imageUrl: string | null;
        currentStreak: number;
        longestStreak: number;
        activeDatesCount: number;
        lastActiveDate: string | null;
        isCompletedToday: boolean;
        isGraceActive: boolean;
        todayGoals: {
          scripture: boolean;
          devotional: boolean;
          prayer: boolean;
          chaptersCompletedToday: number;
        };
      }>,
    };

    try {
      const [totalChapters, totalNotes, totalCanvases, totalHighlights, totalChats, trackers] = await Promise.all([
        prisma.tracker.count().catch(() => 0),
        prisma.note.count().catch(() => 0),
        prisma.canvas.count().catch(() => 0),
        prisma.highlight.count().catch(() => 0),
        prisma.chat.count().catch(() => 0),
        prisma.tracker.findMany({ select: { userId: true, completedAt: true } }).catch(() => []),
      ]);

      streakStats.platformTotals = {
        totalChaptersRead: totalChapters,
        totalNotesCreated: totalNotes,
        totalCanvasesCreated: totalCanvases,
        totalHighlightsCreated: totalHighlights,
        totalChatsCreated: totalChats,
      };

      const trackersByUser = new Map<string, string[]>();
      for (const t of trackers) {
        if (!trackersByUser.has(t.userId)) trackersByUser.set(t.userId, []);
        trackersByUser.get(t.userId)!.push(getLocalDateString(new Date(t.completedAt)));
      }

      const client = await clerkClient();
      const userListResponse = await client.users.getUserList({ limit: 100, orderBy: '-created_at' });
      const rawUsers = Array.isArray(userListResponse) ? userListResponse : (userListResponse?.data || []);

      const todayStr = getLocalDateString();
      const allUserStreaks: Array<any> = [];

      let totalActiveStreakSum = 0;
      let activeCount = 0;
      let topStreak = 0;
      let completedTodayCount = 0;
      let graceCount = 0;
      let scriptureCount = 0;
      let devotionalCount = 0;
      let prayerCount = 0;

      for (const u of rawUsers) {
        const streakMeta = (u.unsafeMetadata?.theologica_streak as any) || {};
        const metaDates = Array.isArray(streakMeta.activeDates) ? streakMeta.activeDates : [];
        const trackerDates = trackersByUser.get(u.id) || [];
        const allDates = Array.from(new Set([...metaDates, ...trackerDates]))
          .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();

        const { streak: currentStreak, isGraceActive } = calculateStreakNumber(allDates);
        const longestStreak = Math.max(Number(streakMeta.longestStreak) || 0, currentStreak);

        const goals = streakMeta.todayGoals || {};
        const hasScripture = Boolean(goals.scripture);
        const hasDevotional = Boolean(goals.devotional);
        const hasPrayer = Boolean(goals.prayer);

        if (hasScripture) scriptureCount++;
        if (hasDevotional) devotionalCount++;
        if (hasPrayer) prayerCount++;

        const isCompletedToday = allDates.includes(todayStr) || hasScripture || hasDevotional || hasPrayer;

        if (isCompletedToday) completedTodayCount++;
        if (isGraceActive) graceCount++;

        if (currentStreak > 0) {
          activeCount++;
          totalActiveStreakSum += currentStreak;
        }

        if (longestStreak > topStreak) {
          topStreak = longestStreak;
        }

        // Milestone bins
        if (currentStreak >= 30) streakStats.milestoneDistribution.thirtyPlus++;
        else if (currentStreak >= 15) streakStats.milestoneDistribution.fifteenToThirty++;
        else if (currentStreak >= 8) streakStats.milestoneDistribution.eightToFourteen++;
        else if (currentStreak >= 4) streakStats.milestoneDistribution.fourToSeven++;
        else if (currentStreak >= 1) streakStats.milestoneDistribution.oneToThree++;

        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
        const primaryEmail =
          u.emailAddresses?.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress ||
          u.emailAddresses?.[0]?.emailAddress ||
          null;

        allUserStreaks.push({
          id: u.id,
          username: u.username || null,
          fullName,
          email: primaryEmail,
          imageUrl: u.imageUrl || null,
          currentStreak,
          longestStreak,
          activeDatesCount: allDates.length,
          lastActiveDate: allDates[allDates.length - 1] || streakMeta.lastActiveDate || null,
          isCompletedToday,
          isGraceActive,
          todayGoals: {
            scripture: hasScripture,
            devotional: hasDevotional,
            prayer: hasPrayer,
            chaptersCompletedToday: Number(goals.chaptersCompletedToday) || 0,
          },
        });
      }

      streakStats.totalTrackedUsers = rawUsers.length;
      streakStats.activeStreaksCount = activeCount;
      streakStats.topPlatformStreak = topStreak;
      streakStats.averageActiveStreak = activeCount > 0 ? Math.round((totalActiveStreakSum / activeCount) * 10) / 10 : 0;
      streakStats.usersCompletedToday = completedTodayCount;
      streakStats.usersInGrace = graceCount;
      streakStats.todayHabitBreakdown = {
        scriptureCount,
        devotionalCount,
        prayerCount,
      };

      // Leaderboard: sort by currentStreak desc, then longestStreak desc, then activeDatesCount desc
      allUserStreaks.sort((a, b) => {
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
        return b.activeDatesCount - a.activeDatesCount;
      });

      streakStats.leaderboard = allUserStreaks.slice(0, 20);
    } catch (streakErr) {
      console.warn('[DevConsole] Streak statistics computation error:', streakErr);
    }

    return NextResponse.json({
      success: true,
      stats,
      streakStats,
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
