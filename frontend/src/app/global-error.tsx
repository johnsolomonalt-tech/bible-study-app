"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#141413] text-[#e8e6e3] font-sans antialiased m-0">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-rose-500 font-semibold">Application Halt</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#fafafa]">
              Fatal Application Error
            </h1>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              A critical failure occurred. Please reload the workspace.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#c96442] text-white text-sm font-medium hover:bg-[#b85838] transition-colors shadow-lg shadow-[#c96442]/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
