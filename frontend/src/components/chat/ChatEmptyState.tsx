"use client";

import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Scroll, 
  Flame, 
  GraduationCap, 
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

// Curated book-specific insights for popular chapters
const CHAPTER_SPECIFIC_STARTERS: Record<string, { prompt: string; subtitle: string; icon: string }[]> = {
  'Genesis-1': [
    { prompt: "Explain the theological depth of 'Bara' (בָּרָא) in Genesis 1:1 and how creation ex nihilo reveals God's nature.", subtitle: "Hebrew Word Study", icon: "languages" },
    { prompt: "Trace the covenantal themes from Creation in Genesis 1 to the New Creation in Revelation 21-22.", subtitle: "Biblical Theology", icon: "cross" },
  ],
  'Exodus-3': [
    { prompt: "Explain the divine name 'I AM WHO I AM' (Yahweh) in Exodus 3:14 and its significance in John's Gospel.", subtitle: "Divine Names & Exegesis", icon: "scroll" },
    { prompt: "How did the Early Church Fathers see the Burning Bush as a type of the Incarnation?", subtitle: "Patristic Typology", icon: "patristic" },
  ],
  'Psalm-23': [
    { prompt: "Unpack the covenantal shepherd imagery in Psalm 23 and how Jesus fulfills it as the Good Shepherd in John 10.", subtitle: "Christological Fulfillment", icon: "cross" },
    { prompt: "Give a contemplative devotional reflection on 'He restores my soul' in Psalm 23:3.", subtitle: "Spiritual Formation", icon: "heart" },
  ],
  'Isaiah-53': [
    { prompt: "Exegete the Suffering Servant in Isaiah 53 with Hebrew word insights for 'chashab' and 'nāśā'.", subtitle: "Hebrew Exegesis", icon: "languages" },
    { prompt: "How do New Testament authors use Isaiah 53 to explain the substitutionary atonement of Christ?", subtitle: "Apostolic Hermeneutics", icon: "cross" },
  ],
  'Matthew-5': [
    { prompt: "Break down the Beatitudes in Matthew 5:3-12 from the perspective of the Kingdom of God.", subtitle: "Kingdom Theology", icon: "book" },
    { prompt: "How does Jesus fulfill, rather than abolish, the Law in Matthew 5:17-20?", subtitle: "Covenant Theology", icon: "flame" },
  ],
  'John-1': [
    { prompt: "Explain the theological depth of 'Logos' (Word) in John 1:1-14 against Greek philosophy and Jewish Wisdom.", subtitle: "Johannine Christology", icon: "languages" },
    { prompt: "How does John 1:14 ('and the Word became flesh and dwelt among us') echo Old Testament Tabernacle imagery?", subtitle: "Typology & Incarnation", icon: "cross" },
  ],
  'Romans-8': [
    { prompt: "Unpack the Golden Chain of Redemption in Romans 8:29-30 and the assurance of salvation.", subtitle: "Soteriology & Grace", icon: "flame" },
    { prompt: "What does Paul mean by the Spirit's 'groanings too deep for words' in Romans 8:26-27?", subtitle: "Pneumatology & Prayer", icon: "heart" },
  ],
  'Revelation-21': [
    { prompt: "Examine the New Jerusalem in Revelation 21 and the cosmic restoration of creation.", subtitle: "Eschatology", icon: "scroll" },
    { prompt: "How does Revelation 21-22 restore and consummate the tree and river of life from Genesis 2?", subtitle: "Canonical Unity", icon: "cross" },
  ],
};

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  activeBook = { name: 'Genesis', chapters: 50 },
  activeChapter = 1,
  translation = 'BSB',
  theologicalLens = 'canonical',
  onSelectPrompt,
  onSelectLens,
  isCompact = false,
}) => {
  const currentKey = `${activeBook.name}-${activeChapter}`;
  const chapterStarters = CHAPTER_SPECIFIC_STARTERS[currentKey] || [
    {
      prompt: `Provide an in-depth exegesis of ${activeBook.name} ${activeChapter} with historical context, literary structure, and theological significance.`,
      subtitle: `Chapter Overview · ${translation}`,
      icon: "book"
    },
    {
      prompt: `Conduct an original language word study for key Hebrew or Greek terms in ${activeBook.name} ${activeChapter}.`,
      subtitle: "Original Languages & Syntax",
      icon: "languages"
    }
  ];

  const currentLensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === theologicalLens) || THEOLOGICAL_LENS_OPTIONS[0];

  const thematicCards = [
    {
      title: "Original Languages",
      tagline: "Hebrew & Greek Lexicon",
      prompt: `Conduct a Greek/Hebrew root word study on the primary themes in ${activeBook.name} ${activeChapter} with Strong's numbers and etymological depth.`,
      icon: <Languages size={15} className="text-emerald-500" />,
      badge: "Lexicon"
    },
    {
      title: "Christ in Scripture",
      tagline: "Typology & Fulfillment",
      prompt: `How does ${activeBook.name} ${activeChapter} point forward to or find its fulfillment in Jesus Christ and the Gospel?`,
      icon: <Cross size={15} className="text-blue-500" />,
      badge: "Christology"
    },
    {
      title: "Historic Tradition",
      tagline: "Patristic & Reformers",
      prompt: `How did historical Christian theologians (Early Church Fathers and Reformers) understand the core message of ${activeBook.name} ${activeChapter}?`,
      icon: <Scroll size={15} className="text-purple-500" />,
      badge: "Church History"
    },
    {
      title: "Devotional Formation",
      tagline: "Contemplative Reflection",
      prompt: `Provide a prayerful, contemplative reflection on ${activeBook.name} ${activeChapter} with questions for self-examination and intimate communion with God.`,
      icon: <Heart size={15} className="text-amber-500" />,
      badge: "Prayer"
    },
    {
      title: "Sacred Artwork",
      tagline: "Biblical Visualizations",
      prompt: `Visualize a reverent, illuminated scene representing the key event in ${activeBook.name} ${activeChapter}.`,
      icon: <Palette size={15} className="text-[#c96442]" />,
      badge: "Visual Art"
    }
  ];

  return (
    <div className={`flex flex-col items-center justify-center w-full ${isCompact ? 'py-4 px-2' : 'py-8 px-4 sm:px-6 max-w-4xl mx-auto'} animate-in fade-in duration-300`}>
      {/* Scriptorium Crest */}
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shadow-inner relative group">
          <BookOpen size={24} className="sm:hidden" />
          <BookOpen size={28} className="hidden sm:block" />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface border border-accent/40 flex items-center justify-center text-accent shadow-sm">
            <Sparkles size={11} />
          </div>
        </div>
      </div>

      {/* Hero Title & Subtitle */}
      <h1 className={`${isCompact ? 'text-[17px]' : 'text-xl sm:text-2xl'} font-serif font-normal text-fg text-center mb-1.5`}>
        Theologica Study AI
      </h1>
      <p className={`${isCompact ? 'text-[12px]' : 'text-[13px] sm:text-[14px]'} text-muted text-center max-w-lg mb-5 sm:mb-6 leading-relaxed`}>
        Examine Scripture in original languages, explore historic theological traditions, and discover Christ throughout the biblical canon.
      </p>

      {/* Active Scripture & Lens Banner */}
      <div className={`w-full ${isCompact ? 'max-w-full' : 'max-w-xl'} mb-6 p-2.5 sm:p-3 rounded-xl bg-surface/70 border border-border-soft/70 shadow-sm flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentLensMeta.accentColor }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] sm:text-[13px] font-medium text-fg truncate">
                {activeBook.name} {activeChapter}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded">
                {translation}
              </span>
              <span className="text-[10px] text-muted hidden xs:inline">•</span>
              <span className="text-[11px] font-medium truncate" style={{ color: currentLensMeta.accentColor }}>
                {currentLensMeta.name} Lens
              </span>
            </div>
            <p className="text-[11px] text-muted truncate mt-0.5">
              {currentLensMeta.tagline}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectPrompt(`Please provide a comprehensive study of ${activeBook.name} ${activeChapter} (${translation}). Include original language root words, theological themes, and historical context.`)}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 hover:bg-accent text-accent hover:text-white text-[11px] font-medium transition-all cursor-pointer shadow-xs"
        >
          <span>Study Chapter</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Context-Aware Dynamic Starters */}
      <div className="w-full mb-5">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <Sparkles size={12} className="text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Suggested for {activeBook.name} {activeChapter}
          </span>
        </div>

        <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-2.5'}`}>
          {chapterStarters.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group text-left p-3 rounded-xl bg-surface/60 hover:bg-surface border border-border-soft/60 hover:border-accent/50 transition-all cursor-pointer shadow-xs hover:shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold tracking-wide uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                  {item.subtitle}
                </span>
                <ArrowRight size={12} className="text-meta group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[12px] sm:text-[13px] text-fg font-medium line-clamp-2 leading-snug">
                "{item.prompt}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Thematic Deep Dives */}
      {!isCompact && (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Compass size={12} className="text-muted" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Thematic Exploration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {thematicCards.slice(0, 3).map((card, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(card.prompt)}
                className="group text-left p-3 rounded-xl bg-surface/40 hover:bg-surface border border-border-soft/50 hover:border-accent/40 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-surface-hover/80 text-fg">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-medium text-meta group-hover:text-muted transition-colors">
                      {card.badge}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-semibold text-fg mb-0.5 group-hover:text-accent transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
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
