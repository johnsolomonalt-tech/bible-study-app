"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Award, 
  Sparkles,
  BookOpen
} from 'lucide-react';

export interface ReadingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDates: string[]; // Set of 'YYYY-MM-DD' dates
  currentStreak?: number;
  longestStreak?: number;
  totalActiveDays?: number;
}

export function ReadingCalendarModal({
  isOpen,
  onClose,
  activeDates = [],
  currentStreak = 0,
  longestStreak = 0,
  totalActiveDays = 0,
}: ReadingCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Set of fast-lookup dates
  const activeSet = React.useMemo(() => new Set(activeDates), [activeDates]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to today when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date());
    }
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Count active days in this specific displayed month
  const activeDaysInDisplayedMonth = React.useMemo(() => {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (activeSet.has(dateStr)) count++;
    }
    return count;
  }, [year, month, daysInMonth, activeSet]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-xs shrink-0">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                      <span>Streak Calendar</span>
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Days you spent in God’s Word & prayer
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                  aria-label="Close streak calendar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Month Selector Bar */}
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-bold text-fg">
                    {monthNames[month]} {year}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent ml-2">
                    {activeDaysInDisplayedMonth} {activeDaysInDisplayedMonth === 1 ? 'day' : 'days'} active
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="px-2.5 py-1 text-xs font-semibold text-muted hover:text-fg hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-hover text-muted hover:text-fg transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-hover text-muted hover:text-fg transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="p-4 sm:p-6 pt-3">
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="text-[11px] font-bold text-muted uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                {/* Leading days from previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                  const prevDayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center opacity-25 text-muted text-xs font-medium"
                    >
                      {prevDayNum}
                    </div>
                  );
                })}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isCompleted = activeSet.has(dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      className={`h-10 sm:h-12 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-0.5 sm:p-1 relative transition-all ${
                        isCompleted
                          ? 'bg-amber-500/15 border border-amber-500/40 text-fg shadow-xs font-bold'
                          : isToday
                          ? 'bg-surface border-2 border-accent text-accent font-bold'
                          : 'bg-bg/40 border border-border/40 text-fg/80'
                      }`}
                    >
                      <span className={`text-[12px] sm:text-xs leading-none ${isCompleted ? 'text-amber-500' : isToday ? 'text-accent' : 'text-fg-2'}`}>
                        {dayNum}
                      </span>

                      {isCompleted && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Flame size={12} className="text-amber-500 fill-amber-500" />
                        </div>
                      )}

                      {isToday && !isCompleted && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Summary Stats */}
            <div className="p-4 sm:p-5 bg-surface-warm/40 border-t border-border/60 flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Total Active
                </span>
                <span className="text-base sm:text-lg font-bold text-fg">
                  {totalActiveDays || activeSet.size} {totalActiveDays === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div className="w-px h-8 bg-border/60" />

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Current Streak
                </span>
                <span className="text-base sm:text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
                  <Flame size={16} className="fill-amber-500 text-amber-500" />
                  <span>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
                </span>
              </div>

              <div className="w-px h-8 bg-border/60" />

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Longest Streak
                </span>
                <span className="text-base sm:text-lg font-bold text-accent">
                  {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
