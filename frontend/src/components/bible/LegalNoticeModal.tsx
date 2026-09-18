"use client";

import React from 'react';
import { ShieldCheck, X, BookOpen, Cpu, CheckCircle2, ExternalLink } from 'lucide-react';

interface LegalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegalNoticeModal({ isOpen, onClose }: LegalNoticeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#141416] text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 font-sans">
                Scripture Attributions & Legal Notices
              </h2>
              <p className="text-xs text-zinc-400">
                100% Free, Open License & Terms of Service Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6 text-sm text-zinc-300 leading-relaxed">
          
          {/* Section 1: AI Safety & Non-Training Policy */}
          <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
              <Cpu size={14} />
              <span>AI Training & Acceptable Use Compliance</span>
            </div>
            <p className="text-xs text-zinc-300">
              Theologica strictly adheres to publisher terms of service and acceptable use policies:
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-400 pl-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Zero AI Training:</strong> No Scripture text, API data, or user study transcripts are used to train, retrain, fine-tune, or improve artificial intelligence models.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Zero-Retention Inference:</strong> All AI study tools operate strictly for transient, real-time study assistance under zero-data-retention parameters.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Restricted Retrieval Pipeline:</strong> Server-side scripture context is strictly restricted to open-license and public domain texts (BSB, WEB, KJV). Proprietary API content is never fed into external AI prompts.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: Bundled Scripture Texts */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs tracking-wider uppercase border-b border-zinc-800 pb-1.5">
              <BookOpen size={14} className="text-amber-500" />
              <span>Bundled Open Scripture Translations</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center justify-between font-semibold text-zinc-100 mb-1">
                  <span>Berean Standard Bible (BSB)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Public Domain (CC0 1.0)
                  </span>
                </div>
                <p className="text-zinc-400">
                  The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, and OpenBible.com, and has been dedicated to the public domain under Creative Commons Zero (CC0 1.0 Universal). You are free to copy, modify, distribute, and perform the work, even for commercial purposes, all without asking permission.
                </p>
                <a
                  href="https://berean.bible"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 mt-1.5 font-medium"
                >
                  berean.bible <ExternalLink size={11} />
                </a>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center justify-between font-semibold text-zinc-100 mb-1">
                  <span>World English Bible (WEB)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Public Domain
                  </span>
                </div>
                <p className="text-zinc-400">
                  The World English Bible is 100% in the Public Domain worldwide. Dedicated to the Lord Jesus Christ and the public by Rainbow Missions, Inc. / Michael Paul Johnson.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center justify-between font-semibold text-zinc-100 mb-1">
                  <span>King James Version (KJV)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Public Domain
                  </span>
                </div>
                <p className="text-zinc-400">
                  The King James Authorized Version (1611 / 1769 Blayney Oxford Edition) is in the Public Domain worldwide.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center justify-between font-semibold text-zinc-100 mb-1">
                  <span>American Standard Version (1901) & Young&apos;s Literal (1898)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Public Domain
                  </span>
                </div>
                <p className="text-zinc-400">
                  Historic English translations whose copyrights have completely expired and reside firmly in the public domain worldwide.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="flex items-center justify-between font-semibold text-zinc-100 mb-1">
                  <span>Charles Haddon Spurgeon &mdash; Morning &amp; Evening</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Public Domain (1866)
                  </span>
                </div>
                <p className="text-zinc-400">
                  Daily devotional readings authored by C. H. Spurgeon, published originally in 1866, are in the Public Domain worldwide.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Copyrighted Translations & Trademarks */}
          <section className="space-y-2 text-xs text-zinc-400">
            <div className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
              Trademarks &amp; Proprietary Translations
            </div>
            <p>
              All product names, logos, and brands are property of their respective owners. Mention of modern copyrighted translations (such as ESV, NIV, NASB, NLT) is strictly for technical interoperability reference. Theologica does not bundle, host, or distribute proprietary copyright-protected texts without an authenticated, authorized API key.
            </p>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-[#18181b] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Theologica &bull; Open Scripture Platform
          </span>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
