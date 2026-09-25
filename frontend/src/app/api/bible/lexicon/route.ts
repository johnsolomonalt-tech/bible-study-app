import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface LexiconWordPayload {
  id: string;
  lemma: string;
  transliteration: string;
  strongs: string;
  language: 'Hebrew' | 'Aramaic' | 'Greek';
  partOfSpeech: string;
  pronunciation: string;
  gloss: string;
  derivation: string;
  definition: string;
  outline?: string;
  occurrences: number;
  testament: 'OT' | 'NT';
  keyVerses: string[];
  kjvDef?: string;
}

// In-memory server cache
let HEBREW_DATA: Record<string, any> | null = null;
let GREEK_DATA: Record<string, any> | null = null;
let REVERSE_INDEX: { OT: Record<string, string[]>; NT: Record<string, string[]> } | null = null;

function loadLexiconData() {
  if (HEBREW_DATA && GREEK_DATA && REVERSE_INDEX) return;
  try {
    const dataDir = path.join(process.cwd(), 'public/data/lexicon');
    const hebPath = path.join(dataDir, 'strongs-hebrew.json');
    const grkPath = path.join(dataDir, 'strongs-greek.json');
    const idxPath = path.join(dataDir, 'strongs-reverse-index.json');

    if (fs.existsSync(hebPath)) {
      HEBREW_DATA = JSON.parse(fs.readFileSync(hebPath, 'utf8'));
    }
    if (fs.existsSync(grkPath)) {
      GREEK_DATA = JSON.parse(fs.readFileSync(grkPath, 'utf8'));
    }
    if (fs.existsSync(idxPath)) {
      REVERSE_INDEX = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load server lexicon data:', err);
  }
}

export async function GET(req: NextRequest) {
  loadLexiconData();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id')?.trim().toUpperCase();
  const word = searchParams.get('word')?.trim();
  const testament = searchParams.get('testament')?.toUpperCase() as 'OT' | 'NT' | undefined;
  const verseRef = searchParams.get('verseRef')?.trim();

  // 1. Batch Strong's IDs Lookup (e.g. ?ids=H1,H5862,H3157)
  const idsParam = searchParams.get('ids')?.trim().toUpperCase();
  if (idsParam) {
    const requestedIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const words: Record<string, LexiconWordPayload> = {};
    for (const rawId of requestedIds) {
      let rawEntry: any = null;
      if (rawId.startsWith('H') && HEBREW_DATA) {
        rawEntry = HEBREW_DATA[rawId];
      } else if (rawId.startsWith('G') && GREEK_DATA) {
        rawEntry = GREEK_DATA[rawId];
      }
      if (rawEntry) {
        words[rawId] = {
          ...rawEntry,
          keyVerses: verseRef ? [verseRef] : [],
        };
      }
    }
    return NextResponse.json(
      { success: true, words },
      {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    );
  }

  // 2. Direct Strong's ID Lookup (e.g. H3157 or G3056)
  if (id) {
    let rawEntry: any = null;
    if (id.startsWith('H') && HEBREW_DATA) {
      rawEntry = HEBREW_DATA[id];
    } else if (id.startsWith('G') && GREEK_DATA) {
      rawEntry = GREEK_DATA[id];
    }

    if (rawEntry) {
      const payload: LexiconWordPayload = {
        ...rawEntry,
        keyVerses: verseRef ? [verseRef] : []
      };
      return NextResponse.json({ success: true, word: payload }, {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    return NextResponse.json({ success: false, error: `Strong's ID ${id} not found` }, { status: 404 });
  }

  // 2. English word / lemma reverse lookup
  if (word && REVERSE_INDEX) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    let matchedId: string | undefined;

    if (testament === 'OT') {
      matchedId = REVERSE_INDEX.OT[clean]?.[0] || REVERSE_INDEX.NT[clean]?.[0];
    } else if (testament === 'NT') {
      matchedId = REVERSE_INDEX.NT[clean]?.[0] || REVERSE_INDEX.OT[clean]?.[0];
    } else {
      matchedId = REVERSE_INDEX.OT[clean]?.[0] || REVERSE_INDEX.NT[clean]?.[0];
    }

    if (matchedId) {
      const isHebrew = matchedId.startsWith('H');
      const rawEntry = isHebrew ? HEBREW_DATA?.[matchedId] : GREEK_DATA?.[matchedId];
      if (rawEntry) {
        const payload: LexiconWordPayload = {
          ...rawEntry,
          keyVerses: verseRef ? [verseRef] : []
        };
        return NextResponse.json({ success: true, word: payload }, {
          headers: {
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }
    }

    // Try common stem variations (e.g. strip s, es, ed, ing)
    let stem = clean;
    if (stem.endsWith('ing') && stem.length > 5) stem = stem.slice(0, -3);
    else if (stem.endsWith('ed') && stem.length > 4) stem = stem.slice(0, -2);
    else if (stem.endsWith('es') && stem.length > 4) stem = stem.slice(0, -2);
    else if (stem.endsWith('s') && stem.length > 3 && !stem.endsWith('ss')) stem = stem.slice(0, -1);

    if (stem !== clean) {
      const stemId = testament === 'OT' 
        ? REVERSE_INDEX.OT[stem]?.[0] || REVERSE_INDEX.NT[stem]?.[0]
        : REVERSE_INDEX.NT[stem]?.[0] || REVERSE_INDEX.OT[stem]?.[0];
      if (stemId) {
        const rawEntry = stemId.startsWith('H') ? HEBREW_DATA?.[stemId] : GREEK_DATA?.[stemId];
        if (rawEntry) {
          const payload: LexiconWordPayload = {
            ...rawEntry,
            keyVerses: verseRef ? [verseRef] : []
          };
          return NextResponse.json({ success: true, word: payload }, {
            headers: {
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          });
        }
      }
    }
  }

  return NextResponse.json({ success: false, error: 'Word not found in biblical lexicon' }, { status: 404 });
}
