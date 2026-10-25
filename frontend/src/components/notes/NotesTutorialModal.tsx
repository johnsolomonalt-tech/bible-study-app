"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, X, ChevronRight, ChevronLeft, BookOpen, Sparkles, 
  Highlighter, Workflow, Download, CheckCircle2, FileText, ArrowRight
} from 'lucide-react';

interface NotesTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  tagline: string;
  badge: string;
  icon: React.ReactNode;
  content: string;
  mockup: React.ReactNode;
  tips: string[];
}

export function NotesTutorialModal({ isOpen, onClose }: NotesTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentStep((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
      if (e.key === 'ArrowLeft') setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const TUTORIAL_STEPS: TutorialStep[] = [
    {
      title: "Distraction-Free Scripture Journaling",
      tagline: "Effortless Writing with Live Preview",
      badge: "Step 1 of 5",
      icon: <FileText className="text-accent" size={24} />,
      content:
        "The Notes workspace is designed for deep, reverent contemplation. Capture personal reflections, prayer entries, and sermon notes with clean formatting. Switch between live editing and rich formatted view at any time.",
      tips: [
        "Use # and ## for clean sermon headers",
        "Type - [ ] for interactive study checklists",
        "Toggle Edit / View anytime with the toolbar",
      ],
      mockup: (
        <div className="p-4 rounded-2xl bg-bg border border-border/80 shadow-inner font-sans space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-accent font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span>EXPOSITORY REFLECTION</span>
          </div>
          <div className="font-serif font-bold text-sm text-fg">
            Living in Divine Grace • Romans 8
          </div>
          <p className="text-meta text-[11.5px] leading-relaxed">
            There is therefore now no condemnation for those who are in Christ Jesus. Notice how the apostle bridges sovereignty and practical assurance...
          </p>
          <div className="flex items-center gap-2 pt-1 text-[10px] text-muted">
            <span className="px-1.5 py-0.5 rounded bg-surface border border-border/60">#assurance</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-border/60">#romans</span>
          </div>
        </div>
      ),
    },
    {
      title: "Interactive Scripture Linking",
      tagline: "Connect Verses Automatically",
      badge: "Step 2 of 5",
      icon: <BookOpen className="text-accent" size={24} />,
      content:
        "Every scripture citation you write (e.g. John 3:16 or Romans 8:28) automatically transforms into an interactive, clickable link. Clicking any verse citation previews the full passage and Greek/Hebrew nuance without losing your place.",
      tips: [
        "Type any reference like 'Gen 1:1' or 'Ps 23' to auto-link",
        "Tap 'Insert Verse' in the toolbar to search passages",
        "Hover over linked verses for instant preview cards",
      ],
      mockup: (
        <div className="p-4 rounded-2xl bg-bg border border-border/80 shadow-inner space-y-2.5 text-xs">
          <div className="text-[11px] text-muted uppercase font-bold tracking-wider">
            Scripture Auto-Link Demo
          </div>
          <p className="text-fg leading-relaxed">
            The foundation of our peace is anchored in{' '}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-semibold border border-accent/30 cursor-pointer">
              <span>Romans 5:1</span>
            </span>{' '}
            and echoed through{' '}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-semibold border border-accent/30 cursor-pointer">
              <span>Philippians 4:7</span>
            </span>.
          </p>
          <div className="p-2.5 rounded-xl bg-surface/70 border border-border/60 text-[11px] text-meta italic">
            &ldquo;Therefore, since we have been justified by faith, we have peace with God through our Lord Jesus Christ.&rdquo;
          </div>
        </div>
      ),
    },
    {
      title: "Study Highlights Automatic Sync",
      tagline: "Your Reading Flow, Centralized",
      badge: "Step 3 of 5",
      icon: <Highlighter className="text-accent" size={24} />,
      content:
        "Whenever you highlight a verse while reading in Study, it is automatically cataloged in the Highlights tab of your notebook. You can drop any saved highlight directly into your active note with a single click.",
      tips: [
        "Highlight verses in yellow, green, terracotta, or blue in Study",
        "Open the 'Highlights' tab in the Notes sidebar",
        "Click any highlight to insert its full text and reference",
      ],
      mockup: (
        <div className="p-3.5 rounded-2xl bg-bg border border-border/80 shadow-inner space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-bold uppercase tracking-wider">Notebook Sidebar • Highlights</span>
            <span className="text-accent text-[10px] font-semibold">Synced Live</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
            <div className="font-bold text-[11px]">Psalm 119:105 (BSB)</div>
            <div className="text-[11px] italic text-fg">&ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
            <div className="font-bold text-[11px]">Ephesians 2:8 (BSB)</div>
            <div className="text-[11px] italic text-fg">&ldquo;For it is by grace you have been saved through faith...&rdquo;</div>
          </div>
        </div>
      ),
    },
    {
      title: "AI Theological Homiletics & Outlines",
      tagline: "Expository Depth in Seconds",
      badge: "Step 4 of 5",
      icon: <Sparkles className="text-accent" size={24} />,
      content:
        "Stuck on an outline or sermon structure? Tap the AI Assistant icon in the toolbar. Generate structured theological outlines, original language word nuance breakdowns, and contextual reflections directly into your draft.",
      tips: [
        "Click the Sparkles icon on the toolbar above",
        "Choose 'Expository Sermon Outline' or 'Word Study'",
        "One-click append the AI response into your notes",
      ],
      mockup: (
        <div className="p-4 rounded-2xl bg-bg border border-border/80 shadow-inner space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-accent text-[11px] font-bold">
            <Sparkles size={13} />
            <span>AI Homiletics Assistant</span>
          </div>
          <div className="space-y-1.5 text-meta text-[11.5px]">
            <div><strong>I. The Divine Foundation:</strong> Grace initiated by the Father</div>
            <div><strong>II. The Redemptive Mediator:</strong> Justification in Christ</div>
            <div><strong>III. The Living Application:</strong> Walking in the Spirit</div>
          </div>
          <div className="pt-1 flex items-center justify-end">
            <span className="px-2 py-0.5 rounded-lg bg-accent/20 text-accent text-[10px] font-semibold">
              + Insert Into Note
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Export to PDF & Drop onto Canvas",
      tagline: "Take Your Study Anywhere",
      badge: "Step 5 of 5",
      icon: <Workflow className="text-accent" size={24} />,
      content:
        "Your study notes are never locked in. Export a beautifully formatted PDF for print or sharing, download standard Markdown (.md), or send individual note cards directly into your infinite inductive study canvas.",
      tips: [
        "Click the ⋯ menu in the top right of any note",
        "Select 'Export to PDF' for clean printable study notes",
        "Select 'Send to Canvas' to drop your note onto a visual board",
      ],
      mockup: (
        <div className="p-4 rounded-2xl bg-bg border border-border/80 shadow-inner flex items-center justify-around text-xs">
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-surface border border-border/60">
            <Download size={18} className="text-accent" />
            <span className="font-semibold text-[11px]">PDF Export</span>
            <span className="text-[9px] text-muted">Printable</span>
          </div>
          <div className="text-muted">➔</div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-surface border border-border/60">
            <Workflow size={18} className="text-accent" />
            <span className="font-semibold text-[11px]">Canvas Card</span>
            <span className="text-[9px] text-muted">Mind-Map</span>
          </div>
        </div>
      ),
    },
  ];

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="notes-tutorial-title"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-surface/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <Lightbulb size={18} />
            </div>
            <div>
              <h2 id="notes-tutorial-title" className="text-sm font-bold text-fg">
                Notes Workspace Guide
              </h2>
              <p className="text-[11px] text-meta">{step.badge} • {step.tagline}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
            title="Close Tutorial (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)] custom-scroll">
          {/* Mockup Preview Area */}
          <div className="w-full transition-all duration-300">
            {step.mockup}
          </div>

          {/* Step Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {step.icon}
              <h3 className="text-base sm:text-lg font-bold text-fg font-serif">
                {step.title}
              </h3>
            </div>
            <p className="text-xs sm:text-[13px] text-meta leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Quick Tips Box */}
          <div className="p-3.5 rounded-2xl bg-surface-warm/30 border border-border/60 space-y-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent">
              Pro-Tips &amp; Shortcuts:
            </span>
            <ul className="space-y-1 text-xs text-fg/90">
              {step.tips.map((tip, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-border/70 flex items-center justify-between bg-surface/50">
          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? 'w-6 bg-accent shadow-2xs'
                    : 'w-2 bg-border hover:bg-muted'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-fg hover:text-accent transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>Got It! Start Studying</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
