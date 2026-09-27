"use client";

import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Mic, 
  Compass, 
  Scroll, 
  Heart, 
  FileEdit, 
  Sparkles,
  Check,
  ChevronRight
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

  if (!isOpen) return null;

  const activeTemplate = NOTE_TEMPLATES.find(t => t.id === selectedId) || NOTE_TEMPLATES[0];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className="text-amber-500" size={20} />;
      case 'Mic': return <Mic className="text-blue-500" size={20} />;
      case 'Compass': return <Compass className="text-emerald-500" size={20} />;
      case 'Scroll': return <Scroll className="text-purple-500" size={20} />;
      case 'Heart': return <Heart className="text-rose-500" size={20} />;
      default: return <FileEdit className="text-muted" size={20} />;
    }
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date());

  const previewContent = activeTemplate.content(todayStr);

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
              <h2 className="text-[17px] font-semibold text-fg">Bible Study Templates</h2>
              <p className="text-[12px] text-meta">Choose a structured method to elevate your notes beyond a blank page</p>
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
          {/* Templates List */}
          <div className="w-full md:w-[320px] lg:w-[360px] overflow-y-auto custom-scroll p-3 space-y-2 shrink-0 bg-surface/20">
            {NOTE_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedId;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-accent/10 border-accent/40 shadow-xs ring-1 ring-accent/30'
                      : 'bg-surface/50 border-border/70 hover:border-border hover:bg-surface/80'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-bg border border-border/60 shrink-0">
                    {getIcon(tmpl.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[13px] font-semibold truncate ${isSelected ? 'text-accent' : 'text-fg'}`}>
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-border/40 text-muted font-medium shrink-0">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-meta line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Live Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-bg/80">
            <div className="p-3 border-b border-border/60 flex items-center justify-between text-[12px] text-meta bg-surface/30">
              <span className="font-medium text-fg flex items-center gap-1.5">
                {getIcon(activeTemplate.icon)}
                <span>{activeTemplate.name} Preview</span>
              </span>
              <span>Pre-formatted Markdown</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-5 font-mono text-[12px] leading-relaxed text-fg/90 whitespace-pre-wrap select-text bg-surface/10 border-b border-border/40">
              {previewContent}
            </div>

            {/* Application Mode if existing note */}
            {isExistingNote && (
              <div className="p-3.5 px-6 border-b border-border bg-surface/30 flex items-center gap-4 text-[13px]">
                <span className="text-meta font-medium text-[12px]">Action:</span>
                <label className="flex items-center gap-2 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="templateMode"
                    value="append"
                    checked={mode === 'append'}
                    onChange={() => setMode('append')}
                    className="accent-accent"
                  />
                  Append to Note
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="templateMode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    className="accent-accent"
                  />
                  Replace Note Content
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-fg">
                  <input
                    type="radio"
                    name="templateMode"
                    value="create"
                    checked={mode === 'create'}
                    onChange={() => setMode('create')}
                    className="accent-accent"
                  />
                  Create New Note
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-surface/40 shrink-0">
          <p className="text-[12px] text-meta hidden sm:block">
            Tip: You can customize or add your own tags anytime.
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-muted hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSelectTemplate(activeTemplate, mode);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white bg-accent hover:opacity-90 rounded-lg transition-all shadow-sm cursor-pointer"
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
