"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Copy, 
  Check, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import { getPassage } from '@/lib/bibleProvider';

interface VersePreviewPopupProps {
  reference: {
    book: string;
    chapter: number;
    verse: number;
    raw?: string;
  } | null;
  onClose: () => void;
  onNavigateToBible: (book: string, chapter: number, verse: number) => void;
  defaultTranslation?: string;
}

export function VersePreviewPopup({
  reference,
  onClose,
  onNavigateToBible,
  defaultTranslation = 'bsb',
}: VersePreviewPopupProps) {
  const [translation, setTranslation] = useState(defaultTranslation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passageText, setPassageText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) return;

    let isMounted = true;
    async function loadVerse() {
      if (!reference) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getPassage(translation, reference.book, reference.chapter, reference.verse);
        if (!isMounted) return;

        if (result.verse) {
          setPassageText(result.verse.text.replace(/\[\d+\]/g, '').replace(/\{[^}]+\}/g, '').trim());
        } else if (result.chapter && result.chapter.verses.length > 0) {
          const v = result.chapter.verses.find(item => item.verse === reference.verse) || result.chapter.verses[0];
          setPassageText(v.text.replace(/\[\d+\]/g, '').replace(/\{[^}]+\}/g, '').trim());
        } else {
          setError('Scripture text not found.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('VersePreviewPopup error:', err);
        setError(`Could not load ${reference.book} ${reference.chapter}:${reference.verse}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVerse();
    return () => { isMounted = false; };
  }, [reference, translation]);

  if (!reference) return null;

  const displayRef = `${reference.book} ${reference.chapter}:${reference.verse}`;

  const handleCopy = () => {
    const textToCopy = `"${passageText}" — ${displayRef} (${translation.toUpperCase()})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-fg flex items-center gap-2">
                <span>{displayRef}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="bg-surface border border-border/80 px-2 py-1 rounded-lg text-[12px] font-semibold text-fg focus:outline-none cursor-pointer"
            >
              <option value="bsb">BSB</option>
              <option value="kjv">KJV</option>
              <option value="web">WEB</option>
            </select>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[300px] custom-scroll">
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center text-muted gap-2">
              <Loader2 size={20} className="animate-spin text-accent" />
              <p className="text-[12px]">Loading Scripture...</p>
            </div>
          )}

          {error && !loading && (
            <p className="text-rose-500 text-[13px] bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
              {error}
            </p>
          )}

          {!loading && !error && passageText && (
            <div className="space-y-3">
              <blockquote className="border-l-[3px] border-accent pl-4 py-1 italic text-fg text-[16px] leading-[1.8] font-serif">
                "{passageText}"
              </blockquote>
              <div className="text-right text-[12px] font-medium text-meta">
                — {displayRef} ({translation.toUpperCase()})
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-border flex items-center justify-between bg-surface/30">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-fg-hover hover:bg-surface border border-border transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => {
              onNavigateToBible(reference.book, reference.chapter, reference.verse);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent hover:opacity-90 transition-all shadow-xs cursor-pointer"
          >
            <span>Open in Bible Reader</span>
            <ExternalLink size={13} />
          </button>
        </footer>
      </div>
    </div>
  );
}
