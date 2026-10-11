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
  LayoutGrid,
  MoreVertical,
  Share2,
  Languages
} from 'lucide-react';
import { NodeCategory, CATEGORY_METADATA } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';

interface CanvasToolbarProps {
  boardTitle: string;
  onTitleChange: (newTitle: string) => void;
  onAddNode: (category: NodeCategory) => void;
  onOpenAi: () => void;
  onExportStudyGuide?: () => void;
  onShareBoard?: () => void;
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
  onNewCanvas?: () => void;
  onCreateFromScratch?: () => void;
  onCreateWithAi?: () => void;
}

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  scripture: BookOpen,
  theological_point: Compass,
  historical_context: HelpCircle,
  illustration: Lightbulb,
  application: Sparkles,
  word_study: Languages,
  general: FileText,
};

export function CanvasToolbar({
  boardTitle,
  onTitleChange,
  onAddNode,
  onOpenAi,
  onExportStudyGuide,
  onShareBoard,
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
  onNewCanvas,
  onCreateFromScratch,
  onCreateWithAi,
}: CanvasToolbarProps) {
  const mod = useModifierKey();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNewCanvasMenuOpen, setIsNewCanvasMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);

  const toolbarContainerRef = useRef<HTMLDivElement>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const newCanvasMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Responsive width measurement matching Study panel header
  const [availableToolsWidth, setAvailableToolsWidth] = useState<number>(1000);

  useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  useEffect(() => {
    const container = toolbarContainerRef.current;
    if (!container) return;

    const measureWidth = () => {
      const contRect = container.getBoundingClientRect();
      const leftRect = leftContainerRef.current?.getBoundingClientRect();
      const contWidth = contRect.width;
      const leftWidth = leftRect ? leftRect.width : 200;
      // Space remaining for right action tools with 16px safety gap
      const available = Math.max(0, contWidth - leftWidth - 16);
      setAvailableToolsWidth(available);
    };

    measureWidth();

    const resizeObserver = new ResizeObserver(() => {
      measureWidth();
    });

    resizeObserver.observe(container);
    if (leftContainerRef.current) {
      resizeObserver.observe(leftContainerRef.current);
    }

    window.addEventListener('resize', measureWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureWidth);
    };
  }, [boardTitle, isSidebarOpen, hasActiveBoard, nodeCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current && !addMenuRef.current.contains(target)) {
        setIsAddMenuOpen(false);
      }
      if (newCanvasMenuRef.current && !newCanvasMenuRef.current.contains(target)) {
        setIsNewCanvasMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isAddMenuOpen || isNewCanvasMenuOpen || isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAddMenuOpen, isNewCanvasMenuOpen, isMoreMenuOpen]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onTitleChange(titleInput.trim());
    } else {
      setTitleInput(boardTitle);
    }
  };

  const hasExportStudyGuide = Boolean(onExportStudyGuide);
  const hasShareBoard = Boolean(onShareBoard);
  const hasAutoArrange = Boolean(onAutoArrange);

  // Progressive collapse thresholds based on available tools width:
  // All tools expanded in bar: ~660px+
  const showStudyGuideInBar = hasExportStudyGuide && availableToolsWidth >= 660;
  const showShareInBar = hasShareBoard && availableToolsWidth >= 600;
  const showClearInBar = availableToolsWidth >= 540;
  const showAutoArrangeInBar = hasAutoArrange && availableToolsWidth >= 480;
  const showFitViewInBar = availableToolsWidth >= 420;
  const showUndoRedoInBar = availableToolsWidth >= 360;
  const showNewCanvasInBar = availableToolsWidth >= 280;
  const showAiInBar = availableToolsWidth >= 200;

  // Progressive text label thresholds:
  const showAddCardText = availableToolsWidth >= 320;
  const showAiText = availableToolsWidth >= 580;
  const showNewCanvasText = availableToolsWidth >= 650;
  const showShareText = availableToolsWidth >= 750;
  const showStudyGuideText = availableToolsWidth >= 800;

  const hasCollapsedTools = 
    (hasExportStudyGuide && !showStudyGuideInBar) ||
    (hasShareBoard && !showShareInBar) ||
    !showClearInBar ||
    (hasAutoArrange && !showAutoArrangeInBar) ||
    !showFitViewInBar ||
    !showUndoRedoInBar ||
    !showNewCanvasInBar ||
    !showAiInBar;

  return (
    <div 
      ref={toolbarContainerRef} 
      className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2"
    >
      {/* Left: Sidebar Toggle & Board Title */}
      <div 
        ref={leftContainerRef}
        className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-lg border border-border/80 bg-surface/90 text-fg backdrop-blur-md transition-all shrink-0 max-w-[50%]"
      >
        {/* Canvases Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
            isSidebarOpen 
              ? 'bg-accent text-accent-on shadow-xs' 
              : 'hover:bg-surface-hover text-fg-2 hover:text-fg'
          }`}
          title={isSidebarOpen ? 'Close Your Canvases' : 'Your Canvases'}
        >
          <PanelLeft size={16} />
          <span className="hidden md:inline">Your Canvases</span>
        </button>

        <div className="h-4 w-[1px] bg-border-soft/60 shrink-0" />

        {/* Board Title */}
        <div className="flex items-center gap-1.5 min-w-0">
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
                className="text-xs sm:text-sm font-semibold px-2 py-0.5 rounded border border-border bg-bg text-fg focus:outline-none focus:ring-1 focus:ring-accent max-w-[120px] sm:max-w-[200px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-xs sm:text-sm font-bold tracking-tight hover:text-accent transition-colors truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] text-left cursor-pointer"
                title="Click to rename canvas"
              >
                <span className="truncate">{boardTitle || 'Untitled Canvas'}</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">No Canvas</span>
              {onCreateBoard && (
                <button
                  type="button"
                  onClick={onCreateBoard}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-accent-on text-[11px] font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs"
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
            <div className="h-4 w-[1px] bg-border-soft/60 hidden lg:block shrink-0" />

            {/* Node count and save indicator */}
            <div className="hidden lg:flex items-center gap-2.5 text-xs text-muted shrink-0">
              <span className="font-mono text-[11px]">{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer"
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
                <span className="text-[11px] font-medium capitalize text-muted">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right: Actions Toolbar with Progressive Responsive Collapse */}
      <div 
        className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-xl shadow-xl border border-border/80 bg-surface/90 text-fg backdrop-blur-md transition-all shrink-0"
      >
        {/* Primary Action: Add Card Dropdown (ALWAYS visible in the bar) */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsAddMenuOpen(prev => !prev);
              setIsNewCanvasMenuOpen(false);
              setIsMoreMenuOpen(false);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Add card to canvas"
          >
            <Plus size={15} />
            {showAddCardText && <span>Add Card</span>}
            <ChevronDown size={13} className={`transition-transform duration-200 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAddMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border border-border bg-surface text-fg p-2 z-50 animate-in fade-in-50 zoom-in-95 ring-1 ring-border/50"
            >
              <div className="text-xs font-bold text-muted uppercase tracking-wider px-3 py-1.5">
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
                        onAddNode(cat);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer hover:bg-surface-hover text-fg"
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: meta.accent }}
                        />
                        <span>{cat === 'scripture' ? 'Scripture Verse...' : meta.label}</span>
                      </div>
                      <Icon size={15} className="text-muted shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* New Canvas Dropdown Button (Shown in bar when space allows) */}
        {showNewCanvasInBar && (
          <div className="relative" ref={newCanvasMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsNewCanvasMenuOpen(prev => !prev);
                setIsAddMenuOpen(false);
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border text-fg hover:border-accent hover:text-accent text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Create a new canvas"
            >
              <Plus size={14} className="text-accent shrink-0" />
              {showNewCanvasText && <span>New Canvas</span>}
              <ChevronDown size={12} className={`transition-transform duration-200 text-muted ${isNewCanvasMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNewCanvasMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border border-border bg-surface text-fg p-2 z-50 animate-in fade-in-50 zoom-in-95 ring-1 ring-border/50"
              >
                <div className="text-[11px] font-bold text-muted uppercase tracking-wider px-3 py-1.5">
                  New Canvas
                </div>
                <div className="space-y-1">
                  {/* Make from Scratch */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCanvasMenuOpen(false);
                      if (onCreateFromScratch) onCreateFromScratch();
                      else if (onCreateBoard) onCreateBoard();
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-surface-hover text-fg transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5 text-muted group-hover:text-accent group-hover:border-accent/40 transition-colors">
                      <Plus size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-fg">Make from Scratch</div>
                      <div className="text-[10px] text-muted leading-tight mt-0.5">Start with a blank canvas and add cards</div>
                    </div>
                  </button>

                  {/* Make with Theologica AI */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCanvasMenuOpen(false);
                      if (onCreateWithAi) onCreateWithAi();
                      else if (onNewCanvas) onNewCanvas();
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-surface-hover text-fg transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5 text-accent shadow-xs">
                      <Sparkles size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
                        <span>Make with Theologica AI</span>
                        <span className="text-[9px] bg-accent/15 text-accent font-bold px-1.5 py-0.2 rounded-full uppercase">AI</span>
                      </div>
                      <div className="text-[10px] text-muted leading-tight mt-0.5">Generate an inductive study canvas from passage</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theologica AI Assistant Button (Shown in bar when space allows) */}
        {showAiInBar && (
          <button
            type="button"
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-accent text-accent-on hover:opacity-95 text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer ring-1 ring-accent/30 shrink-0"
            title="Ask Theologica AI to build or expand your canvas"
          >
            <Sparkles size={14} className="shrink-0" />
            {showAiText && <span>Theologica AI</span>}
          </button>
        )}

        {/* Export Study Guide / Sermon Outline (Shown in bar when space allows) */}
        {showStudyGuideInBar && onExportStudyGuide && (
          <button
            type="button"
            onClick={onExportStudyGuide}
            disabled={!hasActiveBoard || nodeCount === 0}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
              hasActiveBoard && nodeCount > 0
                ? isDark
                  ? 'bg-zinc-800/90 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700/80 cursor-pointer shadow-xs active:scale-95'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200/80 cursor-pointer shadow-xs active:scale-95'
                : 'opacity-40 cursor-not-allowed border-transparent text-zinc-500'
            }`}
            title="Export visual canvas as a Sermon Outline or Small Group Guide"
          >
            <FileText size={14} className="text-emerald-500 shrink-0" />
            {showStudyGuideText && <span>Study Guide</span>}
          </button>
        )}

        {/* Share Board Button (Shown in bar when space allows) */}
        {showShareInBar && onShareBoard && (
          <button
            type="button"
            onClick={onShareBoard}
            disabled={!hasActiveBoard}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
              hasActiveBoard
                ? isDark
                  ? 'bg-zinc-800/90 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700/80 cursor-pointer shadow-xs active:scale-95'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200/80 cursor-pointer shadow-xs active:scale-95'
                : 'opacity-40 cursor-not-allowed border-transparent text-zinc-500'
            }`}
            title="Share read-only board link or embed code"
          >
            <Share2 size={14} className="text-cyan-400 shrink-0" />
            {showShareText && <span>Share</span>}
          </button>
        )}

        {/* Undo/Redo Divider & Buttons (Shown in bar when space allows) */}
        {showUndoRedoInBar && (
          <>
            <div className="h-4 w-[1px] bg-border-soft/60 mx-0.5 shrink-0" />

            {/* Undo Button */}
            <button
              type="button"
              onClick={onUndo}
              disabled={!hasActiveBoard || !canUndo}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                hasActiveBoard && canUndo 
                  ? 'hover:bg-surface-hover text-fg cursor-pointer active:scale-90' 
                  : 'opacity-30 cursor-not-allowed text-muted'
              }`}
              title={`Undo (${mod.symbol}Z)`}
            >
              <Undo2 size={16} />
            </button>

            {/* Redo Button */}
            <button
              type="button"
              onClick={onRedo}
              disabled={!hasActiveBoard || !canRedo}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                hasActiveBoard && canRedo 
                  ? 'hover:bg-surface-hover text-fg cursor-pointer active:scale-90' 
                  : 'opacity-30 cursor-not-allowed text-muted'
              }`}
              title={`Redo (${mod.symbol}${mod.shift}Z)`}
            >
              <Redo2 size={16} />
            </button>
          </>
        )}

        {/* Canvas Utilities Divider & Buttons (Shown in bar when space allows) */}
        {(showAutoArrangeInBar || showFitViewInBar || showClearInBar) && (
          <div className="h-4 w-[1px] bg-border-soft/60 mx-0.5 shrink-0" />
        )}

        {/* Auto Arrange */}
        {showAutoArrangeInBar && onAutoArrange && (
          <button
            type="button"
            onClick={onAutoArrange}
            disabled={!hasActiveBoard || nodeCount === 0}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              hasActiveBoard && nodeCount > 0
                ? 'hover:bg-surface-hover text-fg-2 hover:text-fg cursor-pointer active:scale-90'
                : 'opacity-30 cursor-not-allowed text-muted'
            }`}
            title="Auto Arrange Cards (Tidy layout)"
          >
            <LayoutGrid size={16} />
          </button>
        )}

        {/* Fit View */}
        {showFitViewInBar && (
          <button
            type="button"
            onClick={onFitView}
            disabled={!hasActiveBoard || nodeCount === 0}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              hasActiveBoard && nodeCount > 0
                ? 'hover:bg-surface-hover text-fg-2 hover:text-fg cursor-pointer active:scale-90'
                : 'opacity-30 cursor-not-allowed text-muted'
            }`}
            title="Fit view to all cards"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {/* Clear Board */}
        {showClearInBar && (
          <button
            type="button"
            onClick={onClear}
            disabled={!hasActiveBoard || nodeCount === 0}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              hasActiveBoard && nodeCount > 0
                ? 'hover:bg-rose-500/20 text-muted hover:text-rose-400 cursor-pointer active:scale-90'
                : 'opacity-30 cursor-not-allowed text-muted'
            }`}
            title="Clear canvas"
          >
            <Trash2 size={16} />
          </button>
        )}

        {/* 3-Dots More Menu: Activates whenever tools are collapsed due to limited width */}
        {hasCollapsedTools && (
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(prev => !prev);
                setIsAddMenuOpen(false);
                setIsNewCanvasMenuOpen(false);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMoreMenuOpen 
                  ? 'bg-accent text-accent-on ring-1 ring-border-soft' 
                  : 'hover:bg-surface-hover text-fg-2 hover:text-fg'
              }`}
              title="More canvas tools & options"
              aria-label="More canvas tools"
            >
              <MoreVertical size={18} className="pointer-events-none" />
            </button>

            {isMoreMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl shadow-2xl border border-border bg-surface text-fg p-2 z-50 animate-in fade-in-50 zoom-in-95 ring-1 ring-border/50 max-h-[calc(100vh-100px)] overflow-y-auto space-y-1 select-none"
              >
                {/* Theologica AI (when collapsed from bar) */}
                {!showAiInBar && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenAi();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent/10 hover:bg-accent/20 text-accent transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={15} className="text-accent shrink-0" />
                      <span>Theologica AI</span>
                    </div>
                    <span className="text-[9px] bg-accent text-accent-on font-bold px-1.5 py-0.5 rounded-full uppercase">AI</span>
                  </button>
                )}

                {/* New Canvas options (when collapsed from bar) */}
                {!showNewCanvasInBar && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 py-1">
                      New Canvas
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        if (onCreateFromScratch) onCreateFromScratch();
                        else if (onCreateBoard) onCreateBoard();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-surface-hover text-fg transition-colors cursor-pointer"
                    >
                      <Plus size={15} className="text-muted shrink-0" />
                      <span>New Blank Canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        if (onCreateWithAi) onCreateWithAi();
                        else if (onNewCanvas) onNewCanvas();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-surface-hover text-accent transition-colors cursor-pointer"
                    >
                      <Sparkles size={15} className="text-accent shrink-0" />
                      <span>New with Theologica AI</span>
                    </button>
                  </div>
                )}

                {/* Separator if needed */}
                {(!showAiInBar || !showNewCanvasInBar) && (
                  <div className="border-t my-1 border-border" />
                )}

                {/* Export Study Guide (when collapsed from bar) */}
                {!showStudyGuideInBar && hasExportStudyGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onExportStudyGuide?.();
                    }}
                    disabled={!hasActiveBoard || nodeCount === 0}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      hasActiveBoard && nodeCount > 0 
                        ? 'hover:bg-surface-hover text-fg cursor-pointer'
                        : 'opacity-30 cursor-not-allowed text-muted'
                    }`}
                  >
                    <FileText size={15} className="text-emerald-500 shrink-0" />
                    <span>Export Study Guide</span>
                  </button>
                )}

                {/* Share Canvas (when collapsed from bar) */}
                {!showShareInBar && hasShareBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onShareBoard?.();
                    }}
                    disabled={!hasActiveBoard}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      hasActiveBoard 
                        ? 'hover:bg-surface-hover text-fg cursor-pointer'
                        : 'opacity-30 cursor-not-allowed text-muted'
                    }`}
                  >
                    <Share2 size={15} className="text-cyan-400 shrink-0" />
                    <span>Share Canvas</span>
                  </button>
                )}

                {/* Fit View (when collapsed from bar) */}
                {!showFitViewInBar && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onFitView();
                    }}
                    disabled={!hasActiveBoard || nodeCount === 0}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      hasActiveBoard && nodeCount > 0 
                        ? 'hover:bg-surface-hover text-fg cursor-pointer'
                        : 'opacity-30 cursor-not-allowed text-muted'
                    }`}
                  >
                    <Maximize2 size={15} className="shrink-0" />
                    <span>Fit All Cards</span>
                  </button>
                )}

                {/* Auto Arrange (when collapsed from bar) */}
                {!showAutoArrangeInBar && hasAutoArrange && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onAutoArrange?.();
                    }}
                    disabled={!hasActiveBoard || nodeCount === 0}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      hasActiveBoard && nodeCount > 0 
                        ? 'hover:bg-surface-hover text-fg cursor-pointer'
                        : 'opacity-30 cursor-not-allowed text-muted'
                    }`}
                  >
                    <LayoutGrid size={15} className="shrink-0" />
                    <span>Auto Arrange Cards</span>
                  </button>
                )}

                {/* Undo / Redo (when collapsed from bar) */}
                {!showUndoRedoInBar && (
                  <>
                    <div className="border-t my-1 border-border" />
                    <div className="flex items-center gap-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          onUndo();
                        }}
                        disabled={!hasActiveBoard || !canUndo}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          hasActiveBoard && canUndo 
                            ? 'hover:bg-surface-hover text-fg cursor-pointer'
                            : 'opacity-30 cursor-not-allowed text-muted'
                        }`}
                        title={`Undo (${mod.symbol}Z)`}
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
                            ? 'hover:bg-surface-hover text-fg cursor-pointer'
                            : 'opacity-30 cursor-not-allowed text-muted'
                        }`}
                        title={`Redo (${mod.symbol}${mod.shift}Z)`}
                      >
                        <Redo2 size={14} />
                        <span>Redo</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Clear Canvas (when collapsed from bar) */}
                {!showClearInBar && (
                  <>
                    <div className="border-t my-1 border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
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
                  </>
                )}

                {/* Dropdown Footer: Node count & Save status */}
                <div className="px-3 pt-2 pb-1 border-t border-border/60 text-[10px] text-muted flex items-center justify-between">
                  <span>{nodeCount} {nodeCount === 1 ? 'card' : 'cards'}</span>
                  <span className="capitalize">{saveStatus}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
