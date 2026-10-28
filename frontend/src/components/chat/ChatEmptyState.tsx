"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Scroll, 
  Heart, 
  Palette, 
  Languages, 
  Cross,
  Compass,
  ArrowRight
} from 'lucide-react';
import { TheologicalLensType, THEOLOGICAL_LENS_OPTIONS } from './TheologicalLensSelector';

interface ChatEmptyStateProps {
  activeBook?: { name: string; chapters: number };
  activeChapter?: number;
  translation?: string;
  theologicalLens?: TheologicalLensType;
  onSelectPrompt: (promptText: string) => void;
  onSelectLens?: (lens: TheologicalLensType) => void;
  isCompact?: boolean;
}

interface QuestionItem {
  prompt: string;
  subtitle: string;
  icon?: string;
}

// Curated chapter-specific questions for key biblical chapters
const CHAPTER_SPECIFIC_STARTERS: Record<string, QuestionItem[]> = {
  'Genesis-1': [
    { prompt: "Explain the theological depth of 'Bara' (בָּרָא) in Genesis 1:1 and how creation ex nihilo reveals God's nature.", subtitle: "Hebrew Word Study" },
    { prompt: "Trace the covenantal themes from Creation in Genesis 1 to the New Creation in Revelation 21–22.", subtitle: "Biblical Theology" },
    { prompt: "What does it mean that humanity is created in the 'Image of God' (Tselem Elohim) in Genesis 1:26–27?", subtitle: "Theological Anthropology" },
    { prompt: "How does the seven-day structure of Genesis 1 mirror an ancient Near Eastern cosmic temple inauguration?", subtitle: "Historical Context" },
  ],
  'Genesis-3': [
    { prompt: "Unpack the Protoevangelium in Genesis 3:15 as the first Messianic prophecy of the Gospel.", subtitle: "Messianic Prophecy" },
    { prompt: "How does God's garment of skins in Genesis 3:21 prefigure substitutionary atonement?", subtitle: "Typology & Grace" },
    { prompt: "Analyze the anatomy of temptation in Genesis 3:1–6 and compare it with Jesus' temptation in the wilderness.", subtitle: "Canonical Parallels" },
  ],
  'Genesis-12': [
    { prompt: "How does God's covenant promise to Abraham in Genesis 12:1–3 shape the entire storyline of Scripture?", subtitle: "Abrahamic Covenant" },
    { prompt: "How does Paul in Galatians 3 interpret the promise that 'in you all families of the earth shall be blessed'?", subtitle: "Apostolic Hermeneutics" },
  ],
  'Genesis-22': [
    { prompt: "Trace the typological parallels between the Binding of Isaac (Akedah) on Mount Moriah and Calvary.", subtitle: "Christological Typology" },
    { prompt: "Explore the meaning of 'YHWH Jireh' (The Lord Will Provide) in Genesis 22:14.", subtitle: "Divine Names" },
  ],
  'Exodus-3': [
    { prompt: "Explain the divine name 'I AM WHO I AM' (Yahweh) in Exodus 3:14 and Jesus' 'I AM' declarations in John.", subtitle: "Divine Names & Exegesis" },
    { prompt: "How did the Early Church Fathers see the Burning Bush as a type of the Incarnation?", subtitle: "Patristic Typology" },
    { prompt: "Why does God reveal Himself as the God of Abraham, Isaac, and Jacob from the midst of affliction?", subtitle: "Covenant Faithfulness" },
  ],
  'Exodus-12': [
    { prompt: "Compare the Passover Lamb of Exodus 12 with Christ as our Passover Lamb in 1 Corinthians 5:7 and John 19.", subtitle: "Passover Typology" },
    { prompt: "What is the theological significance of the blood on the doorposts and the Feast of Unleavened Bread?", subtitle: "Redemption & Liturgy" },
  ],
  'Exodus-20': [
    { prompt: "Why do the Ten Commandments begin with grace ('I brought you out of Egypt') before giving the Law?", subtitle: "Grace & Law" },
    { prompt: "How does Jesus deepen the moral heart of the Decalogue in the Sermon on the Mount?", subtitle: "Kingdom Ethics" },
  ],
  'Psalms-1': [
    { prompt: "Examine the Hebrew word 'Ashrei' (Blessed) and what it means to delight in and meditate (hagah) on God's Torah.", subtitle: "Hebrew Wisdom" },
    { prompt: "How does the contrast between the tree planted by streams of water and chaff frame the entire Psalter?", subtitle: "Literary Structure" },
  ],
  'Psalm-1': [
    { prompt: "Examine the Hebrew word 'Ashrei' (Blessed) and what it means to delight in and meditate (hagah) on God's Torah.", subtitle: "Hebrew Wisdom" },
    { prompt: "How does the contrast between the tree planted by streams of water and chaff frame the entire Psalter?", subtitle: "Literary Structure" },
  ],
  'Psalms-22': [
    { prompt: "Trace the prophetic fulfillments of Psalm 22 in the crucifixion narratives of the four Gospels.", subtitle: "Messianic Prophecy" },
    { prompt: "How does Psalm 22 move from the cry of dereliction ('Why have You forsaken me?') to global praise?", subtitle: "Lament to Triumph" },
  ],
  'Psalm-22': [
    { prompt: "Trace the prophetic fulfillments of Psalm 22 in the crucifixion narratives of the four Gospels.", subtitle: "Messianic Prophecy" },
    { prompt: "How does Psalm 22 move from the cry of dereliction ('Why have You forsaken me?') to global praise?", subtitle: "Lament to Triumph" },
  ],
  'Psalms-23': [
    { prompt: "Explain the shepherd imagery in Psalm 23 and how Jesus fulfills it as the Good Shepherd in John 10.", subtitle: "Prophecy & Fulfillment" },
    { prompt: "Give a contemplative devotional reflection on 'He restores my soul' and 'Hesed' (steadfast love) in Psalm 23.", subtitle: "Spiritual Formation" },
    { prompt: "How does Psalm 23 transition from the Shepherd in the valley to the Host at the banquet table?", subtitle: "Poetic Imagery" },
  ],
  'Psalm-23': [
    { prompt: "Explain the shepherd imagery in Psalm 23 and how Jesus fulfills it as the Good Shepherd in John 10.", subtitle: "Prophecy & Fulfillment" },
    { prompt: "Give a contemplative devotional reflection on 'He restores my soul' and 'Hesed' (steadfast love) in Psalm 23.", subtitle: "Spiritual Formation" },
    { prompt: "How does Psalm 23 transition from the Shepherd in the valley to the Host at the banquet table?", subtitle: "Poetic Imagery" },
  ],
  'Psalms-51': [
    { prompt: "Study the Hebrew terms for sin, iniquity, and transgression in Psalm 51 and the meaning of 'bara' (create a clean heart).", subtitle: "Hebrew Word Study" },
    { prompt: "What distinguishes true biblical repentance in Psalm 51 from mere worldly regret?", subtitle: "Penitential Theology" },
  ],
  'Isaiah-6': [
    { prompt: "Analyze Isaiah's throne room vision in Isaiah 6 and why John 12:41 says Isaiah saw Christ's glory.", subtitle: "Christophany & Glory" },
    { prompt: "What is the significance of the thrice-holy ('Kadosh, Kadosh, Kadosh') song of the seraphim and the live coal?", subtitle: "Holiness & Cleansing" },
  ],
  'Isaiah-53': [
    { prompt: "Exegete the Suffering Servant in Isaiah 53 with Hebrew word insights for 'chashab' and 'nāśā'.", subtitle: "Hebrew Exegesis" },
    { prompt: "How do New Testament authors use Isaiah 53 to explain the substitutionary atonement of Christ?", subtitle: "Apostolic Hermeneutics" },
    { prompt: "Why is the Servant's exaltation directly linked to His willingness to pour out His soul to death?", subtitle: "Servant Christology" },
  ],
  'Matthew-5': [
    { prompt: "Break down the Beatitudes in Matthew 5:3–12 from the perspective of the upside-down Kingdom of God.", subtitle: "Kingdom Theology" },
    { prompt: "How does Jesus fulfill, rather than abolish, the Law and the Prophets in Matthew 5:17–20?", subtitle: "Covenant Theology" },
    { prompt: "What does it mean to be 'salt of the earth' and 'light of the world' in the context of Israel's calling?", subtitle: "Missional Identity" },
  ],
  'John-1': [
    { prompt: "Explain the theological depth of 'Logos' (Word) in John 1:1–14 against Greek philosophy and Jewish Wisdom.", subtitle: "Johannine Christology" },
    { prompt: "How does John 1:14 ('the Word became flesh and tabernacled among us') echo Old Testament Shekinah glory?", subtitle: "Typology & Incarnation" },
    { prompt: "Why does John the Baptist declare Jesus 'the Lamb of God, who takes away the sin of the world'?", subtitle: "Atonement & Witness" },
  ],
  'John-3': [
    { prompt: "Unpack the Greek double meaning of 'anōthen' (born again / born from above) in Jesus' dialogue with Nicodemus.", subtitle: "Greek Word Study" },
    { prompt: "How does the bronze serpent of Numbers 21 illuminate the lifting up of the Son of Man in John 3:14–16?", subtitle: "Biblical Typology" },
  ],
  'Romans-8': [
    { prompt: "Explain the Golden Chain of Redemption in Romans 8:29–30 and the believer's assurance of salvation.", subtitle: "Salvation & Grace" },
    { prompt: "What does Paul mean by the Spirit's 'groanings too deep for words' alongside the groaning of creation?", subtitle: "Pneumatology & Prayer" },
    { prompt: "How does 'no condemnation in Christ Jesus' (Romans 8:1) bookend with 'no separation' (Romans 8:38–39)?", subtitle: "Rhetorical Structure" },
  ],
  'Hebrews-11': [
    { prompt: "Examine the definition of faith ('hypostasis' and 'elenchos') in Hebrews 11:1 and how the cloud of witnesses points to Christ.", subtitle: "Greek Exegesis" },
    { prompt: "Why does Hebrews 11 say the Old Testament saints 'did not receive what was promised, so that apart from us they should not be made perfect'?", subtitle: "Redemptive History" },
  ],
  'Revelation-21': [
    { prompt: "Examine the New Jerusalem in Revelation 21 and why the city is shaped as a perfect cube like the Holy of Holies.", subtitle: "Eschatology & Temple" },
    { prompt: "How does Revelation 21–22 restore and surpass the Edenic garden, tree, and river of life from Genesis 2?", subtitle: "Canonical Unity" },
  ],
};

