"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Sparkles, BookOpen, Scroll, Flame, GraduationCap, Heart, Check } from 'lucide-react';

export type TheologicalLensType = 'canonical' | 'patristic' | 'reformation' | 'scholarly' | 'contemplative';

export interface LensOption {
  id: TheologicalLensType;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  bgLight: string;
  borderLight: string;
}

export const THEOLOGICAL_LENS_OPTIONS: LensOption[] = [
  {
    id: 'canonical',
    name: 'Canonical',
    tagline: 'Redemptive-Historical',
    description: 'Interprets Scripture with Scripture, tracking Biblical theology, covenantal progression, and Christological fulfillment across Old and New Testaments.',
    icon: <BookOpen size={13} />,
    accentColor: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.1)',
    borderLight: 'rgba(59, 130, 246, 0.25)',
  },
  {
    id: 'patristic',
    name: 'Patristic',
    tagline: 'Early Church Fathers',
    description: 'Draws upon Chrysostom, Augustine, Athanasius, and early ecumenical councils, highlighting Christological typology and apostolic rule of faith.',
    icon: <Scroll size={13} />,
    accentColor: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    borderLight: 'rgba(139, 92, 246, 0.25)',
  },
  {
    id: 'reformation',
    name: 'Reformation',
    tagline: 'Sola Scriptura & Grace',
    description: 'Rooted in Luther, Calvin, and the historic confessions, focusing on justification by faith, covenant theology, and grammatical-historical exegesis.',
    icon: <Flame size={13} />,
    accentColor: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    borderLight: 'rgba(239, 68, 68, 0.25)',
  },
  {
    id: 'scholarly',
    name: 'Scholarly',
    tagline: 'Modern Academic',
    description: 'Grounds analysis in original Hebrew/Greek syntax, Ancient Near Eastern context, Greco-Roman cultural backgrounds, and textual-critical evidence.',
    icon: <GraduationCap size={13} />,
    accentColor: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.1)',
    borderLight: 'rgba(16, 185, 129, 0.25)',
  },
  {
    id: 'contemplative',
    name: 'Contemplative',
    tagline: 'Spiritual Formation',
    description: 'Focuses on personal communion with God, the inner life, pastoral comfort, prayerful reflection, and heart transformation.',
    icon: <Heart size={13} />,
    accentColor: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    borderLight: 'rgba(245, 158, 11, 0.25)',
  },
];

interface TheologicalLensSelectorProps {
  currentLens: TheologicalLensType;
  onSelectLens: (lens: TheologicalLensType) => void;
  compact?: boolean;
}

export function TheologicalLensSelector({
  currentLens,
  onSelectLens,
  compact = false,
}: TheologicalLensSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = THEOLOGICAL_LENS_OPTIONS.find((l) => l.id === currentLens) || THEOLOGICAL_LENS_OPTIONS[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const desiredWidth = 296;
    const width = Math.min(desiredWidth, window.innerWidth - 24);

    // Right-align dropdown with button's right edge
    let left = rect.right - width;

    // Boundary checks: keep inside viewport with 12px margin
    if (left < 12) left = 12;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }

    // Vertical position: place below button by default
    let top = rect.bottom + 6;
    const estimatedMenuHeight = 420;

    // If dropdown would overflow bottom edge and there's space above, flip upward
    if (top + estimatedMenuHeight > window.innerHeight && rect.top > estimatedMenuHeight) {
      top = Math.max(12, rect.top - estimatedMenuHeight - 6);
    }

    setMenuCoords({ top, left, width });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updatePosition();
          setIsOpen(!isOpen)}
        }
        className={`flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer font-sans select-none ${
          compact
            ? 'px-2 py-1 text-[11px]'
            : 'px-2.5 py-1.5 text-[12px]'
        }`}
        style={{
          backgroundColor: selected.bgLight,
          borderColor: selected.borderLight,
          color: selected.accentColor,
        }}
        title={`Theological Perspective: ${selected.name} (${selected.tagline})`}
      >
        <span className="shrink-0">{selected.icon}</span>
        <span className="font-semibold tracking-tight">{selected.name}</span>
        {!compact && (
          <span className="text-[10px] opacity-75 hidden sm:inline">
            Lens
          </span>
        )}
        <ChevronDown size={11} className={`opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu via Portal to document.body (bypasses panel overflow clipping so it extends cleanly over the study area) */}
      {isOpen && mounted && menuCoords && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            width: `${menuCoords.width}px`,
            zIndex: 99999,
          }}
          className="rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden divide-y divide-border/60 animate-in fade-in-0 zoom-in-95 duration-100 backdrop-blur-xl"
        >
          <div className="px-3.5 py-2.5 bg-bg/80 border-b border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
              <Sparkles size={11} className="text-accent" />
              <span>Tradition Perspective Lens</span>
            </div>
            <p className="text-[11px] text-muted/80 mt-0.5 leading-relaxed">
              Shapes AI interpretive methodology, historical voices, and depth of analysis.
            </p>
          </div>

          <div className="p-1.5 space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto custom-scroll">
            {THEOLOGICAL_LENS_OPTIONS.map((lens) => {
              const isCurrent = lens.id === currentLens;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => {
                    onSelectLens(lens.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-accent/10 text-fg ring-1 ring-accent/25'
                      : 'hover:bg-bg/80 text-fg/80 hover:text-fg'
                  }`}
                >
                  <div
                    className="p-1.5 rounded-lg mt-0.5 shrink-0 flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: lens.bgLight,
                      color: lens.accentColor,
                    }}
                  >
                    {lens.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold">{lens.name}</span>
                        <span className="text-[10px] text-muted font-normal">({lens.tagline})</span>
                      </div>
                      {isCurrent && <Check size={13} className="text-accent shrink-0 ml-1" />}
                    </div>
                    <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-tight">
                      {lens.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
