"use client";

// Client-side analytics tracker
// Strict Privacy: Only operational eventType and high-level safe tags are transmitted.
// ZERO user text, personal notes, or chat messages are EVER tracked.

export function getClientAnonId(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    // 1. Check persistent cookie first
    const match = document.cookie.match(/(^|;)\s*th_vid=([^;]+)/);
    if (match && match[2] && match[2].length > 4) {
      return decodeURIComponent(match[2]);
    }

    // 2. Check localStorage
    let id = localStorage.getItem('th_anon_id');
    if (!id || id.length < 5) {
      id = 'vid_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('th_anon_id', id);
    }

    // Ensure 1-year cookie is synced
    try {
      document.cookie = `th_vid=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore cookie errors
    }

    return id;
  } catch {
    return 'anon';
  }
}

export function trackClientEvent(
  eventType: string,
  metadata?: Record<string, any>,
  userId?: string | null
) {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      eventType,
      anonymousId: getClientAnonId(),
      userId: userId || undefined,
      metadata,
    };

    const jsonStr = JSON.stringify(payload);

    // Prefer fetch with keepalive to guarantee headers and cookies are sent
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {
      if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/track', blob);
      }
    });
  } catch {
    // Telemetry must never crash or affect user experience
  }
}

/**
 * Initializes session tracking once per browser tab session.
 */
export function initSessionTracking(userId?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const hasTrackedSession = sessionStorage.getItem('th_session_started');
    if (!hasTrackedSession) {
      sessionStorage.setItem('th_session_started', 'true');
      trackClientEvent(
        'session_start',
        {
          platform: window.innerWidth < 768 ? 'mobile' : 'desktop',
        },
        userId
      );
    }
  } catch {
    // Ignore storage errors
  }
}
