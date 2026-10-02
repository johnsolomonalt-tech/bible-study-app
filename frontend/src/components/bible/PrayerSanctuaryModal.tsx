"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Heart, 
  Check, 
  Trash2, 
  Sparkles, 
  Clock, 
  Play, 
  Square, 
  RotateCcw, 
  Tag, 
  BookOpen, 
  CheckCircle2, 
  Award,
  Send,
  Flame,
  MessageSquare
} from 'lucide-react';
import { 
  getPrayers, 
  addPrayer, 
  markPrayerAnswered, 
  deletePrayer, 
  PrayerItem, 
  PrayerCategory, 
  PRAYER_CATEGORIES 
} from '@/lib/prayerService';
import { recordHabitActivity } from '@/lib/streakService';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface PrayerSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVerseReference?: string;
  currentVerseText?: string;
  onNavigateToScripture?: (book: string, chapter: number, verse: number) => void;
}

export function PrayerSanctuaryModal({
  isOpen,
  onClose,
  currentVerseReference,
  currentVerseText,
  onNavigateToScripture,
}: PrayerSanctuaryModalProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'answered' | 'quiet' | 'ai'>('active');
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory | 'all'>('all');
  
  // Add Prayer Form State
  const [isAddingPrayer, setIsAddingPrayer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<PrayerCategory>('general');
  const [newScripture, setNewScripture] = useState(currentVerseReference || '');

  // Delete Confirm State
  const [prayerToDelete, setPrayerToDelete] = useState<PrayerItem | null>(null);

  // Answer Prayer Modal State
  const [answeringPrayer, setAnsweringPrayer] = useState<PrayerItem | null>(null);
  const [praiseNote, setPraiseNote] = useState('');

  // Quiet Time Timer State
  const [timerDuration, setTimerDuration] = useState<number>(180); // 3 minutes default
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isQuietTimeFinished, setIsQuietTimeFinished] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Scripture Prayer Generator State
  const [aiScripturePrompt, setAiScripturePrompt] = useState(
    currentVerseReference ? `${currentVerseReference} - "${currentVerseText?.slice(0, 100)}..."` : 'Philippians 4:6-7'
  );
  const [aiFocus, setAiFocus] = useState('peace, trust, and surrender');
  const [generatedAiPrayer, setGeneratedAiPrayer] = useState<string | null>(null);
  const [isGeneratingAiPrayer, setIsGeneratingAiPrayer] = useState(false);
  const [aiSavedSuccess, setAiSavedSuccess] = useState(false);

  // Load prayers on open or update
  const refreshPrayers = () => {
    setPrayers(getPrayers());
  };

  useEffect(() => {
    refreshPrayers();
    const handleUpdate = () => refreshPrayers();
    window.addEventListener('theologica_prayers_updated', handleUpdate);
    return () => window.removeEventListener('theologica_prayers_updated', handleUpdate);
  }, [isOpen]);

  // Sync default scripture prop
  useEffect(() => {
    if (currentVerseReference) {
      setNewScripture(currentVerseReference);
      setAiScripturePrompt(`${currentVerseReference} ${currentVerseText ? `"${currentVerseText.slice(0, 80)}..."` : ''}`);
    }
  }, [currentVerseReference, currentVerseText]);

  // Quiet Time Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            setIsQuietTimeFinished(true);
            // Record prayer habit in streak!
            recordHabitActivity('prayer');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !prayerToDelete && !answeringPrayer) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, prayerToDelete, answeringPrayer, onClose]);

  // Handle Create Prayer
  const handleCreatePrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addPrayer({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      scripture: newScripture.trim() || undefined,
    });

    setNewTitle('');
    setNewContent('');
    setNewScripture('');
    setIsAddingPrayer(false);
    refreshPrayers();
  };

  // Handle Mark Answered
  const handleConfirmAnswer = () => {
    if (!answeringPrayer) return;
    markPrayerAnswered(answeringPrayer.id, praiseNote);
    setAnsweringPrayer(null);
    setPraiseNote('');
    refreshPrayers();
  };

  // Handle Generate AI Prayer
  const handleGenerateAiPrayer = async () => {
    setIsGeneratingAiPrayer(true);
    setGeneratedAiPrayer(null);
    setAiSavedSuccess(false);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Prayer: ${aiScripturePrompt}`,
          prompt: `You are a reverent, warm, and pastorally sensitive prayer companion. 
Write a sincere, heartfelt personal prayer grounded in this scripture passage and theme:
Passage/Context: ${aiScripturePrompt}
Spiritual Focus: ${aiFocus}

Format the response purely as a beautiful, heartfelt prayer of devotion, repentance, praise, and petition (around 120-180 words). Do not include introductory notes or filler markdown headings; write the direct prayer to God.`,
        }),
      });

      if (!response.ok) {
        // Fallback prayer template if offline or server busy
        setGeneratedAiPrayer(`Heavenly Father, I come before You today resting in the truth of ${aiScripturePrompt}. Teach my heart to surrender every burden, anxiety, and longing into Your compassionate hands. Strengthen my faith where it wavers, and grant me Your peace which surpasses all understanding. May Your Holy Spirit guide my thoughts and actions so that in all things, Your grace is glorified. In Christ's precious name, Amen.`);
      } else {
        const data = await response.json();
        // Extract AI response text
        const prayerText = data.messages?.[1]?.content || data.reply || data.content;
        if (prayerText) {
          setGeneratedAiPrayer(prayerText);
        } else {
          setGeneratedAiPrayer(`Heavenly Father, thank You for the truth of ${aiScripturePrompt}. Draw my heart close to You in steadfast faith, peace, and adoration. Amen.`);
        }
      }
    } catch {
      setGeneratedAiPrayer(`Heavenly Father, I quiet my heart before You today in the light of Your Word. Where I am anxious, grant Your peace; where I am weary, be my strength. Keep my feet steadfast upon Your path. In Jesus' name, Amen.`);
    } finally {
      setIsGeneratingAiPrayer(false);
    }
  };

  const handleSaveAiPrayerToJournal = () => {
    if (!generatedAiPrayer) return;
    addPrayer({
      title: `Prayer from ${aiScripturePrompt}`,
      content: generatedAiPrayer,
      category: 'guidance',
      scripture: aiScripturePrompt,
    });
    setAiSavedSuccess(true);
    refreshPrayers();
  };

  const activePrayers = prayers.filter(p => !p.isAnswered);
  const answeredPrayers = prayers.filter(p => p.isAnswered);

  const filteredActivePrayers = selectedCategory === 'all'
    ? activePrayers
    : activePrayers.filter(p => p.category === selectedCategory);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/10 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <header className="px-6 py-5 border-b border-border/70 flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shadow-xs">
              <Heart size={20} className="fill-rose-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-fg tracking-tight">
                  Prayer Sanctuary
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                  Daily Rhythm
                </span>
              </div>
              <p className="text-xs text-muted">
                Bring your petitions, praise answered prayers, and rest in quiet contemplation.
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
        </header>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 px-6 pt-2 border-b border-border bg-bg/20 select-none overflow-x-auto custom-scroll">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'active'
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            <span>Active Petitions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent/15 text-accent font-bold">
              {activePrayers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('answered')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'answered'
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Answered Praises</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
              {answeredPrayers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiet')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'quiet'
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            <Clock size={14} className="text-blue-500" />
            <span>Quiet Time Timer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai'
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Pray this Scripture</span>
          </button>
        </nav>

        {/* Tab 1: Active Prayers */}
        {activeTab === 'active' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Action Bar & Categories */}
            <div className="p-4 sm:p-5 border-b border-border/60 bg-bg/30 flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 sm:pb-0 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-surface text-muted hover:text-fg border border-border'
                  }`}
                >
                  All ({activePrayers.length})
                </button>
                {PRAYER_CATEGORIES.map((cat) => {
                  const count = activePrayers.filter(p => p.category === cat.id).length;
                  if (count === 0 && selectedCategory !== cat.id) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        selectedCategory === cat.id
                          ? 'bg-accent text-white shadow-xs'
                          : 'bg-surface text-muted hover:text-fg border border-border'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Prayer Button */}
              <button
                type="button"
                onClick={() => setIsAddingPrayer(!isAddingPrayer)}
                className="px-3 py-1.5 rounded-xl bg-accent hover:opacity-90 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
              >
                <Plus size={14} />
                <span>{isAddingPrayer ? 'Cancel' : 'New Prayer'}</span>
              </button>
            </div>

            {/* Inline Add Prayer Form */}
            <AnimatePresence>
              {isAddingPrayer && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleCreatePrayer}
                  className="p-4 sm:p-5 bg-surface border-b border-border/80 space-y-3.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Add a Prayer Request
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPrayer(false)}
                      className="text-muted hover:text-fg text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="What are you praying for? (e.g., Peace for family, Guidance in decision...)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as PrayerCategory)}
                        className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                      >
                        {PRAYER_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">
                        Anchor Scripture (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Philippians 4:6-7"
                        value={newScripture}
                        onChange={(e) => setNewScripture(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <textarea
                      placeholder="Notes, reflections, or specific prayer words..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-xs sm:text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingPrayer(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-fg hover:bg-surface-hover cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      Save Prayer
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Prayers List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scroll">
              {filteredActivePrayers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-muted">
                    <Heart size={24} />
                  </div>
                  <h3 className="text-base font-semibold text-fg">No prayer requests in this view</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Bring your requests to God. Tap &ldquo;New Prayer&rdquo; above or use &ldquo;Pray this Scripture&rdquo; to generate a prayer from today’s reading.
                  </p>
                </div>
              ) : (
                filteredActivePrayers.map((prayer) => {
                  const categoryMeta = PRAYER_CATEGORIES.find(c => c.id === prayer.category) || PRAYER_CATEGORIES[0];
                  return (
                    <div
                      key={prayer.id}
                      className="p-4 sm:p-5 rounded-2xl bg-bg/80 border border-border hover:border-border-soft transition-all ring-shadow group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryMeta.color}`}>
                              {categoryMeta.icon} {categoryMeta.label}
                            </span>
                            {prayer.scripture && (
                              <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <BookOpen size={10} />
                                {prayer.scripture}
                              </span>
                            )}
                            <span className="text-[10px] text-muted ml-auto">
                              {new Date(prayer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-fg leading-snug break-words">
                            {prayer.title}
                          </h3>

                          {prayer.content && (
                            <p className="text-xs sm:text-sm text-fg-2 leading-relaxed whitespace-pre-wrap break-words">
                              {prayer.content}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAnsweringPrayer(prayer);
                              setPraiseNote('');
                            }}
                            className="p-2 rounded-xl bg-surface hover:bg-emerald-500/10 text-muted hover:text-emerald-500 border border-border transition-colors cursor-pointer"
                            title="Mark as Answered with Praise"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrayerToDelete(prayer)}
                            className="p-2 rounded-xl bg-surface hover:bg-rose-500/10 text-muted hover:text-rose-500 border border-border transition-colors cursor-pointer"
                            title="Delete Prayer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Answered Praises */}
        {activeTab === 'answered' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scroll">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-4 text-center space-y-1">
              <span className="text-xl">🙌</span>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Praise &amp; God’s Faithfulness
              </h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                &ldquo;The Lord has heard my plea; the Lord accepts my prayer.&rdquo; — Psalm 6:9
              </p>
            </div>

            {answeredPrayers.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-muted text-xs">
                <CheckCircle2 size={32} className="mx-auto opacity-50" />
                <p>No prayers marked as answered yet.</p>
                <p>When God answers a prayer, tap the checkmark icon on the active prayer card to celebrate it here.</p>
              </div>
            ) : (
              answeredPrayers.map((prayer) => (
                <div
                  key={prayer.id}
                  className="p-4 sm:p-5 rounded-2xl bg-bg/80 border border-emerald-500/30 ring-shadow space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Answered on {prayer.answeredAt ? new Date(prayer.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrayerToDelete(prayer)}
                      className="text-muted hover:text-rose-500 transition-colors cursor-pointer p-1"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-fg">
                    {prayer.title}
                  </h3>

                  {prayer.answerPraise ? (
                    <div className="p-3 rounded-xl bg-surface border border-emerald-500/20 text-xs sm:text-sm text-fg leading-relaxed">
                      <strong className="text-emerald-500 font-semibold block text-[11px] mb-0.5">
                        Answer &amp; Praise:
                      </strong>
                      {prayer.answerPraise}
                    </div>
                  ) : prayer.content ? (
                    <p className="text-xs text-fg-2">{prayer.content}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Quiet Time Timer */}
        {activeTab === 'quiet' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-display font-bold text-fg">
                Quiet Time &amp; Stillness
              </h3>
              <p className="text-xs text-muted">
                &ldquo;Be still, and know that I am God.&rdquo; — Psalm 46:10
              </p>
            </div>

            {/* Timer Ring & Breathing circle */}
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-4 border-accent/20 flex flex-col items-center justify-center bg-surface ring-shadow">
              {isTimerRunning && (
                <div className="absolute inset-0 rounded-full border-4 border-accent animate-ping opacity-20 pointer-events-none" />
              )}
              <span className="text-4xl sm:text-5xl font-mono font-bold text-fg tracking-tight">
                {formatTimer(timerSecondsLeft)}
              </span>
              <span className="text-xs font-semibold text-accent mt-1 uppercase tracking-wider">
                {isTimerRunning ? 'Meditating' : isQuietTimeFinished ? 'Completed!' : 'Ready'}
              </span>
            </div>

            {/* Timer Durations */}
            {!isTimerRunning && (
              <div className="flex items-center gap-2">
                {[60, 180, 300].map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => {
                      setTimerDuration(secs);
                      setTimerSecondsLeft(secs);
                      setIsQuietTimeFinished(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      timerDuration === secs
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface text-fg border-border hover:bg-surface-hover'
                    }`}
                  >
                    {secs / 60} {secs === 60 ? 'Minute' : 'Minutes'}
                  </button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-accent hover:opacity-90 text-white'
                }`}
              >
                {isTimerRunning ? <Square size={16} /> : <Play size={16} />}
                <span>{isTimerRunning ? 'Pause' : 'Start Quiet Time'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSecondsLeft(timerDuration);
                  setIsQuietTimeFinished(false);
                }}
                className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-muted hover:text-fg transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {isQuietTimeFinished && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold animate-in fade-in flex items-center gap-2">
                <Flame size={16} className="text-amber-500 fill-amber-500" />
                <span>Quiet time recorded! Your reading streak has been updated.</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Pray This Scripture (AI Prayer Companion) */}
        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scroll">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Sparkles size={14} />
                <span>Scripture-Grounded Prayer Generator</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Transform any passage of scripture into a heartfelt personal prayer of confession, trust, and worship.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg block mb-1">
                  Scripture Passage to Pray
                </label>
                <input
                  type="text"
                  value={aiScripturePrompt}
                  onChange={(e) => setAiScripturePrompt(e.target.value)}
                  placeholder="e.g. Psalm 23, Romans 8:38-39..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-xs sm:text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-fg block mb-1">
                  Personal Focus / Longing
                </label>
                <input
                  type="text"
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  placeholder="e.g. peace in uncertainty, gratitude, strength for my family..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-xs sm:text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAiPrayer}
                disabled={isGeneratingAiPrayer || !aiScripturePrompt.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-accent text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                <Sparkles size={16} />
                <span>{isGeneratingAiPrayer ? 'Composing Prayer with Scripture...' : 'Generate Prayer from Passage'}</span>
              </button>
            </div>

            {/* Generated Prayer Result */}
            {generatedAiPrayer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-bg border border-border space-y-3 ring-shadow"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    Generated Scripture Prayer
                  </span>
                  <span className="text-[11px] text-muted font-mono">{aiScripturePrompt}</span>
                </div>

                <p className="text-xs sm:text-sm text-fg leading-relaxed font-serif italic whitespace-pre-wrap">
                  &ldquo;{generatedAiPrayer}&rdquo;
                </p>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                  {aiSavedSuccess ? (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Check size={14} />
                      Saved to Active Prayers!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveAiPrayerToJournal}
                      className="px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Save to My Prayers</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Footer info */}
        <footer className="px-6 py-3 bg-bg/50 border-t border-border text-center text-[11px] text-muted flex items-center justify-between">
          <span>Prayers update your daily reading streak automatically.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            Done
          </button>
        </footer>
      </motion.div>

      {/* Answer Prayer Dialog */}
      <AnimatePresence>
        {answeringPrayer && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setAnsweringPrayer(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface border border-border rounded-2xl p-5 shadow-2xl space-y-3.5"
            >
              <div className="flex items-center gap-2.5 text-emerald-500">
                <CheckCircle2 size={20} />
                <h3 className="text-base font-bold text-fg">
                  Celebrate Answered Prayer
                </h3>
              </div>
              <p className="text-xs text-muted">
                How did God answer &ldquo;{answeringPrayer.title}&rdquo;? Record a note of praise and gratitude.
              </p>
              <textarea
                placeholder="Write your praise note..."
                value={praiseNote}
                onChange={(e) => setPraiseNote(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-xs sm:text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnsweringPrayer(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-fg hover:bg-surface-hover cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAnswer}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save as Answered
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={prayerToDelete !== null}
        title="Delete Prayer?"
        message={`Are you sure you want to delete "${prayerToDelete?.title || 'this prayer'}"?`}
        confirmLabel="Delete Prayer"
        variant="danger"
        icon="trash"
        onConfirm={() => {
          if (prayerToDelete) {
            deletePrayer(prayerToDelete.id);
            setPrayerToDelete(null);
            refreshPrayers();
          }
        }}
        onCancel={() => setPrayerToDelete(null)}
      />
    </div>
  );
}
