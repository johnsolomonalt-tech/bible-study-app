import type { Metadata } from 'next';
import { getLegalDocument } from '@/lib/legalContentStore';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bible Translations & Legal Licensing',
  description: 'Official copyright notices, permissive open-license attributions, and public domain acknowledgments for all Bible translations in Theologica.',
  alternates: {
    canonical: '/legal',
  },
  openGraph: {
    title: 'Bible Translations & Legal Licensing | Theologica',
    description: 'Official copyright notices, permissive open-license attributions, and public domain acknowledgments for all Bible translations in Theologica.',
  },
};

export default function LegalPage() {
  const document = getLegalDocument('legal');
  return <LegalPageLayout document={document} currentSlug="legal" />;
}
