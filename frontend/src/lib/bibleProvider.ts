import { findCanonicalBook } from './bibleCanon';
import { BibleChapter, BibleVerse, BibleBookData } from '@/types/bible';

// Tier 1: Fast In-Memory Cache
const MEMORY_CACHE = new Map<string, BibleChapter>();
// Book-level in-memory cache for local translations
const BOOK_MEMORY_CACHE = new Map<string, BibleBookData>();

const CACHE_PREFIX = 'theologica_bible_v1:';
const MAX_PERSISTENT_ITEMS = 80;

/**
 * Read from persistent client cache (localStorage)
 */
function getFromPersistentCache(key: string): BibleChapter | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as BibleChapter;
  } catch {
    return null;
  }
}

/**
 * Save to persistent client cache (localStorage) with quota-safe eviction
 */
function saveToPersistentCache(key: string, data: BibleChapter) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    // Evict oldest cached chapters if quota exceeded
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
          if (keysToRemove.length >= 20) break;
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch {
      // Ignore if localStorage completely full
    }
  }
}

export interface GetPassageResult {
  chapter: BibleChapter;
  verse?: BibleVerse;
}

/**
 * Unified Bible passage fetcher supporting local open translations and dynamic fallback.
 *
 * @param version - Translation abbreviation (e.g. "bsb", "web", "kjv", "asv", "esv")
 * @param book - Book name, abbreviation, or canonical code (e.g. "Genesis", "Gen", "GEN", "John", "1 Cor")
 * @param chapter - Chapter number (1-based)
 * @param verse - Optional verse number (1-based)
 */
export async function getPassage(
  version: string,
  book: string,
  chapter: number,
  verse?: number
): Promise<GetPassageResult> {
  const versionKey = (version || 'bsb').toLowerCase().trim();
  const bookMeta = findCanonicalBook(book);

  if (!bookMeta) {
    throw new Error(`Invalid Bible book reference: "${book}"`);
  }

  const bookCode = bookMeta.code;
  const cacheKey = `${versionKey}:${bookCode}:${chapter}`;

  // 1. Tier 1: Check Memory Cache (0ms)
  if (MEMORY_CACHE.has(cacheKey)) {
    const chapterData = MEMORY_CACHE.get(cacheKey)!;
    const singleVerse = verse ? chapterData.verses.find((v) => v.verse === verse) : undefined;
    return { chapter: chapterData, verse: singleVerse };
  }

  // 2. Tier 2: Check Persistent Local Storage (0ms)
  const persisted = getFromPersistentCache(cacheKey);
  if (persisted) {
    MEMORY_CACHE.set(cacheKey, persisted);
    const singleVerse = verse ? persisted.verses.find((v) => v.verse === verse) : undefined;
    return { chapter: persisted, verse: singleVerse };
  }

  // 3. Local Translations (BSB, WEB, KJV)
  const isLocal = ['bsb', 'web', 'kjv'].includes(versionKey);
  if (isLocal) {
    const bookCacheKey = `${versionKey}:${bookCode}`;
    let bookData: BibleBookData | undefined = BOOK_MEMORY_CACHE.get(bookCacheKey);

    if (!bookData) {
      // Fetch the full book JSON (~30-60KB). This loads all chapters in this book in a single request!
      const res = await fetch(`/bibles/${versionKey}/${bookCode}.json`);
      if (!res.ok) {
        throw new Error(`Failed to load local scripture data for ${versionKey.toUpperCase()} ${bookMeta.name}`);
      }
      bookData = (await res.json()) as BibleBookData;
      BOOK_MEMORY_CACHE.set(bookCacheKey, bookData);

      // Pre-warm memory cache for all chapters in this book for instant navigation
      for (const [chNum, chVerses] of Object.entries(bookData.chapters)) {
        const chPayload: BibleChapter = {
          book: bookCode,
          bookName: bookMeta.name,
          chapter: Number(chNum),
          translation: versionKey.toUpperCase(),
          verses: chVerses,
        };
        const itemKey = `${versionKey}:${bookCode}:${chNum}`;
        MEMORY_CACHE.set(itemKey, chPayload);
        saveToPersistentCache(itemKey, chPayload);
      }
    }

    const chapterVerses = bookData.chapters[String(chapter)] || [];
    const chapterPayload: BibleChapter = {
      book: bookCode,
      bookName: bookMeta.name,
      chapter,
      translation: versionKey.toUpperCase(),
      verses: chapterVerses,
    };

    MEMORY_CACHE.set(cacheKey, chapterPayload);
    saveToPersistentCache(cacheKey, chapterPayload);

    const singleVerse = verse ? chapterPayload.verses.find((v) => v.verse === verse) : undefined;
    return { chapter: chapterPayload, verse: singleVerse };
  }

  // 4. Dynamic Fallback: Query internal API route (/api/bible/[version]/[book]/[chapter])
  const apiUrl = `/api/bible/${versionKey}/${bookCode}/${chapter}`;
  const apiRes = await fetch(apiUrl);
  if (!apiRes.ok) {
    const errJson = await apiRes.json().catch(() => ({}));
    const message = errJson.message || errJson.error || `HTTP ${apiRes.status}: Failed to fetch scripture`;
    throw new Error(message);
  }

  const remoteChapter = (await apiRes.json()) as BibleChapter;
  MEMORY_CACHE.set(cacheKey, remoteChapter);
  saveToPersistentCache(cacheKey, remoteChapter);

  const singleVerse = verse ? remoteChapter.verses.find((v) => v.verse === verse) : undefined;
  return { chapter: remoteChapter, verse: singleVerse };
}

/**
 * Convenience method to get exact verse text
 */
export async function getVerseText(
  version: string,
  book: string,
  chapter: number,
  verse: number
): Promise<string | undefined> {
  try {
    const result = await getPassage(version, book, chapter, verse);
    return result.verse?.text;
  } catch {
    return undefined;
  }
}
