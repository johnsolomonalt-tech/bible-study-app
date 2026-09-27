"use client";

import React from 'react';
import { 
  Sparkles, 
  Compass, 
  ArrowRight, 
  Scroll, 
  Flame, 
  GraduationCap, 
  Heart, 
  BookOpen 
} from 'lucide-react';
import { TheologicalLensType, THEOLOGICAL_LENS_OPTIONS } from './TheologicalLensSelector';
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
  currentLens = 'canonical',
  onSelectQuestion,
  onSelectLensComparison,
  isCompact = false,
}) => {
  const followUps = (questions && questions.length > 0)
    ? questions.slice(0, 3)
    : extractTailoredFollowUps(messageContent, currentLens);

  // Other theological lenses to compare against
  const otherLenses = THEOLOGICAL_LENS_OPTIONS.filter(l => l.id !== currentLens);

  if (followUps.length === 0 && otherLenses.length === 0) return null;

  return (
    <div className="w-full mt-2.5 pt-2.5 border-t border-border/30 space-y-2.5 animate-in fade-in duration-200">
      {/* Follow-up question bubbles side-by-side */}
      {followUps.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 select-none">
            <Sparkles size={11} className="text-accent shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Tailored Follow-Ups
            </span>
          </div>

          <div className={`grid gap-1.5 sm:gap-2 ${followUps.length === 1 ? 'grid-cols-1' : followUps.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {followUps.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuestion(q)}
                title={q}
                className="group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-surface/50 hover:bg-surface border border-border-soft/60 hover:border-accent/40 shadow-2xs hover:shadow-xs text-left transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer min-w-0"
              >
                <span className="text-[10.5px] sm:text-[11.5px] font-medium leading-tight sm:leading-snug text-fg-hover group-hover:text-fg line-clamp-3 break-words">
                  {q}
                </span>
                <div className="flex items-center justify-end mt-1 text-meta/50 group-hover:text-accent transition-colors">
                  <ArrowRight size={10} className="sm:size-[11px] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Lens Comparison Row */}
      {!isCompact && (
        <div className="pt-0.5">
          <div className="flex items-center gap-1.5 mb-1.5 select-none">
            <Compass size={11} className="text-muted shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-meta">
              Explore Another Tradition
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {otherLenses.slice(0, 4).map((lens) => (
              <button
                key={lens.id}
                type="button"
                onClick={() => {
                  const prompt = `Re-examine the theological points discussed above specifically through the ${lens.name} lens (${lens.tagline}). Highlight distinctive historic insights from this tradition.`;
                  onSelectLensComparison(lens.id, prompt);
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface/30 hover:bg-surface border border-border-soft/40 hover:border-border text-[10.5px] sm:text-[11px] text-muted hover:text-fg transition-all cursor-pointer group"
                title={lens.description}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lens.accentColor }} />
                <span>{lens.name} View</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
