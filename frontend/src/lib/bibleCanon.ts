export interface CanonicalBook {
  number: number; // 1 to 66
  code: string; // 3-letter USFM (e.g., GEN, EXO, MAT, REV)
  name: string; // Standard canonical name
  testament: 'OT' | 'NT';
  chapters: number;
  aliases: string[];
}

export const CANONICAL_BOOKS: CanonicalBook[] = [
  // Old Testament (1-39)
  { number: 1, code: 'GEN', name: 'Genesis', testament: 'OT', chapters: 50, aliases: ['gen', 'ge', 'gn'] },
  { number: 2, code: 'EXO', name: 'Exodus', testament: 'OT', chapters: 40, aliases: ['exo', 'ex', 'exod'] },
  { number: 3, code: 'LEV', name: 'Leviticus', testament: 'OT', chapters: 27, aliases: ['lev', 'le', 'lv'] },
  { number: 4, code: 'NUM', name: 'Numbers', testament: 'OT', chapters: 36, aliases: ['num', 'nu', 'nm', 'nb'] },
  { number: 5, code: 'DEU', name: 'Deuteronomy', testament: 'OT', chapters: 34, aliases: ['deu', 'dt', 'deut'] },
  { number: 6, code: 'JOS', name: 'Joshua', testament: 'OT', chapters: 24, aliases: ['jos', 'josh', 'jsh'] },
  { number: 7, code: 'JDG', name: 'Judges', testament: 'OT', chapters: 21, aliases: ['jdg', 'judg', 'jg', 'jdgs'] },
  { number: 8, code: 'RUT', name: 'Ruth', testament: 'OT', chapters: 4, aliases: ['rut', 'rth', 'ru'] },
  { number: 9, code: '1SA', name: '1 Samuel', testament: 'OT', chapters: 31, aliases: ['1sa', '1 samuel', '1 sam', '1sam', '1s', 'i samuel', 'i sam', 'first samuel'] },
  { number: 10, code: '2SA', name: '2 Samuel', testament: 'OT', chapters: 24, aliases: ['2sa', '2 samuel', '2 sam', '2sam', '2s', 'ii samuel', 'ii sam', 'second samuel'] },
  { number: 11, code: '1KI', name: '1 Kings', testament: 'OT', chapters: 22, aliases: ['1ki', '1 kings', '1 kgs', '1kgs', '1k', 'i kings', 'i kgs', 'first kings'] },
  { number: 12, code: '2KI', name: '2 Kings', testament: 'OT', chapters: 25, aliases: ['2ki', '2 kings', '2 kgs', '2kgs', '2k', 'ii kings', 'ii kgs', 'second kings'] },
  { number: 13, code: '1CH', name: '1 Chronicles', testament: 'OT', chapters: 29, aliases: ['1ch', '1 chronicles', '1 chron', '1chr', '1ch', 'i chronicles', 'first chronicles'] },
  { number: 14, code: '2CH', name: '2 Chronicles', testament: 'OT', chapters: 36, aliases: ['2ch', '2 chronicles', '2 chron', '2chr', '2ch', 'ii chronicles', 'second chronicles'] },
  { number: 15, code: 'EZR', name: 'Ezra', testament: 'OT', chapters: 10, aliases: ['ezr', 'ezra'] },
  { number: 16, code: 'NEH', name: 'Nehemiah', testament: 'OT', chapters: 13, aliases: ['neh', 'ne'] },
  { number: 17, code: 'EST', name: 'Esther', testament: 'OT', chapters: 10, aliases: ['est', 'esther', 'es'] },
  { number: 18, code: 'JOB', name: 'Job', testament: 'OT', chapters: 42, aliases: ['job', 'jb'] },
  { number: 19, code: 'PSA', name: 'Psalms', testament: 'OT', chapters: 150, aliases: ['psa', 'psalm', 'psalms', 'ps', 'pss'] },
  { number: 20, code: 'PRO', name: 'Proverbs', testament: 'OT', chapters: 31, aliases: ['pro', 'prov', 'prv', 'pr'] },
  { number: 21, code: 'ECC', name: 'Ecclesiastes', testament: 'OT', chapters: 12, aliases: ['ecc', 'eccl', 'eccles', 'ec'] },
  { number: 22, code: 'SNG', name: 'Song of Solomon', testament: 'OT', chapters: 8, aliases: ['sng', 'song of solomon', 'song of songs', 'canticles', 'sos', 'cant'] },
  { number: 23, code: 'ISA', name: 'Isaiah', testament: 'OT', chapters: 66, aliases: ['isa', 'is'] },
  { number: 24, code: 'JER', name: 'Jeremiah', testament: 'OT', chapters: 52, aliases: ['jer', 'jr'] },
  { number: 25, code: 'LAM', name: 'Lamentations', testament: 'OT', chapters: 5, aliases: ['lam', 'la'] },
  { number: 26, code: 'EZK', name: 'Ezekiel', testament: 'OT', chapters: 48, aliases: ['ezk', 'ezek', 'eze'] },
  { number: 27, code: 'DAN', name: 'Daniel', testament: 'OT', chapters: 12, aliases: ['dan', 'da', 'dn'] },
  { number: 28, code: 'HOS', name: 'Hosea', testament: 'OT', chapters: 14, aliases: ['hos', 'ho'] },
  { number: 29, code: 'JOL', name: 'Joel', testament: 'OT', chapters: 3, aliases: ['jol', 'joel', 'jl'] },
  { number: 30, code: 'AMO', name: 'Amos', testament: 'OT', chapters: 9, aliases: ['amo', 'amos', 'am'] },
  { number: 31, code: 'OBA', name: 'Obadiah', testament: 'OT', chapters: 1, aliases: ['oba', 'obad', 'ob'] },
  { number: 32, code: 'JON', name: 'Jonah', testament: 'OT', chapters: 4, aliases: ['jon', 'jonah', 'jnh'] },
  { number: 33, code: 'MIC', name: 'Micah', testament: 'OT', chapters: 7, aliases: ['mic', 'mc'] },
  { number: 34, code: 'NAM', name: 'Nahum', testament: 'OT', chapters: 3, aliases: ['nam', 'nah', 'na'] },
  { number: 35, code: 'HAB', name: 'Habakkuk', testament: 'OT', chapters: 3, aliases: ['hab', 'hb'] },
  { number: 36, code: 'ZEP', name: 'Zephaniah', testament: 'OT', chapters: 3, aliases: ['zep', 'zeph', 'zp'] },
  { number: 37, code: 'HAG', name: 'Haggai', testament: 'OT', chapters: 2, aliases: ['hag', 'hg'] },
  { number: 38, code: 'ZEC', name: 'Zechariah', testament: 'OT', chapters: 14, aliases: ['zec', 'zech', 'zc'] },
  { number: 39, code: 'MAL', name: 'Malachi', testament: 'OT', chapters: 4, aliases: ['mal', 'ml'] },

  // New Testament (40-66)
  { number: 40, code: 'MAT', name: 'Matthew', testament: 'NT', chapters: 28, aliases: ['mat', 'matt', 'mt'] },
  { number: 41, code: 'MRK', name: 'Mark', testament: 'NT', chapters: 16, aliases: ['mrk', 'mark', 'mk'] },
  { number: 42, code: 'LUK', name: 'Luke', testament: 'NT', chapters: 24, aliases: ['luk', 'luke', 'lk'] },
  { number: 43, code: 'JHN', name: 'John', testament: 'NT', chapters: 21, aliases: ['jhn', 'john', 'jn'] },
  { number: 44, code: 'ACT', name: 'Acts', testament: 'NT', chapters: 28, aliases: ['act', 'acts', 'ac'] },
  { number: 45, code: 'ROM', name: 'Romans', testament: 'NT', chapters: 16, aliases: ['rom', 'ro', 'rm'] },
  { number: 46, code: '1CO', name: '1 Corinthians', testament: 'NT', chapters: 16, aliases: ['1co', '1 corinthians', '1 cor', '1cor', 'i corinthians', 'i cor', 'first corinthians'] },
  { number: 47, code: '2CO', name: '2 Corinthians', testament: 'NT', chapters: 13, aliases: ['2co', '2 corinthians', '2 cor', '2cor', 'ii corinthians', 'ii cor', 'second corinthians'] },
  { number: 48, code: 'GAL', name: 'Galatians', testament: 'NT', chapters: 6, aliases: ['gal', 'ga'] },
  { number: 49, code: 'EPH', name: 'Ephesians', testament: 'NT', chapters: 6, aliases: ['eph', 'ep'] },
  { number: 50, code: 'PHP', name: 'Philippians', testament: 'NT', chapters: 4, aliases: ['php', 'phil', 'philip'] },
  { number: 51, code: 'COL', name: 'Colossians', testament: 'NT', chapters: 4, aliases: ['col', 'cl'] },
  { number: 52, code: '1TH', name: '1 Thessalonians', testament: 'NT', chapters: 5, aliases: ['1th', '1 thessalonians', '1 thess', '1thess', '1th', 'i thessalonians', 'first thessalonians'] },
  { number: 53, code: '2TH', name: '2 Thessalonians', testament: 'NT', chapters: 3, aliases: ['2th', '2 thessalonians', '2 thess', '2thess', '2th', 'ii thessalonians', 'second thessalonians'] },
  { number: 54, code: '1TI', name: '1 Timothy', testament: 'NT', chapters: 6, aliases: ['1ti', '1 timothy', '1 tim', '1tim', 'i timothy', 'first timothy'] },
  { number: 55, code: '2TI', name: '2 Timothy', testament: 'NT', chapters: 4, aliases: ['2ti', '2 timothy', '2 tim', '2tim', 'ii timothy', 'second timothy'] },
  { number: 56, code: 'TIT', name: 'Titus', testament: 'NT', chapters: 3, aliases: ['tit', 'ti'] },
  { number: 57, code: 'PHM', name: 'Philemon', testament: 'NT', chapters: 1, aliases: ['phm', 'philem', 'phlm'] },
  { number: 58, code: 'HEB', name: 'Hebrews', testament: 'NT', chapters: 13, aliases: ['heb', 'he'] },
  { number: 59, code: 'JAS', name: 'James', testament: 'NT', chapters: 5, aliases: ['jas', 'james', 'jm'] },
  { number: 60, code: '1PE', name: '1 Peter', testament: 'NT', chapters: 5, aliases: ['1pe', '1 peter', '1 pet', '1pet', 'i peter', 'first peter'] },
  { number: 61, code: '2PE', name: '2 Peter', testament: 'NT', chapters: 3, aliases: ['2pe', '2 peter', '2 pet', '2pet', 'ii peter', 'second peter'] },
  { number: 62, code: '1JN', name: '1 John', testament: 'NT', chapters: 5, aliases: ['1jn', '1 john', '1 jhn', '1jhn', '1jn', 'i john', 'first john'] },
  { number: 63, code: '2JN', name: '2 John', testament: 'NT', chapters: 1, aliases: ['2jn', '2 john', '2 jhn', '2jhn', '2jn', 'ii john', 'second john'] },
  { number: 64, code: '3JN', name: '3 John', testament: 'NT', chapters: 1, aliases: ['3jn', '3 john', '3 jhn', '3jhn', '3jn', 'iii john', 'third john'] },
  { number: 65, code: 'JUD', name: 'Jude', testament: 'NT', chapters: 1, aliases: ['jud', 'jude', 'jd'] },
  { number: 66, code: 'REV', name: 'Revelation', testament: 'NT', chapters: 22, aliases: ['rev', 'revelation', 'revelations', 'apocalypse', 'rv'] },
];

