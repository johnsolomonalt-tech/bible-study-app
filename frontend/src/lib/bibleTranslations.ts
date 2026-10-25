/**
 * Central Bible Translation Registry & Architecture
 * =================================================
 *
 * HOW TO ADD A NEW BIBLE TRANSLATION:
 * ------------------------------------
 * 1. Add an entry to the `BIBLE_TRANSLATION_REGISTRY` array below with:
 *    - `id`: unique lowercase identifier (e.g. 'nasb', 'esv', 'csb', 'nkjv')
 *    - `name`: full display name (e.g. 'New American Standard Bible')
 *    - `abbreviation`: standard short code (e.g. 'NASB')
 *    - `year`: publication or copyright year
 *    - `publisher`: organization or publisher name
 *    - `category`: 'modern' | 'traditional' | 'literal' | 'extended'
 *    - `license`: 'public-domain' | 'open-license' | 'copyrighted'
 *    - `licenseText`: full required legal copyright and permission text
 *    - `copyrightNotice`: short attribution for chapter headers and footers
 *    - `source`: where text is loaded from:
 *        * `{ type: 'local', dir: 'your_folder_name' }` for offline / static JSON in `/public/bibles/{dir}/{BOOK}.json`
 *        * `{ type: 'bolls', key: 'BOLLS_CODE' }` for public domain API fallback via Bolls Life
 *        * `{ type: 'api.bible', bibleId: 'API_BIBLE_ID' }` for API.Bible integrations
 *    - `hasInterlinear`: true if Hebrew/Greek Strong's concordance mapping is available
 *
 * 2. If it is a local translation (`type: 'local'`), place the chapter JSON files in:
 *    `public/bibles/{dir}/{BOOK_CODE}.json`
 *
 * 3. That's it! The entire application — Study view, version switcher, comparison views,
 *    search, Tracker, Notes, Canvas, exports, and the public Legal & Licensing page —
 *    will immediately discover and support the new translation.
 */

export type TranslationCategory = 'modern' | 'traditional' | 'literal' | 'extended';
export type TranslationLicenseType = 'public-domain' | 'open-license' | 'copyrighted';

export type TranslationSource =
  | { type: 'local'; dir: string }
  | { type: 'bolls'; key: string }
  | { type: 'api.bible'; bibleId: string };

export interface TranslationDefinition {
  id: string;
  name: string;
  abbreviation: string;
  year?: string;
  publisher?: string;
  description: string;
  category: TranslationCategory;
  license: TranslationLicenseType;
  licenseText: string;
  copyrightNotice: string;
  source: TranslationSource;
  hasInterlinear: boolean;
  isPublicDomain: boolean;
  readingPlanSupported: boolean;
}

