import { BacklinkNoteItem, BacklinkCanvasItem, BacklinkHighlightItem } from '@/components/bible/ScriptureBacklinksDrawer';
import { NodeCategory } from '@/types/canvas';

interface RawNote {
  id: number;
  title: string;
  content: string;
  updatedAt?: string;
  createdAt?: string;
}

interface RawHighlight {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  color: string;
  text: string;
}

export interface BacklinksResult {
  reference: string;
  notes: BacklinkNoteItem[];
  canvasItems: BacklinkCanvasItem[];
  highlights: BacklinkHighlightItem[];
  totalCount: number;
}

const STORAGE_KEY_BOARDS_LIST = 'theologica_canvas_boards_list_v1';
const STORAGE_KEY_BOARD_PREFIX = 'theologica_canvas_state_';

export function getScriptureBacklinks({
  book,
  chapter,
  verse,
  notes,
  highlights,
}: {
  book: string;
  chapter: number;
  verse?: number;
  notes: RawNote[];
  highlights: RawHighlight[];
}): BacklinksResult {
  const reference = verse ? `${book} ${chapter}:${verse}` : `${book} ${chapter}`;
  const refRegex = verse
    ? new RegExp(`\\b${escapeRegExp(book)}\\s+${chapter}:${verse}\\b`, 'i')
    : new RegExp(`\\b${escapeRegExp(book)}\\s+${chapter}(:\\d+)?\\b`, 'i');

  // 1. Scan Personal Notes
  const matchedNotes: BacklinkNoteItem[] = [];
  if (Array.isArray(notes)) {
    for (const note of notes) {
      const titleMatch = refRegex.test(note.title || '');
      const contentMatch = refRegex.test(note.content || '');
      
      // Also match notes whose title is the exact book chapter (e.g. "John 1")
      const chapterExactTitle = (note.title || '').trim().toLowerCase() === `${book} ${chapter}`.toLowerCase();

      if (titleMatch || contentMatch || chapterExactTitle) {
        const excerpt = extractSnippet(note.content || note.title || '', verse ? `${book} ${chapter}:${verse}` : `${book} ${chapter}`);
        matchedNotes.push({
          id: note.id,
          title: note.title || 'Untitled Study Note',
          excerpt,
          updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  // 2. Scan Highlights
  const matchedHighlights: BacklinkHighlightItem[] = [];
  if (Array.isArray(highlights)) {
    const hlFiltered = highlights.filter(
      (h) =>
        h.book.toLowerCase() === book.toLowerCase() &&
        h.chapter === chapter &&
        (verse === undefined || h.verse === verse)
    );
    for (const hl of hlFiltered) {
      matchedHighlights.push({
        id: hl.id,
        color: hl.color,
        text: hl.text,
      });
    }
  }

  // 3. Scan Local Canvas Boards (Scripture Second Brain)
  const matchedCanvasItems: BacklinkCanvasItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawList = localStorage.getItem(STORAGE_KEY_BOARDS_LIST);
      if (rawList) {
        const boardsList = JSON.parse(rawList);
        if (Array.isArray(boardsList)) {
          for (const b of boardsList) {
            const rawBoard = localStorage.getItem(`${STORAGE_KEY_BOARD_PREFIX}${b.id}`);
            if (!rawBoard) continue;
            const parsedBoard = JSON.parse(rawBoard);
            const nodes = parsedBoard.nodes || [];

            for (const node of nodes) {
              const nodeData = node.data || {};
              const nodeTitle = nodeData.title || nodeData.label || '';
              const nodeContent = nodeData.content || '';
              const nodeRef = nodeData.verseReference || '';

              const refMatch =
                refRegex.test(nodeRef) ||
                refRegex.test(nodeTitle) ||
                refRegex.test(nodeContent);

              if (refMatch) {
                const excerpt = extractSnippet(nodeContent || nodeTitle, reference);
                matchedCanvasItems.push({
                  boardId: b.id,
                  boardTitle: b.title || 'Untitled Board',
                  nodeTitle: nodeTitle || 'Theological Node',
                  category: (nodeData.category as NodeCategory) || 'theological_point',
                  excerpt,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Backlinks: LocalStorage scan error', e);
    }
  }

  const totalCount = matchedNotes.length + matchedCanvasItems.length + matchedHighlights.length;

  return {
    reference,
    notes: matchedNotes,
    canvasItems: matchedCanvasItems,
    highlights: matchedHighlights,
    totalCount,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSnippet(text: string, targetPhrase: string, maxLength = 140): string {
  if (!text) return '';
  const clean = text.replace(/[*#_`>]/g, '').trim();
  const lower = clean.toLowerCase();
  const index = lower.indexOf(targetPhrase.toLowerCase());

  if (index === -1) {
    return clean.length > maxLength ? clean.slice(0, maxLength) + '...' : clean;
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(clean.length, index + targetPhrase.length + 80);
  let snippet = clean.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';
  return snippet;
}
