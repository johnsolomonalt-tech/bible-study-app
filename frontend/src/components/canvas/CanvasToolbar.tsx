"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  Undo2, 
  Redo2, 
  Maximize2, 
  Trash2, 
  Download, 
  Upload, 
  BookOpen, 
  Compass, 
  HelpCircle, 
  Lightbulb, 
  FileText,
  Check,
  ChevronDown,
  FileCode
} from 'lucide-react';
import { NodeCategory, CATEGORY_METADATA } from '@/types/canvas';

interface CanvasToolbarProps {
  boardTitle: string;
  onTitleChange: (newTitle: string) => void;
  onAddNode: (category: NodeCategory) => void;
  onOpenGemini: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFitView: () => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  theme: 'dark' | 'light';
  nodeCount: number;
}

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  scripture: BookOpen,
  theological_point: Compass,
  historical_context: HelpCircle,
  illustration: Lightbulb,
  application: Sparkles,
  general: FileText,
};

export function CanvasToolbar({
  boardTitle,
  onTitleChange,
  onAddNode,
  onOpenGemini,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFitView,
  onClear,
  onExport,
  onImport,
  saveStatus = 'saved',
  theme,
  nodeCount,
}: CanvasToolbarProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddMenuOpen]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onTitleChange(titleInput.trim());
    } else {
      setTitleInput(boardTitle);
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
      {/* Left: Board Title & Save Status */}
      <div 
        className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-xl shadow-lg border backdrop-blur-md transition-all ${
          isDark 
            ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-100' 
            : 'bg-white/95 border-zinc-200/90 text-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(boardTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className={`text-sm font-semibold px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-accent ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-600 text-white' 
                  : 'bg-zinc-100 border-zinc-300 text-zinc-900'
              }`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-bold tracking-tight hover:text-accent transition-colors flex items-center gap-1.5 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate text-left"
              title="Click to rename canvas"
            >
              <span className="truncate">{boardTitle || 'Untitled Canvas'}</span>
            </button>
          )}
        </div>

        <div className="h-4 w-[1px] bg-zinc-700/40" />

        {/* Node count and save indicator */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-mono text-[11px]">{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Saved locally" />
          <span className="text-[11px] hidden sm:inline text-zinc-400">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>

      {/* Center / Right: Action Controls Toolbar */}
      <div 
        className={`pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
          isDark 
            ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-200' 
            : 'bg-white/95 border-zinc-200/90 text-zinc-700'
        }`}
      >
        {/* Add Node Dropdown */}
        <div className="relative" ref={addMenuRef}>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => onAddNode('general')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 active:scale-95 transition-all shadow-sm"
              title="Add general note"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Card</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="p-1.5 rounded-r-lg bg-accent/90 text-white text-xs hover:bg-accent border-l border-white/20 active:scale-95 transition-all"
              title="Select card type"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {isAddMenuOpen && (
            <div 
              className={`absolute left-0 top-full mt-1.5 w-56 rounded-xl shadow-2xl border p-1.5 z-50 animate-in fade-in-50 zoom-in-95 ${
                isDark 
                  ? 'bg-[#222226] border-zinc-700 text-zinc-200' 
                  : 'bg-white border-zinc-200 text-zinc-800 shadow-xl'
              }`}
            >
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Card Categories
              </div>
              {(Object.keys(CATEGORY_METADATA) as NodeCategory[]).map((cat) => {
                const meta = CATEGORY_METADATA[cat];
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onAddNode(cat);
                      setIsAddMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: meta.accent }}
                      />
                      <span>{meta.label}</span>
                    </div>
                    <Icon size={13} className="text-zinc-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Gemini AI Assistant Button */}
        <button
          type="button"
          onClick={onOpenGemini}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
          title="Ask Gemini 3 Flash to manipulate or expand canvas"
        >
          <Sparkles size={14} className="animate-pulse text-amber-300" />
          <span className="hidden md:inline">Gemini AI</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors ${
            canUndo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors ${
            canRedo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Fit View */}
        <button
          type="button"
          onClick={onFitView}
          className="p-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
          title="Fit view to all cards"
        >
          <Maximize2 size={16} />
        </button>

        {/* Export JSON */}
        <button
          type="button"
          onClick={onExport}
          className="p-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
          title="Export canvas as JSON"
        >
          <Download size={16} />
        </button>

        {/* Import JSON */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImport}
          accept=".json"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
          title="Import canvas JSON"
        >
          <Upload size={16} />
        </button>

        {/* Clear Board */}
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer active:scale-90"
          title="Clear canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
