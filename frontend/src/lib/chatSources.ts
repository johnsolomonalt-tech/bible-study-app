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
 * Extracts dominant theological topics from text to generate tailored research deep-links.
 */
function extractPrimaryTopic(text: string): string | null {
  const topics: { pattern: RegExp; name: string }[] = [
    { pattern: /\bresurrection|risen|empty tomb\b/i, name: 'Resurrection of Jesus' },
    { pattern: /\btrinity|triune|father son and holy spirit\b/i, name: 'Doctrine of the Trinity' },
    { pattern: /\bincarnat|word became flesh|hypostatic\b/i, name: 'Incarnation of Christ' },
    { pattern: /\batonement|propitiat|substitutionary|cross\b/i, name: 'Atonement of Christ' },
    { pattern: /\bjustif|faith alone|sola fide|imputed\b/i, name: 'Justification by Faith' },
    { pattern: /\bcovenant|abrahamic|davidic|mosaic|new covenant\b/i, name: 'Biblical Covenants' },
    { pattern: /\bgrace|unmerited favor|mercy\b/i, name: 'God Grace and Mercy' },
    { pattern: /\bprayer|intercession|petition|supplication\b/i, name: 'Christian Prayer' },
    { pattern: /\bholy spirit|pneumat|paraclete|spiritual gifts\b/i, name: 'Work of the Holy Spirit' },
    { pattern: /\bcreation|ex nihilo|genesis 1|image of god\b/i, name: 'Biblical Creation' },
    { pattern: /\bdead sea scrolls|qumran|ancient manuscripts\b/i, name: 'Dead Sea Scrolls' },
    { pattern: /\barchaeolog|excavat|near east discoveries\b/i, name: 'Biblical Archaeology' },
    { pattern: /\bpatristic|early church fathers|augustine|chrysostom\b/i, name: 'Early Church Fathers' },
    { pattern: /\breformation|calvin|luther|solas\b/i, name: 'Protestant Reformation' },
    { pattern: /\bfaith|trust|assurance|hope\b/i, name: 'Christian Faith and Trust' },
    { pattern: /\blove|agape|hesed|charity\b/i, name: 'Biblical Love Agape' },
    { pattern: /\bpeace|shalom|reconciliation\b/i, name: 'Biblical Shalom Peace' },
    { pattern: /\blaw and gospel|ten commandments|decalogue\b/i, name: 'Law and Gospel' },
    { pattern: /\bbeatitudes|sermon on the mount\b/i, name: 'Sermon on the Mount' },
    { pattern: /\bparables|prodigal son|good samaritan\b/i, name: 'Parables of Jesus' },
  ];

  for (const t of topics) {
    if (t.pattern.test(text)) return t.name;
  }
  return null;
}

/**
 * Builds verified external Bible study web sources from AI response content,
 * active theological lens, and RAG ground truth. Generates dynamic, diverse sources
 * tailored to the exact topic, passage, or historical period.
 */
