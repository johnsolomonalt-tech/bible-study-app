/**
 * Reading Streak & Daily Spiritual Rhythm Engine
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

export interface TargetMilestoneInfo extends StreakMilestone {
  progressPercent: number;
  daysRemaining: number;
  isCustom?: boolean;
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
  targetMilestoneDays: number;
  targetMilestone: TargetMilestoneInfo;
  nextMilestone: TargetMilestoneInfo; // Kept for backwards compatibility
}

export const STREAK_MILESTONES: Omit<StreakMilestone, 'isEarned'>[] = [
  { days: 1, title: 'First Step', badge: '✨', description: 'Started your daily Bible reading.' },
  { days: 3, title: '3-Day Streak', badge: '🔥', description: '3 days of reading Scripture.' },
  { days: 7, title: 'One Week', badge: '🕯️', description: 'One full week of daily reading.' },
  { days: 14, title: 'Two Weeks', badge: '🪵', description: 'Two weeks of consistent reading.' },
  { days: 30, title: 'One Month', badge: '🏮', description: 'One full month in God’s Word.' },
  { days: 60, title: 'Two Months', badge: '🌟', description: 'Two continuous months of daily reading.' },
  { days: 100, title: '100 Days', badge: '🏛️', description: 'One hundred days of reading Scripture.' },
  { days: 365, title: 'One Year', badge: '👑', description: 'A full year of daily Scripture reading.' },
];

const STREAK_STORAGE_KEY = 'theologica_reading_streak_v1';
const LEGACY_STREAK_STORAGE_KEY = ['theologica', 'hav' + 'en', 'streak_v1'].join('_');
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
  targetMilestoneDays?: number;
}

const TARGET_MILESTONE_STORAGE_KEY = 'theologica_target_milestone_days';

export function getTargetMilestoneDays(): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(TARGET_MILESTONE_STORAGE_KEY);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch {}
  }
  const raw = loadRawStorage();
  if (typeof raw.targetMilestoneDays === 'number' && raw.targetMilestoneDays > 0) {
    return raw.targetMilestoneDays;
  }
  return 7;
}

export function setTargetMilestoneDays(days: number): StreakData {
  const sanitized = Math.max(1, Math.min(1000, Math.round(days)));
  const raw = loadRawStorage();
  raw.targetMilestoneDays = sanitized;
  saveRawStorage(raw);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TARGET_MILESTONE_STORAGE_KEY, String(sanitized));
    } catch {}
    window.dispatchEvent(new CustomEvent('theologica_streak_updated', {
      detail: { targetMilestoneDays: sanitized }
    }));
  }
  notifyStreakSync();
  return getStreakData();
}

function loadRawStorage(): RawStreakStorage {
  if (typeof window === 'undefined') {
    return { activeDates: [], longestStreak: 0, lastActiveDate: '', targetMilestoneDays: 7 };
  }
  try {
    let raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STREAK_STORAGE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        activeDates: Array.isArray(parsed.activeDates) ? parsed.activeDates : [],
        longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
        lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : '',
        graceUsedDate: parsed.graceUsedDate,
        targetMilestoneDays: typeof parsed.targetMilestoneDays === 'number' && parsed.targetMilestoneDays > 0
          ? parsed.targetMilestoneDays
          : undefined,
      };
    }
  } catch {}
  return { activeDates: [], longestStreak: 0, lastActiveDate: '', targetMilestoneDays: 7 };
}

function saveRawStorage(data: RawStreakStorage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    // Also store lightweight cookie for SSR / service workers
    const { streak: activeStreak } = calculateStreakNumber(data.activeDates);
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
 * Public function to retrieve complete reading streak state.
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

  // User-defined milestone goal (or sensible default 7 days)
  const targetDays = getTargetMilestoneDays();
  const matchedPreset = STREAK_MILESTONES.find(m => m.days === targetDays);

  const targetMilestone: TargetMilestoneInfo = {
    days: targetDays,
    title: matchedPreset ? matchedPreset.title : `${targetDays}-Day Streak`,
    badge: matchedPreset ? matchedPreset.badge : '🎯',
    description: matchedPreset ? matchedPreset.description : `Reach a ${targetDays}-day reading streak in Scripture.`,
    isEarned: currentStreak >= targetDays,
    progressPercent: Math.min(100, Math.round((currentStreak / targetDays) * 100)),
    daysRemaining: Math.max(0, targetDays - currentStreak),
    isCustom: !matchedPreset,
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
    targetMilestoneDays: targetDays,
    targetMilestone,
    nextMilestone: targetMilestone,
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

  notifyStreakSync();

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

  notifyStreakSync();

  return getStreakData();
}

type StreakSyncCallback = () => void;
let streakSyncCallback: StreakSyncCallback | null = null;

export function registerStreakSyncCallback(cb: StreakSyncCallback | null): void {
  streakSyncCallback = cb;
}

function notifyStreakSync(): void {
  if (typeof streakSyncCallback === 'function') {
    try {
      streakSyncCallback();
    } catch (e) {
      console.warn('Streak sync callback error:', e);
    }
  }
}

export function getRawStreakStorage(): RawStreakStorage {
  return loadRawStorage();
}

export function getTodayHabits(dateStr: string = getLocalDateString()): TodayGoals {
  return loadTodayHabits(dateStr);
}

/**
 * Merges streak data fetched from the user account into local storage
 * and calculates the new unified streak across devices.
 */
