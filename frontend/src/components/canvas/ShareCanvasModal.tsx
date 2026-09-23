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
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/share/canvas/${boardId}`;
  const embedSnippet = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 sm:p-6 backdrop-blur-xl transition-all ${
          isDark 
            ? 'bg-[#1c1c20] border-zinc-700/80 text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)]' 
            : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Share Canvas Board
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Share your visual scripture study with your congregation, class, or small group.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Board Meta Badge */}
        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={16} className="text-accent shrink-0" />
            <span className="text-sm font-semibold truncate">{boardTitle || 'Untitled Canvas'}</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 shrink-0">
            {nodeCount} Cards
          </span>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Globe size={13} />
            <span>Public Read-Only Link</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={`flex-1 px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none select-all ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-200' 
                  : 'bg-zinc-50 border-zinc-300 text-zinc-800'
              }`}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-accent text-white hover:bg-accent/90 active:scale-95'
              }`}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Embed Snippet */}
        <div className="space-y-1.5 mb-5">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Code2 size={13} />
            <span>Embed on Website or Blog (iFrame)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={embedSnippet}
              className={`flex-1 px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none select-all ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-200' 
                  : 'bg-zinc-50 border-zinc-300 text-zinc-800'
              }`}
            />
            <button
              type="button"
              onClick={handleCopyEmbed}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedEmbed ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedEmbed ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Globe size={13} className="text-emerald-500" />
            <span>Anyone with the link can explore this board.</span>
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-accent hover:underline font-semibold"
          >
            <span>Open Preview</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
