"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ShieldCheck, Scale, BookOpen, Save, RefreshCw, Eye, Edit3, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type LegalSlug = 'privacy' | 'terms' | 'legal';

interface DocData {
  slug: LegalSlug;
  title: string;
  lastUpdated: string;
  content: string;
}

export function DevLegalEditor() {
  const [activeDoc, setActiveDoc] = useState<LegalSlug>('privacy');
  const [docData, setDocData] = useState<DocData | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setSaveStatus('idle');

    fetch(`/api/legal/${activeDoc}?raw=true`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: DocData) => {
        if (!isMounted) return;
        setDocData(data);
        setEditedContent(data.content || '');
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load legal document:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDoc]);

  const handleSave = async () => {
    if (!editedContent.trim()) return;
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch(`/api/legal/${activeDoc}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent,
          title: docData?.title,
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      const data = await res.json();
      if (data.document) {
        setDocData(data.document);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error('Error saving legal document:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const docTabs: Array<{ id: LegalSlug; title: string; icon: React.ReactNode; path: string }> = [
    { id: 'privacy', title: 'Privacy Policy', icon: <ShieldCheck size={16} />, path: '/privacy' },
    { id: 'terms', title: 'Terms of Service', icon: <Scale size={16} />, path: '/terms' },
    { id: 'legal', title: 'Legal & Attributions', icon: <BookOpen size={16} />, path: '/legal' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-accent" size={20} />
            <h2 className="text-base sm:text-lg font-bold text-[var(--fg)]">
              Legal, Privacy &amp; Terms Management
            </h2>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            Edit and publish live legal disclosures. Updates reflect immediately on public <code className="text-accent">/privacy</code>, <code className="text-accent">/terms</code>, and <code className="text-accent">/legal</code> pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in">
              <Check size={14} />
              <span>Published Live</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-in fade-in">
              <span>Save Failed</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Document Selector & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Document Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-fit">
          {docTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveDoc(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeDoc === tab.id
                  ? 'bg-accent text-accent-on shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {tab.icon}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* View Mode & Live Link */}
        <div className="flex items-center gap-2">
          <Link
            href={docTabs.find((t) => t.id === activeDoc)?.path || '/privacy'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] hover:text-accent transition-colors"
            title="View public live page"
          >
            <span>Live URL</span>
            <ExternalLink size={12} />
          </Link>

          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'edit' ? 'bg-accent text-accent-on' : 'text-[var(--muted)]'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer hidden md:inline-flex ${
                viewMode === 'split' ? 'bg-accent text-accent-on' : 'text-[var(--muted)]'
              }`}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-accent text-accent-on' : 'text-[var(--muted)]'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="border border-[var(--border)] rounded-3xl bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Editor Sub-header info */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]/50 flex items-center justify-between text-xs text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span>
              Document: <strong className="text-[var(--fg)]">{docData?.title || activeDoc}</strong>
            </span>
            <span>•</span>
            <span>
              Last Updated: <span className="text-[var(--fg-2)]">{docData?.lastUpdated || 'Current'}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>{editedContent.length} characters</span>
            <span>•</span>
            <span>{editedContent.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
            <RefreshCw className="animate-spin text-accent" size={24} />
            <span className="text-xs">Loading legal document...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] min-h-[500px]">
            {/* Editor Pane */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={`p-4 flex flex-col ${viewMode === 'edit' ? 'col-span-full' : ''}`}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                  Markdown Source Code
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Enter markdown legal text here..."
                  className="w-full flex-1 min-h-[460px] p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-xs sm:text-sm font-mono text-[var(--fg)] focus:outline-none focus:border-accent resize-y leading-relaxed overflow-y-auto custom-scroll"
                />
              </div>
            )}

            {/* Live Preview Pane */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`p-5 flex flex-col bg-[var(--bg)]/40 overflow-y-auto max-h-[70vh] custom-scroll overscroll-contain ${viewMode === 'preview' ? 'col-span-full' : ''}`}>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border)]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Live Markdown Preview
                  </span>
                  <span className="text-[10px] text-accent font-medium">Auto-formatted</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-accent">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editedContent || '*No content.*'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
