"use client";

import React from 'react';
import { 
  X, 
  BookOpen, 
  FileText, 
  Layers, 
  ExternalLink, 
  Highlighter, 
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { CATEGORY_METADATA, NodeCategory } from '@/types/canvas';

export interface BacklinkNoteItem {
  id: number;
  title: string;
  excerpt: string;
  updatedAt: string;
}

export interface BacklinkCanvasItem {
  boardId: string;
  boardTitle: string;
  nodeTitle: string;
  category: NodeCategory;
  excerpt: string;
}

export interface BacklinkHighlightItem {
  id: number;
  color: string;
  text: string;
}

interface ScriptureBacklinksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reference: string;
  notes: BacklinkNoteItem[];
  canvasItems: BacklinkCanvasItem[];
  highlights: BacklinkHighlightItem[];
  onOpenNote?: (noteId: number) => void;
  onOpenCanvasBoard?: (boardId: string) => void;
  theme: 'dark' | 'light';
}

export function ScriptureBacklinksDrawer({
  isOpen,
  onClose,
  reference,
  notes,
  canvasItems,
  highlights,
  onOpenNote,
  onOpenCanvasBoard,
  theme,
}: ScriptureBacklinksDrawerProps) {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const totalLinks = notes.length + canvasItems.length + highlights.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l backdrop-blur-xl animate-in slide-in-from-right duration-250 ${
          isDark 
            ? 'bg-[#18181b]/95 border-zinc-700/80 text-zinc-100 shadow-[0_0_50px_rgba(0,0,0,0.7)]' 
            : 'bg-white/98 border-zinc-200 text-zinc-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-accent">Scripture Second Brain</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                {totalLinks} References
              </span>
            </div>
            <h2 className="text-lg font-bold font-serif leading-snug mt-0.5">
              {reference}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Lists */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
          {totalLinks === 0 ? (
            <div className="py-12 text-center space-y-2">
              <BookOpen size={32} className="mx-auto text-zinc-500 opacity-60" />
              <p className="text-sm font-medium text-zinc-400">
                No personal notes or canvas cards linked to this verse yet.
              </p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Mention this verse in a Note or add it to a Canvas board to build your personal cross-reference web!
              </p>
            </div>
          ) : (
            <>
              {/* Linked Notes */}
              {notes.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <FileText size={14} className="text-amber-500" />
                    <span>Personal Notes ({notes.length})</span>
                  </div>

                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => onOpenNote?.(note.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-zinc-900/60 border-zinc-700/70 hover:bg-zinc-800/80 hover:border-amber-500/50' 
                            : 'bg-zinc-50 border-zinc-200 hover:bg-amber-50/60 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold truncate text-zinc-100 dark:text-zinc-200">
                            {note.title || 'Untitled Note'}
                          </h4>
                          <span className="text-[10px] text-zinc-500 shrink-0">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {note.excerpt}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-accent mt-2">
                          <span>Open in Notes</span>
                          <ChevronRight size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Canvas Cards */}
              {canvasItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <Layers size={14} className="text-cyan-400" />
                    <span>Canvas Boards ({canvasItems.length})</span>
                  </div>

                  <div className="space-y-2">
                    {canvasItems.map((item, idx) => {
                      const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.general;
                      return (
                        <div
                          key={idx}
                          onClick={() => onOpenCanvasBoard?.(item.boardId)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-zinc-900/60 border-zinc-700/70 hover:bg-zinc-800/80 hover:border-cyan-500/50' 
                              : 'bg-zinc-50 border-zinc-200 hover:bg-cyan-50/60 hover:border-cyan-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 truncate">
                              Board: {item.boardTitle}
                            </span>
                            <span 
                              className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 border"
                              style={{ 
                                color: meta.accent,
                                borderColor: `${meta.accent}40`,
                                backgroundColor: `${meta.accent}15` 
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-zinc-200 mb-1 truncate">
                            {item.nodeTitle}
                          </h4>

                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {item.excerpt}
                          </p>

                          <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 mt-2">
                            <span>Open Canvas Board</span>
                            <ExternalLink size={11} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <Highlighter size={14} className="text-emerald-400" />
                    <span>Saved Highlights</span>
                  </div>

                  <div className="space-y-2">
                    {highlights.map((hl) => (
                      <div
                        key={hl.id}
                        className={`p-3 rounded-xl border ${
                          isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: hl.color || '#F59E0B' }} 
                          />
                          <span className="text-xs font-medium text-zinc-300 italic">
                            &ldquo;{hl.text}&rdquo;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
