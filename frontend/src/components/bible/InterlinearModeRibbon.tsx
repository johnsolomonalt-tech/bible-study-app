"use client";

import React from 'react';
import { Languages, Hash, Type, TableProperties, X, Sparkles } from 'lucide-react';

interface InterlinearModeRibbonProps {
  isOldTestament: boolean;
  bookName: string;
  chapter: number;
  showStrongs: boolean;
  onToggleShowStrongs: () => void;
  showTranslit: boolean;
  onToggleShowTranslit: () => void;
  onOpenVerseBreakdown: () => void;
  onDisableInterlinear: () => void;
  theme: 'dark' | 'light';
}

export function InterlinearModeRibbon({
  isOldTestament,
  bookName,
  chapter,
  showStrongs,
  onToggleShowStrongs,
  showTranslit,
  onToggleShowTranslit,
  onOpenVerseBreakdown,
  onDisableInterlinear,
  theme,
}: InterlinearModeRibbonProps) {
  const isDark = theme === 'dark';
  const languageName = isOldTestament ? 'Biblical Hebrew' : 'Koine Greek';
  const testamentTag = isOldTestament ? 'OT Masoretic Text' : 'NT Textus Receptus';

  return (
    <div className="w-full mb-4 py-2 px-3 sm:px-4 rounded-xl border border-border-soft/70 bg-surface/40 backdrop-blur-xs flex items-center justify-between gap-3 text-xs transition-all">
      {/* Left: Subtle Indicator */}
      <div className="flex items-center gap-2 min-w-0">
        <Languages size={15} className="text-accent shrink-0" />
        <span className="font-semibold text-fg text-xs truncate">
          Interlinear
        </span>
        <span className="text-muted text-[11px] hidden sm:inline">
          • {languageName}
        </span>
        <span className="text-muted/60 text-[11px] hidden md:inline">
          (Click any word to inspect)
        </span>
      </div>

      {/* Right: Controls & Toggles */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleShowStrongs}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            showStrongs
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-muted hover:text-fg hover:bg-surface'
          }`}
          title="Toggle Strong's concordance numbers"
        >
          # Strong's
        </button>

        <button
          type="button"
          onClick={onToggleShowTranslit}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            showTranslit
              ? 'bg-accent/15 text-accent font-semibold'
              : 'text-muted hover:text-fg hover:bg-surface'
          }`}
          title="Toggle phonetic transliteration"
        >
          Phonetic
        </button>

        <button
          type="button"
          onClick={onOpenVerseBreakdown}
          className="px-2 py-1 rounded-md text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer"
          title="Open word-by-word Interlinear table"
        >
          Table
        </button>

        <div className="h-3 w-px bg-border-soft mx-0.5" />

        <button
          type="button"
          onClick={onDisableInterlinear}
          className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
          title="Exit Interlinear"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
