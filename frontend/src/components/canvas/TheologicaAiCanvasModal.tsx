"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Layers, 
  Copy, 
  Check, 
  Network,
  Compass,
  ArrowRight,
  FileText,
  Lightbulb,
  HelpCircle,
  Clock,
  Workflow
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SerializableNode, SerializableEdge, CanvasStatePayload } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';
import { validateBiblePrompt } from '@/lib/bibleValidation';

interface TheologicaAiCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGraph: CanvasStatePayload;
  selectedNode: SerializableNode | null;
  onApplyGraphUpdate: (
    newNodes: SerializableNode[], 
    newEdges: SerializableEdge[], 
    explanation: string,
    boardTitle?: string,
    mode?: Mode
  ) => void;
  theme: 'dark' | 'light';
}

type Mode = 'generate' | 'expand' | 'synthesize' | 'discourse';

const PRESET_TOPICS = [
  { label: "Romans 8:28-30 (Golden Chain)", query: "Map Romans 8:28-30 (The Golden Chain of Redemption) with scripture, doctrinal implications, and applications" },
  { label: "Covenant of Grace", query: "Theological structure and biblical progression of the Covenant of Grace across the Old and New Testaments" },
  { label: "1 Corinthians Context", query: "Historical, cultural, and spiritual background of ancient Corinth and Paul's pastoral counsel" },
  { label: "Beatitudes Overview", query: "Mind-map of the Beatitudes in Matthew 5 with kingdom virtues and modern Christian applications" },
  { label: "Messianic Prophecies", query: "Old Testament Messianic prophecies and their direct fulfillment in Jesus Christ" },
];

const DISCOURSE_TOPICS = [
  { label: "Romans 8:28-39 (Sovereignty to Glory)", query: "Discourse analysis of Romans 8:28-39 diagramming Paul's logical chain from foreknowledge to eternal security" },
  { label: "Ephesians 2:1-10 (Grace & Calling)", query: "Argument flowchart of Ephesians 2:1-10 diagramming condition of sin, divine intervention ('But God'), and grace unto good works" },
  { label: "Galatians 3:1-14 (Faith vs Law)", query: "Discourse tree of Paul's argument in Galatians 3 contrasting works of the law with the promise to Abraham" },
  { label: "Philippians 2:5-11 (The Christ Hymn)", query: "Logic diagram of Philippians 2:5-11 from kenosis (humiliation) to exaltation and universal confession" },
  { label: "Hebrews 12:1-3 (Cloud of Witnesses)", query: "Flowchart of Hebrews 12:1-3 showing motivation from OT saints to looking unto Jesus as pioneer of faith" },
];

const EXPANSION_PROMPTS = [
  { label: "3 Practical Applications", query: "Expand this concept with 3 specific, practical applications for modern Christian life" },
  { label: "Historical & Cultural Context", query: "Provide in-depth historical, archeological, and original cultural background for this point" },
  { label: "Cross-References & Scripture", query: "Find parallel scriptures, Old Testament allusions, and key supporting Bible verses" },
  { label: "Greek / Hebrew Nuance", query: "Analyze the original Greek or Hebrew theological terminology and definitions for this card" },
  { label: "Biblical Typology / Analogy", query: "Generate a rich biblical analogy or object lesson that clarifies this doctrine" },
];