// Book genre classification for rich, non-repetitive contextual prompts
function getBookGenre(bookName: string): 'pentateuch' | 'historical' | 'wisdom' | 'prophets' | 'gospels' | 'pauline' | 'general' | 'apocalyptic' {
  const b = bookName.toLowerCase();
  if (['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'].includes(b)) return 'pentateuch';
  if (['joshua', 'judges', 'ruth', '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther'].includes(b)) return 'historical';
  if (['job', 'psalms', 'psalm', 'proverbs', 'ecclesiastes', 'song of solomon'].includes(b)) return 'wisdom';
  if (['isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'].includes(b)) return 'prophets';
  if (['matthew', 'mark', 'luke', 'john', 'acts'].includes(b)) return 'gospels';
  if (['romans', '1 corinthians', '2 corinthians', 'galatians', 'ephesians', 'philippians', 'colossians', '1 thessalonians', '2 thessalonians', '1 timothy', '2 timothy', 'titus', 'philemon'].includes(b)) return 'pauline';
  if (b === 'revelation') return 'apocalyptic';
  return 'general';
}

function buildDynamicQuestionPool(bookName: string, chapter: number, translation: string, lensName: string): QuestionItem[] {
  const ref = `${bookName} ${chapter}`;
  const genre = getBookGenre(bookName);

  const genrePools: Record<string, QuestionItem[]> = {
    pentateuch: [
      { prompt: `How does ${ref} advance God's covenant promises and reveal His holiness and mercy?`, subtitle: "Covenant Theology" },
      { prompt: `What shadows, sacrifices, or types in ${ref} point forward to the person and work of Jesus Christ?`, subtitle: "Christological Typology" },
      { prompt: `Examine the key Hebrew root words and idioms in ${ref} with Strong's numbers and ancient Near Eastern background.`, subtitle: "Hebrew Lexicon" },
      { prompt: `How do the New Testament apostles quote or allude to ${ref} in their teaching on the Gospel?`, subtitle: "Canonical Echoes" },
      { prompt: `What does ${ref} teach us about walking in reverence, faith, and obedience before the Lord today?`, subtitle: "Spiritual Formation" },
      { prompt: `How did the Early Church Fathers and Reformers interpret the narrative and laws of ${ref}?`, subtitle: "Historical Exegesis" },
      { prompt: `Analyze the literary structure and narrative tension of ${ref} within the book of ${bookName}.`, subtitle: "Literary Analysis" },
      { prompt: `What attributes of God's character—justice, patience, sovereignty, or steadfast love (Hesed)—shine brightest in ${ref}?`, subtitle: "Doctrine of God" },
    ],
    historical: [
      { prompt: `How does God's unseen providence govern the human decisions and events recorded in ${ref}?`, subtitle: "Providence & History" },
      { prompt: `How does ${ref} point to our need for the true and greater King, the Son of David, Jesus Christ?`, subtitle: "Redemptive History" },
      { prompt: `Unpack the historical, geographical, and archaeological context behind the events of ${ref}.`, subtitle: "Historical Context" },
      { prompt: `What key Hebrew terms in ${ref} illuminate the spiritual turning points of this narrative?`, subtitle: "Hebrew Word Study" },
      { prompt: `Contrast the faithfulness or failure of the leaders in ${ref} and draw lessons for Christian character today.`, subtitle: "Biblical Leadership" },
      { prompt: `How does ${ref} reflect the blessings and warnings of the Deuteronomic covenant in Israel's life?`, subtitle: "Covenant Faithfulness" },
      { prompt: `What prayers, vows, or speeches in ${ref} reveal the heart of true reliance on God in crisis?`, subtitle: "Prayer & Trust" },
      { prompt: `Explore ${ref} through the ${lensName} lens: how has the historic Church read this passage?`, subtitle: `${lensName} Perspective` },
    ],
    wisdom: [
      { prompt: `Analyze the Hebrew poetic parallelism, metaphors, and emotional movement in ${ref}.`, subtitle: "Hebrew Poetry" },
      { prompt: `How can we pray ${ref} with and through Jesus Christ, who embodies true Wisdom and the Psalms?`, subtitle: "Christ in Wisdom" },
      { prompt: `Explore the richest Hebrew words in ${ref} (such as Hesed, Hokhmah, Shalom, or Yirah) and their nuances.`, subtitle: "Hebrew Lexicon" },
      { prompt: `How does ${ref} speak to seasons of suffering, doubt, joy, or waiting on the Lord?`, subtitle: "Pastoral Comfort" },
      { prompt: `Guide me through a slow, contemplative Lectio Divina reflection on the key verses of ${ref}.`, subtitle: "Contemplative Prayer" },
      { prompt: `How did Augustine, Spurgeon, and the Reformers preach and apply ${ref} to the believer's soul?`, subtitle: "Classic Commentaries" },
      { prompt: `What practical wisdom does ${ref} offer for guarding the heart, speech, and daily walk with God?`, subtitle: "Practical Wisdom" },
      { prompt: `How does ${ref} contrast the fleeting nature of the world with eternal refuge in God?`, subtitle: "Eternal Perspective" },
    ],
    prophets: [
      { prompt: `What was the historical crisis facing Israel or Judah when the prophetic oracle of ${ref} was delivered?`, subtitle: "Prophetic Context" },
      { prompt: `How does ${ref} find its ultimate Messianic fulfillment in Jesus' first and second comings?`, subtitle: "Prophecy & Fulfillment" },
      { prompt: `Examine the vivid Hebrew imagery, wordplay, and covenant lawsuit motifs in ${ref}.`, subtitle: "Hebrew Poetics" },
      { prompt: `How does ${ref} weave together divine judgment against sin with breathtaking promises of restoration?`, subtitle: "Judgment & Hope" },
      { prompt: `Where is ${ref} quoted or echoed in the Gospels, Paul's letters, or the book of Revelation?`, subtitle: "New Testament Use" },
      { prompt: `What does ${ref} reveal about true heart worship versus hollow religious formalism?`, subtitle: "True Worship" },
      { prompt: `How did Jerome, Cyril, Calvin, and historic commentators interpret the visions and promises of ${ref}?`, subtitle: "Church Tradition" },
      { prompt: `How does the message of ${ref} call the Church to holiness, justice, and steadfast hope today?`, subtitle: "Modern Application" },
    ],
    gospels: [
      { prompt: `What does ${ref} reveal about the identity, authority, and compassionate heart of Jesus Christ?`, subtitle: "Christology" },
      { prompt: `Examine the key Greek words and verb tenses in ${ref} and what they add to our understanding (${translation}).`, subtitle: "Greek Exegesis" },
      { prompt: `What Old Testament Scriptures, prophecies, or festivals are being echoed or fulfilled in ${ref}?`, subtitle: "OT Fulfillment" },
      { prompt: `How does ${ref} challenge our assumptions about the Kingdom of God and the cost of discipleship?`, subtitle: "Kingdom Discipleship" },
      { prompt: `Compare ${ref} with its parallel accounts across the Gospels to see the author's unique theological emphasis.`, subtitle: "Gospel Harmonies" },
      { prompt: `What first-century Jewish and Greco-Roman cultural details bring the scene in ${ref} to life?`, subtitle: "Cultural Background" },
      { prompt: `How did Chrysostom, Augustine, and the Reformers expound the teaching and miracles in ${ref}?`, subtitle: "Patristic & Reformed" },
      { prompt: `Lead me in a personal, prayerful meditation placing myself in the scene of ${ref} before Jesus.`, subtitle: "Devotional Reflection" },
    ],
    pauline: [
      { prompt: `Trace the logical flow and theological argument of ${ref}—how do the 'therefores' and clauses connect?`, subtitle: "Argument & Discourse" },
      { prompt: `Unpack the key Greek theological terms in ${ref} (with Strong's numbers) and their rich meaning.`, subtitle: "Greek Lexicon" },
      { prompt: `How does ${ref} ground Christian living (imperatives) in what God has already accomplished in Christ (indicatives)?`, subtitle: "Grace & Sanctification" },
      { prompt: `What specific struggles in the early church prompted the apostolic instruction in ${ref}?`, subtitle: "Historical Occasion" },
      { prompt: `How does ${ref} illuminate our union with Christ, the work of the Holy Spirit, and the life of the Church?`, subtitle: "Union with Christ" },
      { prompt: `Where does ${ref} draw from Old Testament Scripture to prove the unity of God's redemptive plan?`, subtitle: "Paul's Hermeneutics" },
      { prompt: `How have historic traditions (${lensName} and broader orthodoxy) interpreted the doctrines in ${ref}?`, subtitle: "Historical Theology" },
      { prompt: `How can I apply the gospel truths of ${ref} to renew my mind, prayer life, and daily relationships?`, subtitle: "Personal Application" },
    ],
    general: [
      { prompt: `How does ${ref} encourage believers to stand firm in faith and holiness amid trials and cultural pressure?`, subtitle: "Perseverance & Hope" },
      { prompt: `Examine the Greek vocabulary and rhetorical imagery in ${ref} and how it deepens the passage.`, subtitle: "Greek Word Study" },
      { prompt: `How does ${ref} connect Old Covenant priesthood, wisdom, or promises to their fulfillment in Christ?`, subtitle: "Canonical Theology" },
      { prompt: `What does ${ref} teach about the relationship between genuine saving faith, love, and godly action?`, subtitle: "Faith & Practice" },
      { prompt: `What historical situation facing the scattered first-century churches shapes the message of ${ref}?`, subtitle: "Early Church Context" },
      { prompt: `How did the Early Church Fathers and Reformers apply the pastoral exhortations of ${ref}?`, subtitle: "Historic Commentary" },
      { prompt: `What warnings and promises in ${ref} help guard the heart against spiritual drift today?`, subtitle: "Spiritual Vigilance" },
      { prompt: `Provide a verse-by-verse exegesis of ${ref} highlighting its central theological themes.`, subtitle: `Chapter Exegesis · ${translation}` },
    ],
    apocalyptic: [
      { prompt: `Decode the apocalyptic symbols and Old Testament allusions (Daniel, Ezekiel, Isaiah) woven into ${ref}.`, subtitle: "Apocalyptic Imagery" },
      { prompt: `How does the vision of the exalted Christ and the throne of God in ${ref} fuel worship and courage?`, subtitle: "Throne Room Theology" },
      { prompt: `Compare the historicist, idealist, preterist, and futurist perspectives on the imagery of ${ref}.`, subtitle: "Eschatological Views" },
      { prompt: `Examine the key Greek terms and symbolic numbers in ${ref} against first-century Roman imperial cult context.`, subtitle: "Greek & Historical" },
      { prompt: `How does ${ref} call the Church to patient endurance ('hypomonē') and faithful witness to the Lamb?`, subtitle: "Faithful Witness" },
      { prompt: `How does ${ref} advance the grand biblical arc from Creation to New Creation?`, subtitle: "Cosmic Redemption" },
    ],
  };

  const specific = CHAPTER_SPECIFIC_STARTERS[`${bookName}-${chapter}`] || [];
  const genreItems = genrePools[genre] || genrePools.general;

  // Deterministic rotation based on book name + chapter so each chapter naturally starts with a unique slice
  const seed = bookName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + chapter * 3;
  const rotatedGenre: QuestionItem[] = [];
  for (let i = 0; i < genreItems.length; i++) {
    rotatedGenre.push(genreItems[(seed + i) % genreItems.length]);
  }

  return [...specific, ...rotatedGenre];
}

