"use client";

import React, { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { 
  Sparkles, 
  Workflow, 
  Network, 
  FileText, 
  BookOpen, 
  Plus, 
  Download, 
  ArrowRight, 
  Layers, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Lightbulb,
  Compass
} from 'lucide-react';
import { CanvasBoardMetadata } from '@/types/canvas';
import { validateBiblePrompt } from '@/lib/bibleValidation';

type CanvasMode = 'generate' | 'discourse' | 'synthesize';

interface CanvasStartPageProps {
  onGenerateCanvas: (prompt: string, mode: CanvasMode, lens: string) => Promise<void>;
  onCreateBlankCanvas: () => void;
  onOpenImportModal: () => void;
  onSelectBoard: (boardId: string) => void;
  onResumeActiveBoard?: () => void;
  activeBoard?: { id: string; title: string; nodeCount: number } | null;
  recentBoards: CanvasBoardMetadata[];
  onOpenSidebar: () => void;
  isGenerating: boolean;
  generatingStep: number;
  onCancelGeneration: () => void;
  theme: 'dark' | 'light';
}

const PRESET_TOPICS = [
  { label: "Romans 8:28-30 (Golden Chain)", query: "Map Romans 8:28-30 (The Golden Chain of Redemption) with scripture, doctrinal implications, and applications" },
  { label: "Covenant of Grace", query: "Theological structure and biblical progression of the Covenant of Grace across the Old and New Testaments" },
  { label: "Beatitudes in Matthew 5", query: "Mind-map of the Beatitudes in Matthew 5 with kingdom virtues and modern Christian applications" },
  { label: "Messianic Prophecies", query: "Old Testament Messianic prophecies and their direct fulfillment in Jesus Christ" },
  { label: "Philippians 2:5-11 (Christ Hymn)", query: "Logic diagram of Philippians 2:5-11 from kenosis (humiliation) to exaltation and universal confession" },
];

const DISCOURSE_TOPICS = [
  { label: "Romans 8:28-39 (Sovereignty to Glory)", query: "Discourse analysis of Romans 8:28-39 diagramming Paul's logical chain from foreknowledge to eternal security" },
  { label: "Ephesians 2:1-10 (Grace & Calling)", query: "Argument flowchart of Ephesians 2:1-10 diagramming condition of sin, divine intervention ('But God'), and grace unto good works" },
  { label: "Galatians 3:1-14 (Faith vs Law)", query: "Discourse tree of Paul's argument in Galatians 3 contrasting works of the law with the promise to Abraham" },
];

export function CanvasStartPage({
  onGenerateCanvas,
  onCreateBlankCanvas,
  onOpenImportModal,
  onSelectBoard,
  onResumeActiveBoard,
  activeBoard,
  recentBoards,
  onOpenSidebar,
  isGenerating,
  generatingStep,
  onCancelGeneration,
  theme,
}: CanvasStartPageProps) {
  const isDark = theme === 'dark';
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<CanvasMode>('generate');
  const [selectedLens, setSelectedLens] = useState<'canonical' | 'patristic' | 'reformation' | 'scholarly' | 'contemplative'>('canonical');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, mode]);

  const handleStartSubmit = (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt || prompt).trim();
    if (!finalPrompt || isGenerating) return;

    const validation = validateBiblePrompt(finalPrompt, mode);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please enter a topic, question, or passage related to Scripture.');
      return;
    }

    setValidationError(null);
    onGenerateCanvas(finalPrompt, mode, selectedLens);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing || (e as any).keyCode === 229) {
        return;
      }
      handleStartSubmit();
    }
  };

  const MILESTONES = [
    "Analyzing biblical passages & systematic theology...",
    "Tracing cross-references & doctrinal connections...",
    "Formulating structured theological cards...",
    "Computing collision-free spatial layout coordinates...",
  ];

  return (
    <div 
      className="w-full h-full overflow-y-auto custom-scroll flex flex-col items-center justify-start p-4 sm:p-6 md:p-10 select-none animate-in fade-in duration-300"
      style={{
        backgroundColor: isDark ? '#161618' : '#F6F6F6',
      }}
    >
      <div className="w-full max-w-2xl my-auto space-y-6">
        {/* Top Active Canvas Banner (Resume editing) */}
        {activeBoard && activeBoard.nodeCount > 0 && onResumeActiveBoard && !isGenerating && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl border border-accent/30 bg-accent/10 backdrop-blur-md text-xs transition-all shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <Layers size={15} className="text-accent shrink-0" />
              <div className="truncate">
                <span className="text-zinc-500 dark:text-zinc-400">Open canvas: </span>
                <span className="font-bold text-accent">{activeBoard.title}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">({activeBoard.nodeCount} cards)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onResumeActiveBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent/90 transition-all cursor-pointer shrink-0 ml-2"
            >
              <span>Resume Canvas</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Central Creation Card */}
        <div 
          className={`w-full rounded-3xl border shadow-2xl backdrop-blur-xl p-5 sm:p-8 transition-all duration-300 ${
            isDark 
              ? 'bg-[#1c1c20]/95 border-zinc-800/90 text-zinc-100 shadow-black/40' 
              : 'bg-white/95 border-zinc-200/90 text-zinc-900 shadow-zinc-200/60'
          }`}
        >
          {isGenerating ? (
            /* HUD GENERATION STATE */
            <div className="py-8 px-2 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 text-center">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-accent/15 border border-accent/30 animate-pulse" />
                <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent border border-accent/40 flex items-center justify-center shadow-xs">
                  <Sparkles size={24} className="animate-pulse text-accent" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Architecting Your Canvas Board
                </h3>
                <p className="text-xs text-accent font-medium">
                  {MILESTONES[generatingStep] || 'Finalizing cards and connections...'}
                </p>
              </div>

              <div className="w-full max-w-md p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 space-y-2.5 text-xs text-left">
                {MILESTONES.map((m, idx) => {
                  const isDone = idx < generatingStep;
                  const isCurrent = idx === generatingStep;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2.5 transition-all duration-300 ${
                        isDone ? 'text-emerald-500 font-medium' : isCurrent ? 'text-accent font-semibold' : 'text-zinc-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                      ) : isCurrent ? (
                        <Loader2 size={15} className="shrink-0 animate-spin text-accent" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0 ml-0.5" />
                      )}
                      <span className="truncate">{m}</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onCancelGeneration}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <X size={14} />
                <span>Cancel Generation</span>
              </button>
            </div>
          ) : (
            /* NORMAL START VIEW */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs shrink-0">
                  <Workflow size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight">
                      Create with Theologica AI
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 uppercase tracking-wider">
                      Architect
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Architect interactive scripture mind-maps, logic flowcharts, and doctrinal graphs.
                  </p>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setMode('generate')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all font-medium whitespace-nowrap cursor-pointer ${
                    mode === 'generate'
                      ? 'bg-white dark:bg-zinc-800 text-accent font-semibold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Network size={14} />
                  <span>Mind-Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('discourse')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all font-medium whitespace-nowrap cursor-pointer ${
                    mode === 'discourse'
                      ? 'bg-white dark:bg-zinc-800 text-accent font-semibold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Workflow size={14} />
                  <span>Logic Flowchart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('synthesize')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all font-medium whitespace-nowrap cursor-pointer ${
                    mode === 'synthesize'
                      ? 'bg-white dark:bg-zinc-800 text-accent font-semibold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <FileText size={14} />
                  <span>Topic Synthesis</span>
                </button>
              </div>

              {/* Primary AI Study Prompt Box */}
              <div className="space-y-2">
                <div className="relative rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-900/60 shadow-xs focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 transition-all p-3.5 sm:p-4">
                  <TextareaAutosize
                    ref={textareaRef}
                    minRows={3}
                    maxRows={7}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      mode === 'discourse'
                        ? "e.g. Diagram the logical argument and flow of Romans 8:28-39 or Galatians 3:1-14..."
                        : mode === 'synthesize'
                        ? "e.g. Synthesize the key doctrines, biblical connections, and study takeaways on the Covenant of Grace..."
                        : "e.g. Map Romans 8:28-30 (The Golden Chain of Redemption) with scripture, doctrinal implications, and applications..."
                    }
                    className="w-full bg-transparent text-[14px] sm:text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed block"
                    autoFocus
                  />

                  {/* Prompt Box Action Bar */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="hidden sm:inline">Press</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">Enter</kbd>
                      <span className="hidden sm:inline">to generate</span>
                      <span className="text-zinc-400 hidden sm:inline">·</span>
                      <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">Shift+Enter</kbd> for newline</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartSubmit()}
                      disabled={!prompt.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:hover:bg-accent active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>Generate Canvas</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation Error Message */}
              {validationError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Tradition Lens Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2 py-2 px-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-semibold">
                  <BookOpen size={13} className="text-accent" />
                  <span>Tradition Lens:</span>
                </div>
                <div className="flex items-center flex-wrap gap-1">
                  {[
                    { id: 'canonical', label: 'Canonical', icon: '🕊️' },
                    { id: 'patristic', label: 'Patristic', icon: '🏛️' },
                    { id: 'reformation', label: 'Reformed', icon: '📜' },
                    { id: 'scholarly', label: 'Scholarly', icon: '🔍' },
                    { id: 'contemplative', label: 'Devotional', icon: '🌿' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLens(l.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        selectedLens === l.id
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>{l.icon} {l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestion Chips */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-amber-500 shrink-0" />
                  <span>Need inspiration? Try a sample topic:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(mode === 'discourse' ? DISCOURSE_TOPICS : PRESET_TOPICS).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(item.query);
                        handleStartSubmit(item.query);
                      }}
                      className="text-xs text-left px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:border-accent/60 hover:text-accent transition-all cursor-pointer shadow-xs flex items-center gap-1.5 group"
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={11} className="text-zinc-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternative Creation Actions Row */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCreateBlankCanvas}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Blank Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenImportModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Import Shared Canvas</span>
                  </button>
                </div>

                {recentBoards.length > 0 && (
                  <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="text-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Canvases ({recentBoards.length})</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Canvases Row (Quick switcher) */}
        {!isGenerating && recentBoards.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Or continue a recent canvas:
              </span>
              <button
                type="button"
                onClick={onOpenSidebar}
                className="text-xs text-accent hover:underline font-semibold"
              >
                Manage Canvases
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {recentBoards.slice(0, 3).map((board) => (
                <div
                  key={board.id}
                  onClick={() => onSelectBoard(board.id)}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:border-accent/60 hover:shadow-md flex flex-col justify-between ${
                    isDark 
                      ? 'bg-[#1c1c20]/80 border-zinc-800/80 hover:bg-zinc-800/80' 
                      : 'bg-white border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                        <Layers size={13} />
                      </div>
                      <span className="text-xs font-bold truncate group-hover:text-accent transition-colors">
                        {board.title || 'Untitled Canvas'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <span>{board.nodeCount || 0} cards</span>
                    <span className="group-hover:translate-x-0.5 text-accent font-semibold transition-transform flex items-center gap-0.5">
                      Open <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