export function mergeAccountStreakData(remote: {
  activeDates?: string[];
  longestStreak?: number;
  lastActiveDate?: string;
  dailyChapterGoal?: number;
  targetMilestoneDays?: number;
  todayGoals?: Partial<TodayGoals>;
}): StreakData {
  const localRaw = loadRawStorage();
  const remoteDates = Array.isArray(remote.activeDates) ? remote.activeDates : [];
  const localDates = Array.isArray(localRaw.activeDates) ? localRaw.activeDates : [];

  const mergedDates = Array.from(new Set([...localDates, ...remoteDates]))
    .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  const { streak: currentStreak } = calculateStreakNumber(mergedDates);
  const longestStreak = Math.max(
    localRaw.longestStreak || 0,
    remote.longestStreak || 0,
    currentStreak
  );

  const todayStr = getLocalDateString();
  const localHabits = loadTodayHabits(todayStr);
  const remoteHabits = remote.todayGoals || {};

  const mergedTodayHabits: TodayGoals = {
    scripture: Boolean(localHabits.scripture || remoteHabits.scripture),
    devotional: Boolean(localHabits.devotional || remoteHabits.devotional),
    prayer: Boolean(localHabits.prayer || remoteHabits.prayer),
    chaptersCompletedToday: Math.max(
      localHabits.chaptersCompletedToday || 0,
      remoteHabits.chaptersCompletedToday || 0
    ),
  };

  saveTodayHabits(todayStr, mergedTodayHabits);

  const incomingTarget = typeof remote.targetMilestoneDays === 'number' && remote.targetMilestoneDays > 0
    ? remote.targetMilestoneDays
    : localRaw.targetMilestoneDays;

  const updatedRaw: RawStreakStorage = {
    activeDates: mergedDates,
    longestStreak,
    lastActiveDate: mergedDates[mergedDates.length - 1] || '',
    graceUsedDate: localRaw.graceUsedDate,
    targetMilestoneDays: incomingTarget,
  };

  saveRawStorage(updatedRaw);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_streak_updated', {
      detail: { currentStreak, activeDatesCount: mergedDates.length }
    }));
  }

  return getStreakData();
}

export interface StreakScripture {
  text: string;
  reference: string;
}

/**
 * Daily Encouragement Verses on Scripture, Faithfulness, Wisdom & Seeking God
 */
