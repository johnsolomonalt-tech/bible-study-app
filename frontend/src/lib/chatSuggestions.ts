import type { TheologicalLensType } from '@/components/chat/TheologicalLensSelector';

export interface SuggestionContext {
  book: string;
  chapter: number;
  quotedReference?: string;
  recentMessages?: readonly string[];
  lens?: TheologicalLensType;
}

const interests = [
  { pattern: /\b(pray(?:er|ing)?|devotion(?:al)?|meditat\w*)\b/i, question: (ref: string) => `How can I pray through ${ref}?` },
  { pattern: /\b(greek|hebrew|word study|original language\w*|etymology)\b/i, question: (ref: string) => `Which original-language words illuminate ${ref}?` },
  { pattern: /\b(covenant\w*|promise\w*)\b/i, question: (ref: string) => `What does ${ref} reveal about God's promises?` },
  { pattern: /\b(context|history|historical|culture|cultural)\b/i, question: (ref: string) => `What historical context helps explain ${ref}?` },
  { pattern: /\b(jesus|christ|messiah|gospel)\b/i, question: (ref: string) => `How does ${ref} connect to the story of Jesus?` },
  { pattern: /\b(suffer\w*|grief|anxiety|hope|comfort)\b/i, question: (ref: string) => `What might ${ref} offer someone seeking hope?` },
];

/** Synchronous, deterministic, and local: no requests or persistent history copy. */
export function buildChatSuggestions({ book, chapter, quotedReference, recentMessages = [], lens = 'standard' }: SuggestionContext) {
  const reference = quotedReference?.trim() || `${book} ${chapter}`;
  const first = `Help me understand ${reference} in context.`;
  // The caller supplies newest conversations and newest messages first. Bound work
  // and inspect only user-authored text, never generated answers or attachments.
  for (const message of recentMessages.slice(0, 12)) {
    const interest = interests.find(item => item.pattern.test(message.slice(0, 600)));
    if (interest) return { reference, source: 'Current passage · recent study interests', questions: [first, interest.question(reference)] };
  }
  const lensQuestions: Partial<Record<TheologicalLensType, string>> = {
    canonical: `How does ${reference} connect with the rest of Scripture?`,
    patristic: `How did early Christians interpret ${reference}?`,
    reformation: `How did the Reformers understand ${reference}?`,
    scholarly: `What historical context helps explain ${reference}?`,
    contemplative: `How can I pray through ${reference}?`,
  };
  return {
    reference,
    source: quotedReference?.trim() ? 'Based on your quoted passage' : 'Based on your open chapter',
    questions: [first, lensQuestions[lens] || `What can I take into daily life from ${reference}?`],
  };
}
