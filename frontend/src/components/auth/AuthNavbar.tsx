'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AuthNavbar() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');

  useEffect(() => {
    // Detect active theme from HTML data-theme attribute or localStorage
    const currentTheme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | 'sepia') || 'dark';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const updatedTheme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | 'sepia') || 'dark';
      setTheme(updatedTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const logoSrc = (theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png';

  return (
    <header 
      className="sticky top-0 z-40 min-h-14 h-[calc(3.5rem+var(--app-safe-top))] border-b border-border flex items-center justify-between px-4 sm:px-8 bg-bg shrink-0 select-none"
      style={{ paddingTop: 'var(--app-safe-top)' }}
    >
      {/* Left: Brand Identity */}
      <Link 
        href="/"
        className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer"
        title="Return to Theologica Scripture Study"
      >
        <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={logoSrc} 
            alt="Theologica Logo" 
            className="w-full h-full object-contain filter contrast-105" 
          />
        </div>
        <span className="font-serif text-[18px] sm:text-[22px] font-bold tracking-tight text-[#c96442] inline shrink-0 group-hover:opacity-90 transition-opacity">
          Theologica
        </span>
      </Link>

      {/* Right: Return to Study Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-fg hover:bg-surface border border-border-soft/60 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Return to Study Workspace"
        >
          <ArrowLeft size={14} className="text-accent" />
          <span className="hidden sm:inline">Back to Scripture Workspace</span>
          <span className="sm:hidden">Study</span>
        </Link>
      </div>
    </header>
  );
}
