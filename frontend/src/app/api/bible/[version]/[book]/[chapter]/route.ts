import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findCanonicalBook } from '@/lib/bibleCanon';
import {
  BibleChapter,
  BibleVerse,
  OPEN_TRANSLATIONS,
  COPYRIGHTED_TRANSLATIONS,
} from '@/types/bible';

const ALL_TRANSLATION_META = [...OPEN_TRANSLATIONS, ...COPYRIGHTED_TRANSLATIONS];

// Mapping of translation IDs to API.Bible Bible IDs (if user sets BIBLE_API_KEY)
const API_BIBLE_MAP: Record<string, string> = {
  esv: '06125adad2d5898a-01', // ESV
  niv: '716077271e422315-01', // NIV
  nasb: 'bba9f40183526463-01', // NASB
  nlt: '06125adad2d5898a-01',
};

// Known open translations supported directly via Bolls Life
const BOLLS_OPEN_VERSIONS: Record<string, string> = {
  asv: 'ASV',
  ylt: 'YLT',
  bbe: 'BBE',
  darby: 'DARBY',
  kjv: 'KJV',
  web: 'WEB',
  bsb: 'BSB',
};

function cleanVerseText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/([a-zA-Z,.;:!?’'"]+)\d+/g, '$1')
    .replace(/\b\d{3,5}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ version: string; book: string; chapter: string }> }
) {
  try {
    const { version, book, chapter } = await params;
    const versionKey = (version || 'bsb').toLowerCase().trim();
    const chapterNum = parseInt(chapter, 10);

    if (isNaN(chapterNum) || chapterNum < 1) {
      return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 });
    }

    const bookMeta = findCanonicalBook(book);
    if (!bookMeta) {
      return NextResponse.json({ error: `Unknown Bible book: ${book}` }, { status: 404 });
    }

    if (chapterNum > bookMeta.chapters) {
      return NextResponse.json(
        { error: `${bookMeta.name} only has ${bookMeta.chapters} chapters.` },
        { status: 400 }
      );
    }

    // 1. Check if it's one of our local packaged translations (BSB, WEB, KJV)
    if (['bsb', 'web', 'kjv'].includes(versionKey)) {
      try {
        const localPath = path.join(
          process.cwd(),
          'public',
          'bibles',
          versionKey,
          `${bookMeta.code}.json`
        );
        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, 'utf-8');
          const data = JSON.parse(raw);
          const verses: BibleVerse[] = data.chapters[String(chapterNum)] || [];

          const transMeta = ALL_TRANSLATION_META.find((t) => t.id.toLowerCase() === versionKey);
          const defaultCopyright = transMeta?.copyrightNotice || '';

          const responsePayload: BibleChapter = {
            book: bookMeta.code,
            bookName: bookMeta.name,
            chapter: chapterNum,
            translation: versionKey.toUpperCase(),
            verses,
            copyright: defaultCopyright,
          };

          return NextResponse.json(responsePayload, {
            headers: {
              'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
            },
          });
        }
      } catch (localErr) {
        console.warn(`Local file read failed for ${versionKey} ${bookMeta.code}, falling back:`, localErr);
      }
    }

    // 2. Dynamic Fallback: Open Translations via Bolls Life
    if (BOLLS_OPEN_VERSIONS[versionKey]) {
      const bollsTranslation = BOLLS_OPEN_VERSIONS[versionKey];
      const bollsUrl = `https://bolls.life/get-chapter/${bollsTranslation}/${bookMeta.number}/${chapterNum}/`;

      const res = await fetch(bollsUrl, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 }, // Next.js fetch cache 24h
      });

      if (!res.ok) {
        throw new Error(`Bolls API error: ${res.status} ${res.statusText}`);
      }

      const bollsData = await res.json();
      if (!Array.isArray(bollsData)) {
        throw new Error('Invalid format returned from Bolls API');
      }

      const verses: BibleVerse[] = bollsData.map((v: any) => ({
        verse: Number(v.verse),
        text: cleanVerseText(v.text),
      }));

      const transMeta = ALL_TRANSLATION_META.find((t) => t.id.toLowerCase() === versionKey);
      const defaultCopyright = transMeta?.copyrightNotice || '';

      const responsePayload: BibleChapter = {
        book: bookMeta.code,
        bookName: bookMeta.name,
        chapter: chapterNum,
        translation: versionKey.toUpperCase(),
        verses,
        copyright: defaultCopyright,
      };

      return NextResponse.json(responsePayload, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    }

    // 3. Dynamic Fallback: Copyrighted translations via API.Bible
    const bibleApiKey = process.env.BIBLE_API_KEY || process.env.API_BIBLE_KEY;
    const bibleId = API_BIBLE_MAP[versionKey];

    if (bibleId) {
      if (!bibleApiKey) {
        return NextResponse.json(
          {
            error: 'BIBLE_API_KEY_REQUIRED',
            message: `Translation '${versionKey.toUpperCase()}' is copyrighted and requires a valid BIBLE_API_KEY environment variable.`,
            translation: versionKey.toUpperCase(),
          },
          { status: 403 }
        );
      }

      // Fetch from API.Bible
      const chapterId = `${bookMeta.code}.${chapterNum}`;
      const apiBibleUrl = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?include-verse-numbers=true&content-type=json`;

      const apiBibleRes = await fetch(apiBibleUrl, {
        headers: {
          'api-key': bibleApiKey,
          Accept: 'application/json',
        },
        next: { revalidate: 86400 },
      });

      if (!apiBibleRes.ok) {
        return NextResponse.json(
          {
            error: `API.Bible returned status ${apiBibleRes.status}`,
            translation: versionKey.toUpperCase(),
          },
          { status: apiBibleRes.status }
        );
      }

      const apiBibleData = await apiBibleRes.json();
      // Extract verse contents from API.Bible JSON AST
      const contentList = apiBibleData.data?.content || [];
      const verses: BibleVerse[] = [];
      let currentVerse = 0;
      let currentText = '';

      function walkAst(nodes: any[]) {
        for (const node of nodes) {
          if (node.name === 'verse') {
            if (currentVerse > 0 && currentText.trim()) {
              verses.push({ verse: currentVerse, text: cleanVerseText(currentText) });
              currentText = '';
            }
            const num = parseInt(node.attrs?.number || '', 10);
            if (!isNaN(num)) currentVerse = num;
          } else if (typeof node.text === 'string') {
            currentText += ' ' + node.text;
          }
          if (Array.isArray(node.items)) {
            walkAst(node.items);
          }
        }
      }

      const transMeta = ALL_TRANSLATION_META.find((t) => t.id.toLowerCase() === versionKey);
      const defaultCopyright = transMeta?.copyrightNotice || '';

      walkAst(contentList);
      if (currentVerse > 0 && currentText.trim()) {
        verses.push({ verse: currentVerse, text: cleanVerseText(currentText) });
      }

      const officialCopyright = apiBibleData.data?.copyright || defaultCopyright;
      const fumsToken = apiBibleData.meta?.fumsToken || undefined;

      const responsePayload: BibleChapter = {
        book: bookMeta.code,
        bookName: bookMeta.name,
        chapter: chapterNum,
        translation: versionKey.toUpperCase(),
        verses: verses.length > 0 ? verses : [{ verse: 1, text: apiBibleData.data?.content || 'Text unavailable.' }],
        copyright: officialCopyright,
        fumsToken,
      };

      return NextResponse.json(responsePayload, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    }

    return NextResponse.json(
      { error: `Translation '${version}' is not supported.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Bible passage lookup API error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve scripture passage', details: err.message },
      { status: 500 }
    );
  }
}
