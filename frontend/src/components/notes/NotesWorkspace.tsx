"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  ChevronLeft, 
  BookOpen, 
  FileText, 
  LayoutTemplate, 
  Link2,
  Hash,
  ExternalLink,
  MoreVertical, 
  Download, 
  Copy, 
  Check, 
  Tag, 
  ArrowUpDown, 
  FilePlus,
  X,
  Clock,
  Highlighter,
  Lightbulb
} from 'lucide-react';
import { NoteFormattingToolbar, NoteViewMode } from './NoteFormattingToolbar';
import { NoteMarkdownRenderer } from './NoteMarkdownRenderer';
import { NoteTemplatesModal } from './NoteTemplatesModal';
import { InsertVerseModal } from './InsertVerseModal';
import { VersePreviewPopup } from './VersePreviewPopup';
import { NoteAiAssistantModal } from './NoteAiAssistantModal';
import { NotesTutorialModal } from './NotesTutorialModal';
import { NoteTemplate, NOTE_TEMPLATES } from './noteTemplates';
import { BIBLE_VERSE_REGEX, CANONICAL_BOOKS } from '@/lib/bibleReferences';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface NoteItem {
  id: number;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScriptureBacklinkGroup {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  notes: {
    note: NoteItem;
    snippet: string;
  }[];
}

export const DIVERSE_SUGGESTED_TAGS: { category: string; tags: string[] }[] = [
  {
    category: 'Theology & Doctrine',
    tags: ['theology', 'christology', 'pneumatology', 'soteriology', 'covenant', 'grace', 'justification', 'sanctification', 'trinity', 'eschatology']
  },
  {
    category: 'Bible Study & Exegesis',
    tags: ['exegesis', 'hermeneutics', 'inductive', 'soap', 'crossreference', 'greek', 'hebrew', 'prophecy', 'parables', 'wisdom']
  },
  {
    category: 'Devotional & Spiritual Life',
    tags: ['devotional', 'prayer', 'worship', 'fasting', 'journal', 'reflection', 'application', 'gratitude']
  },
  {
    category: 'Ministry & Teaching',
    tags: ['sermon', 'teaching', 'discipleship', 'leadership', 'evangelism', 'apologetics', 'counseling']
  },
  {
    category: 'Sources & AI Insights',
    tags: ['aichat', 'studyai', 'commentary', 'readingplan', 'patristic', 'reformation']
  }
];

export interface HighlightItem {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  color: string;
}

interface NotesWorkspaceProps {
  notes: NoteItem[];
  activeNoteId: number | null;
  onSelectNote: (id: number | null) => void;
  onCreateNote: (initialData?: { title: string; content: string }) => Promise<NoteItem | null>;
  onUpdateNote: (id: number, title: string, content: string) => void;
  onDeleteNote: (id: number) => void;
  onNavigateToVerse: (book: string, chapter: number, verse: number) => void;
  theologicalLens?: string;
  currentTranslation?: string;
  theme?: 'dark' | 'light';
  highlights?: HighlightItem[];
  onSendHighlightToCanvas?: (hl: { book: string; chapter: number; verse: number; text: string }) => void;
}

const PINNED_STORAGE_KEY = 'theologica_pinned_notes';

function extractTags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g);
  if (!matches) return [];
  const tags = matches.map(m => m.trim().toLowerCase());
  return Array.from(new Set(tags));
}

function extractScriptureReferences(text: string): { book: string; chapter: number; verse: number; raw: string }[] {
  if (!text) return [];
  const results: { book: string; chapter: number; verse: number; raw: string }[] = [];
  const seen = new Set<string>();

  BIBLE_VERSE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BIBLE_VERSE_REGEX.exec(text)) !== null) {
    const raw = match[0];
    const rawBook = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    const canonical = CANONICAL_BOOKS[rawBook];
    if (canonical && !isNaN(chapter) && !isNaN(verse)) {
      const key = `${canonical.name} ${chapter}:${verse}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ book: canonical.name, chapter, verse, raw });
      }
    }
  }
  return results.slice(0, 10);
}

function extractAllScriptureReferences(text: string): { book: string; chapter: number; verse: number; raw: string }[] {
  if (!text) return [];
  const results: { book: string; chapter: number; verse: number; raw: string }[] = [];
  const seen = new Set<string>();

  BIBLE_VERSE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BIBLE_VERSE_REGEX.exec(text)) !== null) {
    const raw = match[0];
    const rawBook = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    const canonical = CANONICAL_BOOKS[rawBook];
    if (canonical && !isNaN(chapter) && !isNaN(verse)) {
      const key = `${canonical.name} ${chapter}:${verse}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ book: canonical.name, chapter, verse, raw });
      }
    }
  }
  return results;
}

