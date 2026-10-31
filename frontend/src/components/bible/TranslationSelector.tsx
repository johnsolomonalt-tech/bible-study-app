"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AVAILABLE_TRANSLATIONS, BibleTranslation } from '@/types/bible';
import { setPreference, PREF_KEYS } from '@/lib/appPreferences';

interface TranslationSelectorProps {
  currentTranslation: string;
  onSelectTranslation: (versionId: string) => void;
  className?: string;
  theme?: 'dark' | 'light';
  align?: 'left' | 'right';
}

export function TranslationSelector({
  currentTranslation,
  onSelectTranslation,
  className = '',
  align = 'left',
}: TranslationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTranslation =
    AVAILABLE_TRANSLATIONS.find(
      (t) => t.id.toLowerCase() === currentTranslation.toLowerCase()
    ) || AVAILABLE_TRANSLATIONS[0];

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (t: BibleTranslation) => {
    onSelectTranslation(t.id);
    setIsOpen(false);
    setPreference(PREF_KEYS.BIBLE_VERSION, t.id);
  };

  return (
    <div className={`relative inline-block text-left ${isOpen ? 'z-50' : 'z-20'} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center justify-center gap-0.5 px-2 py-0 h-8.5 min-h-[44px] md:min-h-[34px] rounded-full bg-surface/80 hover:bg-surface border border-border-soft/60 hover:border-border-soft transition-all text-xs font-semibold text-fg cursor-pointer active:scale-95 shadow-2xs select-none shrink-0"
        title="Choose Bible Translation"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-accent font-mono tracking-wider text-[11.5px] leading-none font-bold">
          {activeTranslation.abbreviation}
        </span>
        <ChevronDown
          size={12}
          className={`text-meta transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl border border-border-soft bg-surface p-2 z-50`}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-soft/60 mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-meta">
              Bible Translations
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scroll space-y-1 p-1">
            {AVAILABLE_TRANSLATIONS.map((t) => {
              const isSelected = t.id.toLowerCase() === currentTranslation.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(t);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-3 sm:py-2 min-h-[44px] rounded-xl text-left transition-colors cursor-pointer touch-manipulation active:scale-[0.98] ${
                    isSelected
                      ? 'bg-accent/15 text-fg font-semibold border border-accent/30'
                      : 'hover:bg-fg/5 text-fg-2 hover:text-fg'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${isSelected ? 'text-accent' : 'text-fg'}`}>
                        {t.abbreviation}
                      </span>
                      <span className="text-xs font-medium">{t.name}</span>
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
  );
}
