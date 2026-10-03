/**
 * Audio & Haptic Notification Service
 * Plays pleasant, gentle chimes and triggers mobile haptic feedback.
 */

export function playTimerDing() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Primary bell tone (warm pure sine)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now); // C6
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6 ding

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Harmonic sparkle chime (bell overtone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093.0, now + 0.03); // C7 overtone

    gain2.gain.setValueAtTime(0, now + 0.03);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.25);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.95);
  } catch (err) {
    console.warn('Unable to play timer chime audio:', err);
  }
}

export function triggerTimerVibration() {
  if (typeof window === 'undefined') return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      // Gentle notification pattern: 250ms buzz, 100ms pause, 350ms buzz
      navigator.vibrate([250, 100, 350]);
    }
  } catch {
    // Vibration is optional and may be blocked by browser policy
  }
}

export function notifyTimerComplete() {
  playTimerDing();
  triggerTimerVibration();
}
