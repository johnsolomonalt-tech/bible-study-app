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
  LayoutGrid,
  MoreHorizontal
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
  onSave?: () => void;
  theme: 'dark' | 'light';
  nodeCount: number;
  hasActiveBoard?: boolean;
  onCreateBoard?: () => void;
  onOpenAddVerse?: () => void;
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
  onSave,
  theme,
  nodeCount,
  hasActiveBoard = true,
  onCreateBoard,
  onOpenAddVerse,
}: CanvasToolbarProps) {
  const mod = useModifierKey();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isAddMenuOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddMenuOpen, isMobileMenuOpen]);

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
          {hasActiveBoard ? (
            isEditingTitle ? (
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
            )
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">No Canvas</span>
              {onCreateBoard && (
                <button
                  type="button"
                  onClick={onCreateBoard}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-white text-[11px] font-semibold hover:bg-accent/90 transition-all cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Create</span>
                </button>
              )}
            </div>
          )}
        </div>

        {hasActiveBoard && (
          <>
            <div className="h-4 w-[1px] bg-zinc-700/40 hidden sm:block" />

            {/* Node count and save indicator */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-zinc-400">
              <span className="font-mono text-[11px]">{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-zinc-700/20 transition-colors cursor-pointer"
                title={saveStatus === 'saving' ? 'Saving changes...' : saveStatus === 'unsaved' ? 'Unsaved changes (Click or Cmd+S to save)' : 'All changes saved (Click or Cmd+S to save)'}
              >
                <span 
                  className={`w-2 h-2 rounded-full transition-all ${
                    saveStatus === 'saving' 
                      ? 'bg-amber-400 animate-ping' 
                      : saveStatus === 'unsaved'
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                  }`} 
                />
                <span className="text-[11px] font-medium capitalize text-zinc-400">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right: Actions Toolbar */}
      <div 
        className={`pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
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
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Add card to canvas"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Card</span>
            <ChevronDown size={13} className={`transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
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
                        setIsAddMenuOpen(false);
                        if (cat === 'scripture' && onOpenAddVerse) {
                          onOpenAddVerse();
                        } else {
                          onAddNode(cat);
                        }
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
                        <span>{cat === 'scripture' ? 'Scripture Verse...' : meta.label}</span>
                      </div>
                      <Icon size={15} className="text-zinc-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Verse Button - desktop only */}
        {onOpenAddVerse && (
          <button
            type="button"
            onClick={onOpenAddVerse}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer ${
              isDark
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-400 hover:bg-amber-500/25 active:scale-95'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 active:scale-95'
            }`}
            title="Search and add a Bible verse directly to Canvas"
          >
            <BookOpen size={14} className="shrink-0" />
            <span className="hidden md:inline">Add Verse</span>
          </button>
        )}

        {/* Theologica AI Assistant Button */}
        <button
          type="button"
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent to-amber-600 hover:from-accent/90 hover:to-amber-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          title="Ask Theologica AI to architect or expand your canvas"
        >
          <Sparkles size={14} className="animate-pulse text-amber-200 shrink-0" />
          <span className="hidden md:inline">Theologica AI</span>
        </button>

        {/* Desktop-only Action Buttons */}
        <div className="hidden sm:block h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Undo Button - desktop */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!hasActiveBoard || !canUndo}
          className={`hidden sm:block p-1.5 rounded-lg transition-colors ${
            hasActiveBoard && canUndo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90 hover:text-white' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title={`Undo (${mod.symbol}Z)`}
        >
          <Undo2 size={16} />
        </button>

        {/* Redo Button - desktop */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!hasActiveBoard || !canRedo}
          className={`hidden sm:block p-1.5 rounded-lg transition-colors ${
            hasActiveBoard && canRedo 
              ? 'hover:bg-zinc-700/30 text-zinc-200 cursor-pointer active:scale-90 hover:text-white' 
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title={`Redo (${mod.symbol}${mod.shift}Z)`}
        >
          <Redo2 size={16} />
        </button>

        <div className="hidden sm:block h-4 w-[1px] bg-zinc-700/40 mx-0.5" />

        {/* Auto Arrange - desktop */}
        {onAutoArrange && (
          <button
            type="button"
            onClick={onAutoArrange}
            disabled={!hasActiveBoard || nodeCount === 0}
            className={`hidden sm:block p-1.5 rounded-lg transition-colors ${
              hasActiveBoard && nodeCount > 0
                ? 'hover:bg-zinc-700/30 text-zinc-300 hover:text-white cursor-pointer active:scale-90'
                : 'opacity-30 cursor-not-allowed text-zinc-500'
            }`}
            title="Auto Arrange Cards (Tidy layout)"
          >
            <LayoutGrid size={16} />
          </button>
        )}

        {/* Fit View - desktop */}
        <button
          type="button"
          onClick={onFitView}
          disabled={!hasActiveBoard || nodeCount === 0}
          className={`hidden sm:block p-1.5 rounded-lg transition-colors ${
            hasActiveBoard && nodeCount > 0
              ? 'hover:bg-zinc-700/30 text-zinc-300 hover:text-white cursor-pointer active:scale-90'
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title="Fit view to all cards"
        >
          <Maximize2 size={16} />
        </button>

        {/* Clear Board - desktop */}
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveBoard || nodeCount === 0}
          className={`hidden sm:block p-1.5 rounded-lg transition-colors ${
            hasActiveBoard && nodeCount > 0
              ? 'hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 cursor-pointer active:scale-90'
              : 'opacity-30 cursor-not-allowed text-zinc-500'
          }`}
          title="Clear canvas"
        >
          <Trash2 size={16} />
        </button>

        {/* Mobile More Actions Menu */}
        <div className="relative sm:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isMobileMenuOpen 
                ? 'bg-accent text-white' 
                : isDark 
                  ? 'hover:bg-zinc-800 text-zinc-300' 
                  : 'hover:bg-zinc-100 text-zinc-700'
            }`}
            title="More canvas actions"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMobileMenuOpen && (
            <div 
              className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in-50 zoom-in-95 ${
                isDark 
                  ? 'bg-[#222226] border-zinc-700 text-zinc-200' 
                  : 'bg-white border-zinc-200 text-zinc-800 shadow-xl'
              }`}
            >
              {onOpenAddVerse && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAddVerse();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-zinc-800 text-amber-400' : 'hover:bg-zinc-100 text-amber-700'
                  }`}
                >
                  <BookOpen size={15} />
                  <span>Add Bible Verse</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onFitView();
                }}
                disabled={!hasActiveBoard || nodeCount === 0}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  hasActiveBoard && nodeCount > 0 
                    ? isDark ? 'hover:bg-zinc-800 text-zinc-200 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-700 cursor-pointer'
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <Maximize2 size={15} />
                <span>Fit All Cards</span>
              </button>

              {onAutoArrange && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onAutoArrange();
                  }}
                  disabled={!hasActiveBoard || nodeCount === 0}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    hasActiveBoard && nodeCount > 0 
                      ? isDark ? 'hover:bg-zinc-800 text-zinc-200 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-700 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span>Auto Arrange Layout</span>
                </button>
              )}

              <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

              <div className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    onUndo();
                  }}
                  disabled={!hasActiveBoard || !canUndo}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasActiveBoard && canUndo 
                      ? isDark ? 'hover:bg-zinc-800 text-zinc-200 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-700 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Undo2 size={14} />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRedo();
                  }}
                  disabled={!hasActiveBoard || !canRedo}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasActiveBoard && canRedo 
                      ? isDark ? 'hover:bg-zinc-800 text-zinc-200 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-700 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Redo2 size={14} />
                  <span>Redo</span>
                </button>
              </div>

              <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onClear();
                }}
                disabled={!hasActiveBoard || nodeCount === 0}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  hasActiveBoard && nodeCount > 0 
                    ? 'text-rose-400 hover:bg-rose-500/10 cursor-pointer' 
                    : 'opacity-30 cursor-not-allowed text-zinc-500'
                }`}
              >
                <Trash2 size={15} />
                <span>Clear Canvas</span>
              </button>

              <div className="px-3 pt-2 pb-1 border-t border-zinc-700/40 text-[10px] text-zinc-500 flex items-center justify-between">
                <span>{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
                <span className="capitalize">{saveStatus}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
