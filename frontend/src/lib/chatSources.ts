import { findCanonicalBook } from './bibleCanon';
import { BIBLE_VERSE_REGEX } from './bibleReferences';

export interface ChatSourceItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  category: 'lexicon' | 'scripture' | 'commentary' | 'history' | 'theology' | 'academic';
  highlightReference?: string;
}

const BIBLE_HUB_SLUGS: Record<string, string> = {
  'Genesis': 'genesis',
  'Exodus': 'exodus',
  'Leviticus': 'leviticus',
  'Numbers': 'numbers',
  'Deuteronomy': 'deuteronomy',
  'Joshua': 'joshua',
  'Judges': 'judges',
  'Ruth': 'ruth',
  '1 Samuel': '1_samuel',
  '2 Samuel': '2_samuel',
  '1 Kings': '1_kings',
  '2 Kings': '2_kings',
  '1 Chronicles': '1_chronicles',
  '2 Chronicles': '2_chronicles',
  'Ezra': 'ezra',
  'Nehemiah': 'nehemiah',
  'Esther': 'esther',
  'Job': 'job',
  'Psalms': 'psalms',
  'Psalm': 'psalms',
  'Proverbs': 'proverbs',
  'Ecclesiastes': 'ecclesiastes',
  'Song of Solomon': 'songs',
  'Isaiah': 'isaiah',
  'Jeremiah': 'jeremiah',
  'Lamentations': 'lamentations',
  'Ezekiel': 'ezekiel',
  'Daniel': 'daniel',
  'Hosea': 'hosea',
  'Joel': 'joel',
  'Amos': 'amos',
  'Obadiah': 'obadiah',
  'Jonah': 'jonah',
  'Micah': 'micah',
  'Nahum': 'nahum',
  'Habakkuk': 'habakkuk',
  'Zephaniah': 'zephaniah',
  'Haggai': 'haggai',
  'Zechariah': 'zechariah',
  'Malachi': 'malachi',
  'Matthew': 'matthew',
  'Mark': 'mark',
  'Luke': 'luke',
  'John': 'john',
  'Acts': 'acts',
  'Romans': 'romans',
  '1 Corinthians': '1_corinthians',
  '2 Corinthians': '2_corinthians',
  'Galatians': 'galatians',
  'Ephesians': 'ephesians',
  'Philippians': 'philippians',
  'Colossians': 'colossians',
  '1 Thessalonians': '1_thessalonians',
  '2 Thessalonians': '2_thessalonians',
  '1 Timothy': '1_timothy',
  '2 Timothy': '2_timothy',
  'Titus': 'titus',
  'Philemon': 'philemon',
  'Hebrews': 'hebrews',
  'James': 'james',
  '1 Peter': '1_peter',
  '2 Peter': '2_peter',
  '1 John': '1_john',
  '2 John': '2_john',
  '3 John': '3_john',
  'Jude': 'jude',
  'Revelation': 'revelation',
};

