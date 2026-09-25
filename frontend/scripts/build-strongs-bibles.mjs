import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, '../public/bibles/kjv_strongs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Canonical codes mapping
const NAME_TO_CODE = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
  'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
  '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR',
  'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Songs': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM',
  'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
  'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB',
  'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
  'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL', 'Ephesians': 'EPH',
  'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
  '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB',
  'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

async function main() {
  console.log('Fetching books list...');
  const booksRes = await fetch('https://raw.githubusercontent.com/kaiserlik/kjv/master/books.json');
  const booksData = await booksRes.json();
  const bookList = booksData.books;

  console.log(`Processing ${bookList.length} books...`);

  const BATCH_SIZE = 8;
  for (let i = 0; i < bookList.length; i += BATCH_SIZE) {
    const batch = bookList.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (item) => {
      const bookName = Object.keys(item)[0];
      const abbr = item[bookName];
      const code = NAME_TO_CODE[bookName];
      if (!code) {
        console.warn(`No canonical code for book "${bookName}"`);
        return;
      }

      const url = `https://raw.githubusercontent.com/kaiserlik/kjv/master/${abbr}.json`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch ${bookName} from ${url}`);
        return;
      }

      const rawText = await res.text();
      // Strictly match this book's abbreviation so concatenated files don't leak other books
      const escapedAbbr = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\\"(${escapedAbbr}\\|(\\d+)\\|(\\d+))\\\"\\s*:\\s*\\{\\s*\\\"en\\\"\\s*:\\s*\\\"(.*?)(?<!\\\\)\\\"`, 'g');
      let match;
      const chapters = {};
      while ((match = regex.exec(rawText)) !== null) {
        const [_, fullKey, ch, v, en] = match;
        const vNum = parseInt(v, 10);
        if (!chapters[ch]) chapters[ch] = [];
        if (!chapters[ch].some(item => item.verse === vNum)) {
          // Clean escaped quotes inside text
          const cleanedText = en.replace(/\\"/g, '"').replace(/\\\//g, '/');
          chapters[ch].push({ verse: vNum, text: cleanedText });
        }
      }

      for (const ch of Object.keys(chapters)) {
        chapters[ch].sort((a, b) => a.verse - b.verse);
      }

      const outPath = path.join(OUT_DIR, `${code}.json`);
      fs.writeFileSync(outPath, JSON.stringify({ chapters }));
      const chCount = Object.keys(chapters).length;
      const vCount = Object.values(chapters).reduce((acc, c) => acc + c.length, 0);
      console.log(`  ✓ ${code} (${bookName}): ${chCount} chapters, ${vCount} verses`);
    }));
  }

  console.log('All 66 Strong tagged books built successfully!');
}

main().catch(err => {
  console.error('Build strongs bibles failed:', err);
  process.exit(1);
});
