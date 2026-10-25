import type { Metadata } from 'next';
import { getLegalDocument } from '@/lib/legalContentStore';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Theologica Privacy Policy and Data Ethics. Learn how we protect your personal reflections, study journals, and prayer notes with strict confidentiality.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Theologica',
    description: 'Theologica Privacy Policy and Data Ethics. Your personal study notes and reflections are strictly confidential.',
  },
};

export default function PrivacyPage() {
  const document = getLegalDocument('privacy');
  return <LegalPageLayout document={document} currentSlug="privacy" />;
}
