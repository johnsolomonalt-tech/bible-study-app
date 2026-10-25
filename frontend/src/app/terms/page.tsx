import type { Metadata } from 'next';
import { getLegalDocument } from '@/lib/legalContentStore';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Theologica Terms of Service. User content ownership, service conditions, and theological AI study disclosures.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | Theologica',
    description: 'Theologica Terms of Service. User content ownership, service conditions, and theological AI study disclosures.',
  },
};

export default function TermsPage() {
  const document = getLegalDocument('terms');
  return <LegalPageLayout document={document} currentSlug="terms" />;
}
