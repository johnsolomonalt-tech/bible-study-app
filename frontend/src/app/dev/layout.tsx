import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAuthorizedAdmin } from '@/lib/devAuth';
import type { Metadata } from 'next';

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
    redirect('/');
  }

  // 2. Strict Admin Identity Verification
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || null;

  const authorized = await isAuthorizedAdmin(userId, primaryEmail);
  if (!authorized) {
    // Non-admin logged in user -> redirect to home page
    redirect('/');
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans selection:bg-accent/30 selection:text-white">
      {children}
    </div>
  );
}
