import { 
  getRawStreakStorage, 
  getTodayHabits, 
  mergeAccountStreakData, 
  StreakData 
} from './streakService';
import { getPrayers, mergeAccountPrayers, PrayerItem } from './prayerService';

type FetchWithAuth = (url: string, init?: RequestInit) => Promise<Response>;

let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let isPushing = false;
let hasQueuedPush = false;
let lastPushTime = 0;

/**
 * Push local streak, daily habits, pace goals, and prayers to the user's account.
 */
export async function pushStreakToAccount(
  fetchWithAuth: FetchWithAuth,
  dailyChapterGoal?: number
): Promise<{ streak?: StreakData; prayers?: PrayerItem[] } | null> {
  if (typeof window === 'undefined') return null;

  try {
    isPushing = true;
    lastPushTime = Date.now();

    const raw = getRawStreakStorage();
    const todayGoals = getTodayHabits();
    const prayers = getPrayers();

    const payload = {
      activeDates: raw.activeDates,
      longestStreak: raw.longestStreak,
      lastActiveDate: raw.lastActiveDate,
      dailyChapterGoal: dailyChapterGoal || 3,
      todayGoals,
      prayers,
    };

    const res = await fetchWithAuth('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('Failed to push streak to account, status:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.streak) {
      const mergedStreak = mergeAccountStreakData(data.streak);
      const mergedPrayers = data.prayers ? mergeAccountPrayers(data.prayers) : prayers;
      return { streak: mergedStreak, prayers: mergedPrayers };
    }
  } catch (err) {
    console.warn('Network error pushing streak to account:', err);
  } finally {
    isPushing = false;
    if (hasQueuedPush) {
      hasQueuedPush = false;
      queueStreakPush(fetchWithAuth, dailyChapterGoal, 100);
    }
  }

  return null;
}

/**
 * Pull the latest streak, habits, pace, and prayers from the user's account.
 * Automatically merges with local storage so no device's active days are lost.
 */
export async function pullStreakFromAccount(
  fetchWithAuth: FetchWithAuth,
  currentLocalGoal?: number
): Promise<{
  streak: StreakData | null;
  prayers: PrayerItem[] | null;
  dailyChapterGoal?: number;
} | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetchWithAuth('/api/streak');
    if (!res.ok) {
      console.warn('Failed to pull streak from account, status:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.streak) {
      const localRaw = getRawStreakStorage();
      const remoteDates: string[] = data.streak.activeDates || [];
      const localDates: string[] = localRaw.activeDates || [];

      // Check if local device has any dates not yet on the server (e.g. offline progress)
      const hasLocalNewDates = localDates.some(d => !remoteDates.includes(d));

      const mergedStreak = mergeAccountStreakData(data.streak);
      const mergedPrayers = data.prayers ? mergeAccountPrayers(data.prayers) : null;

      // If local had dates not yet in account, push the merged set to the account
      if (hasLocalNewDates) {
        queueStreakPush(fetchWithAuth, data.streak.dailyChapterGoal || currentLocalGoal || 3, 300);
      }

      return {
        streak: mergedStreak,
        prayers: mergedPrayers,
        dailyChapterGoal: data.streak.dailyChapterGoal,
      };
    }
  } catch (err) {
    console.warn('Network error pulling streak from account:', err);
  }

  return null;
}

/**
 * Queue a debounced push to the user's account (e.g., when rapidly checking off chapters or habits)
 */
export function queueStreakPush(
  fetchWithAuth: FetchWithAuth,
  dailyChapterGoal?: number,
  delayMs: number = 350
): void {
  if (pushTimeout) {
    clearTimeout(pushTimeout);
  }

  if (isPushing) {
    hasQueuedPush = true;
    return;
  }

  pushTimeout = setTimeout(() => {
    pushTimeout = null;
    pushStreakToAccount(fetchWithAuth, dailyChapterGoal);
  }, delayMs);
}