// Pre-indexed lookup maps for instant 0ms lookups
const CODE_MAP = new Map<string, CanonicalBook>();
const NUMBER_MAP = new Map<number, CanonicalBook>();
const NAME_MAP = new Map<string, CanonicalBook>();

CANONICAL_BOOKS.forEach((book) => {
  CODE_MAP.set(book.code.toUpperCase(), book);
  NUMBER_MAP.set(book.number, book);
  NAME_MAP.set(book.name.toLowerCase(), book);
  NAME_MAP.set(book.code.toLowerCase(), book);
  book.aliases.forEach((alias) => {
    NAME_MAP.set(alias.toLowerCase().replace(/\./g, '').trim(), book);
  });
});

/**
 * Resolves any book string (code, name, abbreviation, or alias) to its CanonicalBook entry.
 */
export function findCanonicalBook(input: string | number): CanonicalBook | undefined {
  if (typeof input === 'number') {
    return NUMBER_MAP.get(input);
  }
  if (!input) return undefined;

  const normalized = input.trim().toLowerCase().replace(/\./g, '');
  
  // Direct match
  const direct = NAME_MAP.get(normalized) || CODE_MAP.get(normalized.toUpperCase());
  if (direct) return direct;

  // Space-stripped match (e.g. "1corinthians" or "songofsongs")
  const stripped = normalized.replace(/\s+/g, '');
  const strippedMatch = NAME_MAP.get(stripped);
  if (strippedMatch) return strippedMatch;

  // Prefix match
  for (const book of CANONICAL_BOOKS) {
    if (book.name.toLowerCase().startsWith(normalized)) {
      return book;
    }
  }

  return undefined;
}

export function getBookByCode(code: string): CanonicalBook | undefined {
  return CODE_MAP.get(code.toUpperCase());
}

export function getBookByNumber(num: number): CanonicalBook | undefined {
  return NUMBER_MAP.get(num);
}
