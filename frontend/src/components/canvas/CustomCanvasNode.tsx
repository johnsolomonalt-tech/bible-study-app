"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeProps, useViewport, useReactFlow } from '@xyflow/react';
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
  ChevronRight
} from 'lucide-react';
import { CanvasNodeData, NodeCategory, CATEGORY_METADATA } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  scripture: BookOpen,
  theological_point: Compass,
  historical_context: HelpCircle,
  illustration: Lightbulb,
  application: Sparkles,
  general: FileText,
};

export const CustomCanvasNode = memo(function CustomCanvasNode(
  props: NodeProps & { data: CanvasNodeData; style?: React.CSSProperties }
) {
  const { id, data, selected, width, style } = props;
  const mod = useModifierKey();
  const { zoom } = useViewport();
  const { setNodes } = useReactFlow();

  // Dynamic counter-scale: when canvas is zoomed out (zoom < 1), counter-scale up
  // so options menu never shrinks below comfortable, legible size on the user's screen.
  const menuScale = Math.min(Math.max(1 / Math.max(zoom, 0.1), 1), 3.2);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content || '');
  const [editTitle, setEditTitle] = useState(data.title || '');
  const [showPreviewToggle, setShowPreviewToggle] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnectSubmenuOpen, setIsConnectSubmenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const adjustTitleHeight = () => {
    const el = titleTextareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(26, el.scrollHeight)}px`;
    }
  };

  const theme = data.theme || 'dark';
  const isDark = theme === 'dark';
  const categoryMeta = CATEGORY_METADATA[data.category] || CATEGORY_METADATA.general;
  const CategoryIcon = CATEGORY_ICONS[data.category] || FileText;

  // Keep local state synced if data updates externally
  useEffect(() => {
    setEditContent(data.content || '');
    setEditTitle(data.title || '');
  }, [data.content, data.title]);

  // Adjust title height automatically when text or card width changes
  useEffect(() => {
    adjustTitleHeight();
    const frame = requestAnimationFrame(adjustTitleHeight);
    return () => cancelAnimationFrame(frame);
  }, [editTitle, width]);

  // Focus textarea on edit mode start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsConnectSubmenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const commitChanges = () => {
    setIsEditing(false);
    if (data.onUpdate) {
      data.onUpdate(id, {
        content: editContent,
        title: editTitle.trim() || 'Untitled Card',
      });
    }
  };

  const handleTitleBlur = () => {
    if (data.onUpdate && editTitle !== data.title) {
      data.onUpdate(id, { title: editTitle.trim() || 'Untitled Card' });
    }
  };

  const handleCategoryChange = (newCat: NodeCategory) => {
    setIsMenuOpen(false);
    if (data.onUpdate) {
      data.onUpdate(id, { category: newCat });
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, selected: true } : n)));
        setIsMenuOpen(true);
      }}
      className={`relative group rounded-xl transition-all duration-200 select-none w-[380px] max-w-full ${
        isMenuOpen ? '!z-50' : selected ? 'z-30' : 'z-0'
      } ${
        isDark 
          ? 'bg-[#1a1a1c]/90 text-zinc-100 border-zinc-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-md' 
          : 'bg-white/95 text-zinc-800 border-zinc-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md'
      } border ${
        selected 
          ? 'ring-2 ring-accent border-accent/80 shadow-2xl scale-[1.008]' 
          : 'hover:border-zinc-500/50 hover:shadow-xl'
      }`}
      style={{
        width: width || (style as any)?.width || 380,
        minWidth: 280,
        minHeight: 180,
      }}
    >
      {/* Node Resizer */}
      <NodeResizer
        isVisible={selected}
        minWidth={280}
        minHeight={160}
        lineClassName="border-accent"
        handleClassName="!w-3 !h-3 !bg-accent !border-2 !border-white !rounded-full shadow-md"
      />

      {/* Perimeter Connection Handles (Top, Right, Bottom, Left) */}
      {/* Top Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />

      {/* Right Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />

      {/* Bottom Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />

      {/* Left Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-3 !h-3 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-[#161618] dark:!border-[#161618] !rounded-full opacity-40 group-hover:opacity-100 hover:!scale-125 hover:!bg-accent transition-all duration-150 cursor-crosshair z-10"
      />

      {/* Card Header */}
      <div 
        className={`flex items-start justify-between px-3.5 py-2.5 border-b rounded-t-xl gap-2 ${
          isDark ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-100 bg-zinc-50/70'
        }`}
      >
        {/* Category Badge & Title Textarea */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Badge */}
          <div 
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase shrink-0 border mt-0.5 ${
              isDark ? `${categoryMeta.bgDark} ${categoryMeta.borderDark} ${categoryMeta.textDark}` : `${categoryMeta.bgLight} ${categoryMeta.borderLight} ${categoryMeta.textLight}`
            }`}
            style={{ borderColor: categoryMeta.accent }}
          >
            <CategoryIcon size={12} style={{ color: categoryMeta.accent }} />
            <span>{categoryMeta.label}</span>
          </div>

          {/* Inline Multi-Line Title Input */}
          <textarea
            ref={titleTextareaRef}
            rows={1}
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              adjustTitleHeight();
            }}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              e.stopPropagation();
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTitleBlur();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            placeholder="Card Title..."
            className={`nodrag flex-1 min-w-0 bg-transparent text-[13px] font-semibold leading-snug focus:outline-none focus:ring-1 focus:ring-accent/50 rounded px-1.5 py-0.5 resize-none overflow-hidden break-words whitespace-pre-wrap ${
              isDark ? 'text-zinc-200 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'
            }`}
            style={{
              height: 'auto',
              minHeight: '26px',
            }}
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
                title="Save (Cmd+Enter)"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 transition-colors cursor-pointer ${
                isMenuOpen ? 'bg-zinc-700/30 text-zinc-200' : ''
              }`}
              title="Card options"
            >
              <MoreVertical size={16} />
            </button>
          )}

          {/* Quick Action Dropdown */}
          {isMenuOpen && (
            <div 
              className={`absolute right-0 top-full mt-1.5 w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in-50 zoom-in-95 ${
                isDark 
                  ? 'bg-[#222226] border-zinc-700 text-zinc-200' 
                  : 'bg-white border-zinc-200 text-zinc-800 shadow-xl'
              }`}
              style={{
                transform: `scale(${menuScale})`,
                transformOrigin: 'top right',
              }}
            >
              <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1.5">
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
                          ? isDark ? 'bg-zinc-700/60 text-white font-semibold' : 'bg-zinc-100 text-black font-semibold'
                          : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
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

              <div className={`border-t my-1.5 ${isDark ? 'border-zinc-700/60' : 'border-zinc-100'}`} />

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
                <span>Edit Markdown</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (data.onDuplicate) data.onDuplicate(id);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                }`}
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
            <div className={`prose prose-sm max-w-none break-words ${isDark ? 'prose-invert text-zinc-200' : 'text-zinc-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                placeholder={`Write markdown here... (${mod.text}+Enter to save)`}
                className={`w-full min-h-[120px] resize-y font-mono text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-accent transition-all ${
                  isDark 
                    ? 'bg-[#121214] border-zinc-700 text-zinc-200 placeholder-zinc-600' 
                    : 'bg-zinc-50 border-zinc-300 text-zinc-800 placeholder-zinc-400'
                }`}
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Tip: Press <kbd className="px-1 py-0.5 bg-zinc-700/30 rounded text-[10px] font-mono">{mod.symbol}+Enter</kbd> to save</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur before commit
                    commitChanges();
                  }}
                  className="px-2 py-0.5 bg-accent text-white rounded font-medium hover:bg-accent/80 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )
        ) : (
          /* Display Mode: Rich Markdown */
          <div 
            className={`prose prose-sm max-w-none break-words cursor-text ${
              isDark 
                ? 'prose-invert text-zinc-300 prose-headings:text-zinc-100 prose-strong:text-zinc-100 prose-blockquote:border-accent prose-blockquote:text-zinc-400' 
                : 'text-zinc-700 prose-headings:text-zinc-900 prose-strong:text-zinc-900 prose-blockquote:border-accent prose-blockquote:text-zinc-600'
            }`}
          >
            {data.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.content}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-zinc-400 text-xs text-center select-none">
                <Edit3 size={18} className="mb-1.5 opacity-40" />
                <span>Double-click to write Markdown</span>
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
});
