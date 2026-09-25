import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../public/data/lexicon');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function cleanHtml(s) {
  if (!s) return '';
  return s
    .replace(/&quot;?/g, '"')
    .replace(/&#8212;?/g, '—')
    .replace(/&#39;?/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\{([^\}]+)\}/g, '$1')
    .replace(/\[phrase\]/gi, '')
    .replace(/\[idiom\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTotalOccurrences(occStr) {
  if (!occStr) return 1;
  const matches = [...occStr.matchAll(/(\d+)x/g)];
  if (!matches.length) return 1;
  // Kaiserlik sometimes duplicates list: take max single number or sum first half
  const numbers = matches.map(m => parseInt(m[1], 10));
  return Math.max(...numbers);
}

function getTopOccurrenceWords(occStr) {
  if (!occStr) return [];
  // e.g. "word(218x), saying(50x), account(8x)"
  const parts = occStr.split(',');
  const results = [];
  for (const part of parts) {
    const m = part.match(/([a-zA-Z\s\-]+)\((\d+)x\)/);
    if (m) {
      const term = m[1].trim();
      const count = parseInt(m[2], 10);
      if (term && !results.some(r => r.term.toLowerCase() === term.toLowerCase())) {
        results.push({ term, count });
      }
    }
  }
  return results;
}

function cleanTranslit(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z'\-]/g, '')
    .trim()
    .toLowerCase();
}

async function main() {
  console.log('1. Fetching OpenScriptures and Kaiserlik Strong datasets...');

  const [hebRaw, grkRaw, kLex] = await Promise.all([
    fetch('https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js').then(r => r.text()),
    fetch('https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js').then(r => r.text()),
    fetch('https://raw.githubusercontent.com/kaiserlik/kjv/master/lexicon.json').then(r => r.json())
  ]);

  console.log('Parsing raw dictionaries...');
  const hebData = JSON.parse(hebRaw.slice(hebRaw.indexOf('{'), hebRaw.lastIndexOf('}') + 1));
  const grkData = JSON.parse(grkRaw.slice(grkRaw.indexOf('{'), grkRaw.lastIndexOf('}') + 1));

  const hebrewLexicon = {};
  const greekLexicon = {};

  // 1. Process Hebrew (H1 - H8674)
  console.log('Processing Hebrew entries...');
  for (const [id, os] of Object.entries(hebData)) {
    const k = kLex[id];
    const lemma = os.lemma || k?.Hb_word || '';
    const translit = os.xlit || k?.transliteration || '';
    const pron = os.pron || translit;
    const derivation = cleanHtml(os.derivation || (k?.root_word ? 'Root: ' + k.root_word : ''));
    const strongsDef = cleanHtml(os.strongs_def || '');
    const outline = cleanHtml(k?.outline_usage || '');
    const partOfSpeech = k?.part_of_speech || (derivation.includes('root') ? 'Verb' : 'Noun');
    const totalOccurrences = parseTotalOccurrences(k?.occurrences);
    const topWords = getTopOccurrenceWords(k?.occurrences);
    const kjvDef = cleanHtml(os.kjv_def || '');

    let gloss = topWords[0]?.term || '';
    if (!gloss && kjvDef) {
      gloss = kjvDef.split(/[,;\.]/)[0].replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').trim();
    }
    if (!gloss && strongsDef) {
      gloss = strongsDef.split(/[,;\.]/)[0].trim();
    }
    if (!gloss) gloss = translit;

    const definition = (strongsDef ? strongsDef : outline);

    hebrewLexicon[id] = {
      id,
      lemma,
      transliteration: translit,
      strongs: id,
      language: derivation.includes('(Aramaic)') ? 'Aramaic' : 'Hebrew',
      partOfSpeech,
      pronunciation: pron,
      gloss,
      derivation,
      definition,
      outline: outline && outline !== strongsDef ? outline : '',
      occurrences: totalOccurrences,
      testament: 'OT',
      kjvDef,
      topWords
    };
  }

  // 2. Process Greek (G1 - G5624)
  console.log('Processing Greek entries...');
  for (const [id, os] of Object.entries(grkData)) {
    const k = kLex[id];
    const lemma = os.lemma || k?.Gk_word || '';
    const translit = os.translit || os.xlit || k?.transliteration || '';
    const pron = translit;
    const derivation = cleanHtml(os.derivation || (k?.root_word ? 'Root: ' + k.root_word : ''));
    const strongsDef = cleanHtml(os.strongs_def || '');
    const outline = cleanHtml(k?.outline_usage || '');
    const partOfSpeech = k?.part_of_speech || (derivation.includes('verb') ? 'Verb' : 'Noun');
    const totalOccurrences = parseTotalOccurrences(k?.occurrences);
    const topWords = getTopOccurrenceWords(k?.occurrences);
    const kjvDef = cleanHtml(os.kjv_def || '');

    let gloss = topWords[0]?.term || '';
    if (!gloss && kjvDef) {
      gloss = kjvDef.split(/[,;\.]/)[0].replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').trim();
    }
    if (!gloss && strongsDef) {
      gloss = strongsDef.split(/[,;\.]/)[0].trim();
    }
    if (!gloss) gloss = translit;

    const definition = (strongsDef ? strongsDef : outline);

    greekLexicon[id] = {
      id,
      lemma,
      transliteration: translit,
      strongs: id,
      language: 'Greek',
      partOfSpeech,
      pronunciation: pron,
      gloss,
      derivation,
      definition,
      outline: outline && outline !== strongsDef ? outline : '',
      occurrences: totalOccurrences,
      testament: 'NT',
      kjvDef,
      topWords
    };
  }

  // Build intelligently ranked reverse index
  console.log('Building ranked reverse index...');
  const reverseIndex = {
    OT: {},
    NT: {}
  };

const STOPWORDS = new Set([
  'the', 'and', 'of', 'to', 'in', 'is', 'was', 'were', 'are', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'it', 'its', 'as', 'at', 'by', 'for', 'from', 'with',
  'on', 'not', 'or', 'an', 'a', 'so', 'then', 'there', 'their', 'his', 'her', 'they', 'them',
  'he', 'she', 'we', 'us', 'our', 'you', 'your', 'thy', 'thine', 'thee', 'thou', 'ye',
  'unto', 'upon', 'into', 'out', 'up', 'down', 'also'
]);

  function indexDictionary(lexicon, target) {
    const rawMap = Object.create(null); // word -> Array<{ id: string, priority: number, occurrences: number }>

    function addEntry(word, id, priority, occurrences) {
      if (!word) return;
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      if (clean.length < 2) return;
      if (STOPWORDS.has(clean)) return; // Never map common English grammatical particles to random biblical words!
      if (!rawMap[clean]) rawMap[clean] = [];
      const existing = rawMap[clean].find(e => e.id === id);
      if (!existing) {
        rawMap[clean].push({ id, priority, occurrences });
      } else if (priority > existing.priority) {
        existing.priority = priority;
      }
    }

    for (const [id, entry] of Object.entries(lexicon)) {
      const occ = entry.occurrences || 1;
      const translitClean = cleanTranslit(entry.transliteration);

      // Priority 1: Top occurrence words (e.g. "word" 218x for G3056, "love" 86x for G26)
      if (entry.topWords && entry.topWords.length) {
        entry.topWords.forEach((tw, idx) => {
          const pri = idx === 0 ? 100 : Math.max(80, 95 - idx * 3);
          addEntry(tw.term, id, pri, tw.count || occ);
        });
      }

      // Priority 2: Primary gloss match
      addEntry(entry.gloss, id, 95, occ);

      // Priority 3: Exact transliteration (e.g. "logos", "agape", "shalom", "elohim")
      addEntry(translitClean, id, 90, occ);

      // Priority 4: KJV definition words
      if (entry.kjvDef) {
        const words = entry.kjvDef.split(/[,;\s\(\)\[\]\.\+\-]+/);
        words.forEach((w, idx) => {
          const pri = Math.max(10, 60 - idx * 2);
          addEntry(w, id, pri, occ);
        });
      }

      // Priority 5: Strong's definition key terms
      if (entry.definition) {
        const words = entry.definition.slice(0, 80).split(/[,;\s\(\)\[\]\.\+\-]+/);
        words.forEach(w => addEntry(w, id, 20, occ));
      }
    }

    // Sort entries by priority DESC, then occurrences DESC
    for (const [word, list] of Object.entries(rawMap)) {
      list.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.occurrences - a.occurrences;
      });
      // Keep top 6 IDs for each word
      target[word] = list.slice(0, 6).map(e => e.id);
    }
  }

  indexDictionary(hebrewLexicon, reverseIndex.OT);
  indexDictionary(greekLexicon, reverseIndex.NT);

  // Write outputs
  const hebrewPath = path.join(DATA_DIR, 'strongs-hebrew.json');
  const greekPath = path.join(DATA_DIR, 'strongs-greek.json');
  const indexPath = path.join(DATA_DIR, 'strongs-reverse-index.json');

  console.log('Writing strongs-hebrew.json...');
  fs.writeFileSync(hebrewPath, JSON.stringify(hebrewLexicon));

  console.log('Writing strongs-greek.json...');
  fs.writeFileSync(greekPath, JSON.stringify(greekLexicon));

  console.log('Writing strongs-reverse-index.json...');
  fs.writeFileSync(indexPath, JSON.stringify(reverseIndex));

  console.log(`Success!
Hebrew entries: ${Object.keys(hebrewLexicon).length}
Greek entries: ${Object.keys(greekLexicon).length}
Reverse index OT: ${Object.keys(reverseIndex.OT).length} words
Reverse index NT: ${Object.keys(reverseIndex.NT).length} words
`);

  // Verification checks
  console.log('Verification checks:');
  console.log('  jezreel OT ->', reverseIndex.OT['jezreel'], hebrewLexicon[reverseIndex.OT['jezreel']?.[0]]?.lemma);
  console.log('  beginning OT ->', reverseIndex.OT['beginning'], hebrewLexicon[reverseIndex.OT['beginning']?.[0]]?.lemma);
  console.log('  beginning NT ->', reverseIndex.NT['beginning'], greekLexicon[reverseIndex.NT['beginning']?.[0]]?.lemma);
  console.log('  word NT ->', reverseIndex.NT['word'], greekLexicon[reverseIndex.NT['word']?.[0]]?.lemma, greekLexicon[reverseIndex.NT['word']?.[0]]?.transliteration);
  console.log('  logos NT ->', reverseIndex.NT['logos'], greekLexicon[reverseIndex.NT['logos']?.[0]]?.lemma);
  console.log('  god OT ->', reverseIndex.OT['god'], hebrewLexicon[reverseIndex.OT['god']?.[0]]?.lemma);
  console.log('  god NT ->', reverseIndex.NT['god'], greekLexicon[reverseIndex.NT['god']?.[0]]?.lemma);
  console.log('  love NT ->', reverseIndex.NT['love'], greekLexicon[reverseIndex.NT['love']?.[0]]?.lemma);
}

main().catch(err => {
  console.error('Build lexicon failed:', err);
  process.exit(1);
});