function getBibleHubSlug(bookName: string): string {
  if (BIBLE_HUB_SLUGS[bookName]) return BIBLE_HUB_SLUGS[bookName];
  const canonical = findCanonicalBook(bookName);
  if (canonical && BIBLE_HUB_SLUGS[canonical.name]) return BIBLE_HUB_SLUGS[canonical.name];
  return bookName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Builds verified external Bible study web sources from AI response content,
 * active theological lens, and RAG ground truth.
 */
export function extractVerifiedSources(
  content: string,
  lens = 'canonical',
  groundTruth?: { reference: string; translation: string } | null
): ChatSourceItem[] {
  if (!content) return [];

  const sources: ChatSourceItem[] = [];
  const seenUrls = new Set<string>();

  const addSource = (item: ChatSourceItem) => {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      sources.push(item);
    }
  };

  // 1. Check for custom markdown links [Title](https://...) inside the message text
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdLinkRegex.exec(content)) !== null) {
    try {
      const title = mdMatch[1];
      const url = mdMatch[2];
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace(/^www\./, '');
      addSource({
        id: `md-${url}`,
        title: title.length > 55 ? `${title.slice(0, 52)}...` : title,
        url,
        domain,
        snippet: `Direct link referenced in study response from ${domain}.`,
        category: 'academic',
      });
    } catch {
      // ignore invalid URLs
    }
  }

  // 2. Collect Bible verse citations from ground truth or content
  const detectedReferences: { book: string; chapter: number; verse: number; fullRef: string }[] = [];

  if (groundTruth?.reference) {
    const regex = new RegExp(BIBLE_VERSE_REGEX.source, 'i');
    const m = regex.exec(groundTruth.reference);
    if (m) {
      const canonical = findCanonicalBook(m[1]);
      detectedReferences.push({
        book: canonical ? canonical.name : m[1],
        chapter: parseInt(m[2], 10),
        verse: parseInt(m[3], 10),
        fullRef: groundTruth.reference,
      });
    }
  }

  const verseMatches = Array.from(content.matchAll(new RegExp(BIBLE_VERSE_REGEX.source, 'gi')));
  for (const m of verseMatches) {
    const rawBook = m[1];
    const canonical = findCanonicalBook(rawBook);
    const bookName = canonical ? canonical.name : rawBook;
    const chapter = parseInt(m[2], 10);
    const verse = parseInt(m[3], 10);
    const fullRef = `${bookName} ${chapter}:${verse}`;

    if (!detectedReferences.some(r => r.fullRef === fullRef)) {
      detectedReferences.push({ book: bookName, chapter, verse, fullRef });
    }
  }

  // 3. Generate primary scripture & interlinear source cards for detected verses
  if (detectedReferences.length > 0) {
    const primary = detectedReferences[0];
    const hubSlug = getBibleHubSlug(primary.book);

    // Bible Hub Interlinear & Lexicon
    addSource({
      id: `biblehub-interlinear-${primary.fullRef}`,
      title: `Bible Hub · ${primary.fullRef} Interlinear & Lexicon`,
      url: `https://biblehub.com/interlinear/${hubSlug}/${primary.chapter}-${primary.verse}.htm`,
      domain: 'biblehub.com',
      snippet: `Original Hebrew & Greek interlinear parsing, Strong's Concordance numbering, and verse-by-verse classic commentaries for ${primary.fullRef}.`,
      category: 'lexicon',
      highlightReference: primary.fullRef,
    });

    // Blue Letter Bible Study Tools & Lexicon
    addSource({
      id: `blb-${primary.fullRef}`,
      title: `Blue Letter Bible · ${primary.fullRef} Study Tools`,
      url: `https://www.blueletterbible.org/search/preSearch.cfm?Criteria=${encodeURIComponent(primary.fullRef)}`,
      domain: 'blueletterbible.org',
      snippet: `Morphological roots, Gesenius Hebrew-Chaldee lexicon, Thayer Greek lexicon, and Treasury of Scripture Knowledge cross-references.`,
      category: 'scripture',
      highlightReference: primary.fullRef,
    });

    // STEP Bible (Tyndale House Cambridge)
    addSource({
      id: `stepbible-${primary.book}-${primary.chapter}`,
      title: `STEP Bible (Tyndale House Cambridge) · ${primary.book} ${primary.chapter}`,
      url: `https://www.stepbible.org/?q=version=BSB|reference=${encodeURIComponent(`${primary.book}.${primary.chapter}.${primary.verse}`)}`,
      domain: 'stepbible.org',
      snippet: `Academic manuscript witnesses (Dead Sea Scrolls, Septuagint, Masoretic Text) and Tyndale House grammatical research.`,
      category: 'academic',
      highlightReference: primary.fullRef,
    });

    // Bible Gateway translation comparison
    addSource({
      id: `biblegateway-${primary.fullRef}`,
      title: `Bible Gateway · ${primary.fullRef} Parallel Translations`,
      url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(primary.fullRef)}&version=BSB`,
      domain: 'biblegateway.com',
      snippet: `Parallel English translations, contextual chapter reading, and canonical cross-comparisons.`,
      category: 'scripture',
      highlightReference: primary.fullRef,
    });

    // If second verse exists, link its Bible Hub commentary
    if (detectedReferences.length > 1) {
      const secondary = detectedReferences[1];
      const secSlug = getBibleHubSlug(secondary.book);
      addSource({
        id: `biblehub-commentary-${secondary.fullRef}`,
        title: `Bible Hub · ${secondary.fullRef} Commentaries`,
        url: `https://biblehub.com/commentaries/${secSlug}/${secondary.chapter}-${secondary.verse}.htm`,
        domain: 'biblehub.com',
        snippet: `Historical expository commentaries (Matthew Henry, Ellicott, Cambridge Bible for Schools, Barnes Notes).`,
        category: 'commentary',
        highlightReference: secondary.fullRef,
      });
    }
  }

  // 4. Check for Hebrew / Greek roots or Strong's Concordance mentions
  const hasStrongNumber = /strong'?s\s*([GH]\d+)/i.exec(content);
  if (hasStrongNumber) {
    const num = hasStrongNumber[1].toLowerCase();
    addSource({
      id: `blb-lexicon-${num}`,
      title: `Blue Letter Bible · Strong's ${num.toUpperCase()} Lexicon`,
      url: `https://www.blueletterbible.org/lexicon/${num}/kjv/wlc/0-1/`,
      domain: 'blueletterbible.org',
      snippet: `Complete lexical definition, Hebrew/Greek etymological root tree, and Scripture occurrence concordance.`,
      category: 'lexicon',
    });
  }

  // 5. Theological Lens & Historical Church Sources
  const hasPatristicTerms = /augustine|chrysostom|irenaeus|athanasius|patristic|early church|desert fathers|cappadocian|tertullian|nicene/i.test(content) || lens === 'patristic';
  if (hasPatristicTerms) {
    addSource({
      id: 'ccel-fathers',
      title: 'Christian Classics Ethereal Library · Early Church Fathers',
      url: 'https://www.ccel.org/fathers',
      domain: 'ccel.org',
      snippet: 'Primary historical source texts of the Ante-Nicene, Nicene, and Post-Nicene Fathers (Philip Schaff collection).',
      category: 'history',
    });
    addSource({
      id: 'newadvent-fathers',
      title: 'New Advent · Fathers of the Church',
      url: 'https://www.newadvent.org/fathers/',
      domain: 'newadvent.org',
      snippet: 'Unabridged ancient Greek and Latin Patristic homilies, ecumenical council canons, and historic treatises.',
      category: 'history',
    });
  }

  const hasReformationTerms = /calvin|luther|spurgeon|edwards|reformation|puritan|sola fide|solas|westminster|covenant theology/i.test(content) || lens === 'reformation';
  if (hasReformationTerms) {
    addSource({
      id: 'monergism-theology',
      title: 'Monergism · Historic Reformation & Doctrines of Grace',
      url: 'https://www.monergism.com/',
      domain: 'monergism.com',
      snippet: 'Primary historical Reformed theology, Five Solas expositions, Puritan writings, and historic confessions.',
      category: 'theology',
    });
    addSource({
      id: 'ccel-calvin',
      title: "Christian Classics Ethereal Library · Calvin's Commentaries",
      url: 'https://www.ccel.org/ccel/calvin',
      domain: 'ccel.org',
      snippet: 'Classic Reformation expository commentaries and John Calvin Institutes of the Christian Religion.',
      category: 'commentary',
    });
  }

  // 6. Biblical Theology, Covenant Design & Pastoral Reflections
  const hasBiblicalTheology = /covenant|typology|christology|creation|exile|messiah|temple|kingdom of god/i.test(content) || lens === 'canonical';
  if (hasBiblicalTheology) {
    addSource({
      id: 'bibleproject-explore',
      title: 'BibleProject · Biblical Themes & Literary Design',
      url: 'https://bibleproject.com/explore/',
      domain: 'bibleproject.com',
      snippet: 'Visual biblical theology, cross-canonical design patterns, and Old/New Testament organic unity.',
      category: 'theology',
    });
  }

  // 7. General Orthodox Christianity & Expository Essays Fallback
  addSource({
    id: 'tgc-commentary',
    title: 'The Gospel Coalition · Expository Commentary & Essays',
    url: 'https://www.thegospelcoalition.org/commentary/',
    domain: 'thegospelcoalition.org',
    snippet: 'Theological essays, biblical book overviews, and orthodox Christian scholarly commentaries.',
    category: 'commentary',
  });

  addSource({
    id: 'gotquestions-search',
    title: 'GotQuestions.org · Christian Bible Answers',
    url: 'https://www.gotquestions.org/',
    domain: 'gotquestions.org',
    snippet: 'Orthodox Christian apologetics, verse cross-examinations, and systematic theological overviews.',
    category: 'theology',
  });

  // Return the top 4-6 most relevant sources
  return sources.slice(0, 5);
}
