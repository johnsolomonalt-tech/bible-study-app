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
  ChevronRight,
  Download
} from 'lucide-react';
import { CanvasBoardMetadata } from '@/types/canvas';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface CanvasSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  boards: CanvasBoardMetadata[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  onRenameBoard: (id: string, newTitle: string) => void;
  onDeleteBoard: (id: string) => void;
  onOpenImportModal?: () => void;
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
  onOpenImportModal,
  theme,
}: CanvasSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [boardToDelete, setBoardToDelete] = useState<CanvasBoardMetadata | null>(null);

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
    <>
      {/* Mobile backdrop overlay to tap-dismiss */}
      <div 
        onClick={onToggle}
        className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
        aria-hidden="true"
      />
      <aside 
        className="fixed md:relative inset-y-0 left-0 z-40 md:z-20 w-72 lg:w-80 h-full shrink-0 flex flex-col border-r border-border bg-surface text-fg shadow-2xl md:shadow-none transition-all duration-200 animate-in slide-in-from-left-4"
      >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            <Workflow size={16} />
          </div>
          <span className="text-sm font-bold tracking-tight text-fg">Your Canvases</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          title="Close Sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Action Bar: New Board, Import & Search */}
      <div className="p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCreateBoard()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>New Canvas</span>
          </button>
          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="p-2 rounded-xl border border-border bg-bg/80 text-fg-2 hover:text-fg hover:bg-surface-hover text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Import Shared Canvas by Link or Code"
            >
              <Download size={15} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-bg text-xs">
          <Search size={13} className="text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search canvases..."
            className="bg-transparent focus:outline-none w-full placeholder:text-muted text-fg text-xs"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="text-muted hover:text-fg cursor-pointer"
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
          searchQuery ? (
            <div className="py-8 text-center text-xs text-zinc-500 px-4">
              No boards matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center px-4 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                <Workflow size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-fg">No canvas boards yet</p>
                <p className="text-[11px] text-muted mt-1">Start fresh with a blank canvas.</p>
              </div>
              <button
                type="button"
                onClick={() => onCreateBoard()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={13} />
                <span>Create Canvas</span>
              </button>
            </div>
          )
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
                    ? 'bg-surface-warm/90 border-accent/60 shadow-xs ring-1 ring-accent/30 text-fg font-medium'
                    : 'border-transparent hover:bg-surface-hover text-fg-2 hover:text-fg'
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
                      className={`shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} 
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
                          className="w-full px-1.5 py-0.5 rounded border border-border bg-bg text-fg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => commitRename(board.id)}
                          className="p-1 rounded bg-accent text-accent-on hover:opacity-90"
                        >
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold truncate text-[13px] text-fg">
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
                        className="p-1 rounded hover:bg-surface-warm text-muted hover:text-fg transition-colors"
                        title="Rename canvas"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoardToDelete(board);
                        }}
                        className="p-1 rounded hover:bg-rose-500/20 text-muted hover:text-rose-400 cursor-pointer transition-colors"
                        title="Delete canvas"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtitle / Metadata */}
                <div className="flex items-center justify-between text-[11px] text-muted mt-1 pl-5">
                  <div className="flex items-center gap-1">
                    <Layers size={11} />
                    <span>{board.nodeCount ?? 0} {board.nodeCount === 1 ? 'card' : 'cards'}</span>
                  </div>
                  {board.updatedAt && (
                    <span className="text-[10px] text-muted font-mono">
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
      <div className="p-3 border-t border-border text-[11px] text-muted flex items-center justify-between shrink-0">
        <span>Saved offline & cloud</span>
        <span className="font-mono text-[10px]">{boards.length} Total</span>
      </div>
    </aside>

    {/* Delete Canvas Confirmation Modal */}
    <ConfirmModal
      isOpen={boardToDelete !== null}
      title="Delete Canvas Board?"
      message={`Are you sure you want to delete "${boardToDelete?.title || 'Untitled Canvas'}"? All cards and connections on this board will be removed.`}
      confirmLabel="Delete Canvas"
      variant="danger"
      icon="trash"
      onConfirm={() => {
        if (boardToDelete) {
          onDeleteBoard(boardToDelete.id);
          setBoardToDelete(null);
        }
      }}
      onCancel={() => setBoardToDelete(null)}
    />
  </>
  );
}
