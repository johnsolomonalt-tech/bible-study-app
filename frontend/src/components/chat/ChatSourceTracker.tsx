"use client";

import React, { useState, useMemo } from 'react';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
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
  size = 14,
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
        className={`flex items-center justify-center font-semibold uppercase text-[8px] text-muted bg-surface-hover/80 border border-border/40 rounded-full shrink-0 select-none ${className}`}
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

  return (
    <div className="w-full my-1 select-none transition-all">
      {/* Minimalist Collapsed Sources Pill */}
      {!isExpanded ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface/40 hover:bg-surface border border-border/50 text-[11px] text-muted hover:text-fg transition-all cursor-pointer active:scale-[0.99]"
            title="View consulted research & scripture sources"
            aria-expanded={false}
          >
            <Compass size={11} className="text-accent/80 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
            <span className="font-medium text-fg-2 group-hover:text-fg transition-colors">Sources</span>

            {/* Subtle Favicon Stack */}
            <div className="flex items-center -space-x-1 overflow-hidden pl-0.5">
              {resolvedSources.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => handleIconClick(e, item.id)}
                  className="w-3.5 h-3.5 rounded-full border border-bg bg-surface flex items-center justify-center overflow-hidden shrink-0 hover:scale-115 hover:z-10 transition-transform cursor-pointer"
                  title={`${item.title} (${item.domain})`}
                >
                  <FaviconImage domain={item.domain} size={11} />
                </div>
              ))}
            </div>

            <span className="text-[10px] text-muted/70 font-normal">
              {resolvedSources.length}
            </span>

            <ChevronDown size={10} className="text-muted/50 group-hover:text-muted transition-colors shrink-0" />
          </button>
        </div>
      ) : (
        /* Minimalist Expanded Sources Panel */
        <div className="w-full p-2.5 rounded-xl bg-surface/30 border border-border/40 shadow-none animate-in fade-in duration-150">
          {/* Header Row */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/30">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-medium text-muted">
                Sources
              </span>
              <span className="text-[10px] text-muted/60">
                ({resolvedSources.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setHighlightedId(null);
              }}
              className="inline-flex items-center gap-1 text-[10.5px] text-muted/70 hover:text-fg transition-colors cursor-pointer"
              title="Collapse sources panel"
              aria-expanded={true}
            >
              <span>Collapse</span>
              <ChevronUp size={11} />
            </button>
          </div>

          {/* Clean Source Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {resolvedSources.map((item) => {
              const isCardHighlighted = highlightedId === item.id;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex flex-col justify-between p-2 rounded-lg transition-all cursor-pointer ${
                    isCardHighlighted
                      ? 'bg-surface/90 border border-accent/60 shadow-2xs'
                      : 'bg-surface/40 hover:bg-surface/80 border border-border/40 hover:border-border-soft'
                  }`}
                  title={`Open ${item.title}`}
                >
                  <div>
                    {/* Top Row: Website Icon, Domain, External Link Arrow */}
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                          <FaviconImage domain={item.domain} size={13} />
                        </div>
                        <span className="text-[10.5px] font-medium text-muted group-hover:text-fg transition-colors truncate">
                          {item.domain}
                        </span>
                      </div>

                      <ExternalLink 
                        size={10} 
                        className="text-muted/40 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" 
                      />
                    </div>

                    {/* Source Title */}
                    <h4 className="text-[11.5px] font-medium text-fg group-hover:text-accent leading-snug line-clamp-1 transition-colors">
                      {item.title}
                    </h4>

                    {/* Contextual Snippet */}
                    <p className="text-[10px] text-muted/75 leading-relaxed line-clamp-2 mt-0.5">
                      {item.snippet}
                    </p>
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
