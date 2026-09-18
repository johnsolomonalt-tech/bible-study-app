import React from 'react';

export interface ParsedVerseRef {
  book: string;
  chapter: number;
  verse: number;
  raw: string;
}

// Canonical books and their chapters
export const CANONICAL_BOOKS: Record<string, { name: string; chapters: number }> = {
  // Old Testament
  genesis: { name: 'Genesis', chapters: 50 },
  gen: { name: 'Genesis', chapters: 50 },
  ge: { name: 'Genesis', chapters: 50 },
  exodus: { name: 'Exodus', chapters: 40 },
  exod: { name: 'Exodus', chapters: 40 },
  ex: { name: 'Exodus', chapters: 40 },
  leviticus: { name: 'Leviticus', chapters: 27 },
  lev: { name: 'Leviticus', chapters: 27 },
  le: { name: 'Leviticus', chapters: 27 },
  numbers: { name: 'Numbers', chapters: 36 },
  num: { name: 'Numbers', chapters: 36 },
  nu: { name: 'Numbers', chapters: 36 },
  deuteronomy: { name: 'Deuteronomy', chapters: 34 },
  deut: { name: 'Deuteronomy', chapters: 34 },
  dt: { name: 'Deuteronomy', chapters: 34 },
  joshua: { name: 'Joshua', chapters: 24 },
  josh: { name: 'Joshua', chapters: 24 },
  jos: { name: 'Joshua', chapters: 24 },
  judges: { name: 'Judges', chapters: 21 },
  judg: { name: 'Judges', chapters: 21 },
  jdg: { name: 'Judges', chapters: 21 },
  ruth: { name: 'Ruth', chapters: 4 },
  rut: { name: 'Ruth', chapters: 4 },
  ru: { name: 'Ruth', chapters: 4 },
  '1 samuel': { name: '1 Samuel', chapters: 31 },
  '1samuel': { name: '1 Samuel', chapters: 31 },
  '1 sam': { name: '1 Samuel', chapters: 31 },
  '1sam': { name: '1 Samuel', chapters: 31 },
  '1 sa': { name: '1 Samuel', chapters: 31 },
  '2 samuel': { name: '2 Samuel', chapters: 24 },
  '2samuel': { name: '2 Samuel', chapters: 24 },
  '2 sam': { name: '2 Samuel', chapters: 24 },
  '2sam': { name: '2 Samuel', chapters: 24 },
  '2 sa': { name: '2 Samuel', chapters: 24 },
  '1 kings': { name: '1 Kings', chapters: 22 },
  '1kings': { name: '1 Kings', chapters: 22 },
  '1 kgs': { name: '1 Kings', chapters: 22 },
  '1kgs': { name: '1 Kings', chapters: 22 },
  '1 ki': { name: '1 Kings', chapters: 22 },
  '2 kings': { name: '2 Kings', chapters: 25 },
  '2kings': { name: '2 Kings', chapters: 25 },
  '2 kgs': { name: '2 Kings', chapters: 25 },
  '2kgs': { name: '2 Kings', chapters: 25 },
  '2 ki': { name: '2 Kings', chapters: 25 },
  '1 chronicles': { name: '1 Chronicles', chapters: 29 },
  '1chronicles': { name: '1 Chronicles', chapters: 29 },
  '1 chron': { name: '1 Chronicles', chapters: 29 },
  '1chron': { name: '1 Chronicles', chapters: 29 },
  '1 chr': { name: '1 Chronicles', chapters: 29 },
  '1 ch': { name: '1 Chronicles', chapters: 29 },
  '2 chronicles': { name: '2 Chronicles', chapters: 36 },
  '2chronicles': { name: '2 Chronicles', chapters: 36 },
  '2 chron': { name: '2 Chronicles', chapters: 36 },
  '2chron': { name: '2 Chronicles', chapters: 36 },
  '2 chr': { name: '2 Chronicles', chapters: 36 },
  '2 ch': { name: '2 Chronicles', chapters: 36 },
  ezra: { name: 'Ezra', chapters: 10 },
  ezr: { name: 'Ezra', chapters: 10 },
  nehemiah: { name: 'Nehemiah', chapters: 13 },
  neh: { name: 'Nehemiah', chapters: 13 },
  ne: { name: 'Nehemiah', chapters: 13 },
  esther: { name: 'Esther', chapters: 10 },
  esth: { name: 'Esther', chapters: 10 },
  est: { name: 'Esther', chapters: 10 },
  job: { name: 'Job', chapters: 42 },
  jb: { name: 'Job', chapters: 42 },
  psalms: { name: 'Psalms', chapters: 150 },
  psalm: { name: 'Psalms', chapters: 150 },
  psa: { name: 'Psalms', chapters: 150 },
  ps: { name: 'Psalms', chapters: 150 },
  pss: { name: 'Psalms', chapters: 150 },
  proverbs: { name: 'Proverbs', chapters: 31 },
  prov: { name: 'Proverbs', chapters: 31 },
  pro: { name: 'Proverbs', chapters: 31 },
  prv: { name: 'Proverbs', chapters: 31 },
  pr: { name: 'Proverbs', chapters: 31 },
  ecclesiastes: { name: 'Ecclesiastes', chapters: 12 },
  eccles: { name: 'Ecclesiastes', chapters: 12 },
  eccl: { name: 'Ecclesiastes', chapters: 12 },
  ecc: { name: 'Ecclesiastes', chapters: 12 },
  'song of solomon': { name: 'Song of Solomon', chapters: 8 },
  'song of songs': { name: 'Song of Solomon', chapters: 8 },
  song: { name: 'Song of Solomon', chapters: 8 },
  sos: { name: 'Song of Solomon', chapters: 8 },
  canticles: { name: 'Song of Solomon', chapters: 8 },
  isaiah: { name: 'Isaiah', chapters: 66 },
  isa: { name: 'Isaiah', chapters: 66 },
  is: { name: 'Isaiah', chapters: 66 },
  jeremiah: { name: 'Jeremiah', chapters: 52 },
  jer: { name: 'Jeremiah', chapters: 52 },
  je: { name: 'Jeremiah', chapters: 52 },
  lamentations: { name: 'Lamentations', chapters: 5 },
  lam: { name: 'Lamentations', chapters: 5 },
  la: { name: 'Lamentations', chapters: 5 },
  ezekiel: { name: 'Ezekiel', chapters: 48 },
  ezek: { name: 'Ezekiel', chapters: 48 },
  eze: { name: 'Ezekiel', chapters: 48 },
  daniel: { name: 'Daniel', chapters: 12 },
  dan: { name: 'Daniel', chapters: 12 },
  da: { name: 'Daniel', chapters: 12 },
  hosea: { name: 'Hosea', chapters: 14 },
  hos: { name: 'Hosea', chapters: 14 },
  ho: { name: 'Hosea', chapters: 14 },
  joel: { name: 'Joel', chapters: 3 },
  joe: { name: 'Joel', chapters: 3 },
  jl: { name: 'Joel', chapters: 3 },
  amos: { name: 'Amos', chapters: 9 },
  am: { name: 'Amos', chapters: 9 },
  obadiah: { name: 'Obadiah', chapters: 1 },
  obad: { name: 'Obadiah', chapters: 1 },
  ob: { name: 'Obadiah', chapters: 1 },
  jonah: { name: 'Jonah', chapters: 4 },
  jon: { name: 'Jonah', chapters: 4 },
  jnh: { name: 'Jonah', chapters: 4 },
  micah: { name: 'Micah', chapters: 7 },
  mic: { name: 'Micah', chapters: 7 },
  mc: { name: 'Micah', chapters: 7 },
  nahum: { name: 'Nahum', chapters: 3 },
  nah: { name: 'Nahum', chapters: 3 },
  na: { name: 'Nahum', chapters: 3 },
  habakkuk: { name: 'Habakkuk', chapters: 3 },
  hab: { name: 'Habakkuk', chapters: 3 },
  hb: { name: 'Habakkuk', chapters: 3 },
  zephaniah: { name: 'Zephaniah', chapters: 3 },
  zeph: { name: 'Zephaniah', chapters: 3 },
  zep: { name: 'Zephaniah', chapters: 3 },
  haggai: { name: 'Haggai', chapters: 2 },
  hag: { name: 'Haggai', chapters: 2 },
  hg: { name: 'Haggai', chapters: 2 },
  zechariah: { name: 'Zechariah', chapters: 14 },
  zech: { name: 'Zechariah', chapters: 14 },
  zec: { name: 'Zechariah', chapters: 14 },
  malachi: { name: 'Malachi', chapters: 4 },
  mal: { name: 'Malachi', chapters: 4 },

  // New Testament
  matthew: { name: 'Matthew', chapters: 28 },
  matt: { name: 'Matthew', chapters: 28 },
  mat: { name: 'Matthew', chapters: 28 },
  mt: { name: 'Matthew', chapters: 28 },
  mark: { name: 'Mark', chapters: 16 },
  mrk: { name: 'Mark', chapters: 16 },
  mr: { name: 'Mark', chapters: 16 },
  mk: { name: 'Mark', chapters: 16 },
  luke: { name: 'Luke', chapters: 24 },
  luk: { name: 'Luke', chapters: 24 },
  lk: { name: 'Luke', chapters: 24 },
  john: { name: 'John', chapters: 21 },
  joh: { name: 'John', chapters: 21 },
  jhn: { name: 'John', chapters: 21 },
  jn: { name: 'John', chapters: 21 },
  acts: { name: 'Acts', chapters: 28 },
  act: { name: 'Acts', chapters: 28 },
  ac: { name: 'Acts', chapters: 28 },
  romans: { name: 'Romans', chapters: 16 },
  rom: { name: 'Romans', chapters: 16 },
  ro: { name: 'Romans', chapters: 16 },
  rm: { name: 'Romans', chapters: 16 },
  '1 corinthians': { name: '1 Corinthians', chapters: 16 },
  '1corinthians': { name: '1 Corinthians', chapters: 16 },
  '1 cor': { name: '1 Corinthians', chapters: 16 },
  '1cor': { name: '1 Corinthians', chapters: 16 },
  '1 co': { name: '1 Corinthians', chapters: 16 },
  '2 corinthians': { name: '2 Corinthians', chapters: 13 },
  '2corinthians': { name: '2 Corinthians', chapters: 13 },
  '2 cor': { name: '2 Corinthians', chapters: 13 },
  '2cor': { name: '2 Corinthians', chapters: 13 },
  '2 co': { name: '2 Corinthians', chapters: 13 },
  galatians: { name: 'Galatians', chapters: 6 },
  gal: { name: 'Galatians', chapters: 6 },
  ga: { name: 'Galatians', chapters: 6 },
  ephesians: { name: 'Ephesians', chapters: 6 },
  eph: { name: 'Ephesians', chapters: 6 },
  ep: { name: 'Ephesians', chapters: 6 },
  philippians: { name: 'Philippians', chapters: 4 },
  phil: { name: 'Philippians', chapters: 4 },
  php: { name: 'Philippians', chapters: 4 },
  colossians: { name: 'Colossians', chapters: 4 },
  col: { name: 'Colossians', chapters: 4 },
  co: { name: 'Colossians', chapters: 4 },
  '1 thessalonians': { name: '1 Thessalonians', chapters: 5 },
  '1thessalonians': { name: '1 Thessalonians', chapters: 5 },
  '1 thess': { name: '1 Thessalonians', chapters: 5 },
  '1thess': { name: '1 Thessalonians', chapters: 5 },
  '1 th': { name: '1 Thessalonians', chapters: 5 },
  '2 thessalonians': { name: '2 Thessalonians', chapters: 3 },
  '2thessalonians': { name: '2 Thessalonians', chapters: 3 },
  '2 thess': { name: '2 Thessalonians', chapters: 3 },
  '2thess': { name: '2 Thessalonians', chapters: 3 },
  '2 th': { name: '2 Thessalonians', chapters: 3 },
  '1 timothy': { name: '1 Timothy', chapters: 6 },
  '1timothy': { name: '1 Timothy', chapters: 6 },
  '1 tim': { name: '1 Timothy', chapters: 6 },
  '1tim': { name: '1 Timothy', chapters: 6 },
  '1 ti': { name: '1 Timothy', chapters: 6 },
  '2 timothy': { name: '2 Timothy', chapters: 4 },
  '2timothy': { name: '2 Timothy', chapters: 4 },
  '2 tim': { name: '2 Timothy', chapters: 4 },
  '2tim': { name: '2 Timothy', chapters: 4 },
  '2 ti': { name: '2 Timothy', chapters: 4 },
  titus: { name: 'Titus', chapters: 3 },
  tit: { name: 'Titus', chapters: 3 },
  ti: { name: 'Titus', chapters: 3 },
  philemon: { name: 'Philemon', chapters: 1 },
  philem: { name: 'Philemon', chapters: 1 },
  phlm: { name: 'Philemon', chapters: 1 },
  phm: { name: 'Philemon', chapters: 1 },
  hebrews: { name: 'Hebrews', chapters: 13 },
  heb: { name: 'Hebrews', chapters: 13 },
  james: { name: 'James', chapters: 5 },
  jas: { name: 'James', chapters: 5 },
  jm: { name: 'James', chapters: 5 },
  '1 peter': { name: '1 Peter', chapters: 5 },
  '1peter': { name: '1 Peter', chapters: 5 },
  '1 pet': { name: '1 Peter', chapters: 5 },
  '1pet': { name: '1 Peter', chapters: 5 },
  '1 pe': { name: '1 Peter', chapters: 5 },
  '1 pt': { name: '1 Peter', chapters: 5 },
  '2 peter': { name: '2 Peter', chapters: 5 },
  '2peter': { name: '2 Peter', chapters: 5 },
  '2 pet': { name: '2 Peter', chapters: 5 },
  '2pet': { name: '2 Peter', chapters: 5 },
  '2 pe': { name: '2 Peter', chapters: 5 },
  '2 pt': { name: '2 Peter', chapters: 5 },
  '1 john': { name: '1 John', chapters: 5 },
  '1john': { name: '1 John', chapters: 5 },
  '1 jn': { name: '1 John', chapters: 5 },
  '1jn': { name: '1 John', chapters: 5 },
  '1 jo': { name: '1 John', chapters: 5 },
  '2 john': { name: '2 John', chapters: 1 },
  '2john': { name: '2 John', chapters: 1 },
  '2 jn': { name: '2 John', chapters: 1 },
  '2jn': { name: '2 John', chapters: 1 },
  '2 jo': { name: '2 John', chapters: 1 },
  '3 john': { name: '3 John', chapters: 1 },
  '3john': { name: '3 John', chapters: 1 },
  '3 jn': { name: '3 John', chapters: 1 },
  '3jn': { name: '3 John', chapters: 1 },
  '3 jo': { name: '3 John', chapters: 1 },
  jude: { name: 'Jude', chapters: 1 },
  jud: { name: 'Jude', chapters: 1 },
  jd: { name: 'Jude', chapters: 1 },
  revelation: { name: 'Revelation', chapters: 22 },
  rev: { name: 'Revelation', chapters: 22 },
  re: { name: 'Revelation', chapters: 22 },
};

