import devotionalsData from './devotionalsData.json';

export interface DevotionalEntry {
  dayOfYear: number;
  morningVerse: string;
  morningText: string;
  eveningVerse: string;
  eveningText: string;
  citation: string;
}

export const DEVOTIONALS: DevotionalEntry[] = devotionalsData as DevotionalEntry[];

// Helper to get the correct entry regardless of dayOfYear
export function getDevotionalForDay(dayOfYear: number): DevotionalEntry {
  // Try to find the exact day
  const match = DEVOTIONALS.find(d => d.dayOfYear === dayOfYear);
  if (match) return match;
  
  // Graceful fallback just in case
  const index = (dayOfYear - 1) % DEVOTIONALS.length;
  return DEVOTIONALS[index];
}
