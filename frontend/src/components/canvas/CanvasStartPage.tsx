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
  PanelLeft,
  CheckCircle2, 
  Loader2, 
  X, 
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { validateBiblePrompt } from '@/lib/bibleValidation';

export type CanvasMode = 'generate' | 'discourse' | 'synthesize';

interface CanvasStartPageProps {
  onGenerateCanvas: (prompt: string, mode: CanvasMode, lens: string) => Promise<void>;
  onCreateBlankCanvas: () => void;
  onOpenImportModal: () => void;
  onSelectBoard: (boardId: string) => void;
  onResumeActiveBoard?: () => void;
  activeBoard?: { id: string; title: string; nodeCount: number } | null;
  onOpenSidebar: () => void;
  isSidebarOpen?: boolean;
  isGenerating: boolean;
  generatingStep: number;
  onCancelGeneration: () => void;
  theme: 'dark' | 'light';
}

const PRESET_IDEAS = [
  { label: "Romans 8:28-30 (Golden Chain)", query: "Map Romans 8:28-30 (The Golden Chain of Redemption) with scripture, doctrinal implications, and applications" },
  { label: "Covenant of Grace", query: "Theological structure and biblical progression of the Covenant of Grace across the Old and New Testaments" },
  { label: "Beatitudes in Matthew 5", query: "Mind-map of the Beatitudes in Matthew 5 with kingdom virtues and modern Christian applications" },
  { label: "Philippians 2:5-11 (Christ Hymn)", query: "Logic diagram of Philippians 2:5-11 from humiliation to exaltation" },
];

const DISCOURSE_IDEAS = [
  { label: "Romans 8:28-39 (Sovereignty to Glory)", query: "Discourse analysis of Romans 8:28-39 diagramming Paul's logical chain from foreknowledge to eternal security" },
  { label: "Ephesians 2:1-10 (Grace & Calling)", query: "Argument flowchart of Ephesians 2:1-10 diagramming condition of sin, divine intervention ('But God'), and grace unto good works" },
  { label: "Galatians 3:1-14 (Faith vs Law)", query: "Discourse tree of Paul's argument in Galatians 3 contrasting works of the law with the promise to Abraham" },
];

