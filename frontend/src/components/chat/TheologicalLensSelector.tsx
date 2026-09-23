"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = THEOLOGICAL_LENS_OPTIONS.find((l) => l.id === currentLens) || THEOLOGICAL_LENS_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 origin-top-right rounded-xl bg-surface border border-border shadow-xl z-50 overflow-hidden divide-y divide-border/60 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 bg-bg/60">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
              <Sparkles size={11} className="text-accent" />
              <span>Tradition Perspective Lens</span>
            </div>
            <p className="text-[11px] text-muted/80 mt-0.5 leading-relaxed">
              Shapes AI interpretive methodology, historical voices, and depth of analysis.
            </p>
          </div>

          <div className="p-1 space-y-0.5">
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
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-accent/10 text-fg'
                      : 'hover:bg-bg text-fg/80 hover:text-fg'
                  }`}
                >
                  <div
                    className="p-1.5 rounded-md mt-0.5 shrink-0 flex items-center justify-center"
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
        </div>
      )}
    </div>
  );
}
