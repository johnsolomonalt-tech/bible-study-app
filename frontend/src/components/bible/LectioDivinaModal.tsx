"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Heart, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Feather, 
  Save,
  AlertCircle
} from 'lucide-react';

interface LectioDivinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  passageReference: string;
  passageText?: string;
  verses?: { verse: number; text: string }[];
  theme: 'dark' | 'light';
  onSaveToNotes?: (title: string, content: string) => Promise<void>;
}

type Stage = 'lectio' | 'meditatio' | 'oratio' | 'contemplatio';

const STAGES: { id: Stage; title: string; subtitle: string; latin: string }[] = [
  { id: 'lectio', title: 'Read', subtitle: 'Listen for God\'s voice in the text', latin: 'Lectio' },
  { id: 'meditatio', title: 'Reflect', subtitle: 'What word or phrase touches your heart?', latin: 'Meditatio' },
  { id: 'oratio', title: 'Pray', subtitle: 'Respond honestly in prayer to the Father', latin: 'Oratio' },
  { id: 'contemplatio', title: 'Rest', subtitle: 'Be still in His loving presence', latin: 'Contemplatio' },
];

export function LectioDivinaModal({
  isOpen,
  onClose,
  passageReference,
  passageText,
  verses,
  theme,
  onSaveToNotes,
}: LectioDivinaModalProps) {
  const [currentStage, setCurrentStage] = useState<Stage>('lectio');
  const [reflectedPhrase, setReflectedPhrase] = useState('');
  const [prayerResponse, setPrayerResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Contemplation Timer (Seconds)
  const [timerDuration, setTimerDuration] = useState(120); // 2 minutes default
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Clean and format verses so each starts on an enter/line break with no spacing inside lines
  const formattedVerses: { verse: number | string; text: string }[] = useMemo(() => {
    if (verses && verses.length > 0) {
      return verses.map((v) => ({
        verse: v.verse,
        text: v.text
          .replace(/\[\s*[HG]\d+\s*\]/g, '')
          .replace(/<\/?em>/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      }));
    }
    if (passageText) {
      const lines = passageText.split('\n').filter((l) => l.trim().length > 0);
      return lines.map((line, idx) => {
        const match = line.match(/^(\d+)\s*(.*)$/);
        if (match) {
          return {
            verse: parseInt(match[1], 10),
            text: match[2]
              .replace(/\[\s*[HG]\d+\s*\]/g, '')
              .replace(/<\/?em>/gi, '')
              .replace(/\s+/g, ' ')
              .trim()
          };
        }
        return {
          verse: idx + 1,
          text: line
            .replace(/\[\s*[HG]\d+\s*\]/g, '')
            .replace(/<\/?em>/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
        };
      });
    }
    return [
      {
        verse: 1,
        text: 'The LORD is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.'
      }
    ];
  }, [verses, passageText]);

  // Validation rules
  const hasMeditatioText = reflectedPhrase.trim().length > 0;
  const hasOratioText = prayerResponse.trim().length > 0;
  const canSaveToNotes = isFinished && hasMeditatioText && hasOratioText;

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStage('lectio');
      setReflectedPhrase('');
      setPrayerResponse('');
      setIsFinished(false);
      setIsSaved(false);
      setTimeRemaining(120);
      setIsTimerRunning(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsFinished(true);
            playGentleBell();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  const playGentleBell = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, audioCtx.currentTime); // 528 Hz gentle tone
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 3.5);
    } catch {
      // Audio context restricted or unavailable
    }
  };

  const handleCompleteContemplation = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);
    setIsFinished(true);
    playGentleBell();
  };

  const handleSaveToNotes = async () => {
    if (!onSaveToNotes || !canSaveToNotes) return;
    setIsSaving(true);
    try {
      const title = `Lectio Divina: ${passageReference || 'Scripture Reflection'}`;
      const versesMd = formattedVerses.map((v) => `**${v.verse}** ${v.text}`).join('\n\n');
      const content = `## Scripture: ${passageReference}\n\n${versesMd}\n\n` +
        `### Word or Phrase Stirring My Heart (Meditatio)\n${reflectedPhrase.trim()}\n\n` +
        `### Prayer of Response (Oratio)\n${prayerResponse.trim()}\n\n` +
        `*Completed with Contemplatio on ${new Date().toLocaleDateString()}*`;

      await onSaveToNotes(title, content);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save reflection to notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-3xl shadow-2xl border border-border bg-bg text-fg overflow-hidden flex flex-col max-h-[92vh] ring-1 ring-border transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-surface/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/25">
              <Heart size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-fg tracking-tight">
                Lectio Divina
              </h2>
              <p className="text-xs text-muted">
                Ancient Christian Contemplative Prayer & Scripture Meditation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4-Stage Navigation Toolbar */}
        <div className="px-3 sm:px-6 py-2.5 border-b border-border bg-surface/30">
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-surface border border-border/70 shadow-xs">
            {STAGES.map((st) => {
              const isActive = currentStage === st.id;
              const isStageDone = 
                (st.id === 'lectio') ? (currentStageIndex > 0) :
                (st.id === 'meditatio') ? (hasMeditatioText) :
                (st.id === 'oratio') ? (hasOratioText) :
                (isFinished);

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCurrentStage(st.id)}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all cursor-pointer relative select-none ${
                    isActive
                      ? 'bg-accent text-accent-on font-semibold shadow-xs ring-1 ring-accent/30'
                      : isStageDone
                        ? 'text-accent hover:bg-accent/10 font-medium'
                        : 'text-muted hover:text-fg hover:bg-surface-warm font-medium'
                  }`}
                  title={`${st.latin} (${st.title}): ${st.subtitle}`}
                >
                  <span className="text-[11.5px] sm:text-xs font-semibold tracking-tight truncate">
                    {st.latin}
                  </span>
                  {isStageDone && !isActive && (
                    <Check size={12} className="text-accent shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Content */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scroll">
          {/* STAGE 1: LECTIO */}
          {currentStage === 'lectio' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent font-bold">Lectio &bull; Read</span>
                <h3 className="text-xl font-serif font-bold text-fg">
                  {passageReference || 'Scripture Passage'}
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Read slowly, with gentle breath. Let each verse settle into your spirit without rushing.
                </p>
              </div>

              {/* Formatted Verses List */}
              <div className="p-4 sm:p-6 rounded-2xl border border-border bg-surface/50 font-serif shadow-inner max-h-72 sm:max-h-80 overflow-y-auto custom-scroll space-y-2.5 text-left">
                {formattedVerses.map((v) => (
                  <div key={v.verse} className="flex items-start gap-2.5 text-fg leading-snug">
                    <span className="font-mono text-xs font-bold text-accent select-none pt-0.5 min-w-[20px] text-right shrink-0">
                      {v.verse}
                    </span>
                    <p className="text-sm sm:text-base text-fg/90 flex-1 break-words">
                      {v.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStage('meditatio')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-on font-semibold text-xs hover:bg-accent/90 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <span>Proceed to Meditatio (Reflect)</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: MEDITATIO */}
          {currentStage === 'meditatio' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent font-bold">Meditatio &bull; Reflect</span>
                <h3 className="text-xl font-serif font-bold text-fg">What word strikes your heart?</h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Hold this word in your spirit like a pearl. How does it touch your present life today?
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted flex items-center justify-between">
                  <span>The word, phrase, or impression that captured your attention:</span>
                  {hasMeditatioText && (
                    <span className="text-accent text-[11px] font-medium flex items-center gap-1">
                      <Check size={12} /> Ready
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={reflectedPhrase}
                  onChange={(e) => setReflectedPhrase(e.target.value)}
                  placeholder="e.g., 'He restores my soul' or 'Still waters'..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-fg placeholder:text-meta text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStage('lectio')}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-fg hover:bg-surface px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  <span>Back to Scripture</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStage('oratio')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-on font-semibold text-xs hover:bg-accent/90 transition-all cursor-pointer shadow-sm active:scale-98 ml-auto"
                >
                  <span>Proceed to Oratio (Pray)</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: ORATIO */}
          {currentStage === 'oratio' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent font-bold">Oratio &bull; Pray</span>
                <h3 className="text-xl font-serif font-bold text-fg">Speak to God in response</h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Dialogue with your Creator about what He revealed. Pour out your gratitude, confession, or need.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted flex items-center justify-between">
                  <span>Your prayer of response:</span>
                  {hasOratioText && (
                    <span className="text-accent text-[11px] font-medium flex items-center gap-1">
                      <Check size={12} /> Ready
                    </span>
                  )}
                </label>
                <textarea
                  value={prayerResponse}
                  onChange={(e) => setPrayerResponse(e.target.value)}
                  placeholder="Lord, in light of Your word, I bring before You..."
                  rows={4}
                  className="w-full p-4 rounded-xl border border-border bg-surface text-fg placeholder:text-meta text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStage('meditatio')}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-fg hover:bg-surface px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  <span>Back to Meditatio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStage('contemplatio');
                    setTimeRemaining(timerDuration);
                    setIsTimerRunning(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-on font-semibold text-xs hover:bg-accent/90 transition-all cursor-pointer shadow-sm active:scale-98 ml-auto"
                >
                  <span>Proceed to Contemplatio (Rest)</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: CONTEMPLATIO */}
          {currentStage === 'contemplatio' && (
            <div className="space-y-6 text-center animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent font-bold">Contemplatio &bull; Rest</span>
                <h3 className="text-xl font-serif font-bold text-fg">Rest quietly in God&apos;s love</h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  {isFinished
                    ? (canSaveToNotes
                        ? "Your contemplation is complete. You can now save your full reflection to your Notes below, or rest here longer in His presence."
                        : "You finished the contemplation! Please fill in your Meditatio reflection and Oratio prayer below to save your session to Notes.")
                    : "Release all words and striving. Simply abide in the presence of the One who loves you unconditionally."}
                </p>
              </div>

              {isFinished ? (
                <div className="py-6 px-4 sm:px-6 rounded-2xl bg-surface/50 border border-border text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Check size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-base text-fg">Contemplation Complete</h4>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      {canSaveToNotes
                        ? "All four stages of Lectio Divina have been fulfilled. Save your reflection, stirring phrase, and prayer directly into your Notes."
                        : "Almost done! Add some text to your Meditatio and Oratio stages below to unlock saving to your Notes."}
                    </p>
                  </div>

                  {/* Inline quick-completion if Meditatio or Oratio is empty */}
                  {(!hasMeditatioText || !hasOratioText) && (
                    <div className="space-y-3.5 pt-1 text-left max-w-lg mx-auto bg-surface/80 p-4 rounded-2xl border border-border/80 shadow-xs">
                      <div className="text-xs font-semibold text-fg flex items-center gap-1.5 pb-1 border-b border-border/60">
                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                        <span>Required to save to Notes:</span>
                      </div>

                      {!hasMeditatioText && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                            <span>Meditatio (What word or phrase touched you?):</span>
                            <button
                              type="button"
                              onClick={() => setCurrentStage('meditatio')}
                              className="text-accent hover:underline text-[10px]"
                            >
                              Go to Meditatio &rarr;
                            </button>
                          </div>
                          <input
                            type="text"
                            value={reflectedPhrase}
                            onChange={(e) => setReflectedPhrase(e.target.value)}
                            placeholder="e.g., 'He restores my soul' or a key phrase..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-fg placeholder:text-meta text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                          />
                        </div>
                      )}

                      {!hasOratioText && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                            <span>Oratio (Your prayer of response):</span>
                            <button
                              type="button"
                              onClick={() => setCurrentStage('oratio')}
                              className="text-accent hover:underline text-[10px]"
                            >
                              Go to Oratio &rarr;
                            </button>
                          </div>
                          <textarea
                            value={prayerResponse}
                            onChange={(e) => setPrayerResponse(e.target.value)}
                            placeholder="Lord, in response to Your word, I pray..."
                            rows={3}
                            className="w-full p-3.5 rounded-xl border border-border bg-surface text-fg placeholder:text-meta text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-all"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {onSaveToNotes && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleSaveToNotes}
                        disabled={!canSaveToNotes || isSaving}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm select-none ${
                          isSaved
                            ? 'bg-emerald-600 text-white cursor-default'
                            : !canSaveToNotes
                              ? 'bg-surface text-muted/50 border border-border/80 cursor-not-allowed opacity-50'
                              : 'bg-accent text-accent-on hover:bg-accent/90 active:scale-95 cursor-pointer ring-1 ring-accent/30'
                        }`}
                      >
                        {isSaved ? <Check size={14} /> : <Save size={14} />}
                        <span>
                          {isSaved
                            ? 'Saved to Notes!'
                            : !canSaveToNotes
                              ? 'Fill Meditatio & Oratio to Save'
                              : 'Save Full Reflection to Notes'}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFinished(false);
                        setTimeRemaining(timerDuration);
                        setIsTimerRunning(true);
                      }}
                      className="text-xs text-muted hover:text-fg transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Continue Contemplation</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Countdown Timer Display */
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-36 h-36 rounded-full border-4 border-accent/30 bg-surface/30 flex items-center justify-center relative shadow-inner">
                    <div className="text-3xl font-mono font-bold tracking-tight text-accent">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="p-2.5 rounded-full bg-accent text-accent-on hover:bg-accent/90 transition-all cursor-pointer shadow-sm active:scale-95"
                      title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                    >
                      {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        setTimeRemaining(timerDuration);
                      }}
                      className="p-2.5 rounded-full bg-surface text-fg-2 hover:text-fg hover:bg-surface-warm border border-border-soft transition-all cursor-pointer"
                      title="Reset Timer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  {/* Duration Presets */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {[60, 120, 300].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setTimerDuration(sec);
                          setTimeRemaining(sec);
                          setIsTimerRunning(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          timerDuration === sec
                            ? 'bg-accent/15 text-accent border border-accent/40 shadow-xs'
                            : 'text-muted hover:text-fg hover:bg-surface border border-transparent'
                        }`}
                      >
                        {sec / 60}m
                      </button>
                    ))}
                  </div>

                  {/* Complete Contemplation Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleCompleteContemplation}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface text-fg-2 hover:text-fg hover:bg-surface-warm border border-border-soft text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                      title="Complete your contemplation period"
                    >
                      <Check size={14} className="text-accent" />
                      <span>Finish Contemplation</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-surface/30 flex flex-wrap gap-2 items-center justify-between">
          <div className="text-xs text-muted flex items-center gap-1.5">
            <Feather size={14} className="text-accent shrink-0" />
            <span className="hidden sm:inline">&ldquo;Be still and know that I am God.&rdquo; — Psalm 46:10</span>
            <span className="sm:hidden text-[11px]">Psalm 46:10</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onSaveToNotes && (
              <button
                type="button"
                onClick={handleSaveToNotes}
                disabled={!canSaveToNotes || isSaving}
                title={
                  !isFinished
                    ? "Complete contemplation in Contemplatio to save"
                    : !hasMeditatioText && !hasOratioText
                      ? "Add reflection in Meditatio and prayer in Oratio to save"
                      : !hasMeditatioText
                        ? "Add reflection in Meditatio to save"
                        : !hasOratioText
                          ? "Add prayer in Oratio to save"
                          : "Save reflection to Notes"
                }
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm select-none ${
                  isSaved
                    ? 'bg-emerald-600 text-white cursor-default'
                    : !canSaveToNotes
                      ? 'bg-surface text-muted/50 border border-border/60 cursor-not-allowed opacity-50'
                      : 'bg-accent text-accent-on hover:bg-accent/90 active:scale-95 cursor-pointer ring-1 ring-accent/30'
                }`}
              >
                {isSaved ? <Check size={14} /> : <Save size={14} />}
                <span>
                  {isSaved
                    ? 'Saved!'
                    : !isFinished
                      ? 'Save to Notes'
                      : !hasMeditatioText || !hasOratioText
                        ? 'Requires Meditatio & Oratio'
                        : 'Save to Notes'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

