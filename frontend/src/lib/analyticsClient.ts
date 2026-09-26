"use client";

// Client-side analytics tracker
// Strict Privacy: Only operational eventType and high-level safe tags are transmitted.
// ZERO user text, personal notes, or chat messages are EVER tracked.

function getClientAnonId(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let id = localStorage.getItem('th_anon_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('th_anon_id', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function trackClientEvent(eventType: string, metadata?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      eventType,
      anonymousId: getClientAnonId(),
      metadata,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never crash or affect user experience
  }
}

/**
 * Initializes session tracking once per browser tab session.
 */
export function initSessionTracking() {
  if (typeof window === 'undefined') return;
  try {
    const hasTrackedSession = sessionStorage.getItem('th_session_started');
    if (!hasTrackedSession) {
      sessionStorage.setItem('th_session_started', 'true');
      trackClientEvent('session_start', {
        platform: window.innerWidth < 768 ? 'mobile' : 'desktop',
      });
    }
  } catch {
    // Ignore storage errors
  }
}
