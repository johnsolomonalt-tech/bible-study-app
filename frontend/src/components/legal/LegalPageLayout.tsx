"use client";

import React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, BookOpen, ShieldCheck, Scale, FileText, CheckCircle2 } from 'lucide-react';
import { LegalDocument } from '@/lib/legalContentStore';

interface LegalPageLayoutProps {
  document: LegalDocument;
  currentSlug: 'privacy' | 'terms' | 'legal';
}

export function LegalPageLayout({ document, currentSlug }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-sans selection:bg-accent/20 selection:text-fg">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-bg/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-fg hover:text-accent transition-colors group"
            title="Return to Study Workspace"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs flex items-center justify-center border border-border/60 group-hover:border-accent/40 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-dark.png" alt="Theologica Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif font-bold text-base sm:text-lg tracking-tight text-[#c96442]">
              Theologica
            </span>
          </Link>
          <span className="text-muted text-xs hidden sm:inline">•</span>
          <span className="text-xs text-muted font-medium hidden sm:inline">
            Legal & Disclosures
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-fg hover:text-accent hover:border-accent/40 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Study Workspace</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-14">
        {/* Document Navigation Tabs */}
        <nav 
          aria-label="Legal Documents Navigation"
          className="flex items-center gap-1 sm:gap-2 p-1 bg-surface/70 border border-border/60 rounded-2xl mb-8 max-w-fit shadow-2xs overflow-x-auto"
        >
          <Link
            href="/privacy"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentSlug === 'privacy'
                ? 'bg-accent text-accent-on shadow-xs'
                : 'text-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Privacy Policy</span>
          </Link>
          <Link
            href="/terms"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentSlug === 'terms'
                ? 'bg-accent text-accent-on shadow-xs'
                : 'text-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Scale size={14} />
            <span>Terms of Service</span>
          </Link>
          <Link
            href="/legal"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentSlug === 'legal'
                ? 'bg-accent text-accent-on shadow-xs'
                : 'text-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <BookOpen size={14} />
            <span>Translations & Licenses</span>
          </Link>
        </nav>

        {/* Document Header Card */}
        <div className="border border-border/80 rounded-3xl p-6 sm:p-10 bg-surface/30 backdrop-blur-sm shadow-xs mb-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
            <CheckCircle2 size={12} />
            <span>Official Policy Document</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-fg">
            {document.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Last Updated: <span className="font-semibold text-fg-2">{document.lastUpdated}</span>
          </p>
        </div>

        {/* Document Markdown Body */}
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-accent prose-blockquote:border-accent/40 prose-blockquote:bg-surface/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-fg mt-8 mb-4 border-b border-border/60 pb-3">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-fg mt-8 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-fg mt-6 mb-2">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base font-semibold text-accent mt-5 mb-1.5">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-sm sm:text-[15px] leading-relaxed text-fg/90 mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-[15px] text-fg/90 mb-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 space-y-1.5 text-sm sm:text-[15px] text-fg/90 mb-4">
                  {children}
                </ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-accent pl-4 py-2 bg-surface/50 rounded-r-xl my-4 text-xs sm:text-sm text-meta italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-border/70 my-8" />,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded-md bg-surface text-accent text-xs font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {document.content}
          </ReactMarkdown>
        </article>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/80 bg-surface/20 px-4 sm:px-8 py-8 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span>Theologica Study Workspace</span>
            <span>•</span>
            <span>Reverent Scripture Exploration</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-accent transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms
            </Link>
            <Link href="/legal" className="hover:text-accent transition-colors">
              Translations &amp; Licenses
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
