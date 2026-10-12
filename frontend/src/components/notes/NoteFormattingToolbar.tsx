"use client";

import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Minus, 
  Code, 
  BookOpen, 
  LayoutTemplate,
  Sparkles, 
  Eye, 
  Edit3, 
  Columns,
  Lightbulb,
  ChevronDown
} from 'lucide-react';

export type NoteViewMode = 'edit' | 'preview' | 'split';

interface NoteFormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onChangeContent: (newContent: string) => void;
  viewMode: NoteViewMode;
  onChangeViewMode: (mode: NoteViewMode) => void;
  onOpenInsertVerse: () => void;
  onOpenTemplates: () => void;
  onOpenAiAssistant: () => void;
}

export function NoteFormattingToolbar({
  textareaRef,
  content,
  onChangeContent,
  viewMode,
  onChangeViewMode,
  onOpenInsertVerse,
  onOpenTemplates,
  onOpenAiAssistant,
}: NoteFormattingToolbarProps) {
  const [calloutsOpen, setCalloutsOpen] = useState(false);

  // Helper to wrap selected text or insert markdown at cursor
  function insertFormat(prefix: string, suffix: string = '', defaultPlaceholder: string = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultPlaceholder}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onChangeContent(newContent);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected ? start + replacement.length : start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + (selected ? 0 : defaultPlaceholder.length));
    }, 0);
  }

  // Helper to insert at start of line
  function insertLinePrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = content.substring(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    onChangeContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  return (
    <div className="border-b border-border bg-surface/30 px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none overflow-x-auto no-scrollbar sm:flex-wrap">
      {/* Left Formatting Group */}
      <div className="flex items-center gap-1 flex-nowrap sm:flex-wrap shrink-0">
        {/* Headings */}
        <button
          type="button"
          onClick={() => insertLinePrefix('# ')}
          title="Heading 1 (# )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Heading1 size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertLinePrefix('## ')}
          title="Heading 2 (## )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Heading2 size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertLinePrefix('### ')}
          title="Heading 3 (### )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Heading3 size={17} />
        </button>

        <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

        {/* Inline styles */}
        <button
          type="button"
          onClick={() => insertFormat('**', '**', 'bold text')}
          title="Bold (Ctrl+B / ⌘B)"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Bold size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('*', '*', 'italic text')}
          title="Italic (Ctrl+I / ⌘I)"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Italic size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('~~', '~~', 'strikethrough')}
          title="Strikethrough"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Strikethrough size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('`', '`', 'code')}
          title="Inline Code"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Code size={17} />
        </button>

        <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

        {/* Lists & Checkboxes */}
        <button
          type="button"
          onClick={() => insertLinePrefix('- ')}
          title="Bullet List (- )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <List size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertLinePrefix('1. ')}
          title="Numbered List (1. )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <ListOrdered size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertLinePrefix('- [ ] ')}
          title="Checklist / To-Do (- [ ])"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <CheckSquare size={17} />
        </button>

        <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

        {/* Blockquote & Divider */}
        <button
          type="button"
          onClick={() => insertLinePrefix('> ')}
          title="Scripture / Quote Block (> )"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Quote size={17} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('\n\n---\n\n')}
          title="Horizontal Divider (---)"
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <Minus size={17} />
        </button>

        {/* Callout Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setCalloutsOpen(!calloutsOpen)}
            title="Insert Theological Callout"
            className="flex items-center gap-1 min-h-[40px] sm:min-h-0 p-2 sm:p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer text-[12px]"
          >
            <Lightbulb size={17} className="text-amber-500" />
            <span className="hidden sm:inline font-medium">Callout</span>
            <ChevronDown size={12} />
          </button>

          {calloutsOpen && (
            <div 
              className="absolute left-0 top-full mt-1.5 w-56 bg-bg border border-border rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in"
              onClick={() => setCalloutsOpen(false)}
            >
              <button
                type="button"
                onClick={() => insertFormat('\n> 💡 **Theological Insight:**\n> ', '\n\n', 'Write key theological truth here...')}
                className="w-full text-left px-3 py-2.5 sm:py-1.5 text-xs rounded-xl hover:bg-surface flex items-center gap-2 text-fg cursor-pointer min-h-[40px]"
              >
                <span>💡</span>
                <span>Theological Insight</span>
              </button>
              <button
                type="button"
                onClick={() => insertFormat('\n> 🙏 **Prayer Anchor:**\n> ', '\n\n', 'Write prayer response here...')}
                className="w-full text-left px-3 py-2.5 sm:py-1.5 text-xs rounded-xl hover:bg-surface flex items-center gap-2 text-fg cursor-pointer min-h-[40px]"
              >
                <span>🙏</span>
                <span>Prayer Anchor</span>
              </button>
              <button
                type="button"
                onClick={() => insertFormat('\n> ⚠️ **Key Truth / Command:**\n> ', '\n\n', 'Write biblical mandate here...')}
                className="w-full text-left px-3 py-2.5 sm:py-1.5 text-xs rounded-xl hover:bg-surface flex items-center gap-2 text-fg cursor-pointer min-h-[40px]"
              >
                <span>⚠️</span>
                <span>Key Truth / Command</span>
              </button>
              <button
                type="button"
                onClick={() => insertFormat('\n> ✍️ **Reflection & Heart Check:**\n> ', '\n\n', 'Write personal reflection here...')}
                className="w-full text-left px-3 py-2.5 sm:py-1.5 text-xs rounded-xl hover:bg-surface flex items-center gap-2 text-fg cursor-pointer min-h-[40px]"
              >
                <span>✍️</span>
                <span>Personal Reflection</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Tools Group (Insert Verse, Templates, AI, View Mode) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Insert Verse */}
        <button
          type="button"
          onClick={onOpenInsertVerse}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 transition-all cursor-pointer shadow-2xs min-h-[40px] sm:min-h-0 shrink-0"
          title="Insert formatted Scripture verse"
        >
          <BookOpen size={15} />
          <span className="hidden sm:inline">Insert Verse</span>
        </button>

        {/* Study Templates */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-medium text-fg hover:bg-surface border border-border transition-colors cursor-pointer min-h-[40px] sm:min-h-0 shrink-0"
          title="Choose a Bible Study Template"
        >
          <LayoutTemplate size={15} />
          <span className="hidden md:inline">Templates</span>
        </button>

        {/* AI Assistant */}
        <button
          type="button"
          onClick={onOpenAiAssistant}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold text-white bg-accent hover:opacity-95 shadow-xs transition-all cursor-pointer min-h-[40px] sm:min-h-0 shrink-0"
          title="Theologica AI Study Assistant"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">AI Study</span>
        </button>

        <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block shrink-0" />

        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-surface border border-border/80 rounded-xl p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onChangeViewMode('edit')}
            className={`min-h-[38px] sm:min-h-0 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-bg text-fg shadow-2xs font-semibold'
                : 'text-muted hover:text-fg'
            }`}
            title="Edit Mode"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">Write</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('preview')}
            className={`min-h-[38px] sm:min-h-0 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-bg text-fg shadow-2xs font-semibold'
                : 'text-muted hover:text-fg'
            }`}
            title="Preview Mode"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`hidden lg:flex min-h-[38px] sm:min-h-0 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg text-xs font-medium transition-colors items-center gap-1 cursor-pointer ${
              viewMode === 'split'
                ? 'bg-bg text-fg shadow-2xs font-semibold'
                : 'text-muted hover:text-fg'
            }`}
            title="Split View (Side-by-side)"
          >
            <Columns size={14} />
            <span>Split</span>
          </button>
        </div>
      </div>
    </div>
  );
}
