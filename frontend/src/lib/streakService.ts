/**
 * Haven-inspired Reading Streak & Daily Spiritual Rhythm Engine
 * 
 * Tracks daily consistency across scripture reading, devotionals, and prayer.
 * Features 7-day week calendar, milestones, grace day recovery, and dual persistence
 * (localStorage + cookies for guests, with optional server sync).
 */

export type HabitType = 'scripture' | 'devotional' | 'prayer';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "M", "T", "W", "T", "F", "S", "S"
  dayName: string; // "Mon", "Tue", etc.
  dayNumber: number; // 1-31
  isToday: boolean;
  isCompleted: boolean;
  isPast: boolean;
}

export interface StreakMilestone {
  days: number;
  title: string;
  badge: string;
  description: string;
  isEarned: boolean;
}

export interface TodayGoals {
  scripture: boolean;
  devotional: boolean;
  prayer: boolean;
  chaptersCompletedToday: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalActiveDays: number;
  activeDates: string[]; // Set of YYYY-MM-DD dates
  weeklyActivity: DayActivity[];
  todayGoals: TodayGoals;
  isCompletedToday: boolean;
  isGraceActive: boolean;
  earnedMilestones: StreakMilestone[];
  nextMilestone: StreakMilestone & { progressPercent: number; daysRemaining: number };
}

export const STREAK_MILESTONES: Omit<StreakMilestone, 'isEarned'>[] = [
  { days: 1, title: 'First Spark', badge: '✨', description: 'You lit the flame of daily quiet time.' },
  { days: 3, title: 'Kindled Flame', badge: '🔥', description: '3 days of steadfast scripture seeking.' },
  { days: 7, title: 'Steady Torch', badge: '🕯️', description: 'A full week walking in God’s presence.' },
  { days: 14, title: 'Warm Hearth', badge: '🪵', description: 'Two weeks of consistent spiritual rhythm.' },
  { days: 30, title: 'Radiant Beacon', badge: '🏮', description: 'A full month anchored in the Word.' },
  { days: 60, title: 'Guiding Light', badge: '🌟', description: 'Two months shining brightly in faith.' },
  { days: 100, title: 'City on a Hill', badge: '🏛️', description: 'A hundred days unyielding in truth.' },
  { days: 365, title: 'Eternal Flame', badge: '👑', description: 'A full year immersed in Holy Scripture.' },
];

const STREAK_STORAGE_KEY = 'theologica_haven_streak_v1';
const TODAY_HABITS_KEY_PREFIX = 'theologica_habits_';

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

function getDaysDifference(dateA: string, dateB: string): number {
  const d1 = parseLocalDate(dateA);
  const d2 = parseLocalDate(dateB);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Load raw streak records from local storage.
 */
interface RawStreakStorage {
  activeDates: string[]; // list of active dates YYYY-MM-DD
  longestStreak: number;
  lastActiveDate: string;
  graceUsedDate?: string;
}

function loadRawStorage(): RawStreakStorage {
  if (typeof window === 'undefined') {
    return { activeDates: [], longestStreak: 0, lastActiveDate: '' };
  }
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        activeDates: Array.isArray(parsed.activeDates) ? parsed.activeDates : [],
        longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
        lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : '',
        graceUsedDate: parsed.graceUsedDate,
      };
    }
  } catch {}
  return { activeDates: [], longestStreak: 0, lastActiveDate: '' };
}

function saveRawStorage(data: RawStreakStorage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    // Also store lightweight cookie for SSR / service workers
    const activeStreak = calculateStreakNumber(data.activeDates);
    document.cookie = `theologica_streak=${activeStreak}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

function loadTodayHabits(dateStr: string): TodayGoals {
  if (typeof window === 'undefined') {
    return { scripture: false, devotional: false, prayer: false, chaptersCompletedToday: 0 };
  }
  try {
    const raw = localStorage.getItem(`${TODAY_HABITS_KEY_PREFIX}${dateStr}`);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        scripture: !!p.scripture,
        devotional: !!p.devotional,
        prayer: !!p.prayer,
        chaptersCompletedToday: typeof p.chaptersCompletedToday === 'number' ? p.chaptersCompletedToday : 0,
      };
    }
  } catch {}
  return { scripture: false, devotional: false, prayer: false, chaptersCompletedToday: 0 };
}

function saveTodayHabits(dateStr: string, habits: TodayGoals): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${TODAY_HABITS_KEY_PREFIX}${dateStr}`, JSON.stringify(habits));
  } catch {}
}

