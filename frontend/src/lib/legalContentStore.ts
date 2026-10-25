/**
 * Legal Content Store
 * Manages Privacy Policy, Terms of Service, and Legal / Licensing content
 * Editable via the Developer Console and rendered on public routes:
 * /privacy, /terms, and /legal
 */

import fs from 'fs';
import path from 'path';
import { getTranslationAttributions } from './bibleTranslations';

export type LegalDocSlug = 'privacy' | 'terms' | 'legal';

export interface LegalDocument {
  slug: LegalDocSlug;
  title: string;
  lastUpdated: string;
  content: string;
  summary?: string;
}

const DEFAULT_PRIVACY_MARKDOWN = `# Privacy Policy

**Effective Date:** October 25, 2026  
**Last Updated:** October 25, 2026

At **Theologica**, we believe Holy Scripture study is an inherently personal, contemplative, and sacred pursuit. We are deeply committed to protecting your privacy and ensuring complete sovereignty over your spiritual journals, reflections, notes, and study habits.

---

### 1. Our Guiding Privacy Principles

1. **Your Data Belongs to You:** Your private notes, sermon study materials, prayer requests, highlights, and custom mind-map boards are treated with the highest degree of confidentiality.
2. **No Model Training on Private Notes:** Your private notes, reflections, and prayers are **never sold, rented, or used to train public generative AI foundation models**.
3. **Local-First & Portable:** Unauthenticated guests retain all study notes and canvas boards locally on their own device. Signed-in users can export an unencrypted JSON or PDF archive of their study data at any time.

---

### 2. Information We Collect

- **Account Authentication:** When you choose to sign in to sync your study across devices, account creation and secure session tokens are handled securely via Clerk Authentication. We store your account identifier and email address.
- **Study Content (Signed-in Users):** To enable seamless multi-device synchronization, we securely store the notes, verse highlights, canvas mind-maps, and reading tracker records you explicitly create.
- **Guest Users:** If you use Theologica as an unauthenticated guest, your notes, reading streak, and canvas boards remain strictly in your browser's local storage (\`localStorage\`). No guest journals are pooled or stored on our servers.
- **Anonymous Performance Telemetry:** We record coarse, anonymous usage telemetry (such as feature usage counts) to monitor platform health, prevent abuse, and optimize performance. Telemetry never includes the textual contents of your private notes.

---

### 3. Artificial Intelligence & Third-Party Services

When you choose to invoke Theologica's AI features (such as Study AI, theological homiletics outlines, original language nuance, or canvas synthesis):
- Only the specific scripture reference, current study passage, and your explicit query are transmitted securely to authorized LLM processing endpoints (e.g. Google Gemini, Anthropic, or OpenAI).
- Transmission is encrypted via Transport Layer Security (TLS 1.3).
- We do not share your private account profile with external advertisers.

---

### 4. Data Retention & Deletion

- You have full ownership and control over your records. You can delete any note, highlight, canvas card, or reading plan progress directly within the application at any time.
- Deletions are executed immediately across active databases.
- You can request full account deletion and complete erasure of all associated data by contacting our support team or via account settings.

---

### 5. Contact Us

If you have any questions, suggestions, or concerns regarding this Privacy Policy or your data sovereignty, please reach out to:  
**Theologica Privacy & Data Ethics Team**  
Email: \`privacy@theologica.app\`
`;

const DEFAULT_TERMS_MARKDOWN = `# Terms of Service

**Effective Date:** October 25, 2026  
**Last Updated:** October 25, 2026

Welcome to **Theologica**. By accessing or using our scripture study platform, visual inductive canvas, and theological workspace, you agree to be bound by these Terms of Service.

---

### 1. Purpose of the Service

Theologica is an advanced digital workspace designed for personal devotional reading, academic theological research, expository sermon preparation, and visual scripture synthesis.

---

### 2. User Content & Intellectual Property

- **Your Content:** You retain all intellectual property rights and full copyright ownership of any original study notes, reflections, sermon outlines, diagrams, and writings you author within Theologica.
- **License to Operate:** By submitting or storing content through Theologica, you grant us solely the operational technical license required to host, back up, and synchronize your data between your devices as intended.
- **Reverence & Respect:** Users agree not to utilize the platform for unlawful purposes, hate speech, harassment, or malicious activity that disrupts other users or infrastructure.

---

### 3. Theological AI Disclosures & Limitations

- The AI theological assistant provides assistive study observations, historical background, lexicons, and structural outlines based on natural language processing.
- AI-generated insights are provided as research and devotional aids. They do not constitute infallible doctrinal authority, medical, legal, or professional advice.
- Users are encouraged to prayerfully test all insights against canonical Scripture, historical Christian confessions, and sound pastoral community.

---

### 4. Scripture Copyrights & Fair Use

Theologica provides access to public domain and open-licensed Bible translations for unrestricted study. When quoting copyrighted modern Bible translations (such as the ESV, NIV, or NASB), users are responsible for honoring the fair-use policies and copyright guidelines of the respective publishers.

---

### 5. Termination & Service Modifications

We reserve the right to suspend or terminate accounts that violate these Terms or engage in abusive attacks against our servers. You may cease using Theologica at any time and export all your data before doing so.

---

### 6. Disclaimer of Warranties

The service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.

---

### 7. Questions

Questions regarding these Terms of Service should be directed to:  
**Theologica Legal Team**  
Email: \`legal@theologica.app\`
`;

