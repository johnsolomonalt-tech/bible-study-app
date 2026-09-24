"use client";

import React, { useEffect, useState } from 'react';
import { BookOpen, X, ExternalLink } from 'lucide-react';
import { OPEN_TRANSLATIONS } from '@/types/bible';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export function LegalNoticeModal({ isOpen, onClose, theme }: LegalNoticeModalProps) {
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(theme || 'dark');

  useEffect(() => {
    if (theme) {
      setEffectiveTheme(theme);
    } else if (typeof document !== 'undefined') {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light' || localStorage.getItem('theme') === 'light';
      setEffectiveTheme(isLight ? 'light' : 'dark');
    }
  }, [theme, isOpen]);

  if (!isOpen) return null;

  const isDark = effectiveTheme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
      <div 
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-colors border"
        style={{
          backgroundColor: isDark ? '#1a1a1c' : '#ffffff',
          borderColor: isDark ? '#2e2e32' : '#e4e4e7',
          color: isDark ? '#fafafa' : '#141413',
        }}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-5 py-4 border-b transition-colors"
          style={{
            backgroundColor: isDark ? '#141416' : '#f9f9fb',
            borderColor: isDark ? '#2e2e32' : '#e4e4e7',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(201, 100, 66, 0.15)' : '#feeddf',
                color: '#c96442',
              }}
            >
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-sans">
                Scripture Attributions
              </h2>
              <p className="text-[11px]" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                Bible Translations &amp; Credits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{
              color: isDark ? '#a1a1aa' : '#71717a',
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-3 text-xs leading-relaxed">
          <p style={{ color: isDark ? '#d4d4d8' : '#52525b' }}>
            The Scripture texts in this application are made available through public domain dedication and open licensing:
          </p>

          <div className="space-y-2.5">
            {OPEN_TRANSLATIONS.slice(0, 3).map((t) => (
              <div 
                key={t.id}
                className="p-3.5 rounded-xl border transition-colors"
                style={{
                  backgroundColor: isDark ? '#222226' : '#f8f8fa',
                  borderColor: isDark ? '#2e2e32' : '#e4e4e7',
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-1.5 font-semibold mb-1">
                  <span style={{ color: isDark ? '#ffffff' : '#141413' }}>
                    {t.name} ({t.abbreviation})
                  </span>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border shrink-0"
                    style={{
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5',
                      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#a7f3d0',
                      color: isDark ? '#4ade80' : '#15803d',
                    }}
                  >
                    Public Domain
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
                  {t.copyrightNotice}
                </p>
                {t.id === 'bsb' && (
                  <a
                    href="https://berean.bible"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] mt-1.5 font-medium hover:underline"
                    style={{ color: '#c96442' }}
                  >
                    berean.bible <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="px-5 py-3 border-t flex items-center justify-between transition-colors"
          style={{
            backgroundColor: isDark ? '#141416' : '#f9f9fb',
            borderColor: isDark ? '#2e2e32' : '#e4e4e7',
          }}
        >
          <span className="text-[11px]" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
            Theologica &bull; Open Scripture
          </span>
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-1.5 rounded-lg text-white font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            style={{ backgroundColor: '#c96442' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
