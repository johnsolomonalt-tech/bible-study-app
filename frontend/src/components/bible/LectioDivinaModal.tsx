"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  BookOpen, 
  Feather, 
  Save, 
  Volume2
} from 'lucide-react';

interface LectioDivinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  passageReference: string;
  passageText: string;
  theme: 'dark' | 'light';
  onSaveToNotes?: (title: string, content: string) => Promise<void>;
}

type Stage = 'lectio' | 'meditatio' | 'oratio' | 'contemplatio';

const STAGES: { id: Stage; title: string; subtitle: string; latin: string; icon: string }[] = [
  { id: 'lectio', title: 'Read', subtitle: 'Listen for God\'s voice in the text', latin: 'Lectio', icon: '📖' },
  { id: 'meditatio', title: 'Reflect', subtitle: 'What word or phrase touches your heart?', latin: 'Meditatio', icon: '🕊️' },
  { id: 'oratio', title: 'Pray', subtitle: 'Respond honestly in prayer to the Father', latin: 'Oratio', icon: '🙏' },
  { id: 'contemplatio', title: 'Rest', subtitle: 'Be still in His loving presence', latin: 'Contemplatio', icon: '🕯️' },
];

export function LectioDivinaModal({
  isOpen,
  onClose,
  passageReference,
  passageText,
  theme,
  onSaveToNotes,
}: LectioDivinaModalProps) {
  const isDark = theme === 'dark';
  const [currentStage, setCurrentStage] = useState<Stage>('lectio');
  const [reflectedPhrase, setReflectedPhrase] = useState('');
  const [prayerResponse, setPrayerResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Contemplation Timer (Seconds)
  const [timerDuration, setTimerDuration] = useState(120); // 2 minutes default
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
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

  const handleSaveToNotes = async () => {
    if (!onSaveToNotes) return;
    setIsSaving(true);
    try {
      const title = `Lectio Divina: ${passageReference || 'Scripture Reflection'}`;
      const content = `## Scripture: ${passageReference}\n\n> "${passageText}"\n\n` +
        `### Word or Phrase Stirring My Heart (Meditatio)\n${reflectedPhrase || '*Resting in the whole text.*'}\n\n` +
        `### Prayer of Response (Oratio)\n${prayerResponse || '*Offered silent prayer before the Lord.*'}\n\n` +
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] transition-all ${
          isDark 
            ? 'bg-[#151518] border-zinc-700/80 text-zinc-100 shadow-[0_25px_70px_rgba(0,0,0,0.85)]' 
            : 'bg-[#faf9f6] border-amber-200/80 text-zinc-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <Heart size={18} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold tracking-tight">
                Lectio Divina
              </h2>
              <p className="text-xs text-zinc-400">
                Ancient Christian Contemplative Prayer & Scripture Meditation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4-Stage Progress Stepper */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/40 flex items-center justify-between">
          {STAGES.map((st, i) => {
            const isActive = currentStage === st.id;
            const isCompleted = currentStageIndex > i;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setCurrentStage(st.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : isCompleted
                      ? 'text-amber-500 dark:text-amber-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{st.icon}</span>
                <span className="hidden sm:inline">{st.latin}</span>
              </button>
            );
          })}
        </div>

        {/* Stage Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scroll">
          {/* STAGE 1: LECTIO */}
          {currentStage === 'lectio' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Stage 1: Lectio (Read)</span>
                <h3 className="text-xl font-serif font-bold text-zinc-100">
                  {passageReference || 'Scripture Passage'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Read slowly, with gentle breath. Let the words wash over your mind without rushing.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border leading-relaxed font-serif text-base sm:text-lg italic shadow-inner ${
                isDark 
                  ? 'bg-zinc-900/80 border-zinc-800 text-zinc-200' 
                  : 'bg-white border-amber-100 text-zinc-800'
              }`}>
                &ldquo;{passageText || 'The LORD is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.'}&rdquo;
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStage('meditatio')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-all cursor-pointer shadow-md"
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
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Stage 2: Meditatio (Reflect)</span>
                <h3 className="text-xl font-serif font-bold text-zinc-100">What word strikes your heart?</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Hold this word in your spirit like a pearl. How does it touch your present life today?
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">
                  The word, phrase, or impression that captured your attention:
                </label>
                <input
                  type="text"
                  value={reflectedPhrase}
                  onChange={(e) => setReflectedPhrase(e.target.value)}
                  placeholder="e.g., 'He restores my soul' or 'Still waters'..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500' 
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStage('lectio')}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronLeft size={15} />
                  <span>Back to Scripture</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStage('oratio')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-all cursor-pointer shadow-md"
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
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Stage 3: Oratio (Pray)</span>
                <h3 className="text-xl font-serif font-bold text-zinc-100">Speak to God in response</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Dialogue with your Creator about what He revealed. Pour out your gratitude, confession, or need.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">
                  Your prayer of response:
                </label>
                <textarea
                  value={prayerResponse}
                  onChange={(e) => setPrayerResponse(e.target.value)}
                  placeholder="Lord, in light of Your word, I bring before You..."
                  rows={4}
                  className={`w-full p-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500' 
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div className="flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStage('meditatio')}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-all cursor-pointer shadow-md"
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
                <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">Stage 4: Contemplatio (Rest)</span>
                <h3 className="text-xl font-serif font-bold text-zinc-100">Rest quietly in God&apos;s love</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Release all words and striving. Simply abide in the presence of the One who loves you unconditionally.
                </p>
              </div>

              {/* Countdown Timer Display */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-36 h-36 rounded-full border-4 border-amber-500/30 flex items-center justify-center relative">
                  <div className="text-3xl font-mono font-bold tracking-tight text-amber-400">
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-2.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer shadow-sm"
                  >
                    {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimeRemaining(timerDuration);
                    }}
                    className="p-2.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
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
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {sec / 60}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Feather size={14} className="text-amber-500" />
            <span>&ldquo;Be still and know that I am God.&rdquo; — Psalm 46:10</span>
          </div>

          <div className="flex items-center gap-2">
            {onSaveToNotes && (
              <button
                type="button"
                onClick={handleSaveToNotes}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                  isSaved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                }`}
              >
                {isSaved ? <Check size={14} /> : <Save size={14} />}
                <span>{isSaved ? 'Saved to Notes!' : 'Save Reflection to Notes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
