/**
 * Reading Plans Library & Architecture
 * Provides a rich set of reading paths that drive the Tracker and daily goals.
 * Tracks Started (Active), Available, and Finished plans with persistence.
 */

import { OT_BOOKS, NT_BOOKS } from '@/lib/bibleCanon';

export interface ReadingPlan {
  id: string;
  title: string;
  tagline: string;
  category: 'gospels' | 'new-testament' | 'wisdom' | 'epistles' | 'old-testament' | 'whole-bible';
  estimatedDays: number;
  description: string;
  books: string[];
}

export const READING_PLANS_LIBRARY: ReadingPlan[] = [
  // 1. The Four Gospels
  {
    id: 'gospels',
    title: 'The Four Gospels',
    tagline: 'Life & Teachings of Jesus Christ',
    category: 'gospels',
    estimatedDays: 30,
    description: 'Walk through Matthew, Mark, Luke, and John to witness the ministry, miracles, death, and resurrection of our Lord.',
    books: ['Matthew', 'Mark', 'Luke', 'John'],
  },

  // 2. Psalms & Proverbs
  {
    id: 'psalms-proverbs',
    title: 'Psalms & Proverbs',
    tagline: 'Daily Prayer, Worship & Practical Wisdom',
    category: 'wisdom',
    estimatedDays: 60,
    description: 'Immerse your mind in timeless worship, heartfelt laments, triumphant praises, and practical everyday godly wisdom.',
    books: ['Psalms', 'Proverbs'],
  },

  // 3. Romans: The Gospel of Grace
  {
    id: 'romans',
    title: 'Romans: The Gospel of Grace',
    tagline: 'Paul’s Masterpiece of Systematic Theology',
    category: 'epistles',
    estimatedDays: 16,
    description: 'A deep chapter-by-chapter study through justification by faith, union with Christ, God’s sovereign mercy, and Christian liberty.',
    books: ['Romans'],
  },

  // 4. The Complete New Testament
  {
    id: 'nt-complete',
    title: 'The New Testament Journey',
    tagline: 'Complete Apostolic Witness & Early Church',
    category: 'new-testament',
    estimatedDays: 90,
    description: 'Read the entirety of the New Testament — Gospels, Acts, Epistles, and Revelation — covering 260 transformative chapters.',
    books: NT_BOOKS.map((b) => b.name),
  },

  // 5. Wisdom Literature
  {
    id: 'wisdom-books',
    title: 'Biblical Wisdom Literature',
    tagline: 'Job, Ecclesiastes & Song of Solomon',
    category: 'wisdom',
    estimatedDays: 45,
    description: 'Grapple with human suffering, divine sovereignty, the meaning of life under the sun, and the beauty of covenantal love.',
    books: ['Job', 'Ecclesiastes', 'Song of Solomon'],
  },

  // 6. The Torah / Pentateuch
  {
    id: 'pentateuch',
    title: 'The Torah: Foundations of the Covenant',
    tagline: 'Genesis through Deuteronomy',
    category: 'old-testament',
    estimatedDays: 90,
    description: 'From creation and the patriarchs to the exodus, the wilderness wandering, and God’s sacred law given to Moses.',
    books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  },

  // 7. Paul’s Prison & Pastoral Epistles
  {
    id: 'pauline-epistles',
    title: 'Paul’s Epistles to the Churches',
    tagline: 'Doctrines of Grace, Salvation & Ministry',
    category: 'epistles',
    estimatedDays: 40,
    description: 'Journey through Paul’s pastoral letters from 1 Corinthians to Philemon, discovering the nature of the church and pastoral leadership.',
    books: [
      '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
      'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
      '1 Timothy', '2 Timothy', 'Titus', 'Philemon'
    ],
  },

  // 8. Acts & The Apostolic Church
  {
    id: 'acts-history',
    title: 'Acts of the Apostles',
    tagline: 'The Holy Spirit & Early Church Expansion',
    category: 'new-testament',
    estimatedDays: 28,
    description: 'Witness the day of Pentecost, the bold witness of Peter and John, the conversion of Saul, and the gospel spreading to Rome.',
    books: ['Acts'],
  },

  // 9. General Epistles & Revelation
  {
    id: 'general-revelation',
    title: 'General Epistles & Revelation',
    tagline: 'Enduring Faith & Christ’s Eternal Triumph',
    category: 'new-testament',
    estimatedDays: 35,
    description: 'From Hebrews to Revelation: perseverance amidst trials, faith working through love, and the cosmic victory of the Lamb.',
    books: [
      'Hebrews', 'James', '1 Peter', '2 Peter',
      '1 John', '2 John', '3 John', 'Jude', 'Revelation'
    ],
  },

  // 10. The Major Prophets
  {
    id: 'major-prophets',
    title: 'The Major Prophets',
    tagline: 'Messianic Prophecies & Divine Righteousness',
    category: 'old-testament',
    estimatedDays: 90,
    description: 'Read the majestic visions of Isaiah, the weeping sorrow of Jeremiah, the celestial glory in Ezekiel, and the sovereign kingdoms in Daniel.',
    books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
  },

  // 11. Old Testament Historical Books
  {
    id: 'ot-history',
    title: 'Kings, Chronicles & Covenants',
    tagline: 'The Rise and Fall of Israel & Judah',
    category: 'old-testament',
    estimatedDays: 75,
    description: 'Explore the conquering of the Promised Land, the era of the Judges, and the reigns of David, Solomon, and the kings.',
    books: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings'],
  },

  // 12. The Complete Bible (66 Books)
  {
    id: 'whole-bible',
    title: 'Through the Whole Bible',
    tagline: 'Genesis to Revelation (1,189 Chapters)',
    category: 'whole-bible',
    estimatedDays: 365,
    description: 'The monumental, life-changing journey through all sixty-six canonical books of the Old and New Testaments.',
    books: [...OT_BOOKS.map((b) => b.name), ...NT_BOOKS.map((b) => b.name)],
  },
];

export interface PlanChapter {
  book: string;
  chapter: number;
  id: string; // e.g. "Genesis-1"
}

export function getPlanChapters(plan: ReadingPlan): PlanChapter[] {
  const allBooks = [...OT_BOOKS, ...NT_BOOKS];
  return plan.books.flatMap((bookName) => {
    const bookInfo = allBooks.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
    if (!bookInfo) return [];
    return Array.from({ length: bookInfo.chapters }, (_, i) => ({
      book: bookName,
      chapter: i + 1,
      id: `${bookName}-${i + 1}`,
    }));
  });
}

export interface PlanProgressStats {
  totalChapters: number;
  completedCount: number;
  percent: number;
  isFinished: boolean;
  nextChapter?: PlanChapter;
  firstChapter?: PlanChapter;
}

export function calculatePlanStats(plan: ReadingPlan, completedChapters: string[]): PlanProgressStats {
  const chapters = getPlanChapters(plan);
  const total = chapters.length;
  if (total === 0) {
    return {
      totalChapters: 0,
      completedCount: 0,
      percent: 0,
      isFinished: false,
    };
  }

  const completedSet = new Set(completedChapters);
  const completedCount = chapters.filter((c) => completedSet.has(c.id)).length;
  const percent = Math.min(100, Math.round((completedCount / total) * 100));
  const isFinished = completedCount === total && total > 0;
  const nextChapter = chapters.find((c) => !completedSet.has(c.id));
  const firstChapter = chapters[0];

  return {
    totalChapters: total,
    completedCount,
    percent,
    isFinished,
    nextChapter,
    firstChapter,
  };
}
