"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { InterlinearWord, getVerseInterlinearTokens, fetchInterlinearWord } from '@/lib/interlinearData';
import { getStrongsPassage } from '@/lib/bibleProvider';
import { NodeCategory } from '@/types/canvas';
import {
  X,
  Volume2,
  Plus,
  Check,
  Languages,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface VerseInterlinearModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookName: string;
  chapter: number;
  initialVerse: number;
  totalVerses: number;
  verses: { verse: number; text: string }[];
  isOldTestament: boolean;
  theme: 'dark' | 'light';
  onSendToCanvas?: (nodePayload: {
    title: string;
    content: string;
    category: NodeCategory;
  }) => void;
  onSelectWord?: (word: InterlinearWord) => void;
}

export function VerseInterlinearModal({
  isOpen,
  onClose,
  bookName,
  chapter,
  initialVerse,
  totalVerses,
  verses,
  isOldTestament,
  theme,
  onSendToCanvas,
  onSelectWord,
}: VerseInterlinearModalProps) {
  const [selectedVerseNum, setSelectedVerseNum] = useState<number>(initialVerse || 1);
  const [hasExportedAll, setHasExportedAll] = useState(false);
  const [addedWordIds, setAddedWordIds] = useState<Record<string, boolean>>({});
  const [strongsVersesMap, setStrongsVersesMap] = useState<Record<number, string>>({});
  const [resolvedWords, setResolvedWords] = useState<Record<number, InterlinearWord>>({});

  const isDark = theme === 'dark';

  // Load Strong's tagged chapter for accurate word-level alignment
  useEffect(() => {
    if (!isOpen) return;
    getStrongsPassage(bookName, chapter)
      .then((ch) => {
        if (ch && ch.verses) {
          const map: Record<number, string> = {};
          ch.verses.forEach((v) => {
            map[v.verse] = v.text;
          });
          setStrongsVersesMap(map);
        }
      })
      .catch(() => {});
  }, [isOpen, bookName, chapter]);

  // Find selected verse text
  const currentVerseObj = useMemo(() => {
    return (
      verses.find((v) => v.verse === selectedVerseNum) ||
      verses[0] || { verse: 1, text: '' }
    );
  }, [verses, selectedVerseNum]);

  // Tokenize verse into original language words using Strong's-tagged text if available
  const taggedText = strongsVersesMap[currentVerseObj.verse];
  const tokens = useMemo(() => {
    return getVerseInterlinearTokens(
      taggedText || currentVerseObj.text,
      isOldTestament,
      `${bookName} ${chapter}:${currentVerseObj.verse}`
    );
  }, [taggedText, currentVerseObj, isOldTestament, bookName, chapter]);

  // Asynchronously resolve authentic lexical data for all words in the verse
  useEffect(() => {
    if (!isOpen) return;
    tokens.forEach((t) => {
      if (t.isWord) {
        fetchInterlinearWord(t.rawText, isOldTestament, `${bookName} ${chapter}:${currentVerseObj.verse}`, t.strongsId)
          .then((w) => {
            if (w) {
              setResolvedWords((prev) => ({ ...prev, [t.index]: w }));
            }
          })
          .catch(() => {});
      }
    });
  }, [isOpen, tokens, isOldTestament, bookName, chapter, currentVerseObj.verse]);

  // Only the words (filtering out plain punctuation spaces)
  const wordTokens = useMemo(() => {
    return tokens
      .filter((t) => t.isWord)
      .map((t) => ({
        ...t,
        word: resolvedWords[t.index] || t.word
      }))
      .filter((t) => !!t.word);
  }, [tokens, resolvedWords]);

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore audio synthesis errors
    }
  };

  const handleAddWordToCanvas = (word: InterlinearWord) => {
    if (!onSendToCanvas) return;
    const md =
      `### Original Language Word Study: ${word.transliteration} (${word.lemma})\n\n` +
      `**Strong's**: \`${word.strongs}\` | **Language**: ${word.language} (${word.partOfSpeech})\n` +
      `**Occurrences in Scripture**: ${word.occurrences}× in the ${word.testament}\n\n` +
      `#### Lexical Definition\n${word.definition}\n\n` +
      `#### Key Passages\n` +
      word.keyVerses.map((v) => `- **${v}**`).join('\n');

    onSendToCanvas({
      title: `Word Study: ${word.transliteration} (${word.lemma})`,
      content: md,
      category: 'word_study',
    });

    setAddedWordIds((prev) => ({ ...prev, [word.id]: true }));
    setTimeout(() => {
      setAddedWordIds((prev) => ({ ...prev, [word.id]: false }));
    }, 2000);
  };

  const handleExportFullVerseToCanvas = () => {
    if (!onSendToCanvas) return;
    const ref = `${bookName} ${chapter}:${currentVerseObj.verse}`;
    let md = `## Verse Interlinear Breakdown: ${ref}\n\n`;
    md += `> "${currentVerseObj.text}"\n\n`;
    md += `| English Word | ${isOldTestament ? 'Hebrew' : 'Greek'} | Transliteration | Strong's | Meaning |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    wordTokens.forEach((t) => {
      if (t.word) {
        md += `| **${t.rawText}** | \`${t.word.lemma}\` | *${t.word.transliteration}* | \`${t.word.strongs}\` | ${t.word.gloss} |\n`;
      }
    });

    md += `\n*Exported from Theologica Reverse-Interlinear Engine*\n`;

    onSendToCanvas({
      title: `Interlinear Study: ${ref}`,
      content: md,
      category: 'word_study',
    });

    setHasExportedAll(true);
    setTimeout(() => setHasExportedAll(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-[#18181e] border-zinc-700/80 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_25px_60px_rgba(0,0,0,0.15)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-3 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl sm:p-2.5 sm:rounded-2xl shrink-0 ${
                isOldTestament
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              <Languages size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-bold font-serif truncate">
                  {bookName} {chapter}:{currentVerseObj.verse}
                </h2>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                    isOldTestament
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  {isOldTestament ? 'Hebrew' : 'Greek'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate hidden xs:block">
                Word-by-word morphological and Strong's concordance breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Verse Paging */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setSelectedVerseNum((p) => Math.max(1, p - 1))}
                disabled={selectedVerseNum <= 1}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                title="Previous verse"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold px-1.5 font-mono">
                v.{selectedVerseNum}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedVerseNum((p) => Math.min(totalVerses || 50, p + 1))
                }
                disabled={selectedVerseNum >= (totalVerses || 50)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                title="Next verse"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Full Verse Quote Box */}
        <div className="p-3 sm:p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 shrink-0 max-h-40 overflow-y-auto custom-scroll">
          <p className="font-serif text-sm sm:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 italic break-words">
            "{currentVerseObj.text}"
          </p>
        </div>

        {/* Word-by-Word Grid Container */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Analyzed Words ({wordTokens.length})
            </span>

            {onSendToCanvas && (
              <button
                type="button"
                onClick={handleExportFullVerseToCanvas}
                disabled={hasExportedAll}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                  hasExportedAll
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-accent text-white border-accent hover:bg-accent/90'
                }`}
              >
                {hasExportedAll ? (
                  <>
                    <Check size={14} />
                    <span>Verse Sent to Canvas!</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span><span className="hidden sm:inline">Send Full Verse Breakdown</span><span className="sm:hidden">Send</span> to Canvas</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wordTokens.map((t, idx) => {
              const w = t.word!;
              const isAdded = addedWordIds[w.id];

              return (
                <div
                  key={`${t.rawText}-${idx}`}
                  className={`p-3.5 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between ${
                    isDark
                      ? 'bg-zinc-800/40 border-zinc-700/60 hover:border-accent/50 hover:bg-zinc-800/70'
                      : 'bg-zinc-50 border-zinc-200 hover:border-accent/40 hover:bg-zinc-100/80'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: English Token & Original Script */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-fg">
                          {t.rawText}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-lg font-serif font-bold ${
                              w.language === 'Hebrew'
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-cyan-600 dark:text-cyan-400'
                            }`}
                          >
                            {w.lemma}
                          </span>
                          <span className="text-xs italic text-zinc-500 dark:text-zinc-400">
                            /{w.transliteration}/
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSpeak(w.transliteration)}
                            className="p-1 rounded-full text-zinc-400 hover:text-accent transition-colors cursor-pointer"
                            title={`Hear pronunciation: ${w.pronunciation}`}
                          >
                            <Volume2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 inline-block">
                          {w.strongs}
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-1 font-medium">
                          {w.partOfSpeech}
                        </div>
                      </div>
                    </div>

                    {/* Derivation / Etymology */}
                    {w.derivation && (
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-serif italic line-clamp-1">
                        {w.derivation}
                      </div>
                    )}

                    {/* Definition */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {w.definition}
                    </p>
                  </div>

                  {/* Card Bottom: Occurrences & Add to Canvas */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-200/60 dark:border-zinc-700/50">
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Occurs <strong className="text-accent">{w.occurrences}×</strong> in {w.testament}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onSelectWord && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectWord(w);
                            onClose();
                          }}
                          className="text-[11px] font-semibold text-accent hover:underline px-2 py-1 rounded cursor-pointer"
                        >
                          Deep Study
                        </button>
                      )}

                      {onSendToCanvas && (
                        <button
                          type="button"
                          onClick={() => handleAddWordToCanvas(w)}
                          disabled={isAdded}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-surface hover:bg-accent hover:text-white border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300'
                          }`}
                          title="Add this word study card to Canvas"
                        >
                          {isAdded ? <Check size={13} /> : <Plus size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
