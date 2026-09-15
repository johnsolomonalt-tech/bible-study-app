"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  Undo2, 
  Redo2, 
  Maximize2, 
  Trash2, 
  BookOpen, 
  Compass, 
  HelpCircle, 
  Lightbulb, 
  FileText,
  ChevronDown,
  PanelLeft,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { NodeCategory, CATEGORY_METADATA } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';

interface CanvasToolbarProps {
  boardTitle: string;
  onTitleChange: (newTitle: string) => void;
  onAddNode: (category: NodeCategory) => void;
  onOpenAi: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFitView: () => void;
  onAutoArrange?: () => void;
  onClear: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
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
  onOpenAi,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFitView,
  onAutoArrange,
  onClear,
  isSidebarOpen,
  onToggleSidebar,
  saveStatus = 'saved',
  theme,
  nodeCount,
}: CanvasToolbarProps) {
  const mod = useModifierKey();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const addMenuRef = useRef<HTMLDivElement>(null);
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
      {/* Left: Sidebar Toggle & Board Title */}
      <div 
        className={`pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-xl shadow-lg border backdrop-blur-md transition-all ${
          isDark 
            ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-100' 
            : 'bg-white/95 border-zinc-200/90 text-zinc-800'
        }`}
      >
        {/* Canvases Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            isSidebarOpen 
              ? 'bg-accent text-white shadow-sm' 
              : isDark 
                ? 'hover:bg-zinc-700/40 text-zinc-300' 
                : 'hover:bg-zinc-100 text-zinc-700'
          }`}
          title={isSidebarOpen ? 'Close Canvases Sidebar' : 'View All Canvases'}
        >
          <PanelLeft size={16} />
          <span className="hidden md:inline">Boards</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-700/40" />

        {/* Board Title */}
        <div className="flex items-center gap-1.5">
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
              className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-accent ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-600 text-white' 
                  : 'bg-zinc-100 border-zinc-300 text-zinc-900'
              }`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="text-xs sm:text-sm font-bold tracking-tight hover:text-accent transition-colors truncate max-w-[140px] sm:max-w-[220px] text-left cursor-pointer"
              title="Click to rename canvas"
            >
              <span className="truncate">{boardTitle || 'Untitled Canvas'}</span>
            </button>
          )}
        </div>

        <div className="h-4 w-[1px] bg-zinc-700/40 hidden sm:block" />

        {/* Node count and save indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-mono text-[11px]">{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Saved" />
        </div>
      </div>

      {/* Right: Actions Toolbar */}
      <div 
        className={`pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
          isDark 
            ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-200' 
            : 'bg-white/95 border-zinc-200/90 text-zinc-700'
        }`}
      >
        {/* Add Card Dropdown */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Add card to canvas"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Card</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAddMenuOpen && (
            <div 
              className={`absolute right-0 sm:left-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in-50 zoom-in-95 ${
                isDark 
                  ? 'bg-[#222226] border-zinc-700 text-zinc-200' 
                  : 'bg-white border-zinc-200 text-zinc-800 shadow-xl'
              }`}
            >
              <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1.5">
                Add Card
              </div>
              <div className="space-y-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: meta.accent }}
                        />
                        <span>{meta.label}</span>
                      </div>
                      <Icon size={15} className="text-zinc-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Theologica AI Assistant Button */}
        <button
          type="button"
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent to-amber-600 hover:from-accent/90 hover:to-amber-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          title="Ask Theologica AI to architect or expand your canvas"
        >
          <Sparkles size={14} className="animate-pulse text-amber-200" />
          <span className="hidden md:inline">Theologica AI</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Undo Button */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors ${
            canUndo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90 hover:text-white' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title={`Undo (${mod.symbol}Z)`}
        >
          <Undo2 size={16} />
        </button>

        {/* Redo Button */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors ${
            canRedo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90 hover:text-white' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title={`Redo (${mod.symbol}${mod.shift}Z)`}
        >
          <Redo2 size={16} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Auto Arrange */}
        {onAutoArrange && (
          <button
            type="button"
            onClick={onAutoArrange}
            className="p-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
            title="Auto Arrange Cards (Tidy layout)"
          >
            <LayoutGrid size={16} />
          </button>
        )}

        {/* Fit View */}
        <button
          type="button"
          onClick={onFitView}
          className="p-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-90"
          title="Fit view to all cards"
        >
          <Maximize2 size={16} />
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
