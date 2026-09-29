"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Link2, 
  Flame, 
  History, 
  MessageSquare,
  Check,
  Copy,
  Plus,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { NoteAiAction } from '@/app/api/notes/ai/route';

interface NoteAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteContent: string;
  onAppendToNote: (contentToAppend: string) => void;
  theologicalLens?: string;
}

interface ActionCard {
  id: NoteAiAction;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const AI_ACTIONS: ActionCard[] = [
  {
    id: 'summarize',
    title: 'Summarize Note',
    desc: 'Core theological proposition, key themes, and structured synthesis.',
    icon: <Sparkles className="text-amber-500" size={17} />,
  },
  {
    id: 'questions',
    title: 'Discussion Questions',
    desc: 'Inductive study questions: Observation, Interpretation, & Application.',
    icon: <HelpCircle className="text-blue-500" size={17} />,
  },
  {
    id: 'cross_references',
    title: 'Find Cross-References',
    desc: 'Discover harmonizing Scripture passages with canonical insights.',
    icon: <Link2 className="text-emerald-500" size={17} />,
  },
  {
    id: 'applications',
    title: 'Life Applications',
    desc: 'Actionable, practical obedience steps and weekly spiritual disciplines.',
    icon: <Flame className="text-rose-500" size={17} />,
  },
  {
    id: 'theology_context',
    title: 'Historical & Theological Context',
    desc: 'Cultural setting, original language nuances, and redemptive context.',
    icon: <History className="text-purple-500" size={17} />,
  },
  {
    id: 'custom',
    title: 'Custom Prompt',
    desc: 'Ask Theologica AI any specific question about your study note.',
    icon: <MessageSquare className="text-accent" size={17} />,
  },
];

export function NoteAiAssistantModal({
  isOpen,
  onClose,
  noteTitle,
  noteContent,
  onAppendToNote,
  theologicalLens = 'canonical',
}: NoteAiAssistantModalProps) {
  const [selectedAction, setSelectedAction] = useState<NoteAiAction>('summarize');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  if (!isOpen) return null;

  async function handleRunAi(actionToRun: NoteAiAction = selectedAction) {
    if (!noteContent.trim() && !noteTitle.trim()) {
      setError('Please write some notes first before running the AI Study Assistant.');
      return;
    }

    if (actionToRun === 'custom' && !customPrompt.trim()) {
      setError('Please enter your question or prompt.');
      return;
    }

    setLoading(true);
    setError(null);
    setInserted(false);

    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionToRun,
          noteTitle,
          noteContent,
          customPrompt: actionToRun === 'custom' ? customPrompt : undefined,
          theologicalLens,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setGeneratedResult(data.content);
    } catch (err: any) {
      console.error('Note AI Assistant error:', err);
      setError(err?.message || 'Could not connect to Theologica AI. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAppend() {
    if (!generatedResult) return;
    const headerTitle = AI_ACTIONS.find(a => a.id === selectedAction)?.title || 'AI Study Insight';
    const textToAppend = `\n\n---\n\n### ✨ ${headerTitle}\n\n${generatedResult}\n\n#aichat #studyai #${theologicalLens}\n`;
    onAppendToNote(textToAppend);
    setInserted(true);
    setTimeout(() => {
      onClose();
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-bg border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-fg flex items-center gap-2">
                <span>Theologica AI Study Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold uppercase tracking-wider">
                  {theologicalLens}
                </span>
              </h2>
              <p className="text-[12px] text-meta">Examine, summarize, and deepen your personal notes with biblical AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Action Cards Selection */}
          <div className="w-full md:w-[320px] lg:w-[340px] overflow-y-auto custom-scroll p-3 space-y-2 shrink-0 bg-surface/20">
            <div className="px-2 py-1 text-[11px] font-bold text-muted uppercase tracking-wider">
              Study Actions
            </div>

            {AI_ACTIONS.map((action) => {
              const isSelected = selectedAction === action.id;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action.id);
                    setError(null);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-accent/10 border-accent/40 shadow-xs ring-1 ring-accent/30'
                      : 'bg-surface/50 border-border/70 hover:border-border hover:bg-surface/80'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-bg border border-border/60 shrink-0">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[13px] font-semibold block mb-0.5 ${isSelected ? 'text-accent' : 'text-fg'}`}>
                      {action.title}
                    </span>
                    <p className="text-[11px] text-meta line-clamp-2 leading-relaxed">
                      {action.desc}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Custom Prompt Input */}
            {selectedAction === 'custom' && (
              <div className="p-3 bg-surface/50 rounded-xl border border-border mt-3 space-y-2">
                <label className="text-[11px] font-semibold text-fg">Your Question / Prompt:</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Compare my notes with Paul's theology in Galatians..."
                  className="w-full bg-bg border border-border rounded-lg p-2.5 text-[12px] text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none h-20"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => handleRunAi(selectedAction)}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Analyzing Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Insight</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Result Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-bg/80">
            <div className="p-3 px-5 border-b border-border/60 flex items-center justify-between text-[12px] text-meta bg-surface/30">
              <span className="font-medium text-fg flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent" />
                <span>Generated Theological Analysis</span>
              </span>
              {generatedResult && (
                <button
                  onClick={() => handleRunAi(selectedAction)}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-6">
              {loading && (
                <div className="py-20 flex flex-col items-center justify-center text-muted gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                    <Sparkles size={24} />
                  </div>
                  <p className="text-[14px] font-medium text-fg">Synthesizing biblical insights...</p>
                  <p className="text-[12px] text-meta">Applying {theologicalLens} hermeneutics to your note</p>
                </div>
              )}

              {error && !loading && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[13px]">
                  {error}
                </div>
              )}

              {!loading && !error && !generatedResult && (
                <div className="py-20 flex flex-col items-center justify-center text-meta text-center max-w-sm mx-auto">
                  <Sparkles size={32} className="mb-3 text-muted" />
                  <h4 className="text-[15px] font-semibold text-fg mb-1">Ready to assist your study</h4>
                  <p className="text-[13px] leading-relaxed">
                    Select an action on the left and click <strong>Generate Insight</strong> to enrich your notes.
                  </p>
                </div>
              )}

              {!loading && !error && generatedResult && (
                <div className="prose max-w-none break-words text-[14px] leading-relaxed text-fg dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedResult}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-surface/40 shrink-0">
          <p className="text-[12px] text-meta">
            Answers are grounded in Scripture and historical Christian theology.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              disabled={!generatedResult}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-fg-hover hover:bg-surface border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleAppend}
              disabled={!generatedResult}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-accent hover:opacity-90 disabled:opacity-40 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              {inserted ? <Check size={15} /> : <Plus size={15} />}
              <span>{inserted ? 'Appended!' : 'Append to Note'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