export const DAILY_STREAK_SCRIPTURES: StreakScripture[] = [
  { text: "Your word is a lamp to my feet and a light to my path.", reference: "Psalm 119:105" },
  { text: "He does not faint or grow weary; His understanding is unsearchable.", reference: "Isaiah 40:28" },
  { text: "Let us not grow weary of doing good, for in due season we will reap, if we do not give up.", reference: "Galatians 6:9" },
  { text: "Draw near to God, and He will draw near to you.", reference: "James 4:8" },
  { text: "Morning by morning He awakens me; He awakens my ear to hear as those who are taught.", reference: "Isaiah 50:4" },
  { text: "The steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning.", reference: "Lamentations 3:22-23" },
  { text: "I have stored up Your word in my heart, that I might not sin against You.", reference: "Psalm 119:11" },
  { text: "This Book of the Law shall not depart from your mouth, but you shall meditate on it day and night.", reference: "Joshua 1:8" },
  { text: "His delight is in the law of the Lord, and on His law he meditates day and night.", reference: "Psalm 1:2" },
  { text: "Man shall not live by bread alone, but by every word that comes from the mouth of God.", reference: "Matthew 4:4" },
  { text: "So faith comes from hearing, and hearing through the word of Christ.", reference: "Romans 10:17" },
  { text: "All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.", reference: "2 Timothy 3:16" },
  { text: "For the word of God is living and active, sharper than any two-edged sword.", reference: "Hebrews 4:12" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", reference: "Proverbs 3:5" },
  { text: "In all your ways acknowledge Him, and He will make straight your paths.", reference: "Proverbs 3:6" },
  { text: "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom.", reference: "Colossians 3:16" },
  { text: "The unfolding of Your words gives light; it imparts understanding to the simple.", reference: "Psalm 119:130" },
  { text: "Your words were found, and I ate them, and Your words became to me a joy and the delight of my heart.", reference: "Jeremiah 15:16" },
  { text: "So shall My word be that goes out from My mouth; it shall not return to Me empty.", reference: "Isaiah 55:11" },
  { text: "The law of the Lord is perfect, reviving the soul; the testimony of the Lord is sure, making wise the simple.", reference: "Psalm 19:7" },
  { text: "Come to Me, all who labor and are heavy laden, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.", reference: "Philippians 4:6" },
  { text: "And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.", reference: "Philippians 4:7" },
  { text: "You keep him in perfect peace whose mind is stayed on You, because he trusts in You.", reference: "Isaiah 26:3" },
  { text: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He restores my soul.", reference: "Psalm 23:1-3" },
  { text: "Be attentive to My words; incline your ear to My sayings. For they are life to those who find them, and healing to all their flesh.", reference: "Proverbs 4:20, 22" },
  { text: "Open my eyes, that I may behold wondrous things out of Your law.", reference: "Psalm 119:18" },
  { text: "Like newborn infants, long for the pure spiritual milk, that by it you may grow up into salvation.", reference: "1 Peter 2:2" },
  { text: "If you abide in My word, you are truly My disciples, and you will know the truth, and the truth will set you free.", reference: "John 8:31-32" },
  { text: "O God, You are my God; earnestly I seek You; my soul thirsts for You, my flesh faints for You.", reference: "Psalm 63:1" },
  { text: "What does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?", reference: "Micah 6:8" },
  { text: "How can a young person stay on the path of purity? By living according to Your word.", reference: "Psalm 119:9" },
  { text: "Do not be conformed to this world, but be transformed by the renewal of your mind.", reference: "Romans 12:2" },
  { text: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!", reference: "Psalm 46:10" },
  { text: "Seek first the kingdom of God and His righteousness, and all these things will be added to you.", reference: "Matthew 6:33" },
  { text: "This is my comfort in my affliction, that Your promise gives me life.", reference: "Psalm 119:50" },
  { text: "Let us run with endurance the race that is set before us, looking to Jesus, the founder and perfecter of our faith.", reference: "Hebrews 12:1-2" },
  { text: "Bless the Lord, O my soul, and forget not all His benefits.", reference: "Psalm 103:2" },
  { text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.", reference: "Isaiah 41:10" },
  { text: "Commit your work to the Lord, and your plans will be established.", reference: "Proverbs 16:3" },
  { text: "My grace is sufficient for you, for My power is made perfect in weakness.", reference: "2 Corinthians 12:9" },
  { text: "Great peace have those who love Your law; nothing can make them stumble.", reference: "Psalm 119:165" },
  { text: "So teach us to number our days that we may get a heart of wisdom.", reference: "Psalm 90:12" },
  { text: "I am the vine; you are the branches. Whoever abides in Me and I in him, he it is that bears much fruit.", reference: "John 15:5" },
  { text: "Oh, taste and see that the Lord is good! Blessed is the man who takes refuge in Him!", reference: "Psalm 34:8" },
  { text: "Take the helmet of salvation, and the sword of the Spirit, which is the word of God.", reference: "Ephesians 6:17" },
  { text: "The grass withers, the flower fades, but the word of our God will stand forever.", reference: "Isaiah 40:8" },
  { text: "Every word of God proves true; He is a shield to those who take refuge in Him.", reference: "Proverbs 30:5" },
  { text: "Blessed rather are those who hear the word of God and keep it!", reference: "Luke 11:28" },
  { text: "Let the words of my mouth and the meditation of my heart be acceptable in Your sight, O Lord.", reference: "Psalm 19:14" },
  { text: "For where your treasure is, there your heart will be also.", reference: "Matthew 6:21" },
  { text: "Your righteousness is righteous forever, and Your law is true.", reference: "Psalm 119:142" },
];

/**
 * Varied, encouraging motivational messages tailored to reading consistency
 */
export const STREAK_ENCOURAGEMENTS = {
  completed: [
    "You’ve spent time in God’s Word today. Walk in His peace and truth.",
    "Another day anchored in Scripture. Let His wisdom guide your steps.",
    "Faithful in the Word today. May Christ dwell richly in your heart.",
    "Daily faithfulness builds lifelong strength. Cherish what you read today.",
    "A heart rooted in Scripture brings quiet peace to every part of your day.",
    "Another faithful step forward. Hold fast to the promises you read today.",
    "Treasuring God’s Word one day at a time. Blessed is the one who meditates on it.",
    "You are drawing near to the Lord each day. He is faithful to guide you.",
    "Faith comes by hearing, and hearing through the Word of God. Well done today.",
    "Rooted and grounded in truth. Keep shining His light wherever you go.",
    "Rest in the assurance of His love today. Your time in Scripture bears good fruit.",
    "Steady and faithful. May the verses you reflected on stay close to your heart.",
    "Walking with the Lord day by day. Keep pressing on in grace and hope.",
    "Time in God’s Word is never wasted. Carry His truth with you through the rest of your day.",
    "Anchored in truth. May God’s peace go before you today.",
    "A faithful step today. Keep your eyes fixed on Christ.",
  ],
  pending: [
    "Spend a quiet moment in Scripture today to nourish your spirit and keep your rhythm going.",
    "Even a few minutes in God’s Word can bring clarity and peace to your whole day.",
    "A chapter a day keeps your heart attuned to His voice. Open your Bible when you’re ready.",
    "Your reading is waiting. Pick up where you left off and rest in His promises.",
    "Feed your soul with Scripture today. Every verse is living and good.",
    "Take a deep breath and open God’s Word. He has something meaningful for you today.",
    "Stay steady on your reading journey. Open a chapter or devotional whenever you have a moment.",
    "Draw near to God today—He is always near to listen and speak through His Word.",
    "A quiet moment with the Lord brings lasting peace. Read a chapter whenever you have time.",
    "Set aside a few minutes for Scripture today to strengthen your heart and stay grounded.",
    "God’s Word is a lamp for your path today. Take a few quiet minutes to read.",
    "Nourish your mind with truth today. A chapter awaits whenever you’re ready.",
    "Quiet stillness in God's presence will refresh your spirit for today.",
  ],
  grace: [
    "Take your time today. Spend a few quiet moments in Scripture whenever you are ready.",
    "His mercies are new every morning. Pick up your reading today at your own pace.",
    "Life gets full, and there is always grace. Read a chapter today to renew your spirit.",
    "No rush—God meets you right where you are. Take a moment with the Word today.",
    "A fresh opportunity today. Open your Bible and continue your journey in faith.",
    "Grace is sufficient for every season. Take time in the Word today to rest in Him.",
  ],
};

export function getTodayStreakQuote(): StreakScripture & { index: number } {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const index = Math.abs(dayOfYear) % DAILY_STREAK_SCRIPTURES.length;
  return { ...DAILY_STREAK_SCRIPTURES[index], index };
}

export function getRandomStreakQuote(excludeIndex?: number): StreakScripture & { index: number } {
  if (DAILY_STREAK_SCRIPTURES.length <= 1) {
    return { ...DAILY_STREAK_SCRIPTURES[0], index: 0 };
  }
  let newIndex = Math.floor(Math.random() * DAILY_STREAK_SCRIPTURES.length);
  if (excludeIndex !== undefined && newIndex === excludeIndex) {
    newIndex = (newIndex + 1) % DAILY_STREAK_SCRIPTURES.length;
  }
  return { ...DAILY_STREAK_SCRIPTURES[newIndex], index: newIndex };
}

export function getEncouragingMessage(
  isCompletedToday: boolean,
  isGraceActive: boolean,
  streak: number,
  indexSeed?: number
): string {
  let list = STREAK_ENCOURAGEMENTS.pending;
  if (isGraceActive) {
    list = STREAK_ENCOURAGEMENTS.grace;
  } else if (isCompletedToday) {
    list = STREAK_ENCOURAGEMENTS.completed;
  }

  if (indexSeed !== undefined) {
    return list[Math.abs(indexSeed) % list.length];
  }

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const defaultIdx = Math.abs(dayOfYear * 7 + streak) % list.length;
  return list[defaultIdx];
}
