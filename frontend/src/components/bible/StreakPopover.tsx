"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  X, 
  ChevronRight, 
  Award, 
  BookOpen, 
  Sun, 
  Heart, 
  Check, 
  Sparkles,
  Calendar,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Sliders,
  Target
} from 'lucide-react';
import { 
  getStreakData, 
  StreakData, 
  getTodayStreakQuote, 
  getRandomStreakQuote,
  getEncouragingMessage,
  setTargetMilestoneDays,
  STREAK_MILESTONES 
} from '@/lib/streakService';
import { SetMilestoneModal } from './SetMilestoneModal';

export interface StreakPopoverProps {
  onNavigateToTab: (tab: string) => void;
  onOpenPrayerSanctuary: () => void;
}

export function StreakPopover({
  onNavigateToTab,
  onOpenPrayerSanctuary,
}: StreakPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>(getStreakData());
  const [activeTab, setActiveTab] = useState<'rhythm' | 'milestones'>('rhythm');
  const [currentQuote, setCurrentQuote] = useState(getTodayStreakQuote());
  const [isQuoteSpinning, setIsQuoteSpinning] = useState(false);
  const [encouragementSeed, setEncouragementSeed] = useState(0);
  const [isSetMilestoneOpen, setIsSetMilestoneOpen] = useState(false);

  // Listen to streak changes across the app
  useEffect(() => {
    const handleUpdate = () => {
      setStreakData(getStreakData());
    };
    window.addEventListener('theologica_streak_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('theologica_streak_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const streak = streakData.currentStreak;
  const isGlowing = streakData.isCompletedToday;
  const encouragingMessage = getEncouragingMessage(
    isGlowing,
    streakData.isGraceActive,
    streak,
    encouragementSeed > 0 ? encouragementSeed : undefined
  );

  const handleShuffleQuote = () => {
    setIsQuoteSpinning(true);
    const next = getRandomStreakQuote(currentQuote.index);
    setCurrentQuote(next);
    setEncouragementSeed((prev) => prev + 1);
    setTimeout(() => setIsQuoteSpinning(false), 350);
  };

  return (
    <>
      {/* Top Header Flame Pill Button */}
      <button
        type="button"
        onClick={() => {
          setStreakData(getStreakData());
          setIsOpen(true);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
          isGlowing
            ? 'bg-amber-500/15 border-amber-500/35 text-amber-500 dark:text-amber-400 hover:bg-amber-500/25 shadow-xs shadow-amber-500/10'
            : streak > 0
            ? 'bg-surface border-border text-fg hover:border-amber-500/40 hover:text-amber-500'
            : 'bg-surface border-border/70 text-muted hover:text-fg'
        }`}
        title={`${streak}-day reading streak`}
        aria-label="Daily Reading Streak"
      >
        <div className="relative flex items-center justify-center">
          <Flame 
            size={16} 
            className={`transition-transform duration-300 ${
              isGlowing 
                ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 animate-pulse' 
                : streak > 0 
                ? 'text-amber-500' 
                : 'text-muted'
            }`} 
          />
          {isGlowing && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <span className="tabular-nums font-bold tracking-tight text-xs">
          {streak}
        </span>
        <span className="hidden xl:inline text-[11px] font-medium opacity-80">
          {streak === 1 ? 'day' : 'days'}
        </span>
      </button>

      {/* Streak & Daily Rhythm Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/10 flex flex-col max-h-[90vh]"
            >
              {/* Top Hero Flame Header */}
              <div className="relative p-6 sm:p-8 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 text-muted hover:text-fg rounded-xl hover:bg-fg/5 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/15">
                      <Flame 
                        size={40} 
                        className={`transition-all duration-500 ${
                          isGlowing 
                            ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 filter drop-shadow' 
                            : 'text-amber-500/70'
                        }`} 
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-display font-semibold text-fg tracking-tight mb-1">
                    {streak} <span className="text-base sm:text-lg font-sans font-normal text-muted">Day Streak</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-fg-2 max-w-xs leading-relaxed min-h-[36px] flex items-center justify-center">
                    {encouragingMessage}
                  </p>

                  {/* Grace indicator badge */}
                  {streakData.isGraceActive && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-xs font-semibold">
                      <ShieldCheck size={14} />
                      <span>Grace Day Applied</span>
                    </div>
                  )}
                </div>

                {/* 7-Day Week Strip */}
                <div className="mt-6 pt-5 border-t border-border/40">
                  <div className="flex items-center justify-between text-center gap-1 sm:gap-2">
                    {streakData.weeklyActivity.map((day) => (
                      <div 
                        key={day.date} 
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        <span className={`text-[11px] font-bold ${
                          day.isToday ? 'text-accent font-extrabold' : 'text-muted'
                        }`}>
                          {day.dayLabel}
                        </span>

                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all ${
                          day.isCompleted
                            ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/20'
                            : day.isToday
                            ? 'border-2 border-dashed border-accent text-fg bg-surface'
                            : 'bg-bg text-muted border border-border/50'
                        }`}>
                          {day.isCompleted ? (
                            <Flame size={16} className="fill-white" />
                          ) : (
                            <span className="text-[11px] font-semibold opacity-70">
                              {day.dayNumber}
                            </span>
                          )}
                        </div>

                        <div className="h-3 flex items-center justify-center">
                          {day.isToday && (
                            <span className="text-[9px] font-bold text-accent tracking-tighter uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex border-b border-border bg-bg/50 px-6 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rhythm')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'rhythm'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-muted hover:text-fg'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('milestones')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'milestones'
                      ? 'border-accent text-accent font-bold'
                      : 'border-transparent text-muted hover:text-fg'
                  }`}
                >
                  <Award size={13} />
                  <span>Milestones</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-bold">
                    {streakData.earnedMilestones.filter(m => m.isEarned).length}
                  </span>
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scroll">
                {activeTab === 'rhythm' ? (
                  <>
                    {isGlowing && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-fg animate-in fade-in">
                        <Sparkles size={16} className="text-amber-500 shrink-0" />
                        <span className="font-medium">Congratulations! You spent time in the Word today.</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
                          Choose an Activity
                        </div>
                        <span className="text-[10px] text-muted">Complete any to build your streak</span>
                      </div>

                      {/* 1. Scripture */}
                      <div className="p-3.5 rounded-2xl bg-bg border border-border flex items-center justify-between gap-3 group hover:border-border-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            streakData.todayGoals.scripture 
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-surface text-muted border border-border'
                          }`}>
                            {streakData.todayGoals.scripture ? <Check size={18} /> : <BookOpen size={18} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-fg flex items-center gap-1.5">
                              <span>Read Scripture</span>
                              {streakData.todayGoals.chaptersCompletedToday > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent/15 text-accent font-semibold">
                                  {streakData.todayGoals.chaptersCompletedToday} read
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted">Study a chapter in the reader</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTab('study');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{streakData.todayGoals.scripture ? 'Read More' : 'Read'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* 2. Devotional */}
                      <div className="p-3.5 rounded-2xl bg-bg border border-border flex items-center justify-between gap-3 group hover:border-border-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            streakData.todayGoals.devotional 
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-surface text-muted border border-border'
                          }`}>
                            {streakData.todayGoals.devotional ? <Check size={18} /> : <Sun size={18} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-fg">Daily Devotional</div>
                            <p className="text-[11px] text-muted">Spurgeon’s Morning &amp; Evening</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTab('devotional');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{streakData.todayGoals.devotional ? 'Revisit' : 'Open'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* 3. Prayer Sanctuary */}
                      <div className="p-3.5 rounded-2xl bg-bg border border-border flex items-center justify-between gap-3 group hover:border-border-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            streakData.todayGoals.prayer 
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-surface text-muted border border-border'
                          }`}>
                            {streakData.todayGoals.prayer ? <Check size={18} /> : <Heart size={18} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-fg">Prayer &amp; Quiet Time</div>
                            <p className="text-[11px] text-muted">Reflect, petition, or praise</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onOpenPrayerSanctuary();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{streakData.todayGoals.prayer ? 'Pray More' : 'Pray'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Target Milestone Goal Card */}
                    <div className="p-4 rounded-2xl bg-surface border border-border/80 ring-shadow">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0 p-1.5 rounded-xl bg-accent/10 border border-accent/20">
                            {streakData.targetMilestone.badge}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-fg truncate">
                                Milestone: {streakData.targetMilestone.title}
                              </h3>
                              {streakData.targetMilestone.isEarned && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                  Achieved! 🎉
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted truncate">
                              {streakData.targetMilestone.isEarned 
                                ? 'Milestone achieved! Set your next milestone.' 
                                : `${streak} of ${streakData.targetMilestone.days} days completed • ${streakData.targetMilestone.daysRemaining} to go`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsSetMilestoneOpen(true)}
                            className="px-2.5 py-1 rounded-xl bg-bg hover:bg-surface-warm border border-border/80 text-fg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer group hover:border-accent/50"
                            title="Set your milestone"
                          >
                            <Sliders size={12} className="text-accent group-hover:scale-110 transition-transform" />
                            <span>Set Milestone</span>
                          </button>
                          <span className="text-xs font-mono font-bold text-accent">
                            {streakData.targetMilestone.progressPercent}%
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            streakData.targetMilestone.isEarned ? 'bg-emerald-500' : 'bg-accent'
                          }`} 
                          style={{ width: `${streakData.targetMilestone.progressPercent}%` }} 
                        />
                      </div>
                    </div>

                    {/* Daily Scripture Quote */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface/60 border border-border/60 space-y-2 relative">
                      <div className="flex items-center justify-between text-muted pb-1 border-b border-border/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                          <Sparkles size={11} className="text-accent" />
                          <span>Words of Scripture</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleShuffleQuote}
                          className="px-2 py-0.5 rounded-lg hover:bg-fg/5 text-muted hover:text-accent transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                          title="Read another inspiring verse"
                        >
                          <RefreshCw size={11} className={isQuoteSpinning ? "animate-spin text-accent" : ""} />
                          <span>Another verse</span>
                        </button>
                      </div>
                      <blockquote className="text-center space-y-1.5 pt-0.5">
                        <p className="text-xs sm:text-sm italic text-fg font-serif leading-relaxed">
                          &ldquo;{currentQuote.text}&rdquo;
                        </p>
                        <cite className="text-[11px] font-semibold text-accent not-italic block">
                          {currentQuote.reference}
                        </cite>
                      </blockquote>
                    </div>
                  </>
                ) : (
                  /* Milestones Tab */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
                        Reading Milestones
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSetMilestoneOpen(true)}
                        className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        title="Set a milestone"
                      >
                        <Sliders size={12} />
                        <span>Set Milestone</span>
                      </button>
                    </div>

                    {streakData.earnedMilestones.map((m) => {
                      const isCurrentGoal = streakData.targetMilestone.days === m.days;

                      return (
                        <div 
                          key={m.days} 
                          className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                            isCurrentGoal
                              ? 'bg-accent/10 border-accent/40 shadow-xs'
                              : m.isEarned 
                              ? 'bg-amber-500/10 border-amber-500/30' 
                              : 'bg-bg border-border opacity-70'
                          }`}
                        >
                          <div className="text-2xl shrink-0 p-1.5 rounded-xl bg-surface border border-border/60">
                            {m.badge}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-fg">
                                {m.title}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface border border-border text-muted">
                                {m.days}d
                              </span>
                              {isCurrentGoal && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent/20 text-accent border border-accent/30">
                                  Current Milestone
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted leading-tight mt-0.5">
                              {m.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isCurrentGoal ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetMilestoneDays(m.days);
                                  setStreakData(getStreakData());
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-fg transition-colors cursor-pointer hover:border-accent/40"
                              >
                                Select Milestone
                              </button>
                            ) : null}

                            {m.isEarned && (
                              <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0" title="Milestone earned">
                                <Check size={12} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-bg border-t border-border flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-3">
                  <span>Best: <strong className="text-fg">{streakData.longestStreak} {streakData.longestStreak === 1 ? 'day' : 'days'}</strong></span>
                  <span>&bull;</span>
                  <span>Total: <strong className="text-fg">{streakData.totalActiveDays} {streakData.totalActiveDays === 1 ? 'day' : 'days'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToTab('tracker');
                  }}
                  className="font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Tracker</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Set Milestone Goal Modal */}
      <SetMilestoneModal
        isOpen={isSetMilestoneOpen}
        currentStreak={streak}
        currentMilestoneDays={streakData.targetMilestone.days}
        onSave={(newDays) => {
          setTargetMilestoneDays(newDays);
          setStreakData(getStreakData());
        }}
        onClose={() => setIsSetMilestoneOpen(false)}
      />
    </>
  );
}
