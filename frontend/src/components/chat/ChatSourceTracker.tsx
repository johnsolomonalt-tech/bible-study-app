"use client";

import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Sparkles,
  Library,
  Compass
} from 'lucide-react';
import { ChatSourceItem, extractVerifiedSources } from '@/lib/chatSources';
import { TheologicalLensType } from './TheologicalLensSelector';

interface ChatSourceTrackerProps {
  sources?: ChatSourceItem[];
  content?: string;
  lens?: TheologicalLensType;
  isCompact?: boolean;
}

export const FaviconImage: React.FC<{ domain: string; alt?: string; size?: number; className?: string }> = ({
  domain,
  alt = '',
  size = 16,
  className = '',
}) => {
  const [useFallback, setUseFallback] = useState(false);
  const cleanDomain = (domain || 'theologica.app').replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  
  // Google high-resolution favicon proxy
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`;

  if (useFallback) {
    const initial = cleanDomain.charAt(0).toUpperCase() || '•';
    return (
      <div 
        className={`flex items-center justify-center font-bold uppercase text-[9px] text-accent bg-accent/15 border border-accent/20 rounded-md shrink-0 select-none ${className}`}
        style={{ width: size, height: size }}
        title={cleanDomain}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={faviconUrl}
      alt={alt || cleanDomain}
      width={size}
      height={size}
      className={`object-contain shrink-0 select-none ${className}`}
      onError={() => setUseFallback(true)}
      loading="lazy"
    />
  );
};

export const ChatSourceTracker: React.FC<ChatSourceTrackerProps> = ({
  sources: propSources,
  content = '',
  lens = 'canonical',
  isCompact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Compute sources: use passed sources, or extract verified sources dynamically from message content
  const resolvedSources = useMemo(() => {
    if (propSources && propSources.length > 0) return propSources;
    return extractVerifiedSources(content, lens);
  }, [propSources, content, lens]);

  if (!resolvedSources || resolvedSources.length === 0) {
    return null;
  }

  const handleIconClick = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setHighlightedId(sourceId);
    setIsExpanded(true);
  };

  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'lexicon':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'scripture':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'history':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'commentary':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'academic':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default:
        return 'text-accent bg-accent/10 border-accent/20';
    }
  };

  return (
    <div className="w-full my-1.5 select-none transition-all">
      {/* Collapsed Pill Button (ChatGPT / Perplexity Style) */}
      {!isExpanded ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="group inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface/75 hover:bg-surface border border-border-soft/75 hover:border-accent/40 text-[11px] font-medium text-fg-2 hover:text-fg transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            title="Expand consulted research & scripture sources"
            aria-expanded={false}
          >
            {/* Sources Label with Icon */}
            <span className="flex items-center gap-1.5 text-accent font-semibold tracking-wide">
              <Compass size={12} className="group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              <span>Sources</span>
            </span>

            {/* Small Website Icon Stack */}
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-0.5">
              {resolvedSources.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => handleIconClick(e, item.id)}
                  className="w-4.5 h-4.5 rounded-full border border-bg bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-2xs hover:scale-115 hover:z-10 transition-transform cursor-pointer"
                  title={`${item.title} (${item.domain})`}
                >
                  <FaviconImage domain={item.domain} size={13} />
                </div>
              ))}
            </div>

            {/* Source Count Badge */}
            <span className="text-[9.5px] font-bold text-muted bg-surface-hover/80 px-1.5 py-0.2 rounded-md">
              {resolvedSources.length} {resolvedSources.length === 1 ? 'source' : 'sources'}
            </span>

            {/* Expand Chevron */}
            <ChevronDown size={12} className="text-muted group-hover:text-fg transition-colors shrink-0" />
          </button>
        </div>
      ) : (
        /* Expanded Source Explorer Panel */
        <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-surface/50 border border-border-soft/80 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-soft/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <Library size={13} className="text-accent shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted truncate">
                Consulted Sources & Citations
              </span>
              <span className="text-[9.5px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.2 rounded-full shrink-0">
                {resolvedSources.length} Verified
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setHighlightedId(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-medium text-muted hover:text-fg hover:bg-surface-hover rounded-lg transition-colors cursor-pointer shrink-0"
              title="Collapse sources panel"
              aria-expanded={true}
            >
              <span>Collapse</span>
              <ChevronUp size={12} />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {resolvedSources.map((item) => {
              const isCardHighlighted = highlightedId === item.id;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex flex-col justify-between p-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                    isCardHighlighted
                      ? 'bg-surface border-2 border-accent shadow-sm'
                      : 'bg-surface/70 hover:bg-surface border border-border-soft/60 hover:border-accent/40 shadow-2xs hover:shadow-xs'
                  }`}
                  title={`Open ${item.title} on ${item.domain}`}
                >
                  <div>
                    {/* Top Row: Website Icon, Domain, Category Tag, Link Arrow */}
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4.5 h-4.5 rounded-md border border-border-soft bg-surface flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                          <FaviconImage domain={item.domain} size={13} />
                        </div>
                        <span className="text-[11px] font-medium text-fg-2 group-hover:text-fg transition-colors truncate">
                          {item.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.category && (
                          <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded border ${getCategoryBadgeClass(item.category)}`}>
                            {item.category}
                          </span>
                        )}
                        <ExternalLink 
                          size={11} 
                          className="text-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-0.5" 
                        />
                      </div>
                    </div>

                    {/* Source Title */}
                    <h4 className="text-[11.5px] font-semibold text-fg group-hover:text-accent leading-snug line-clamp-1 transition-colors">
                      {item.title}
                    </h4>

                    {/* Contextual Snippet */}
                    <p className="text-[10px] text-muted leading-relaxed line-clamp-2 mt-1">
                      {item.snippet}
                    </p>
                  </div>

                  {/* Visit External Site Pill Footer */}
                  <div className="mt-2 pt-1.5 border-t border-border-soft/40 flex items-center justify-between text-[9px] text-meta group-hover:text-accent transition-colors">
                    <span className="truncate">Open full source reference</span>
                    <span className="shrink-0 font-medium ml-1">↗</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
