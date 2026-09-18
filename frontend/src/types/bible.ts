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
  copyright?: string;
  fumsToken?: string;
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
  copyrightNotice?: string;
}

export const OPEN_TRANSLATIONS: BibleTranslation[] = [
  // Local Open-License (0ms latency, 100% offline, CC0/Public Domain)
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    isLocal: true,
    category: 'modern',
    year: '2023',
    description: 'Accurate, readable modern translation dedicated to the Public Domain (CC0 1.0).',
    license: 'open-license',
    copyrightNotice: 'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and is dedicated to the public domain (CC0 1.0).',
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
    copyrightNotice: 'The World English Bible (WEB) is 100% in the Public Domain worldwide.',
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
    copyrightNotice: 'The King James Authorized Version (1611 / 1769) is in the Public Domain worldwide.',
  },

  // Open Extended via dynamic API fallback (Public Domain)
  {
    id: 'asv',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    isLocal: false,
    category: 'traditional',
    year: '1901',
    description: 'Eminent literal study Bible in the American tradition.',
    license: 'public-domain',
    copyrightNotice: 'The American Standard Version (1901) is in the Public Domain worldwide.',
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
    copyrightNotice: "Young's Literal Translation (1898) is in the Public Domain worldwide.",
  },
];

export const COPYRIGHTED_TRANSLATIONS: BibleTranslation[] = [
  // Extended Copyrighted (Requires explicit user API key via API.Bible)
  {
    id: 'niv',
    name: 'New International Version',
    abbreviation: 'NIV',
    isLocal: false,
    isCopyrighted: true,
    category: 'modern',
    description: 'Balance of word-for-word accuracy and thought-for-thought clarity.',
    license: 'copyrighted',
    copyrightNotice: 'Scripture quotations taken from The Holy Bible, New International Version®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.',
  },
  {
    id: 'esv',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    isLocal: false,
    isCopyrighted: true,
    category: 'modern',
    description: 'Essentially literal translation emphasizing word-for-word accuracy.',
    license: 'copyrighted',
    copyrightNotice: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
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
    copyrightNotice: 'Scripture taken from the New American Standard Bible® (NASB), Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. Used by permission. www.Lockman.org',
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
    copyrightNotice: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
  },
];

// Available translations for the client: strictly open-license by default for 100% legal safety,
// unlocking copyrighted versions when NEXT_PUBLIC_ENABLE_COPYRIGHTED_BIBLES is true or NEXT_PUBLIC_BIBLE_API_KEY is provided
export const AVAILABLE_TRANSLATIONS: BibleTranslation[] = [
  ...OPEN_TRANSLATIONS,
  ...(typeof process !== 'undefined' &&
  (process.env?.NEXT_PUBLIC_ENABLE_COPYRIGHTED_BIBLES === 'true' ||
    Boolean(process.env?.NEXT_PUBLIC_BIBLE_API_KEY))
    ? COPYRIGHTED_TRANSLATIONS
    : []),
];
