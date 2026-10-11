import React from 'react';
import { AuthNavbar } from '@/components/auth/AuthNavbar';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh w-screen max-w-full flex flex-col bg-bg text-fg overflow-x-hidden selection:bg-accent/20">
      {/* Workspace Header for seamless continuity */}
      <AuthNavbar />

      {/* Center Auth Experience with ambient theological glow */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 sm:py-12 relative overflow-hidden">
        {/* Soft radial warmth background */}
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Auth Component Container */}
        <div className="w-full max-w-md relative z-10 flex flex-col items-center">
          {children}

          {/* Reverent Security & Privacy Footnote */}
          <p className="text-[11px] text-muted text-center mt-6 max-w-xs leading-relaxed select-none">
            Personal notes, highlights, and study canvases are safely preserved and private to your account.
          </p>
        </div>
      </main>
    </div>
  );
}
