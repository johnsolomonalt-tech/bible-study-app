"use client";

import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { TheologicalLensType } from './TheologicalLensSelector';
import { buildChatSuggestions } from '@/lib/chatSuggestions';

interface ChatEmptyStateProps {
  activeBook?: { name: string; chapters: number };
  activeChapter?: number;
  translation?: string;
  theologicalLens?: TheologicalLensType;
  quotedReference?: string;
  recentMessages?: readonly string[];
  onSelectPrompt: (promptText: string) => void;
  onSelectLens?: (lens: TheologicalLensType) => void;
  isCompact?: boolean;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  activeBook = { name: 'Genesis', chapters: 50 }, activeChapter = 1,
  translation = 'BSB', theologicalLens = 'canonical', quotedReference,
  recentMessages, onSelectPrompt, isCompact = false,
}) => {
  const suggestions = useMemo(() => buildChatSuggestions({
    book: activeBook.name, chapter: activeChapter, quotedReference,
    recentMessages, lens: theologicalLens,
  }), [activeBook.name, activeChapter, quotedReference, recentMessages, theologicalLens]);

  return (
    <div className={`w-full max-w-md mx-auto my-auto ${isCompact ? 'px-1 py-6' : 'px-3 py-8 sm:py-12'}`}>
      <h1 className={`${isCompact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-medium tracking-tight text-fg leading-tight`}>
        Study Scripture with AI.
      </h1>
      <p className="text-xs text-muted mt-2">{suggestions.reference} · {translation.toUpperCase()}</p>
      <div className="mt-7" role="group" aria-label="Suggested questions">
        <p className="text-xs text-muted mb-2">{suggestions.source}</p>
        {suggestions.questions.map(question => (
          <button key={question} type="button" onClick={() => onSelectPrompt(question)} className="chat-suggestion">
            <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 mt-1" aria-hidden="true" />
            <span>{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