export const BIBLE_TRANSLATION_REGISTRY: TranslationDefinition[] = [
  // 1. Berean Standard Bible (BSB) - Local Open-License / CC0 Public Domain
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    year: '2023',
    publisher: 'Bible Hub / Discovery Bible',
    description: 'Accurate, readable modern translation emphasizing theological precision and natural English syntax.',
    category: 'modern',
    license: 'open-license',
    licenseText:
      'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and is dedicated to the public domain (CC0 1.0). You are free to copy, modify, distribute, and perform the work, even for commercial purposes, all without asking permission.',
    copyrightNotice: 'The Berean Standard Bible (BSB) is dedicated to the public domain (CC0 1.0).',
    source: { type: 'local', dir: 'bsb' },
    hasInterlinear: true,
    isPublicDomain: true,
    readingPlanSupported: true,
  },

  // 2. World English Bible (WEB) - Local 100% Public Domain
  {
    id: 'web',
    name: 'World English Bible',
    abbreviation: 'WEB',
    year: '2000',
    publisher: 'Rainbow Missions, Inc.',
    description: 'Modern English translation based on the 1901 American Standard Version and the Greek Majority Text.',
    category: 'modern',
    license: 'public-domain',
    licenseText:
      'The World English Bible (WEB) is a modern English translation of the Holy Bible that is 100% in the Public Domain worldwide. Rainbow Missions, Inc. dedicated all rights to the public domain so that God’s Word may be freely shared without royalty or licensing constraints.',
    copyrightNotice: 'The World English Bible (WEB) is 100% in the Public Domain worldwide.',
    source: { type: 'local', dir: 'web' },
    hasInterlinear: false,
    isPublicDomain: true,
    readingPlanSupported: true,
  },

  // 3. King James Version (KJV) - Historic Authorized Version / Public Domain
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    year: '1611',
    publisher: 'Crown / Cambridge University Press',
    description: 'Historic, majestic authorized English translation renowned for its timeless literary cadence and fidelity to the Textus Receptus.',
    category: 'traditional',
    license: 'public-domain',
    licenseText:
      'The King James Version (1611 / 1769 Blayney Revision) is in the Public Domain in the United States and most parts of the world. In the United Kingdom, rights in the Authorized Version are vested in the Crown under royal letters patent.',
    copyrightNotice: 'The King James Authorized Version (1611 / 1769) is in the Public Domain worldwide.',
    source: { type: 'local', dir: 'kjv' },
    hasInterlinear: true,
    isPublicDomain: true,
    readingPlanSupported: true,
  },

  // 4. American Standard Version (ASV) - Public Domain via Bolls Life
  {
    id: 'asv',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    year: '1901',
    publisher: 'Thomas Nelson & Sons',
    description: 'Eminent literal study Bible in the American tradition, celebrated for its rigorous fidelity to original manuscripts.',
    category: 'traditional',
    license: 'public-domain',
    licenseText:
      'The American Standard Version (1901) is in the Public Domain worldwide. It represents the scholarly work of the American Standard Bible Committee revising the Authorized Version of 1611.',
    copyrightNotice: 'The American Standard Version (1901) is in the Public Domain worldwide.',
    source: { type: 'bolls', key: 'ASV' },
    hasInterlinear: false,
    isPublicDomain: true,
    readingPlanSupported: true,
  },

  // 5. Young\'s Literal Translation (YLT) - Public Domain via Bolls Life
  {
    id: 'ylt',
    name: "Young's Literal Translation",
    abbreviation: 'YLT',
    year: '1898',
    publisher: 'Robert Young',
    description: 'Strictly literal word-for-word rendering adhering to Hebrew and Greek grammatical tenses and idioms.',
    category: 'literal',
    license: 'public-domain',
    licenseText:
      "Young's Literal Translation (1898 Third Edition) by Robert Young is in the Public Domain worldwide. It translates Hebrew and Greek verbs into their exact grammatical tense equivalences.",
    copyrightNotice: "Young's Literal Translation (1898) is in the Public Domain worldwide.",
    source: { type: 'bolls', key: 'YLT' },
    hasInterlinear: false,
    isPublicDomain: true,
    readingPlanSupported: true,
  },

  // 6. English Standard Version (ESV) - Extended Copyrighted via API.Bible / Crossway
  {
    id: 'esv',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    year: '2001',
    publisher: 'Crossway',
    description: 'Essentially literal translation that emphasizes word-for-word accuracy, literary excellence, and depth of meaning.',
    category: 'modern',
    license: 'copyrighted',
    licenseText:
      'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any form beyond fair use limits without written permission.',
    copyrightNotice: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway. Used by permission.',
    source: { type: 'api.bible', bibleId: '06125adad2d5898a-01' },
    hasInterlinear: false,
    isPublicDomain: false,
    readingPlanSupported: true,
  },

  // 7. New International Version (NIV) - Extended Copyrighted via API.Bible / Biblica
  {
    id: 'niv',
    name: 'New International Version',
    abbreviation: 'NIV',
    year: '2011',
    publisher: 'Biblica, Inc.',
    description: 'Balanced modern translation providing a harmonious blend of word-for-word accuracy and thought-for-thought clarity.',
    category: 'modern',
    license: 'copyrighted',
    licenseText:
      'Scripture quotations taken from The Holy Bible, New International Version®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide. The “NIV” and “New International Version” are trademarks registered in the United States Patent and Trademark Office by Biblica, Inc.®',
    copyrightNotice: 'Scripture taken from the New International Version®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission.',
    source: { type: 'api.bible', bibleId: '716077271e422315-01' },
    hasInterlinear: false,
    isPublicDomain: false,
    readingPlanSupported: true,
  },

  // 8. New American Standard Bible (NASB) - Extended Copyrighted via The Lockman Foundation
  {
    id: 'nasb',
    name: 'New American Standard Bible',
    abbreviation: 'NASB',
    year: '2020',
    publisher: 'The Lockman Foundation',
    description: 'Highly acclaimed for precision and word-for-word fidelity to original Hebrew, Aramaic, and Greek texts.',
    category: 'literal',
    license: 'copyrighted',
    licenseText:
      'Scripture taken from the New American Standard Bible® (NASB), Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. Used by permission. www.Lockman.org',
    copyrightNotice: 'Scripture taken from the New American Standard Bible® (NASB), Copyright © 1960-2020 by The Lockman Foundation. Used by permission.',
    source: { type: 'api.bible', bibleId: 'bba9f40183526463-01' },
    hasInterlinear: false,
    isPublicDomain: false,
    readingPlanSupported: true,
  },

  // 9. New Living Translation (NLT) - Extended Copyrighted via Tyndale
  {
    id: 'nlt',
    name: 'New Living Translation',
    abbreviation: 'NLT',
    year: '2015',
    publisher: 'Tyndale House Publishers',
    description: 'Clear, dynamic thought-for-thought English translation rendering ancient texts into warm, communicative English.',
    category: 'modern',
    license: 'copyrighted',
    licenseText:
      'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
    copyrightNotice: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996-2015 by Tyndale House Foundation.',
    source: { type: 'api.bible', bibleId: 'd5151f43501a117b-01' },
    hasInterlinear: false,
    isPublicDomain: false,
    readingPlanSupported: true,
  },
];