export function CanvasStartPage({
  onGenerateCanvas,
  onCreateBlankCanvas,
  onOpenImportModal,
  onResumeActiveBoard,
  activeBoard,
  onOpenSidebar,
  isSidebarOpen = true,
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
    "Searching Scripture passages & context...",
    "Finding cross-references & key verses...",
    "Creating study cards...",
    "Arranging cards on your board...",
  ];

  return (
    <div 
      className="w-full h-full overflow-y-auto custom-scroll flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none animate-in fade-in duration-200 bg-bg text-fg"
      style={{
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* Top Bar Navigation */}
      <div className="w-full flex items-center justify-between shrink-0 mb-4">
        {/* Toggle Canvases Sidebar (if collapsed or mobile) */}
        {!isSidebarOpen ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-fg-2 hover:text-fg hover:bg-surface-hover text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Open Canvases Sidebar"
          >
            <PanelLeft size={14} className="text-accent" />
            <span>Your Canvases</span>
          </button>
        ) : (
          <div />
        )}

        {/* Return to Open Canvas (if active) */}
        {activeBoard && activeBoard.nodeCount > 0 && onResumeActiveBoard && !isGenerating && (
          <button
            type="button"
            onClick={onResumeActiveBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-auto"
          >
            <Workflow size={13} className="text-accent shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-xs">Return to &quot;{activeBoard.title}&quot;</span>
            <ArrowRight size={12} className="shrink-0" />
          </button>
        )}
      </div>

      {/* Main Center Area */}
      <div className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center space-y-6">
        {isGenerating ? (
          /* HUD GENERATION STATE */
          <div 
            className="w-full max-w-lg rounded-2xl border border-border bg-surface text-fg p-6 sm:p-8 flex flex-col items-center text-center space-y-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
          >
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 rounded-2xl bg-accent/15 border border-accent/30 animate-pulse" />
              <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent border border-accent/40 flex items-center justify-center shadow-xs">
                <Sparkles size={20} className="animate-pulse text-accent" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold tracking-tight">
                Building Your Canvas
              </h3>
              <p className="text-xs text-accent font-medium">
                {MILESTONES[generatingStep] || 'Finalizing cards and connections...'}
              </p>
            </div>

            <div className={`w-full p-3.5 rounded-xl border text-xs text-left space-y-2.5 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
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
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    ) : isCurrent ? (
                      <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-zinc-400 dark:border-zinc-700 shrink-0 ml-0.5" />
                    )}
                    <span className="truncate">{m}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onCancelGeneration}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <X size={13} />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          /* CLEAN START VIEW */
          <>
            {/* Hero Header */}
            <div className="flex flex-col items-center text-center space-y-2 px-2">
              <div className="w-11 h-11 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-xs">
                <Sparkles size={20} className="text-accent" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                Create a Study Board
              </h1>
              <p className="text-xs sm:text-sm text-muted max-w-md leading-relaxed">
                Explore Scripture passages, themes, and study notes on a visual whiteboard.
              </p>
            </div>

            {/* Unified Input Card */}
            <div 
              className="w-full rounded-2xl border border-border bg-surface text-fg focus-within:border-accent/80 focus-within:ring-2 focus-within:ring-accent/15 shadow-xl p-3.5 sm:p-4 space-y-3 transition-all duration-200"
            >
              {/* Architecture Mode Selector Pills */}
              <div className="flex items-center gap-1.5 pb-2 border-b border-border-soft/60 overflow-x-auto no-scrollbar">
                {[
                  { id: 'generate', label: 'Mind-Map', icon: Network },
                  { id: 'discourse', label: 'Logic Flowchart', icon: Workflow },
                  { id: 'synthesize', label: 'Topic Synthesis', icon: FileText },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id as CanvasMode)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                          : 'text-fg-2 hover:text-fg hover:bg-surface-hover'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Study Prompt Textarea */}
              <TextareaAutosize
                ref={textareaRef}
                minRows={3}
                maxRows={6}
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
                    ? "e.g. Synthesize the key doctrines and study takeaways on the Covenant of Grace..."
                    : "e.g. Map Romans 8:28-30 (The Golden Chain) with scripture, doctrinal implications, and applications..."
                }
                className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none resize-none leading-relaxed block"
              />

              {/* Bottom Row inside Card */}
              <div className="flex items-center justify-between pt-2 border-t border-border-soft/60 gap-2 flex-wrap">
                {/* Tradition Lens Selector Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <BookOpen size={13} className="text-accent shrink-0" />
                  <span className="hidden sm:inline font-medium">Tradition:</span>
                  <select
                    value={selectedLens}
                    onChange={(e) => setSelectedLens(e.target.value as any)}
                    className="text-xs font-medium px-2 py-1 rounded-lg border border-border text-fg bg-surface-warm focus:outline-none cursor-pointer"
                  >
                    <option value="canonical">Canonical Biblical</option>
                    <option value="patristic">Patristic & Early Church</option>
                    <option value="reformation">Reformed & Protestant</option>
                    <option value="scholarly">Scholarly & Exegetical</option>
                    <option value="contemplative">Devotional & Formational</option>
                  </select>
                </div>

                {/* Submit button & shortcut */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted hidden sm:inline">Press ↵ Enter</span>
                  <button
                    type="button"
                    onClick={() => handleStartSubmit()}
                    disabled={!prompt.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Create Board</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Sample Inspiration Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
              <span className="text-[11px] text-muted mr-1 flex items-center gap-1">
                <Lightbulb size={12} className="text-amber-500" /> Ideas:
              </span>
              {(mode === 'discourse' ? DISCOURSE_IDEAS : PRESET_IDEAS).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(item.query);
                    handleStartSubmit(item.query);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface text-fg-2 hover:border-accent/60 hover:text-accent transition-all cursor-pointer shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Subtle Secondary Actions */}
            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-muted">
              <button
                type="button"
                onClick={onCreateBlankCanvas}
                className="flex items-center gap-1.5 hover:text-accent transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Blank Canvas</span>
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 hover:text-accent transition-colors cursor-pointer"
              >
                <Download size={13} />
                <span>Import Shared Canvas</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Empty bottom spacer for symmetrical vertical centering */}
      <div className="shrink-0 h-4" />
    </div>
  );
}
