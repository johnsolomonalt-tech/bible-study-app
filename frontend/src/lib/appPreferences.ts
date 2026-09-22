/**
 * Core Preferences & Temporary State Persistence
 * 
 * Provides unified dual-persistence using HTTP-compatible cookies (path=/, max-age=1 year, SameSite=Lax)
 * and localStorage fallback. Ensures temporary state (active tab, Bible translation, last read book/chapter,
 * layout toggles, devotional settings) is preserved across page reloads, browser restarts, and PWA launches.
 */

export const PREF_KEYS = {
  ACTIVE_TAB: 'theologica_active_tab',
  BIBLE_VERSION: 'theologica_bible_version',
  LAST_BOOK: 'theologica_last_book',
  LAST_CHAPTER: 'theologica_last_chapter',
  SHOW_LEFT_SIDEBAR: 'theologica_show_left_sidebar',
  SHOW_RIGHT_SIDEBAR: 'theologica_show_right_sidebar',
  SHOW_BOTTOM_NOTES: 'theologica_show_bottom_notes',
  MOBILE_STUDY_VIEW: 'theologica_mobile_study_view',
  DEVOTIONAL_TIME: 'theologica_devotional_time',
  THEME: 'theme',
  TRACKER_FORMAT: 'trackerFormat',
  TRACKER_EXPANDED_TESTAMENTS: 'theologica_tracker_testaments',
  TRACKER_EXPANDED_BOOKS: 'theologica_tracker_books',
  ACTIVE_NOTE_ID: 'theologica_active_note_id',
  ACTIVE_CHAT_ID: 'theologica_active_chat_id',
  COOKIE_CONSENT: 'theologica_cookie_consent',
} as const;

export const VALID_TABS = ['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'] as const;
export type ValidTab = typeof VALID_TABS[number];

export const VALID_MOBILE_VIEWS = ['reader', 'chapters', 'ai'] as const;
export type ValidMobileView = typeof VALID_MOBILE_VIEWS[number];

/**
 * Write a cookie with 1-year expiration, Lax SameSite policy, and root path.
 */
export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return;
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore restricted environments
  }
}

/**
 * Read a cookie by name from document.cookie.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEq = `${encodeURIComponent(name)}=`;
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.indexOf(nameEq) === 0) {
        return decodeURIComponent(c.substring(nameEq.length));
      }
    }
  } catch {
    // Ignore restricted environments
  }
  return null;
}

/**
 * Remove a cookie by name.
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Ignore restricted environments
  }
}

/**
 * Read preference checking cookies first, then localStorage, with legacy key fallbacks.
 */
export function getPreference(key: string, defaultValue: string = ''): string {
  if (typeof window === 'undefined') return defaultValue;

  try {
    // 1. Check primary cookie
    const cookieVal = getCookie(key);
    if (cookieVal !== null && cookieVal !== undefined && cookieVal !== '') {
      return cookieVal;
    }

    // 2. Check primary localStorage
    const localVal = localStorage.getItem(key);
    if (localVal !== null && localVal !== undefined && localVal !== '') {
      // Sync back to cookie
      setCookie(key, localVal);
      return localVal;
    }

    // 3. Fallback for legacy keys if applicable
    if (key === PREF_KEYS.LAST_BOOK) {
      const legacyBook = localStorage.getItem('lastBook');
      if (legacyBook) {
        setPreference(key, legacyBook);
        return legacyBook;
      }
    } else if (key === PREF_KEYS.LAST_CHAPTER) {
      const legacyChap = localStorage.getItem('lastChapter');
      if (legacyChap) {
        setPreference(key, legacyChap);
        return legacyChap;
      }
    } else if (key === PREF_KEYS.BIBLE_VERSION) {
      const legacyTrans = localStorage.getItem('lastTranslation');
      if (legacyTrans) {
        setPreference(key, legacyTrans);
        return legacyTrans;
      }
    }
  } catch {
    // Fallback on restricted storage error
  }

  return defaultValue;
}

/**
 * Dual-save preference to both cookie and localStorage.
 */
export function setPreference(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    setCookie(key, value);
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota or permission errors
  }
}

/**
 * Remove preference from both cookie and localStorage.
 */
export function removePreference(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    deleteCookie(key);
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

/**
 * Flush an object of key-value pairs to cookies and localStorage.
 */
export function flushPreferences(prefs: Record<string, string>): void {
  for (const [k, v] of Object.entries(prefs)) {
    if (v !== undefined && v !== null) {
      setPreference(k, v);
    }
  }
}
