export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  book: string; // 3-letter USFM code, e.g. "GEN", "JHN"
  bookName: string; // Full name, e.g. "Genesis", "John"
  chapter: number;
  translation: string; // e.g. "BSB", "WEB", "KJV"
  verses: BibleVerse[];
}

export interface BibleBookData {
  book: string;
  bookName: string;
  bookNumber: number;
  translation: string;
  chapters: Record<string, BibleVerse[]>;
}

export type TranslationCategory = 'modern' | 'traditional' | 'literal' | 'extended';

export interface BibleTranslation {
  id: string; // lower-case identifier, e.g. 'bsb'
  name: string; // 'Berean Standard Bible'
  abbreviation: string; // 'BSB'
  isLocal: boolean;
  isCopyrighted?: boolean;
  category: TranslationCategory;
  year?: string;
  description?: string;
  license: 'public-domain' | 'open-license' | 'copyrighted';
}

export const AVAILABLE_TRANSLATIONS: BibleTranslation[] = [
  // Local Open-License (0ms latency, 100% offline)
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    isLocal: true,
    category: 'modern',
    year: '2023',
    description: 'Accurate, readable modern translation into contemporary English.',
    license: 'open-license',
  },
  {
    id: 'web',
    name: 'World English Bible',
    abbreviation: 'WEB',
    isLocal: true,
    category: 'modern',
    year: '2000',
    description: 'Modern public-domain English translation based on the ASV and Byzantine Majority Text.',
    license: 'public-domain',
  },
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    isLocal: true,
    category: 'traditional',
    year: '1611',
    description: 'Historic, majestic authorized English translation in the public domain.',
    license: 'public-domain',
  },

  // Open Extended via dynamic API fallback
  {
    id: 'asv',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    isLocal: false,
    category: 'traditional',
    year: '1901',
    description: 'Eminent literal study Bible in the American tradition.',
    license: 'public-domain',
  },
  {
    id: 'ylt',
    name: "Young's Literal Translation",
    abbreviation: 'YLT',
    isLocal: false,
    category: 'literal',
    year: '1898',
    description: 'Strictly literal word-for-word rendering adhering to Hebrew & Greek idioms.',
    license: 'public-domain',
  },

  // Extended Copyrighted (via API.Bible if BIBLE_API_KEY is configured)
  {
    id: 'esv',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    isLocal: false,
    isCopyrighted: true,
    category: 'modern',
    description: 'Essentially literal translation emphasizing word-for-word accuracy.',
    license: 'copyrighted',
  },
  {
    id: 'niv',
    name: 'New International Version',
    abbreviation: 'NIV',
    isLocal: false,
    isCopyrighted: true,
    category: 'modern',
    description: 'Balance of word-for-word accuracy and thought-for-thought clarity.',
    license: 'copyrighted',
  },
  {
    id: 'nasb',
    name: 'New American Standard Bible',
    abbreviation: 'NASB',
    isLocal: false,
    isCopyrighted: true,
    category: 'literal',
    description: 'Highly acclaimed for precision and word-for-word fidelity to original texts.',
    license: 'copyrighted',
  },
  {
    id: 'nlt',
    name: 'New Living Translation',
    abbreviation: 'NLT',
    isLocal: false,
    isCopyrighted: true,
    category: 'modern',
    description: 'Clear, dynamic thought-for-thought English translation.',
    license: 'copyrighted',
  },
];
