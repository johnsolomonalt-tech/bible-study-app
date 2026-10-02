/**
 * Prayer Sanctuary & Spiritual Journal Service
 * 
 * Provides local & remote management for active prayers, answered praise logs,
 * and quiet time reflection prompts. Integrates with the streak engine.
 */

import { recordHabitActivity } from './streakService';

export type PrayerCategory = 
  | 'general'
  | 'family'
  | 'health'
  | 'guidance'
  | 'thanksgiving'
  | 'growth'
  | 'church';

export interface PrayerItem {
  id: string;
  title: string;
  content: string;
  category: PrayerCategory;
  scripture?: string;
  isAnswered: boolean;
  answeredAt?: string;
  answerPraise?: string;
  createdAt: string;
  updatedAt: string;
}

export const PRAYER_CATEGORIES: { id: PrayerCategory; label: string; icon: string; color: string }[] = [
  { id: 'general', label: 'General', icon: '🙏', color: 'text-accent bg-accent/10 border-accent/25' },
  { id: 'family', label: 'Family & Loved Ones', icon: '🏡', color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
  { id: 'guidance', label: 'Wisdom & Guidance', icon: '🧭', color: 'text-blue-500 bg-blue-500/10 border-blue-500/25' },
  { id: 'health', label: 'Healing & Peace', icon: '🌿', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' },
  { id: 'thanksgiving', label: 'Praise & Gratitude', icon: '✨', color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' },
  { id: 'growth', label: 'Spiritual Growth', icon: '🌱', color: 'text-purple-500 bg-purple-500/10 border-purple-500/25' },
  { id: 'church', label: 'Church & Community', icon: '⛪', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25' },
];

const PRAYERS_STORAGE_KEY = 'theologica_prayers_v1';

const INITIAL_STARTER_PRAYERS: PrayerItem[] = [];

function loadLocalPrayers(): PrayerItem[] {
  if (typeof window === 'undefined') return INITIAL_STARTER_PRAYERS;
  try {
    const raw = localStorage.getItem(PRAYERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy starter template items so user starts fresh
        return parsed.filter((p: PrayerItem) => p.id !== 'starter-1' && p.id !== 'starter-2');
      }
    }
  } catch {}
  return INITIAL_STARTER_PRAYERS;
}

function saveLocalPrayers(prayers: PrayerItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRAYERS_STORAGE_KEY, JSON.stringify(prayers));
  } catch {}
}

export function getPrayers(): PrayerItem[] {
  return loadLocalPrayers();
}

export function addPrayer(item: {
  title: string;
  content: string;
  category?: PrayerCategory;
  scripture?: string;
}): PrayerItem {
  const prayers = loadLocalPrayers();
  const now = new Date().toISOString();
  
  const newPrayer: PrayerItem = {
    id: 'prayer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: item.title.trim() || 'Untitled Prayer',
    content: item.content.trim(),
    category: item.category || 'general',
    scripture: item.scripture?.trim() || undefined,
    isAnswered: false,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newPrayer, ...prayers];
  saveLocalPrayers(updated);

  // Automatically record spiritual habit for the reading streak!
  recordHabitActivity('prayer');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_prayers_updated'));
  }

  notifyPrayerSync();

  return newPrayer;
}

export function markPrayerAnswered(id: string, answerPraise?: string): PrayerItem | null {
  const prayers = loadLocalPrayers();
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updatedItem: PrayerItem = {
    ...prayers[index],
    isAnswered: true,
    answeredAt: now,
    answerPraise: answerPraise?.trim() || undefined,
    updatedAt: now,
  };

  prayers[index] = updatedItem;
  saveLocalPrayers(prayers);

  // Mark prayer habit in streak
  recordHabitActivity('prayer');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_prayers_updated'));
  }

  notifyPrayerSync();

  return updatedItem;
}

export function deletePrayer(id: string): void {
  const prayers = loadLocalPrayers();
  const filtered = prayers.filter(p => p.id !== id);
  saveLocalPrayers(filtered);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_prayers_updated'));
  }

  notifyPrayerSync();
}

export function updatePrayer(id: string, updates: Partial<Pick<PrayerItem, 'title' | 'content' | 'category' | 'scripture'>>): PrayerItem | null {
  const prayers = loadLocalPrayers();
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedItem: PrayerItem = {
    ...prayers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  prayers[index] = updatedItem;
  saveLocalPrayers(prayers);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_prayers_updated'));
  }

  notifyPrayerSync();

  return updatedItem;
}

type PrayerSyncCallback = () => void;
let prayerSyncCallback: PrayerSyncCallback | null = null;

export function registerPrayerSyncCallback(cb: PrayerSyncCallback | null): void {
  prayerSyncCallback = cb;
}

function notifyPrayerSync(): void {
  if (typeof prayerSyncCallback === 'function') {
    try {
      prayerSyncCallback();
    } catch (e) {
      console.warn('Prayer sync callback error:', e);
    }
  }
}

/**
 * Merge remote prayers from user account with local prayers
 */
export function mergeAccountPrayers(remotePrayers: PrayerItem[]): PrayerItem[] {
  if (!Array.isArray(remotePrayers)) return loadLocalPrayers();
  const localPrayers = loadLocalPrayers();

  const prayerMap = new Map<string, PrayerItem>();
  localPrayers.forEach(p => { if (p?.id) prayerMap.set(p.id, p); });

  remotePrayers.forEach(p => {
    if (p?.id) {
      const existing = prayerMap.get(p.id);
      if (!existing || (p.updatedAt && p.updatedAt >= (existing.updatedAt || ''))) {
        prayerMap.set(p.id, p);
      }
    }
  });

  const merged = Array.from(prayerMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  saveLocalPrayers(merged);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theologica_prayers_updated'));
  }

  return merged;
}

