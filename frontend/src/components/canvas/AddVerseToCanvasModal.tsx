"use client";

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Loader2, Check } from 'lucide-react';
import { parseVerseReference } from '@/lib/bibleReferences';
import { getPassage } from '@/lib/bibleProvider';
import { AVAILABLE_TRANSLATIONS } from '@/types/bible';
import { getPreference, PREF_KEYS } from '@/lib/appPreferences';

interface AddVerseToCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVerse: (verseData: { title: string; content: string; reference: string }) => void;
  theme?: 'dark' | 'light';
}

export function AddVerseToCanvasModal({
  isOpen,
  onClose,
  onAddVerse,
  theme = 'dark',
}: AddVerseToCanvasModalProps) {
  const [query, setQuery] = useState('');
  const [translation, setTranslation] = useState(() => {
    return getPreference(PREF_KEYS.BIBLE_VERSION, 'bsb');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    reference: string;
    text: string;
    book: string;
    chapter: number;
    verse: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setPreviewData(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced verse fetcher
  useEffect(() => {
    if (!query.trim()) {
      setPreviewData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const parsed = parseVerseReference(query.trim());
    if (!parsed) {
      setPreviewData(null);
      if (query.trim().length > 3 && query.includes(':')) {
        setError('Could not recognize Bible reference. Try format: "John 3:16" or "Romans 8:28"');
      } else {
        setError(null);
      }
      return;
    }

    setError(null);
    setIsLoading(true);

    let isCurrent = true;
    const timer = setTimeout(() => {
      getPassage(translation, parsed.book, parsed.chapter, parsed.verse)
        .then(({ verse, chapter }) => {
          if (!isCurrent) return;
          const foundVerse = verse || chapter.verses.find((v) => v.verse === parsed.verse);
          if (foundVerse && foundVerse.text) {
            const formattedRef = `${parsed.book} ${parsed.chapter}:${parsed.verse}`;
            setPreviewData({
              reference: formattedRef,
              text: foundVerse.text,
              book: parsed.book,
              chapter: parsed.chapter,
              verse: parsed.verse,
            });
            setError(null);
          } else {
            setError('No verse text found for this reference.');
            setPreviewData(null);
          }
        })
        .catch((err) => {
          if (!isCurrent) return;
          setError(err?.message || 'Could not fetch verse. Please check your reference.');
          setPreviewData(null);
        })
        .finally(() => {
          if (isCurrent) setIsLoading(false);
        });
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, translation]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!previewData) return;

    const markdownContent = `> "${previewData.text}"\n\n*${previewData.reference}* (${translation.toUpperCase()})`;

    onAddVerse({
      title: previewData.reference,
      content: markdownContent,
      reference: previewData.reference,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDark
            ? 'bg-[#1e1e22] border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold">Add Bible Verse to Canvas</h3>
              <p className="text-[12px] text-muted">Look up scripture to create an interactive verse card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Scripture Reference
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. John 3:16, Romans 8:28, Psalm 23:1"
                className={`w-full px-4 py-2.5 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-accent transition-all ${
                  isDark
                    ? 'bg-[#121214] border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin">
                  <Loader2 size={18} />
                </div>
              )}
            </div>
            {error && <p className="text-[12px] text-rose-500 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Translation
            </label>
            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#121214] border-zinc-700 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-800'
              }`}
            >
              {AVAILABLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id} className={isDark ? 'bg-[#1e1e22]' : 'bg-white'}>
                  {t.abbreviation} - {t.name} {t.isLocal ? '(Instant)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted uppercase tracking-wider">
                Card Preview
              </span>
              {previewData && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                  <Check size={12} /> Verse found
                </span>
              )}
            </div>

            <div
              className={`p-4 rounded-xl border min-h-[100px] flex flex-col justify-center transition-all ${
                isDark ? 'bg-[#161619] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              {previewData ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-amber-500 uppercase tracking-wide">
                      {previewData.reference}
                    </span>
                    <span className="text-[11px] text-muted uppercase font-mono">
                      {translation.toUpperCase()}
                    </span>
                  </div>
                  <blockquote className="text-[14px] italic leading-relaxed text-fg border-l-2 border-amber-500/60 pl-3 my-1">
                    "{previewData.text}"
                  </blockquote>
                  <div className="text-[11px] text-muted flex items-center gap-1">
                    <span>*Will appear as a clickable verse link on Canvas*</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted text-xs">
                  {isLoading
                    ? 'Loading scripture from Bible API...'
                    : 'Type a Bible reference above to preview the verse card'}
                </div>
              )}
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
              Popular References
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['John 3:16', 'Romans 8:28', 'Philippians 4:6-7', 'Psalm 23:1', 'Proverbs 3:5-6', 'Isaiah 40:31'].map(
                (verse) => (
                  <button
                    key={verse}
                    type="button"
                    onClick={() => setQuery(verse)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {verse}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!previewData || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
            >
              <BookOpen size={15} />
              <span>Add to Canvas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
