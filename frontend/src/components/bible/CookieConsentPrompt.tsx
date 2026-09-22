"use client";

import React, { useState, useEffect } from 'react';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import { getPreference, setPreference, PREF_KEYS } from '@/lib/appPreferences';

interface CookieConsentPromptProps {
  theme?: 'dark' | 'light';
  onOpenLegalNotice?: () => void;
}

export function CookieConsentPrompt({
  theme = 'dark',
  onOpenLegalNotice,
}: CookieConsentPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    // Check if the user has already consented
    const consent = getPreference(PREF_KEYS.COOKIE_CONSENT);
    if (!consent) {
      // Delay display slightly to avoid jarring layout shifts on initial paint
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setPreference(PREF_KEYS.COOKIE_CONSENT, 'accepted');
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setPreference(PREF_KEYS.COOKIE_CONSENT, 'dismissed');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie and storage notice"
      role="region"
      className="fixed z-[99] bottom-[76px] left-3 right-3 md:bottom-6 md:left-6 md:right-auto md:max-w-[420px] rounded-2xl p-4 md:p-4.5 border shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in"
      style={{
        backgroundColor: isDark ? '#1e1e22' : '#ffffff',
        borderColor: isDark ? '#323238' : '#e4e4e7',
        color: isDark ? '#f4f4f5' : '#18181b',
        boxShadow: isDark
          ? '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
          : '0 20px 35px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: isDark ? '#2a201c' : '#fdf2ec',
            color: '#c96442',
          }}
        >
          <Cookie size={18} />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-sans font-semibold text-[13px] tracking-tight text-fg">
              Cookie & Workspace Storage
            </h3>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{
                backgroundColor: isDark ? '#27272a' : '#f4f4f5',
                color: isDark ? '#a1a1aa' : '#71717a',
              }}
            >
              <ShieldCheck size={11} className="text-emerald-500" /> Essential
            </span>
          </div>

          <p
            className="text-[12px] leading-relaxed mb-3.5"
            style={{ color: isDark ? '#a1a1aa' : '#52525b' }}
          >
            We use functional cookies and local storage so the site stays as you left it (such as your active tab, Bible translation, and reading position). No tracking or marketing cookies are used.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-lg text-white font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              style={{ backgroundColor: '#c96442' }}
            >
              OK, Got It
            </button>

            {onOpenLegalNotice && (
              <button
                type="button"
                onClick={onOpenLegalNotice}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-hover"
                style={{
                  color: isDark ? '#a1a1aa' : '#71717a',
                }}
              >
                Attributions & Info
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-md text-muted hover:text-fg transition-colors"
          title="Dismiss notice"
          aria-label="Dismiss cookie notice"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