export function extractVerifiedSources(
  content: string,
  lens = 'canonical',
  groundTruth?: { reference: string; translation: string } | null
): ChatSourceItem[] {
  if (!content) return [];

  const sources: ChatSourceItem[] = [];
  const seenDomains = new Set<string>();

  const addSource = (item: ChatSourceItem) => {
    // Encourage domain diversity — avoid loading 3 cards from the exact same site
    if (seenDomains.has(item.domain) && seenDomains.size >= 3) {
      return;
    }
    seenDomains.add(item.domain);
    sources.push(item);
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
        snippet: `Direct reference cited in study response from ${domain}.`,
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

  // 3. Primary Scripture interlinear / morphological tools
  if (detectedReferences.length > 0) {
    const primary = detectedReferences[0];
    const hubSlug = getBibleHubSlug(primary.book);

    // Bible Hub Interlinear
    addSource({
      id: `biblehub-interlinear-${primary.fullRef}`,
      title: `Bible Hub · ${primary.fullRef} Interlinear & Lexicon`,
      url: `https://biblehub.com/interlinear/${hubSlug}/${primary.chapter}-${primary.verse}.htm`,
      domain: 'biblehub.com',
      snippet: `Original Hebrew & Greek interlinear parsing, Strong's Concordance numbering, and verse-by-verse grammar.`,
      category: 'lexicon',
      highlightReference: primary.fullRef,
    });

    // Blue Letter Bible
    addSource({
      id: `blb-${primary.fullRef}`,
      title: `Blue Letter Bible · ${primary.fullRef} Exegesis`,
      url: `https://www.blueletterbible.org/search/preSearch.cfm?Criteria=${encodeURIComponent(primary.fullRef)}`,
      domain: 'blueletterbible.org',
      snippet: `Morphological parsing, Gesenius Hebrew/Thayer Greek lexicons, and Treasury of Scripture Knowledge.`,
      category: 'scripture',
      highlightReference: primary.fullRef,
    });
  }

  // 4. Topic-Specific Rich Scholarly & Historical Domains
  const primaryTopic = extractPrimaryTopic(content);

  // Archaeology & Ancient Context
  const hasArchaeology = /archaeol|excavat|dead sea scrolls|qumran|ancient near east|second temple|babylon|assyria|egypt/i.test(content);
  if (hasArchaeology) {
    if (/dead sea scrolls|qumran/i.test(content)) {
      addSource({
        id: 'dead-sea-scrolls',
        title: 'Leon Levy Dead Sea Scrolls Digital Library',
        url: 'https://www.deadseascrolls.org.il/',
        domain: 'deadseascrolls.org.il',
        snippet: 'Digitized high-resolution multispectral imagery of Biblical manuscripts from Qumran caves.',
        category: 'academic',
      });
    } else {
      addSource({
        id: 'biblical-archaeology',
        title: 'Biblical Archaeology Society · Ancient Discoveries',
        url: 'https://www.biblicalarchaeology.org/',
        domain: 'biblicalarchaeology.org',
        snippet: 'Scholarly archaeological excavations, material culture, and historical inscriptions verifying Scripture.',
        category: 'academic',
      });
    }
  }

  // Patristic & Church History
  const hasPatristic = /augustine|chrysostom|irenaeus|athanasius|patristic|early church|desert fathers|nicene|creed/i.test(content) || lens === 'patristic';
  if (hasPatristic) {
    addSource({
      id: 'ccel-fathers',
      title: 'Christian Classics Ethereal Library · Early Church Fathers',
      url: 'https://www.ccel.org/fathers',
      domain: 'ccel.org',
      snippet: 'Primary source texts of the Ante-Nicene, Nicene, and Post-Nicene Fathers (Philip Schaff collection).',
      category: 'history',
    });
    addSource({
      id: 'newadvent-fathers',
      title: 'New Advent · Patristic Homilies & Council Canons',
      url: 'https://www.newadvent.org/fathers/',
      domain: 'newadvent.org',
      snippet: 'Ancient Greek and Latin Church Father homilies, theological apologetics, and historical creeds.',
      category: 'history',
    });
  }

  // Reformation & Historic Expositions
  const hasReformation = /calvin|luther|spurgeon|puritan|sola fide|solas|westminster|edwards|owen/i.test(content) || lens === 'reformation';
  if (hasReformation) {
    if (/spurgeon/i.test(content)) {
      addSource({
        id: 'spurgeon-center',
        title: 'The Spurgeon Center · Historical Sermons & Expository Archives',
        url: 'https://www.spurgeon.org/resource-library/',
        domain: 'spurgeon.org',
        snippet: 'Charles Spurgeon unabridged expository sermons, Treasury of David commentaries, and pastoral works.',
        category: 'commentary',
      });
    } else {
      addSource({
        id: 'monergism-reformation',
        title: 'Monergism · Historic Reformation & Doctrines of Grace',
        url: 'https://www.monergism.com/',
        domain: 'monergism.com',
        snippet: 'Historical Protestant theology, Five Solas expositions, Puritan writings, and historic confessions.',
        category: 'theology',
      });
      addSource({
        id: 'ligonier-articles',
        title: 'Ligonier Ministries · Reformed Theology & Biblical Studies',
        url: 'https://www.ligonier.org/',
        domain: 'ligonier.org',
        snippet: 'Classical evangelical theology, historical confessions, and systematic scriptural commentary.',
        category: 'theology',
      });
    }
  }

  // Biblical Theology & Redemptive Themes
  const hasTheologyTheme = /covenant|typology|christology|creation|exile|messiah|temple|kingdom of god/i.test(content) || lens === 'canonical';
  if (hasTheologyTheme) {
    addSource({
      id: 'bibleproject-explore',
      title: 'BibleProject · Biblical Themes & Literary Design Patterns',
      url: 'https://bibleproject.com/explore/',
      domain: 'bibleproject.com',
      snippet: 'Visual biblical theology, cross-canonical design patterns, and Old/New Testament organic continuity.',
      category: 'theology',
    });
  }

  // Academic / Manuscript Research (STEP Bible Tyndale House)
  if (lens === 'scholarly' || /manuscript|textual variant|septuagint|masoretic|hebrew root|greek root/i.test(content)) {
    addSource({
      id: 'stepbible-academic',
      title: 'STEP Bible (Tyndale House Cambridge)',
      url: 'https://www.stepbible.org/',
      domain: 'stepbible.org',
      snippet: 'Tyndale House Cambridge grammatical analysis, Dead Sea Scroll witnesses, and ancient manuscripts.',
      category: 'academic',
    });
  }

  // Devotional, Prayer & Christian Living
  if (lens === 'contemplative' || /devotion|prayer|meditat|abide|spiritual formation|intimacy with god/i.test(content)) {
    addSource({
      id: 'desiringgod-articles',
      title: 'Desiring God · Biblical Reflections & Devotional Exegesis',
      url: 'https://www.desiringgod.org/',
      domain: 'desiringgod.org',
      snippet: 'Christ-centered pastoral theology, contemplative meditations on Scripture, and spiritual formation.',
      category: 'theology',
    });
  }

  // Topic-Aware Dynamic Search Deep-Links (prevents repeating the same generic root pages)
  if (primaryTopic) {
    addSource({
      id: `tgc-topic-${primaryTopic}`,
      title: `The Gospel Coalition · ${primaryTopic}`,
      url: `https://www.thegospelcoalition.org/?s=${encodeURIComponent(primaryTopic)}`,
      domain: 'thegospelcoalition.org',
      snippet: `Scholarly essays, pastoral perspectives, and expository commentary on ${primaryTopic}.`,
      category: 'commentary',
    });

    addSource({
      id: `gotquestions-topic-${primaryTopic}`,
      title: `GotQuestions.org · ${primaryTopic}`,
      url: `https://www.gotquestions.org/search.html?q=${encodeURIComponent(primaryTopic)}`,
      domain: 'gotquestions.org',
      snippet: `Orthodox Christian biblical answers and cross-canonical examination concerning ${primaryTopic}.`,
      category: 'theology',
    });
  } else {
    // If no specific topic matched, provide Bible Gateway passage lookup or TGC
    if (detectedReferences.length > 0) {
      const ref = detectedReferences[0].fullRef;
      addSource({
        id: `biblegateway-${ref}`,
        title: `Bible Gateway · ${ref} Text & Parallels`,
        url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=BSB`,
        domain: 'biblegateway.com',
        snippet: `Parallel translation comparison, canonical context, and scholarly Bible dictionaries.`,
        category: 'scripture',
      });
    }

    addSource({
      id: 'tgc-commentary',
      title: 'The Gospel Coalition · Expository Commentary',
      url: 'https://www.thegospelcoalition.org/commentary/',
      domain: 'thegospelcoalition.org',
      snippet: 'Theological essays, biblical book overviews, and orthodox Christian scholarly commentaries.',
      category: 'commentary',
    });
  }

  // Return the top 4-5 diverse, domain-distinct sources
  return sources.slice(0, 5);
}
