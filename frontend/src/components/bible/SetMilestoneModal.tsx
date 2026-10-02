"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  X, 
  Check, 
  Plus, 
  Minus, 
  Sparkles,
  Flame,
  Award
} from 'lucide-react';
import { STREAK_MILESTONES } from '@/lib/streakService';

export interface SetMilestoneModalProps {
  isOpen: boolean;
  currentStreak: number;
  currentMilestoneDays: number;
  onSave: (newMilestoneDays: number) => void;
  onClose: () => void;
}

export interface MilestonePreset {
  days: number;
  title: string;
  badge: string;
  description: string;
}

export const MILESTONE_PRESETS: MilestonePreset[] = [
  { days: 3, title: '3-Day Streak', badge: '🔥', description: 'Build your initial habit of daily Scripture reading.' },
  { days: 7, title: 'One Week', badge: '🕯️', description: 'One full week of continuous time in the Word.' },
  { days: 14, title: 'Two Weeks', badge: '🪵', description: 'Solidify your reading rhythm with two faithful weeks.' },
  { days: 30, title: 'One Month', badge: '🏮', description: 'A transformative month anchored in God’s Word.' },
  { days: 60, title: 'Two Months', badge: '🌟', description: 'Two continuous months of spiritual growth and study.' },
  { days: 100, title: '100 Days', badge: '🏛️', description: 'A profound milestone of faithfulness and discipline.' },
  { days: 365, title: 'One Year', badge: '👑', description: 'A full year of daily Scripture reading.' },
];

export function SetMilestoneModal({
  isOpen,
  currentStreak,
  currentMilestoneDays,
  onSave,
  onClose,
}: SetMilestoneModalProps) {
  const [selectedDays, setSelectedDays] = useState<number>(currentMilestoneDays || 7);
  const [customInput, setCustomInput] = useState<string>(String(currentMilestoneDays || 7));

  useEffect(() => {
    if (isOpen) {
      const initial = currentMilestoneDays || 7;
      setSelectedDays(initial);
      setCustomInput(String(initial));
    }
  }, [isOpen, currentMilestoneDays]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveDays = Math.max(1, selectedDays);
  const progressPercent = Math.min(100, Math.round((currentStreak / effectiveDays) * 100));
  const daysRemaining = Math.max(0, effectiveDays - currentStreak);
  const isGoalReached = currentStreak >= effectiveDays;

  const handleSelectPreset = (days: number) => {
    setSelectedDays(days);
    setCustomInput(String(days));
  };

  const handleCustomChange = (valStr: string) => {
    setCustomInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedDays(Math.min(1000, parsed));
    }
  };

  const handleIncrement = (delta: number) => {
    const next = Math.max(1, Math.min(1000, selectedDays + delta));
    setSelectedDays(next);
    setCustomInput(String(next));
  };

  const handleSave = () => {
    onSave(effectiveDays);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70 shrink-0 bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/25 flex items-center justify-center shadow-xs">
                <Target size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold text-fg tracking-tight">
                  Set Milestone Goal
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Set a reading streak milestone to aim for on your spiritual journey.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted hover:text-fg rounded-xl hover:bg-fg/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scroll">
            {/* Live Progress Preview Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-warm/50 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Goal Preview
                  </span>
                  <div className="text-sm font-bold text-fg flex items-center gap-1.5 mt-0.5">
                    <span>{effectiveDays}-Day Streak Goal</span>
                    {isGoalReached && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Achieved! 🎉
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-accent">
                    {progressPercent}%
                  </span>
                  <div className="text-[11px] text-muted">
                    {isGoalReached
                      ? `${currentStreak} days completed`
                      : `${currentStreak} of ${effectiveDays} days completed`}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    isGoalReached ? 'bg-emerald-500' : 'bg-accent'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="text-[11px] text-muted flex items-center justify-between">
                <span>Current streak: <strong className="text-fg">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</strong></span>
                <span>
                  {isGoalReached ? (
                    <strong className="text-emerald-500 font-medium">Milestone reached!</strong>
                  ) : (
                    <span><strong className="text-fg">{daysRemaining}</strong> {daysRemaining === 1 ? 'day' : 'days'} to go</span>
                  )}
                </span>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-fg">
                Choose a Milestone
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MILESTONE_PRESETS.map((preset) => {
                  const isSelected = selectedDays === preset.days;
                  const isReached = currentStreak >= preset.days;

                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => handleSelectPreset(preset.days)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer select-none relative ${
                        isSelected
                          ? 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/20'
                          : 'border-border bg-bg/60 hover:bg-surface-warm hover:border-border-soft'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{preset.badge}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-fg truncate">
                            {preset.title}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface border border-border text-muted shrink-0">
                            {preset.days}d
                          </span>
                        </div>
                        <p className="text-[11px] text-muted leading-tight mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                      {!isSelected && isReached && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5" title="Previously achieved">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Day Target */}
            <div className="p-4 rounded-2xl bg-bg border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-fg">
                    Or Enter Custom Days
                  </h4>
                  <p className="text-[11px] text-muted">
                    Set any personal goal, like 10, 21, or 50 days.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleIncrement(-1)}
                    disabled={selectedDays <= 1}
                    className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover disabled:opacity-40 border border-border flex items-center justify-center text-fg transition-colors cursor-pointer"
                    aria-label="Decrease target days"
                  >
                    <Minus size={14} />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customInput}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    className="w-16 h-8 text-center text-xs font-bold font-mono bg-surface border border-border rounded-xl text-fg focus:outline-hidden focus:border-accent"
                  />

                  <button
                    type="button"
                    onClick={() => handleIncrement(1)}
                    disabled={selectedDays >= 1000}
                    className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover disabled:opacity-40 border border-border flex items-center justify-center text-fg transition-colors cursor-pointer"
                    aria-label="Increase target days"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border shrink-0 bg-surface flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-fg-2 hover:text-fg hover:bg-bg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-accent text-accent-contrast hover:brightness-110 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Save Milestone Goal</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
