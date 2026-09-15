import React from 'react';
import { BookOpen } from 'lucide-react';

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

// Matches: "Romans 8:28", "1 Corinthians 13:4-8", "Gen 1:1", "Song of Solomon 2:4"
// Group 1: Book name, Group 2: Chapter, Group 3: Starting verse, Group 4: Optional ending verse
export const BIBLE_VERSE_REGEX = new RegExp(
  `\\b(${BOOK_REGEX_PART})\\s+(\\d+):(\\d+)(?:-(\\d+))?\\b`,
  'gi'
);

export function parseVerseReference(text: string): ParsedVerseRef | null {
  const match = text.match(
    new RegExp(`^(${BOOK_REGEX_PART})\\s+(\\d+):(\\d+)(?:-(\\d+))?$`, 'i')
  );
  if (!match) return null;

  const rawBook = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
  const canonical = CANONICAL_BOOKS[rawBook];
  if (!canonical) return null;

  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);

  if (isNaN(chapter) || isNaN(verse) || chapter < 1 || verse < 1) return null;

  return {
    book: canonical.name,
    chapter,
    verse,
    raw: text,
  };
}

export type VerseClickHandler = (book: string, chapter: number, verse: number) => void;

/**
 * Traverses ReactNode children recursively and replaces any detected Bible verse citations
 * with an interactive clickable element that invokes onVerseClick(book, chapter, verse).
 */
export function linkifyBibleReferences(
  node: React.ReactNode,
  onVerseClick: VerseClickHandler
): React.ReactNode {
  if (typeof node === 'string') {
    // Reset regex index
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
        // Push preceding plain text
        if (matchStart > lastIndex) {
          parts.push(node.substring(lastIndex, matchStart));
        }

        // Push clickable verse badge
        const bookName = canonical.name;
        parts.push(
          <button
            key={`verse-link-${bookName}-${chapter}-${verse}-${matchStart}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVerseClick(bookName, chapter, verse);
            }}
            className="inline-flex items-baseline gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-accent/15 hover:bg-accent/25 text-accent font-semibold text-inherit border border-accent/25 hover:border-accent/40 transition-all cursor-pointer group/vlink align-baseline shadow-xs"
            title={`Navigate to ${bookName} ${chapter}:${verse} in Bible reader`}
          >
            <BookOpen size={11} className="self-center opacity-70 group-hover/vlink:opacity-100 transition-opacity" />
            <span className="underline decoration-accent/40 group-hover/vlink:decoration-accent">
              {rawMatch}
            </span>
          </button>
        );

        lastIndex = matchEnd;
      }
    }

    if (lastIndex === 0) {
      return node; // No matches found, return raw string
    }

    if (lastIndex < node.length) {
      parts.push(node.substring(lastIndex));
    }

    return parts.length === 1 ? parts[0] : parts;
  }

  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => linkifyBibleReferences(child, onVerseClick));
  }

  if (React.isValidElement(node)) {
    // Do not linkify inside interactive elements or code blocks
    if (node.type === 'a' || node.type === 'button' || node.type === 'code' || node.type === 'pre') {
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