// Build sorted regex pattern of book names (longest names first to avoid prefix collisions)
const SORTED_BOOK_NAMES = Object.keys(CANONICAL_BOOKS).sort((a, b) => b.length - a.length);
const BOOK_REGEX_PART = SORTED_BOOK_NAMES.map(n => n.replace(/\s+/g, '\\s+')).join('|');

// Safe book names for standalone chapter references (avoids common English words like 'is', 'am')
const AMBIGUOUS_WORDS = new Set(['all', 'can', 'jam', 'act', 'job', 'man', 'is', 'am', 'so', 'do', 'he', 're', 'no', 'as', 'to', 'in']);
const SAFE_CHAPTER_BOOKS = Object.keys(CANONICAL_BOOKS)
  .filter(b => b.length >= 3 && !AMBIGUOUS_WORDS.has(b))
  .sort((a, b) => b.length - a.length);
const SAFE_CHAPTER_BOOKS_PART = SAFE_CHAPTER_BOOKS.map(n => n.replace(/\s+/g, '\\s+')).join('|');

// Matches: "Romans 8:28", "1 Corinthians 13:4-8", "Gen. 1:1", "Song of Solomon 2:4", "John 14: 27", "John 14:27–28"
// Group 1: Book name, Group 2: Chapter, Group 3: Starting verse, Group 4: Optional ending verse
export const BIBLE_VERSE_REGEX = new RegExp(
  `\\b(${BOOK_REGEX_PART})\\.?\\s*(\\d+):\\s*(\\d+)(?:\\s*[\\-\\u2013\\u2014]\\s*(\\d+))?\\b`,
  'gi'
);