// Reuse each passage's offset within one page load so multiple mounted chat panels
// show the same set, including when React repeats an effect in development.
const questionOffsets = new Map<string, number>();
const QUESTION_CYCLE_KEY = 'theologica_question_cycle_v1';

function getQuestionOffset(key: string, count: number): number {
  const current = questionOffsets.get(key);
  if (current !== undefined) return current % count;
  let offset = Math.floor(Math.random() * count);
  try {
    const stored = JSON.parse(localStorage.getItem(QUESTION_CYCLE_KEY) || '{}');
    if (typeof stored[key] === 'number' && Number.isFinite(stored[key])) {
      offset = ((stored[key] % count) + count) % count;
    }
    stored[key] = (offset + 2) % count;
    localStorage.setItem(QUESTION_CYCLE_KEY, JSON.stringify(stored));
  } catch {
    // Storage can be unavailable in private browsing; randomize in that case.
  }
  questionOffsets.set(key, offset);
  return offset;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  activeBook = { name: 'Genesis', chapters: 50 },
  activeChapter = 1,
  translation = 'BSB',
  theologicalLens = 'canonical',
  onSelectPrompt,
  isCompact = false,
}) => {
  const currentLensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === theologicalLens) || THEOLOGICAL_LENS_OPTIONS[0];

  const questionPool = useMemo(
    () => buildDynamicQuestionPool(activeBook.name, activeChapter, translation, currentLensMeta.name),
    [activeBook.name, activeChapter, translation, currentLensMeta.name]
  );

  const [visibleQuestions, setVisibleQuestions] = useState<QuestionItem[]>(() => questionPool.slice(0, 4));

  useEffect(() => {
    if (questionPool.length === 0) return;
    const key = `${activeBook.name}:${activeChapter}:${translation}:${currentLensMeta.id}`;
    const offset = getQuestionOffset(key, questionPool.length);
    setVisibleQuestions(Array.from({ length: Math.min(4, questionPool.length) }, (_, index) =>
      questionPool[(offset + index) % questionPool.length]
    ));
  }, [questionPool, activeBook.name, activeChapter, translation, currentLensMeta.id]);

  const thematicCards = [
    {
      title: "Original Languages",
      tagline: "Hebrew & Greek Lexicon",
      prompt: `Conduct a Greek/Hebrew root word study on the primary themes in ${activeBook.name} ${activeChapter} with Strong's numbers and etymological depth.`,
      icon: <Languages size={14} className="text-emerald-500" />,
      badge: "Lexicon"
    },
    {
      title: "Christ in Scripture",
      tagline: "Typology & Fulfillment",
      prompt: `How does ${activeBook.name} ${activeChapter} point forward to or find its fulfillment in Jesus Christ and the Gospel?`,
      icon: <Cross size={14} className="text-blue-500" />,
      badge: "Christology"
    },
    {
      title: "Historic Tradition",
      tagline: "Patristic & Reformers",
      prompt: `How did historical Christian theologians (Early Church Fathers and Reformers) understand the core message of ${activeBook.name} ${activeChapter}?`,
      icon: <Scroll size={14} className="text-purple-500" />,
      badge: "Church History"
    },
    {
      title: "Devotional Formation",
      tagline: "Contemplative Reflection",
      prompt: `Provide a prayerful, contemplative reflection on ${activeBook.name} ${activeChapter} with questions for self-examination and intimate communion with God.`,
      icon: <Heart size={14} className="text-amber-500" />,
      badge: "Prayer"
    },
    {
      title: "Sacred Artwork",
      tagline: "Biblical Visualizations",
      prompt: `Visualize a reverent, illuminated scene representing the key event in ${activeBook.name} ${activeChapter}.`,
      icon: <Palette size={14} className="text-[#c96442]" />,
      badge: "Visual Art"
    }
  ];

  return (
    <div className={`flex flex-col items-center justify-center w-full select-none my-auto ${isCompact ? 'py-1 px-1' : 'py-1 sm:py-4 px-1.5 sm:px-6 max-w-4xl mx-auto'} animate-in fade-in duration-300`}>
      {/* Scriptorium Crest & Hero Title */}
      <div className="flex flex-col items-center mb-2 sm:mb-4">
        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shadow-inner relative mb-1 sm:mb-2.5">
          <BookOpen size={16} className="sm:hidden" />
          <BookOpen size={22} className="hidden sm:block" />
          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-surface border border-accent/40 flex items-center justify-center text-accent shadow-2xs">
            <Sparkles size={7} className="sm:hidden" />
            <Sparkles size={10} className="hidden sm:block" />
          </div>
        </div>

        <h1 className="text-[15px] sm:text-xl font-serif font-medium text-fg text-center leading-tight">
          Theologica Study AI
        </h1>
        <p className="text-[10.5px] sm:text-[13px] text-muted text-center max-w-xs sm:max-w-md mt-0.5 leading-snug">
          Original languages, historic theology, and Christ-centered exegesis.
        </p>
      </div>

      {/* Active Scripture & Study Chapter Action Bar */}
      <div className="w-full max-w-md sm:max-w-xl mb-2 sm:mb-4 p-2 sm:p-2.5 rounded-xl bg-surface/50 border border-border/50 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentLensMeta.accentColor }} />
          <div className="min-w-0 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-[11.5px] sm:text-[13px] font-semibold text-fg truncate">
              {activeBook.name} {activeChapter}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded">
              {translation}
            </span>
            <span className="text-[9.5px] sm:text-[11px] font-medium truncate" style={{ color: currentLensMeta.accentColor }}>
              · {currentLensMeta.name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectPrompt(`Please provide a comprehensive study of ${activeBook.name} ${activeChapter} (${translation}). Include original language root words, theological themes, and historical context.`)}
          className="shrink-0 inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-accent/15 hover:bg-accent text-accent hover:text-white text-[10.5px] sm:text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <span>Study Chapter</span>
          <ArrowRight size={11} />
        </button>
      </div>

      {/* Context-Aware Dynamic Starters */}
      <div className="w-full max-w-md sm:max-w-xl mb-0.5 sm:mb-4">
        <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 px-1">
          <Sparkles size={11} className="text-accent" />
          <span className="text-[9.5px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted">
            Suggested Questions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          {visibleQuestions.map((item, idx) => (
            <button
              key={`${item.prompt}-${idx}`}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              title={item.prompt}
              className={`${idx >= 2 ? 'hidden sm:flex' : 'flex'} group text-left p-2 sm:p-2.5 rounded-xl bg-surface/35 hover:bg-surface border border-border/40 hover:border-accent/40 transition-all cursor-pointer items-center justify-between gap-1.5 sm:gap-2 active:scale-[0.99]`}
            >
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[8.5px] sm:text-[9px] font-semibold tracking-wide uppercase text-accent bg-accent/10 px-1.5 py-0.2 rounded mb-0.5">
                  {item.subtitle}
                </span>
                <p className="text-[11px] sm:text-[12px] text-fg font-medium line-clamp-1 sm:line-clamp-2 leading-snug">
                  &ldquo;{item.prompt}&rdquo;
                </p>
              </div>
              <ArrowRight size={12} className="text-muted/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Study Topics (Desktop only when full view) */}
      {!isCompact && (
        <div className="chat-study-lenses hidden lg:block w-full max-w-xl">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Compass size={12} className="text-muted" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Explore Study Lenses
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {thematicCards.slice(0, 3).map((card, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(card.prompt)}
                className="group text-left p-2.5 rounded-xl bg-surface/30 hover:bg-surface border border-border/40 hover:border-accent/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="p-1 rounded-lg bg-surface-hover/80 text-fg">
                      {card.icon}
                    </div>
                    <span className="text-[9px] font-medium text-meta group-hover:text-muted transition-colors">
                      {card.badge}
                    </span>
                  </div>
                  <h4 className="text-[12px] font-semibold text-fg group-hover:text-accent transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-[10px] text-muted line-clamp-1 leading-relaxed">
                    {card.tagline}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
