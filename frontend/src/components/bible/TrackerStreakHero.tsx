"use client";

import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Award, 
  Target, 
  BookOpen, 
  Heart, 
  Sun, 
  Check, 
  Calendar, 
  TrendingUp, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { getStreakData, StreakData, STREAK_MILESTONES } from '@/lib/streakService';
import { EditPaceModal } from './EditPaceModal';

export interface TrackerStreakHeroProps {
  dailyChapterGoal: number;
  totalChaptersCompleted: number;
  onNavigateToTab: (tab: string) => void;
  onOpenPrayerSanctuary: () => void;
  onUpdateDailyChapterGoal?: (goal: number) => void;
}

export function TrackerStreakHero({
  dailyChapterGoal,
  totalChaptersCompleted,
  onNavigateToTab,
  onOpenPrayerSanctuary,
  onUpdateDailyChapterGoal,
}: TrackerStreakHeroProps) {
  const [streakData, setStreakData] = useState<StreakData>(getStreakData());
  const [isEditPaceOpen, setIsEditPaceOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setStreakData(getStreakData());
    window.addEventListener('theologica_streak_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('theologica_streak_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const totalBibleChapters = 1189;
  const chaptersToday = streakData.todayGoals.chaptersCompletedToday || 0;
  const goalProgressPercent = Math.min(100, Math.round((chaptersToday / Math.max(1, dailyChapterGoal)) * 100));
  const isGoalMet = chaptersToday >= dailyChapterGoal;

  const estimatedDaysLeft = Math.max(1, Math.round((totalBibleChapters - totalChaptersCompleted) / Math.max(1, dailyChapterGoal)));
  const estimatedYearsLeft = (estimatedDaysLeft / 365).toFixed(1);

  return (
    <div className="space-y-6 mb-8 sm:mb-12">
      {/* Top 3-Card Grid: Streak Flame + Today's Chapter Goal + Longest Record */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Streak Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-surface to-surface border border-border/80 ring-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Daily Habit Streak
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-display font-bold text-fg">
                  {streakData.currentStreak}
                </span>
                <span className="text-sm font-semibold text-fg-2">
                  {streakData.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
              streakData.isCompletedToday
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-amber-500/15'
                : 'bg-surface text-muted border-border'
            }`}>
              <Flame size={26} className={streakData.isCompletedToday ? 'fill-amber-500 text-amber-500' : ''} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted">
              {streakData.isCompletedToday ? (
                <>
                  <Check size={14} className="text-emerald-500 font-bold" />
                  <span className="text-emerald-500 font-medium">Flame active today</span>
                </>
              ) : (
                <span>Read today to keep alive</span>
              )}
            </div>
            {streakData.isGraceActive && (
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Grace Applied
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Today's Chapter Goal */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border/80 ring-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Today’s Reading Goal
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-display font-bold text-fg">
                  {chaptersToday}
                </span>
                <span className="text-sm font-semibold text-fg-2">
                  / {dailyChapterGoal} {dailyChapterGoal === 1 ? 'Chapter' : 'Chapters'}
                </span>
              </div>
            </div>

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
              isGoalMet 
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-surface text-muted border-border'
            }`}>
              <Target size={24} className={isGoalMet ? 'text-emerald-500' : ''} />
            </div>
          </div>

          {/* Goal Progress bar */}
          <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted">
              <span>{goalProgressPercent}% of daily pace</span>
              {isGoalMet && <span className="font-bold text-emerald-500">Goal Reached! 🎉</span>}
            </div>
            <div className="h-2 w-full bg-bg rounded-full overflow-hidden inset-shadow">
              <div 
                className={`h-full transition-all duration-700 rounded-full ${
                  isGoalMet ? 'bg-emerald-500' : 'bg-accent'
                }`}
                style={{ width: `${goalProgressPercent}%` }}
              />
            </div>

            {/* Clean Edit Pace / Goals Button */}
            {onUpdateDailyChapterGoal && (
              <button
                type="button"
                onClick={() => setIsEditPaceOpen(true)}
                className="w-full mt-2.5 py-1.5 px-3 rounded-xl bg-bg hover:bg-surface-warm border border-border/80 text-fg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer group hover:border-accent/50"
                title="Customize your daily chapter pace and completion projections"
              >
                <Sliders size={13} className="text-accent group-hover:scale-110 transition-transform" />
                <span>Edit Pace / Goals</span>
                <ChevronRight size={13} className="text-muted group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Bible Reading Pace & Milestone */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border/80 ring-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Pace &amp; Forecast
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-display font-bold text-fg">
                  ~{estimatedDaysLeft}
                </span>
                <span className="text-sm font-semibold text-fg-2">Days to Finish</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center shadow-xs">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted flex items-center justify-between">
            <span>At <strong className="text-fg">{dailyChapterGoal} ch/day</strong></span>
            {onUpdateDailyChapterGoal ? (
              <button
                type="button"
                onClick={() => setIsEditPaceOpen(true)}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Change daily reading pace"
              >
                <span>Edit Pace</span>
                <ChevronRight size={12} />
              </button>
            ) : (
              <span>Approx. <strong className="text-accent">{estimatedYearsLeft} years</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Week Calendar Strip Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border/80 ring-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h3 className="text-sm sm:text-base font-bold text-fg">
              This Week’s Consistency
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span>Best Streak: <strong className="text-fg">{streakData.longestStreak} days</strong></span>
            <span>&bull;</span>
            <span>Total Active: <strong className="text-fg">{streakData.totalActiveDays} days</strong></span>
          </div>
        </div>

        {/* 7 Day Indicators */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 text-center">
          {streakData.weeklyActivity.map((day) => (
            <div
              key={day.date}
              className={`p-2 sm:p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 ${
                day.isToday
                  ? 'bg-accent/10 border-accent/40 shadow-xs'
                  : day.isCompleted
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-bg/60 border-border/50'
              }`}
            >
              <span className={`text-[11px] font-bold ${
                day.isToday ? 'text-accent' : 'text-muted'
              }`}>
                {day.dayName}
              </span>

              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                day.isCompleted
                  ? 'bg-amber-500 text-white shadow-xs'
                  : day.isToday
                  ? 'border border-dashed border-accent text-fg'
                  : 'bg-surface text-muted border border-border/40'
              }`}>
                {day.isCompleted ? (
                  <Flame size={18} className="fill-white" />
                ) : (
                  <span className="text-xs font-semibold">{day.dayNumber}</span>
                )}
              </div>

              <span className="text-[10px] font-semibold text-muted">
                {day.isCompleted ? 'Done' : day.isToday ? 'Today' : '-'}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Spiritual Action Links */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted">
            Daily Spiritual Habits:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('study')}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen size={13} className="text-accent" />
              <span>Read Scripture</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('devotional')}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sun size={13} className="text-amber-500" />
              <span>Today’s Devotional</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrayerSanctuary}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-semibold border border-border transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Heart size={13} className="text-rose-500" />
              <span>Prayer Sanctuary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Pace / Goals Modal */}
      {onUpdateDailyChapterGoal && (
        <EditPaceModal
          isOpen={isEditPaceOpen}
          currentGoal={dailyChapterGoal}
          totalChaptersCompleted={totalChaptersCompleted}
          onSave={(newGoal) => {
            onUpdateDailyChapterGoal(newGoal);
          }}
          onClose={() => setIsEditPaceOpen(false)}
        />
      )}
    </div>
  );
}
