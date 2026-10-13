"use client";

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TheologicalLensType } from './TheologicalLensSelector';
import { BIBLE_VERSE_REGEX } from '@/lib/bibleReferences';

interface ChatFollowUpsProps {
  questions?: string[];
  messageContent: string;
  currentLens?: TheologicalLensType;
  onSelectQuestion: (question: string) => void;
  onSelectLensComparison: (targetLens: TheologicalLensType, prompt: string) => void;
  isCompact?: boolean;
}

/**
 * Fallback generator that inspects the AI response content
 * and constructs 3 hyper-tailored follow-up prompts if none were provided by the model.
 */
export function extractTailoredFollowUps(content: string, currentLens: TheologicalLensType = 'canonical'): string[] {
  if (!content) return [];

  const results: string[] = [];

  // 1. Find Bible verse citations in response
  const verseMatches = Array.from(content.matchAll(new RegExp(BIBLE_VERSE_REGEX.source, 'gi')));
  const primaryVerse = verseMatches[0]?.[0];

  // 2. Check for Greek/Hebrew words mentioned
  const hasGreek = /[\u0370-\u03FF]/i.test(content) || /greek|lemma|strong's g/i.test(content);
  const hasHebrew = /[\u0590-\u05FF]/i.test(content) || /hebrew|root|strong's h/i.test(content);

  // 3. Check for specific theological topics
  const hasJustification = /justif|faith alone|sola fide|righteousness/i.test(content);
  const hasCovenant = /covenant|berit|diatheke|testament/i.test(content);
  const hasChristology = /incarnat|logos|son of god|christology|messiah/i.test(content);
  const hasAtonement = /atonement|sacrifice|cross|propitiation|blood/i.test(content);
  const hasHolySpirit = /spirit|pneumat|paraclete|fruit of the spirit/i.test(content);

  // Generate tailored questions based on findings:
  if (primaryVerse) {
    if (hasGreek) {
      results.push(`What additional Greek nuances and grammatical insights are in ${primaryVerse}?`);
    } else if (hasHebrew) {
      results.push(`Unpack the Hebrew root word meaning and poetic structure in ${primaryVerse}.`);
    } else {
      results.push(`How do other biblical authors quote or develop the truth of ${primaryVerse}?`);
    }
  }

  if (hasJustification) {
    results.push(`How does Paul's teaching on justification reconcile with James 2 on active faith?`);
  } else if (hasCovenant) {
    results.push(`How does this covenant progression connect Abraham, Moses, David, and Christ?`);
  } else if (hasChristology) {
    results.push(`How did the Early Church defend this Christology against early heresies?`);
  } else if (hasAtonement) {
    results.push(`How do the Old Testament Day of Atonement shadows find fulfillment here?`);
  } else if (hasHolySpirit) {
    results.push(`What does this teach about walking in the Spirit and daily Christian sanctification?`);
  }

  // Add tradition or application question
  if (currentLens === 'patristic') {
    results.push(`What did Chrysostom or Augustine specifically emphasize about this in their sermons?`);
  } else if (currentLens === 'reformation') {
    results.push(`How did Martin Luther or John Calvin expound this passage in their commentaries?`);
  } else if (currentLens === 'scholarly') {
    results.push(`What was the Ancient Near Eastern or Second Temple Jewish context of this concept?`);
  } else if (currentLens === 'contemplative') {
    results.push(`Provide 3 reflective questions for personal prayer and meditation on this passage.`);
  } else {
    results.push(`How does this passage fundamentally reshape our daily prayer and Christian living?`);
  }

  // Ensure we have at least 3 distinct questions
  if (results.length < 3) {
    if (primaryVerse) {
      results.push(`What are the key cross-references in Scripture that illuminate ${primaryVerse}?`);
    } else {
      results.push(`Show key scriptural cross-references that support this biblical doctrine.`);
    }
  }

  return results.slice(0, 3);
}

export const ChatFollowUps: React.FC<ChatFollowUpsProps> = ({
  questions,
  messageContent,
  currentLens = 'standard',
  onSelectQuestion,
}) => {
  const followUps = (questions && questions.length > 0)
    ? questions.slice(0, 3)
    : extractTailoredFollowUps(messageContent, currentLens);

  if (followUps.length === 0) return null;

  return (
    <div className="w-full mt-3 pt-2.5 border-t border-border/30 animate-in fade-in duration-200">
      {/* Follow-up question links in ChatGPT unboxed style */}
      <div className="flex items-center gap-1.5 mb-2 select-none">
        <Sparkles size={11} className="text-accent/80 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Suggested Follow-Ups
        </span>
      </div>

      <div className="flex flex-col items-start gap-1 sm:gap-1.5">
        {followUps.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            title={q}
            className="group text-left text-xs sm:text-[13px] text-muted hover:text-fg transition-colors duration-150 cursor-pointer py-1 px-0 bg-transparent border-0 shadow-none rounded-none max-w-full touch-manipulation focus-visible:outline-none focus-visible:text-fg"
          >
            <span className="leading-snug break-words">
              {q}
              <span className="inline-block ml-1.5 align-middle select-none">
                <ArrowRight 
                  size={12} 
                  className="inline-block -translate-y-px opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 text-muted group-hover:text-fg transition-all duration-150 shrink-0" 
                />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