// Matches standalone chapter citations like "Psalm 23", "Romans 8" when NOT followed by a colon
export const BIBLE_CHAPTER_REGEX = new RegExp(
  `\\b(${SAFE_CHAPTER_BOOKS_PART})\\.?\\s+(\\d+)(?!:\\s*\\d+)\\b`,
  'gi'
);

export function parseVerseReference(text: string): ParsedVerseRef | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 1. Try full verse citation: Book Chapter:Verse(-Verse)
  const verseMatch = trimmed.match(
    new RegExp(`^(${BOOK_REGEX_PART})\\.?\\s*(\\d+):\\s*(\\d+)(?:\\s*[\\-\\u2013\\u2014]\\s*(\\d+))?$`, 'i')
  );
  if (verseMatch) {
    const rawBook = verseMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const canonical = CANONICAL_BOOKS[rawBook];
    if (canonical) {
      const chapter = parseInt(verseMatch[2], 10);
      const verse = parseInt(verseMatch[3], 10);
      if (!isNaN(chapter) && !isNaN(verse) && chapter >= 1 && verse >= 1) {
        return {
          book: canonical.name,
          chapter,
          verse,
          raw: trimmed,
        };
      }
    }
  }

  // 2. Try standalone chapter citation: Book Chapter
  const chapterMatch = trimmed.match(
    new RegExp(`^(${SAFE_CHAPTER_BOOKS_PART})\\.?\\s+(\\d+)$`, 'i')
  );
  if (chapterMatch) {
    const rawBook = chapterMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const canonical = CANONICAL_BOOKS[rawBook];
    if (canonical) {
      const chapter = parseInt(chapterMatch[2], 10);
      if (!isNaN(chapter) && chapter >= 1 && chapter <= canonical.chapters) {
        return {
          book: canonical.name,
          chapter,
          verse: 1,
          raw: trimmed,
        };
      }
    }
  }

  return null;
}

