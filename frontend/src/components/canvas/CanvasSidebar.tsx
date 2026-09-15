"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Workflow, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  PanelLeftClose, 
  Layers, 
  Clock, 
  ChevronRight 
} from 'lucide-react';
import { CanvasBoardMetadata } from '@/types/canvas';

interface CanvasSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  boards: CanvasBoardMetadata[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  onRenameBoard: (id: string, newTitle: string) => void;
  onDeleteBoard: (id: string) => void;
  theme: 'dark' | 'light';
}

export function CanvasSidebar({
  isOpen,
  onToggle,
  boards,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  theme,
}: CanvasSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const isDark = theme === 'dark';

  const filteredBoards = boards.filter((b) =>
    (b.title || 'Untitled Canvas').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (b: CanvasBoardMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(b.id);
    setEditTitle(b.title);
  };

  const commitRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameBoard(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <aside 
      className={`absolute left-0 top-0 bottom-0 w-72 sm:w-80 z-30 flex flex-col border-r shadow-2xl backdrop-blur-xl transition-all duration-200 animate-in slide-in-from-left-4 ${
        isDark 
          ? 'bg-[#18181b]/95 border-zinc-800 text-zinc-100' 
          : 'bg-white/95 border-zinc-200 text-zinc-800'
      }`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            <Workflow size={16} />
          </div>
          <span className="text-sm font-bold tracking-tight">Theological Canvases</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Close Sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Action Bar: New Board & Search */}
      <div className="p-3 space-y-2 shrink-0">
        <button
          type="button"
          onClick={onCreateBoard}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          <Plus size={15} />
          <span>New Canvas Board</span>
        </button>

        {/* Search */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
          isDark 
            ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300' 
            : 'bg-zinc-100/80 border-zinc-200 text-zinc-700'
        }`}>
          <Search size={13} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search canvases..."
            className="bg-transparent focus:outline-none w-full placeholder-zinc-500 text-xs"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Boards List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scroll">
        <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <span>All Boards ({filteredBoards.length})</span>
        </div>

        {filteredBoards.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 px-4">
            {searchQuery ? 'No boards matching search.' : 'No canvas boards found. Create your first board above!'}
          </div>
        ) : (
          filteredBoards.map((board) => {
            const isActive = board.id === activeBoardId;
            const isEditing = editingId === board.id;

            return (
              <div
                key={board.id}
                onClick={() => {
                  if (!isEditing) onSelectBoard(board.id);
                }}
                className={`group relative flex flex-col px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  isActive
                    ? isDark 
                      ? 'bg-zinc-800/90 border-accent/60 shadow-md ring-1 ring-accent/30 text-white' 
                      : 'bg-white border-accent/60 shadow-md ring-1 ring-accent/30 text-zinc-950 font-medium'
                    : isDark 
                      ? 'border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50 text-zinc-300' 
                      : 'border-transparent hover:bg-zinc-100 hover:border-zinc-200 text-zinc-700'
                }`}
              >
                {/* Active strip indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-accent" />
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Workflow 
                      size={14} 
                      className={`shrink-0 ${isActive ? 'text-accent' : 'text-zinc-400'}`} 
                    />
                    
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(board.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className={`w-full px-1.5 py-0.5 rounded border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-black'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => commitRename(board.id)}
                          className="p-1 rounded bg-accent text-white hover:bg-accent/80"
                        >
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold truncate text-[13px]">
                        {board.title || 'Untitled Canvas'}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover/active */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startRename(board, e)}
                        className="p-1 rounded hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-200"
                        title="Rename canvas"
                      >
                        <Edit2 size={12} />
                      </button>
                      {boards.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete canvas "${board.title}"?`)) {
                              onDeleteBoard(board.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                          title="Delete canvas"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtitle / Metadata */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 pl-5">
                  <div className="flex items-center gap-1">
                    <Layers size={11} />
                    <span>{board.nodeCount ?? 0} {board.nodeCount === 1 ? 'card' : 'cards'}</span>
                  </div>
                  {board.updatedAt && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatTimestamp(board.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className={`p-3 border-t text-[11px] text-zinc-500 flex items-center justify-between shrink-0 ${
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <span>Saved offline & cloud</span>
        <span className="font-mono text-[10px]">{boards.length} Total</span>
      </div>
    </aside>
  );
}
