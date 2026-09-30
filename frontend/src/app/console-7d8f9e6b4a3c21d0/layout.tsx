import { auth, currentUser } from '@clerk/nextjs/server';
import { isAuthorizedAdmin } from '@/lib/devAuth';
import type { Metadata } from 'next';
import { Shield, ShieldAlert } from 'lucide-react';
import { DEV_PORTAL_PATH } from '@/lib/devConfig';

export const metadata: Metadata = {
  title: 'Developer Portal · Theologica',
  description: 'Private developer telemetry and administration dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Strict Server-Side Clerk Auth Check
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--fg)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[var(--fg)]">Developer Portal</h1>
            <p className="text-xs text-[var(--muted)] mt-2">
              Authentication required. Please sign into your account to access the developer tools.
            </p>
          </div>
          <div className="pt-2">
            <a
              href={`/?sign-in=true&redirect_url=${encodeURIComponent(DEV_PORTAL_PATH)}`}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm"
            >
              Sign In to Continue
            </a>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Restricted to application administrator · Theologica
          </p>
        </div>
      </div>
    );
  }

  // 2. Strict Admin Identity Verification
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || null;

  const authorized = await isAuthorizedAdmin(userId, primaryEmail);
  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--fg)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--surface)] border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[var(--fg)]">Access Restricted</h1>
            <p className="text-xs text-[var(--muted)] mt-2">
              Signed in as <strong className="text-[var(--fg)]">{primaryEmail || userId}</strong>.
              This account is not designated as an administrator for this installation.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-all"
            >
              Return to App
            </a>
            <a
              href={`/?sign-in=true&redirect_url=${encodeURIComponent(DEV_PORTAL_PATH)}`}
              className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all"
            >
              Switch Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans selection:bg-accent/30 selection:text-white">
      {children}
    </div>
  );
}
