/**
 * Utility to parse and separate appended translator footnotes from scripture text.
 * 
 * In various translations (notably KJV and APIs like Bolls), translator footnotes
 * (e.g., "[phrase]: Heb. [translation]") are appended to the verse string.
 * This utility extracts the note so the scripture text can be rendered normally,
 * and the note styled distinctly.
 */

export interface ParsedVerseText {
  mainText: string;
  footnote: string | null;
}

// Regex matching appended translator footnotes:
// 1. Preceded by sentence or clause punctuation (.?!:;,))
// 2. Followed by space and the annotated phrase (1-60 chars) followed by colon
// 3. Followed by translator footnote marker (Heb., Gr., Chal., Cald., Chaldee, Lat., or,, that is, some read, also called, etc.)
const FOOTNOTE_REGEX =
  /([.?!:;,)]+)\s+([a-zA-Z0-9\s\x27\u2019\-(),]+?:\s*(?:Heb\.|Gr\.|Chal\.|Cald\.|Chaldee|Lat\.|or,|that is|some read|also called).*)$/i;

/**
 * Parses a raw verse text string into main scripture text and optional translator footnote.
 * 
 * Safely falls back to returning the full plain string with `footnote: null`
 * for any verse that does not contain a translator footnote.
 */
export function parseVerseFootnote(rawText: string): ParsedVerseText {
  if (!rawText || typeof rawText !== 'string') {
    return { mainText: '', footnote: null };
  }

  // 1. Check for explicit HTML sup tag (e.g. from Bolls API before stripping)
  const supMatch = rawText.match(/^(.*?)\s*<sup[^>]*>(.*?)<\/sup>\s*$/i);
  if (supMatch) {
    const main = supMatch[1].trim();
    const note = supMatch[2].replace(/<[^>]*>/g, '').trim();
    if (main && note) {
      return { mainText: main, footnote: note };
    }
  }

  // 2. Extract appended translator footnote in plain text
  const match = rawText.match(FOOTNOTE_REGEX);
  if (match && match.index !== undefined) {
    const punctuation = match[1];
    const footnote = match[2].trim();
    const mainText = (rawText.substring(0, match.index) + punctuation).trim();
    if (mainText && footnote) {
      return { mainText, footnote };
    }
  }

  // Fallback: Plain string with no footnote
  return { mainText: rawText, footnote: null };
}

/**
 * Returns only the main scripture text without translator footnotes.
 * Useful for Text-To-Speech (TTS), search indexing, and plain copying.
 */
export function getCleanScriptureText(rawText: string): string {
  return parseVerseFootnote(rawText).mainText;
}
