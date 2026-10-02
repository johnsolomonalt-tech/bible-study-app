"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Printer, 
  Loader2, 
  FileText, 
  Users, 
  Scroll, 
  Edit3, 
  Eye,
  BookOpen
} from 'lucide-react';
import { SerializableNode, SerializableEdge } from '@/types/canvas';

interface ExportStudyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  nodes: SerializableNode[];
  edges?: SerializableEdge[];
  theme: 'dark' | 'light';
}

type GuideFormat = 'sermon' | 'small_group' | 'exegetical';
type LensType = 'canonical' | 'patristic' | 'reformation' | 'scholarly' | 'contemplative';

const FORMAT_OPTIONS: { id: GuideFormat; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'sermon',
    label: 'Expository Sermon',
    icon: FileText,
    description: 'Title, big idea, homiletical points (I, II, III), illustrations, and practical call to action.',
  },
  {
    id: 'small_group',
    label: 'Small Group Discussion',
    icon: Users,
    description: 'Icebreaker, scripture reading, observation, interpretation questions, and prayer focus.',
  },
  {
    id: 'exegetical',
    label: 'Exegetical Brief',
    icon: Scroll,
    description: 'Original languages, grammatical flow of thought, and doctrinal synthesis.',
  },
];

const LENS_OPTIONS: { id: LensType; label: string; icon: string }[] = [
  { id: 'canonical', label: 'Canonical / Balanced', icon: '🕊️' },
  { id: 'patristic', label: 'Early Church Fathers', icon: '🏛️' },
  { id: 'reformation', label: 'Reformation Heritage', icon: '📜' },
  { id: 'scholarly', label: 'Modern Scholarly', icon: '🔍' },
  { id: 'contemplative', label: 'Contemplative Prayer', icon: '🌿' },
];

export function ExportStudyGuideModal({
  isOpen,
  onClose,
  boardTitle,
  nodes,
  edges,
  theme,
}: ExportStudyGuideModalProps) {
  const isDark = theme === 'dark';
  const [selectedFormat, setSelectedFormat] = useState<GuideFormat>('sermon');
  const [selectedLens, setSelectedLens] = useState<LensType>('canonical');
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-generate initial guide on modal open if empty
  useEffect(() => {
    if (isOpen && !generatedMarkdown && nodes.length > 0) {
      handleGenerate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (format = selectedFormat, lens = selectedLens) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/canvas/export-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardTitle,
          nodes,
          edges,
          format,
          theologicalLens: lens,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate study guide');
      }

      const data = await res.json();
      setGeneratedMarkdown(data.content || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMarkdown) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedMarkdown) return;
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (boardTitle || 'theologica-study-guide')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    link.href = url;
    link.download = `${safeName}-${selectedFormat}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border bg-surface text-fg overflow-hidden backdrop-blur-xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2 text-fg">
                Export Study Guide &amp; Sermon Outline
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {nodes.length} Cards
                </span>
              </h2>
              <p className="text-xs text-muted">
                Turn your study cards into a clean study guide, sermon outline, or discussion sheet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-3 border-b border-border bg-surface-warm/40 flex flex-wrap items-center justify-between gap-3">
          {/* Format Selector Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            {FORMAT_OPTIONS.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    setSelectedFormat(fmt.id);
                    handleGenerate(fmt.id, selectedLens);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-accent text-accent-on border-accent shadow-xs'
                      : 'bg-surface border-border text-muted hover:bg-surface-hover hover:text-fg'
                  }`}
                  title={fmt.description}
                >
                  <Icon size={14} />
                  <span>{fmt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Lens Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Lens:</span>
            <select
              value={selectedLens}
              onChange={(e) => {
                const lens = e.target.value as LensType;
                setSelectedLens(lens);
                handleGenerate(selectedFormat, lens);
              }}
              className="text-xs font-medium rounded-lg px-2.5 py-1.5 border border-border bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {LENS_OPTIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.icon} {l.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleGenerate(selectedFormat, selectedLens)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-fg text-xs font-semibold transition-colors cursor-pointer"
              title="Regenerate guide"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-accent" />}
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scroll">
          {isGenerating ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-accent" />
              <p className="text-sm font-medium text-muted animate-pulse">
                Writing {selectedFormat.replace('_', ' ')} from your {nodes.length} cards...
              </p>
            </div>
          ) : isEditing ? (
            <textarea
              value={generatedMarkdown}
              onChange={(e) => setGeneratedMarkdown(e.target.value)}
              className="w-full h-96 p-4 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none bg-bg border border-border text-fg"
              placeholder="Edit markdown guide directly..."
            />
          ) : (
            <div className={`prose max-w-none break-words text-fg ${isDark ? 'prose-invert' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedMarkdown || '# No content generated yet.\nClick **Regenerate** above.'}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-3.5 border-t border-border bg-surface-warm/30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                isEditing
                  ? 'bg-accent/15 border-accent/30 text-accent font-semibold'
                  : 'border-border text-muted hover:text-fg hover:bg-surface-hover'
              }`}
            >
              {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
              <span>{isEditing ? 'Preview' : 'Edit Text'}</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!generatedMarkdown || isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted hover:text-fg hover:bg-surface-hover text-xs font-semibold transition-colors cursor-pointer"
              title="Print or export as clean PDF"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!generatedMarkdown || isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted hover:text-fg hover:bg-surface-hover text-xs font-semibold transition-colors cursor-pointer"
              title="Download as .md file"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!generatedMarkdown || isGenerating}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-accent text-accent-on hover:opacity-90 active:scale-95'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