/**
 * Registry Lookup & Filter Helpers
 */
export function getTranslation(id: string): TranslationDefinition | undefined {
  if (!id) return undefined;
  const needle = id.toLowerCase().trim();
  return BIBLE_TRANSLATION_REGISTRY.find(
    (t) => t.id.toLowerCase() === needle || t.abbreviation.toLowerCase() === needle
  );
}

export function getAllTranslations(): TranslationDefinition[] {
  return BIBLE_TRANSLATION_REGISTRY;
}

export function getOpenTranslations(): TranslationDefinition[] {
  return BIBLE_TRANSLATION_REGISTRY.filter(
    (t) => t.license === 'open-license' || t.license === 'public-domain'
  );
}

export function getCopyrightedTranslations(): TranslationDefinition[] {
  return BIBLE_TRANSLATION_REGISTRY.filter((t) => t.license === 'copyrighted');
}

/**
 * Returns translations available in the current environment:
 * All open-license translations are always active.
 * Copyrighted translations activate when NEXT_PUBLIC_ENABLE_COPYRIGHTED_BIBLES is set
 * or when a user/system API key is present.
 */
export function getAvailableTranslations(): TranslationDefinition[] {
  const isCopyrightedEnabled =
    typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_ENABLE_COPYRIGHTED_BIBLES === 'true' ||
      Boolean(process.env?.NEXT_PUBLIC_BIBLE_API_KEY));

  return BIBLE_TRANSLATION_REGISTRY.filter(
    (t) => !t.source || t.license !== 'copyrighted' || isCopyrightedEnabled
  );
}

/**
 * Returns structured attribution records for legal pages and in-app footers
 */
export function getTranslationAttributions(): Array<{
  id: string;
  name: string;
  abbreviation: string;
  year?: string;
  publisher?: string;
  license: TranslationLicenseType;
  licenseText: string;
  copyrightNotice: string;
  isPublicDomain: boolean;
}> {
  return BIBLE_TRANSLATION_REGISTRY.map((t) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    year: t.year,
    publisher: t.publisher,
    license: t.license,
    licenseText: t.licenseText,
    copyrightNotice: t.copyrightNotice,
    isPublicDomain: t.isPublicDomain,
  }));
}