/**
 * Calculates current streak count with 1-day grace cushion.
 */
function calculateStreakNumber(activeDates: string[]): { streak: number; isGraceActive: boolean } {
  if (!activeDates || activeDates.length === 0) {
    return { streak: 0, isGraceActive: false };
  }

  const uniqueSorted = Array.from(new Set(activeDates)).sort().reverse();
  const todayStr = getLocalDateString();
  const todayIdx = uniqueSorted.indexOf(todayStr);

  const hasDoneToday = todayIdx !== -1;
  const referenceDateStr = hasDoneToday ? todayStr : getLocalDateString(new Date(Date.now() - 86400000));
  
  // If neither today nor yesterday is in activeDates, check if grace applies (2 days ago)
  const refIdx = uniqueSorted.indexOf(referenceDateStr);
  if (refIdx === -1) {
    // Check if user was active 2 days ago -> Grace day active!
    const twoDaysAgoStr = getLocalDateString(new Date(Date.now() - 86400000 * 2));
    const twoDaysIdx = uniqueSorted.indexOf(twoDaysAgoStr);
    if (twoDaysIdx !== -1) {
      // Calculate streak ending 2 days ago
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

  // Count backwards from reference date
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

/**
 * Generates the current week (Monday to Sunday) activity strip.
 */
function getWeeklyActivityStrip(activeDates: string[]): DayActivity[] {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  
  // Current day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert so Monday = 0, Sunday = 6
  const currentDayOfWeek = (now.getDay() + 6) % 7;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const days: DayActivity[] = [];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const isCompleted = activeDates.includes(dateStr);
    const isPast = d < now && !isToday;

    days.push({
      date: dateStr,
      dayLabel: dayLabels[i],
      dayName: dayNames[i],
      dayNumber: d.getDate(),
      isToday,
      isCompleted,
      isPast,
    });
  }

  return days;
}

/**
 * Public function to retrieve complete Haven streak state.
 */
export function getStreakData(): StreakData {
  const raw = loadRawStorage();
  const todayStr = getLocalDateString();
  const todayGoals = loadTodayHabits(todayStr);

  const { streak: currentStreak, isGraceActive } = calculateStreakNumber(raw.activeDates);
  const longestStreak = Math.max(raw.longestStreak, currentStreak);
  const totalActiveDays = new Set(raw.activeDates).size;
  const isCompletedToday = raw.activeDates.includes(todayStr);

  const weeklyActivity = getWeeklyActivityStrip(raw.activeDates);

  // Calculate milestones
  const earnedMilestones: StreakMilestone[] = STREAK_MILESTONES.map(m => ({
    ...m,
    isEarned: currentStreak >= m.days || longestStreak >= m.days,
  }));

  // Find next milestone to achieve
  const nextTarget = STREAK_MILESTONES.find(m => currentStreak < m.days) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const prevTargetDays = STREAK_MILESTONES.filter(m => m.days < nextTarget.days).pop()?.days || 0;
  
  const range = nextTarget.days - prevTargetDays;
  const currentProgressInRange = Math.max(0, currentStreak - prevTargetDays);
  const progressPercent = Math.min(100, Math.round((currentProgressInRange / (range || 1)) * 100));
  const daysRemaining = Math.max(0, nextTarget.days - currentStreak);

  const nextMilestone = {
    ...nextTarget,
    isEarned: currentStreak >= nextTarget.days,
    progressPercent,
    daysRemaining,
  };

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: raw.lastActiveDate,
    totalActiveDays,
    activeDates: raw.activeDates,
    weeklyActivity,
    todayGoals,
    isCompletedToday,
    isGraceActive,
    earnedMilestones,
    nextMilestone,
  };
}

/**
 * Record a spiritual habit activity (scripture, devotional, prayer)
 */
export function recordHabitActivity(
  habit: HabitType,
  metadata?: { chapterId?: string; chaptersCount?: number }
): StreakData {
  const raw = loadRawStorage();
  const todayStr = getLocalDateString();
  const todayHabits = loadTodayHabits(todayStr);

  // Update specific habit
  if (habit === 'scripture') {
    todayHabits.scripture = true;
    if (metadata?.chaptersCount) {
      todayHabits.chaptersCompletedToday = metadata.chaptersCount;
    } else {
      todayHabits.chaptersCompletedToday = (todayHabits.chaptersCompletedToday || 0) + 1;
    }
  } else if (habit === 'devotional') {
    todayHabits.devotional = true;
  } else if (habit === 'prayer') {
    todayHabits.prayer = true;
  }

  saveTodayHabits(todayStr, todayHabits);

  // Mark today as active in streak history if not already
  const dateSet = new Set(raw.activeDates);
  const wasAlreadyActiveToday = dateSet.has(todayStr);
  dateSet.add(todayStr);

  const activeDates = Array.from(dateSet).sort();
  const { streak: currentStreak } = calculateStreakNumber(activeDates);
  const longestStreak = Math.max(raw.longestStreak, currentStreak);

  const updatedRaw: RawStreakStorage = {
    activeDates,
    longestStreak,
    lastActiveDate: todayStr,
    graceUsedDate: raw.graceUsedDate,
  };

  saveRawStorage(updatedRaw);

  // Dispatch custom window event so UI immediately updates reactively across all tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_streak_updated', {
      detail: { habit, todayStr, currentStreak, isNewDayActivity: !wasAlreadyActiveToday }
    }));
  }

  return getStreakData();
}

