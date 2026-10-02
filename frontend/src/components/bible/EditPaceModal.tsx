"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  X, 
  Sparkles, 
  Calendar, 
  Clock, 
  Check, 
  TrendingUp, 
  BookOpen, 
  Plus, 
  Minus,
  Award
} from 'lucide-react';

export interface EditPaceModalProps {
  isOpen: boolean;
  currentGoal: number;
  totalChaptersCompleted: number;
  onSave: (newGoal: number) => void;
  onClose: () => void;
}

interface PacePreset {
  chapters: number;
  title: string;
  badge?: string;
  description: string;
  approxDays: number;
  approxYears: string;
}

const PACE_PRESETS: PacePreset[] = [
  {
    chapters: 1,
    title: '1 Chapter a day',
    description: 'A relaxed pace to read through Scripture at your own speed',
    approxDays: 1189,
    approxYears: '~3.3 years',
  },
  {
    chapters: 2,
    title: '2 Chapters a day',
    description: 'Steady daily reading with good time to reflect',
    approxDays: 595,
    approxYears: '~1.6 years',
  },
  {
    chapters: 3,
    title: '3 Chapters a day',
    badge: 'Popular',
    description: 'Read through the entire Bible in about one year',
    approxDays: 396,
    approxYears: '~1.0 year',
  },
  {
    chapters: 4,
    title: '4 Chapters a day',
    description: 'A quicker pace covering more ground each day',
    approxDays: 297,
    approxYears: '~10 months',
  },
  {
    chapters: 5,
    title: '5 Chapters a day',
    description: 'Finish the Bible in under 8 months',
    approxDays: 238,
    approxYears: '~8 months',
  },
];

export function EditPaceModal({
  isOpen,
  currentGoal,
  totalChaptersCompleted,
  onSave,
  onClose,
}: EditPaceModalProps) {
  const [selectedGoal, setSelectedGoal] = useState<number>(currentGoal || 3);
  const [isCustom, setIsCustom] = useState<boolean>(
    !PACE_PRESETS.some(p => p.chapters === currentGoal)
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedGoal(currentGoal || 3);
      setIsCustom(!PACE_PRESETS.some(p => p.chapters === currentGoal));
    }
  }, [isOpen, currentGoal]);

  if (!isOpen) return null;

  const totalBibleChapters = 1189;
  const remainingChapters = Math.max(0, totalBibleChapters - totalChaptersCompleted);
  const effectiveGoal = Math.max(1, selectedGoal);
  const daysToFinish = Math.max(1, Math.ceil(remainingChapters / effectiveGoal));

  // Compute estimated finish date
  const projectedFinishDate = new Date();
  projectedFinishDate.setDate(projectedFinishDate.getDate() + daysToFinish);
  const finishDateStr = projectedFinishDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const estMinutesPerDay = `${effectiveGoal * 4}–${effectiveGoal * 5}`;
  const overallPercent = Math.min(100, Math.round((totalChaptersCompleted / totalBibleChapters) * 100));

  const handleSelectPreset = (chapters: number) => {
    setSelectedGoal(chapters);
    setIsCustom(false);
  };

  const handleCustomIncrement = (delta: number) => {
    const next = Math.max(1, Math.min(50, selectedGoal + delta));
    setSelectedGoal(next);
    setIsCustom(!PACE_PRESETS.some(p => p.chapters === next));
  };

  const handleSave = () => {
    onSave(effectiveGoal);
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
          className="w-full max-w-xl bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70 shrink-0 bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/25 flex items-center justify-center shadow-xs">
                <Target size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-fg tracking-tight">
                    Reading Pace &amp; Goals
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    Daily Goal
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Choose how many chapters you want to read each day.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface-warm transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto custom-scroll p-5 sm:p-6 space-y-6">
            {/* Presets List */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                Choose Your Daily Goal
              </label>

              <div className="space-y-2">
                {PACE_PRESETS.map((preset) => {
                  const isSelected = !isCustom && selectedGoal === preset.chapters;
                  return (
                    <button
                      key={preset.chapters}
                      type="button"
                      onClick={() => handleSelectPreset(preset.chapters)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-accent/10 border-accent/60 ring-2 ring-accent/20 text-fg shadow-xs'
                          : 'bg-bg/60 hover:bg-surface-warm border-border/70 text-fg-2 hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent border-accent text-accent-on'
                            : 'border-border-soft bg-surface'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-fg">
                              {preset.title}
                            </span>
                            {preset.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                                <Sparkles size={10} />
                                {preset.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-accent">
                          {preset.approxYears}
                        </span>
                        <span className="block text-[10px] text-muted">
                          (~{preset.approxDays} days)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Pace Option */}
              <div className={`mt-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isCustom 
                  ? 'bg-accent/10 border-accent/60 ring-2 ring-accent/20' 
                  : 'bg-bg/60 border-border/70'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-fg flex items-center gap-2">
                      Custom Goal
                    </span>
                    <p className="text-xs text-muted">
                      Set any number of chapters per day (1 to 50)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCustomIncrement(-1)}
                      className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-warm border border-border flex items-center justify-center text-fg transition-colors cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus size={14} />
                    </button>

                    <div className="w-14 text-center">
                      <span className="text-lg font-display font-bold text-fg">
                        {selectedGoal}
                      </span>
                      <span className="block text-[10px] text-muted uppercase font-bold tracking-wider">
                        {selectedGoal === 1 ? 'Ch' : 'Chs'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCustomIncrement(1)}
                      className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-warm border border-border flex items-center justify-center text-fg transition-colors cursor-pointer"
                      title="Increase by 1"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reading Timeline Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-accent" />
                  At this pace
                </span>
                <span className="text-xs font-semibold text-fg">
                  {effectiveGoal} {effectiveGoal === 1 ? 'chapter' : 'chapters'} a day
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface/70 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Days Left
                  </span>
                  <div className="text-xl font-display font-bold text-fg">
                    ~{daysToFinish}
                  </div>
                  <span className="text-[10px] text-muted">
                    {remainingChapters} chapters to go
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/70 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Finish By
                  </span>
                  <div className="text-sm font-bold text-accent truncate mt-1">
                    {finishDateStr}
                  </div>
                  <span className="text-[10px] text-muted">
                    Whole Bible (1,189 chs)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/70 border border-border/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Estimated Time
                  </span>
                  <div className="text-xl font-display font-bold text-fg">
                    ~{estMinutesPerDay}
                  </div>
                  <span className="text-[10px] text-muted">
                    Minutes per day
                  </span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted">
                <span>Completed so far: <strong className="text-fg">{totalChaptersCompleted}</strong> / 1,189</span>
                <strong className="text-accent">{overallPercent}% Done</strong>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-surface border-t border-border flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-fg-2 hover:text-fg hover:bg-surface-warm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-accent-on text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Check size={16} />
              <span>Save Goal</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
