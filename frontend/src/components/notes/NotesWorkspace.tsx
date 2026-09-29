"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Edit, 
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
  Calendar, 
  FilePlus,
  X,
  Share2,
  Clock
} from 'lucide-react';
import { NoteFormattingToolbar, NoteViewMode } from './NoteFormattingToolbar';
import { NoteMarkdownRenderer } from './NoteMarkdownRenderer';
import { NoteTemplatesModal } from './NoteTemplatesModal';
import { InsertVerseModal } from './InsertVerseModal';
import { VersePreviewPopup } from './VersePreviewPopup';
import { NoteAiAssistantModal } from './NoteAiAssistantModal';
import { NoteTemplate, NOTE_TEMPLATES } from './noteTemplates';
import { BIBLE_VERSE_REGEX, CANONICAL_BOOKS } from '@/lib/bibleReferences';

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
  theologicalLens = 'canonical',
  currentTranslation = 'bsb',
}: NotesWorkspaceProps) {
  // Sidebar UI state
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'backlinks'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [backlinksSearchQuery, setBacklinksSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load pinned notes from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(PINNED_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setPinnedIds(parsed);
        }
      } catch (e) {
        console.warn('Failed to load pinned notes', e);
      }
    }
  }, []);

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
    const text = (activeNote.content || '').trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      chars,
      readingTime: `${minutes} min read`,
    };
  }, [activeNote]);

  // Detected Scripture references in active note
  const detectedReferences = useMemo(() => {
    if (!activeNote) return [];
    return extractScriptureReferences(`${activeNote.title}\n${activeNote.content}`);
  }, [activeNote]);

  // Detected Tags in active note
  const activeNoteTags = useMemo(() => {
    if (!activeNote) return [];
    return extractTags(`${activeNote.title} ${activeNote.content}`);
  }, [activeNote]);

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
    const activeRefs = extractAllScriptureReferences(`${activeNote.title || ''}\n${activeNote.content || ''}`);
    const activeKeys = new Set(activeRefs.map(r => `${r.book} ${r.chapter}:${r.verse}`));
    return allBacklinksGroups.filter(g => activeKeys.has(g.reference));
  }, [activeNote, allBacklinksGroups]);

  // Tag Management Handlers
  const handleAddTag = (tagToAdd: string) => {
    if (!activeNote) return;
    const cleanTag = tagToAdd.trim().replace(/^#+/, '').toLowerCase();
    if (!cleanTag) return;
    const currentTags = extractTags(`${activeNote.title} ${activeNote.content}`);
    if (currentTags.includes(cleanTag)) return;

    const newContent = activeNote.content.trim()
      ? `${activeNote.content.trim()}\n\n#${cleanTag}`
      : `#${cleanTag}`;
    onUpdateNote(activeNote.id, activeNote.title, newContent);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    const cleanTag = tagToRemove.trim().replace(/^#+/, '').toLowerCase();
    const tagRegex = new RegExp(`(?:^|\\s)#${cleanTag}\\b`, 'gi');
    const updatedContent = activeNote.content.replace(tagRegex, '').replace(/\n{3,}/g, '\n\n').trim();
    const updatedTitle = activeNote.title.replace(tagRegex, '').trim();
    onUpdateNote(activeNote.id, updatedTitle || 'Untitled Note', updatedContent);
  };

  // Handlers
  const handleCreateBlankNote = async () => {
    const created = await onCreateNote({
      title: 'New Study Note',
      content: '',
    });
    if (created) {
      onSelectNote(created.id);
    }
  };

  const handleApplyTemplate = async (template: NoteTemplate, mode: 'create' | 'replace' | 'append') => {
    const todayStr = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date());
    const templatedContent = template.content(todayStr);

    if (mode === 'create' || !activeNote) {
      const created = await onCreateNote({
        title: template.name,
        content: templatedContent,
      });
      if (created) onSelectNote(created.id);
    } else if (mode === 'replace') {
      onUpdateNote(activeNote.id, template.name, templatedContent);
    } else {
      // Append
      const newContent = activeNote.content
        ? `${activeNote.content}\n\n---\n\n${templatedContent}`
        : templatedContent;
      onUpdateNote(activeNote.id, activeNote.title, newContent);
    }
  };

  const handleInsertVerseText = (verseMarkdown: string) => {
    if (!activeNote) return;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = activeNote.content;
      const updated = current.substring(0, start) + verseMarkdown + current.substring(end);
      onUpdateNote(activeNote.id, activeNote.title, updated);
      setTimeout(() => {
        textarea.focus();
        const nextPos = start + verseMarkdown.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      const updated = activeNote.content ? `${activeNote.content}\n${verseMarkdown}` : verseMarkdown;
      onUpdateNote(activeNote.id, activeNote.title, updated);
    }
  };

  const handleAppendAiText = (aiContent: string) => {
    if (!activeNote) return;
    const updated = activeNote.content ? `${activeNote.content}${aiContent}` : aiContent;
    onUpdateNote(activeNote.id, activeNote.title, updated);
  };

  const handleToggleCheckbox = (itemIndex: number) => {
    if (!activeNote) return;
    let count = 0;
    const updated = activeNote.content.replace(/- \[( |x|X)\]/g, (match, checkState) => {
      if (count === itemIndex) {
        count++;
        return checkState === ' ' ? '- [x]' : '- [ ]';
      }
      count++;
      return match;
    });
    onUpdateNote(activeNote.id, activeNote.title, updated);
  };

  const handleExport = (format: 'md' | 'txt') => {
    if (!activeNote) return;
    const title = activeNote.title || 'Untitled Note';
    const filename = `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.${format}`;
    const blob = new Blob([activeNote.content], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
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
    navigator.clipboard.writeText(`${activeNote.title}\n\n${activeNote.content}`);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
    setIsActionsMenuOpen(false);
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    const duplicated = await onCreateNote({
      title: `${activeNote.title} (Copy)`,
      content: activeNote.content,
    });
    if (duplicated) onSelectNote(duplicated.id);
    setIsActionsMenuOpen(false);
  };

  return (
    <div className="flex w-full h-full bg-bg relative overflow-hidden select-text">
      {/* SIDEBAR: Notebooks & Notes List (Option 5) */}
      <aside 
        className={`w-full lg:w-[320px] border-r border-border bg-bg flex flex-col shrink-0 transition-all ${
          activeNoteId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header with Notes vs Backlinks Tab Switcher */}
        <header className="h-[60px] border-b border-border flex items-center justify-between px-3 shrink-0 bg-surface/20 gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setSidebarTab('notes')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                sidebarTab === 'notes'
                  ? 'bg-bg text-fg shadow-2xs'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <FileText size={13} className={sidebarTab === 'notes' ? 'text-accent' : ''} />
              <span>Notes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-muted font-normal">
                {notes.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('backlinks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                sidebarTab === 'backlinks'
                  ? 'bg-bg text-accent shadow-2xs'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <Link2 size={13} />
              <span>Backlinks</span>
              {allBacklinksGroups.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-medium">
                  {allBacklinksGroups.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-fg hover:text-accent bg-surface hover:bg-surface-hover border border-border/70 hover:border-border transition-all cursor-pointer shadow-2xs group"
              title="Add note from a Study Template (SOAP, Sermon, Inductive, etc.)"
            >
              <LayoutTemplate size={13} className="text-muted group-hover:text-accent transition-colors" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button
              type="button"
              onClick={handleCreateBlankNote}
              className="p-1.5 text-muted hover:text-fg hover:bg-surface border border-border/60 hover:border-border rounded-lg transition-colors cursor-pointer"
              title="New Blank Note"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>

        {/* TAB 1: NOTES LIST */}
        {sidebarTab === 'notes' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-border/60 bg-surface/10 space-y-2.5 shrink-0">
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
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll no-scrollbar py-0.5">
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
                    onChange={(e) => setSortBy(e.target.value as any)}
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
            <div className="flex-1 overflow-y-auto custom-scroll p-2.5 space-y-1 pb-24 lg:pb-3">
              {filteredNotes.length === 0 && (
                <div className="py-12 px-4 text-center text-meta">
                  <FileText size={24} className="mx-auto mb-2 text-muted" />
                  <p className="text-[13px] font-medium text-fg">No notes found</p>
                  <p className="text-[11px] mt-1">
                    {searchQuery || selectedTag ? 'Try adjusting your search or filters.' : 'Click + or Templates above to create your first note.'}
                  </p>
                </div>
              )}

              {/* Pinned Notes Group */}
              {pinnedNotes.length > 0 && (
                <div className="mb-3 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
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
                    <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                      Notes
                    </div>
                  )}
                  {regularNotes.map((note) => renderNoteCard(note))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BACKLINKS LIST */}
        {sidebarTab === 'backlinks' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Backlinks Search Bar */}
            <div className="p-3 border-b border-border/60 bg-surface/10 space-y-2 shrink-0">
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
            <div className="flex-1 overflow-y-auto custom-scroll p-2.5 space-y-3 pb-24 lg:pb-3">
              {filteredBacklinksGroups.length === 0 ? (
                <div className="py-12 px-4 text-center text-meta">
                  <Link2 size={24} className="mx-auto mb-2 text-muted" />
                  <p className="text-[13px] font-medium text-fg">No Scripture backlinks found</p>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    {backlinksSearchQuery 
                      ? 'No passages match your search.' 
                      : 'Type any Bible citation (like John 3:16 or Romans 8:28) in your notes to automatically link and organize your study.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Contextual Active Note Links */}
                  {activeNote && activeNoteBacklinks.length > 0 && !backlinksSearchQuery && (
                    <div className="mb-3 space-y-2">
                      <div className="px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={11} />
                        <span>Connected to Active Note</span>
                      </div>
                      {activeNoteBacklinks.map((group) => renderBacklinkGroup(group, true))}
                      <div className="w-full h-px bg-border/60 my-2" />
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
        )}
      </aside>

      {/* MAIN SECTION: Active Note Workspace */}
      <section className={`flex-1 flex-col bg-bg ${activeNoteId ? 'flex' : 'hidden lg:flex'}`}>
        {activeNote ? (
          <>
            {/* Note Top Header */}
            <header className="h-[60px] border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0 bg-surface/10">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                <button 
                  onClick={() => onSelectNote(null)} 
                  className="lg:hidden p-1.5 -ml-1 text-fg-2 hover:text-fg rounded-lg hover:bg-surface cursor-pointer"
                  title="Back to Notes List"
                >
                  <ChevronLeft size={20} />
                </button>
                <input 
                  type="text" 
                  value={activeNote.title} 
                  onChange={(e) => onUpdateNote(activeNote.id, e.target.value, activeNote.content)}
                  className="bg-transparent text-[19px] sm:text-[21px] font-semibold text-fg focus:outline-none w-full truncate placeholder:text-muted" 
                  placeholder="Note Title..."
                />
              </div>

              {/* Note Metadata & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Word count & Reading Time Badge */}
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-meta bg-surface/70 px-2.5 py-1 rounded-lg border border-border/60">
                  <span>{noteStats.words} words</span>
                  <span>•</span>
                  <span>{noteStats.readingTime}</span>
                </div>

                {/* Pin button */}
                <button
                  type="button"
                  onClick={() => togglePin(activeNote.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
                    className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                  >
                    <MoreVertical size={17} />
                  </button>

                  {isActionsMenuOpen && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-48 bg-bg border border-border rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in"
                      onClick={() => setIsActionsMenuOpen(false)}
                    >
                      <button
                        onClick={handleCopyNote}
                        className="w-full text-left px-3 py-1.5 text-[12px] rounded-lg hover:bg-surface flex items-center gap-2 text-fg cursor-pointer"
                      >
                        {copiedStatus ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedStatus ? 'Copied' : 'Copy All'}</span>
                      </button>
                      <button
                        onClick={handleDuplicateNote}
                        className="w-full text-left px-3 py-1.5 text-[12px] rounded-lg hover:bg-surface flex items-center gap-2 text-fg cursor-pointer"
                      >
                        <FilePlus size={14} />
                        <span>Duplicate Note</span>
                      </button>
                      <button
                        onClick={() => handleExport('md')}
                        className="w-full text-left px-3 py-1.5 text-[12px] rounded-lg hover:bg-surface flex items-center gap-2 text-fg cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Export Markdown (.md)</span>
                      </button>
                      <button
                        onClick={() => handleExport('txt')}
                        className="w-full text-left px-3 py-1.5 text-[12px] rounded-lg hover:bg-surface flex items-center gap-2 text-fg cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Export Plain Text (.txt)</span>
                      </button>
                      <div className="w-full h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this note?')) {
                            onDeleteNote(activeNote.id);
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-500 cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Delete Note</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Interactive Note Tag Ribbon & Manager */}
            <div className="px-4 lg:px-8 py-2 border-b border-border/50 bg-surface/10 flex items-center gap-2 flex-wrap shrink-0">
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

            {/* Rich Formatting Toolbar (Option 4) */}
            <NoteFormattingToolbar
              textareaRef={textareaRef}
              content={activeNote.content}
              onChangeContent={(newContent) => onUpdateNote(activeNote.id, activeNote.title, newContent)}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              onOpenInsertVerse={() => setIsInsertVerseOpen(true)}
              onOpenTemplates={() => setIsTemplatesOpen(true)}
              onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            />

            {/* Canvas / Editor Viewport */}
            <div className="flex-1 overflow-hidden relative flex">
              {/* EDIT MODE: Raw Markdown Textarea */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`h-full overflow-y-auto custom-scroll flex-1 p-4 sm:p-8 lg:p-12 pb-28 lg:pb-16 ${viewMode === 'split' ? 'border-r border-border' : ''}`}>
                  <textarea 
                    ref={textareaRef}
                    className="w-full h-full bg-transparent focus:outline-none resize-none text-[16px] leading-[1.8] text-fg font-sans placeholder:text-muted" 
                    value={activeNote.content} 
                    onChange={(e) => onUpdateNote(activeNote.id, activeNote.title, e.target.value)}
                    placeholder="Start typing your note, reflections, or paste Scripture here... Use markdown or the toolbar above."
                  />
                </div>
              )}

              {/* PREVIEW MODE: Live Rendered Markdown */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="h-full overflow-y-auto custom-scroll flex-1 p-4 sm:p-8 lg:p-12 pb-28 lg:pb-16 bg-surface/5">
                  <NoteMarkdownRenderer
                    content={activeNote.content}
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
                <span>Markdown enabled</span>
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

            <div className="flex items-center gap-3 mb-8">
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
        noteTitle={activeNote?.title || ''}
        noteContent={activeNote?.content || ''}
        onAppendToNote={handleAppendAiText}
        theologicalLens={theologicalLens}
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
        onClick={() => onSelectNote(n.id)} 
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
                if (confirm('Delete this note?')) onDeleteNote(n.id);
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
                onClick={() => onSelectNote(note.id)}
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
}
