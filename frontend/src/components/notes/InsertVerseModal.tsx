"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Quote, 
  Check, 
  Loader2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { parseVerseReference } from '@/lib/bibleReferences';
import { getPassage } from '@/lib/bibleProvider';
import { CANONICAL_BOOKS } from '@/lib/bibleCanon';

interface InsertVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formattedText: string) => void;
  currentTranslation?: string;
}

const POPULAR_SUGGESTIONS = [
  'Romans 8:28',
  'Philippians 4:6-7',
  'Proverbs 3:5-6',
  'John 3:16',
  'Isaiah 40:31',
  'Psalm 23:1-3',
  'Galatians 2:20',
  '2 Timothy 3:16-17',
];

export function InsertVerseModal({
  isOpen,
  onClose,
  onInsert,
  currentTranslation = 'bsb',
}: InsertVerseModalProps) {
  const [query, setQuery] = useState('Romans 8:28');
  const [translation, setTranslation] = useState(currentTranslation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verseData, setVerseData] = useState<{
    reference: string;
    text: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
  } | null>(null);
  const [formatType, setFormatType] = useState<'quote' | 'callout' | 'inline'>('quote');

  useEffect(() => {
    if (isOpen && query) {
      handleLookup(query, translation);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleLookup(refStr: string, trans: string) {
    setError(null);
    const parsed = parseVerseReference(refStr);
    if (!parsed) {
      setError('Please enter a valid Scripture reference (e.g. "Romans 8:28" or "John 3:16").');
      setVerseData(null);
      return;
    }

    // Check for verse ranges like 6-7
    const rangeMatch = refStr.match(/:(\d+)\s*[\-\u2013\u2014]\s*(\d+)/);
    const verseStart = parsed.verse;
    const verseEnd = rangeMatch ? parseInt(rangeMatch[2], 10) : undefined;

    setLoading(true);
    try {
      const result = await getPassage(trans, parsed.book, parsed.chapter, verseStart);
      if (!result.chapter || !result.chapter.verses) {
        throw new Error('Chapter not found');
      }

      let versesToInclude = result.chapter.verses;
      if (verseEnd && verseEnd >= verseStart) {
        versesToInclude = result.chapter.verses.filter(
          v => v.verse >= verseStart && v.verse <= verseEnd
        );
      } else {
        versesToInclude = result.chapter.verses.filter(v => v.verse === verseStart);
      }

      if (versesToInclude.length === 0) {
        // Fallback to verse 1 or chapter snippet
        versesToInclude = result.chapter.verses.slice(0, 1);
      }

      const combinedText = versesToInclude
        .map(v => v.text.replace(/\[\d+\]/g, '').replace(/\{[^}]+\}/g, '').trim())
        .join(' ');

      const formattedRef = verseEnd && verseEnd > verseStart
        ? `${parsed.book} ${parsed.chapter}:${verseStart}-${verseEnd}`
        : `${parsed.book} ${parsed.chapter}:${verseStart}`;

      setVerseData({
        reference: formattedRef,
        text: combinedText,
        book: parsed.book,
        chapter: parsed.chapter,
        verseStart,
        verseEnd,
      });
    } catch (e: any) {
      console.warn('Verse lookup error:', e);
      setError(`Could not load ${refStr} in ${trans.toUpperCase()}. Check the chapter/verse number.`);
      setVerseData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleInsert() {
    if (!verseData) return;

    let output = '';
    const transBadge = translation.toUpperCase();

    if (formatType === 'quote') {
      output = `\n> "${verseData.text}"\n> — **${verseData.reference}** (${transBadge})\n\n`;
    } else if (formatType === 'callout') {
      output = `\n> 📖 **${verseData.reference}** (${transBadge})\n> "${verseData.text}"\n\n`;
    } else {
      output = ` **${verseData.reference}** ("${verseData.text}") `;
    }

    onInsert(output);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-bg border border-border rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Quote size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-fg">Insert Scripture Block</h2>
              <p className="text-[12px] text-meta">Search and quote Bible verses with citation and translation badge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Search Bar & Translation Selector */}
        <div className="p-6 border-b border-border/60 bg-surface/10 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLookup(query, translation);
                  }
                }}
                placeholder="e.g. Romans 8:28, Phil 4:6-7, John 1:1"
                className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-[14px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <select
              value={translation}
              onChange={(e) => {
                setTranslation(e.target.value);
                if (query) handleLookup(query, e.target.value);
              }}
              className="bg-surface border border-border px-3 py-2.5 rounded-xl text-[13px] font-medium text-fg focus:outline-none cursor-pointer"
            >
              <option value="bsb">BSB</option>
              <option value="kjv">KJV</option>
              <option value="web">WEB</option>
            </select>

            <button
              onClick={() => handleLookup(query, translation)}
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Lookup</span>
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-meta uppercase tracking-wider mr-1">Quick:</span>
            {POPULAR_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setQuery(sug);
                  handleLookup(sug, translation);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-surface hover:bg-surface/80 text-fg-hover border border-border/60 transition-colors cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Verse Preview Box */}
        <div className="p-6 overflow-y-auto max-h-[300px] custom-scroll">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-[13px]">Retrieving Scripture text...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[13px]">
              {error}
            </div>
          )}

          {verseData && !loading && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-muted uppercase tracking-widest flex items-center justify-between">
                <span>Preview</span>
                <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">{translation.toUpperCase()}</span>
              </div>

              {/* Formatted Preview */}
              <div className="p-4 rounded-xl border border-border bg-surface/40">
                {formatType === 'quote' && (
                  <blockquote className="border-l-[3px] border-accent pl-4 py-1 italic text-fg text-[15px] leading-relaxed">
                    "{verseData.text}"
                    <footer className="text-right text-[12px] font-semibold not-italic text-accent mt-2">
                      — {verseData.reference} ({translation.toUpperCase()})
                    </footer>
                  </blockquote>
                )}

                {formatType === 'callout' && (
                  <div className="border border-accent/30 bg-accent/5 p-3.5 rounded-lg space-y-1.5">
                    <div className="font-semibold text-accent text-[13px] flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>{verseData.reference} ({translation.toUpperCase()})</span>
                    </div>
                    <p className="text-[14px] text-fg leading-relaxed italic">
                      "{verseData.text}"
                    </p>
                  </div>
                )}

                {formatType === 'inline' && (
                  <p className="text-[14px] text-fg leading-relaxed">
                    <strong className="text-accent">{verseData.reference}</strong> ("{verseData.text}")
                  </p>
                )}
              </div>

              {/* Format Type Selector */}
              <div className="flex items-center gap-4 text-[13px] pt-1">
                <span className="text-meta text-[12px] font-medium">Format:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="formatType"
                    checked={formatType === 'quote'}
                    onChange={() => setFormatType('quote')}
                    className="accent-accent"
                  />
                  Blockquote
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="formatType"
                    checked={formatType === 'callout'}
                    onChange={() => setFormatType('callout')}
                    className="accent-accent"
                  />
                  Callout Card
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="formatType"
                    checked={formatType === 'inline'}
                    onChange={() => setFormatType('inline')}
                    className="accent-accent"
                  />
                  Inline
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface/40 shrink-0">
          <p className="text-[12px] text-meta">
            Inserted directly into your active study note
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-muted hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!verseData || loading}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white bg-accent hover:opacity-90 disabled:opacity-50 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Check size={16} />
              <span>Insert Scripture</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
