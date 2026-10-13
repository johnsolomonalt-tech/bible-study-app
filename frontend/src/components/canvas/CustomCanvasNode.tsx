"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeProps, useReactFlow } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  MoreVertical, 
  Trash2, 
  Copy, 
  Edit3, 
  Eye, 
  Check, 
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Compass,
  FileText,
  Link2,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Languages
} from 'lucide-react';
import { CanvasNodeData, NodeCategory, CATEGORY_METADATA } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';
import { createMarkdownComponents, parseVerseReference } from '@/lib/bibleReferences';

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  scripture: BookOpen,
  theological_point: Compass,
  historical_context: HelpCircle,
  illustration: Lightbulb,
  application: Sparkles,
  word_study: Languages,
  general: FileText,
};

export const CustomCanvasNode = memo(function CustomCanvasNode(
  props: NodeProps & { data: CanvasNodeData; style?: React.CSSProperties }
) {
  const { id, data, selected, width, height, style } = props;
  const mod = useModifierKey();
  const { setNodes, getZoom } = useReactFlow();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content || '');
  const [editTitle, setEditTitle] = useState(data.title || '');
  const [showPreviewToggle, setShowPreviewToggle] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnectSubmenuOpen, setIsConnectSubmenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleDivRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute menu counter-scale on demand only when the menu is open so cards do not
  // subscribe to useViewport() and re-render on every pan/zoom animation frame.
  const currentZoom = isMenuOpen ? getZoom() : 1;
  const menuScale = Math.min(Math.max(1 / Math.max(currentZoom, 0.1), 1), 3.2);

  const theme = data.theme || 'dark';
  const isDark = theme === 'dark';
  const categoryMeta = CATEGORY_METADATA[data.category] || CATEGORY_METADATA.general;
  const CategoryIcon = CATEGORY_ICONS[data.category] || FileText;

  const markdownComponents = React.useMemo(() => {
    return createMarkdownComponents(data.onVerseClick);
  }, [data.onVerseClick]);

  const parsedTitleRef = React.useMemo(() => {
    return parseVerseReference(editTitle || data.title || '');
  }, [editTitle, data.title]);

  // Keep local state synced if data updates externally
  useEffect(() => {
    setEditContent(data.content || '');
    setEditTitle(data.title || '');
    if (titleDivRef.current && document.activeElement !== titleDivRef.current) {
      titleDivRef.current.textContent = data.title || '';
    }
  }, [data.content, data.title]);

  // Focus textarea on edit mode start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsConnectSubmenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const commitChanges = () => {
    setIsEditing(false);
    const finalTitle = (titleDivRef.current?.textContent || editTitle).trim() || 'Untitled Card';
    setEditTitle(finalTitle);
    if (data.onUpdate) {
      data.onUpdate(id, {
        content: editContent,
        title: finalTitle,
      });
    }
  };

  const handleTitleBlur = () => {
    const finalTitle = (titleDivRef.current?.textContent || editTitle).trim() || 'Untitled Card';
    setEditTitle(finalTitle);
    if (data.onUpdate && finalTitle !== data.title) {
      data.onUpdate(id, { title: finalTitle });
    }
  };

  const handleCategoryChange = (newCat: NodeCategory) => {
    setIsMenuOpen(false);
    if (data.onUpdate) {
      data.onUpdate(id, { category: newCat });
    }
  };

  const handleBaseClasses = `!w-3 !h-3 !bg-muted !border-2 !border-[var(--bg)] !rounded-full transition-all duration-150 cursor-crosshair z-10 before:absolute before:-inset-2.5 before:content-[''] hover:!scale-125 hover:!bg-accent ${
    selected ? '!opacity-90' : 'opacity-40 group-hover:opacity-100'
  }`;

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
        setIsMenuOpen(true);
      }}
      className={`relative group rounded-xl transition-shadow duration-150 select-none w-[310px] sm:w-[380px] max-w-[calc(100vw-32px)] ${
        isMenuOpen ? '!z-50' : selected ? 'z-30' : 'z-0'
      } bg-surface text-fg border border-border shadow-[0_8px_30px_rgba(0,0,0,0.15)] backdrop-blur-md ${
        selected 
          ? 'ring-2 ring-accent border-accent/80 shadow-2xl' 
          : 'hover:border-border-soft hover:shadow-xl'
      }`}
      style={{
        width: width || (style as any)?.width || 380,
        height: height || (style as any)?.height || undefined,
        minWidth: 240,
        minHeight: 160,
      }}
    >
      {/* Node Resizer */}
      <NodeResizer
        isVisible={selected}
        minWidth={240}
        minHeight={150}
        lineClassName="border-accent"
        handleClassName="!w-3 !h-3 !bg-accent !border-2 !border-white !rounded-full shadow-md"
        onResizeEnd={(_event, params) => {
          data.onResizeEnd?.(id, Math.round(params.width), Math.round(params.height));
        }}
      />

      {/* Perimeter Connection Handles (Top, Right, Bottom, Left) */}
      {/* Top Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={handleBaseClasses}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={handleBaseClasses}
      />

      {/* Right Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={handleBaseClasses}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={handleBaseClasses}
      />

      {/* Bottom Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={handleBaseClasses}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={handleBaseClasses}
      />

      {/* Left Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={handleBaseClasses}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={handleBaseClasses}
      />

      {/* Card Header */}
      <div 
        className="flex items-start justify-between px-3.5 py-2.5 border-b border-border rounded-t-xl gap-2 bg-surface-warm/40"
      >
        {/* Category Badge & Multi-Line Flowing Title */}
        <div className="flex-1 min-w-0 after:content-[''] after:table after:clear-both">
          {/* Floated Badge so multi-line titles wrap underneath into the open space on the left */}
          <div className="float-left mr-2 mb-1 shrink-0">
            {parsedTitleRef && data.onVerseClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onVerseClick?.(parsedTitleRef.book, parsedTitleRef.chapter, parsedTitleRef.verse);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase border transition-all hover:scale-105 cursor-pointer shadow-xs select-none ${
                  isDark
                    ? `${categoryMeta.bgDark} ${categoryMeta.borderDark} ${categoryMeta.textDark} hover:brightness-125`
                    : `${categoryMeta.bgLight} ${categoryMeta.borderLight} ${categoryMeta.textLight} hover:brightness-95`
                }`}
                style={{ borderColor: categoryMeta.accent }}
                title={`Open ${parsedTitleRef.book} ${parsedTitleRef.chapter}:${parsedTitleRef.verse} in Bible reader`}
              >
                <CategoryIcon size={12} style={{ color: categoryMeta.accent }} />
                <span>{categoryMeta.label}</span>
                <ExternalLink size={10} className="opacity-75 ml-0.5" />
              </button>
            ) : (
              <div 
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase border select-none ${
                  isDark ? `${categoryMeta.bgDark} ${categoryMeta.borderDark} ${categoryMeta.textDark}` : `${categoryMeta.bgLight} ${categoryMeta.borderLight} ${categoryMeta.textLight}`
                }`}
                style={{ borderColor: categoryMeta.accent }}
              >
                <CategoryIcon size={12} style={{ color: categoryMeta.accent }} />
                <span>{categoryMeta.label}</span>
              </div>
            )}
          </div>

          {/* Inline Multi-Line Flowing Title Input */}
          <div
            ref={titleDivRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            data-placeholder="Card Title..."
            onInput={(e) => {
              const val = e.currentTarget.textContent || '';
              setEditTitle(val);
            }}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              e.stopPropagation();
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTitleBlur();
                (e.target as HTMLElement).blur();
              }
            }}
            className="nodrag text-[13px] font-semibold leading-snug focus:outline-none focus:ring-1 focus:ring-accent/50 rounded px-1 py-0.5 break-words whitespace-pre-wrap text-fg empty:before:content-[attr(data-placeholder)] empty:before:text-muted empty:before:pointer-events-none cursor-text select-text"
          />
        </div>

        {/* Action Buttons & Dropdown */}
        <div className="relative shrink-0 flex items-center gap-1 mt-0.5" ref={menuRef}>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPreviewToggle(!showPreviewToggle)}
                className={`p-1 rounded hover:bg-zinc-700/30 text-xs transition-colors ${
                  showPreviewToggle ? 'text-accent' : 'text-zinc-400'
                }`}
                title={showPreviewToggle ? 'Show Editor' : 'Show Preview'}
              >
                {showPreviewToggle ? <Edit3 size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={commitChanges}
                className="p-1 bg-accent text-white rounded hover:bg-accent/80 transition-colors shadow-sm"
                title="Save"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              {(data.category === 'scripture' || parsedTitleRef) && data.onSpawnCrossReferences && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const ref = parsedTitleRef 
                      ? `${parsedTitleRef.book} ${parsedTitleRef.chapter}:${parsedTitleRef.verse}` 
                      : data.title;
                    data.onSpawnCrossReferences?.(id, ref);
                  }}
                  className={`px-1.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                    isDark 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                  }`}
                  title="Spawn cross-reference scripture nodes"
                >
                  <GitBranch size={12} className="text-amber-500 shrink-0" />
                  <span className="hidden sm:inline">Cross-Refs</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
                title="Edit Card"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer ${
                  isMenuOpen ? 'bg-surface-warm text-fg' : ''
                }`}
                title="Card options"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          )}

          {/* Quick Action Dropdown */}
          {isMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl shadow-2xl border border-border bg-surface text-fg p-2 z-50 animate-in fade-in-50 zoom-in-95 ring-1 ring-border/50"
              style={{
                transform: `scale(${menuScale})`,
                transformOrigin: 'top right',
              }}
            >
              <div className="text-xs font-bold text-muted uppercase tracking-wider px-3 py-1.5">
                Change Category
              </div>
              <div className="space-y-1 mb-1.5">
                {(Object.keys(CATEGORY_METADATA) as NodeCategory[]).map((cat) => {
                  const meta = CATEGORY_METADATA[cat];
                  const Icon = CATEGORY_ICONS[cat];
                  const isSelected = data.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-surface-warm text-fg font-semibold' 
                          : 'hover:bg-surface-hover text-fg-2 hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: meta.accent }}
                        />
                        <span>{meta.label}</span>
                      </div>
                      <Icon size={15} className="text-muted shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="border-t my-1.5 border-border" />

              {/* Spawn Cross-References */}
              {(data.category === 'scripture' || parsedTitleRef) && data.onSpawnCrossReferences && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    const ref = parsedTitleRef 
                      ? `${parsedTitleRef.book} ${parsedTitleRef.chapter}:${parsedTitleRef.verse}` 
                      : data.title;
                    data.onSpawnCrossReferences?.(id, ref);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer mb-1 hover:bg-amber-500/15 text-amber-500"
                  title="Spawn and link cross-reference verses from Treasury of Scripture Knowledge"
                >
                  <div className="flex items-center gap-2.5">
                    <GitBranch size={16} className="text-amber-500 shrink-0" />
                    <span className="font-semibold">Spawn Cross-Refs</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">
                    TSK
                  </span>
                </button>
              )}

              {/* Add Connection */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsConnectSubmenuOpen(!isConnectSubmenuOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Link2 size={16} className="text-accent shrink-0" />
                    <span>Add Connection...</span>
                  </div>
                  <ChevronRight size={15} className={`text-zinc-400 transition-transform duration-150 ${isConnectSubmenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {isConnectSubmenuOpen && (
                  <div className={`my-1.5 py-1.5 pl-3 border-l-2 max-h-48 overflow-y-auto space-y-1 custom-scroll ${
                    isDark ? 'border-zinc-700' : 'border-zinc-200'
                  }`}>
                    {data.otherNodes && data.otherNodes.filter((n: any) => n.id !== id).length > 0 ? (
                      data.otherNodes.filter((n: any) => n.id !== id).map((target: any) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsConnectSubmenuOpen(false);
                            if (data.onConnectTo) data.onConnectTo(id, target.id);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium truncate text-left transition-colors cursor-pointer ${
                            isDark ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-black'
                          }`}
                          title={`Connect to ${target.title}`}
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                            style={{ backgroundColor: (CATEGORY_METADATA as any)[target.category]?.accent || '#71717a' }}
                          />
                          <span className="truncate">{target.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-1.5 text-xs text-zinc-500 italic">
                        No other cards on canvas
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`border-t my-1.5 ${isDark ? 'border-zinc-700/60' : 'border-zinc-100'}`} />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditing(true);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Edit3 size={15} className="shrink-0" />
                <span>Edit Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (data.onDuplicate) data.onDuplicate(id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer hover:bg-surface-hover text-fg-2 hover:text-fg"
              >
                <Copy size={15} className="shrink-0" />
                <span>Duplicate Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (data.onDelete) data.onDelete(id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 size={15} className="shrink-0" />
                <span>Delete Card</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div 
        className="p-3.5 min-h-[120px] text-sm overflow-hidden"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {isEditing ? (
          showPreviewToggle ? (
            /* Live Markdown Preview */
            <div className="prose prose-sm max-w-none break-words text-fg">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {editContent || '*No content yet. Type something...*'}
              </ReactMarkdown>
            </div>
          ) : (
            /* Edit Mode Textarea */
            <div className="flex flex-col h-full gap-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    commitChanges();
                  }
                }}
                onBlur={commitChanges}
                placeholder="Write card content..."
                className="w-full min-h-[120px] resize-y font-sans text-sm leading-relaxed p-2.5 rounded-lg border border-border bg-bg text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              />
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="hidden sm:inline">Tip: Press <kbd className="px-1 py-0.5 bg-surface-warm rounded text-[10px] font-mono">{mod.symbol}+Enter</kbd> to save</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur before commit
                    commitChanges();
                  }}
                  onClick={commitChanges}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    commitChanges();
                  }}
                  className="px-2.5 py-1 bg-accent text-accent-on rounded-md font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer ml-auto sm:ml-0"
                >
                  Done
                </button>
              </div>
            </div>
          )
        ) : (
          /* Display Mode: Rich Markdown */
          <div 
            className="prose prose-sm max-w-none break-words cursor-text text-fg prose-headings:text-fg prose-strong:text-fg prose-blockquote:border-accent prose-blockquote:text-muted"
          >
            {data.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {data.content}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted text-xs text-center select-none">
                <Edit3 size={18} className="mb-1.5 opacity-40" />
                <span className="hidden sm:inline">Double-click to edit card</span>
                <span className="sm:hidden">Tap edit to edit card</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Accent Strip */}
      <div 
        className="h-1 w-full rounded-b-xl opacity-80"
        style={{ backgroundColor: categoryMeta.accent }}
      />
    </div>
  );
}, (prev, next) =>
  prev.id === next.id &&
  prev.selected === next.selected &&
  prev.width === next.width &&
  prev.height === next.height &&
  prev.data === next.data &&
  (prev.style as any)?.width === (next.style as any)?.width &&
  (prev.style as any)?.height === (next.style as any)?.height
);

