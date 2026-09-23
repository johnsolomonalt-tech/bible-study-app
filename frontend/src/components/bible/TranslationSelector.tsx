"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe, Lock } from 'lucide-react';
import { AVAILABLE_TRANSLATIONS, BibleTranslation } from '@/types/bible';
import { setPreference, PREF_KEYS } from '@/lib/appPreferences';

interface TranslationSelectorProps {
  currentTranslation: string;
  onSelectTranslation: (versionId: string) => void;
  className?: string;
  theme?: 'dark' | 'light';
}

export function TranslationSelector({
  currentTranslation,
  onSelectTranslation,
  className = '',
}: TranslationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTranslation =
    AVAILABLE_TRANSLATIONS.find(
      (t) => t.id.toLowerCase() === currentTranslation.toLowerCase()
    ) || AVAILABLE_TRANSLATIONS[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (t: BibleTranslation) => {
    onSelectTranslation(t.id);
    setIsOpen(false);
    setPreference(PREF_KEYS.BIBLE_VERSION, t.id);
  };

  const localTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.isLocal);
  const openTranslations = AVAILABLE_TRANSLATIONS.filter((t) => !t.isLocal && !t.isCopyrighted);
  const copyrightedTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.isCopyrighted);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface/80 hover:bg-surface border border-border-soft/60 hover:border-border-soft transition-all text-xs font-semibold text-fg cursor-pointer active:scale-95 shadow-xs"
        title="Choose Bible Translation"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-accent font-mono tracking-wide">
          {activeTranslation.abbreviation}
        </span>
        <ChevronDown
          size={13}
          className={`text-meta transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl border border-border-soft bg-surface p-2 z-50 animate-in fade-in-50 zoom-in-95 backdrop-blur-xl">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-soft/60 mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-meta">
              Bible Translations
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scroll space-y-3 p-1">
            {/* Group 1: Standard Translations */}
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-meta flex items-center gap-1.5">
                <span>Translations</span>
              </div>
              <div className="space-y-0.5">
                {localTranslations.map((t) => {
                  const isSelected = t.id.toLowerCase() === currentTranslation.toLowerCase();
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelect(t)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-accent/15 text-fg font-semibold border border-accent/30'
                          : 'hover:bg-fg/5 text-fg-2 hover:text-fg'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent">
                            {t.abbreviation}
                          </span>
                          <span className="text-xs">{t.name}</span>
                        </div>
                        {t.description && (
                          <span className="text-[10px] text-meta line-clamp-1 mt-0.5">
                            {t.description}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-accent shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Open Online Translations */}
            {openTranslations.length > 0 && (
              <div className="pt-2 border-t border-border-soft/40">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-meta flex items-center gap-1.5">
                  <Globe size={11} />
                  <span>Additional Translations</span>
                </div>
                <div className="space-y-0.5">
                  {openTranslations.map((t) => {
                    const isSelected = t.id.toLowerCase() === currentTranslation.toLowerCase();
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelect(t)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent/15 text-fg font-semibold border border-accent/30'
                            : 'hover:bg-fg/5 text-fg-2 hover:text-fg'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-meta">
                              {t.abbreviation}
                            </span>
                            <span className="text-xs">{t.name}</span>
                          </div>
                          {t.description && (
                            <span className="text-[10px] text-meta line-clamp-1 mt-0.5">
                              {t.description}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} className="text-accent shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 3: Extended / Copyrighted Translations */}
            {copyrightedTranslations.length > 0 && (
              <div className="pt-2 border-t border-border-soft/40">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-meta flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock size={11} />
                    <span>Extended (API.Bible)</span>
                  </span>
                  <span className="text-[9px] text-meta">Requires Key</span>
                </div>
                <div className="space-y-0.5">
                  {copyrightedTranslations.map((t) => {
                    const isSelected = t.id.toLowerCase() === currentTranslation.toLowerCase();
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelect(t)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent/15 text-fg font-semibold border border-accent/30'
                            : 'hover:bg-fg/5 text-fg-2 hover:text-fg'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-meta">
                              {t.abbreviation}
                            </span>
                            <span className="text-xs">{t.name}</span>
                          </div>
                          {t.description && (
                            <span className="text-[10px] text-meta line-clamp-1 mt-0.5">
                              {t.description}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} className="text-accent shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
