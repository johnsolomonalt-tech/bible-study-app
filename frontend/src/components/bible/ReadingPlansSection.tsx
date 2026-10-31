"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, ChevronRight, ChevronDown, CheckCircle2, Play, Flame, Search,
  RotateCcw, Sparkles, Filter, Check, Trophy, Calendar, Compass
} from 'lucide-react';
import { 
  READING_PLANS_LIBRARY, 
  ReadingPlan, 
  calculatePlanStats, 
  PlanProgressStats 
} from '@/lib/readingPlansData';

const STORAGE_KEY_STARTED_PLANS = 'theologica_started_reading_plans';

interface ReadingPlansSectionProps {
  completedChapters: string[];
  onNavigateToChapter: (book: string, chapter: number) => void;
}

export function ReadingPlansSection({
  completedChapters,
  onNavigateToChapter,
}: ReadingPlansSectionProps) {
  const [startedPlanIds, setStartedPlanIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['gospels'];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STARTED_PLANS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['gospels']; // Default starter plan
  });

  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const persistStartedPlans = (updated: string[]) => {
    setStartedPlanIds(updated);
    try {
      localStorage.setItem(STORAGE_KEY_STARTED_PLANS, JSON.stringify(updated));
    } catch {}
  };

  const handleStartPlan = (planId: string) => {
    if (!startedPlanIds.includes(planId)) {
      persistStartedPlans([...startedPlanIds, planId]);
    }
  };

  const handleLeavePlan = (planId: string) => {
    persistStartedPlans(startedPlanIds.filter((id) => id !== planId));
  };

  // Group plans into Started, Available, and Finished
  const { startedPlans, availablePlans, finishedPlans } = useMemo(() => {
    const started: Array<{ plan: ReadingPlan; stats: PlanProgressStats }> = [];
    const available: Array<{ plan: ReadingPlan; stats: PlanProgressStats }> = [];
    const finished: Array<{ plan: ReadingPlan; stats: PlanProgressStats }> = [];

    READING_PLANS_LIBRARY.forEach((plan) => {
      const stats = calculatePlanStats(plan, completedChapters);

      // Matches search and category filters
      const matchesSearch =
        !searchQuery ||
        plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.books.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || plan.category === selectedCategory;

      if (!matchesSearch || !matchesCat) return;

      if (stats.isFinished) {
        finished.push({ plan, stats });
      } else if (startedPlanIds.includes(plan.id)) {
        started.push({ plan, stats });
      } else {
        available.push({ plan, stats });
      }
    });

    return { startedPlans: started, availablePlans: available, finishedPlans: finished };
  }, [completedChapters, startedPlanIds, searchQuery, selectedCategory]);

  return (
    <section className="mb-10 sm:mb-16">
      <button type="button" className="md:hidden w-full flex min-h-[52px] items-center justify-between rounded-xl bg-surface px-4 text-left text-fg font-semibold" aria-expanded={mobileExpanded} aria-controls="reading-plans-content" onClick={() => setMobileExpanded(value => !value)}>
        <span>Reading plans</span><ChevronDown size={18} className={mobileExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      <div id="reading-plans-content" className={`${mobileExpanded ? 'block mt-5' : 'hidden'} md:block md:mt-0 space-y-6`}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="text-accent" size={20} />
            <h2 className="text-base sm:text-lg font-bold text-fg tracking-wide uppercase">
              Guided Scripture Reading Plans
            </h2>
          </div>
          <p className="text-xs text-meta mt-1">
            Structured reading paths that advance your chapter tracker, habits, and streak.
          </p>
        </div>

        {/* Search and Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter reading plans..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface/70 border border-border/70 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center bg-surface border border-border/70 rounded-xl p-0.5 text-[11px] overflow-x-auto">
            {['all', 'gospels', 'new-testament', 'epistles', 'wisdom', 'old-testament'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-accent text-accent-on font-semibold shadow-2xs'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {cat === 'all'
                  ? 'All'
                  : cat === 'new-testament'
                  ? 'New Test.'
                  : cat === 'old-testament'
                  ? 'Old Test.'
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. STARTED / ACTIVE READING PLANS */}
      {startedPlans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Flame className="text-accent" size={17} />
            <h3 className="text-xs sm:text-sm font-bold text-fg uppercase tracking-wider">
              Started Reading Plans ({startedPlans.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {startedPlans.map(({ plan, stats }) => (
              <div
                key={plan.id}
                className="p-4 sm:p-5 rounded-2xl border-2 border-accent/40 bg-surface/70 hover:bg-surface ring-shadow transition-all space-y-3.5 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent/20">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>

                <div className="flex items-start justify-between gap-2 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                        In Progress
                      </span>
                      <span className="text-[11px] text-muted flex items-center gap-1">
                        <Calendar size={11} />
                        ~{plan.estimatedDays} days
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-fg mt-1">
                      {plan.title}
                    </h4>
                    <p className="text-[11.5px] text-meta line-clamp-1">
                      {plan.tagline}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-accent text-accent-on shadow-2xs shrink-0">
                    {stats.percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-meta">
                    <span>Reading Progress</span>
                    <span className="font-semibold text-fg">
                      {stats.completedCount} / {stats.totalChapters} Chapters
                    </span>
                  </div>
                  <div className="h-2 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                    <div
                      className="h-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <div className="text-xs text-muted truncate">
                    {stats.nextChapter && (
                      <span>
                        Next: <strong className="text-fg">{stats.nextChapter.book} {stats.nextChapter.chapter}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLeavePlan(plan.id)}
                      className="text-[11px] text-muted hover:text-fg px-2 py-1 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                      title="Pause or remove from started plans"
                    >
                      Pause
                    </button>

                    {stats.nextChapter && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToChapter(
                            stats.nextChapter!.book,
                            stats.nextChapter!.chapter
                          )
                        }
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Continue Reading</span>
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. AVAILABLE READING PLANS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <BookOpen className="text-accent" size={17} />
          <h3 className="text-xs sm:text-sm font-bold text-fg uppercase tracking-wider">
            Available Reading Plans ({availablePlans.length})
          </h3>
        </div>

        {availablePlans.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted">
            No unstarted plans matching your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {availablePlans.map(({ plan, stats }) => (
              <div
                key={plan.id}
                className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-surface/50 hover:bg-surface ring-shadow transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 text-[11px] text-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface border border-border/70 font-mono text-[10px] uppercase font-semibold text-fg-2">
                      {plan.category.replace('-', ' ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      ~{plan.estimatedDays} days
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-fg group-hover:text-accent transition-colors">
                    {plan.title}
                  </h4>
                  <p className="text-[11.5px] text-meta line-clamp-2 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted font-medium">
                    {stats.totalChapters} chapters
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStartPlan(plan.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-accent text-fg hover:text-accent text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Play size={11} />
                    <span>Start Plan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. FINISHED / COMPLETED READING PLANS */}
      {finishedPlans.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/70">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="text-amber-500" size={17} />
            <h3 className="text-xs sm:text-sm font-bold text-fg uppercase tracking-wider">
              Finished Reading Plans ({finishedPlans.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {finishedPlans.map(({ plan, stats }) => (
              <div
                key={plan.id}
                className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <CheckCircle2 size={11} />
                      <span>Completed 100%</span>
                    </div>
                    <h4 className="text-sm font-bold text-fg">{plan.title}</h4>
                    <p className="text-[11.5px] text-meta">{plan.tagline}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-500 font-mono">
                    ✓ Done
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-muted">
                    Completed all {stats.totalChapters} chapters!
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (stats.firstChapter) {
                        onNavigateToChapter(
                          stats.firstChapter.book,
                          stats.firstChapter.chapter
                        );
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-fg hover:text-accent transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Review Plan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
