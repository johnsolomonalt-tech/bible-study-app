"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { UploadCloud, X } from 'lucide-react';

export interface ExpandableSyncBannerProps {
  message: string;
  signInText?: string;
  onDismiss: () => void;
  className?: string;
}

export function ExpandableSyncBanner({
  message,
  signInText = "Sign in",
  onDismiss,
  className = "",
}: ExpandableSyncBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        // If scrollWidth exceeds clientWidth by at least 2px, it is truncated with ellipsis
        const hasOverflow = textRef.current.scrollWidth > textRef.current.clientWidth + 2;
        setIsOverflowing(hasOverflow);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [message]);

  const canExpand = isOverflowing || isExpanded;

  return (
    <div 
      onClick={() => {
        if (canExpand) {
          setIsExpanded(prev => !prev);
        }
      }}
      className={`mb-2 p-2 sm:p-2.5 rounded-xl bg-[#c96442]/10 border border-[#c96442]/25 text-[#c96442] dark:text-[#e07a5f] flex items-center justify-between gap-1.5 text-xs animate-in fade-in duration-200 select-none transition-all ${
        canExpand ? 'cursor-pointer hover:bg-[#c96442]/15' : 'cursor-default'
      } ${className}`}
      title={canExpand ? (isExpanded ? "Click to collapse" : "Click to view full message") : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <UploadCloud size={14} className="shrink-0" />
        <p 
          ref={textRef}
          className={`text-[11px] leading-snug min-w-0 ${isExpanded ? 'whitespace-normal' : 'truncate'}`}
        >
          {message}{' '}
          <Link 
            href="/sign-in" 
            onClick={(e) => e.stopPropagation()} 
            className="underline font-semibold hover:opacity-80 inline-block cursor-pointer"
          >
            {signInText}
          </Link>{' '}
          to sync across devices.
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-inherit shrink-0 cursor-pointer"
        title="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
}
