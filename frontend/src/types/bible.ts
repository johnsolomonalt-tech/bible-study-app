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

import {
  BIBLE_TRANSLATION_REGISTRY,
  TranslationCategory as RegistryCategory,
  TranslationDefinition,
  getAvailableTranslations,
} from '@/lib/bibleTranslations';

export type TranslationCategory = RegistryCategory;

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

function mapDefinitionToTranslation(def: TranslationDefinition): BibleTranslation {
  return {
    id: def.id,
    name: def.name,
    abbreviation: def.abbreviation,
    isLocal: def.source.type === 'local',
    isCopyrighted: def.license === 'copyrighted',
    category: def.category,
    year: def.year,
    description: def.description,
    license: def.license,
    copyrightNotice: def.copyrightNotice,
  };
}

export const OPEN_TRANSLATIONS: BibleTranslation[] = BIBLE_TRANSLATION_REGISTRY
  .filter((t) => t.license === 'open-license' || t.license === 'public-domain')
  .map(mapDefinitionToTranslation);

export const COPYRIGHTED_TRANSLATIONS: BibleTranslation[] = BIBLE_TRANSLATION_REGISTRY
  .filter((t) => t.license === 'copyrighted')
  .map(mapDefinitionToTranslation);

export const AVAILABLE_TRANSLATIONS: BibleTranslation[] = getAvailableTranslations().map(mapDefinitionToTranslation);