export type VerseClickHandler = (book: string, chapter: number, verse: number) => void;

function renderVerseButton(
  rawMatch: string,
  bookName: string,
  chapter: number,
  verse: number,
  key: string,
  onVerseClick: VerseClickHandler
) {
  return (
    <button
      key={key}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onVerseClick(bookName, chapter, verse);
      }}
      className="inline font-medium text-accent hover:text-accent/90 underline decoration-accent/35 hover:decoration-accent underline-offset-[3px] decoration-1 hover:bg-accent/10 rounded px-1 -mx-0.5 transition-all cursor-pointer select-text"
      title={`Open ${bookName} ${chapter}:${verse} in Bible reader`}
    >
      {rawMatch}
    </button>
  );
}

/**
 * Traverses ReactNode children recursively and replaces any detected Bible verse or chapter citations
 * with an interactive clickable element that invokes onVerseClick(book, chapter, verse).
 */
export function linkifyBibleReferences(
  node: React.ReactNode,
  onVerseClick: VerseClickHandler
): React.ReactNode {
  if (typeof node === 'string') {
    // Phase 1: Match full verse citations: Book C:V(-V)
    BIBLE_VERSE_REGEX.lastIndex = 0;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BIBLE_VERSE_REGEX.exec(node)) !== null) {
      const matchStart = match.index;
      const matchEnd = BIBLE_VERSE_REGEX.lastIndex;
      const rawMatch = match[0];
      const rawBook = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
      const chapter = parseInt(match[2], 10);
      const verse = parseInt(match[3], 10);

      const canonical = CANONICAL_BOOKS[rawBook];
      if (canonical && !isNaN(chapter) && !isNaN(verse)) {
        if (matchStart > lastIndex) {
          parts.push(node.substring(lastIndex, matchStart));
        }

        parts.push(
          renderVerseButton(
            rawMatch,
            canonical.name,
            chapter,
            verse,
            `verse-${canonical.name}-${chapter}-${verse}-${matchStart}`,
            onVerseClick
          )
        );

        lastIndex = matchEnd;
      }
    }

    if (lastIndex < node.length) {
      parts.push(node.substring(lastIndex));
    }

    // Phase 2: On any plain string chunks, check for standalone chapter citations
    const finalParts: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part !== 'string') {
        finalParts.push(part);
        continue;
      }

      BIBLE_CHAPTER_REGEX.lastIndex = 0;
      let chapterLastIdx = 0;
      let chMatch: RegExpExecArray | null;

      while ((chMatch = BIBLE_CHAPTER_REGEX.exec(part)) !== null) {
        const chStart = chMatch.index;
        const chEnd = BIBLE_CHAPTER_REGEX.lastIndex;
        const rawChMatch = chMatch[0];
        const rawChBook = chMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();
        const chapter = parseInt(chMatch[2], 10);

        const canonical = CANONICAL_BOOKS[rawChBook];
        if (canonical && !isNaN(chapter) && chapter >= 1 && chapter <= canonical.chapters) {
          if (chStart > chapterLastIdx) {
            finalParts.push(part.substring(chapterLastIdx, chStart));
          }

          finalParts.push(
            renderVerseButton(
              rawChMatch,
              canonical.name,
              chapter,
              1,
              `chap-${canonical.name}-${chapter}-${chStart}`,
              onVerseClick
            )
          );

          chapterLastIdx = chEnd;
        }
      }

      if (chapterLastIdx === 0) {
        finalParts.push(part);
      } else if (chapterLastIdx < part.length) {
        finalParts.push(part.substring(chapterLastIdx));
      }
    }

    if (finalParts.length === 1 && typeof finalParts[0] === 'string') {
      return node;
    }

    return finalParts.length === 1 ? finalParts[0] : finalParts;
  }

  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => linkifyBibleReferences(child, onVerseClick));
  }

  if (React.isValidElement(node)) {
    // Do not linkify inside buttons or code blocks
    if (node.type === 'button' || node.type === 'code' || node.type === 'pre') {
      return node;
    }

    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props && element.props.children) {
      return React.cloneElement(
        element,
        undefined,
        linkifyBibleReferences(element.props.children, onVerseClick)
      );
    }
  }

  return node;
}