export function TheologicaAiCanvasModal({
  isOpen,
  onClose,
  currentGraph,
  selectedNode,
  onApplyGraphUpdate,
  theme,
}: TheologicaAiCanvasModalProps) {
  const mod = useModifierKey();
  const [activeMode, setActiveMode] = useState<Mode>(selectedNode ? 'expand' : 'generate');
  const [selectedLens, setSelectedLens] = useState<'canonical' | 'patristic' | 'reformation' | 'scholarly' | 'contemplative'>('canonical');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelOrClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setError(null);
    onClose();
  };

  const isDark = theme === 'dark';

  useEffect(() => {
    if (selectedNode) {
      setActiveMode('expand');
    } else if (activeMode === 'expand') {
      setActiveMode('generate');
    }
  }, [selectedNode]);

  // Dynamic status milestones for the AI making the board (progresses over 20s without looping)
  const MILESTONES = [
    "Analyzing biblical passages & systematic theology...",
    "Tracing cross-references & doctrinal connections...",
    "Formulating structured theological cards...",
    "Computing collision-free spatial layout coordinates...",
  ];

  const [isFinishingUp, setIsFinishingUp] = useState(false);

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;
    let timerFinish: NodeJS.Timeout;

    if (isLoading) {
      // Milestone 1 at 5s
      timer1 = setTimeout(() => {
        setLoadingStep(1);
      }, 5000);

      // Milestone 2 at 10s
      timer2 = setTimeout(() => {
        setLoadingStep(2);
      }, 10000);

      // Milestone 3 at 15s
      timer3 = setTimeout(() => {
        setLoadingStep(3);
      }, 15000);

      // After 20s: Replace milestones with "Finishing up..."
      timerFinish = setTimeout(() => {
        setLoadingStep(4);
        setIsFinishingUp(true);
      }, 20000);
    } else {
      setLoadingStep(0);
      setIsFinishingUp(false);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerFinish);
    };
  }, [isLoading]);

  if (!isOpen) return null;

  const handleSubmit = async (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt || prompt).trim();
    if (!finalPrompt || isLoading) return;

    // Validate prompt appropriateness and biblical relevance BEFORE showing loading screen
    const validation = validateBiblePrompt(finalPrompt, activeMode);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a topic, question, or passage related to Scripture.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setLoadingStep(0);
    setIsFinishingUp(false);
    setError(null);
    setSynthesisResult(null);

    try {
      const res = await fetch('/api/canvas/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: finalPrompt,
          currentGraph,
          selectedNodeId: activeMode === 'expand' && selectedNode ? selectedNode.id : undefined,
          mode: activeMode,
          theologicalLens: selectedLens,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error && !/json|syntax|parse|token|internal/i.test(data.error)
          ? data.error
          : "Sorry, we couldn't process your request at this time. Please try again or rephrase your topic.";
        throw new Error(errorMsg);
      }

      if (data.nodes && data.nodes.length > 0) {
        onApplyGraphUpdate(data.nodes, data.edges || [], data.explanation, data.boardTitle, activeMode);
      }

      // Suppress full-screen summary popup on mobile devices and on non-synthesize modes
      const isMobileDevice = typeof window !== 'undefined' && (
        window.innerWidth < 768 || 
        window.matchMedia('(max-width: 768px)').matches || 
        'ontouchstart' in window
      );

      if (data.synthesis && activeMode === 'synthesize' && !isMobileDevice) {
        setSynthesisResult(data.synthesis);
      } else {
        // Auto-close immediately on success so the user can directly see and interact with their canvas
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        // Generation was cancelled by user - exit silently without altering board
        return;
      }
      console.error('Theologica AI Canvas Error:', err);
      const rawMsg = err.message || '';
      const isTechnicalError = /json|syntax|parse|token|fetch|failed to fetch|internal server|unexpected/i.test(rawMsg);
      const friendlyMsg = isTechnicalError || !rawMsg
        ? "Sorry, we couldn't process your request at this time. Please try again or rephrase your topic."
        : rawMsg;
      setError(friendlyMsg);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopySynthesis = () => {
    if (!synthesisResult) return;
    navigator.clipboard.writeText(synthesisResult);
    setCopiedSynthesis(true);
    setTimeout(() => setCopiedSynthesis(false), 2000);
  };

  const handleCreateSynthesisCard = () => {
    if (!synthesisResult) return;
    const uniqueId = `node-synthesis-${Date.now()}`;
    const newNode: SerializableNode = {
      id: uniqueId,
      type: 'customCard',
      position: { x: 120, y: (currentGraph.nodes.length * 160) + 100 },
      data: {
        title: 'Study Synthesis & Summary',
        content: synthesisResult,
        category: 'theological_point',
      },
    };
    onApplyGraphUpdate([newNode], [], 'Created synthesis card.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all ${
          isDark 
            ? 'bg-[#18181b] border-zinc-700/80 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
            : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-100 bg-zinc-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-amber-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold tracking-tight">Theologica AI</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 tracking-wide uppercase">
                  Canvas Architect
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Architect interactive theological knowledge graphs and study boards
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleCancelOrClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isLoading ? "Cancel generation and close" : "Close"}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        {!isLoading && (
          <div className={`flex border-b px-4 sm:px-6 pt-2 gap-2 text-xs font-semibold shrink-0 overflow-x-auto no-scrollbar ${
            isDark ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-100 bg-zinc-50/50'
          }`}>
            <button
              type="button"
              onClick={() => setActiveMode('generate')}
              className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                activeMode === 'generate'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network size={14} />
              <span>Generate Mind-Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('discourse')}
              className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                activeMode === 'discourse'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Workflow size={14} />
              <span>Logic Flowchart</span>
            </button>

            {selectedNode && (
              <button
                type="button"
                onClick={() => setActiveMode('expand')}
                className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                  activeMode === 'expand'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Compass size={14} />
                <span>Expand Selected Card</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveMode('synthesize')}
              className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
                activeMode === 'synthesize'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText size={14} />
              <span>Synthesize Canvas</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scroll">
          {/* STATE: GENERATING BOARD (High-polish HUD) */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 animate-in fade-in zoom-in-95">
              {/* Pulsing Visual Orb */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent/20 to-amber-500/20 animate-ping opacity-60" />
                <div className="absolute w-16 h-16 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div className="absolute w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/40">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
              </div>

              {/* Status Header */}
              <div className="text-center space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                  {isFinishingUp ? 'Finishing Up Your Canvas Board' : 'Architecting Your Canvas Board'}
                </h3>
                <p className="text-xs text-accent font-medium animate-pulse">
                  {isFinishingUp ? 'Finalizing theological canvas layout...' : (MILESTONES[loadingStep] || 'Generating...')}
                </p>
              </div>

              {/* Progress Milestones or Finishing Up Replacement */}
              {isFinishingUp ? (
                <div className={`w-full max-w-md p-5 rounded-xl border text-center space-y-2.5 animate-in fade-in duration-300 ${
                  isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="flex items-center justify-center gap-2 text-accent font-semibold text-xs">
                    <Loader2 size={16} className="animate-spin text-accent" />
                    <span>Finishing up...</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Finalizing card formatting, connections, and placing cards on your canvas. Almost ready!
                  </p>
                </div>
              ) : (
                <div className={`w-full max-w-md p-4 rounded-xl border space-y-2.5 text-xs ${
                  isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  {MILESTONES.map((milestone, idx) => {
                    const isDone = idx < loadingStep;
                    const isCurrent = idx === loadingStep;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2.5 transition-all duration-300 ${
                          isDone ? 'text-emerald-400' : isCurrent ? 'text-accent font-semibold' : 'text-zinc-600'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 size={15} className="shrink-0 animate-spin text-accent" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0 ml-0.5" />
                        )}
                        <span className="truncate">{milestone}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-zinc-500 text-center">
                Theologica AI assigns collision-free layout coordinates so cards snap neatly into position.
              </div>

              {/* Explicit Cancel Generation Button */}
              <button
                type="button"
                onClick={handleCancelOrClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <X size={14} />
                <span>Cancel Generation</span>
              </button>
            </div>
          ) : (
            /* STATE: NORMAL INTERACTIVE FORM */
            <>
              {/* Context Banner */}
              {activeMode === 'expand' && selectedNode ? (
                <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-zinc-800/80 border-accent/40 text-zinc-200' : 'bg-amber-50/70 border-amber-300 text-zinc-800'
                }`}>
                  <Network size={15} className="text-accent shrink-0" />
                  <div className="truncate">
                    <span className="text-zinc-400">Target Card: </span>
                    <span className="font-semibold text-accent">{selectedNode.data.title}</span>
                    <span className="text-zinc-500 ml-1">({selectedNode.data.category})</span>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}>
                  <Layers size={14} className="shrink-0 text-accent" />
                  <span>
                    Operating across board: <strong className="text-zinc-200">{currentGraph.nodes.length} cards</strong> on canvas
                  </span>
                </div>
              )}

              {/* Theological Perspective Lens Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">Tradition Lens:</span>
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
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        selectedLens === l.id
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30'
                      }`}
                    >
                      <span>{l.icon} {l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions Chips */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {activeMode === 'expand' 
                    ? 'Suggested expansions for card' 
                    : activeMode === 'discourse'
                    ? 'Suggested discourse argument flowcharts'
                    : 'Suggested study mind-maps'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeMode === 'expand' 
                    ? EXPANSION_PROMPTS 
                    : activeMode === 'discourse'
                    ? DISCOURSE_TOPICS
                    : PRESET_TOPICS
                  ).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(item.query);
                        handleSubmit(item.query);
                      }}
                      className={`text-xs text-left px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-accent' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-black hover:border-accent'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Your Study Prompt:</span>
                  <span className="text-[11px] text-zinc-500 font-normal">Supports scripture citations & topics</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    activeMode === 'expand' && selectedNode
                      ? `Instruct Theologica AI what to expand from "${selectedNode.data.title}"...`
                      : activeMode === 'discourse'
                      ? "e.g. Diagram the logical argument and exegetical flow of Romans 8:28-39..."
                      : activeMode === 'synthesize'
                      ? "e.g. Synthesize the key doctrines and applications from this canvas into a study outline..."
                      : "e.g. Map John 15:1-8 (The Vine and Branches) with theology, historical context, and discipleship applications..."
                  }
                  rows={3}
                  className={`w-full p-3.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all ${
                    isDark 
                      ? 'bg-[#121214] border-zinc-700 text-zinc-100 placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Synthesis Markdown Output Preview */}
              {synthesisResult && (
                <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-zinc-900/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between border-b pb-2 border-zinc-700/50">
                    <span className="text-xs font-bold text-zinc-300">Canvas Synthesis</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySynthesis}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                      >
                        {copiedSynthesis ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedSynthesis ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateSynthesisCard}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-accent hover:bg-accent/90 text-white transition-colors cursor-pointer"
                      >
                        <BookOpen size={12} />
                        <span>Insert as Card</span>
                      </button>
                    </div>
                  </div>
                  <div className={`prose prose-sm max-w-none text-xs max-h-56 overflow-y-auto ${isDark ? 'prose-invert text-zinc-300' : 'text-zinc-700'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {synthesisResult}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!isLoading && (
          <div className={`flex items-center justify-between flex-wrap gap-2 px-6 py-3.5 border-t shrink-0 ${
            isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-100 bg-zinc-50'
          }`}>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px]">{mod.symbol}+Enter</kbd> to generate
            </span>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!prompt.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Sparkles size={14} />
                <span>
                  {activeMode === 'expand' ? 'Expand Selected Card' : activeMode === 'synthesize' ? 'Synthesize Canvas' : 'Generate Canvas Board'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