const DEFAULT_LEGAL_MARKDOWN = `# Legal, Licensing & Bible Translation Attributions

**Last Updated:** October 25, 2026

Theologica is built with deep gratitude to Bible publishers, scholars, translators, and open-source software contributors worldwide who make the Word of God and modern study tools accessible to all.

---

### Bible Translation Attributions & Copyrights

The following translations of the Holy Scriptures are integrated into Theologica. Each translation is presented in strict accordance with its respective copyright, permissive license, or public domain dedication.
`;

const STORAGE_FILE_PATH = path.join(process.cwd(), 'src', 'lib', 'legalDocumentsData.json');

// In-memory cache
let legalDocsMemoryCache: Record<LegalDocSlug, LegalDocument> | null = null;

function loadPersistedDocs(): Record<LegalDocSlug, LegalDocument> {
  if (legalDocsMemoryCache) return legalDocsMemoryCache;

  const defaults: Record<LegalDocSlug, LegalDocument> = {
    privacy: {
      slug: 'privacy',
      title: 'Privacy Policy',
      lastUpdated: 'October 25, 2026',
      content: DEFAULT_PRIVACY_MARKDOWN,
    },
    terms: {
      slug: 'terms',
      title: 'Terms of Service',
      lastUpdated: 'October 25, 2026',
      content: DEFAULT_TERMS_MARKDOWN,
    },
    legal: {
      slug: 'legal',
      title: 'Legal & Bible Translation Attributions',
      lastUpdated: 'October 25, 2026',
      content: DEFAULT_LEGAL_MARKDOWN,
    },
  };

  try {
    if (fs.existsSync(STORAGE_FILE_PATH)) {
      const fileData = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      legalDocsMemoryCache = {
        privacy: parsed.privacy || defaults.privacy,
        terms: parsed.terms || defaults.terms,
        legal: parsed.legal || defaults.legal,
      };
      return legalDocsMemoryCache!;
    }
  } catch (err) {
    console.warn('Could not read persistent legal document store; using defaults:', err);
  }

  legalDocsMemoryCache = defaults;
  return defaults;
}

export function getLegalDocument(slug: LegalDocSlug): LegalDocument {
  const docs = loadPersistedDocs();
  const doc = docs[slug] || docs.privacy;

  // For the legal page: automatically append dynamic translation attributions from the central registry!
  if (slug === 'legal') {
    const attributions = getTranslationAttributions();
    const attributionsMarkdown = attributions
      .map((t) => {
        const badge = t.isPublicDomain ? 'Public Domain' : t.license === 'open-license' ? 'Open License (CC0)' : 'Copyrighted (Used by Permission)';
        return `#### ${t.name} (${t.abbreviation})\n**Classification:** ${badge}${t.year ? ` • **Year:** ${t.year}` : ''}${t.publisher ? ` • **Publisher:** ${t.publisher}` : ''}\n\n> ${t.licenseText}\n`;
      })
      .join('\n---\n\n');

    return {
      ...doc,
      content: `${doc.content}\n\n${attributionsMarkdown}\n\n---\n\n### Open Source Software Notices\n\nTheologica is engineered using foundational open-source technologies including Next.js, React, Tailwind CSS, Lucide Icons, and Prisma ORM, licensed under permissive MIT / Apache 2.0 terms.`,
    };
  }

  return doc;
}

export function saveLegalDocument(slug: LegalDocSlug, content: string, title?: string): LegalDocument {
  const docs = loadPersistedDocs();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const updatedDoc: LegalDocument = {
    slug,
    title: title || docs[slug]?.title || (slug === 'privacy' ? 'Privacy Policy' : slug === 'terms' ? 'Terms of Service' : 'Legal & Licensing'),
    lastUpdated: dateFormatted,
    content,
  };

  docs[slug] = updatedDoc;
  legalDocsMemoryCache = docs;

  try {
    fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist legal documents to file; memory updated:', err);
  }

  return updatedDoc;
}
