"use client";

import React, { useState, useEffect } from 'react';
import { Cookie, X, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    // Check if the user has already acknowledged
    const consent = getPreference(PREF_KEYS.COOKIE_CONSENT);
    if (!consent) {
      // Delay display slightly to avoid layout shifts on initial paint
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 700);
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
      className="fixed z-[99] bottom-[76px] left-3 right-3 md:bottom-6 md:left-6 md:right-auto md:max-w-[390px] rounded-2xl p-3.5 md:p-4 border shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-4 fade-in"
      style={{
        backgroundColor: isDark ? '#1e1e22' : '#ffffff',
        borderColor: isDark ? '#323238' : '#e4e4e7',
        color: isDark ? '#f4f4f5' : '#18181b',
        boxShadow: isDark
          ? '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
          : '0 20px 35px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: isDark ? '#2a201c' : '#fdf2ec',
            color: '#c96442',
          }}
        >
          <Cookie size={16} />
        </div>

        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-sans font-semibold text-[13px] tracking-tight">
              Essential Cookies
            </h3>
            <span
              className="text-[10px] font-medium px-1.5 py-0.2 rounded-full inline-flex items-center gap-1"
              style={{
                backgroundColor: isDark ? '#27272a' : '#f4f4f5',
                color: isDark ? '#a1a1aa' : '#71717a',
              }}
            >
              <ShieldCheck size={10} className="text-emerald-500" /> Functional
            </span>
          </div>

          <p
            className="text-[12px] leading-snug mb-2.5"
            style={{ color: isDark ? '#a1a1aa' : '#52525b' }}
          >
            We use essential cookies to save your workspace as you left it. No tracking or ads.
          </p>

          {/* Collapsible Details Drawer */}
          {showDetails && (
            <div
              className="mb-3 p-2.5 rounded-xl border text-[11px] space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
              style={{
                backgroundColor: isDark ? '#141416' : '#f9f9fb',
                borderColor: isDark ? '#2e2e32' : '#e4e4e7',
                color: isDark ? '#d4d4d8' : '#3f3f46',
              }}
            >
              <div className="flex items-start gap-1.5">
                <span className="text-[#c96442] font-bold">&bull;</span>
                <span><strong>Active Tab:</strong> Remembers if you were in Study, Canvas, Devotionals, Notes, or AI Chats.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#c96442] font-bold">&bull;</span>
                <span><strong>Reading Position:</strong> Keeps your current book and chapter so you don&apos;t lose your place.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#c96442] font-bold">&bull;</span>
                <span><strong>Bible Version:</strong> Preserves your chosen translation (BSB, KJV, WEB, etc.).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#c96442] font-bold">&bull;</span>
                <span><strong>Appearance:</strong> Saves your dark/light theme and sidebar preferences.</span>
              </div>
              <div className="flex items-start gap-1.5 pt-1 border-t" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
                <span className="text-emerald-500 font-bold">&bull;</span>
                <span><strong>Privacy:</strong> 100% first-party cookies. Never shared or sold.</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              style={{ backgroundColor: '#c96442' }}
            >
              OK
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 hover:bg-surface"
              style={{
                color: isDark ? '#a1a1aa' : '#71717a',
              }}
            >
              {showDetails ? (
                <>Less <ChevronUp size={13} /></>
              ) : (
                <>Details <ChevronDown size={13} /></>
              )}
            </button>

            {onOpenLegalNotice && (
              <button
                type="button"
                onClick={onOpenLegalNotice}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:underline"
                style={{
                  color: isDark ? '#71717a' : '#a1a1aa',
                }}
              >
                Attributions
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted hover:text-fg transition-colors"
          title="Dismiss notice"
          aria-label="Dismiss cookie notice"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
