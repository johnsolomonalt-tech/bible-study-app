"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BookOpen, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ChevronRight,
  ExternalLink,
  Layers
} from 'lucide-react';
import { parseVerseReference } from '@/lib/bibleReferences';
import { getPassage } from '@/lib/bibleProvider';
import { AVAILABLE_TRANSLATIONS } from '@/types/bible';

export interface DailyVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseRef: string;
  initialExcerpt?: string;
  translation?: string;
  onNavigateToVerse?: (book: string, chapter: number, verse: number) => void;
  theme?: 'dark' | 'light';
}

export function DailyVerseModal({
  isOpen,
  onClose,
  verseRef,
  initialExcerpt,
  translation = 'bsb',
  onNavigateToVerse,
  theme = 'dark',
}: DailyVerseModalProps) {
  const [selectedTranslation, setSelectedTranslation] = useState(translation.toLowerCase());
  const [fullVerseText, setFullVerseText] = useState<string>('');
  const [surroundingVerses, setSurroundingVerses] = useState<{ verse: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const parsed = parseVerseReference(verseRef);

  // Sync translation when prop changes
  useEffect(() => {
    if (translation) {
      setSelectedTranslation(translation.toLowerCase());
    }
  }, [translation]);

  // Fetch full verse whenever modal opens, ref changes, or translation changes
  useEffect(() => {
    if (!isOpen || !verseRef) return;

    let isMounted = true;
    const refData = parseVerseReference(verseRef);

    if (!refData) {
      setError(`Could not parse Scripture reference: "${verseRef}"`);
      return;
    }

    setLoading(true);
    setError(null);

    getPassage(selectedTranslation, refData.book, refData.chapter, refData.verse)
      .then(result => {
        if (!isMounted) return;

        if (result.chapter && result.chapter.verses) {
          const targetVerseNum = refData.verse || 1;
          const rangeMatch = verseRef.match(/:(\d+)\s*[\-–—]\s*(\d+)/);
          const endVerseNum = rangeMatch ? parseInt(rangeMatch[2], 10) : targetVerseNum;

          if (endVerseNum > targetVerseNum) {
            const rangeVerses = result.chapter.verses.filter(
              v => v.verse >= targetVerseNum && v.verse <= endVerseNum
            );
            if (rangeVerses.length > 0) {
              const joined = rangeVerses
                .map(v => `${v.verse > targetVerseNum ? `[${v.verse}] ` : ''}${v.text.replace(/\[\d+\]/g, '').replace(/\{[^}]+\}/g, '').trim()}`)
                .join(' ');
              setFullVerseText(joined);
              const context = result.chapter.verses.filter(
                v => v.verse === targetVerseNum - 1 || v.verse === endVerseNum + 1
              );
              setSurroundingVerses(context);
            } else {
              setFullVerseText(initialExcerpt ? initialExcerpt.replace(/^["“”]|["“”]$/g, '').trim() : '');
            }
          } else {
            const found = result.chapter.verses.find(v => v.verse === targetVerseNum);

            if (found) {
              const cleanText = found.text
                .replace(/\[\d+\]/g, '')
                .replace(/\{[^}]+\}/g, '')
                .trim();
              setFullVerseText(cleanText);

              // Also capture surrounding context (e.g. verse before & verse after)
              const context = result.chapter.verses.filter(
                v => Math.abs(v.verse - targetVerseNum) <= 1
              );
              setSurroundingVerses(context);
            } else if (result.verse) {
              setFullVerseText(result.verse.text);
            } else {
              setFullVerseText(initialExcerpt ? initialExcerpt.replace(/^["“”]|["“”]$/g, '').trim() : '');
            }
          }
        } else {
          setError('Could not load Scripture text for this translation.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load verse text.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, verseRef, selectedTranslation, initialExcerpt]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    if (!fullVerseText && !initialExcerpt) return;
    const textToCopy = `"${fullVerseText || initialExcerpt}"\n— ${verseRef} (${selectedTranslation.toUpperCase()})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${verseRef}. ${fullVerseText || initialExcerpt}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center modal-safe-overlay bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-bg border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col modal-safe-content ring-1 ring-border-soft/50"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-surface/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shadow-xs">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                  Daily Scripture
                </span>
                <h3 className="font-serif text-lg font-bold text-fg leading-tight">
                  {verseRef}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover border border-border-soft/60 flex items-center justify-center text-muted hover:text-fg transition-all active:scale-95 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Translation selector pills */}
          <div className="px-5 py-2.5 border-b border-border/40 bg-surface/10 flex items-center justify-between gap-2 overflow-x-auto custom-scroll">
            <span className="text-xs text-muted font-medium shrink-0">Translation:</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {['bsb', 'kjv', 'web'].map(transId => {
                const isSelected = selectedTranslation === transId;
                return (
                  <button
                    key={transId}
                    type="button"
                    onClick={() => setSelectedTranslation(transId)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-accent text-accent-on shadow-xs' 
                        : 'bg-surface/80 hover:bg-surface text-fg-2 hover:text-fg border border-border-soft/50'
                    }`}
                  >
                    {transId.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Verse Content */}
          <div className="p-6 overflow-y-auto custom-scroll space-y-5 flex-1">
            {loading ? (
              <div className="py-8 text-center space-y-3 animate-pulse">
                <div className="h-5 bg-surface-hover rounded w-3/4 mx-auto" />
                <div className="h-5 bg-surface-hover rounded w-5/6 mx-auto" />
                <div className="h-5 bg-surface-hover rounded w-2/3 mx-auto" />
                <p className="text-xs text-muted pt-2">Loading full verse text...</p>
              </div>
            ) : error ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm text-error font-medium">{error}</p>
                {initialExcerpt && (
                  <blockquote className="p-4 rounded-2xl bg-surface/40 border border-border/50 text-fg font-serif text-base italic leading-relaxed">
                    &ldquo;{initialExcerpt}&rdquo;
                  </blockquote>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Full Verse Highlight Card */}
                <div className="p-5 rounded-2xl bg-surface/40 border border-border-soft/60 shadow-xs relative">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold font-mono flex items-center justify-center shrink-0 mt-0.5 select-none">
                      {parsed?.verse || 1}
                    </span>
                    <p className="font-serif text-[17px] sm:text-[19px] text-fg leading-relaxed tracking-tight select-text">
                      &ldquo;{fullVerseText || initialExcerpt}&rdquo;
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted">
                    <span className="font-medium">
                      {verseRef} <span className="text-accent font-mono uppercase">({selectedTranslation})</span>
                    </span>
                    <span className="text-[11px] opacity-70">
                      Full Scripture Verse
                    </span>
                  </div>
                </div>

                {/* Optional Surrounding Context Preview */}
                {surroundingVerses.length > 1 && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted tracking-wider uppercase">
                      <Layers size={13} className="text-accent" />
                      <span>Context in {parsed?.book} {parsed?.chapter}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface/20 border border-border/40 space-y-2 text-sm text-fg-2 font-serif leading-relaxed select-text">
                      {surroundingVerses.map(v => {
                        const isTarget = v.verse === (parsed?.verse || 1);
                        return (
                          <p key={v.verse} className={isTarget ? 'text-fg font-semibold' : 'text-muted/90'}>
                            <sup className="text-accent font-mono text-[10px] mr-1.5 select-none">
                              {v.verse}
                            </sup>
                            {v.text.replace(/\[\d+\]/g, '').replace(/\{[^}]+\}/g, '').trim()}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border/60 bg-surface/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-fg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Copy verse text"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSpeak}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  isSpeaking 
                    ? 'bg-accent/20 border-accent text-accent animate-pulse' 
                    : 'bg-surface hover:bg-surface-hover border border-border text-fg'
                }`}
                title={isSpeaking ? 'Stop audio' : 'Listen to verse'}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} className="text-muted" />}
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>
            </div>

            {parsed && onNavigateToVerse && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToVerse(parsed.book, parsed.chapter, parsed.verse);
                  onClose();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-accent-on text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                title={`Open ${parsed.book} ${parsed.chapter} in Bible reader`}
              >
                <span>Read Full Chapter</span>
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
