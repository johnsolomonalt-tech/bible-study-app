import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

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
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`bible_lexicon:${ip}`, {
    windowMs: 60 * 1000,
    maxRequests: 1200,
  });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment before requesting more lexicon entries.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetSeconds) } }
    );
  }

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
    const candidates: string[] = [clean];

    if (clean.endsWith('ed')) {
      candidates.push(clean.slice(0, -1)); // created -> create, loved -> love
      candidates.push(clean.slice(0, -2)); // walked -> walk
    }
    if (clean.endsWith('ing')) {
      candidates.push(clean.slice(0, -3));
      candidates.push(clean.slice(0, -3) + 'e'); // loving -> love, creating -> create
    }
    if (clean.endsWith('eth') || clean.endsWith('est')) {
      candidates.push(clean.slice(0, -3));
      candidates.push(clean.slice(0, -3) + 'e'); // maketh -> make, giveth -> give
    }
    if (clean.endsWith('es')) {
      candidates.push(clean.slice(0, -2)); // churches -> church
      candidates.push(clean.slice(0, -1)); // gives -> give
    } else if (clean.endsWith('s') && !clean.endsWith('ss')) {
      candidates.push(clean.slice(0, -1)); // heavens -> heaven, words -> word
    }

    const irregulars: Record<string, string> = {
      spake: 'speak', dwelt: 'dwell', begat: 'beget', smote: 'smite',
      saw: 'see', went: 'go', came: 'come', said: 'say', knew: 'know',
      stood: 'stand', sent: 'send', gave: 'give', took: 'take',
      found: 'find', made: 'make', built: 'build', heavens: 'heaven',
      brethren: 'brother', children: 'child', men: 'man', women: 'woman',
      feet: 'foot', eyes: 'eye', hearts: 'heart', holy: 'holy',
      righteousness: 'righteous', faith: 'faith', spirit: 'spirit'
    };
    if (irregulars[clean]) {
      candidates.push(irregulars[clean]);
    }

    let matchedId: string | undefined;

    // Search preferred testament first
    for (const c of candidates) {
      if (testament === 'OT' && REVERSE_INDEX.OT[c]?.[0]) {
        matchedId = REVERSE_INDEX.OT[c][0];
        break;
      }
      if (testament === 'NT' && REVERSE_INDEX.NT[c]?.[0]) {
        matchedId = REVERSE_INDEX.NT[c][0];
        break;
      }
    }

    // Fallback to either testament
    if (!matchedId) {
      for (const c of candidates) {
        matchedId = testament === 'OT'
          ? REVERSE_INDEX.OT[c]?.[0] || REVERSE_INDEX.NT[c]?.[0]
          : REVERSE_INDEX.NT[c]?.[0] || REVERSE_INDEX.OT[c]?.[0];
        if (matchedId) break;
      }
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
  }

  return NextResponse.json({ success: false, error: 'Word not found in biblical lexicon' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  loadLexiconData();

  try {
    const body = await req.json();
    const { ids, verseRef } = body;
    if (Array.isArray(ids)) {
      const words: Record<string, LexiconWordPayload> = {};
      for (const rawId of ids) {
        const uId = String(rawId).trim().toUpperCase();
        let rawEntry: any = null;
        if (uId.startsWith('H') && HEBREW_DATA) {
          rawEntry = HEBREW_DATA[uId];
        } else if (uId.startsWith('G') && GREEK_DATA) {
          rawEntry = GREEK_DATA[uId];
        }
        if (rawEntry) {
          words[uId] = {
            ...rawEntry,
            keyVerses: verseRef ? [verseRef] : [],
          };
        }
      }
      return NextResponse.json({ success: true, words });
    }
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
