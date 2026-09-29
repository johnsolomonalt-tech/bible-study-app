"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, 
  BookOpen, 
  Mic, 
  Compass, 
  Scroll, 
  Heart, 
  FileEdit, 
  LayoutTemplate,
  Check,
  Eye,
  Code,
  FilePlus,
  RefreshCw,
  Plus
} from 'lucide-react';
import { NOTE_TEMPLATES, NoteTemplate } from './noteTemplates';

interface NoteTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate, mode: 'create' | 'replace' | 'append') => void;
  isExistingNote?: boolean;
}

export function NoteTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
  isExistingNote = false,
}: NoteTemplatesModalProps) {
  const [selectedId, setSelectedId] = useState<string>('soap');
  const [mode, setMode] = useState<'create' | 'replace' | 'append'>(isExistingNote ? 'append' : 'create');
  const [previewMode, setPreviewMode] = useState<'formatted' | 'raw'>('formatted');

  if (!isOpen) return null;

  const activeTemplate = NOTE_TEMPLATES.find(t => t.id === selectedId) || NOTE_TEMPLATES[0];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className="text-amber-500" size={18} />;
      case 'Mic': return <Mic className="text-blue-500" size={18} />;
      case 'Compass': return <Compass className="text-emerald-500" size={18} />;
      case 'Scroll': return <Scroll className="text-purple-500" size={18} />;
      case 'Heart': return <Heart className="text-rose-500" size={18} />;
      default: return <FileEdit className="text-accent" size={18} />;
    }
  };

  const getIconBg = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return 'bg-amber-500/10 border-amber-500/20';
      case 'Mic': return 'bg-blue-500/10 border-blue-500/20';
      case 'Compass': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'Scroll': return 'bg-purple-500/10 border-purple-500/20';
      case 'Heart': return 'bg-rose-500/10 border-rose-500/20';
      default: return 'bg-accent/10 border-accent/20';
    }
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date());

  const previewContent = activeTemplate.content(todayStr);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-bg border border-border/80 rounded-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/30">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-fg tracking-tight flex items-center gap-2">
                <span>Bible Study Templates</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                  Library
                </span>
              </h2>
              <p className="text-[12px] text-meta">Choose a time-tested study framework to elevate your personal notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-fg hover:bg-surface rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Templates Navigation Sidebar */}
          <div className="w-full md:w-[320px] lg:w-[350px] overflow-y-auto custom-scroll p-3.5 space-y-2 shrink-0 bg-surface/15">
            <div className="px-2 pt-1 pb-1 text-[11px] font-bold text-muted uppercase tracking-wider">
              Study Methods
            </div>

            {NOTE_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedId;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none relative group ${
                    isSelected
                      ? 'bg-accent/10 border-accent/50 shadow-xs ring-1 ring-accent/30'
                      : 'bg-surface/40 hover:bg-surface border-border/60 hover:border-border/90'
                  }`}
                >
                  {/* Selected Indicator Strip */}
                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-accent rounded-r-full" />
                  )}

                  <div className={`p-2 rounded-xl border shrink-0 ${getIconBg(tmpl.icon)}`}>
                    {getIcon(tmpl.icon)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[14px] font-semibold truncate ${isSelected ? 'text-accent' : 'text-fg'}`}>
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface border border-border/60 text-muted font-medium shrink-0">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-[12px] text-meta line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Live Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-bg">
            {/* Preview Toolbar */}
            <div className="px-6 py-3 border-b border-border/70 flex items-center justify-between text-[12px] bg-surface/20 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${getIconBg(activeTemplate.icon)}`}>
                  {getIcon(activeTemplate.icon)}
                </div>
                <div>
                  <span className="font-semibold text-fg text-[14px]">{activeTemplate.name}</span>
                  <span className="text-meta text-[11px] ml-2 hidden sm:inline">{activeTemplate.description}</span>
                </div>
              </div>

              {/* View Switcher: Formatted vs Raw */}
              <div className="flex items-center bg-surface border border-border/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('formatted')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'formatted'
                      ? 'bg-bg text-fg font-semibold shadow-2xs'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('raw')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'raw'
                      ? 'bg-bg text-fg font-semibold shadow-2xs'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  <Code size={12} />
                  <span>Markdown</span>
                </button>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-8 lg:p-10 select-text bg-surface/5">
              {previewMode === 'formatted' ? (
                /* Editorial Formatted Preview */
                <article className="max-w-2xl mx-auto space-y-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="font-display font-serif text-2xl sm:text-3xl font-bold text-fg tracking-tight pb-3 mb-4 border-b border-border/60">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-display font-serif text-lg sm:text-xl font-bold text-fg tracking-tight mt-6 mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                          <span>{children}</span>
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-[15px] font-semibold text-fg-hover mt-4 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-[15px] leading-[1.8] text-fg/90 mb-4 font-sans">
                          {children}
                        </p>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-[3.5px] border-accent bg-accent/8 py-3.5 px-5 my-4 italic rounded-r-xl shadow-2xs text-fg text-[15px] leading-relaxed font-serif">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-6 mb-4 space-y-2 text-[15px] text-fg/90">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-6 mb-4 space-y-2 text-[15px] text-fg/90">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-[1.7]">{children}</li>
                      ),
                      input: ({ type, checked, disabled }) => {
                        if (type === 'checkbox') {
                          return (
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="mr-2 h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent align-middle cursor-default"
                            />
                          );
                        }
                        return <input type={type} disabled={disabled} />;
                      },
                      strong: ({ children }) => (
                        <strong className="font-semibold text-fg">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-fg-hover font-serif">{children}</em>
                      ),
                      hr: () => <hr className="my-6 border-border/80" />,
                    }}
                  >
                    {previewContent}
                  </ReactMarkdown>
                </article>
              ) : (
                /* Raw Markdown Source Code */
                <pre className="max-w-2xl mx-auto p-5 rounded-xl border border-border/80 bg-surface/40 font-mono text-[13px] leading-relaxed text-fg/90 whitespace-pre-wrap select-text">
                  {previewContent}
                </pre>
              )}
            </div>

            {/* Application Mode Segmented Bar (for existing notes) */}
            {isExistingNote && (
              <div className="p-3 px-6 border-t border-border bg-surface/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <span className="text-meta font-medium text-[12px]">Application Mode:</span>
                <div className="flex items-center gap-1.5 bg-surface border border-border/80 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setMode('append')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      mode === 'append'
                        ? 'bg-bg text-fg shadow-2xs font-semibold'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Plus size={13} />
                    <span>Append to Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('replace')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      mode === 'replace'
                        ? 'bg-bg text-fg shadow-2xs font-semibold'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    <RefreshCw size={13} />
                    <span>Replace Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      mode === 'create'
                        ? 'bg-bg text-fg shadow-2xs font-semibold'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    <FilePlus size={13} />
                    <span>Create as New Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface/40 shrink-0">
          <p className="text-[12px] text-meta hidden sm:block">
            You can freely customize any headings, tags, or scripture references after creating.
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-muted hover:text-fg hover:bg-surface rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSelectTemplate(activeTemplate, mode);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-r from-accent to-accent/90 hover:opacity-95 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Check size={16} />
              <span>Use {activeTemplate.name}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
