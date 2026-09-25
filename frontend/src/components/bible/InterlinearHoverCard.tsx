"use client";

import React, { useState } from 'react';
import { InterlinearWord } from '@/lib/interlinearData';
import { NodeCategory } from '@/types/canvas';
import { Sparkles, Check, BookOpen, Volume2, Plus, ExternalLink, X } from 'lucide-react';

interface InterlinearHoverCardProps {
  word: InterlinearWord;
  onClose: () => void;
  onSendToCanvas?: (nodePayload: {
    title: string;
    content: string;
    category: NodeCategory;
  }) => void;
  theme: 'dark' | 'light';
  positionStyle?: React.CSSProperties;
}

export function InterlinearHoverCard({
  word,
  onClose,
  onSendToCanvas,
  theme,
  positionStyle,
}: InterlinearHoverCardProps) {
  const isDark = theme === 'dark';
  const [hasAddedToCanvas, setHasAddedToCanvas] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSpeakPronunciation = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(word.transliteration);
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleAddToCanvas = () => {
    if (!onSendToCanvas) return;
    const markdownContent = `### Original Language Nuance: ${word.transliteration} (${word.lemma})\n\n` +
      `**Strong's**: \`${word.strongs}\` | **Language**: ${word.language} (${word.partOfSpeech})\n` +
      `**Canon Frequency**: Appears **${word.occurrences}×** in the ${word.testament}\n\n` +
      `#### Lexical Definition\n${word.definition}\n\n` +
      `#### Key Passages\n` +
      word.keyVerses.map(v => `- **${v}**`).join('\n');

    onSendToCanvas({
      title: `Word Study: ${word.transliteration} (${word.lemma})`,
      content: markdownContent,
      category: 'word_study',
    });

    setHasAddedToCanvas(true);
    setTimeout(() => {
      setHasAddedToCanvas(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className={`z-50 w-full max-w-[calc(100vw-32px)] sm:w-96 rounded-2xl shadow-2xl border p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 break-words ${
        isDark
          ? 'bg-[#1e1e24]/95 border-zinc-700/80 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
          : 'bg-white/98 border-zinc-200 text-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.12)]'
      }`}
      style={positionStyle}
    >
      {/* Header: Lemma, Transliteration & Close */}
      <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3 border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-serif font-bold ${
                word.language === 'Hebrew' ? 'text-amber-500 tracking-wider' : 'text-cyan-400'
              }`}
            >
              {word.lemma}
            </span>
            <span className="text-sm font-semibold italic text-zinc-500 dark:text-zinc-400">
              /{word.transliteration}/
            </span>
            <button
              type="button"
              onClick={handleSpeakPronunciation}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isPlayingAudio 
                  ? 'text-accent bg-accent/20' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30'
              }`}
              title={`Listen to pronunciation (${word.pronunciation})`}
            >
              <Volume2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
              {word.strongs}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              {word.language} • {word.partOfSpeech}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Root & Derivation */}
      {word.derivation && (
        <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/50">
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Root & Derivation
          </div>
          <div className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
            {word.derivation}
          </div>
        </div>
      )}

      {/* Theological Definition */}
      <div className="space-y-2 mb-3.5">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Theological & Lexical Meaning
        </div>
        <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 break-words">
          {word.definition}
        </p>
        {word.outline && word.outline !== word.definition && (
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Biblical Usage
            </div>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 break-words">
              {word.outline}
            </p>
          </div>
        )}
      </div>

      {/* Frequency & Key Passages */}
      <div className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/50 mb-3.5">
        <div className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-zinc-400" />
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            Occurs <strong className="text-accent">{word.occurrences}×</strong> in {word.testament}
          </span>
        </div>
        <div className="text-[10px] font-semibold text-zinc-400">
          Pronounce: <span className="text-zinc-300">{word.pronunciation}</span>
        </div>
      </div>

      {/* Key Cross-References */}
      {word.keyVerses.length > 0 && (
        <div className="mb-3.5">
          <div className="text-[11px] font-semibold text-zinc-400 mb-1.5">
            Key Passages:
          </div>
          <div className="flex flex-wrap gap-1">
            {word.keyVerses.map((kv) => (
              <span
                key={kv}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {kv}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer: Send Word Study to Canvas */}
      {onSendToCanvas && (
        <button
          type="button"
          onClick={handleAddToCanvas}
          disabled={hasAddedToCanvas}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
            hasAddedToCanvas
              ? 'bg-emerald-600 text-white'
              : 'bg-accent text-white hover:bg-accent/90 active:scale-98'
          }`}
        >
          {hasAddedToCanvas ? (
            <>
              <Check size={14} />
              <span>Added to Canvas Board!</span>
            </>
          ) : (
            <>
              <Plus size={14} />
              <span>Create Word Study Node on Canvas</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
