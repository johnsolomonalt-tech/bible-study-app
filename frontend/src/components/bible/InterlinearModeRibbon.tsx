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
    <div
      className={`w-full mb-6 p-3 sm:p-4 rounded-2xl border transition-all shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
        isDark
          ? 'bg-gradient-to-r from-amber-950/30 via-[#1e1e24] to-cyan-950/20 border-accent/40 shadow-black/40'
          : 'bg-gradient-to-r from-amber-50/80 via-white to-cyan-50/60 border-accent/30 shadow-accent/5'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Mode Title & Info */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              isOldTestament
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            <Languages size={20} />
          </div>

          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Reverse-Interlinear Active
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isOldTestament
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
                }`}
              >
                {languageName} ({testamentTag})
              </span>
              <span className="text-[11px] text-muted hidden sm:inline">
                • {bookName} {chapter}
              </span>
            </div>

            <p className="text-xs text-fg-2 mt-1 leading-snug">
              Every word is linked to its original {isOldTestament ? 'Hebrew' : 'Greek'} root.
              Click <strong className="text-fg font-medium">any word</strong> to inspect pronunciation, Strong's concordance, full definition, and export to Canvas.
            </p>
          </div>
        </div>

        {/* Right: Controls & Toggles */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 self-start md:self-center shrink-0">
          {/* Strong's Toggle */}
          <button
            type="button"
            onClick={onToggleShowStrongs}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showStrongs
                ? 'bg-accent text-white border-accent shadow-sm'
                : isDark
                ? 'bg-surface/80 border-border text-fg-2 hover:text-fg hover:bg-border-soft'
                : 'bg-white border-border text-fg-2 hover:text-fg hover:bg-border-soft'
            }`}
            title="Toggle inline Strong's concordance numbers (e.g. H430 / G2316)"
          >
            <Hash size={13} />
            <span>Strong's</span>
          </button>

          {/* Transliteration Toggle */}
          <button
            type="button"
            onClick={onToggleShowTranslit}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showTranslit
                ? 'bg-accent text-white border-accent shadow-sm'
                : isDark
                ? 'bg-surface/80 border-border text-fg-2 hover:text-fg hover:bg-border-soft'
                : 'bg-white border-border text-fg-2 hover:text-fg hover:bg-border-soft'
            }`}
            title="Toggle phonetic transliteration guide under original script"
          >
            <Type size={13} />
            <span>Phonetic</span>
          </button>

          {/* Full Verse Grid Breakdown */}
          <button
            type="button"
            onClick={onOpenVerseBreakdown}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-all cursor-pointer shadow-sm"
            title="Open word-by-word Interlinear Table for this chapter"
          >
            <TableProperties size={13} />
            <span>Verse Breakdown</span>
          </button>

          {/* Close / Exit Button */}
          <button
            type="button"
            onClick={onDisableInterlinear}
            className="p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            title="Exit Reverse-Interlinear Mode"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
