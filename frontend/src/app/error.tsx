"use client";

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error
    console.error('Unhandled app error caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#141413] text-[#e8e6e3]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-500 font-semibold">Unexpected Error</span>
          <h1 className="text-2xl font-bold tracking-tight font-serif text-[#fafafa]">
            Something Interrupted Your Study
          </h1>
          <p className="text-sm text-[#a1a1aa] leading-relaxed">
            An unexpected error occurred while rendering this workspace. Your saved notes and data remain safe.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#c96442] text-white text-sm font-medium hover:bg-[#b85838] transition-colors shadow-lg shadow-[#c96442]/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#222224] hover:bg-[#2c2c30] text-[#fafafa] border border-[#333338] text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Workspace Home
          </Link>
        </div>
      </div>
    </div>
  );
}
