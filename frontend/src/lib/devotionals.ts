export interface DevotionalEntry {
  dayOfYear: number;
  morningVerse: string;
  morningText: string;
  eveningVerse: string;
  eveningText: string;
  citation: string;
}

const memoryCache = new Map<number, DevotionalEntry>();
let allDevotionalsCache: DevotionalEntry[] | null = null;

/**
 * Asynchronously fetch a single day's devotional from the lightweight API,
 * keeping the initial 1.5MB JSON bundle completely out of the client's initial page download.
 */
export async function fetchDevotionalForDay(dayOfYear: number): Promise<DevotionalEntry> {
  if (memoryCache.has(dayOfYear)) {
    return memoryCache.get(dayOfYear)!;
  }

  // 1. Fetch from fast micro-API
  try {
    const res = await fetch(`/api/devotionals?day=${dayOfYear}&text=2`);
    if (res.ok) {
      const data: DevotionalEntry = await res.json();
      memoryCache.set(dayOfYear, data);
      return data;
    }
  } catch {
    // Continue to dynamic chunk fallback
  }

  // 2. Client-side dynamic import chunk (only loaded if API is offline)
  try {
    if (!allDevotionalsCache) {
      const mod = await import('./devotionalsData.json');
      allDevotionalsCache = mod.default as DevotionalEntry[];
    }
    const match = allDevotionalsCache.find(d => d.dayOfYear === dayOfYear) ||
      allDevotionalsCache[(dayOfYear - 1) % allDevotionalsCache.length] ||
      allDevotionalsCache[0];
    memoryCache.set(dayOfYear, match);
    return match;
  } catch {
    // 3. Fallback placeholder
    return {
      dayOfYear,
      morningVerse: "Morning by morning he wakens; he wakens my ear to listen like one being instructed. — Isaiah 50:4",
      morningText: "Wait upon the Lord, and he shall renew your strength. Trust in his mercy each day.",
      eveningVerse: "The Lord watches over you—the Lord is your shade at your right hand. — Psalm 121:5",
      eveningText: "Rest in his eternal grace and love this evening.",
      citation: "Charles H. Spurgeon, Morning and Evening",
    };
  }
}

/**
 * Synchronous accessor for cached entries
 */
export function getDevotionalForDay(dayOfYear: number): DevotionalEntry | null {
  if (memoryCache.has(dayOfYear)) {
    return memoryCache.get(dayOfYear)!;
  }
  return null;
}

/**
 * Strips the duplicated leading verse quotation and reference from the raw devotional text
 * so the reader goes straight into the devotional reflection without repeating the verse.
 */
export function getDevotionalBody(rawText: string): string {
  if (!rawText) return '';
  return rawText.replace(/^("[^"]+"|\S[^\n]+?)\s*[-—–]\s*[^\n]+\s*\n+/, '').trimStart();
}

/** The source has 366 dated entries, including February 29 in every dataset year. */
export function toDevotionalDatasetDay(calendarDay: number, year: number): number {
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return !isLeapYear && calendarDay >= 60 ? calendarDay + 1 : calendarDay;
}
