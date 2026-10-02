"use client";

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Loader2, 
  AlertCircle, 
  Check, 
  Clipboard, 
  Globe, 
  Workflow 
} from 'lucide-react';

interface ImportCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (board: {
    id: string;
    title: string;
    nodes: any[];
    edges: any[];
    viewport?: any;
  }) => void;
  theme: 'dark' | 'light';
}

export function ImportCanvasModal({
  isOpen,
  onClose,
  onImportSuccess,
  theme,
}: ImportCanvasModalProps) {
  const [codeOrLink, setCodeOrLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCodeOrLink(text.trim());
        setError(null);
      }
    } catch {
      // Clipboard read permission denied or unavailable
    }
  };

  const handleImport = async () => {
    const raw = codeOrLink.trim();
    if (!raw || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/canvas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: raw }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import canvas board.');
      }

      if (!data.board) {
        throw new Error('Canvas board data was not returned by server.');
      }

      onImportSuccess(data.board);
      onClose();
    } catch (err: any) {
      console.error('Import canvas failed:', err);
      setError(err?.message || 'Could not find or import canvas board. Please verify the link or code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl border border-border bg-surface text-fg p-5 sm:p-6 backdrop-blur-xl transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Download size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-fg">
                Import Shared Canvas
              </h2>
              <p className="text-xs text-muted">
                Save an interactive study canvas from a link or code into your account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5 mb-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted flex items-center justify-between">
              <span>Canvas Link or Share Code:</span>
              <button
                type="button"
                onClick={handlePaste}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Clipboard size={12} />
                <span>Paste from Clipboard</span>
              </button>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={codeOrLink}
                onChange={(e) => {
                  setCodeOrLink(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImport();
                  }
                }}
                placeholder="e.g. board-1727458291024 or https://.../share/canvas/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all placeholder:text-muted"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-surface-warm/40 border border-border text-[11px] text-muted space-y-1">
            <p>• Creates an independent, editable copy on your canvas board.</p>
            <p>• Your personal edits will not alter the original shared canvas.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!codeOrLink.trim() || isLoading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Importing Canvas...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Import Canvas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
