import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public/bibles');

// Canonical mapping of Bolls book ID (1-66) to 3-letter USFM code and name
const CANONICAL_BOOKS = [
  { id: 1, code: 'GEN', name: 'Genesis' },
  { id: 2, code: 'EXO', name: 'Exodus' },
  { id: 3, code: 'LEV', name: 'Leviticus' },
  { id: 4, code: 'NUM', name: 'Numbers' },
  { id: 5, code: 'DEU', name: 'Deuteronomy' },
  { id: 6, code: 'JOS', name: 'Joshua' },
  { id: 7, code: 'JDG', name: 'Judges' },
  { id: 8, code: 'RUT', name: 'Ruth' },
  { id: 9, code: '1SA', name: '1 Samuel' },
  { id: 10, code: '2SA', name: '2 Samuel' },
  { id: 11, code: '1KI', name: '1 Kings' },
  { id: 12, code: '2KI', name: '2 Kings' },
  { id: 13, code: '1CH', name: '1 Chronicles' },
  { id: 14, code: '2CH', name: '2 Chronicles' },
  { id: 15, code: 'EZR', name: 'Ezra' },
  { id: 16, code: 'NEH', name: 'Nehemiah' },
  { id: 17, code: 'EST', name: 'Esther' },
  { id: 18, code: 'JOB', name: 'Job' },
  { id: 19, code: 'PSA', name: 'Psalms' },
  { id: 20, code: 'PRO', name: 'Proverbs' },
  { id: 21, code: 'ECC', name: 'Ecclesiastes' },
  { id: 22, code: 'SNG', name: 'Song of Solomon' },
  { id: 23, code: 'ISA', name: 'Isaiah' },
  { id: 24, code: 'JER', name: 'Jeremiah' },
  { id: 25, code: 'LAM', name: 'Lamentations' },
  { id: 26, code: 'EZK', name: 'Ezekiel' },
  { id: 27, code: 'DAN', name: 'Daniel' },
  { id: 28, code: 'HOS', name: 'Hosea' },
  { id: 29, code: 'JOL', name: 'Joel' },
  { id: 30, code: 'AMO', name: 'Amos' },
  { id: 31, code: 'OBA', name: 'Obadiah' },
  { id: 32, code: 'JON', name: 'Jonah' },
  { id: 33, code: 'MIC', name: 'Micah' },
  { id: 34, code: 'NAM', name: 'Nahum' },
  { id: 35, code: 'HAB', name: 'Habakkuk' },
  { id: 36, code: 'ZEP', name: 'Zephaniah' },
  { id: 37, code: 'HAG', name: 'Haggai' },
  { id: 38, code: 'ZEC', name: 'Zechariah' },
  { id: 39, code: 'MAL', name: 'Malachi' },
  { id: 40, code: 'MAT', name: 'Matthew' },
  { id: 41, code: 'MRK', name: 'Mark' },
  { id: 42, code: 'LUK', name: 'Luke' },
  { id: 43, code: 'JHN', name: 'John' },
  { id: 44, code: 'ACT', name: 'Acts' },
  { id: 45, code: 'ROM', name: 'Romans' },
  { id: 46, code: '1CO', name: '1 Corinthians' },
  { id: 47, code: '2CO', name: '2 Corinthians' },
  { id: 48, code: 'GAL', name: 'Galatians' },
  { id: 49, code: 'EPH', name: 'Ephesians' },
  { id: 50, code: 'PHP', name: 'Philippians' },
  { id: 51, code: 'COL', name: 'Colossians' },
  { id: 52, code: '1TH', name: '1 Thessalonians' },
  { id: 53, code: '2TH', name: '2 Thessalonians' },
  { id: 54, code: '1TI', name: '1 Timothy' },
  { id: 55, code: '2TI', name: '2 Timothy' },
  { id: 56, code: 'TIT', name: 'Titus' },
  { id: 57, code: 'PHM', name: 'Philemon' },
  { id: 58, code: 'HEB', name: 'Hebrews' },
  { id: 59, code: 'JAS', name: 'James' },
  { id: 60, code: '1PE', name: '1 Peter' },
  { id: 61, code: '2PE', name: '2 Peter' },
  { id: 62, code: '1JN', name: '1 John' },
  { id: 63, code: '2JN', name: '2 John' },
  { id: 64, code: '3JN', name: '3 John' },
  { id: 65, code: 'JUD', name: 'Jude' },
  { id: 66, code: 'REV', name: 'Revelation' },
];

const TRANSLATIONS = ['BSB', 'WEB', 'KJV'];

function cleanVerseText(raw) {
  if (!raw) return '';
  return raw
    .replace(/<S>\d+<\/S>/gi, '') // remove Strong's tags like <S>1063</S>
    .replace(/<[^>]*>/g, '') // remove remaining HTML tags
    .replace(/\[\d+\]/g, '') // remove footnote references
    .replace(/([a-zA-Z,.;:!?’'"]+)\d+/g, '$1') // remove Strong's numbers attached to words e.g. beginning7225 -> beginning
    .replace(/\b\d{3,5}\b/g, '') // remove standalone 3-5 digit Strong's numbers e.g. 853
    .replace(/\s+/g, ' ')
    .trim();
}

async function downloadAndProcess(translation) {
  const versionLower = translation.toLowerCase();
  const targetDir = path.join(PUBLIC_DIR, versionLower);
  fs.mkdirSync(targetDir, { recursive: true });

  const url = `https://bolls.life/static/translations/${translation}.json`;
  console.log(`\n📥 Fetching ${translation} from ${url}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${translation}: ${res.status} ${res.statusText}`);
  }

  const allVerses = await res.json();
  console.log(`✅ Received ${allVerses.length} verses for ${translation}. Partitioning by book...`);

  // Group by book ID
  const booksById = new Map();
  for (const item of allVerses) {
    const bookId = item.book;
    if (!booksById.has(bookId)) {
      booksById.set(bookId, []);
    }
    booksById.get(bookId).push(item);
  }

  // Process each canonical book
  let totalSaved = 0;
  for (const bookMeta of CANONICAL_BOOKS) {
    const rawVerses = booksById.get(bookMeta.id) || [];
    
    // Group into chapters
    const chaptersObj = {};
    for (const v of rawVerses) {
      const chKey = String(v.chapter);
      if (!chaptersObj[chKey]) {
        chaptersObj[chKey] = [];
      }
      chaptersObj[chKey].push({
        verse: v.verse,
        text: cleanVerseText(v.text),
      });
    }

    const bookPayload = {
      book: bookMeta.code,
      bookName: bookMeta.name,
      bookNumber: bookMeta.id,
      translation: translation,
      chapters: chaptersObj,
    };

    const outPath = path.join(targetDir, `${bookMeta.code}.json`);
    fs.writeFileSync(outPath, JSON.stringify(bookPayload), 'utf-8');
    totalSaved++;
  }

  console.log(`🎉 Saved ${totalSaved} book JSON files in ${targetDir}`);
}

async function main() {
  console.log('📖 Preparing Bible translation packages for local deployment...');
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const trans of TRANSLATIONS) {
    try {
      await downloadAndProcess(trans);
    } catch (err) {
      console.error(`❌ Error preparing ${trans}:`, err);
      process.exit(1);
    }
  }

  console.log('\n✨ All translations successfully prepared and partitioned into /public/bibles/!');
}

main();
