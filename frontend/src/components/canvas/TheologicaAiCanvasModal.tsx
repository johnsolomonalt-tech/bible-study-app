"use client";

import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SerializableNode, SerializableEdge, CanvasStatePayload } from '@/types/canvas';
import { useModifierKey } from '@/lib/os';

interface TheologicaAiCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGraph: CanvasStatePayload;
  selectedNode: SerializableNode | null;
  onApplyGraphUpdate: (
    newNodes: SerializableNode[], 
    newEdges: SerializableEdge[], 
    explanation: string
  ) => void;
  theme: 'dark' | 'light';
}

type Mode = 'generate' | 'expand' | 'synthesize';

const PRESET_TOPICS = [
  { label: "Romans 8:28-30 (Golden Chain)", query: "Map Romans 8:28-30 (The Golden Chain of Redemption) with scripture, doctrinal implications, and applications" },
  { label: "Covenant of Grace", query: "Theological structure and biblical progression of the Covenant of Grace across the Old and New Testaments" },
  { label: "1 Corinthians Context", query: "Historical, cultural, and spiritual background of ancient Corinth and Paul's pastoral counsel" },
  { label: "Beatitudes Overview", query: "Mind-map of the Beatitudes in Matthew 5 with kingdom virtues and modern Christian applications" },
  { label: "Messianic Prophecies", query: "Old Testament Messianic prophecies and their direct fulfillment in Jesus Christ" },
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
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);

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
    "Formulating structured Obsidian markdown cards...",
    "Computing collision-free spatial layout coordinates...",
  ];

  const [isFinishingUp, setIsFinishingUp] = useState(false);

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;
    let timerFinish: NodeJS.Timeout;

    if (isLoading) {
      setLoadingStep(0);
      setIsFinishingUp(false);

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

    setIsLoading(true);
    setError(null);
    setSynthesisResult(null);

    try {
      const res = await fetch('/api/canvas/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          currentGraph,
          selectedNodeId: activeMode === 'expand' && selectedNode ? selectedNode.id : undefined,
          mode: activeMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Theologica AI encountered an issue generating this board.');
      }

      if (data.nodes && data.nodes.length > 0) {
        onApplyGraphUpdate(data.nodes, data.edges || [], data.explanation);
      }

      if (data.synthesis) {
        setSynthesisResult(data.synthesis);
      } else {
        // Auto-close on success if purely node graph generation
        onClose();
      }
    } catch (err: any) {
      console.error('Theologica AI Canvas Error:', err);
      setError(err.message || 'Failed to connect to Theologica AI. Please verify your connection.');
    } finally {
      setIsLoading(false);
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
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        {!isLoading && (
          <div className={`flex border-b px-6 pt-2 gap-2 text-xs font-semibold shrink-0 ${
            isDark ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-100 bg-zinc-50/50'
          }`}>
            <button
              type="button"
              onClick={() => setActiveMode('generate')}
              className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all ${
                activeMode === 'generate'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network size={14} />
              <span>Generate Mind-Map</span>
            </button>

            {selectedNode && (
              <button
                type="button"
                onClick={() => setActiveMode('expand')}
                className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all ${
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
              className={`flex items-center gap-1.5 pb-2.5 px-2 border-b-2 transition-all ${
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

              {/* Suggestions Chips */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {activeMode === 'expand' ? 'Suggested expansions for card' : 'Suggested study mind-maps'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeMode === 'expand' ? EXPANSION_PROMPTS : PRESET_TOPICS).map((item, idx) => (
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
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    activeMode === 'expand' && selectedNode
                      ? `Instruct Theologica AI what to expand from "${selectedNode.data.title}"...`
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
          <div className={`flex items-center justify-between px-6 py-3.5 border-t shrink-0 ${
            isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-100 bg-zinc-50'
          }`}>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px]">{mod.symbol}+Enter</kbd> to generate
            </span>
            <div className="flex items-center gap-2 ml-auto">
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