function extractSnippet(content: string, term: string, maxLength = 110): string {
  if (!content) return '';
  const clean = content.replace(/[#*`_>\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const termLower = term.toLowerCase();
  const idx = lower.indexOf(termLower);
  if (idx === -1) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(clean.length, idx + term.length + 70);
  const snippet = clean.slice(start, end);
  return (start > 0 ? '...' : '') + snippet.trim() + (end < clean.length ? '...' : '');
}

function getAllScriptureBacklinkGroups(notes: NoteItem[]): ScriptureBacklinkGroup[] {
  const groupsMap = new Map<string, ScriptureBacklinkGroup>();

  for (const note of notes) {
    const fullText = `${note.title || ''}\n${note.content || ''}`;
    const refs = extractAllScriptureReferences(fullText);

    for (const ref of refs) {
      const key = `${ref.book} ${ref.chapter}:${ref.verse}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          reference: key,
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
          notes: []
        });
      }
      const group = groupsMap.get(key)!;
      if (!group.notes.some(n => n.note.id === note.id)) {
        group.notes.push({
          note,
          snippet: extractSnippet(note.content || note.title || '', key)
        });
      }
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => {
    return a.reference.localeCompare(b.reference);
  });
}

function formatRelativeTime(dateStr?: string | Date): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotesWorkspace({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onNavigateToVerse,
  theologicalLens = 'standard',
  currentTranslation = 'bsb',
  highlights = [],
  onSendHighlightToCanvas,
}: NotesWorkspaceProps) {
  // Sidebar UI state
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'highlights' | 'backlinks' | 'templates'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightsSearchQuery, setHighlightsSearchQuery] = useState('');
  const [backlinksSearchQuery, setBacklinksSearchQuery] = useState('');
  const [templatesSearchQuery, setTemplatesSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTemplateBadge, setSelectedTemplateBadge] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(PINNED_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Editor UI state
  const [viewMode, setViewMode] = useState<NoteViewMode>('edit');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Modals state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isInsertVerseOpen, setIsInsertVerseOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [previewVerse, setPreviewVerse] = useState<{ book: string; chapter: number; verse: number; raw?: string } | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Tab Bar scroll, button refs, and cutoff states
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const notesTabBtnRef = useRef<HTMLButtonElement | null>(null);
  const highlightsTabBtnRef = useRef<HTMLButtonElement | null>(null);
  const backlinksTabBtnRef = useRef<HTMLButtonElement | null>(null);
  const templatesTabBtnRef = useRef<HTMLButtonElement | null>(null);
  const [tabsCanScrollLeft, setTabsCanScrollLeft] = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mobile swipe gestures
  const noteSwipeStartXRef = useRef<number | null>(null);
  const noteSwipeStartYRef = useRef<number | null>(null);

  const handleNoteTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      noteSwipeStartXRef.current = e.touches[0].clientX;
      noteSwipeStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleNoteTouchEnd = (e: React.TouchEvent) => {
    if (noteSwipeStartXRef.current === null || noteSwipeStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - noteSwipeStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - noteSwipeStartYRef.current;

    // Swiping left-to-right (from left edge towards right) goes back to notes list on mobile
    if (deltaX > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && noteSwipeStartXRef.current < 80) {
      handleSelectNote(null);
    }
    noteSwipeStartXRef.current = null;
    noteSwipeStartYRef.current = null;
  };

  const togglePin = (id: number) => {
    const updated = pinnedIds.includes(id)
      ? pinnedIds.filter(x => x !== id)
      : [...pinnedIds, id];
    setPinnedIds(updated);
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Find active note
  const activeNote = notes.find(n => n.id === activeNoteId);

  // Local draft state for zero-latency typing and debounced parent saving
  const [draftTitle, setDraftTitle] = useState(activeNote?.title || '');
  const [draftContent, setDraftContent] = useState(activeNote?.content || '');
  const draftTitleRef = useRef(activeNote?.title || '');
  const draftContentRef = useRef(activeNote?.content || '');
  const lastSyncedNoteIdRef = useRef<number | null>(activeNoteId);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set of note IDs that were newly created as blank notes in this session and haven't had content typed
  const newlyCreatedBlankNoteIdsRef = useRef<Set<number>>(new Set());
  const activeNoteRef = useRef<NoteItem | undefined>(activeNote);
  const notesRef = useRef<NoteItem[]>(notes);

  // Keep refs up-to-date in an effect, avoiding render-phase ref mutations
  useEffect(() => {
    activeNoteRef.current = activeNote;
    notesRef.current = notes;
  });

  // Sync draft state with incoming active note or prop changes
  useEffect(() => {
    if (activeNoteId !== lastSyncedNoteIdRef.current) {
      if (debounceTimerRef.current && lastSyncedNoteIdRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        onUpdateNote(lastSyncedNoteIdRef.current, draftTitleRef.current, draftContentRef.current);
      }
      lastSyncedNoteIdRef.current = activeNoteId;
      const initialTitle = activeNote?.title || '';
      const initialContent = activeNote?.content || '';
      setDraftTitle(initialTitle);
      setDraftContent(initialContent);
      draftTitleRef.current = initialTitle;
      draftContentRef.current = initialContent;
    } else if (activeNote && !debounceTimerRef.current) {
      if (activeNote.title !== draftTitleRef.current || activeNote.content !== draftContentRef.current) {
        setDraftTitle(activeNote.title);
        setDraftContent(activeNote.content);
        draftTitleRef.current = activeNote.title;
        draftContentRef.current = activeNote.content;
      }
    }
  }, [activeNoteId, activeNote, onUpdateNote]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current && activeNoteRef.current) {
        clearTimeout(debounceTimerRef.current);
        onUpdateNote(activeNoteRef.current.id, draftTitleRef.current, draftContentRef.current);
      }
    };
  }, [onUpdateNote]);

  const updateNoteImmediately = useCallback((newTitle: string, newContent: string) => {
    if (!activeNoteRef.current) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setDraftTitle(newTitle);
    setDraftContent(newContent);
    draftTitleRef.current = newTitle;
    draftContentRef.current = newContent;
    newlyCreatedBlankNoteIdsRef.current.delete(activeNoteRef.current.id);
    onUpdateNote(activeNoteRef.current.id, newTitle, newContent);
  }, [onUpdateNote]);

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!activeNoteRef.current) return;
    const currentId = activeNoteRef.current.id;
    setDraftTitle(newTitle);
    draftTitleRef.current = newTitle;
    newlyCreatedBlankNoteIdsRef.current.delete(currentId);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onUpdateNote(currentId, newTitle, draftContentRef.current);
      debounceTimerRef.current = null;
    }, 300);
  }, [onUpdateNote]);

  const handleContentChange = useCallback((newContent: string) => {
    if (!activeNoteRef.current) return;
    const currentId = activeNoteRef.current.id;
    setDraftContent(newContent);
    draftContentRef.current = newContent;
    newlyCreatedBlankNoteIdsRef.current.delete(currentId);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onUpdateNote(currentId, draftTitleRef.current, newContent);
      debounceTimerRef.current = null;
    }, 300);
  }, [onUpdateNote]);

  const handleBlurFlush = useCallback(() => {
    if (debounceTimerRef.current && activeNoteRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      onUpdateNote(activeNoteRef.current.id, draftTitleRef.current, draftContentRef.current);
    }
  }, [onUpdateNote]);

  // Helper: check if a note has nothing typed on it (empty content and empty/placeholder title)
  const isUntouchedBlankNote = useCallback((note: NoteItem | undefined): boolean => {
    if (!note) return false;
    const rawContent = note.id === activeNoteRef.current?.id ? draftContentRef.current : note.content;
    const rawTitle = note.id === activeNoteRef.current?.id ? draftTitleRef.current : note.title;
    const isContentEmpty = !rawContent || rawContent.trim() === '';
    const trimmedTitle = (rawTitle || '').trim().toLowerCase();
    const isTitleDefaultOrEmpty = 
      !trimmedTitle || 
      trimmedTitle === 'new study note' || 
      trimmedTitle === 'new note' || 
      trimmedTitle === 'untitled note' ||
      trimmedTitle === 'untitled';
    return isContentEmpty && isTitleDefaultOrEmpty;
  }, []);

  // Check and auto-delete if a note is newly created and nothing was typed on it
  const checkAndAutoDeleteBlankNote = useCallback((noteIdToCheck?: number | null) => {
    const id = noteIdToCheck !== undefined ? noteIdToCheck : activeNoteRef.current?.id;
    if (!id) return;

    if (newlyCreatedBlankNoteIdsRef.current.has(id)) {
      const targetNote = notesRef.current.find(n => n.id === id);
      if (targetNote && isUntouchedBlankNote(targetNote)) {
        newlyCreatedBlankNoteIdsRef.current.delete(id);
        onDeleteNote(id);
      }
    }
  }, [isUntouchedBlankNote, onDeleteNote]);

  // Wrapper for selecting a note: cleans up any untouched newly created blank note when switching away
  const handleSelectNote = useCallback((newId: number | null) => {
    if (debounceTimerRef.current && activeNoteRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      onUpdateNote(activeNoteRef.current.id, draftTitleRef.current, draftContentRef.current);
    }
    const currentActiveId = activeNoteRef.current?.id;
    if (currentActiveId && currentActiveId !== newId) {
      checkAndAutoDeleteBlankNote(currentActiveId);
    }
    onSelectNote(newId);
  }, [checkAndAutoDeleteBlankNote, onSelectNote, onUpdateNote]);

  // Auto-delete untouched blank note on unmount (e.g. user switched away from Notes tab)
  useEffect(() => {
    const blankIds = newlyCreatedBlankNoteIdsRef.current;
    return () => {
      const activeId = activeNoteRef.current?.id;
      if (activeId && blankIds.has(activeId)) {
        const target = notesRef.current.find(n => n.id === activeId);
        if (target && isUntouchedBlankNote(target)) {
          onDeleteNote(activeId);
        }
      }
    };
  }, [isUntouchedBlankNote, onDeleteNote]);

  // Also handle window/tab unload (refresh, close tab)
  useEffect(() => {
    const blankIds = newlyCreatedBlankNoteIdsRef.current;
    const handleBeforeUnload = () => {
      const activeId = activeNoteRef.current?.id;
      if (activeId && blankIds.has(activeId)) {
        const target = notesRef.current.find(n => n.id === activeId);
        if (target && isUntouchedBlankNote(target)) {
          fetch(`/api/notes/${activeId}`, {
            method: 'DELETE',
            keepalive: true,
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUntouchedBlankNote]);

  // Extract all unique tags across all notes
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      const tags = extractTags(`${note.title} ${note.content}`);
      tags.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n => 
        (n.title || '').toLowerCase().includes(q) || 
        (n.content || '').toLowerCase().includes(q)
      );
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter(n => {
        const noteTags = extractTags(`${n.title} ${n.content}`);
        return noteTags.includes(selectedTag);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
      }
      if (sortBy === 'created') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      // 'updated' default
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return result;
  }, [notes, searchQuery, selectedTag, sortBy]);

  // Separate pinned and unpinned notes
  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter(n => pinnedIds.includes(n.id));
  }, [filteredNotes, pinnedIds]);

  const regularNotes = useMemo(() => {
    return filteredNotes.filter(n => !pinnedIds.includes(n.id));
  }, [filteredNotes, pinnedIds]);

  // Statistics for active note
  const noteStats = useMemo(() => {
    if (!activeNote) return { words: 0, chars: 0, readingTime: '0 min' };
    const text = draftContent.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      chars,
      readingTime: `${minutes} min read`,
    };
  }, [activeNote, draftContent]);

  // Detected Scripture references in active note
  const detectedReferences = useMemo(() => {
    if (!activeNote) return [];
    return extractScriptureReferences(`${draftTitle}\n${draftContent}`);
  }, [activeNote, draftTitle, draftContent]);

  // Detected Tags in active note
  const activeNoteTags = useMemo(() => {
    if (!activeNote) return [];
    return extractTags(`${draftTitle} ${draftContent}`);
  }, [activeNote, draftTitle, draftContent]);

  // All backlinks grouped by scripture passage across all notes
  const allBacklinksGroups = useMemo(() => {
    return getAllScriptureBacklinkGroups(notes);
  }, [notes]);

  // Filtered backlinks based on search
  const filteredBacklinksGroups = useMemo(() => {
    if (!backlinksSearchQuery.trim()) return allBacklinksGroups;
    const q = backlinksSearchQuery.toLowerCase().trim();
    return allBacklinksGroups.filter(group => {
      const matchRef = group.reference.toLowerCase().includes(q) || group.book.toLowerCase().includes(q);
      const matchNote = group.notes.some(n => 
        (n.note.title || '').toLowerCase().includes(q) || 
        n.snippet.toLowerCase().includes(q)
      );
      return matchRef || matchNote;
    });
  }, [allBacklinksGroups, backlinksSearchQuery]);

  // References in the current active note for contextual backlink connections
  const activeNoteBacklinks = useMemo(() => {
    if (!activeNote) return [];
    const activeRefs = extractAllScriptureReferences(`${draftTitle || ''}\n${draftContent || ''}`);
    const activeKeys = new Set(activeRefs.map(r => `${r.book} ${r.chapter}:${r.verse}`));
    return allBacklinksGroups.filter(g => activeKeys.has(g.reference));
  }, [activeNote, draftTitle, draftContent, allBacklinksGroups]);

  // Filtered highlights based on search query
  const filteredHighlights = useMemo(() => {
    if (!highlights || highlights.length === 0) return [];
    if (!highlightsSearchQuery.trim()) return highlights;
    const q = highlightsSearchQuery.toLowerCase().trim();
    return highlights.filter(h =>
      h.book.toLowerCase().includes(q) ||
      `${h.book} ${h.chapter}:${h.verse}`.toLowerCase().includes(q) ||
      h.text.toLowerCase().includes(q)
    );
  }, [highlights, highlightsSearchQuery]);

  // Unique template category badges
  const allTemplateBadges = useMemo(() => {
    return Array.from(new Set(NOTE_TEMPLATES.map(t => t.badge)));
  }, []);

  // Filtered Templates based on templates search query & selected category
  const filteredTemplates = useMemo(() => {
    return NOTE_TEMPLATES.filter(t => {
      if (selectedTemplateBadge && t.badge.toLowerCase() !== selectedTemplateBadge.toLowerCase()) {
        return false;
      }
      if (!templatesSearchQuery.trim()) return true;
      const q = templatesSearchQuery.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) || 
        t.badge.toLowerCase().includes(q)
      );
    });
  }, [templatesSearchQuery, selectedTemplateBadge]);

  // Horizontal slider wheel handler:
  // - Trackpad / Magic Mouse / side swipe: native horizontal scroll (intuitive)
  // - Standard mouse wheel: scroll down goes right, scroll up goes left
  // Scrolling strictly scrolls the slider container and NEVER swaps tabs.
  const handleHorizontalWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaY) > 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, []);

  // Check overflow bounds to toggle left/right smooth fade edges
  const checkTabsScroll = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
    setTabsCanScrollLeft(canLeft);
    setTabsCanScrollRight(canRight);
  }, []);

  // Smoothly center or bring the given tab button into view within the pill container
  const scrollTabIntoView = useCallback((btn: HTMLElement | null) => {
    const container = tabsScrollRef.current;
    if (!container || !btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    if (btnRect.left < containerRect.left) {
      const diff = containerRect.left - btnRect.left + 4;
      container.scrollTo({ left: Math.max(0, container.scrollLeft - diff), behavior: 'smooth' });
    } else if (btnRect.right > containerRect.right) {
      const diff = btnRect.right - containerRect.right + 4;
      container.scrollTo({ left: container.scrollLeft + diff, behavior: 'smooth' });
    }
  }, []);

  // Attach non-passive wheel event listener and resize observer to the tab bar
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    checkTabsScroll();

    const onWheel = (e: WheelEvent) => {
      // Magic Mouse / Trackpad horizontal swipe: allow native horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }
      // Standard mouse wheel up/down:
      // Wheel DOWN -> scroll right (reveals Backlinks / Templates)
      // Wheel UP -> scroll left (reveals Notes)
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkTabsScroll();
      }
    };

    const onScroll = () => {
      checkTabsScroll();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkTabsScroll();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [checkTabsScroll]);

  // Center active tab when sidebarTab changes
  useEffect(() => {
    let targetBtn: HTMLButtonElement | null = null;
    if (sidebarTab === 'notes') targetBtn = notesTabBtnRef.current;
    else if (sidebarTab === 'highlights') targetBtn = highlightsTabBtnRef.current;
    else if (sidebarTab === 'backlinks') targetBtn = backlinksTabBtnRef.current;
    else if (sidebarTab === 'templates') targetBtn = templatesTabBtnRef.current;

    if (targetBtn) {
      scrollTabIntoView(targetBtn);
    }
    const timeout = setTimeout(() => {
      checkTabsScroll();
    }, 250);
    return () => clearTimeout(timeout);
  }, [sidebarTab, scrollTabIntoView, checkTabsScroll]);

  // Tag Management Handlers
  const handleAddTag = (tagToAdd: string) => {
    if (!activeNote) return;
    const cleanTag = tagToAdd.trim().replace(/^#+/, '').toLowerCase();
    if (!cleanTag) return;
    const currentTags = extractTags(`${draftTitle} ${draftContent}`);
    if (currentTags.includes(cleanTag)) return;

    const newContent = draftContent.trim()
      ? `${draftContent.trim()}\n\n#${cleanTag}`
      : `#${cleanTag}`;
    updateNoteImmediately(draftTitle, newContent);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    const cleanTag = tagToRemove.trim().replace(/^#+/, '').toLowerCase();
    const tagRegex = new RegExp(`(?:^|\\s)#${cleanTag}\\b`, 'gi');
    const updatedContent = draftContent.replace(tagRegex, '').replace(/\n{3,}/g, '\n\n').trim();
    const updatedTitle = draftTitle.replace(tagRegex, '').trim();
    updateNoteImmediately(updatedTitle || 'Untitled Note', updatedContent);
  };

  // Handlers
  const handleCreateBlankNote = async () => {
    // If the currently open note was newly created and nothing was typed on it, delete it first
    if (activeNoteRef.current?.id) {
      checkAndAutoDeleteBlankNote(activeNoteRef.current.id);
    }
    const created = await onCreateNote({
      title: 'New Study Note',
      content: '',
    });
    if (created) {
      newlyCreatedBlankNoteIdsRef.current.add(created.id);
      handleSelectNote(created.id);
    }
  };

  const handleApplyTemplate = async (template: NoteTemplate, mode: 'create' | 'replace' | 'append') => {
    const todayStr = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date());
    const templatedContent = template.content(todayStr);

    if (mode === 'create' || !activeNote) {
      if (activeNoteRef.current?.id) {
        checkAndAutoDeleteBlankNote(activeNoteRef.current.id);
      }
      const created = await onCreateNote({
        title: template.name,
        content: templatedContent,
      });
      if (created) handleSelectNote(created.id);
    } else if (mode === 'replace') {
      updateNoteImmediately(template.name, templatedContent);
    } else {
      // Append
      const newContent = draftContent
        ? `${draftContent}\n\n---\n\n${templatedContent}`
        : templatedContent;
      updateNoteImmediately(draftTitle, newContent);
    }
  };

  const handleInsertVerseText = (verseMarkdown: string) => {
    if (!activeNote) return;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = draftContent;
      const updated = current.substring(0, start) + verseMarkdown + current.substring(end);
      updateNoteImmediately(draftTitle, updated);
      setTimeout(() => {
        textarea.focus();
        const nextPos = start + verseMarkdown.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      const updated = draftContent ? `${draftContent}\n${verseMarkdown}` : verseMarkdown;
      updateNoteImmediately(draftTitle, updated);
    }
  };

  const handleAppendAiText = (aiContent: string) => {
    if (!activeNote) return;
    const updated = draftContent ? `${draftContent}${aiContent}` : aiContent;
    updateNoteImmediately(draftTitle, updated);
  };

  const handleToggleCheckbox = (itemIndex: number) => {
    if (!activeNote) return;
    let count = 0;
    const updated = draftContent.replace(/- \[( |x|X)\]/g, (match, checkState) => {
      if (count === itemIndex) {
        count++;
        return checkState === ' ' ? '- [x]' : '- [ ]';
      }
      count++;
      return match;
    });
    updateNoteImmediately(draftTitle, updated);
  };

  const handleExport = (format: 'md' | 'txt' | 'pdf') => {
    if (!activeNote) return;
    const title = draftTitle || 'Untitled Note';
    const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const escapedContent = (draftContent || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>${escapedTitle}</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  margin: 0;
                  padding: 48px;
                  color: #18181b;
                  line-height: 1.7;
                  max-width: 800px;
                  margin: 0 auto;
                }
                h1 {
                  font-size: 26px;
                  font-weight: 700;
                  color: #c96442;
                  border-bottom: 2px solid #e4e4e7;
                  padding-bottom: 12px;
                  margin-top: 0;
                  margin-bottom: 24px;
                }
                .content {
                  font-size: 15px;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                }
                @media print {
                  body { padding: 20px; }
                }
              </style>
            </head>
            <body>
              <h1>${escapedTitle}</h1>
              <div class="content">${escapedContent}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
      setIsActionsMenuOpen(false);
      return;
    }
    const filename = `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.${format}`;
    const blob = new Blob([draftContent], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsActionsMenuOpen(false);
  };

  const handleCopyNote = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(`${draftTitle}\n\n${draftContent}`);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
    setIsActionsMenuOpen(false);
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    if (activeNoteRef.current?.id) {
      checkAndAutoDeleteBlankNote(activeNoteRef.current.id);
    }
    const duplicated = await onCreateNote({
      title: `${draftTitle} (Copy)`,
      content: draftContent,
    });
    if (duplicated) handleSelectNote(duplicated.id);
    setIsActionsMenuOpen(false);
  };

  return (
    <div className="flex w-full h-full bg-bg relative overflow-hidden select-text p-0 lg:p-2.5 gap-0 lg:gap-2.5">
      {/* SIDEBAR: Notebooks & Notes List (Option 5) */}
      <aside 
        className={`w-full lg:w-[320px] rounded-none lg:rounded-2xl border-0 lg:border border-border/80 bg-bg lg:bg-surface/15 flex flex-col shrink-0 h-full min-h-0 overflow-hidden lg:shadow-xs transition-all ${
          activeNoteId ? 'hidden lg:flex' : 'flex animate-in slide-in-from-left duration-300 ease-out'
        }`}
      >
        {/* Sidebar Header with Notes vs Backlinks vs Templates Tabs */}
        <header className="min-h-[48px] lg:min-h-[56px] border-b border-border/70 flex items-center justify-between px-3 sm:px-4 shrink-0 bg-surface/25 backdrop-blur-sm gap-2 py-1.5 lg:py-0">
          {/* Tabs Segmented Control Pill Container (Always intact rounded corners, smooth edge fade) */}
          <div className="relative flex-1 min-w-0 flex items-center bg-surface/80 rounded-xl border border-border/60 p-0.5 overflow-hidden shadow-2xs">
            {/* Left fade gradient for smooth cutoff */}
            {tabsCanScrollLeft && (
              <div 
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-7 bg-gradient-to-r from-surface via-surface/70 to-transparent rounded-l-xl z-10 transition-opacity duration-200" 
                aria-hidden="true"
              />
            )}

            {/* Inner scrollable tabs track */}
            <div
              ref={tabsScrollRef}
              onWheel={handleHorizontalWheel}
              className="w-full flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
            >
              <button
                ref={notesTabBtnRef}
                type="button"
                onClick={() => setSidebarTab('notes')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  sidebarTab === 'notes'
                    ? 'bg-bg text-fg shadow-2xs ring-1 ring-border/80'
                    : 'text-muted hover:text-fg hover:bg-surface/50'
                }`}
                title="Personal Notes"
              >
                <FileText size={12.5} className={sidebarTab === 'notes' ? 'text-accent' : ''} />
                <span>Notes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface text-muted font-normal">
                  {notes.length}
                </span>
              </button>
              <button
                ref={highlightsTabBtnRef}
                type="button"
                onClick={() => setSidebarTab('highlights')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  sidebarTab === 'highlights'
                    ? 'bg-bg text-accent shadow-2xs ring-1 ring-border/80'
                    : 'text-muted hover:text-fg hover:bg-surface/50'
                }`}
                title="Saved Highlights"
              >
                <Highlighter size={12.5} className={sidebarTab === 'highlights' ? 'text-accent' : ''} />
                <span>Highlights</span>
                {highlights.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-medium">
                    {highlights.length}
                  </span>
                )}
              </button>
              <button
                ref={backlinksTabBtnRef}
                type="button"
                onClick={() => setSidebarTab('backlinks')}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  sidebarTab === 'backlinks'
                    ? 'bg-bg text-accent shadow-2xs ring-1 ring-border/80'
                    : 'text-muted hover:text-fg hover:bg-surface/50'
                }`}
                title="Scripture Backlinks"
              >
                <Link2 size={12.5} />
                <span>Backlinks</span>
                {allBacklinksGroups.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-medium">
                    {allBacklinksGroups.length}
                  </span>
                )}
              </button>
              <button
                ref={templatesTabBtnRef}
                type="button"
                onClick={() => setSidebarTab('templates')}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  sidebarTab === 'templates'
                    ? 'bg-bg text-accent shadow-2xs ring-1 ring-border/80'
                    : 'text-muted hover:text-fg hover:bg-surface/50'
                }`}
                title="Study Templates"
              >
                <LayoutTemplate size={12.5} className={sidebarTab === 'templates' ? 'text-accent' : ''} />
                <span>Templates</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-medium">
                  {NOTE_TEMPLATES.length}
                </span>
              </button>
            </div>

            {/* Right fade gradient for smooth cutoff */}
            {tabsCanScrollRight && (
              <div 
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-surface via-surface/70 to-transparent rounded-r-xl z-10 transition-opacity duration-200" 
                aria-hidden="true"
              />
            )}
          </div>

          {/* Quick Action: New Blank Note */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCreateBlankNote}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-muted hover:text-fg hover:bg-surface border border-border/60 hover:border-border rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="New Blank Note"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>

        {/* Active Tab Content Panel */}
        <div className="flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border/70 bg-surface/20 overflow-hidden shadow-2xs">
            {sidebarTab === 'notes' && renderNotesPanelContent()}
            {sidebarTab === 'highlights' && renderHighlightsPanelContent()}
            {sidebarTab === 'backlinks' && renderBacklinksPanelContent()}
            {sidebarTab === 'templates' && renderTemplatesPanelContent()}
          </div>
        </div>
      </aside>

      {/* MAIN SECTION: Active Note Workspace */}
      <section 
        onTouchStart={handleNoteTouchStart}
        onTouchEnd={handleNoteTouchEnd}
        className={`flex-1 flex-col bg-bg lg:bg-surface/10 rounded-none lg:rounded-2xl border-0 lg:border border-border/80 overflow-hidden lg:shadow-xs ${activeNoteId ? 'flex animate-in slide-in-from-right duration-300 ease-out' : 'hidden lg:flex'}`}
      >
        {activeNote ? (
          <>
            {/* Note Top Header */}
            <header className="min-h-[48px] lg:min-h-[58px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 bg-surface/10 py-1.5 lg:py-0">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                <button 
                  onClick={() => handleSelectNote(null)} 
                  className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -ml-1 text-fg-2 hover:text-fg rounded-xl hover:bg-surface cursor-pointer"
                  title="Back to Notes List"
                >
                  <ChevronLeft size={20} />
                </button>
                <input 
                  type="text" 
                  value={draftTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleBlurFlush}
                  className="bg-transparent text-[19px] sm:text-[21px] font-semibold text-fg focus:outline-none w-full truncate placeholder:text-muted" 
                  placeholder="Note Title..."
                />
              </div>

              {/* Note Metadata & Actions */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {/* Mobile View Mode Toggle (Clean & Simple) */}
                <div className="flex sm:hidden items-center bg-surface border border-border/60 rounded-xl p-0.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'edit' || viewMode === 'split' ? 'bg-accent text-accent-on shadow-2xs' : 'text-muted'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'preview' ? 'bg-accent text-accent-on shadow-2xs' : 'text-muted'
                    }`}
                  >
                    View
                  </button>
                </div>

                {/* Word count & Reading Time Badge */}
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-meta bg-surface/70 px-2.5 py-1 rounded-lg border border-border/60">
                  <span>{noteStats.words} words</span>
                  <span>•</span>
                  <span>{noteStats.readingTime}</span>
                </div>

                {/* Notes Guide & Tutorial Lightbulb button */}
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="How to Use Notes (Guide & Tips)"
                  aria-label="Notes Guide & Tutorial"
                >
                  <Lightbulb size={17} />
                </button>

                {/* Pin button */}
                <button
                  type="button"
                  onClick={() => togglePin(activeNote.id)}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer ${
                    pinnedIds.includes(activeNote.id)
                      ? 'text-accent bg-accent/10 border border-accent/20'
                      : 'text-muted hover:text-fg hover:bg-surface'
                  }`}
                  title={pinnedIds.includes(activeNote.id) ? 'Unpin note' : 'Pin note to top'}
                >
                  <Pin size={16} className={pinnedIds.includes(activeNote.id) ? 'rotate-45 fill-accent' : ''} />
                </button>

                {/* More Actions Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {isActionsMenuOpen && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-52 bg-bg border border-border rounded-2xl shadow-2xl z-30 p-1.5 space-y-1 animate-in fade-in"
                      onClick={() => setIsActionsMenuOpen(false)}
                    >
                      <button
                        onClick={handleCopyNote}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-surface flex items-center gap-2.5 text-fg cursor-pointer min-h-[40px]"
                      >
                        {copiedStatus ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                        <span>{copiedStatus ? 'Copied' : 'Copy All'}</span>
                      </button>
                      <button
                        onClick={handleDuplicateNote}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-surface flex items-center gap-2.5 text-fg cursor-pointer min-h-[40px]"
                      >
                        <FilePlus size={15} />
                        <span>Duplicate Note</span>
                      </button>
                      <button
                        onClick={() => handleExport('md')}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-surface flex items-center gap-2.5 text-fg cursor-pointer min-h-[40px]"
                      >
                        <Download size={15} />
                        <span>Export Markdown (.md)</span>
                      </button>
                      <button
                        onClick={() => handleExport('txt')}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-surface flex items-center gap-2.5 text-fg cursor-pointer min-h-[40px]"
                      >
                        <Download size={15} />
                        <span>Export Plain Text (.txt)</span>
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-surface flex items-center gap-2.5 text-fg cursor-pointer min-h-[40px]"
                      >
                        <Download size={15} />
                        <span>Export as PDF (.pdf)</span>
                      </button>
                      <div className="w-full h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          setNoteToDelete(activeNote);
                        }}
                        className="w-full text-left px-3 py-2.5 text-[13px] rounded-xl hover:bg-rose-500/10 flex items-center gap-2.5 text-rose-500 cursor-pointer min-h-[40px]"
                      >
                        <Trash2 size={15} />
                        <span>Delete Note</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Interactive Note Tag Ribbon & Manager (Desktop only to keep mobile uncluttered) */}
            <div className="hidden sm:flex px-4 lg:px-8 py-2 border-b border-border/50 bg-surface/10 items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium shrink-0">
                <Tag size={12} className="text-muted/80" />
                <span>Tags:</span>
              </div>

              {/* Active tags on this note */}
              {activeNoteTags.length === 0 && (
                <span className="text-[11px] text-muted italic">No tags</span>
              )}
              {activeNoteTags.map((tag) => (
                <span
                  key={tag}
                  className="group/tag inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/25 hover:border-accent/40 transition-colors shadow-2xs"
                >
                  <span>#{tag.replace(/^#/, '')}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-60 hover:opacity-100 hover:text-rose-500 rounded-full transition-opacity cursor-pointer p-0.5"
                    title={`Remove #${tag.replace(/^#/, '')}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {/* Add Tag Button & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTagPickerOpen(!isTagPickerOpen)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted hover:text-fg bg-surface hover:bg-surface-hover border border-border/70 hover:border-border transition-colors cursor-pointer"
                  title="Add or create a tag for this note"
                >
                  <Plus size={11} />
                  <span>Tag</span>
                </button>

                {isTagPickerOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-bg border border-border rounded-xl shadow-xl z-40 p-3 space-y-3 animate-in fade-in max-h-96 overflow-y-auto custom-scroll">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                      <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                        <Hash size={13} className="text-accent" />
                        <span>Manage Note Tags</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsTagPickerOpen(false)}
                        className="text-muted hover:text-fg cursor-pointer p-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Custom Tag Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newTagInput.trim()) {
                          handleAddTag(newTagInput);
                          setNewTagInput('');
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-[12px]">#</span>
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Create tag (e.g. grace, covenant)"
                          className="w-full bg-surface border border-border/80 pl-6 pr-2 py-1 rounded-lg text-[12px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newTagInput.trim()}
                        className="px-2.5 py-1 bg-accent text-white font-medium text-[12px] rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </form>

                    {/* Diverse Curated Tags by Category */}
                    <div className="space-y-2.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                        Suggested Theological & Study Tags
                      </span>
                      {DIVERSE_SUGGESTED_TAGS.map((group) => (
                        <div key={group.category} className="space-y-1">
                          <span className="text-[10.5px] font-medium text-meta block">{group.category}</span>
                          <div className="flex flex-wrap gap-1">
                            {group.tags.map((tag) => {
                              const isActive = activeNoteTags.some(t => t.replace(/^#/, '').toLowerCase() === tag.toLowerCase());
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      handleRemoveTag(tag);
                                    } else {
                                      handleAddTag(tag);
                                    }
                                  }}
                                  className={`text-[10.5px] px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                    isActive
                                      ? 'bg-accent text-white shadow-2xs'
                                      : 'bg-surface hover:bg-surface-hover text-muted hover:text-fg border border-border/60'
                                  }`}
                                >
                                  <span>#{tag}</span>
                                  {isActive && <Check size={10} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Scripture References Bar (Option 2) */}
            {detectedReferences.length > 0 && (
              <div className="px-4 lg:px-8 py-2 bg-accent/5 border-b border-border/60 flex items-center gap-2 overflow-x-auto custom-scroll no-scrollbar shrink-0">
                <span className="text-[11px] font-semibold text-accent flex items-center gap-1 shrink-0 uppercase tracking-wider">
                  <BookOpen size={12} />
                  <span>Passages:</span>
                </span>
                {detectedReferences.map((ref, idx) => (
                  <button
                    key={`${ref.book}-${ref.chapter}-${ref.verse}-${idx}`}
                    onClick={() => setPreviewVerse(ref)}
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-bg hover:bg-surface text-accent font-medium border border-accent/25 hover:border-accent transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title={`Preview ${ref.book} ${ref.chapter}:${ref.verse}`}
                  >
                    <span>{ref.book} {ref.chapter}:{ref.verse}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Rich Formatting Toolbar (Kept full-featured on desktop, hidden on mobile for clean distraction-free writing) */}
            <div className="hidden sm:block shrink-0">
              <NoteFormattingToolbar
                textareaRef={textareaRef}
                content={draftContent}
                onChangeContent={(newContent) => updateNoteImmediately(draftTitle, newContent)}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                onOpenInsertVerse={() => setIsInsertVerseOpen(true)}
                onOpenTemplates={() => setIsTemplatesOpen(true)}
                onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
              />
            </div>

            {/* Canvas / Editor Viewport */}
            <div className="flex-1 overflow-hidden relative flex">
              {/* EDIT MODE: Raw Markdown Textarea */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div 
                  className={`h-full overflow-y-auto custom-scroll flex-1 p-4 sm:p-8 lg:p-12 pb-16 lg:pb-16 touch-pan-y ${viewMode === 'split' ? 'border-r border-border' : ''}`}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <textarea 
                    ref={textareaRef}
                    className="w-full h-full bg-transparent focus:outline-none resize-none text-[16px] leading-[1.8] text-fg font-sans placeholder:text-muted" 
                    value={draftContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onBlur={handleBlurFlush}
                    placeholder="Start typing your note, reflections, or paste Scripture here... Use markdown or the toolbar above."
                  />
                </div>
              )}

              {/* PREVIEW MODE: Live Rendered Markdown */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div 
                  className="h-full overflow-y-auto custom-scroll flex-1 p-4 sm:p-8 lg:p-12 pb-16 lg:pb-16 bg-surface/5 touch-pan-y"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <NoteMarkdownRenderer
                    content={draftContent}
                    onVerseClick={(book, chapter, verse) => setPreviewVerse({ book, chapter, verse })}
                    onToggleCheckbox={handleToggleCheckbox}
                  />
                </div>
              )}
            </div>

            {/* Note Footer Info */}
            <footer className="h-7 border-t border-border/60 bg-surface/20 px-4 lg:px-8 flex items-center justify-between text-[11px] text-meta shrink-0">
              <div className="flex items-center gap-3">
                <span>{activeNote.updatedAt ? `Last edited ${formatRelativeTime(activeNote.updatedAt)}` : 'Saved'}</span>
                {activeNoteTags.length > 0 && (
                  <div className="flex items-center gap-1 hidden sm:flex">
                    <Tag size={11} className="text-muted" />
                    <span>{activeNoteTags.join(' ')}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(true)}
                  className="flex items-center gap-1.5 text-muted hover:text-amber-500 transition-colors cursor-pointer text-[11px]"
                  title="How to Use Notes Guide"
                >
                  <Lightbulb size={12} className="text-amber-500" />
                  <span>Notes Guide</span>
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto overflow-y-auto custom-scroll">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 shadow-sm">
              <BookOpen size={28} />
            </div>
            <h3 className="font-display font-serif text-2xl font-bold text-fg mb-2 tracking-tight">
              Scripture Study Notebook
            </h3>
            <p className="text-[13.5px] text-meta max-w-md leading-relaxed mb-6">
              Select an existing entry from the sidebar to continue studying, or start a new note using our structured frameworks.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                onClick={() => setIsTemplatesOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold text-[13px] rounded-xl hover:opacity-95 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <LayoutTemplate size={16} />
                <span>Explore Study Templates</span>
              </button>
              <button
                onClick={handleCreateBlankNote}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-hover border border-border text-fg font-medium text-[13px] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>New Blank Note</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 border border-amber-500/25 text-xs font-semibold transition-all cursor-pointer shadow-2xs mb-8 group"
            >
              <Lightbulb size={14} className="group-hover:scale-110 transition-transform" />
              <span>How to Use Notes • Interactive Tutorial</span>
            </button>

            {/* Quick Starters */}
            <div className="w-full text-left">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
                <span>Quick Template Starters</span>
                <button
                  onClick={() => setIsTemplatesOpen(true)}
                  className="text-accent hover:underline lowercase font-medium text-[12px] cursor-pointer"
                >
                  view all
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {NOTE_TEMPLATES.slice(0, 3).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl, 'create')}
                    className="p-3.5 rounded-xl border border-border/70 hover:border-accent/50 bg-surface/40 hover:bg-surface/80 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-accent px-1.5 py-0.5 rounded bg-accent/10">
                        {tmpl.badge}
                      </span>
                      <LayoutTemplate size={13} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                    <div className="text-[13px] font-semibold text-fg group-hover:text-accent transition-colors mb-1 truncate">
                      {tmpl.name}
                    </div>
                    <p className="text-[11px] text-meta line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODALS */}
      {/* 1. Templates Modal (Option 1) */}
      <NoteTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleApplyTemplate}
        isExistingNote={activeNote !== undefined}
      />

      {/* 2. Insert Verse Modal (Option 2) */}
      <InsertVerseModal
        isOpen={isInsertVerseOpen}
        onClose={() => setIsInsertVerseOpen(false)}
        onInsert={handleInsertVerseText}
        currentTranslation={currentTranslation}
      />

      {/* 3. Verse Preview Popup (Option 2) */}
      <VersePreviewPopup
        reference={previewVerse}
        onClose={() => setPreviewVerse(null)}
        onNavigateToBible={onNavigateToVerse}
        defaultTranslation={currentTranslation}
      />

      {/* 4. AI Study Assistant Modal (Option 6) */}
      <NoteAiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        noteTitle={draftTitle}
        noteContent={draftContent}
        onAppendToNote={handleAppendAiText}
        theologicalLens={theologicalLens}
      />

      {/* 5. Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={noteToDelete !== null}
        title="Delete Note?"
        message={`Are you sure you want to delete "${noteToDelete?.title || 'Untitled Note'}"? This action cannot be undone.`}
        confirmLabel="Delete Note"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (noteToDelete) {
            onDeleteNote(noteToDelete.id);
            setNoteToDelete(null);
          }
        }}
        onCancel={() => setNoteToDelete(null)}
      />

      {/* 6. Notes Interactive Tutorial Modal */}
      <NotesTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );

  // Helper to render individual note card in the sidebar
  function renderNoteCard(n: NoteItem) {
    const isSelected = activeNoteId === n.id;
    const isPinned = pinnedIds.includes(n.id);
    const tags = extractTags(`${n.title} ${n.content}`);
    const timeStr = formatRelativeTime(n.updatedAt || n.createdAt);

    return (
      <div 
        key={n.id} 
        onClick={() => handleSelectNote(n.id)} 
        className={`group p-3 rounded-xl text-[13px] transition-all cursor-pointer border select-none ${
          isSelected 
            ? 'bg-surface border-border text-fg ring-1 ring-border/80 shadow-xs' 
            : 'bg-surface/40 hover:bg-surface border-border/40 hover:border-border text-muted hover:text-fg'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`font-medium truncate ${isSelected ? 'text-fg' : 'text-fg/90'}`}>
            {n.title || 'Untitled Note'}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePin(n.id);
              }}
              className="p-1 text-muted hover:text-accent rounded transition-colors cursor-pointer"
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={12} className={isPinned ? 'fill-accent text-accent rotate-45' : ''} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNoteToDelete(n);
              }} 
              className="p-1 text-muted hover:text-rose-500 rounded transition-colors cursor-pointer"
              title="Delete Note"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Content Excerpt */}
        <p className="text-[11px] text-meta line-clamp-2 leading-relaxed mb-2">
          {n.content ? n.content.replace(/[#*`_>\[\]]/g, '').trim() : 'Empty note'}
        </p>

        {/* Card Footer: Tags & Time */}
        <div className="flex items-center justify-between text-[10px] text-meta gap-1">
          <div className="flex items-center gap-1 overflow-hidden">
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-surface border border-border/60 text-muted font-medium truncate">
                {t}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[9px] text-muted">+{tags.length - 2}</span>
            )}
          </div>
          <span className="shrink-0 flex items-center gap-1">
            <Clock size={10} className="text-muted/70" />
            <span>{timeStr}</span>
          </span>
        </div>
      </div>
    );
  }

  // Helper to render individual backlink group in the sidebar
  function renderBacklinkGroup(group: ScriptureBacklinkGroup, isContextual: boolean) {
    return (
      <div 
        key={`${group.reference}-${isContextual ? 'ctx' : 'all'}`} 
        className="rounded-xl border border-border/70 bg-surface/30 p-2.5 space-y-2 shadow-2xs hover:border-accent/40 transition-all"
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPreviewVerse({ book: group.book, chapter: group.chapter, verse: group.verse })}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline cursor-pointer group/link"
            title={`Preview ${group.reference} in Scripture`}
          >
            <BookOpen size={12} className="text-accent group-hover/link:scale-110 transition-transform" />
            <span>{group.reference}</span>
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border/60 text-muted font-medium">
            {group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        {/* Note references under this passage */}
        <div className="space-y-1">
          {group.notes.map(({ note, snippet }) => {
            const isCurrentNote = activeNoteId === note.id;
            return (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className={`p-2 rounded-lg text-left cursor-pointer transition-all border ${
                  isCurrentNote
                    ? 'bg-accent/10 border-accent/30 text-fg shadow-2xs'
                    : 'bg-surface/50 hover:bg-surface border-transparent hover:border-border/60 text-muted hover:text-fg'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={`text-[12px] font-medium truncate ${isCurrentNote ? 'text-fg font-semibold' : 'text-fg/90'}`}>
                    {note.title || 'Untitled Note'}
                  </span>
                  <span className="text-[9.5px] text-meta shrink-0">
                    {formatRelativeTime(note.updatedAt || note.createdAt)}
                  </span>
                </div>
                {snippet && (
                  <p className="text-[11px] text-meta line-clamp-2 leading-relaxed">
                    {snippet}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 1. Render Notes Panel Content
  function renderNotesPanelContent() {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Bar */}
        <div className="p-2.5 rounded-xl border border-border/70 bg-surface/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, scripture, tags..."
              className="w-full bg-surface border border-border/80 pl-9 pr-8 py-1.5 rounded-lg text-[13px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Tags Filter Ribbon */}
          {allAvailableTags.length > 0 && (
            <div onWheel={handleHorizontalWheel} className="flex items-center gap-1.5 overflow-x-auto custom-scroll no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTag === null
                    ? 'bg-accent text-white shadow-2xs'
                    : 'bg-surface hover:bg-surface/80 text-muted border border-border/60'
                }`}
              >
                All
              </button>
              {allAvailableTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                    selectedTag === t
                      ? 'bg-accent text-white shadow-2xs'
                      : 'bg-surface hover:bg-surface/80 text-muted border border-border/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Sorting Row */}
          <div className="flex items-center justify-between text-[11px] text-meta pt-0.5">
            <span>{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
            <div className="flex items-center gap-1">
              <ArrowUpDown size={11} className="text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'updated' | 'title' | 'created')}
                className="bg-transparent text-meta hover:text-fg focus:outline-none cursor-pointer"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Date Created</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes Items List */}
        <div 
          className="notes-panel-scroll flex-1 min-h-0 overflow-y-auto custom-scroll p-2.5 space-y-1 pb-16 lg:pb-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {filteredNotes.length === 0 && (
            <div className="py-8 px-4 text-center text-meta">
              <FileText size={22} className="mx-auto mb-2 text-muted" />
              <p className="text-[12.5px] font-medium text-fg">No notes found</p>
              <p className="text-[11px] mt-1">
                {searchQuery || selectedTag ? 'Try adjusting your search or filters.' : 'Click + New Note to start.'}
              </p>
            </div>
          )}

          {/* Pinned Notes Group */}
          {pinnedNotes.length > 0 && (
            <div className="mb-2 space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <Pin size={11} className="text-accent rotate-45" />
                <span>Pinned</span>
              </div>
              {pinnedNotes.map((note) => renderNoteCard(note))}
            </div>
          )}

          {/* Regular Notes Group */}
          {regularNotes.length > 0 && (
            <div className="space-y-1">
              {pinnedNotes.length > 0 && (
                <div className="px-2 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                  Notes
                </div>
              )}
              {regularNotes.map((note) => renderNoteCard(note))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Render Highlights Panel Content
  function renderHighlightsPanelContent() {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Highlights Search Bar */}
        <div className="p-2.5 rounded-xl border border-border/70 bg-surface/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              type="text"
              value={highlightsSearchQuery}
              onChange={(e) => setHighlightsSearchQuery(e.target.value)}
              placeholder="Search highlighted verses..."
              className="w-full bg-surface border border-border/80 pl-9 pr-8 py-1.5 rounded-lg text-[13px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {highlightsSearchQuery && (
              <button
                onClick={() => setHighlightsSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-meta">
            <span>{filteredHighlights.length} {filteredHighlights.length === 1 ? 'highlight' : 'highlights'}</span>
            <span>{highlights.length} total saved</span>
          </div>
        </div>

        {/* Highlights List */}
        <div 
          className="notes-panel-scroll flex-1 min-h-0 overflow-y-auto custom-scroll p-2.5 space-y-2.5 pb-16 lg:pb-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {filteredHighlights.length === 0 ? (
            <div className="py-8 px-4 text-center text-meta">
              <Highlighter size={22} className="mx-auto mb-2 text-muted" />
              <p className="text-[12.5px] font-medium text-fg">No highlights found</p>
              <p className="text-[11px] mt-1 leading-relaxed">
                {highlightsSearchQuery 
                  ? 'No highlighted verses match your search.' 
                  : 'Highlight verses in Study to see them here, insert them into notes, or send them to Canvas.'}
              </p>
            </div>
          ) : (
            filteredHighlights.map((hl) => {
              const ref = `${hl.book} ${hl.chapter}:${hl.verse}`;
              return (
                <div 
                  key={hl.id}
                  className="p-3 rounded-xl border border-border/70 bg-surface/50 hover:bg-surface hover:border-border transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" 
                        style={{ backgroundColor: hl.color || '#c96442' }} 
                      />
                      <span className="text-xs font-semibold text-fg truncate">{ref}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const quoteSnippet = `> "${hl.text}"\n\n— **${ref}**\n\n`;
                          if (activeNote) {
                            handleContentChange(`${draftContent ? draftContent + '\n\n' : ''}${quoteSnippet}`);
                          } else {
                            onCreateNote({
                              title: `Study: ${ref}`,
                              content: `${quoteSnippet}### Study Notes\n- `,
                            });
                          }
                        }}
                        className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-surface-hover hover:bg-border text-fg-2 hover:text-fg border border-border/60 transition-colors cursor-pointer"
                        title="Insert quote into active note"
                      >
                        Insert
                      </button>
                      {onSendHighlightToCanvas && (
                        <button
                          type="button"
                          onClick={() => onSendHighlightToCanvas({
                            book: hl.book,
                            chapter: hl.chapter,
                            verse: hl.verse,
                            text: hl.text,
                          })}
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-accent/10 hover:bg-accent/20 text-accent transition-colors cursor-pointer"
                          title="Drop onto Canvas"
                        >
                          Canvas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateToVerse(hl.book, hl.chapter, hl.verse)}
                        className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
                        title="Open in Study"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-fg-2 line-clamp-3 leading-relaxed italic border-l-2 pl-2" style={{ borderColor: hl.color || '#c96442' }}>
                    "{hl.text}"
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 3. Render Backlinks Panel Content
  function renderBacklinksPanelContent() {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Backlinks Search Bar */}
        <div className="p-2.5 rounded-xl border border-border/70 bg-surface/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              type="text"
              value={backlinksSearchQuery}
              onChange={(e) => setBacklinksSearchQuery(e.target.value)}
              placeholder="Filter backlinks or scriptures..."
              className="w-full bg-surface border border-border/80 pl-9 pr-8 py-1.5 rounded-lg text-[13px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {backlinksSearchQuery && (
              <button
                onClick={() => setBacklinksSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-meta">
            <span>{filteredBacklinksGroups.length} linked {filteredBacklinksGroups.length === 1 ? 'passage' : 'passages'}</span>
            <span>{allBacklinksGroups.reduce((acc, g) => acc + g.notes.length, 0)} total references</span>
          </div>
        </div>

        {/* Backlinks List */}
        <div 
          className="notes-panel-scroll flex-1 min-h-0 overflow-y-auto custom-scroll p-2.5 space-y-3 pb-16 lg:pb-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {filteredBacklinksGroups.length === 0 ? (
            <div className="py-8 px-4 text-center text-meta">
              <Link2 size={22} className="mx-auto mb-2 text-muted" />
              <p className="text-[12.5px] font-medium text-fg">No Scripture backlinks found</p>
              <p className="text-[11px] mt-1 leading-relaxed">
                {backlinksSearchQuery 
                  ? 'No passages match your search.' 
                  : 'Type any Bible citation (like John 3:16) in your notes to automatically link related thoughts.'}
              </p>
            </div>
          ) : (
            <>
              {/* Contextual Active Note Links */}
              {activeNote && activeNoteBacklinks.length > 0 && !backlinksSearchQuery && (
                <div className="mb-2 space-y-1.5">
                  <div className="px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                    <BookOpen size={11} />
                    <span>Connected to Active Note</span>
                  </div>
                  {activeNoteBacklinks.map((group) => renderBacklinkGroup(group, true))}
                  <div className="w-full h-px bg-border/40 my-2 rounded-full" />
                </div>
              )}

              {/* All Scripture Backlinks */}
              <div className="space-y-2">
                {activeNote && activeNoteBacklinks.length > 0 && !backlinksSearchQuery && (
                  <div className="px-2 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    All Scripture Passages
                  </div>
                )}
                {filteredBacklinksGroups.map((group) => renderBacklinkGroup(group, false))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 3. Render Templates Panel Content
  function renderTemplatesPanelContent() {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Templates Search & Header */}
        <div className="p-2.5 rounded-xl border border-border/70 bg-surface/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              type="text"
              value={templatesSearchQuery}
              onChange={(e) => setTemplatesSearchQuery(e.target.value)}
              placeholder="Search study frameworks..."
              className="w-full bg-surface border border-border/80 pl-9 pr-8 py-1.5 rounded-lg text-[13px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {templatesSearchQuery && (
              <button
                onClick={() => setTemplatesSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {/* Template Categories Slider */}
          {allTemplateBadges.length > 0 && (
            <div onWheel={handleHorizontalWheel} className="flex items-center gap-1.5 overflow-x-auto custom-scroll no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedTemplateBadge(null)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTemplateBadge === null
                    ? 'bg-accent text-white shadow-2xs'
                    : 'bg-surface hover:bg-surface/80 text-muted border border-border/60'
                }`}
              >
                All
              </button>
              {allTemplateBadges.map((badge) => (
                <button
                  key={badge}
                  type="button"
                  onClick={() => setSelectedTemplateBadge(selectedTemplateBadge === badge ? null : badge)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                    selectedTemplateBadge === badge
                      ? 'bg-accent text-white shadow-2xs'
                      : 'bg-surface hover:bg-surface/80 text-muted border border-border/60'
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-meta pt-0.5">
            <span>{filteredTemplates.length} study {filteredTemplates.length === 1 ? 'framework' : 'frameworks'}</span>
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(true)}
              className="text-accent hover:underline font-medium text-[11px] cursor-pointer"
            >
              Open Full Library
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div 
          className="notes-panel-scroll flex-1 min-h-0 overflow-y-auto custom-scroll p-2.5 space-y-2.5 pb-16 lg:pb-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {filteredTemplates.length === 0 ? (
            <div className="py-8 px-4 text-center text-meta">
              <LayoutTemplate size={22} className="mx-auto mb-2 text-muted" />
              <p className="text-[12.5px] font-medium text-fg">No templates match your search</p>
            </div>
          ) : (
            filteredTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-3 rounded-xl border border-border/70 hover:border-accent/50 bg-surface/40 hover:bg-surface/70 transition-all shadow-2xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-[11px] font-semibold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                      {tmpl.badge}
                    </span>
                    <LayoutTemplate size={13} className="text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <h4 className="text-[13px] font-semibold text-fg group-hover:text-accent transition-colors mb-1">
                    {tmpl.name}
                  </h4>
                  <p className="text-[11px] text-meta leading-relaxed line-clamp-2 mb-3">
                    {tmpl.description}
                  </p>
                </div>

                {/* Template Card Action Buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl, 'create')}
                    className="flex-1 py-1.5 px-2 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center"
                    title="Create a new note with this template"
                  >
                    + New Note
                  </button>
                  {activeNote && (
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl, 'append')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-hover text-fg border border-border/70 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                      title="Append this template into the currently open note"
                    >
                      Append
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTemplatesOpen(true)}
                    className="p-1.5 bg-surface hover:bg-surface-hover text-muted hover:text-fg border border-border/70 rounded-lg transition-colors cursor-pointer"
                    title="Preview template content"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
}