/**
 * Remove a chapter or activity if untoggled
 */
export function unmarkChapterActivity(chaptersRemainingToday: number): StreakData {
  const raw = loadRawStorage();
  const todayStr = getLocalDateString();
  const todayHabits = loadTodayHabits(todayStr);

  todayHabits.chaptersCompletedToday = Math.max(0, chaptersRemainingToday);
  if (todayHabits.chaptersCompletedToday === 0) {
    todayHabits.scripture = false;
  }
  saveTodayHabits(todayStr, todayHabits);

  // If no habits done today at all, remove today from activeDates
  if (!todayHabits.scripture && !todayHabits.devotional && !todayHabits.prayer) {
    const filtered = raw.activeDates.filter(d => d !== todayStr);
    const { streak: currentStreak } = calculateStreakNumber(filtered);
    saveRawStorage({
      ...raw,
      activeDates: filtered,
      lastActiveDate: filtered[filtered.length - 1] || '',
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_streak_updated'));
  }

  return getStreakData();
}

/**
 * Haven Daily Encouragement Verses on Consistency & Seeking God
 */
export const HAVEN_STREAK_SCRIPTURES = [
  { text: "Thy word is a lamp unto my feet, and a light unto my path.", reference: "Psalm 119:105" },
  { text: "He will not grow tired or weary, and His understanding no one can fathom.", reference: "Isaiah 40:28" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", reference: "Galatians 6:9" },
  { text: "Draw near to God, and He will draw near to you.", reference: "James 4:8" },
  { text: "Morning by morning He awakens me; He awakens my ear to listen like one being taught.", reference: "Isaiah 50:4" },
  { text: "His mercies never come to an end; they are new every morning; great is Your faithfulness.", reference: "Lamentations 3:22-23" },
  { text: "I have stored up Your word in my heart, that I might not sin against You.", reference: "Psalm 119:11" },
  { text: "Keep this Book of the Law always on your lips; meditate on it day and night.", reference: "Joshua 1:8" },
];

export function getTodayStreakQuote(): { text: string; reference: string } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return HAVEN_STREAK_SCRIPTURES[dayOfYear % HAVEN_STREAK_SCRIPTURES.length];
}
