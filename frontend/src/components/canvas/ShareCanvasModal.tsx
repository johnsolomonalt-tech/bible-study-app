"use client";

import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Code2, 
  Lock, 
  Sparkles,
  Layers
} from 'lucide-react';

interface ShareCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
  nodeCount: number;
  theme: 'dark' | 'light';
}

export function ShareCanvasModal({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  nodeCount,
  theme,
}: ShareCanvasModalProps) {
  const isDark = theme === 'dark';
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  React.useEffect(() => {
    if (isOpen && boardId) {
      fetch('/api/canvas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boardId, isPublic: true }),
      }).catch(() => {});
    }
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/share/canvas/${boardId}`;
  const embedSnippet = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(boardId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Theologica Canvas: ${boardTitle}`,
          text: `Check out this visual scripture study board "${boardTitle}" on Theologica:`,
          url: shareUrl,
        });
      } catch (err) {
        // User dismissed share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-border bg-surface text-fg p-5 sm:p-6 backdrop-blur-xl transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-fg">
                Share Canvas Board
              </h2>
              <p className="text-xs text-muted">
                Share your visual scripture study with your congregation, class, or small group.
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

        {/* Board Meta Badge */}
        <div className="p-3 rounded-xl bg-surface-warm/50 border border-border mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={16} className="text-accent shrink-0" />
            <span className="text-sm font-semibold truncate text-fg">{boardTitle || 'Untitled Canvas'}</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 shrink-0">
            {nodeCount} Cards
          </span>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-1.5 mb-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Globe size={13} className="text-accent" />
              <span>Shareable Canvas Link</span>
            </label>
            <span className="text-[11px] text-muted">Recipients can view & import</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-border bg-bg text-fg focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-accent text-accent-on hover:opacity-90 active:scale-95'
              }`}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="p-2 rounded-xl text-xs font-semibold border border-border hover:bg-surface-hover text-fg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Share via device options..."
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {/* Share Code Section */}
        <div className="space-y-1.5 mb-4 p-3 rounded-xl bg-surface-warm/40 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted">Canvas Share Code:</span>
            <span className="text-[11px] text-emerald-500 font-medium">Use in Canvas &gt; Import</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <code className="text-xs font-mono font-bold text-accent px-2 py-1 rounded-md bg-accent/10 border border-accent/20 truncate">
              {boardId}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover text-fg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copiedCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <p className="text-[11px] text-muted mt-1">
            Other users can paste this code or link to save this canvas directly to their own account.
          </p>
        </div>

        {/* Embed Snippet */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
            <Code2 size={13} />
            <span>Embed on Website or Blog (iFrame)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={embedSnippet}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-border bg-bg text-fg focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyEmbed}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-surface-hover text-fg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedEmbed ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedEmbed ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-emerald-500 shrink-0" />
            <span className="break-words">Anyone with the link can explore this board.</span>
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-accent hover:underline font-semibold shrink-0"
          >
            <span>Open Preview</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
