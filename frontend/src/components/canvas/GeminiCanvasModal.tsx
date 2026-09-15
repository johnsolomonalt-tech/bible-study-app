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
  Maximize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SerializableNode, SerializableEdge, CanvasStatePayload } from '@/types/canvas';

interface GeminiCanvasModalProps {
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

const PRESET_PROMPTS_EMPTY = [
  "Map Romans 8:28-30 (The Golden Chain of Redemption)",
  "Theological structure of the Covenant of Grace",
  "Historical background & context of 1 Corinthians",
  "Beatitudes mind-map with practical applications",
  "Old Testament Messianic prophecies fulfilled in Christ",
];

const PRESET_PROMPTS_SELECTED = [
  "Expand this card with 3 practical applications for daily Christian living",
  "Provide in-depth historical and cultural background for this point",
  "Find scriptural cross-references and parallel passages",
  "Break down the original Greek/Hebrew word meanings and theology",
  "Generate an illustration or analogy that clarifies this doctrine",
];

export function GeminiCanvasModal({
  isOpen,
  onClose,
  currentGraph,
  selectedNode,
  onApplyGraphUpdate,
  theme,
}: GeminiCanvasModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);

  const isDark = theme === 'dark';

  // Cycling loading steps for rich UX
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      const steps = [
        "Consulting biblical scriptures & theology...",
        "Structuring knowledge graph relationships...",
        "Formatting theological cards & markdown...",
        "Computing collision-free layout coordinates...",
      ];
      let current = 0;
      timer = setInterval(() => {
        current = (current + 1) % steps.length;
        setLoadingStep(current);
      }, 1600);
    }
    return () => clearInterval(timer);
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
          selectedNodeId: selectedNode ? selectedNode.id : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process AI request.');
      }

      if (data.nodes && data.nodes.length > 0) {
        onApplyGraphUpdate(data.nodes, data.edges || [], data.explanation);
      }

      if (data.synthesis) {
        setSynthesisResult(data.synthesis);
      } else {
        // If it was purely node generation and no synthesis text, close modal smoothly
        onClose();
      }
    } catch (err: any) {
      console.error('Gemini canvas error:', err);
      setError(err.message || 'Something went wrong while connecting to Gemini.');
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
    // Place below or to right of nodes
    const newNode: SerializableNode = {
      id: uniqueId,
      type: 'customCard',
      position: { x: 100, y: (currentGraph.nodes.length * 150) + 100 },
      data: {
        title: 'Canvas Synthesis & Summary',
        content: synthesisResult,
        category: 'general',
      },
    };
    onApplyGraphUpdate([newNode], [], 'Created canvas summary card.');
    onClose();
  };

  const activePresets = selectedNode ? PRESET_PROMPTS_SELECTED : PRESET_PROMPTS_EMPTY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDark 
            ? 'bg-[#18181b] border-zinc-700/80 text-zinc-100' 
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles size={16} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                Gemini 3 Flash Canvas Assistant
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-medium">
                  Bidirectional
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Generate mind-maps, expand biblical concepts, and synthesize graph cards
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Focus Indicator */}
          {selectedNode ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
            }`}>
              <Network size={14} className="text-accent shrink-0" />
              <div className="truncate">
                <span className="text-zinc-400">Focusing on selected card: </span>
                <span className="font-semibold text-accent">{selectedNode.data.title}</span>
                <span className="text-zinc-500 ml-1">({selectedNode.data.category})</span>
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-zinc-800/40 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
            }`}>
              <Layers size={14} className="shrink-0 text-purple-400" />
              <span>Operating on entire canvas ({currentGraph.nodes.length} cards present)</span>
            </div>
          )}

          {/* Prompt Presets */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              {selectedNode ? 'Suggested expansions for card' : 'Popular study mind-maps'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(preset);
                    handleSubmit(preset);
                  }}
                  disabled={isLoading}
                  className={`text-xs text-left px-3 py-1.5 rounded-lg border transition-all ${
                    isDark 
                      ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-purple-500/50' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-black hover:border-purple-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* User Custom Prompt Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
              Your Custom Instruction:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
                placeholder={
                  selectedNode 
                    ? `Instruct Gemini what to add or explore connected to "${selectedNode.data.title}"...` 
                    : "e.g. Map the Gospel according to John 1:1-18 with theological themes and scripture references..."
                }
                rows={3}
                disabled={isLoading}
                className={`w-full p-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                  isDark 
                    ? 'bg-[#121214] border-zinc-700 text-zinc-100 placeholder-zinc-500' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                <Sparkles size={16} className="text-amber-400 absolute" />
              </div>
              <div className="text-xs font-medium text-purple-400 animate-pulse">
                {[
                  "Consulting biblical scriptures & theology...",
                  "Structuring knowledge graph relationships...",
                  "Formatting theological cards & markdown...",
                  "Computing collision-free layout coordinates...",
                ][loadingStep]}
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Synthesis Markdown Output Preview (if requested) */}
          {synthesisResult && (
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-zinc-900/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center justify-between border-b pb-2 border-zinc-700/50">
                <span className="text-xs font-bold text-zinc-300">Canvas Synthesis</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySynthesis}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    {copiedSynthesis ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedSynthesis ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSynthesisCard}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-accent hover:bg-accent/90 text-white transition-colors"
                  >
                    <BookOpen size={12} />
                    <span>Create Card</span>
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
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-t ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-100 bg-zinc-50'}`}>
          <div className="text-[11px] text-zinc-400 hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-700/30 font-mono text-[10px]">⌘+Enter</kbd> to submit
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Graph</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