export const createMarkdownComponents = (onVerseClick?: VerseClickHandler) => ({
  p: ({ children }: any) => (
    <p className="mb-4 last:mb-0 leading-[1.7] text-[15px]">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </p>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-[3px] border-[#c96442] bg-accent/10 py-3 px-5 my-5 italic rounded-r-xl shadow-sm text-fg-hover text-[15px]">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </blockquote>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-fg">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-fg-hover">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </em>
  ),
  li: ({ children }: any) => (
    <li className="leading-[1.7] text-[15px]">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </li>
  ),
  ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold mb-4 mt-6 text-fg">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-[18px] font-bold mb-3 mt-5 text-fg">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[16px] font-bold mb-2 mt-4 text-fg-hover">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-[15px] font-bold mb-2 mt-3 text-fg">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </h4>
  ),
  td: ({ children }: any) => (
    <td className="p-2 border border-border">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </td>
  ),
  th: ({ children }: any) => (
    <th className="p-2 border border-border font-semibold">
      {onVerseClick ? linkifyBibleReferences(children, onVerseClick) : children}
    </th>
  ),
  a: ({ children, href }: any) => {
    const rawText = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
    const cleanRef = rawText.trim() || (href ? decodeURIComponent(href.replace(/^.*[#/]/, '')).trim() : '');
    const parsed = parseVerseReference(cleanRef);
    if (parsed && onVerseClick) {
      return renderVerseButton(
        rawText || parsed.raw,
        parsed.book,
        parsed.chapter,
        parsed.verse,
        `mdlink-${parsed.book}-${parsed.chapter}-${parsed.verse}`,
        onVerseClick
      );
    }
    return <a href={href} className="text-accent hover:underline" target="_blank" rel="noreferrer">{children}</a>;
  },
});

