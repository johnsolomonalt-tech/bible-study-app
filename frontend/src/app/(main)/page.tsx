"use client";
const API_URL = '';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth, UserButton, SignIn, SignInButton } from '@clerk/nextjs';
import { Send, Plus, Layout, Edit, Sparkles, Target, Check, CheckCheck, Copy, ChevronRight, ChevronLeft, ChevronDown, Trash2, Volume2, VolumeX, Sun, Moon, BookOpen, GripVertical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen, MessageSquare, MessageSquarePlus, X, Paperclip, Image as ImageIcon , Settings, Workflow, ShieldCheck, Heart, Layers, Languages, MoreVertical, MoreHorizontal, Search, BookMarked, Bookmark, ArrowLeftRight, Columns2, Quote, Compass, ArrowRight, Square, BrainCircuit, FileText, UploadCloud, Menu, SlidersHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { getDevotionalForDay, fetchDevotionalForDay, DevotionalEntry, getDevotionalBody } from '../../lib/devotionals';
import PWAInstallPrompt from '../PWAInstallPrompt';
import { CookieConsentPrompt } from '@/components/bible/CookieConsentPrompt';
import { NodeCategory } from '@/types/canvas';
import { ScriptureBacklinksDrawer } from '@/components/bible/ScriptureBacklinksDrawer';
import { InterlinearHoverCard } from '@/components/bible/InterlinearHoverCard';
import { InterlinearModeRibbon } from '@/components/bible/InterlinearModeRibbon';
import { findInterlinearWord, getOrGenerateInterlinearWord, fetchInterlinearWord, getVerseInterlinearTokens, preloadChapterLexicon, CLIENT_LEXICON_CACHE, STOPWORDS, InterlinearWord } from '@/lib/interlinearData';
import { getScriptureBacklinks, BacklinksResult } from '@/lib/backlinks';
import { TheologicalLensSelector, TheologicalLensType, THEOLOGICAL_LENS_OPTIONS } from '@/components/chat/TheologicalLensSelector';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatSlashCommands, SLASH_COMMANDS, SlashCommand } from '@/components/chat/ChatSlashCommands';
import { ChatFollowUps } from '@/components/chat/ChatFollowUps';
import { ChatSourceTracker } from '@/components/chat/ChatSourceTracker';
import { ChatSourceItem } from '@/lib/chatSources';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  linkifyBibleReferences, 
  parseVerseReference, 
  createMarkdownComponents, 
  VerseClickHandler,
  BIBLE_VERSE_REGEX
} from '@/lib/bibleReferences';
import { TranslationSelector } from '@/components/bible/TranslationSelector';
import { getPassage, getStrongsPassage } from '@/lib/bibleProvider';
import { AVAILABLE_TRANSLATIONS } from '@/types/bible';
import { parseVerseFootnote, getCleanScriptureText } from '@/lib/verseParser';
import { findCanonicalBook } from '@/lib/bibleCanon';
import { 
  getPreference, 
  getBooleanPreference,
  setPreference, 
  flushPreferences, 
  removePreference, 
  PREF_KEYS, 
  VALID_TABS, 
  VALID_MOBILE_VIEWS,
  ValidTab,
  ValidMobileView,
  ReaderFontFamily,
  ReaderFontSize,
  ReaderLineHeight,
  ReaderLayout
} from '@/lib/appPreferences';
import { initSessionTracking, trackClientEvent } from '@/lib/analyticsClient';
import type { NoteItem } from '@/components/notes/NotesWorkspace';
import { StreakPopover } from '@/components/bible/StreakPopover';
import { TrackerStreakHero } from '@/components/bible/TrackerStreakHero';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { ExpandableSyncBanner } from '@/components/chat/ExpandableSyncBanner';

// Dynamically imported heavy modules to keep the primary bundle featherweight
const CanvasBoard = dynamic(
  () => import('@/components/canvas/CanvasBoard').then((m) => m.CanvasBoard),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-bg text-fg">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
        <span className="text-sm font-medium text-meta">Loading Canvas workspace...</span>
      </div>
    ),
  }
);

const NotesWorkspace = dynamic(
  () => import('@/components/notes/NotesWorkspace').then((m) => m.NotesWorkspace),
  {
    ssr: false,
    loading: () => null,
  }
);

const SettingsModal = dynamic(
  () => import('@/components/settings/SettingsModal').then((m) => m.SettingsModal),
  { ssr: false }
);

const DailyVerseModal = dynamic(
  () => import('@/components/bible/DailyVerseModal').then((m) => m.DailyVerseModal),
  { ssr: false }
);

const LectioDivinaModal = dynamic(
  () => import('@/components/bible/LectioDivinaModal').then((m) => m.LectioDivinaModal),
  { ssr: false }
);

const VerseInterlinearModal = dynamic(
  () => import('@/components/bible/VerseInterlinearModal').then((m) => m.VerseInterlinearModal),
  { ssr: false }
);
import { 
  recordHabitActivity, 
  unmarkChapterActivity,
  registerStreakSyncCallback 
} from '@/lib/streakService';
import { 
  pullStreakFromAccount, 
  queueStreakPush 
} from '@/lib/streakSyncClient';

// --- All 66 Books ---
const otStr = "Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,1 Samuel:31,2 Samuel:24,1 Kings:22,2 Kings:25,1 Chronicles:29,2 Chronicles:36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,Song of Solomon:8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4";
const ntStr = "Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,1 Corinthians:16,2 Corinthians:13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,1 Thessalonians:5,2 Thessalonians:3,1 Timothy:6,2 Timothy:4,Titus:3,Philemon:1,Hebrews:13,James:5,1 Peter:5,2 Peter:3,1 John:5,2 John:1,3 John:1,Jude:1,Revelation:22";

const OT_BOOKS = otStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const NT_BOOKS = ntStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// Canonical book name equality helper (handles aliases, codes, case differences)
const isSameBook = (b1?: string, b2?: string): boolean => {
  if (!b1 || !b2) return false;
  const s1 = b1.toLowerCase().trim();
  const s2 = b2.toLowerCase().trim();
  if (s1 === s2) return true;
  const c1 = findCanonicalBook(b1);
  const c2 = findCanonicalBook(b2);
  if (c1 && c2) return c1.number === c2.number;
  return false;
};

const markdownComponents = createMarkdownComponents();

const userMarkdownComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-[14px] text-fg">{children}</p>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-[3px] border-accent/60 bg-accent/10 py-2 px-3 my-2 italic rounded-r-lg shadow-sm text-fg-hover text-[13px]">
      {children}
    </blockquote>
  ),
  strong: ({ children }: any) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-fg-hover">{children}</em>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-fg">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-fg">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed text-[14px] text-fg">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-3 text-fg">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mb-2 mt-2 text-fg">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[14px] font-bold mb-1 mt-2 text-fg-hover">{children}</h3>,
  a: ({ children, href }: any) => <a href={href} className="text-accent hover:underline" target="_blank" rel="noreferrer">{children}</a>,
};

// Typewriter configuration
const seenMessages = new Set<string>();

// Parse AI message content — handles __GENERATED_IMAGE__, __LENS__, __SOURCES__, and __SUGGESTED_FOLLOW_UPS__ markers
function parseAiMessage(content: string): { 
  imageBase64: string | null; 
  textContent: string;
  theologicalLens: TheologicalLensType | null;
  suggestedFollowUps: string[];
  thoughtContent: string | null;
  sources: ChatSourceItem[];
} {
  let text = content || '';
  let imageBase64: string | null = null;
  let theologicalLens: TheologicalLensType | null = null;
  let suggestedFollowUps: string[] = [];
  let thoughtContent: string | null = null;
  let sources: ChatSourceItem[] = [];

  const sourcesMatch = text.match(/__SOURCES__([\s\S]*?)__END_SOURCES__/);
  if (sourcesMatch) {
    try {
      const parsed = JSON.parse(sourcesMatch[1].trim());
      if (Array.isArray(parsed)) {
        sources = parsed;
      }
    } catch {
      // ignore parsing error
    }
    text = text.replace(/__SOURCES__[\s\S]*?__END_SOURCES__/, '').trim();
  }

  const thoughtMatch = text.match(/__THOUGHT__([\s\S]*?)__END_THOUGHT__/) || text.match(/<thought>([\s\S]*?)<\/thought>/);
  if (thoughtMatch) {
    thoughtContent = thoughtMatch[1].trim();
    text = text.replace(/__THOUGHT__[\s\S]*?__END_THOUGHT__/, '').replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
  }

  const imageMatch = text.match(/__GENERATED_IMAGE__([\s\S]*?)__END_IMAGE__/);
  if (imageMatch) {
    imageBase64 = imageMatch[1];
    text = text.replace(/__GENERATED_IMAGE__[\s\S]*?__END_IMAGE__/, '').trim();
  }

  const lensMatch = text.match(/__LENS__([a-zA-Z0-9_-]+)__END_LENS__/);
  if (lensMatch) {
    theologicalLens = lensMatch[1] as TheologicalLensType;
    text = text.replace(/__LENS__[\s\S]*?__END_LENS__/, '').trim();
  }

  const followUpsMatch = text.match(/__SUGGESTED_FOLLOW_UPS__([\s\S]*?)__END_SUGGESTED_FOLLOW_UPS__/);
  if (followUpsMatch) {
    try {
      const parsed = JSON.parse(followUpsMatch[1].trim());
      if (Array.isArray(parsed)) {
        suggestedFollowUps = parsed.map(String);
      }
    } catch {
      // ignore parsing error
    }
    text = text.replace(/__SUGGESTED_FOLLOW_UPS__[\s\S]*?__END_SUGGESTED_FOLLOW_UPS__/, '').trim();
  }

  return { imageBase64, textContent: text, theologicalLens, suggestedFollowUps, thoughtContent, sources };
}

const seenTitles = new Set<string>();

const TypewriterTitle = ({ title }: { title: string }) => {
  const [displayed, setDisplayed] = useState(() => seenTitles.has(title) || title === 'New Conversation' ? title : '');
  
  useEffect(() => {
    if (seenTitles.has(title) || title === 'New Conversation') {
      setDisplayed(title);
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      if (index > title.length) index = title.length;
      setDisplayed(title.slice(0, index));
      
      if (index >= title.length) {
        clearInterval(interval);
        seenTitles.add(title);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [title]);

  return <>{displayed}</>;
};

const TypewriterMessage = ({
  content,
  onVerseClick,
}: {
  content: string;
  onVerseClick?: VerseClickHandler;
  onScrollToBottom?: () => void;
}) => {
  const { imageBase64, textContent } = parseAiMessage(content);
  const [displayed, setDisplayed] = useState(() => seenMessages.has(content) ? textContent : '');
  const mdComponents = useMemo(() => createMarkdownComponents(onVerseClick), [onVerseClick]);
  
  useEffect(() => {
    if (seenMessages.has(content)) {
      setDisplayed(textContent);
      return;
    }
    if (imageBase64) {
      // Images don't need typewriter — just mark as seen
      seenMessages.add(content);
      setDisplayed(textContent);
      return;
    }
    
    let index = 0;
    // Smooth streaming chunk updates at 20fps (~50ms intervals) to prevent main-thread AST re-parsing churn
    const interval = setInterval(() => {
      if (seenMessages.has(content)) {
        clearInterval(interval);
        setDisplayed(textContent);
        return;
      }
      index += 22;
      if (index > textContent.length) index = textContent.length;
      setDisplayed(textContent.slice(0, index));
      
      if (index >= textContent.length) {
        clearInterval(interval);
        seenMessages.add(content);
      }
    }, 48);
    
    return () => clearInterval(interval);
  }, [content, textContent, imageBase64]);

  return (
    <>
      {imageBase64 && (
        <div className="mb-3">
          <img 
            src={`data:image/png;base64,${imageBase64}`} 
            alt="AI generated image" 
            className="rounded-xl max-w-full object-contain max-h-96 shadow-lg" 
          />
          <a 
            href={`data:image/png;base64,${imageBase64}`} 
            download="theologica-image.png" 
            className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-muted hover:text-fg-hover transition-colors"
          >
            ↓ Download image
          </a>
        </div>
      )}
      {displayed && <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>}
    </>
  );
};

const AiMessageActions = ({
  content,
  chatTitle,
  chatId,
  theologicalLens,
  translation,
  onSendToCanvas,
  onSaveToNotes,
}: {
  content: string;
  chatTitle?: string;
  chatId?: string | number;
  theologicalLens?: TheologicalLensType;
  translation?: string;
  onSendToCanvas?: (content: string, title?: string, sourceChatId?: string | number) => void;
  onSaveToNotes?: (content: string, title?: string) => Promise<boolean>;
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleCopy = async () => {
    try {
      const { textContent } = parseAiMessage(content);
      await navigator.clipboard.writeText(textContent || content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyCitation = async () => {
    try {
      const { textContent, theologicalLens: msgLens } = parseAiMessage(content);
      const effectiveLens = msgLens || theologicalLens || 'canonical';
      const lensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === effectiveLens) || THEOLOGICAL_LENS_OPTIONS[0];
      const citation = `"${textContent}"\n\n— Theologica Study AI (${lensMeta.name} Lens, ${translation || 'BSB'}, ${new Date().toLocaleDateString()})`;
      await navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    } catch (err) {
      console.error('Failed to copy citation:', err);
    }
  };

  const handleSaveToNotes = async () => {
    if (!onSaveToNotes || savingNote) return;
    try {
      setSavingNote(true);
      const ok = await onSaveToNotes(content, chatTitle);
      if (ok) {
        setSavedToNotes(true);
        setTimeout(() => setSavedToNotes(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save to notes:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const { textContent } = parseAiMessage(content);
    // Clean markdown syntax for smoother narration
    const cleanSpeech = textContent
      .replace(/[*_~`#>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2.5 pt-1.5 select-none text-muted">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-fg px-2 py-1 rounded-md hover:bg-surface transition-all cursor-pointer"
        title="Copy response"
      >
        {copied ? (
          <>
            <Check size={12} className="text-emerald-500" />
            <span className="text-emerald-500 font-medium">Copied</span>
          </>
        ) : (
          <>
            <Copy size={12} />
            <span>Copy</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleCopyCitation}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-fg px-2 py-1 rounded-md hover:bg-surface transition-all cursor-pointer"
        title="Copy with scholarly citation"
      >
        {copiedCitation ? (
          <>
            <Check size={12} className="text-emerald-500" />
            <span className="text-emerald-500 font-medium">Cited</span>
          </>
        ) : (
          <>
            <Quote size={12} />
            <span>Cite</span>
          </>
        )}
      </button>

      {onSaveToNotes && (
        <button
          type="button"
          onClick={handleSaveToNotes}
          disabled={savingNote}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-fg px-2 py-1 rounded-md hover:bg-surface transition-all cursor-pointer disabled:opacity-50"
          title="Save insight to your Study Notes"
        >
          {savedToNotes ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500 font-medium">Saved</span>
            </>
          ) : (
            <>
              <BookMarked size={12} />
              <span>{savingNote ? 'Saving...' : 'Note'}</span>
            </>
          )}
        </button>
      )}

      {typeof window !== 'undefined' && 'speechSynthesis' in window && (
        <button
          type="button"
          onClick={handleToggleAudio}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-fg px-2 py-1 rounded-md hover:bg-surface transition-all cursor-pointer"
          title={isPlayingAudio ? "Stop reading" : "Read insight aloud"}
        >
          {isPlayingAudio ? (
            <>
              <VolumeX size={12} className="text-accent animate-pulse" />
              <span className="text-accent font-medium">Stop</span>
            </>
          ) : (
            <>
              <Volume2 size={12} />
              <span>Listen</span>
            </>
          )}
        </button>
      )}

      {onSendToCanvas && (
        <button
          type="button"
          onClick={() => onSendToCanvas(content, chatTitle, chatId)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-accent px-2 py-1 rounded-md hover:bg-surface transition-all cursor-pointer"
          title="Send this insight to Canvas"
        >
          <Workflow size={12} />
          <span>Canvas</span>
        </button>
      )}
    </div>
  );
};

const AiThinkingAccordion = ({ thought }: { thought: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!thought) return null;

  return (
    <div className="w-full mb-1">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 text-left cursor-pointer group select-none transition-colors text-muted/70 hover:text-fg py-0.5 text-[11px]"
      >
        <BrainCircuit size={11} className="text-accent/80 shrink-0" />
        <span className="font-medium">
          {isOpen ? 'Hide reasoning' : 'Thought process'}
        </span>
        <ChevronDown size={10} className={`transition-transform duration-200 text-muted/40 group-hover:text-muted/70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-1 pl-2.5 border-l border-border/60 text-[11px] leading-relaxed text-muted/80 max-h-64 overflow-y-auto custom-scroll whitespace-pre-wrap font-mono selection:bg-accent/20 animate-in fade-in duration-150">
          {thought}
        </div>
      )}
    </div>
  );
};

const AiThinkingIndicator = ({ 
  status, 
  thinkingText, 
  isFullView 
}: { 
  status: string; 
  thinkingText?: string; 
  isFullView?: boolean; 
}) => {
  const [showLiveThoughts, setShowLiveThoughts] = useState(false);
  const thoughtsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thoughts stream to bottom when expanded as new thoughts arrive
  useEffect(() => {
    if (showLiveThoughts && thoughtsContainerRef.current) {
      thoughtsContainerRef.current.scrollTop = thoughtsContainerRef.current.scrollHeight;
    }
  }, [thinkingText, showLiveThoughts]);

  const trimmedThinking = thinkingText?.trim() || '';
  const isImageStatus = status?.toLowerCase().includes('artwork') || status?.toLowerCase().includes('image');

  return (
    <div className={`flex flex-col items-start w-full shrink-0 ${isFullView ? 'max-w-3xl mx-auto' : ''} py-2.5 animate-in fade-in duration-200`}>
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0 animate-pulse">
          <Sparkles size={11} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">Theologica AI</span>
      </div>

      <div className="flex flex-col items-start w-full">
        {/* Subtle, refined thinking indicator */}
        <div className="flex items-center gap-2.5 py-0.5 select-none flex-wrap">
          <div className="inline-flex items-center gap-2">
            <div className="flex gap-1 items-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/80 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/80 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/80 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[13px] font-medium text-fg/80">
              {isImageStatus ? status : 'Thinking...'}
            </span>
          </div>

          {trimmedThinking && (
            <button
              type="button"
              onClick={() => setShowLiveThoughts(prev => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted/60 hover:text-fg transition-colors cursor-pointer ml-1 py-0.5 px-1.5 rounded hover:bg-surface/50"
            >
              <span>{showLiveThoughts ? 'Hide thinking' : 'Show thinking'}</span>
              <ChevronDown size={11} className={`transition-transform duration-200 text-muted/50 ${showLiveThoughts ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Real-time thoughts stream (expanded) */}
        {trimmedThinking && showLiveThoughts && (
          <div className="mt-2 pl-3 border-l-2 border-border-soft text-[12px] leading-relaxed text-muted/80 max-h-56 overflow-y-auto custom-scroll whitespace-pre-wrap font-sans selection:bg-accent/20 animate-in fade-in duration-150 w-full">
            <div 
              ref={thoughtsContainerRef}
              className="text-[11.5px] font-mono leading-relaxed text-muted/80"
            >
              {trimmedThinking}
              <span className="inline-block w-1.5 h-3 ml-1 bg-accent/70 animate-pulse align-middle" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const AiChatMessageView = ({
  message,
  index,
  totalMessages,
  onVerseClick,
  onSendToCanvas,
  onSaveToNotes,
  onSelectPrompt,
  onSelectLensComparison,
  onScrollToBottom,
  chatTitle,
  chatId,
  activeLens = 'standard',
  translation = 'BSB',
  isFullView,
}: {
  message: { 
    role: string; 
    content: string; 
    imagePreview?: string; 
    attachedFile?: { name: string; size: number; type: string };
  };
  index: number;
  totalMessages: number;
  onVerseClick?: VerseClickHandler;
  onSendToCanvas?: (content: string, title?: string, sourceChatId?: string | number) => void;
  onSaveToNotes?: (content: string, title?: string) => Promise<boolean>;
  onSelectPrompt?: (prompt: string) => void;
  onSelectLensComparison?: (lens: TheologicalLensType, prompt: string) => void;
  onScrollToBottom?: () => void;
  chatTitle?: string;
  chatId?: string | number;
  activeLens?: TheologicalLensType;
  translation?: string;
  isFullView?: boolean;
}) => {
  const isUser = message.role === 'user';
  const isLast = index === totalMessages - 1;
  const mdComponents = useMemo(() => createMarkdownComponents(onVerseClick), [onVerseClick]);

  if (isUser) {
    return (
      <div className={`flex flex-col items-end w-full shrink-0 ${isFullView ? 'max-w-3xl mx-auto' : ''} py-1.5`}>
        <div className="flex items-center gap-1.5 mb-1 select-none pr-1">
          <span className="text-[11px] font-medium text-muted">You</span>
        </div>
        <div className={`${
          isFullView 
            ? 'px-5 py-3.5 max-w-[85%] sm:max-w-[75%] text-[15px]' 
            : 'px-4 py-2.5 max-w-[90%] sm:max-w-[85%] text-[14px]'
        } leading-relaxed bg-surface border border-border-soft/80 text-fg rounded-2xl shadow-xs break-words`}>
          {message.imagePreview && (
            <img 
              src={message.imagePreview} 
              alt="attached" 
              className={`${isFullView ? 'max-h-52 mb-3' : 'max-h-40 mb-2'} rounded-xl object-contain`} 
            />
          )}
          {message.attachedFile && message.attachedFile.type !== 'image' && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-hover/70 border border-border-soft mb-2.5 max-w-sm">
              <div className={`p-1.5 rounded-lg ${message.attachedFile.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'}`}>
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-fg truncate">{message.attachedFile.name}</p>
                <p className="text-[10px] text-muted">{formatFileSize(message.attachedFile.size)}</p>
              </div>
            </div>
          )}
          <ReactMarkdown components={userMarkdownComponents}>{message.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Theologica AI message
  const { imageBase64, textContent, theologicalLens: msgLens, suggestedFollowUps, thoughtContent, sources } = parseAiMessage(message.content);
  const effectiveLens = msgLens || activeLens;
  const lensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === effectiveLens) || THEOLOGICAL_LENS_OPTIONS[0];

  const hasOriginalLanguages = /[\u0370-\u03FF\u0590-\u05FF]/.test(textContent);
  const verseMatches = Array.from(textContent.matchAll(new RegExp(BIBLE_VERSE_REGEX.source, 'gi')));
  const verseCount = verseMatches.length;

  return (
    <div className={`flex flex-col items-start w-full shrink-0 ${isFullView ? 'max-w-3xl mx-auto' : ''} py-2.5`}>
      {/* Minimalist AI Header */}
      <div className="flex items-center gap-1.5 mb-1.5 select-none flex-wrap text-[11px] text-muted">
        <Sparkles size={11} className="text-accent shrink-0" />
        <span className="font-medium text-fg">Theologica AI</span>
        <span className="text-muted/40">·</span>
        <span className="flex items-center gap-1 text-fg-2">
          {lensMeta.icon}
          <span>{lensMeta.name}</span>
        </span>
        {hasOriginalLanguages && (
          <>
            <span className="text-muted/40">·</span>
            <span className="text-muted">Original Roots</span>
          </>
        )}
        {verseCount > 0 && (
          <>
            <span className="text-muted/40">·</span>
            <span className="text-muted">{verseCount} {verseCount === 1 ? 'ref' : 'refs'}</span>
          </>
        )}
      </div>

      {/* Real Theological Reasoning Trace */}
      {thoughtContent && (
        <AiThinkingAccordion thought={thoughtContent} />
      )}

      {/* ChatGPT-Style Source Tracker */}
      <ChatSourceTracker
        sources={sources}
        content={textContent}
        lens={effectiveLens}
        isCompact={!isFullView}
      />

      <div className={`w-full ${isFullView ? 'text-[15px] leading-[1.75]' : 'text-[14px] leading-relaxed'} text-fg overflow-x-hidden break-words markdown-body`}>
        {isLast ? (
          <TypewriterMessage content={message.content} onVerseClick={onVerseClick} onScrollToBottom={onScrollToBottom} />
        ) : (
          <>
            {imageBase64 && (
              <div className={isFullView ? 'mb-3' : 'mb-2'}>
                <img 
                  src={`data:image/png;base64,${imageBase64}`} 
                  alt="AI generated" 
                  className={`rounded-xl max-w-full object-contain ${isFullView ? 'max-h-96' : 'max-h-64'} shadow-lg`} 
                />
                <a 
                  href={`data:image/png;base64,${imageBase64}`} 
                  download="theologica-image.png" 
                  className={`inline-flex items-center gap-1 mt-1.5 ${isFullView ? 'text-[11px]' : 'text-[10px]'} text-muted hover:text-fg-hover transition-colors`}
                >
                  ↓ Download image
                </a>
              </div>
            )}
            {textContent ? <ReactMarkdown components={mdComponents}>{textContent}</ReactMarkdown> : null}
          </>
        )}
      </div>

      <AiMessageActions
        content={message.content}
        chatTitle={chatTitle}
        chatId={chatId}
        theologicalLens={effectiveLens}
        translation={translation}
        onSendToCanvas={onSendToCanvas}
        onSaveToNotes={onSaveToNotes}
      />

      {/* Tailored Follow-Ups */}
      {isLast && onSelectPrompt && (
        <ChatFollowUps
          questions={suggestedFollowUps}
          messageContent={textContent}
          currentLens={effectiveLens}
          onSelectQuestion={onSelectPrompt}
          onSelectLensComparison={onSelectLensComparison || (() => {})}
          isCompact={!isFullView}
        />
      )}
    </div>
  );
};

export default function App() {
  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimeout(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const toolbarTouchStartRef = useRef<{ x: number; y: number; time: number; hasMoved: boolean } | null>(null);
  const lastTouchEndRef = useRef<number>(0);

  const { getToken, isLoaded, userId } = useAuth();
  
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);
  
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    let token: string | null = null;
    if (userId) {
      try {
        token = await getToken();
      } catch {}
    }
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...options,
      headers
    });
  }, [getToken, userId]);
  const [activeTab, setActiveTab] = useState('study'); // study, notes, chats, tracker, devotional, canvas
  const [canvasFocusTrigger, setCanvasFocusTrigger] = useState(0);
  const [canvasIncomingNode, setCanvasIncomingNode] = useState<{
    title: string;
    content: string;
    category?: NodeCategory;
    sourceChatId?: string;
    chatTitle?: string;
  } | null>(null);

  // Streak & Confirmation State
  const [chatToDelete, setChatToDelete] = useState<{ id: number; title: string } | null>(null);
  const [chatToRename, setChatToRename] = useState<{ id: number; title: string } | null>(null);
  const [noteToRename, setNoteToRename] = useState<{ id: number; title: string; content: string } | null>(null);
  const [dailyVerseModal, setDailyVerseModal] = useState<{
    isOpen: boolean;
    verseRef: string;
    excerpt?: string;
  }>({
    isOpen: false,
    verseRef: '',
    excerpt: '',
  });

  // Synchronize activeTab to URL query params & cookies/storage for reliable refresh & bookmarking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPreference(PREF_KEYS.ACTIVE_TAB, activeTab);
      const url = new URL(window.location.href);
      if (activeTab === 'study') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', activeTab);
      }
      const newPath = url.pathname + (url.search ? url.search : '') + url.hash;
      if (window.location.pathname + window.location.search !== url.pathname + (url.search ? url.search : '')) {
        window.history.replaceState(null, '', newPath);
      }
    }
  }, [activeTab]);

  // Require staying on the Devotional tab for at least 5 active seconds to count toward daily streak
  useEffect(() => {
    if (activeTab !== 'devotional') return;

    let activeElapsedMs = 0;
    const intervalMs = 250;
    const targetMs = 5000;

    const interval = setInterval(() => {
      // Pause timer if user switched away to another browser tab or app
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      activeElapsedMs += intervalMs;
      if (activeElapsedMs >= targetMs) {
        clearInterval(interval);
        recordHabitActivity('devotional');
        queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [activeTab]);
  
  // Devotional State
  const [displayDay, setDisplayDay] = useState(1);
  const [totalDays, setTotalDays] = useState(365);
  const [devotionalTime, setDevotionalTime] = useState<'morning' | 'evening'>('morning');
  const [devotionalEntry, setDevotionalEntry] = useState<DevotionalEntry | null>(null);
  const [isDevoSpeaking, setIsDevoSpeaking] = useState(false);
  const isDevoSpeakingRef = useRef(false);
  const todayDayRef = useRef(1);

  const changeDevotionalDay = (targetDay: number) => {
    let nextDay = targetDay;
    if (nextDay < 1) nextDay = totalDays;
    if (nextDay > totalDays) nextDay = 1;
    setDisplayDay(nextDay);
    fetchDevotionalForDay(nextDay).then(entry => {
      if (entry) setDevotionalEntry(entry);
    });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsDevoSpeaking(false);
    isDevoSpeakingRef.current = false;
  };

  // Bible State
  const [highlights, setHighlights] = useState<{id: number, book: string, chapter: number, verse: number, text: string, color: string}[]>([]);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectionVerse, setSelectionVerse] = useState<number | null>(null);
  const [endVerseNumber, setEndVerseNumber] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [toolbarPosition, setToolbarPosition] = useState<{x: number, y: number, highlightId?: number, highlightIds?: number[], isBelow?: boolean} | null>(null);
  const [copiedHighlightToast, setCopiedHighlightToast] = useState(false);
  const [activeHighlightMenu, setActiveHighlightMenu] = useState<{id: number, x: number, y: number} | null>(null);
  
  const [activeBook, setActiveBook] = useState(OT_BOOKS[0]);
  const [activeChapter, setActiveChapter] = useState(1);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [isOtExpanded, setIsOtExpanded] = useState<boolean>(true);
  const [isNtExpanded, setIsNtExpanded] = useState<boolean>(true);
  const [isDesktopMoreMenuOpen, setIsDesktopMoreMenuOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');

  const filteredOtBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return OT_BOOKS;
    const q = bookSearchQuery.toLowerCase().trim();
    return OT_BOOKS.filter(b => b.name.toLowerCase().includes(q));
  }, [bookSearchQuery]);

  const filteredNtBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return NT_BOOKS;
    const q = bookSearchQuery.toLowerCase().trim();
    return NT_BOOKS.filter(b => b.name.toLowerCase().includes(q));
  }, [bookSearchQuery]);
  const [translation, setTranslation] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theologica_bible_version') || 'bsb';
    }
    return 'bsb';
  });
  const [isVersesLoading, setIsVersesLoading] = useState(false);
  const [bibleVerses, setBibleVerses] = useState<{verse: number, text: string}[]>([]);
  const [chapterCopyright, setChapterCopyright] = useState<string>('');
  const [completedChapters, setCompletedChapters] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theologica_completed_chapters');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Split Screen / Parallel Reader State (Desktop & Tablets)
  const [isSplitView, setIsSplitView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return getBooleanPreference(PREF_KEYS.IS_SPLIT_VIEW, false);
    return false;
  });
  const [splitBook, setSplitBook] = useState<typeof OT_BOOKS[0]>(() => {
    if (typeof window !== 'undefined') {
      const saved = getPreference(PREF_KEYS.SPLIT_LAST_BOOK);
      if (saved) {
        const found = ALL_BOOKS.find(b => b.name.toLowerCase() === saved.toLowerCase());
        if (found) return found;
      }
    }
    return ALL_BOOKS.find(b => b.name === 'Matthew') || NT_BOOKS[0] || OT_BOOKS[0];
  });
  const [splitChapter, setSplitChapter] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = Number(getPreference(PREF_KEYS.SPLIT_LAST_CHAPTER));
      if (saved && !isNaN(saved) && saved >= 1) return saved;
    }
    return 1;
  });
  const [splitTranslation, setSplitTranslation] = useState<string>(() => {
    if (typeof window !== 'undefined') return getPreference(PREF_KEYS.SPLIT_BIBLE_VERSION) || 'bsb';
    return 'bsb';
  });
  const [splitBibleVerses, setSplitBibleVerses] = useState<{verse: number, text: string}[]>([]);
  const [isSplitVersesLoading, setIsSplitVersesLoading] = useState(false);
  const [splitChapterCopyright, setSplitChapterCopyright] = useState<string>('');
  const [isSplitBookSelectorOpen, setIsSplitBookSelectorOpen] = useState(false);
  const [splitBookSearchQuery, setSplitBookSearchQuery] = useState('');
  const [splitExpandedBook, setSplitExpandedBook] = useState<string | null>(null);
  const splitBookSelectorRef = useRef<HTMLDivElement>(null);

  // Mobile Chapter Bookmark & Quick-Swap State
  const [bookmarkedChapter, setBookmarkedChapter] = useState<{ book: string; chapter: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PREF_KEYS.BOOKMARKED_CHAPTER);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const splitFilteredOtBooks = useMemo(() => {
    if (!splitBookSearchQuery.trim()) return OT_BOOKS;
    const q = splitBookSearchQuery.toLowerCase().trim();
    return OT_BOOKS.filter(b => b.name.toLowerCase().includes(q));
  }, [splitBookSearchQuery]);

  const splitFilteredNtBooks = useMemo(() => {
    if (!splitBookSearchQuery.trim()) return NT_BOOKS;
    const q = splitBookSearchQuery.toLowerCase().trim();
    return NT_BOOKS.filter(b => b.name.toLowerCase().includes(q));
  }, [splitBookSearchQuery]);

  const splitPrevChapterInfo = useMemo(() => {
    if (splitChapter > 1) {
      return { book: splitBook.name, chapter: splitChapter - 1 };
    }
    const curIdx = ALL_BOOKS.findIndex(b => b.name.toLowerCase() === splitBook.name.toLowerCase());
    if (curIdx > 0) {
      const prevBook = ALL_BOOKS[curIdx - 1];
      return { book: prevBook.name, chapter: prevBook.chapters };
    }
    return null;
  }, [splitBook.name, splitChapter]);

  const splitNextChapterInfo = useMemo(() => {
    if (splitChapter < splitBook.chapters) {
      return { book: splitBook.name, chapter: splitChapter + 1 };
    }
    const curIdx = ALL_BOOKS.findIndex(b => b.name.toLowerCase() === splitBook.name.toLowerCase());
    if (curIdx !== -1 && curIdx < ALL_BOOKS.length - 1) {
      const nextBook = ALL_BOOKS[curIdx + 1];
      return { book: nextBook.name, chapter: 1 };
    }
    return null;
  }, [splitBook.name, splitChapter]);

  const handleToggleSplitView = useCallback((enabled: boolean) => {
    setIsSplitView(enabled);
    setPreference(PREF_KEYS.IS_SPLIT_VIEW, String(enabled));
    if (enabled) {
      trackClientEvent('split_view_enabled');
    }
  }, []);

  const handleSelectSplitTranslation = useCallback((newTranslation: string) => {
    setSplitTranslation(newTranslation);
    setPreference(PREF_KEYS.SPLIT_BIBLE_VERSION, newTranslation);
  }, []);

  const navigateToSplitPassage = useCallback((bookName: string, chapter: number) => {
    const found = ALL_BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase());
    if (found) {
      setSplitBook(found);
      const clamped = Math.min(Math.max(1, chapter), found.chapters);
      setSplitChapter(clamped);
      setPreference(PREF_KEYS.SPLIT_LAST_BOOK, found.name);
      setPreference(PREF_KEYS.SPLIT_LAST_CHAPTER, String(clamped));
    }
  }, []);

  const handleBookmarkCurrentChapter = useCallback(() => {
    const bookmark = { book: activeBook.name, chapter: activeChapter };
    setBookmarkedChapter(bookmark);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREF_KEYS.BOOKMARKED_CHAPTER, JSON.stringify(bookmark));
    }
  }, [activeBook.name, activeChapter]);

  const handleRemoveBookmark = useCallback(() => {
    setBookmarkedChapter(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PREF_KEYS.BOOKMARKED_CHAPTER);
    }
  }, []);

  // Reset reader scroll position to top whenever switching books or chapters
  useEffect(() => {
    document.querySelectorAll('.bible-reader-content').forEach(el => {
      el.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [activeBook.name, activeChapter]);
  
  // Theological Lens & Feature States
  const [theologicalLens, setTheologicalLens] = useState<TheologicalLensType>('standard');
  const [isLectioModalOpen, setIsLectioModalOpen] = useState(false);
  const [isInterlinearMode, setIsInterlinearMode] = useState(false);
  const [interlinearShowStrongs, setInterlinearShowStrongs] = useState(false);
  const [interlinearShowTranslit, setInterlinearShowTranslit] = useState(false);
  const [isVerseInterlinearOpen, setIsVerseInterlinearOpen] = useState(false);
  const [verseInterlinearTarget, setVerseInterlinearTarget] = useState(1);
  const [activeInterlinearWord, setActiveInterlinearWord] = useState<{
    word: InterlinearWord;
    position: { x: number; y: number } | null;
    verseRef: string;
  } | null>(null);
  const [strongsVersesMap, setStrongsVersesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isLectioModalOpen) {
      trackClientEvent('lectio_started');
    }
  }, [isLectioModalOpen]);

  useEffect(() => {
    if (isInterlinearMode) {
      trackClientEvent('interlinear_opened');
    }
  }, [isInterlinearMode]);

  // Pre-load Strong's tagged chapter for accurate word-by-word reverse interlinear alignment and instant word study
  useEffect(() => {
    let isCancelled = false;
    getStrongsPassage(activeBook.name, activeChapter)
      .then((ch) => {
        if (ch && ch.verses) {
          if (isCancelled) return;
          const map: Record<number, string> = {};
          ch.verses.forEach((v) => {
            map[v.verse] = v.text;
          });
          setStrongsVersesMap(map);
          preloadChapterLexicon(ch.verses).catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [activeBook.name, activeChapter]);
  const [backlinksDrawerState, setBacklinksDrawerState] = useState<{
    isOpen: boolean;
    reference: string;
    backlinks: BacklinksResult | null;
  }>({
    isOpen: false,
    reference: '',
    backlinks: null,
  });
  const [isMobileTyping, setIsMobileTyping] = useState(false);
  const activeTabRef = useRef(activeTab);
  const isHomeSuggestionsActiveRef = useRef(true);
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'canvas') {
      setIsMobileTyping(false);
    }
  }, [activeTab]);

  // Hide mobile bottom toolbar when typing or virtual keyboard is active (prevents toolbar from showing/interfering on scroll)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isInputElement = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'textarea' || (el as HTMLElement).isContentEditable) return true;
      if (tag === 'input') {
        const type = (el as HTMLInputElement).type?.toLowerCase();
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
      }
      return false;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (window.innerWidth >= 1024) return;
      if (activeTabRef.current === 'canvas') return;
      if (isInputElement(e.target as Element)) {
        setIsMobileTyping(true);
        const target = e.target as HTMLElement;
        const isChatInput = target.getAttribute('placeholder')?.includes('Ask anything') || target.getAttribute('placeholder')?.includes('Study AI');
        if (isChatInput && isHomeSuggestionsActiveRef.current) {
          return;
        }
        setTimeout(() => {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch {}
        }, 300);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        if (!isInputElement(document.activeElement)) {
          setIsMobileTyping(false);
        }
      }, 100);
    };

    // If user scrolls anywhere on the screen while an input/textarea is focused, guarantee bottom toolbar remains hidden
    const handleScroll = () => {
      if (window.innerWidth < 1024 && activeTabRef.current !== 'canvas' && isInputElement(document.activeElement)) {
        setIsMobileTyping(true);
      }
    };

    // Detect virtual keyboard expansion / collapse on mobile browsers via visualViewport
    const vv = window.visualViewport;
    const handleViewportResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileTyping(false);
        return;
      }
      if (vv && window.innerHeight) {
        const isKeyboardOpen = vv.height < window.innerHeight * 0.85;
        if (isKeyboardOpen && activeTabRef.current !== 'canvas' && isInputElement(document.activeElement)) {
          setIsMobileTyping(true);
        } else if (!isInputElement(document.activeElement) && vv.height >= window.innerHeight * 0.88) {
          setIsMobileTyping(false);
        }
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    if (vv) {
      vv.addEventListener('resize', handleViewportResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (vv) {
        vv.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Load and persist interlinear preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = localStorage.getItem('theologica_interlinear_mode') === 'true';
        if (savedMode) setIsInterlinearMode(true);
        const savedStrongs = localStorage.getItem('theologica_interlinear_strongs') === 'true';
        if (savedStrongs) setInterlinearShowStrongs(true);
        const savedTranslit = localStorage.getItem('theologica_interlinear_translit') === 'true';
        if (savedTranslit) setInterlinearShowTranslit(true);
      } catch {}
    }
  }, []);

  const handleToggleInterlinearMode = useCallback((newVal?: boolean) => {
    setIsInterlinearMode((prev) => {
      const val = typeof newVal === 'boolean' ? newVal : !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theologica_interlinear_mode', String(val));
        } catch {}
      }
      return val;
    });
  }, []);

  const handleToggleStrongs = useCallback(() => {
    setInterlinearShowStrongs((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theologica_interlinear_strongs', String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const handleToggleTranslit = useCallback(() => {
    setInterlinearShowTranslit((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theologica_interlinear_translit', String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Verse navigation & interactive highlighting
  const pendingVerseRef = useRef<{ book: string; chapter: number; verse: number } | null>(null);

  const scrollToAndHighlightVerse = useCallback((verseNum: number) => {
    const tryScroll = (attemptsLeft: number) => {
      const verseElements = document.querySelectorAll(`[data-verse="${verseNum}"]`);
      const visibleEl = Array.from(verseElements).find(e => (e as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
      const el = visibleEl || (attemptsLeft === 0 && verseElements.length > 0 ? (verseElements[0] as HTMLElement) : null);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('verse-nav-highlight');
        void el.offsetWidth;
        el.classList.add('verse-nav-highlight');
        setTimeout(() => {
          el.classList.remove('verse-nav-highlight');
        }, 3000);
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryScroll(attemptsLeft - 1), 100);
      }
    };

    setTimeout(() => tryScroll(15), 100);
  }, []);

  const navigateToVerse = useCallback((bookName: string, chapter: number, verse: number) => {
    const allBooks = [...OT_BOOKS, ...NT_BOOKS];
    const targetBook = allBooks.find(
      b => b.name.toLowerCase() === bookName.toLowerCase()
    );
    if (!targetBook) return;

    setActiveTab('study');
    setMobileStudyView('reader');

    const isSameBook = activeBook.name.toLowerCase() === targetBook.name.toLowerCase();
    const isSameChapter = activeChapter === chapter;

    if (isSameBook && isSameChapter && bibleVerses.length > 0) {
      scrollToAndHighlightVerse(verse);
    } else {
      pendingVerseRef.current = { book: targetBook.name, chapter, verse };
      setBibleVerses([]);
      setActiveBook(targetBook);
      setActiveChapter(chapter);
    }
  }, [activeBook.name, activeChapter, bibleVerses.length, scrollToAndHighlightVerse]);

  const handleQuickSwapChapter = useCallback(() => {
    if (!bookmarkedChapter) return;
    const curBook = activeBook.name;
    const curChapter = activeChapter;
    const targetBook = bookmarkedChapter.book;
    const targetChapter = bookmarkedChapter.chapter;

    // Navigate to held/bookmarked chapter
    navigateToVerse(targetBook, targetChapter, 1);

    // Save previous chapter as the new bookmark so user can swap back and forth easily
    const newBookmark = { book: curBook, chapter: curChapter };
    setBookmarkedChapter(newBookmark);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREF_KEYS.BOOKMARKED_CHAPTER, JSON.stringify(newBookmark));
    }
  }, [bookmarkedChapter, activeBook.name, activeChapter, navigateToVerse]);

  useEffect(() => {
    if (pendingVerseRef.current && bibleVerses.length > 0) {
      const target = pendingVerseRef.current;
      if (
        activeBook.name.toLowerCase() === target.book.toLowerCase() &&
        activeChapter === target.chapter
      ) {
        pendingVerseRef.current = null;
        scrollToAndHighlightVerse(target.verse);
      }
    }
  }, [bibleVerses, activeBook.name, activeChapter, scrollToAndHighlightVerse]);

  const aiMarkdownComponents = useMemo(() => {
    return createMarkdownComponents(navigateToVerse);
  }, [navigateToVerse]);

  const prevChapterInfo = useMemo(() => {
    if (activeChapter > 1) {
      return { book: activeBook.name, chapter: activeChapter - 1 };
    }
    const allBooks = [...OT_BOOKS, ...NT_BOOKS];
    const curIdx = allBooks.findIndex(b => b.name.toLowerCase() === activeBook.name.toLowerCase());
    if (curIdx > 0) {
      const prevBook = allBooks[curIdx - 1];
      return { book: prevBook.name, chapter: prevBook.chapters };
    }
    return null;
  }, [activeBook.name, activeChapter]);

  const nextChapterInfo = useMemo(() => {
    if (activeChapter < activeBook.chapters) {
      return { book: activeBook.name, chapter: activeChapter + 1 };
    }
    const allBooks = [...OT_BOOKS, ...NT_BOOKS];
    const curIdx = allBooks.findIndex(b => b.name.toLowerCase() === activeBook.name.toLowerCase());
    if (curIdx !== -1 && curIdx < allBooks.length - 1) {
      const nextBook = allBooks[curIdx + 1];
      return { book: nextBook.name, chapter: 1 };
    }
    return null;
  }, [activeBook.chapters, activeBook.name, activeChapter]);

  const handleReaderContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const verseEl = target.closest('[data-verse]');
    if (!verseEl) return;

    const verseNumAttr = verseEl.getAttribute('data-verse');
    if (!verseNumAttr) return;
    const verseNum = parseInt(verseNumAttr, 10);

    e.preventDefault();

    const selection = window.getSelection();
    const selectedStr = selection?.toString().trim();

    if (!selectedStr || !selection || selection.isCollapsed) {
      const range = document.createRange();
      range.selectNodeContents(verseEl);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setSelectionRange(range);
      setSelectionVerse(verseNum);
      setEndVerseNumber(verseNum);
      const vObj = bibleVerses.find(v => v.verse === verseNum);
      setSelectedText(vObj ? parseVerseFootnote(vObj.text).mainText : (verseEl.textContent || ''));
    }

    const toolbarHalfWidth = 195;
    const x = Math.max(toolbarHalfWidth + 12, Math.min(window.innerWidth - toolbarHalfWidth - 12, e.clientX));
    const isNearTop = e.clientY < 110;
    let y = isNearTop ? e.clientY + 24 : e.clientY - 12;
    y = Math.max(70, Math.min(window.innerHeight - 80, y));

    const wholeVerseHl = highlights.find(
      h => isSameBook(h.book, activeBook.name) &&
           Number(h.chapter) === Number(activeChapter) &&
           Number(h.verse) === Number(verseNum)
    );

    setToolbarPosition({
      x,
      y,
      highlightId: wholeVerseHl?.id,
      isBelow: isNearTop,
    });
  }, [activeBook.name, activeChapter, bibleVerses, highlights]);
  
  // Tracker State
  const [expandedTestaments, setExpandedTestaments] = useState<string[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<string[]>([]);
  
  const toggleTestament = (t: string) => setExpandedTestaments(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleBook = (b: string) => setExpandedBooks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const [mobileStudyView, setMobileStudyView] = useState<'reader' | 'chapters' | 'ai' | 'tools'>('reader');
  
  // Layout State — read saved panel defaults synchronously before first render (falling back to calm 2-panel layout: Reader + Study AI)
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(() =>
    getBooleanPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR, false)
  );
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(() =>
    getBooleanPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR, true)
  );
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle>(null);
  const [showBottomNotes, setShowBottomNotes] = useState<boolean>(() =>
    getBooleanPreference(PREF_KEYS.SHOW_BOTTOM_NOTES, false)
  );
  const mobileBookListScrollRef = useRef<HTMLDivElement>(null);
  const desktopBookListScrollRef = useRef<HTMLDivElement>(null);
  const pendingBookScrollAnchorRef = useRef<{
    container: HTMLElement;
    summaryEl: HTMLElement;
    beforeTop: number;
  } | null>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const readerHeaderRef = useRef<HTMLElement>(null);
  const [readerHeaderWidth, setReaderHeaderWidth] = useState<number>(1200);
  const readerTitleRef = useRef<HTMLDivElement>(null);
  const [readerTitleWidth, setReaderTitleWidth] = useState<number>(150);
  const mobileReaderHeaderRef = useRef<HTMLElement>(null);
  const [mobileReaderHeaderWidth, setMobileReaderHeaderWidth] = useState<number>(390);
  const mobileReaderTitleRef = useRef<HTMLDivElement>(null);
  const [mobileReaderTitleWidth, setMobileReaderTitleWidth] = useState<number>(125);
  const desktopMoreMenuRef = useRef<HTMLDivElement>(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Notes State
  const LOCAL_NOTES_KEY = 'theologica_local_notes_v1';

  const getLocalNotes = useCallback((): NoteItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_NOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocalNotes = useCallback((notesList: NoteItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notesList));
    } catch {}
  }, []);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const tempNoteIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isOldTestament = useMemo(() => {
    return OT_BOOKS.some((b) => b.name.toLowerCase() === activeBook.name.toLowerCase());
  }, [activeBook.name]);

  const chapterBacklinksMap = useMemo(() => {
    const map = new Map<number, BacklinksResult>();
    for (const v of bibleVerses) {
      const res = getScriptureBacklinks({
        book: activeBook.name,
        chapter: activeChapter,
        verse: v.verse,
        notes,
        highlights,
      });
      if (res.totalCount > 0) {
        map.set(v.verse, res);
      }
    }
    return map;
  }, [activeBook.name, activeChapter, bibleVerses, notes, highlights]);

  const totalChapterBacklinks = useMemo(() => {
    return getScriptureBacklinks({
      book: activeBook.name,
      chapter: activeChapter,
      notes,
      highlights,
    });
  }, [activeBook.name, activeChapter, notes, highlights]);

  // Chats State
  const [chats, setChats] = useState<{id: number, title: string, messages: {role: string, content: string}[]}[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [mobileChatView, setMobileChatView] = useState<'chat' | 'list'>('chat');
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);

  // Real-time touch dragging for Mobile AI Chats conversation drawer (smooth slide-out with finger)
  const [isChatDrawerDragging, setIsChatDrawerDragging] = useState(false);
  const [chatDrawerOffset, setChatDrawerOffset] = useState(0);
  const chatDrawerTouchStartXRef = useRef<number>(0);
  const chatDrawerTouchStartYRef = useRef<number>(0);
  const chatDrawerTouchTimeRef = useRef<number>(0);
  const chatDrawerDragLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const chatDrawerInitialViewRef = useRef<'chat' | 'list'>('chat');

  const handleChatTouchStart = (e: React.TouchEvent) => {
    // Prevent opening conversations drawer if user is typing, text box is focused, or input is active
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const isInputActive = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || (activeEl as HTMLElement).isContentEditable);
    if (isChatInputFocused || isInputActive || isMobileTyping) {
      chatDrawerTouchStartXRef.current = 0;
      chatDrawerDragLockedRef.current = null;
      return;
    }
    if (e.touches.length === 1) {
      chatDrawerTouchStartXRef.current = e.touches[0].clientX;
      chatDrawerTouchStartYRef.current = e.touches[0].clientY;
      chatDrawerTouchTimeRef.current = Date.now();
      chatDrawerDragLockedRef.current = null;
      chatDrawerInitialViewRef.current = 'chat';
    }
  };

  const handleChatTouchMove = (e: React.TouchEvent) => {
    if (mobileChatView !== 'chat' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - chatDrawerTouchStartXRef.current;
    const dy = currentY - chatDrawerTouchStartYRef.current;
    const startX = chatDrawerTouchStartXRef.current;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const chatDrawerWidth = Math.min(winW * 0.85, 320);

    if (chatDrawerDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        chatDrawerDragLockedRef.current = 'vertical';
      } else if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        // Edge activation zone so inner-chat horizontal swipes aren't hijacked
        if (startX <= 44) {
          chatDrawerDragLockedRef.current = 'horizontal';
          setIsChatDrawerDragging(true);
        }
      }
    }

    if (chatDrawerDragLockedRef.current === 'horizontal') {
      setChatDrawerOffset(Math.max(0, Math.min(chatDrawerWidth, dx)));
    }
  };

  const handleChatTouchEnd = (e: React.TouchEvent) => {
    if (chatDrawerDragLockedRef.current === 'horizontal' && chatDrawerInitialViewRef.current === 'chat') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const chatDrawerWidth = Math.min(winW * 0.85, 320);
      const dx = e.changedTouches[0].clientX - chatDrawerTouchStartXRef.current;
      const dt = Date.now() - chatDrawerTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);
      const shouldOpen = dx > chatDrawerWidth * 0.38 || (velocity > 0.32 && dx > 30);

      setIsChatDrawerDragging(false);
      if (shouldOpen) {
        setChatDrawerOffset(chatDrawerWidth);
        setTimeout(() => {
          setMobileChatView('list');
          setChatDrawerOffset(0);
        }, 280);
      } else {
        setChatDrawerOffset(0);
      }
    }
    chatDrawerDragLockedRef.current = null;
  };

  const handleConversationTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      chatDrawerTouchStartXRef.current = e.touches[0].clientX;
      chatDrawerTouchStartYRef.current = e.touches[0].clientY;
      chatDrawerTouchTimeRef.current = Date.now();
      chatDrawerDragLockedRef.current = null;
      chatDrawerInitialViewRef.current = 'list';
    }
  };

  const handleConversationTouchMove = (e: React.TouchEvent) => {
    if (mobileChatView !== 'list' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - chatDrawerTouchStartXRef.current;
    const dy = currentY - chatDrawerTouchStartYRef.current;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const chatDrawerWidth = Math.min(winW * 0.85, 320);

    if (chatDrawerDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        chatDrawerDragLockedRef.current = 'vertical';
      } else if (dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        chatDrawerDragLockedRef.current = 'horizontal';
        setIsChatDrawerDragging(true);
      }
    }

    if (chatDrawerDragLockedRef.current === 'horizontal') {
      setChatDrawerOffset(Math.min(0, Math.max(-chatDrawerWidth, dx)));
    }
  };

  const handleConversationTouchEnd = (e: React.TouchEvent) => {
    if (chatDrawerDragLockedRef.current === 'horizontal' && chatDrawerInitialViewRef.current === 'list') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const chatDrawerWidth = Math.min(winW * 0.85, 320);
      const dx = e.changedTouches[0].clientX - chatDrawerTouchStartXRef.current;
      const dt = Date.now() - chatDrawerTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);
      const shouldClose = Math.abs(dx) > chatDrawerWidth * 0.35 || (velocity < -0.32 && dx < -30);

      setIsChatDrawerDragging(false);
      if (shouldClose) {
        setChatDrawerOffset(-chatDrawerWidth);
        setTimeout(() => {
          setMobileChatView('chat');
          setChatDrawerOffset(0);
        }, 280);
      } else {
        setChatDrawerOffset(0);
      }
    }
    chatDrawerDragLockedRef.current = null;
  };

  // Mobile Standalone PWA detection and safe-area top padding
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    }
  }, []);

  const mobileTopPadding = isStandalone
    ? 'calc(env(safe-area-inset-top, 0px) + 12px)'
    : 'calc(env(safe-area-inset-top, 0px) + 8px)';

  // Auto-hide mobile top header and bottom nav bar on downward scroll in Scripture reader
  const [mobileChromeHidden, setMobileChromeHidden] = useState(false);
  const mobileLastScrollTopRef = useRef(0);

  const handleReaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const deltaY = currentScrollTop - mobileLastScrollTopRef.current;

    // Scrolling down hides chrome; scrolling up or reaching top reveals chrome
    if (deltaY > 15 && currentScrollTop > 80) {
      setMobileChromeHidden(true);
    } else if (deltaY < -10 || currentScrollTop <= 30) {
      setMobileChromeHidden(false);
    }
    mobileLastScrollTopRef.current = currentScrollTop;
  }, []);

  const handleReaderTap = useCallback(() => {
    if (mobileChromeHidden) {
      setMobileChromeHidden(false);
    }
  }, [mobileChromeHidden]);

  // Mobile Sidebar Touch Dragging & Smooth Transitions
  const [mobileDragSidebar, setMobileDragSidebar] = useState<'chapters' | 'ai' | 'tools' | null>(null);
  const [mobileDragOffset, setMobileDragOffset] = useState<number>(0);
  const [isMobileDragging, setIsMobileDragging] = useState<boolean>(false);

  const mobileTouchStartXRef = useRef<number>(0);
  const mobileTouchStartYRef = useRef<number>(0);
  const mobileTouchTimeRef = useRef<number>(0);
  const mobileDragLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  // 1. Gesture on Reader: Swipe Left-to-Right to open Book Selector
  const handleMobileReaderTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      mobileTouchStartXRef.current = e.touches[0].clientX;
      mobileTouchStartYRef.current = e.touches[0].clientY;
      mobileTouchTimeRef.current = Date.now();
      mobileDragLockedRef.current = null;
    }
  };

  const handleMobileReaderTouchMove = (e: React.TouchEvent) => {
    if (mobileStudyView !== 'reader' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - mobileTouchStartXRef.current;
    const dy = currentY - mobileTouchStartYRef.current;
    const startX = mobileTouchStartXRef.current;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;

    if (mobileDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        mobileDragLockedRef.current = 'vertical';
      } else if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;

        // Restrict horizontal swipe-to-open to edge activation zones so mid-screen reading/highlighting is never hijacked
        // Left edge swipe (startX <= 32) opens chapters drawer
        if (dx > 10 && startX <= 32) {
          mobileDragLockedRef.current = 'horizontal';
          setIsMobileDragging(true);
          setMobileDragSidebar('chapters');
        } 
        // Right edge swipe (startX >= winW - 32) opens ai drawer
        else if (dx < -10 && startX >= winW - 32) {
          mobileDragLockedRef.current = 'horizontal';
          setIsMobileDragging(true);
          setMobileDragSidebar('ai');
        }
      }
    }

    if (mobileDragLockedRef.current === 'horizontal') {
      if (mobileDragSidebar === 'chapters') {
        setMobileDragOffset(Math.max(0, Math.min(winW, dx)));
      } else if (mobileDragSidebar === 'ai') {
        setMobileDragOffset(Math.max(0, Math.min(winW, -dx)));
      }
    }
  };

  const handleMobileReaderTouchEnd = (e: React.TouchEvent) => {
    if (mobileDragLockedRef.current === 'horizontal') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const dx = e.changedTouches[0].clientX - mobileTouchStartXRef.current;
      const dt = Date.now() - mobileTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);

      if (mobileDragSidebar === 'chapters') {
        const shouldOpen = dx > winW * 0.38 || (velocity > 0.30 && dx > 35);
        setIsMobileDragging(false);
        if (shouldOpen) {
          setMobileDragOffset(winW);
          setTimeout(() => {
            setMobileStudyView('chapters');
            setMobileDragSidebar(null);
            setMobileDragOffset(0);
          }, 280);
        } else {
          setMobileDragOffset(0);
          setTimeout(() => {
            setMobileDragSidebar(null);
          }, 280);
        }
      } else if (mobileDragSidebar === 'ai') {
        const shouldOpen = -dx > winW * 0.38 || (velocity < -0.30 && -dx > 35);
        setIsMobileDragging(false);
        if (shouldOpen) {
          setMobileDragOffset(winW);
          setTimeout(() => {
            setMobileStudyView('ai');
            scrollToBottomOnChatOpenRef.current = true;
            scrollChatToBottom();
            setMobileDragSidebar(null);
            setMobileDragOffset(0);
          }, 280);
        } else {
          setMobileDragOffset(0);
          setTimeout(() => {
            setMobileDragSidebar(null);
          }, 280);
        }
      }
    }
    mobileDragLockedRef.current = null;
  };

  // 2. Gesture on Book Selector Drawer: Swipe Right-to-Left to close
  const handleBookSelectorTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      mobileTouchStartXRef.current = e.touches[0].clientX;
      mobileTouchStartYRef.current = e.touches[0].clientY;
      mobileTouchTimeRef.current = Date.now();
      mobileDragLockedRef.current = null;
    }
  };

  const handleBookSelectorTouchMove = (e: React.TouchEvent) => {
    if (mobileStudyView !== 'chapters' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - mobileTouchStartXRef.current;
    const dy = currentY - mobileTouchStartYRef.current;

    if (mobileDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        mobileDragLockedRef.current = 'vertical';
      } else if (dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        mobileDragLockedRef.current = 'horizontal';
        setIsMobileDragging(true);
        setMobileDragSidebar('chapters');
      }
    }

    if (mobileDragLockedRef.current === 'horizontal') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      setMobileDragOffset(Math.min(0, Math.max(-winW, dx)));
    }
  };

  const handleBookSelectorTouchEnd = (e: React.TouchEvent) => {
    if (mobileDragLockedRef.current === 'horizontal' && mobileDragSidebar === 'chapters') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const dx = e.changedTouches[0].clientX - mobileTouchStartXRef.current;
      const dt = Date.now() - mobileTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);
      const shouldClose = Math.abs(dx) > winW * 0.35 || (velocity < -0.30 && dx < -35);

      setIsMobileDragging(false);
      if (shouldClose) {
        setMobileDragOffset(-winW);
        setTimeout(() => {
          setMobileStudyView('reader');
          setMobileDragSidebar(null);
          setMobileDragOffset(0);
        }, 280);
      } else {
        setMobileDragOffset(0);
        setTimeout(() => {
          setMobileDragSidebar(null);
        }, 280);
      }
    }
    mobileDragLockedRef.current = null;
  };

  // 3. Gesture on Study AI Drawer: Swipe Left-to-Right to close
  const handleMobileStudyAiTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      mobileTouchStartXRef.current = e.touches[0].clientX;
      mobileTouchStartYRef.current = e.touches[0].clientY;
      mobileTouchTimeRef.current = Date.now();
      mobileDragLockedRef.current = null;
    }
  };

  const handleMobileStudyAiTouchMove = (e: React.TouchEvent) => {
    if (mobileStudyView !== 'ai' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - mobileTouchStartXRef.current;
    const dy = currentY - mobileTouchStartYRef.current;

    if (mobileDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        mobileDragLockedRef.current = 'vertical';
      } else if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        mobileDragLockedRef.current = 'horizontal';
        setIsMobileDragging(true);
        setMobileDragSidebar('ai');
      }
    }

    if (mobileDragLockedRef.current === 'horizontal') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      setMobileDragOffset(Math.max(0, Math.min(winW, dx)));
    }
  };

  const handleMobileStudyAiTouchEnd = (e: React.TouchEvent) => {
    if (mobileDragLockedRef.current === 'horizontal' && mobileDragSidebar === 'ai') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const dx = e.changedTouches[0].clientX - mobileTouchStartXRef.current;
      const dt = Date.now() - mobileTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);
      const shouldClose = dx > winW * 0.35 || (velocity > 0.30 && dx > 35);

      setIsMobileDragging(false);
      if (shouldClose) {
        setMobileDragOffset(winW);
        setTimeout(() => {
          setMobileStudyView('reader');
          setMobileDragSidebar(null);
          setMobileDragOffset(0);
        }, 280);
      } else {
        setMobileDragOffset(0);
        setTimeout(() => {
          setMobileDragSidebar(null);
        }, 280);
      }
    }
    mobileDragLockedRef.current = null;
  };

  // 4. Gesture on Study Tools Drawer: Swipe Left-to-Right to close
  const handleMobileStudyToolsTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      mobileTouchStartXRef.current = e.touches[0].clientX;
      mobileTouchStartYRef.current = e.touches[0].clientY;
      mobileTouchTimeRef.current = Date.now();
      mobileDragLockedRef.current = null;
    }
  };

  const handleMobileStudyToolsTouchMove = (e: React.TouchEvent) => {
    if (mobileStudyView !== 'tools' || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - mobileTouchStartXRef.current;
    const dy = currentY - mobileTouchStartYRef.current;

    if (mobileDragLockedRef.current === null) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        mobileDragLockedRef.current = 'vertical';
      } else if (dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        mobileDragLockedRef.current = 'horizontal';
        setIsMobileDragging(true);
        setMobileDragSidebar('tools');
      }
    }

    if (mobileDragLockedRef.current === 'horizontal') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      setMobileDragOffset(Math.max(0, Math.min(winW, dx)));
    }
  };

  const handleMobileStudyToolsTouchEnd = (e: React.TouchEvent) => {
    if (mobileDragLockedRef.current === 'horizontal' && mobileDragSidebar === 'tools') {
      const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
      const dx = e.changedTouches[0].clientX - mobileTouchStartXRef.current;
      const dt = Date.now() - mobileTouchTimeRef.current;
      const velocity = dx / Math.max(1, dt);
      const shouldClose = dx > winW * 0.35 || (velocity > 0.30 && dx > 35);

      setIsMobileDragging(false);
      if (shouldClose) {
        setMobileDragOffset(winW);
        setTimeout(() => {
          setMobileStudyView('reader');
          setMobileDragSidebar(null);
          setMobileDragOffset(0);
        }, 280);
      } else {
        setMobileDragOffset(0);
        setTimeout(() => {
          setMobileDragSidebar(null);
        }, 280);
      }
    }
    mobileDragLockedRef.current = null;
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('#c96442');
  const [trackerFormat, setTrackerFormat] = useState<'percent' | 'fraction'>('percent');
  const [dailyChapterGoal, setDailyChapterGoal] = useState(3);
  const dailyChapterGoalRef = useRef(dailyChapterGoal);
  useEffect(() => {
    dailyChapterGoalRef.current = dailyChapterGoal;
  }, [dailyChapterGoal]);

  // Reader Typography States
  const [readerFontFamily, setReaderFontFamily] = useState<ReaderFontFamily>('serif');
  const [readerFontSize, setReaderFontSize] = useState<ReaderFontSize>('md');
  const [readerLineHeight, setReaderLineHeight] = useState<ReaderLineHeight>('standard');
  const [readerLayout, setReaderLayout] = useState<ReaderLayout>('verse');
  const [showVerseNumbers, setShowVerseNumbers] = useState(true);
  const [showFootnotes, setShowFootnotes] = useState(true);
  const [showBacklinksBadges, setShowBacklinksBadges] = useState(true);

  // Audio & TTS States
  const [ttsSpeed, setTtsSpeed] = useState(0.9);
  const [ttsVoice, setTtsVoice] = useState('');
  const [autoScrollAudio, setAutoScrollAudio] = useState(true);
  const [autoAdvanceAudio, setAutoAdvanceAudio] = useState(false);

  const preferencesRestoredRef = useRef(false);
  const isFirstBookMountRef = useRef(true);
  const isFirstTabMountRef = useRef(true);

  // Hardware Back & Swipe Gesture Support for Installed PWA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (mobileStudyView !== 'reader') {
        setMobileStudyView('reader');
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isLectioModalOpen) {
        setIsLectioModalOpen(false);
        return;
      }
      if (dailyVerseModal.isOpen) {
        setDailyVerseModal(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (isVerseInterlinearOpen) {
        setIsVerseInterlinearOpen(false);
        return;
      }
      if (backlinksDrawerState.isOpen) {
        setBacklinksDrawerState(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (toolbarPosition) {
        setToolbarPosition(null);
        setSelectionVerse(null);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    mobileStudyView,
    isSettingsOpen,
    isLectioModalOpen,
    dailyVerseModal.isOpen,
    isVerseInterlinearOpen,
    backlinksDrawerState.isOpen,
    toolbarPosition,
  ]);

  // Restore all saved session preferences & temporary UI states on mount
  useEffect(() => {
    if (preferencesRestoredRef.current || typeof window === 'undefined') return;
    preferencesRestoredRef.current = true;

    // 1. Active Tab
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as ValidTab)) {
      setActiveTab(tabParam);
    } else {
      const savedTab = getPreference(PREF_KEYS.ACTIVE_TAB);
      if (savedTab && VALID_TABS.includes(savedTab as ValidTab)) {
        setActiveTab(savedTab);
      }
    }

    // 2. Translation
    const savedTranslation = getPreference(PREF_KEYS.BIBLE_VERSION);
    if (savedTranslation && AVAILABLE_TRANSLATIONS.some(t => t.id.toLowerCase() === savedTranslation.toLowerCase())) {
      setTranslation(savedTranslation.toLowerCase());
    }

    // 3. Book & Chapter
    const savedBookName = getPreference(PREF_KEYS.LAST_BOOK);
    let targetBook = OT_BOOKS[0];
    if (savedBookName) {
      const found = ALL_BOOKS.find(b => b.name.toLowerCase() === savedBookName.toLowerCase());
      if (found) {
        targetBook = found;
        setActiveBook(found);
      }
    }

    const savedChapterStr = getPreference(PREF_KEYS.LAST_CHAPTER);
    if (savedChapterStr) {
      const parsed = parseInt(savedChapterStr, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        const clamped = Math.min(Math.max(1, parsed), targetBook.chapters);
        setActiveChapter(clamped);
      }
    }

    // 4. Layout Sidebars (read saved boolean defaults, falling back to false for left & bottom to maintain calm 2-panel default)
    setShowLeftSidebar(getBooleanPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR, false));
    setShowRightSidebar(getBooleanPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR, true));
    setShowBottomNotes(getBooleanPreference(PREF_KEYS.SHOW_BOTTOM_NOTES, false));
    setIsSplitView(getBooleanPreference(PREF_KEYS.IS_SPLIT_VIEW, false));

    // 5. Mobile Study View
    const mobileViewPref = getPreference(PREF_KEYS.MOBILE_STUDY_VIEW);
    if (mobileViewPref && VALID_MOBILE_VIEWS.includes(mobileViewPref as ValidMobileView)) {
      setMobileStudyView(mobileViewPref as ValidMobileView);
    }

    // 6. Devotional Time
    const devoTimePref = getPreference(PREF_KEYS.DEVOTIONAL_TIME);
    if (devoTimePref === 'morning' || devoTimePref === 'evening') {
      setDevotionalTime(devoTimePref);
    }

    // 7. Theme, Accent & Tracker
    const savedTheme = getPreference(PREF_KEYS.THEME) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'sepia') {
      setTheme(savedTheme);
      if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
      else if (savedTheme === 'sepia') document.documentElement.setAttribute('data-theme', 'sepia');
      else document.documentElement.removeAttribute('data-theme');
    }

    const savedAccent = getPreference(PREF_KEYS.ACCENT_COLOR);
    if (savedAccent) {
      setAccentColor(savedAccent);
      document.documentElement.style.setProperty('--accent', savedAccent);
    }

    const savedTracker = getPreference(PREF_KEYS.TRACKER_FORMAT) as 'percent' | 'fraction';
    if (savedTracker === 'percent' || savedTracker === 'fraction') setTrackerFormat(savedTracker);

    const savedGoal = getPreference(PREF_KEYS.DAILY_CHAPTER_GOAL);
    if (savedGoal) {
      const parsed = parseInt(savedGoal, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) setDailyChapterGoal(parsed);
    }

    // 8. Reader Preferences
    const savedFont = getPreference(PREF_KEYS.READER_FONT_FAMILY) as ReaderFontFamily;
    if (savedFont && ['serif', 'sans', 'mono'].includes(savedFont)) setReaderFontFamily(savedFont);

    const savedSize = getPreference(PREF_KEYS.READER_FONT_SIZE) as ReaderFontSize;
    if (savedSize && ['sm', 'md', 'lg', 'xl'].includes(savedSize)) setReaderFontSize(savedSize);

    const savedLeading = getPreference(PREF_KEYS.READER_LINE_HEIGHT) as ReaderLineHeight;
    if (savedLeading && ['compact', 'standard', 'relaxed'].includes(savedLeading)) setReaderLineHeight(savedLeading);

    const savedLayout = getPreference(PREF_KEYS.READER_LAYOUT) as ReaderLayout;
    if (savedLayout && ['verse', 'paragraph'].includes(savedLayout)) setReaderLayout(savedLayout);

    const savedVerseNums = getPreference(PREF_KEYS.SHOW_VERSE_NUMBERS);
    if (savedVerseNums !== '') setShowVerseNumbers(savedVerseNums === 'true');

    const savedFootnotesPref = getPreference(PREF_KEYS.SHOW_FOOTNOTES);
    if (savedFootnotesPref !== '') setShowFootnotes(savedFootnotesPref === 'true');

    const savedBacklinks = getPreference(PREF_KEYS.SHOW_BACKLINKS_BADGES);
    if (savedBacklinks !== '') setShowBacklinksBadges(savedBacklinks === 'true');

    // 9. Audio Preferences
    const savedSpeed = getPreference(PREF_KEYS.TTS_SPEED);
    if (savedSpeed) {
      const parsed = parseFloat(savedSpeed);
      if (!isNaN(parsed) && parsed > 0.4 && parsed < 3) setTtsSpeed(parsed);
    }

    const savedVoice = getPreference(PREF_KEYS.TTS_VOICE);
    if (savedVoice) setTtsVoice(savedVoice);

    const savedAutoScroll = getPreference(PREF_KEYS.AUDIO_AUTO_SCROLL);
    if (savedAutoScroll !== '') setAutoScrollAudio(savedAutoScroll === 'true');

    const savedAutoAdvance = getPreference(PREF_KEYS.AUDIO_AUTO_ADVANCE);
    if (savedAutoAdvance !== '') setAutoAdvanceAudio(savedAutoAdvance === 'true');

    // 10. Study & AI — default to 'standard' (General Balanced AI) unless user explicitly changed it in Settings
    const savedUserLens = getPreference(PREF_KEYS.USER_DEFAULT_LENS) as TheologicalLensType;
    if (savedUserLens && THEOLOGICAL_LENS_OPTIONS.some(o => o.id === savedUserLens)) {
      setTheologicalLens(savedUserLens);
    } else {
      setTheologicalLens('standard');
      setPreference(PREF_KEYS.THEOLOGICAL_LENS, 'standard');
    }

    // 11. Tracker Collections
    const savedTestaments = getPreference(PREF_KEYS.TRACKER_EXPANDED_TESTAMENTS);
    if (savedTestaments) {
      try {
        const parsed = JSON.parse(savedTestaments);
        if (Array.isArray(parsed)) setExpandedTestaments(parsed);
      } catch {}
    }

    const savedExpBooks = getPreference(PREF_KEYS.TRACKER_EXPANDED_BOOKS);
    if (savedExpBooks) {
      try {
        const parsed = JSON.parse(savedExpBooks);
        if (Array.isArray(parsed)) setExpandedBooks(parsed);
      } catch {}
    }
  }, []);

  // Synchronously apply saved panel defaults before first paint on client hydration
  useLayoutEffect(() => {
    setShowLeftSidebar(getBooleanPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR, false));
    setShowRightSidebar(getBooleanPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR, true));
    setShowBottomNotes(getBooleanPreference(PREF_KEYS.SHOW_BOTTOM_NOTES, false));
    setIsSplitView(getBooleanPreference(PREF_KEYS.IS_SPLIT_VIEW, false));
  }, []);

  // Record clicked book's screen Y coordinate before collapsing/expanding another book
  const handleBookAccordionToggle = useCallback((
    e: React.MouseEvent<HTMLElement>,
    bookName: string,
    container: HTMLElement | null
  ) => {
    e.preventDefault();
    if (container) {
      pendingBookScrollAnchorRef.current = {
        container,
        summaryEl: e.currentTarget,
        beforeTop: e.currentTarget.getBoundingClientRect().top,
      };
    }
    setExpandedBook((prev) => (prev === bookName ? null : bookName));
  }, []);

  // Synchronously adjust scrollTop after accordion layout change so the clicked book stays at its exact screen position
  useLayoutEffect(() => {
    const anchor = pendingBookScrollAnchorRef.current;
    if (!anchor) return;
    pendingBookScrollAnchorRef.current = null;
    const afterTop = anchor.summaryEl.getBoundingClientRect().top;
    const delta = afterTop - anchor.beforeTop;
    if (Math.abs(delta) > 0.5) {
      anchor.container.scrollTop += delta;
    }
  }, [expandedBook]);

  // Persist translation version
  useEffect(() => {
    if (typeof window !== 'undefined' && translation) {
      setPreference(PREF_KEYS.BIBLE_VERSION, translation);
    }
  }, [translation]);

  // Persist active book & chapter (guarded so initial load doesn't expand books)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeBook?.name && activeChapter) {
      setPreference(PREF_KEYS.LAST_BOOK, activeBook.name);
      setPreference(PREF_KEYS.LAST_CHAPTER, activeChapter.toString());
    }
    if (isFirstBookMountRef.current) {
      isFirstBookMountRef.current = false;
      return;
    }
    if (activeBook?.name) {
      setExpandedBook(activeBook.name);
      trackClientEvent('scripture_read', {
        book: activeBook.name,
        chapter: activeChapter,
        translation: translation.toUpperCase(),
      });
    }
  }, [activeBook.name, activeChapter, translation]);

  // Persist layout sidebars after initial preferences have been restored
  useEffect(() => {
    if (typeof window !== 'undefined' && preferencesRestoredRef.current) {
      setPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR, String(showLeftSidebar));
      setPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR, String(showRightSidebar));
      setPreference(PREF_KEYS.SHOW_BOTTOM_NOTES, String(showBottomNotes));
    }
  }, [showLeftSidebar, showRightSidebar, showBottomNotes]);

  // Persist mobile study view
  useEffect(() => {
    if (typeof window !== 'undefined' && mobileStudyView) {
      setPreference(PREF_KEYS.MOBILE_STUDY_VIEW, mobileStudyView);
    }
  }, [mobileStudyView]);

  // Persist devotional time
  useEffect(() => {
    if (typeof window !== 'undefined' && devotionalTime) {
      setPreference(PREF_KEYS.DEVOTIONAL_TIME, devotionalTime);
    }
  }, [devotionalTime]);

  // Persist tracker tree expansion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPreference(PREF_KEYS.TRACKER_EXPANDED_TESTAMENTS, JSON.stringify(expandedTestaments));
      setPreference(PREF_KEYS.TRACKER_EXPANDED_BOOKS, JSON.stringify(expandedBooks));
    }
  }, [expandedTestaments, expandedBooks]);

  // Persist active note ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeNoteId !== null) {
        setPreference(PREF_KEYS.ACTIVE_NOTE_ID, String(activeNoteId));
      } else {
        removePreference(PREF_KEYS.ACTIVE_NOTE_ID);
      }
    }
  }, [activeNoteId]);


  // Persist active chat ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeChatId !== null) {
        setPreference(PREF_KEYS.ACTIVE_CHAT_ID, String(activeChatId));
      } else {
        removePreference(PREF_KEYS.ACTIVE_CHAT_ID);
      }
    }
  }, [activeChatId]);

  // Synchronous flush on tab close / background
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      flushPreferences({
        [PREF_KEYS.ACTIVE_TAB]: activeTab,
        [PREF_KEYS.BIBLE_VERSION]: translation,
        [PREF_KEYS.LAST_BOOK]: activeBook.name,
        [PREF_KEYS.LAST_CHAPTER]: activeChapter.toString(),
        [PREF_KEYS.SHOW_LEFT_SIDEBAR]: String(showLeftSidebar),
        [PREF_KEYS.SHOW_RIGHT_SIDEBAR]: String(showRightSidebar),
        [PREF_KEYS.SHOW_BOTTOM_NOTES]: String(showBottomNotes),
        [PREF_KEYS.IS_SPLIT_VIEW]: String(isSplitView),
        [PREF_KEYS.MOBILE_STUDY_VIEW]: mobileStudyView,
        [PREF_KEYS.DEVOTIONAL_TIME]: devotionalTime,
        [PREF_KEYS.THEME]: theme,
        [PREF_KEYS.ACCENT_COLOR]: accentColor,
        [PREF_KEYS.TRACKER_FORMAT]: trackerFormat,
        [PREF_KEYS.DAILY_CHAPTER_GOAL]: String(dailyChapterGoal),
        [PREF_KEYS.READER_FONT_FAMILY]: readerFontFamily,
        [PREF_KEYS.READER_FONT_SIZE]: readerFontSize,
        [PREF_KEYS.READER_LINE_HEIGHT]: readerLineHeight,
        [PREF_KEYS.READER_LAYOUT]: readerLayout,
        [PREF_KEYS.SHOW_VERSE_NUMBERS]: String(showVerseNumbers),
        [PREF_KEYS.SHOW_FOOTNOTES]: String(showFootnotes),
        [PREF_KEYS.SHOW_BACKLINKS_BADGES]: String(showBacklinksBadges),
        [PREF_KEYS.TTS_SPEED]: String(ttsSpeed),
        [PREF_KEYS.TTS_VOICE]: ttsVoice,
        [PREF_KEYS.AUDIO_AUTO_SCROLL]: String(autoScrollAudio),
        [PREF_KEYS.AUDIO_AUTO_ADVANCE]: String(autoAdvanceAudio),
        [PREF_KEYS.THEOLOGICAL_LENS]: theologicalLens,
        ...(activeNoteId !== null ? { [PREF_KEYS.ACTIVE_NOTE_ID]: String(activeNoteId) } : {}),
        ...(activeChatId !== null ? { [PREF_KEYS.ACTIVE_CHAT_ID]: String(activeChatId) } : {}),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    activeTab,
    translation,
    activeBook.name,
    activeChapter,
    showLeftSidebar,
    showRightSidebar,
    showBottomNotes,
    mobileStudyView,
    devotionalTime,
    theme,
    accentColor,
    trackerFormat,
    dailyChapterGoal,
    readerFontFamily,
    readerFontSize,
    readerLineHeight,
    readerLayout,
    showVerseNumbers,
    showFootnotes,
    showBacklinksBadges,
    ttsSpeed,
    ttsVoice,
    autoScrollAudio,
    autoAdvanceAudio,
    theologicalLens,
    activeNoteId,
    activeChatId,
  ]);

  // Dynamic favicon and theme sync effect across browser tab and mobile
  useEffect(() => {
    const iconUrl = (theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png';

    // 1. Update dynamic favicon
    const favLink = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
    if (favLink) {
      favLink.href = `${iconUrl}?v=${theme}`;
    }

    // 2. Update dynamic apple-touch-icon
    const appleLink = document.getElementById('dynamic-apple-icon') as HTMLLinkElement | null;
    if (appleLink) {
      appleLink.href = `${iconUrl}?v=${theme}`;
    }

    // 3. Update any other icon links
    document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach(link => {
      link.href = `${iconUrl}?v=${theme}`;
    });

    // 4. Update theme-color meta for mobile address bar
    const themeColor = theme === 'light' ? '#faf9f5' : theme === 'sepia' ? '#f8f1e3' : '#141413';
    let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;
  }, [theme]);

  // Measure Bible reader header width and title width (both desktop and mobile) via ResizeObserver
  const measureWidths = useCallback(() => {
    const containerEl = readerHeaderRef.current || readerContainerRef.current;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      if (rect.width > 0) {
        setReaderHeaderWidth(rect.width);
      }
    }
    if (readerTitleRef.current) {
      const titleRect = readerTitleRef.current.getBoundingClientRect();
      if (titleRect.width > 0) {
        setReaderTitleWidth(titleRect.width);
      }
    }
    if (mobileReaderHeaderRef.current) {
      const mRect = mobileReaderHeaderRef.current.getBoundingClientRect();
      if (mRect.width > 0) {
        setMobileReaderHeaderWidth(mRect.width);
      }
    }
    if (mobileReaderTitleRef.current) {
      const mTitleRect = mobileReaderTitleRef.current.getBoundingClientRect();
      if (mTitleRect.width > 0) {
        setMobileReaderTitleWidth(mTitleRect.width);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'study') return;

    measureWidths();

    const observer = new ResizeObserver(() => {
      measureWidths();
    });

    if (readerContainerRef.current) observer.observe(readerContainerRef.current);
    if (readerHeaderRef.current) observer.observe(readerHeaderRef.current);
    if (readerTitleRef.current) observer.observe(readerTitleRef.current);
    if (mobileReaderHeaderRef.current) observer.observe(mobileReaderHeaderRef.current);
    if (mobileReaderTitleRef.current) observer.observe(mobileReaderTitleRef.current);

    window.addEventListener('resize', measureWidths);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureWidths);
    };
  }, [activeTab, isLoaded, authTimeout, showLeftSidebar, showRightSidebar, activeBook.name, activeChapter, measureWidths]);

  // Available width in the desktop reader header after accounting for the chapter title and horizontal padding (~48px)
  const availableToolsWidth = Math.max(0, readerHeaderWidth - readerTitleWidth - 48);

  // Progressive study tools collapse thresholds based on actual measured button widths:
  // Permanent right controls (Audio ~36px, divider ~5px, Translation ~68px, 3-dots ~36px when active) = ~145px
  // Lectio (~82px) has highest priority to remain visible next to the chapter control whenever space allows:
  // - Lectio only: ~145 + 82 = ~227px
  // Desktop collapsible study tools visibility based on available tools container width:
  const showBacklinksInBar = availableToolsWidth >= 565;
  const showInterlinearInBar = availableToolsWidth >= 475;
  const showMarkCompleteInBar = availableToolsWidth >= 365;
  const showLectioInBar = availableToolsWidth >= 225;
  const hasCollapsedStudyTools = !showBacklinksInBar || !showLectioInBar || !showInterlinearInBar || !showMarkCompleteInBar;

  // Outside click handler for desktop 3-dots study options menu
  useEffect(() => {
    if (!isDesktopMoreMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (desktopMoreMenuRef.current && !desktopMoreMenuRef.current.contains(target)) {
        setIsDesktopMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isDesktopMoreMenuOpen]);

  // Outside click handler for split view book/chapter selector
  useEffect(() => {
    if (!isSplitBookSelectorOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (splitBookSelectorRef.current && !splitBookSelectorRef.current.contains(target)) {
        setIsSplitBookSelectorOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSplitBookSelectorOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSplitBookSelectorOpen]);

  // Unified Settings Handlers
  const handleToggleLeftSidebar = useCallback((val: boolean) => {
    setShowLeftSidebar(val);
    setPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR, String(val));
  }, []);

  const handleToggleRightSidebar = useCallback((val: boolean) => {
    setShowRightSidebar(val);
    setPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR, String(val));
  }, []);

  const handleToggleBottomNotes = useCallback((val: boolean) => {
    setShowBottomNotes(val);
    setPreference(PREF_KEYS.SHOW_BOTTOM_NOTES, String(val));
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'sepia') => {
    setTheme(newTheme);
    setPreference(PREF_KEYS.THEME, newTheme);
    if (newTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else if (newTheme === 'sepia') document.documentElement.setAttribute('data-theme', 'sepia');
    else document.documentElement.removeAttribute('data-theme');
  };

  const handleAccentColorChange = (hex: string) => {
    setAccentColor(hex);
    setPreference(PREF_KEYS.ACCENT_COLOR, hex);
    document.documentElement.style.setProperty('--accent', hex);
  };

  const handleReaderFontFamilyChange = (val: ReaderFontFamily) => {
    setReaderFontFamily(val);
    setPreference(PREF_KEYS.READER_FONT_FAMILY, val);
  };

  // Layout preset toggle (Focus Mode vs. Scholar Workspace)
  const isFocusMode = !showLeftSidebar && !showBottomNotes && !showRightSidebar;
  const handleToggleWorkspacePreset = useCallback(() => {
    if (!showLeftSidebar && !showBottomNotes && !showRightSidebar) {
      handleToggleLeftSidebar(true);
      handleToggleBottomNotes(true);
      handleToggleRightSidebar(true);
    } else {
      handleToggleLeftSidebar(false);
      handleToggleBottomNotes(false);
      handleToggleRightSidebar(false);
    }
  }, [showLeftSidebar, showBottomNotes, showRightSidebar, handleToggleLeftSidebar, handleToggleBottomNotes, handleToggleRightSidebar]);

  const handleReaderFontSizeChange = (val: ReaderFontSize) => {
    setReaderFontSize(val);
    setPreference(PREF_KEYS.READER_FONT_SIZE, val);
  };

  const handleReaderLineHeightChange = (val: ReaderLineHeight) => {
    setReaderLineHeight(val);
    setPreference(PREF_KEYS.READER_LINE_HEIGHT, val);
  };

  const handleReaderLayoutChange = (val: ReaderLayout) => {
    setReaderLayout(val);
    setPreference(PREF_KEYS.READER_LAYOUT, val);
  };

  const handleToggleVerseNumbers = (val: boolean) => {
    setShowVerseNumbers(val);
    setPreference(PREF_KEYS.SHOW_VERSE_NUMBERS, String(val));
  };

  const handleToggleFootnotes = (val: boolean) => {
    setShowFootnotes(val);
    setPreference(PREF_KEYS.SHOW_FOOTNOTES, String(val));
  };

  const handleToggleBacklinksBadges = (val: boolean) => {
    setShowBacklinksBadges(val);
    setPreference(PREF_KEYS.SHOW_BACKLINKS_BADGES, String(val));
  };

  const handleTtsSpeedChange = (val: number) => {
    setTtsSpeed(val);
    setPreference(PREF_KEYS.TTS_SPEED, String(val));
  };

  const handleTtsVoiceChange = (val: string) => {
    setTtsVoice(val);
    setPreference(PREF_KEYS.TTS_VOICE, val);
  };

  const handleToggleAutoScrollAudio = (val: boolean) => {
    setAutoScrollAudio(val);
    setPreference(PREF_KEYS.AUDIO_AUTO_SCROLL, String(val));
  };

  const handleToggleAutoAdvanceAudio = (val: boolean) => {
    setAutoAdvanceAudio(val);
    setPreference(PREF_KEYS.AUDIO_AUTO_ADVANCE, String(val));
  };

  const handleTheologicalLensChange = (lens: TheologicalLensType) => {
    setTheologicalLens(lens);
    setPreference(PREF_KEYS.THEOLOGICAL_LENS, lens);
    setPreference(PREF_KEYS.USER_DEFAULT_LENS, lens);
  };

  const handleDailyChapterGoalChange = (goal: number) => {
    setDailyChapterGoal(goal);
    setPreference(PREF_KEYS.DAILY_CHAPTER_GOAL, String(goal));
    queueStreakPush(fetchWithAuth, goal, 150);
  };

  const handleDefaultTranslationChange = (version: string) => {
    setTranslation(version.toLowerCase());
    setPreference(PREF_KEYS.BIBLE_VERSION, version.toLowerCase());
  };

  const handleTrackerFormatChange = (newFormat: 'percent' | 'fraction') => {
    setTrackerFormat(newFormat);
    setPreference(PREF_KEYS.TRACKER_FORMAT, newFormat);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    handleThemeChange(newTheme);
  };

  const toggleTrackerFormat = () => {
    const newFormat = trackerFormat === 'percent' ? 'fraction' : 'percent';
    handleTrackerFormatChange(newFormat);
  };

  // Reader Dynamic CSS Classes
  const getReaderFontClass = () => {
    if (readerFontFamily === 'sans') return 'font-sans-reader';
    if (readerFontFamily === 'mono') return 'font-mono-reader';
    return 'font-serif';
  };

  const getReaderSizeClass = (isMobile = false) => {
    if (readerFontSize === 'sm') return isMobile ? 'text-[16px]' : 'text-[15px] sm:text-[16px]';
    if (readerFontSize === 'lg') return isMobile ? 'text-[20px]' : 'text-[19px] sm:text-[20px]';
    if (readerFontSize === 'xl') return isMobile ? 'text-[23px]' : 'text-[22px] sm:text-[23px]';
    return isMobile ? 'text-[18px]' : 'text-[17px] sm:text-[18px]';
  };

  const getReaderLeadingClass = () => {
    if (isInterlinearMode) {
      if (readerLineHeight === 'compact') return 'leading-[2.4] sm:leading-[2.5]';
      if (readerLineHeight === 'relaxed') return 'leading-[3.0] sm:leading-[3.2]';
      return 'leading-[2.6] sm:leading-[2.8]';
    }
    if (readerLineHeight === 'compact') return 'leading-[1.55] sm:leading-[1.6]';
    if (readerLineHeight === 'relaxed') return 'leading-[2.15] sm:leading-[2.25]';
    return 'leading-[1.85]';
  };

  // Data Export & Import Handlers
  const handleExportData = () => {
    try {
      const exportPayload = {
        appName: "Theologica",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        preferences: {
          theme,
          accentColor,
          readerFontFamily,
          readerFontSize,
          readerLineHeight,
          readerLayout,
          showVerseNumbers,
          showFootnotes,
          showBacklinksBadges,
          ttsSpeed,
          ttsVoice,
          autoScrollAudio,
          autoAdvanceAudio,
          defaultTranslation: translation,
          theologicalLens,
          trackerFormat,
          dailyChapterGoal,
          completedChapters,
        },
        notes,
        highlights,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theologica-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const handleImportData = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') return false;

      // 1. Restore preferences
      if (data.preferences) {
        const p = data.preferences;
        if (p.theme && ['dark', 'light', 'sepia'].includes(p.theme)) {
          handleThemeChange(p.theme);
        }
        if (p.accentColor) {
          handleAccentColorChange(p.accentColor);
        }
        if (p.readerFontFamily && ['serif', 'sans', 'mono'].includes(p.readerFontFamily)) {
          handleReaderFontFamilyChange(p.readerFontFamily);
        }
        if (p.readerFontSize && ['sm', 'md', 'lg', 'xl'].includes(p.readerFontSize)) {
          handleReaderFontSizeChange(p.readerFontSize);
        }
        if (p.readerLineHeight && ['compact', 'standard', 'relaxed'].includes(p.readerLineHeight)) {
          handleReaderLineHeightChange(p.readerLineHeight);
        }
        if (p.readerLayout && ['verse', 'paragraph'].includes(p.readerLayout)) {
          handleReaderLayoutChange(p.readerLayout);
        }
        if (typeof p.showVerseNumbers === 'boolean') {
          handleToggleVerseNumbers(p.showVerseNumbers);
        }
        if (typeof p.showFootnotes === 'boolean') {
          handleToggleFootnotes(p.showFootnotes);
        }
        if (typeof p.showBacklinksBadges === 'boolean') {
          handleToggleBacklinksBadges(p.showBacklinksBadges);
        }
        if (typeof p.ttsSpeed === 'number') {
          handleTtsSpeedChange(p.ttsSpeed);
        }
        if (p.ttsVoice) {
          handleTtsVoiceChange(p.ttsVoice);
        }
        if (typeof p.autoScrollAudio === 'boolean') {
          handleToggleAutoScrollAudio(p.autoScrollAudio);
        }
        if (typeof p.autoAdvanceAudio === 'boolean') {
          handleToggleAutoAdvanceAudio(p.autoAdvanceAudio);
        }
        if (p.theologicalLens) {
          handleTheologicalLensChange(p.theologicalLens);
        }
        if (p.trackerFormat && ['percent', 'fraction'].includes(p.trackerFormat)) {
          handleTrackerFormatChange(p.trackerFormat);
        }
        if (typeof p.dailyChapterGoal === 'number') {
          handleDailyChapterGoalChange(p.dailyChapterGoal);
        }
        if (Array.isArray(p.completedChapters)) {
          setCompletedChapters(p.completedChapters);
        }
      }

      // 2. Restore notes if provided
      if (Array.isArray(data.notes) && data.notes.length > 0) {
        for (const note of data.notes) {
          if (note.title !== undefined) {
            try {
              const res = await fetchWithAuth(`${API_URL}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: note.title, content: note.content || '' })
              });
              if (res.ok) {
                const created = await res.json();
                setNotes(prev => [created, ...prev.filter(n => n.id !== created.id)]);
              }
            } catch {}
          }
        }
      }

      // 3. Restore highlights if provided
      if (Array.isArray(data.highlights) && data.highlights.length > 0) {
        for (const hl of data.highlights) {
          if (hl.book && hl.chapter && hl.verse && hl.text && hl.color) {
            try {
              const res = await fetchWithAuth(`${API_URL}/api/highlights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  book: hl.book,
                  chapter: hl.chapter,
                  verse: hl.verse,
                  text: hl.text,
                  color: hl.color
                })
              });
              if (res.ok) {
                const created = await res.json();
                setHighlights(prev => [...prev.filter(h => h.id !== created.id), created]);
              }
            } catch {}
          }
        }
      }

      return true;
    } catch (e) {
      console.error("Import error", e);
      return false;
    }
  };

  const handleResetPreferences = () => {
    handleThemeChange('dark');
    handleAccentColorChange('#c96442');
    handleReaderFontFamilyChange('serif');
    handleReaderFontSizeChange('md');
    handleReaderLineHeightChange('standard');
    handleReaderLayoutChange('verse');
    handleToggleVerseNumbers(true);
    handleToggleFootnotes(true);
    handleToggleBacklinksBadges(true);
    handleTtsSpeedChange(0.9);
    handleTtsVoiceChange('');
    handleToggleAutoScrollAudio(true);
    handleToggleAutoAdvanceAudio(false);
    handleTheologicalLensChange('standard');
    handleTrackerFormatChange('percent');
    handleDailyChapterGoalChange(3);
    handleToggleLeftSidebar(true);
    handleToggleRightSidebar(true);
    handleToggleBottomNotes(true);
  };
  const [chatInput, setChatInput] = useState('');
  const [chatQuotes, setChatQuotes] = useState<{id: string, text: string, reference: string}[]>([]);
  const [chatImage, setChatImage] = useState<{base64: string, mimeType: string, preview: string, name?: string} | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    type: 'image' | 'pdf' | 'document';
    base64?: string;
    preview?: string;
    textContent?: string;
  } | null>(null);
  const [fileUploadStatus, setFileUploadStatus] = useState<string | null>(null);
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const processSelectedFile = useCallback((file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File is too large. Please select a file under 20MB.');
      return;
    }

    setFileUploadStatus(`Adding "${file.name}" to conversation...`);

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setChatImage({ base64, mimeType: file.type || 'image/jpeg', preview: dataUrl, name: file.name });
        setAttachedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          preview: dataUrl,
          base64,
          type: 'image',
        });
        setFileUploadStatus(`Added "${file.name}" to conversation`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.onerror = () => {
        setFileUploadStatus(`Failed to read "${file.name}"`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setChatImage({ base64, mimeType: 'application/pdf', preview: '', name: file.name });
        setAttachedFile({
          name: file.name,
          size: file.size,
          mimeType: 'application/pdf',
          base64,
          type: 'pdf',
        });
        setFileUploadStatus(`Added "${file.name}" to conversation`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.onerror = () => {
        setFileUploadStatus(`Failed to read "${file.name}"`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setAttachedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'text/plain',
          textContent: text,
          type: 'document',
        });
        setFileUploadStatus(`Added "${file.name}" to conversation`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.onerror = () => {
        setFileUploadStatus(`Failed to read "${file.name}"`);
        setTimeout(() => setFileUploadStatus(null), 3500);
      };
      reader.readAsText(file);
    }
  }, []);

  const removeAttachedFile = useCallback(() => {
    setAttachedFile(null);
    setChatImage(null);
    setFileUploadStatus(null);
    if (imageFileRef.current) {
      imageFileRef.current.value = '';
    }
  }, []);

  const dragCounterRef = useRef(0);

  const handleChatDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounterRef.current += 1;
      setIsDraggingOverChat(true);
    }
  }, []);

  const handleChatDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOverChat(true);
    }
  }, []);

  const handleChatDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOverChat(false);
    }
  }, []);

  const handleChatDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOverChat(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  }, [processSelectedFile]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiActivityStatus, setAiActivityStatus] = useState('Ready');
  const [aiThinkingText, setAiThinkingText] = useState('');
  const [aiActivityType, setAiActivityType] = useState<'study' | 'image'>('study');
  interface AttachedScriptureContext {
    reference: string;
    text: string;
    translation: string;
    isSpecificVerse?: boolean;
  }

  const [attachedScripture, setAttachedScripture] = useState<AttachedScriptureContext | null>(null);
  const [includeOriginalRoots, setIncludeOriginalRoots] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getPreference(PREF_KEYS.INCLUDE_ORIGINAL_ROOTS) === 'true';
  });

  const handleToggleOriginalRoots = (enabled: boolean) => {
    setIncludeOriginalRoots(enabled);
    setPreference(PREF_KEYS.INCLUDE_ORIGINAL_ROOTS, enabled ? 'true' : 'false');
  };
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const mobileStudyChatScrollRef = useRef<HTMLDivElement>(null);
  const desktopStudyChatScrollRef = useRef<HTMLDivElement>(null);
  const fullChatScrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottomOnChatOpenRef = useRef(false);

  // Scrolls chat containers to the bottom (used when opening existing chats)
  const scrollChatToBottom = useCallback(() => {
    const scrollEls = () => {
      [mobileStudyChatScrollRef.current, desktopStudyChatScrollRef.current, fullChatScrollRef.current].forEach(el => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    };
    scrollEls();
    requestAnimationFrame(scrollEls);
    setTimeout(scrollEls, 50);
    setTimeout(scrollEls, 150);
  }, []);

  // Opens an existing chat, marks all existing messages as seen (no typewriter), and leaves user at the bottom
  const openExistingChat = useCallback((id: number) => {
    setChats(currentChats => {
      const target = currentChats.find(c => c.id === id);
      if (target?.messages) {
        target.messages.forEach(m => {
          if (m?.content) seenMessages.add(m.content);
        });
      }
      return currentChats;
    });
    setActiveChatId(id);
    setMobileChatView('chat');
    scrollToBottomOnChatOpenRef.current = true;
    scrollChatToBottom();
  }, [scrollChatToBottom]);

  useEffect(() => {
    if (!isAiTyping) {
      setAiActivityStatus('Ready');
      setAiThinkingText('');
    }
  }, [isAiTyping]);

  // Ecosystem action: Save AI chat message to notes
  const saveChatMessageToNotes = useCallback(async (content: string, title?: string) => {
    try {
      const { textContent, theologicalLens: msgLens } = parseAiMessage(content);
      const effectiveLens = msgLens || theologicalLens;
      const lensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === effectiveLens);
      const noteTitle = title ? `Study AI: ${title}` : `Study AI: ${activeBook?.name || 'Scripture'} ${activeChapter} (${lensMeta?.name || 'Study'})`;
      const contentWithTags = `${textContent}\n\n#aichat #studyai #${effectiveLens}`;
      
      const tempId = Date.now();
      const localNote: NoteItem = {
        id: tempId,
        title: noteTitle,
        content: contentWithTags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically save to state and localStorage immediately
      setNotes(prev => {
        const next = [localNote, ...prev.filter(n => n.id !== tempId)];
        saveLocalNotes(next);
        return next;
      });
      setActiveNoteId(tempId);
      trackClientEvent('note_created_from_chat');

      // Sync to API in background
      try {
        const res = await fetchWithAuth(`${API_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle,
            content: contentWithTags,
          }),
        });
        if (res && res.ok) {
          const serverNote = await res.json();
          if (serverNote && serverNote.id) {
            setNotes(prev => {
              const next = prev.map(n => n.id === tempId ? serverNote : n);
              saveLocalNotes(next);
              return next;
            });
            setActiveNoteId(prevId => prevId === tempId ? serverNote.id : prevId);
          }
        }
      } catch (syncErr) {
        console.warn('Note API sync error (offline preserved):', syncErr);
      }

      return true;
    } catch (err) {
      console.error('Failed to save chat insight to notes:', err);
      return false;
    }
  }, [fetchWithAuth, theologicalLens, activeBook, activeChapter, saveLocalNotes]);

  // Load Data & Sync Account Streak across devices
  useEffect(() => {
    // Load local highlights & notes immediately
    const localHls = getLocalHighlights();
    if (localHls.length > 0) {
      setHighlights(localHls);
    }
    const localNotes = getLocalNotes();
    if (localNotes.length > 0) {
      setNotes(localNotes);
      if (localNotes[0]?.id) {
        setActiveNoteId(localNotes[0].id);
      }
    }

    // Always fetch notes (supports guest in-memory and user cloud)
    fetchWithAuth(`${API_URL}/api/notes`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setNotes(prev => {
            const map = new Map<number, NoteItem>();
            data.forEach((n: NoteItem) => map.set(n.id, n));
            prev.forEach((n: NoteItem) => {
              if (!map.has(n.id)) map.set(n.id, n);
            });
            const merged = Array.from(map.values());
            saveLocalNotes(merged);
            return merged;
          });
        }
      })
      .catch(() => {});

    if (userId) {
      initSessionTracking(userId);

      // Register sync callbacks so habit activities immediately push to account
      registerStreakSyncCallback(() => {
        queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 200);
      });

      fetchWithAuth(`${API_URL}/api/highlights`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (Array.isArray(data)) {
            setHighlights(prev => {
              const map = new Map<number, typeof prev[0]>();
              data.forEach(ch => map.set(ch.id, ch));
              // Keep pending local items not yet assigned server IDs
              prev.filter(h => h.id > 1000000000000).forEach(h => map.set(h.id, h));
              const merged = Array.from(map.values());
              saveLocalHighlights(merged);
              return merged;
            });
          }
        })
        .catch(e => console.warn("Using local highlights cache", e));

      fetchWithAuth(`${API_URL}/api/chats`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (Array.isArray(data)) {
            setChats(data);
            data.forEach((c: { title: string; messages?: { content: string }[] }) => {
              seenTitles.add(c.title);
              if (Array.isArray(c.messages)) {
                c.messages.forEach(m => {
                  if (m?.content) seenMessages.add(m.content);
                });
              }
            });
            const savedChatIdStr = getPreference(PREF_KEYS.ACTIVE_CHAT_ID);
            const savedChatId = savedChatIdStr ? parseInt(savedChatIdStr, 10) : null;
            if (savedChatId && data.some((c: { id: number }) => c.id === savedChatId)) {
              setActiveChatId(savedChatId);
              scrollToBottomOnChatOpenRef.current = true;
              scrollChatToBottom();
            } else {
              setActiveChatId(null);
            }
          }
        })
        .catch(() => {});

      fetchWithAuth(`${API_URL}/api/tracker`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (Array.isArray(data)) {
            setCompletedChapters(data.map((item: {chapterId: string}) => item.chapterId));
          }
        })
        .catch(() => {});

      // 1. Initial Pull: syncs streaks, habits, reading pace from account
      pullStreakFromAccount(fetchWithAuth, dailyChapterGoalRef.current).then(res => {
        if (res?.dailyChapterGoal && typeof res.dailyChapterGoal === 'number' && res.dailyChapterGoal > 0) {
          setDailyChapterGoal(res.dailyChapterGoal);
          setPreference(PREF_KEYS.DAILY_CHAPTER_GOAL, String(res.dailyChapterGoal));
        }
      });
    }

    // 2. High-speed cross-device sync: trigger pull whenever tab gains focus or becomes visible
    const handleAccountSyncOnActive = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        pullStreakFromAccount(fetchWithAuth, dailyChapterGoalRef.current).then(res => {
          if (res?.dailyChapterGoal && typeof res.dailyChapterGoal === 'number' && res.dailyChapterGoal > 0) {
            setDailyChapterGoal(res.dailyChapterGoal);
            setPreference(PREF_KEYS.DAILY_CHAPTER_GOAL, String(res.dailyChapterGoal));
          }
        });
      }
    };

    window.addEventListener('focus', handleAccountSyncOnActive);
    document.addEventListener('visibilitychange', handleAccountSyncOnActive);
    window.addEventListener('online', handleAccountSyncOnActive);

    // 3. Fast Heartbeat: every 15 seconds while app is open so dual-device usage stays in sync
    const syncInterval = setInterval(() => {
      handleAccountSyncOnActive();
    }, 15000);

    return () => {
      registerStreakSyncCallback(null);
      window.removeEventListener('focus', handleAccountSyncOnActive);
      document.removeEventListener('visibilitychange', handleAccountSyncOnActive);
      window.removeEventListener('online', handleAccountSyncOnActive);
      clearInterval(syncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Analytics: track major feature tab activations (only on explicit user transitions, not initial mount/restore)
  useEffect(() => {
    if (isFirstTabMountRef.current) {
      isFirstTabMountRef.current = false;
      return;
    }
    if (activeTab === 'canvas') {
      trackClientEvent('canvas_opened');
    } else if (activeTab === 'chats') {
      trackClientEvent('ai_chat_opened');
    }
  }, [activeTab]);

  // Helper to clean verse text and strip verse numbers cleanly without destroying legitimate scripture numbers
  const cleanVerseText = (rawText: string, startVerse?: number | null, endVerse?: number | null): string => {
    if (!rawText) return '';
    let cleaned = rawText.trim();
    
    const sVerse = startVerse && endVerse ? Math.min(startVerse, endVerse) : startVerse;
    const eVerse = startVerse && endVerse ? Math.max(startVerse, endVerse) : endVerse;

    // 1. Remove leading verse number if it matches the start verse (e.g. "1 In the beginning" or "16 For God")
    if (sVerse) {
      cleaned = cleaned.replace(new RegExp(`^${sVerse}\\s+`), '');
    }

    // 2. If multiple verses are spanned, remove verse numbers that appear between verses
    if (sVerse && eVerse && eVerse > sVerse) {
      for (let v = sVerse; v <= eVerse; v++) {
        cleaned = cleaned.replace(new RegExp(`\\s+${v}\\s+`, 'g'), ' ');
        cleaned = cleaned.replace(new RegExp(`([.!?,"';:])\\s*${v}\\s+`, 'g'), '$1 ');
      }
    }

    // 3. Remove any interlinear bracketed Strong's codes [H1234] or [G1234]
    cleaned = cleaned.replace(/\[\s*[HG]\d+\s*\]/g, '');

    // 4. Remove any HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // 5. Normalize multiple spaces / newlines
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  };

  // Clicking or tapping a verse opens the floating toolbar to highlight or study that verse
  const handleVerseClick = (e: React.MouseEvent | React.TouchEvent, verseNum: number) => {
    // If synthetic click fired right after touchend, ignore to prevent instant-toggle dismissal
    if (e.type === 'click' && Date.now() - lastTouchEndRef.current < 450) {
      return;
    }
    if (e.type === 'touchend') {
      lastTouchEndRef.current = Date.now();
    }

    // If user was actively selecting text (e.g. mouse drag selection), don't treat it as a whole-verse click
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target) {
      // Don't intercept button clicks inside the verse (e.g. interlinear or backlink badges)
      if (target.closest('button') || target.closest('[data-footnote="true"]')) {
        return;
      }
      // If clicking directly on an existing <mark>, let the mark's own handler handle it
      if (target.closest('mark')) {
        return;
      }
    }

    e.stopPropagation();

    console.log('[THEOLOGICA-HL] handleVerseClick triggered for verse:', verseNum);

    // Toggle off if currently selected and toolbar is open for this verse
    if (toolbarPosition && selectionVerse === verseNum && (!endVerseNumber || endVerseNumber === verseNum)) {
      setToolbarPosition(null);
      setSelectionVerse(null);
      setEndVerseNumber(null);
      setSelectedText('');
      const verseEls = document.querySelectorAll(`[data-verse="${verseNum}"]`);
      verseEls.forEach(el => (el as HTMLElement).classList.remove('verse-click-pulse'));
      window.getSelection()?.removeAllRanges();
      return;
    }

    const vObj = bibleVerses.find(v => v.verse === verseNum);
    if (!vObj) return;

    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }

    const cleanText = parseVerseFootnote(vObj.text).mainText;

    // Trigger clean quick fade-in / smooth fade-out pulse animation on click (like verse links)
    const verseEls = document.querySelectorAll(`[data-verse="${verseNum}"]`);
    verseEls.forEach(el => {
      const hEl = el as HTMLElement;
      hEl.classList.remove('verse-click-pulse');
      void hEl.offsetWidth; // force reflow for smooth animation restart
      hEl.classList.add('verse-click-pulse');
      setTimeout(() => {
        hEl.classList.remove('verse-click-pulse');
      }, 1500);
    });

    // Check if this verse has ANY highlight(s) in current chapter
    const verseHighlights = highlights.filter(h => 
      isSameBook(h.book, activeBook.name) && 
      Number(h.chapter) === Number(activeChapter) && 
      Number(h.verse) === Number(verseNum)
    );

    setSelectionVerse(verseNum);
    setEndVerseNumber(verseNum);
    setSelectedText(cleanText);

    const visibleVerseEl = Array.from(verseEls).find(el => (el as HTMLElement).offsetParent !== null) as HTMLElement | undefined || (verseEls[0] as HTMLElement | undefined);
    const rect = visibleVerseEl ? visibleVerseEl.getBoundingClientRect() : null;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const toolbarHalfWidth = winWidth <= 640 ? 155 : 195;

    // Center toolbar horizontally over the center of the verse text (not pinned to the left or verse number)
    let x: number;
    if (rect && rect.width > 0) {
      const verseCenterX = rect.left + rect.width / 2;
      x = winWidth <= 640 
        ? winWidth / 2 
        : Math.max(toolbarHalfWidth + 12, Math.min(winWidth - toolbarHalfWidth - 12, verseCenterX));
    } else {
      x = winWidth / 2;
    }

    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || winWidth <= 768);
    const isNearTop = rect ? rect.top < 130 : false;
    let y: number;
    let isBelow: boolean;

    if (isTouch) {
      isBelow = isNearTop || (rect ? rect.top < 140 : false);
      if (isBelow) {
        y = rect ? Math.min(winHeight - (winWidth <= 768 ? 95 : 70), rect.bottom + 8) : winHeight / 2;
      } else {
        y = rect ? Math.max(70, rect.top - 8) : winHeight / 2;
      }
    } else {
      isBelow = isNearTop;
      y = rect ? (isNearTop ? rect.bottom + 8 : Math.max(70, rect.top - 6)) : winHeight / 2;
      y = Math.max(70, Math.min(winHeight - 80, y));
    }

    setToolbarPosition({
      x,
      y,
      highlightId: verseHighlights.length > 0 ? verseHighlights[0].id : undefined,
      highlightIds: verseHighlights.map(h => h.id),
      isBelow
    });
  };

  const handleVerseNumberClick = handleVerseClick;

  // Highlighting & Drag Selection Logic
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const rawText = (selection.toString() || range.toString()).trim();
    // Do not trigger toolbar on empty text or isolated verse numbers
    if (!rawText || /^\d+$/.test(rawText)) return;
    let rect = range.getBoundingClientRect();
    if ((rect.width === 0 || rect.height === 0) && range.getClientRects().length > 0) {
      rect = range.getClientRects()[0];
    }
    if (rect.width === 0 && rect.height === 0) return;
    
    // Resolve the active bible-reader-content container
    const commonNode = range.commonAncestorContainer;
    const commonEl = commonNode.nodeType === Node.ELEMENT_NODE ? (commonNode as HTMLElement) : commonNode.parentElement;
    let readerRoot = commonEl?.closest('.bible-reader-content') as HTMLElement | null;
    if (!readerRoot) {
      const allReaders = document.querySelectorAll('.bible-reader-content');
      readerRoot = (Array.from(allReaders).find(r => (r as HTMLElement).offsetParent !== null) as HTMLElement) || (allReaders[0] as HTMLElement | null);
    }

    // Find the verse this selection belongs to by looking at parent elements or children
    const getVerseFromNode = (n: Node | null, offset?: number): number | null => {
      if (!n) return null;
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        const direct = el.closest('[data-verse]');
        if (direct) {
          const v = direct.getAttribute('data-verse');
          if (v) return parseInt(v, 10);
        }
        if (typeof offset === 'number' && el.childNodes.length > 0) {
          const childIdx = Math.min(Math.max(0, offset), el.childNodes.length - 1);
          const child = el.childNodes[childIdx];
          if (child) {
            const childEl = child.nodeType === Node.ELEMENT_NODE ? (child as HTMLElement) : child.parentElement;
            const childVerse = childEl?.closest('[data-verse]');
            if (childVerse) {
              const v = childVerse.getAttribute('data-verse');
              if (v) return parseInt(v, 10);
            }
          }
        }
      } else if (n.parentElement) {
        const direct = n.parentElement.closest('[data-verse]');
        if (direct) {
          const v = direct.getAttribute('data-verse');
          if (v) return parseInt(v, 10);
        }
      }
      return null;
    };

    let startVerse = getVerseFromNode(range.startContainer, range.startOffset);
    let endVerse = getVerseFromNode(range.endContainer, range.endOffset) || startVerse;

    // Scan all [data-verse] elements in reader for multi-verse spans
    if (readerRoot) {
      const allVerseEls = readerRoot.querySelectorAll('[data-verse]');
      const matchedVerses: number[] = [];
      allVerseEls.forEach(el => {
        if (selection.containsNode(el, true)) {
          const v = parseInt(el.getAttribute('data-verse') || '', 10);
          if (!isNaN(v)) matchedVerses.push(v);
        }
      });
      if (matchedVerses.length > 0) {
        matchedVerses.sort((a, b) => a - b);
        if (!startVerse || matchedVerses[0] < startVerse) startVerse = matchedVerses[0];
        if (!endVerse || matchedVerses[matchedVerses.length - 1] > endVerse) {
          endVerse = matchedVerses[matchedVerses.length - 1];
        }
      }
    }
    
    if (!startVerse && endVerse) startVerse = endVerse;
    if (startVerse) {
      const actualStart = Math.min(startVerse, endVerse || startVerse);
      const actualEnd = Math.max(startVerse, endVerse || startVerse);

      const sanitizedSel = cleanVerseText(rawText, actualStart, actualEnd);

      setSelectionRange(range.cloneRange());
      setSelectionVerse(actualStart);
      setEndVerseNumber(actualEnd);
      setSelectedText(sanitizedSel || rawText);

      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      const toolbarHalfWidth = winWidth <= 640 ? 155 : 195;
      const x = winWidth <= 640 
        ? winWidth / 2 
        : Math.max(toolbarHalfWidth + 12, Math.min(winWidth - toolbarHalfWidth - 12, rect.left + rect.width / 2));
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || winWidth <= 768);
      let isBelow: boolean;
      let y: number;

      if (isTouch) {
        const bottomBarPadding = winWidth <= 768 ? 95 : 70;
        const hasRoomBelow = winHeight - rect.bottom >= 65;

        if (rect.top >= 135) {
          // On mobile iOS/Android, native callout is displayed ABOVE the selection (approx rect.top - 45px).
          // To avoid colliding with the native callout:
          if (hasRoomBelow) {
            // Place Theologica's toolbar BELOW the selection
            isBelow = true;
            y = Math.min(winHeight - bottomBarPadding, rect.bottom + 8);
          } else {
            // Selection is near the bottom edge of viewport:
            // Stack Theologica's toolbar cleanly ABOVE the native callout.
            isBelow = false;
            y = Math.max(70, rect.top - 50);
          }
        } else {
          // Selection is near the top of the viewport (< 135px):
          // iOS flips its native callout BELOW the selection (approx rect.bottom + 10px).
          // Place Theologica's toolbar cleanly ABOVE the selection to avoid collision.
          isBelow = false;
          y = Math.max(65, rect.top - 8);
        }
      } else {
        // Desktop behavior: placed above unless near top of viewport
        const isNearTop = rect.top < 122;
        const isNearBottom = rect.bottom > winHeight - 80;
        isBelow = isNearTop && !isNearBottom;
        if (isBelow) {
          y = Math.min(winHeight - 80, rect.bottom + 6);
        } else {
          y = Math.max(122, rect.top - 6);
        }
      }

      // Check if selected text is an exact match for an existing highlight
      const selNorm = (sanitizedSel || rawText).trim().toLowerCase();
      const overlappingHighlights = highlights.filter(h => {
        if (!isSameBook(h.book, activeBook.name) || Number(h.chapter) !== Number(activeChapter)) return false;
        if (Number(h.verse) < actualStart || Number(h.verse) > actualEnd) return false;
        const hNorm = h.text.trim().toLowerCase();
        return hNorm === selNorm;
      });

      console.log('[THEOLOGICA-HL] handleSelection captured:', {
        rawText,
        sanitizedSel,
        actualStart,
        actualEnd,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        exactMatchCount: overlappingHighlights.length
      });

      setToolbarPosition({
        x,
        y,
        highlightId: overlappingHighlights.length > 0 ? overlappingHighlights[0].id : undefined,
        highlightIds: overlappingHighlights.map(h => h.id),
        isBelow
      });
    }
  }, [highlights, activeBook.name, activeChapter]);

  // Dismiss toolbar when clicking outside (safely ignoring active text selection and toolbar buttons)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('.floating-verse-toolbar') || 
        target.closest('.verse-number-btn') || 
        target.closest('.verse-number') || 
        target.closest('mark')
      ) {
        return;
      }
      
      // If user clicked inside the reader container, only keep if text is actively selected
      const selection = window.getSelection();
      const hasActiveSelection = selection && !selection.isCollapsed && (selection.toString() || (selection.rangeCount > 0 ? selection.getRangeAt(0).toString() : '')).trim().length > 0;
      if (hasActiveSelection) {
        return;
      }

      // On touchend, avoid clearing toolbar if user just tapped a verse or mark
      if (e.type === 'touchend' && Date.now() - lastTouchEndRef.current < 450) {
        return;
      }

      setToolbarPosition(null);
      setSelectionVerse(null);
      setEndVerseNumber(null);
      setSelectedText('');
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('touchend', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('touchend', handleDocumentClick);
    };
  }, []);

  // Trigger floating toolbar on left-click drag mouseup and mobile selectionchange
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const checkAndTriggerSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const rawText = (sel.toString() || range.toString()).trim();
      if (!rawText || /^\d+$/.test(rawText)) return;

      const el = range.startContainer.nodeType === Node.ELEMENT_NODE 
        ? (range.startContainer as HTMLElement) 
        : range.startContainer.parentElement;
      if (el?.closest('.bible-reader-content') || el?.closest('[data-verse]')) {
        handleSelection();
      }
    };

    const onMouseUp = () => {
      // Small timeout ensures selection bounding client rects are stabilized after drag release
      setTimeout(checkAndTriggerSelection, 20);
    };

    const onSelectionChange = () => {
      clearTimeout(timeout);
      timeout = setTimeout(checkAndTriggerSelection, 150);
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [handleSelection]);

  const activeNote = notes.find(n => n.id === activeNoteId) || { id: 0, title: 'No Note Selected', content: '' };
  const activeChat = (activeChatId ? chats.find(c => c.id === activeChatId) : null) || { id: 0, title: 'New Conversation', messages: [] };

  const isChatEmptyHome = activeChat.messages.length === 0;
  const isHomeTypingLocked = isChatEmptyHome && (isChatInputFocused || isMobileTyping);
  isHomeSuggestionsActiveRef.current = isChatEmptyHome;

  // Prevent scrolling on the AI chat home suggestions screen when focused in the text box
  useEffect(() => {
    if (!isHomeTypingLocked) return;

    if (mobileStudyChatScrollRef.current) {
      mobileStudyChatScrollRef.current.scrollTop = 0;
    }
    if (desktopStudyChatScrollRef.current) {
      desktopStudyChatScrollRef.current.scrollTop = 0;
    }
    if (fullChatScrollRef.current) {
      fullChatScrollRef.current.scrollTop = 0;
    }

    const preventTouchScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
    };

    const preventWheelScroll = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    window.addEventListener('wheel', preventWheelScroll, { passive: false });

    return () => {
      window.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('wheel', preventWheelScroll);
    };
  }, [isHomeTypingLocked]);

  const LOCAL_HIGHLIGHTS_KEY = 'theologica_local_highlights_v1';

  const getLocalHighlights = (): {id: number, book: string, chapter: number, verse: number, text: string, color: string}[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_HIGHLIGHTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveLocalHighlights = (hlList: {id: number, book: string, chapter: number, verse: number, text: string, color: string}[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_HIGHLIGHTS_KEY, JSON.stringify(hlList));
    } catch {}
  };

  // Contextual "Sync Your Study" Banner for Guests & Sign-in Cloud Sync
  const [isSyncBannerDismissed, setIsSyncBannerDismissed] = useState(false);
  const hasGuestData = useMemo(() => {
    if (userId) return false;
    const hasLocalNotes = notes.length > 0;
    const hasLocalHighlights = highlights.length > 0;
    const hasLocalChats = chats.some(c => c.messages && c.messages.length > 0) || (activeChat && activeChat.messages.length > 0);
    return hasLocalNotes || hasLocalHighlights || hasLocalChats;
  }, [userId, notes.length, highlights.length, chats, activeChat]);

  const prevUserIdRef = useRef<string | null>(userId || null);
  useEffect(() => {
    if (!prevUserIdRef.current && userId) {
      // 1. Sync local notes to /api/notes
      const localNotes = getLocalNotes();
      const pendingNotes = localNotes.filter(n => n.id > 1000000000000 || !n.id);
      if (pendingNotes.length > 0) {
        Promise.all(
          pendingNotes.map(n =>
            fetchWithAuth(`${API_URL}/api/notes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: n.title, content: n.content })
            }).catch(() => null)
          )
        ).then(() => {
          fetchWithAuth(`${API_URL}/api/notes`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (Array.isArray(data)) {
                setNotes(data);
                saveLocalNotes(data);
              }
            }).catch(() => {});
        });
      }

      // 2. Sync local highlights to /api/highlights
      const localHighlights = getLocalHighlights();
      const pendingHighlights = localHighlights.filter(h => h.id > 1000000000000 || !h.id);
      if (pendingHighlights.length > 0) {
        Promise.all(
          pendingHighlights.map(h =>
            fetchWithAuth(`${API_URL}/api/highlights`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                book: h.book,
                chapter: h.chapter,
                verse: h.verse,
                text: h.text,
                color: h.color
              })
            }).catch(() => null)
          )
        ).then(() => {
          fetchWithAuth(`${API_URL}/api/highlights`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (Array.isArray(data)) {
                setHighlights(data);
                saveLocalHighlights(data);
              }
            }).catch(() => {});
        });
      }

      // 3. Sync local completed chapters to /api/tracker
      if (completedChapters.length > 0) {
        fetchWithAuth(`${API_URL}/api/tracker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterIds: completedChapters, action: 'mark' })
        }).catch(() => null);
      }
    }
    prevUserIdRef.current = userId || null;
  }, [userId, getLocalNotes, saveLocalNotes, fetchWithAuth, completedChapters]);

  const saveHighlight = async (color: string) => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    console.log('[THEOLOGICA-HL] saveHighlight invoked:', {
      color,
      rawText,
      selectionVerse,
      endVerseNumber,
      existingHighlightId: toolbarPosition?.highlightId
    });

    if (!rawText || !selectionVerse) {
      console.warn('[THEOLOGICA-HL] saveHighlight aborted: missing rawText or selectionVerse', { rawText, selectionVerse });
      return;
    }
    
    if (toolbarPosition?.highlightId) {
      const existingId = toolbarPosition.highlightId;
      const targetIds = toolbarPosition.highlightIds && toolbarPosition.highlightIds.length > 0 
        ? toolbarPosition.highlightIds 
        : [existingId];
      console.log('[THEOLOGICA-HL] Updating color for existing highlight(s):', { targetIds, color });
      setHighlights(prev => {
        const updated = prev.map(h => targetIds.includes(h.id) ? { ...h, color } : h);
        saveLocalHighlights(updated);
        console.log('[THEOLOGICA-HL] Highlight color updated in local storage and state');
        return updated;
      });
      setToolbarPosition(null);
      setSelectionVerse(null);
      setEndVerseNumber(null);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();

      if (isOnline) {
        for (const tId of targetIds) {
          if (tId < 1000000000000) {
            try {
              await fetchWithAuth(`${API_URL}/api/highlights/${tId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ color })
              });
              console.log('[THEOLOGICA-HL] Cloud highlight color updated for id:', tId);
            } catch (e) {
              console.warn("[THEOLOGICA-HL] Highlight saved locally (cloud sync pending)", e);
            }
          }
        }
      }
      return;
    }
    
    const startVerse = selectionVerse;
    const endVerse = endVerseNumber || selectionVerse;
    const book = activeBook.name;
    const chapter = activeChapter;

    // Determine verses to highlight
    const versesToHighlight: { verse: number; text: string }[] = [];

    if (startVerse === endVerse) {
      // Single verse selection
      const vObj = bibleVerses.find(bv => bv.verse === startVerse);
      const wholeVerseMainText = vObj ? parseVerseFootnote(vObj.text).mainText : '';
      
      let cleanText = cleanVerseText(rawText, startVerse, endVerse);
      if (!cleanText && wholeVerseMainText) {
        cleanText = wholeVerseMainText;
      }
      if (cleanText) {
        versesToHighlight.push({ verse: startVerse, text: cleanText });
      }
    } else {
      // Multi-verse selection across verses startVerse to endVerse
      const minV = Math.min(startVerse, endVerse);
      const maxV = Math.max(startVerse, endVerse);
      for (let v = minV; v <= maxV; v++) {
        const vObj = bibleVerses.find(bv => bv.verse === v);
        if (vObj) {
          const fullVText = parseVerseFootnote(vObj.text).mainText;
          if (fullVText) {
            versesToHighlight.push({ verse: v, text: fullVText });
          }
        }
      }
    }

    if (versesToHighlight.length === 0) {
      console.warn('[THEOLOGICA-HL] versesToHighlight is empty, aborting save');
      return;
    }

    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();

    const createdItems: { id: number; book: string; chapter: number; verse: number; text: string; color: string }[] = [];

    versesToHighlight.forEach((item, idx) => {
      const tempId = Date.now() + idx;
      createdItems.push({
        id: tempId,
        book,
        chapter: Number(chapter),
        verse: Number(item.verse),
        text: item.text,
        color,
      });
    });

    console.log('[THEOLOGICA-HL] Created highlight items:', createdItems);

    // Identify superseded highlights (only exact match replacements so distinct phrase highlights in same verse are preserved)
    const supersededHighlights = highlights.filter(h => {
      const isSamePassage = isSameBook(h.book, book) && Number(h.chapter) === Number(chapter);
      if (!isSamePassage) return false;
      return createdItems.some(ci => {
        if (Number(ci.verse) !== Number(h.verse)) return false;
        const ciNorm = ci.text.toLowerCase().trim();
        const hNorm = h.text.toLowerCase().trim();
        return ciNorm === hNorm;
      });
    });
    const supersededIds = supersededHighlights.map(h => h.id);

    // Optimistic UI and immediate local cache update
    setHighlights(prev => {
      const filtered = prev.filter(h => !supersededIds.includes(h.id));
      const updated = [...filtered, ...createdItems];
      saveLocalHighlights(updated);
      console.log('[THEOLOGICA-HL] Updated highlights state in memory & localStorage. Count:', updated.length);
      return updated;
    });

    if (isOnline) {
      // Clean up superseded highlights from cloud database
      for (const sId of supersededIds) {
        if (sId < 1000000000000) {
          fetchWithAuth(`${API_URL}/api/highlights/${sId}`, { method: 'DELETE' }).catch(() => {});
        }
      }

      for (const item of createdItems) {
        try {
          const res = await fetchWithAuth(`${API_URL}/api/highlights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              book: item.book,
              chapter: item.chapter,
              verse: item.verse,
              text: item.text,
              color: item.color,
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.id) {
              setHighlights(prev => {
                const updated = prev.map(h => h.id === item.id ? data : h);
                saveLocalHighlights(updated);
                return updated;
              });
            }
          }
        } catch (e) {
          console.warn("Highlight saved locally, cloud sync pending", e);
        }
      }
    }
  };

  const deleteHighlight = async (id: number, allIds?: number[]) => {
    const idsToDelete = allIds && allIds.length > 0 ? allIds : [id];
    const targetVerse = selectionVerse;
    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();

    // 1. Immediately remove from local state and update local storage
    setHighlights(prev => {
      const updated = prev.filter(h => !idsToDelete.includes(h.id));
      saveLocalHighlights(updated);
      return updated;
    });

    // 2. Sync deletion to database
    if (isOnline) {
      for (const delId of idsToDelete) {
        try {
          if (delId < 1000000000000) {
            await fetchWithAuth(`${API_URL}/api/highlights/${delId}`, { method: 'DELETE' });
          }
        } catch (e) {
          console.warn("Deleted highlight locally", e);
        }
      }

      // Also clean up by verse in database if criteria available
      if (targetVerse) {
        try {
          await fetchWithAuth(
            `${API_URL}/api/highlights?book=${encodeURIComponent(activeBook.name)}&chapter=${activeChapter}&verse=${targetVerse}`,
            { method: 'DELETE' }
          );
        } catch {}
      }
    }
  };

  const askAiAboutHighlight = () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;

    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const verseText = startVerse === endVerse 
      ? `verse ${startVerse}` 
      : `verses ${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const query = `What does "${cleanText}" mean in ${verseText} of ${activeBook.name} ${activeChapter}?`;
    
    // Switch to AI tab
    setMobileStudyView('ai');
    if (!showRightSidebar) handleToggleRightSidebar(true);
    try { rightPanelRef.current?.expand(); } catch {}
    
    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
    
    const refStr = startVerse === endVerse 
      ? `${activeBook.name} ${activeChapter}:${startVerse}` 
      : `${activeBook.name} ${activeChapter}:${startVerse}-${endVerse}`;
    const explicitScripture = {
      reference: refStr,
      text: cleanText,
      translation: translation.toUpperCase(),
      isSpecificVerse: true,
    };
    setAttachedScripture(explicitScripture);
    handleSendMessage(undefined, query, explicitScripture);
  };

  const handleCopySelectedText = async () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;

    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const refVerses = startVerse === endVerse 
      ? `${startVerse}` 
      : `${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const reference = `${activeBook.name} ${activeChapter}:${refVerses}`;
    const formattedCitation = `"${cleanText}" (${reference} ${translation.toUpperCase()})`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedCitation);
      }
    } catch (e) {
      console.warn("Failed to copy citation to clipboard", e);
    }

    setCopiedHighlightToast(true);
    // Dismiss native text selection handles and callout immediately
    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      setCopiedHighlightToast(false);
      setToolbarPosition(null);
      setSelectionVerse(null);
      setEndVerseNumber(null);
      setSelectedText('');
    }, 1200);
  };

  const addHighlightToChat = () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const refVerses = startVerse === endVerse 
      ? `${startVerse}` 
      : `${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const reference = `${activeBook.name} ${activeChapter}:${refVerses}`;
    const newQuote = {
      id: `${reference}-${Date.now()}`,
      text: cleanText,
      reference
    };

    setChatQuotes(prev => {
      if (prev.some(q => q.reference === newQuote.reference && q.text === newQuote.text)) {
        return prev;
      }
      return [...prev, newQuote];
    });
    
    // Switch to AI tab / open right sidebar
    setMobileStudyView('ai');
    setShowRightSidebar(true);
    try { rightPanelRef.current?.expand(); } catch {}
    
    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };

  const addHighlightToCanvas = () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const refVerses = startVerse === endVerse 
      ? `${startVerse}` 
      : `${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const reference = `${activeBook.name} ${activeChapter}:${refVerses}`;
    
    setCanvasIncomingNode({
      title: reference,
      content: `> "${cleanText}"\n\n*${reference}*`,
      category: 'scripture',
    });
    
    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
    setActiveTab('canvas');
  };

  const handleCreateNote = async (initialData?: { title: string; content: string }): Promise<NoteItem | null> => {
    const tempNote: NoteItem = {
      id: Math.floor(Math.random() * 2000000000) + 1,
      title: initialData?.title || 'New Note',
      content: initialData?.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => {
      const next = [tempNote, ...prev];
      saveLocalNotes(next);
      return next;
    });
    try {
      const res = await fetchWithAuth(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: tempNote.title, 
          content: tempNote.content 
        })
      });
      if (res && res.ok) {
        const newNote = await res.json();
        setNotes(prev => {
          const next = prev.map(n => n.id === tempNote.id ? newNote : n);
          saveLocalNotes(next);
          return next;
        });
        return newNote;
      }
    } catch {}
    return tempNote;
  };

  const addHighlightToNotes = async () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const refVerses = startVerse === endVerse 
      ? `${startVerse}` 
      : `${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const reference = `${activeBook.name} ${activeChapter}:${refVerses}`;
    
    const noteContent = `> "${cleanText}"\n\n— **${reference}** (${translation.toUpperCase()})\n\n### Study Notes\n- `;
    const created = await handleCreateNote({
      title: `Study: ${reference}`,
      content: noteContent,
    });
    
    setToolbarPosition(null);
    setSelectionVerse(null);
    setEndVerseNumber(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();

    if (created) {
      setActiveNoteId(created.id);
    }
    setActiveTab('notes');
  };

  const sendChatMessageToCanvas = (content: string, title?: string, sourceChatId?: string | number) => {
    const { textContent } = parseAiMessage(content);
    if (!textContent) return;

    const resolvedChatId = sourceChatId 
      ? String(sourceChatId) 
      : (activeChatId ? String(activeChatId) : (activeChat?.id ? String(activeChat.id) : undefined));

    const resolvedChatTitle = (title && title !== 'New Conversation')
      ? title
      : ((activeChat?.title && activeChat.title !== 'New Conversation') ? activeChat.title : undefined);

    const cardTitle = resolvedChatTitle 
      ? `Insight: ${resolvedChatTitle}` 
      : 'AI Theological Insight';

    setCanvasIncomingNode({
      title: cardTitle,
      content: textContent,
      category: 'scripture',
      sourceChatId: resolvedChatId,
      chatTitle: resolvedChatTitle || 'Theological Study Canvas',
    });
    setActiveTab('canvas');
  };

  const handleSendWordStudyToCanvas = (nodePayload: {
    title: string;
    content: string;
    category: NodeCategory;
  }) => {
    setIsVerseInterlinearOpen(false);
    setActiveInterlinearWord(null);
    setCanvasIncomingNode(nodePayload);
    setActiveTab('canvas');
  };

  const handleSaveLectioToNotes = async (title: string, content: string) => {
    const tempNote: NoteItem = {
      id: Date.now(),
      title: title || 'Lectio Divina Reflection',
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => {
      const next = [tempNote, ...prev];
      saveLocalNotes(next);
      return next;
    });
    try {
      const res = await fetchWithAuth(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tempNote.title, content: tempNote.content }),
      });
      if (res && res.ok) {
        const newNote = await res.json();
        setNotes((prev) => {
          const next = prev.map(n => n.id === tempNote.id ? newNote : n);
          saveLocalNotes(next);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to save lectio note', err);
    }
  };

  const handleOpenBacklinkNote = (noteId: number) => {
    setActiveTab('notes');
    setActiveNoteId(noteId);
    setBacklinksDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleOpenBacklinkCanvasBoard = (boardId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theologica_active_canvas_board_id', boardId);
    }
    setActiveTab('canvas');
    setBacklinksDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectionWordStudy = async () => {
    const rawText = (selectedText || selectionRange?.toString() || '').trim();
    const targetVerse = selectionVerse || 1;
    const verseRef = `${activeBook.name} ${activeChapter}:${targetVerse}`;

    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();

    // 1. If multi-word selection or full verse: open comprehensive verse interlinear breakdown modal
    const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];
    if (words.length > 1 || !rawText) {
      setVerseInterlinearTarget(targetVerse);
      setIsVerseInterlinearOpen(true);
      return;
    }

    // 2. Single word selected:
    const cleanWord = words[0].replace(/[^a-zA-Z]/g, '').trim();
    if (!cleanWord || STOPWORDS.has(cleanWord.toLowerCase())) {
      setVerseInterlinearTarget(targetVerse);
      setIsVerseInterlinearOpen(true);
      return;
    }

    // 3. Search for authentic Strong's tagged token in the verse
    let matchedStrongId: string | undefined = undefined;
    const taggedVerse = strongsVersesMap[targetVerse];
    if (taggedVerse) {
      const tokens = getVerseInterlinearTokens(taggedVerse, isOldTestament, verseRef);
      const cleanLower = cleanWord.toLowerCase();
      const foundToken = tokens.find(t =>
        t.isWord && t.cleanWord && (
          t.cleanWord.toLowerCase() === cleanLower ||
          cleanLower.startsWith(t.cleanWord.toLowerCase().slice(0, 4)) ||
          t.cleanWord.toLowerCase().startsWith(cleanLower.slice(0, 4))
        ) && t.strongsId
      );
      if (foundToken) {
        matchedStrongId = foundToken.strongsId;
      }
    }

    // 4. Resolve authentic lexical entry
    let wordToDisplay: InterlinearWord | null = null;
    if (matchedStrongId && CLIENT_LEXICON_CACHE.has(matchedStrongId)) {
      wordToDisplay = CLIENT_LEXICON_CACHE.get(matchedStrongId)!;
    } else {
      const authenticWord = await fetchInterlinearWord(cleanWord, isOldTestament, verseRef, matchedStrongId);
      if (authenticWord && authenticWord.lemma && authenticWord.lemma !== '—') {
        wordToDisplay = authenticWord;
      }
    }

    if (wordToDisplay && wordToDisplay.lemma && wordToDisplay.lemma !== '—') {
      setActiveInterlinearWord({
        word: wordToDisplay,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        verseRef,
      });
    } else {
      // Fallback: If word is unindexed, open full verse breakdown modal
      setVerseInterlinearTarget(targetVerse);
      setIsVerseInterlinearOpen(true);
    }
  };

  const renderTextWithInterlinear = (rawStr: string, verseNum: number, bookName = activeBook.name, chapterNum = activeChapter) => {
    if (!isInterlinearMode || bookName !== activeBook.name || chapterNum !== activeChapter) {
      return rawStr.replace(/\[\s*[HG]\d+\s*\]/g, '').replace(/<\/?em>/gi, '');
    }
    const verseRef = `${activeBook.name} ${activeChapter}:${verseNum}`;
    const taggedStr = strongsVersesMap[verseNum];

    if (taggedStr) {
      const allTokens = getVerseInterlinearTokens(taggedStr, isOldTestament, verseRef);
      const vFullObj = bibleVerses.find(v => v.verse === verseNum);
      const vFullMain = vFullObj ? parseVerseFootnote(vFullObj.text).mainText.trim() : '';

      // If rendering the full verse (no highlights or full verse segment)
      const isFull = !vFullMain || rawStr.trim() === vFullMain || Math.abs(rawStr.length - vFullMain.length) < 5;
      let targetTokens = allTokens;
      if (!isFull) {
        const normSegment = normalizeForMatch(rawStr);
        let curIdx = 0;
        targetTokens = allTokens.filter(t => {
          const tNorm = normalizeForMatch(t.rawText);
          if (!tNorm.trim()) return false;
          const found = normSegment.indexOf(tNorm.trim(), curIdx);
          if (found !== -1) {
            curIdx = found + tNorm.trim().length;
            return true;
          }
          return false;
        });
        if (targetTokens.length === 0) {
          targetTokens = allTokens;
        }
      }

      return targetTokens.map((token, tIdx) => {
        if (!token.isWord || !token.word || !token.word.lemma || token.word.lemma === '—') {
          return <span key={tIdx}>{token.rawText}</span>;
        }

        const match = token.word;

        return (
          <span
            key={tIdx}
            onClick={async (e) => {
              e.stopPropagation();
              setActiveInterlinearWord({
                word: match,
                position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                verseRef,
              });
              const authentic = await fetchInterlinearWord(token.cleanWord || token.rawText, isOldTestament, verseRef, token.strongsId);
              if (authentic) {
                setActiveInterlinearWord({
                  word: authentic,
                  position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                  verseRef,
                });
              }
            }}
            className="inline-block text-center align-baseline cursor-pointer group px-0.5 max-w-full break-inside-avoid select-text"
            title={`${match.lemma} (${match.strongs}) - Click to inspect`}
          >
            <span className="block text-center leading-none mb-1 select-none pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
              <span
                className={`text-[10px] sm:text-[11px] font-serif font-normal inline-block ${
                  isOldTestament
                    ? 'text-amber-700/90 dark:text-amber-300/90'
                    : 'text-cyan-700/90 dark:text-cyan-300/90'
                }`}
              >
                {match.lemma}
              </span>
              {interlinearShowStrongs && match.strongs && (
                <span className="text-[8px] font-mono text-muted/80 ml-1 inline-block">
                  {match.strongs}
                </span>
              )}
              {interlinearShowTranslit && match.transliteration && (
                <span className="block text-[8px] italic text-muted/70 leading-none mt-0.5">
                  /{match.transliteration}/
                </span>
              )}
            </span>

            <span className="block text-center border-b border-dotted border-border-soft/80 group-hover:border-accent group-hover:text-accent transition-colors leading-normal font-serif break-words select-text">
              {token.rawText}
            </span>
          </span>
        );
      });
    }

    const cleanRawStr = rawStr.replace(/\[\s*[HG]\d+\s*\]/g, '').replace(/<\/?em>/gi, '');
    const tokens = cleanRawStr.split(/(\s+|[.,;:!?"'()\-]+)/);
    return tokens.map((token, tIdx) => {
      if (/^[\s.,;:!?"'()\-]+$/.test(token) || !token.trim()) {
        return <span key={tIdx}>{token}</span>;
      }
      const lower = token.toLowerCase();
      if (STOPWORDS.has(lower)) {
        return <span key={tIdx}>{token}</span>;
      }
      const match = findInterlinearWord(token, isOldTestament);
      if (!match || !match.lemma || match.lemma === '—') {
        return <span key={tIdx}>{token}</span>;
      }

      return (
        <span
          key={tIdx}
          onClick={async (e) => {
            e.stopPropagation();
            setActiveInterlinearWord({
              word: match,
              position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              verseRef,
            });
            const authentic = await fetchInterlinearWord(token, isOldTestament, verseRef);
            if (authentic) {
              setActiveInterlinearWord({
                word: authentic,
                position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                verseRef,
              });
            }
          }}
          className="inline-block text-center align-baseline cursor-pointer group px-0.5 select-text max-w-full break-inside-avoid"
          title={`${match.lemma} (${match.strongs}) - Click to inspect`}
        >
          <span className="block text-center leading-none mb-1 select-none pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <span
              className={`text-[10px] sm:text-[11px] font-serif font-normal inline-block ${
                isOldTestament
                  ? 'text-amber-700/90 dark:text-amber-300/90'
                  : 'text-cyan-700/90 dark:text-cyan-300/90'
              }`}
            >
              {match.lemma}
            </span>
            {interlinearShowStrongs && (
              <span className="text-[8px] font-mono text-muted/80 ml-1 inline-block">
                {match.strongs}
              </span>
            )}
            {interlinearShowTranslit && (
              <span className="block text-[8px] italic text-muted/70 leading-none mt-0.5">
                /{match.transliteration}/
              </span>
            )}
          </span>

          <span className="block text-center border-b border-dotted border-border-soft/80 group-hover:border-accent group-hover:text-accent transition-colors leading-normal font-serif break-words">
            {token}
          </span>
        </span>
      );
    });
  };

  // Helper to normalize quotes, apostrophes, dashes, and whitespace for robust text matching
  const normalizeForMatch = (str: string): string => {
    return str
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ')
      .toLowerCase();
  };

  const findHighlightMatch = (segText: string, targetText: string, verseNum: number): { start: number; end: number } | null => {
    if (!segText || !targetText) return null;
    const normSeg = normalizeForMatch(segText);
    let normTarget = normalizeForMatch(targetText.trim());

    // Clean leading verse number from target
    normTarget = normTarget.replace(new RegExp('^\\s*' + verseNum + '\\s*'), '').trim();
    if (!normTarget) return null;

    // 1. Direct normalized search (1-to-1 character matching preserves exact offsets)
    let idx = normSeg.indexOf(normTarget);
    if (idx !== -1) {
      return { start: idx, end: idx + normTarget.length };
    }

    // 2. Whitespace-flexible regex search
    const targetWords = normTarget.split(/\s+/).filter(Boolean);
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (targetWords.length > 0) {
      try {
        const wsPattern = new RegExp(targetWords.map(escapeRegex).join('\\s+'));
        const match = normSeg.match(wsPattern);
        if (match && typeof match.index === 'number') {
          return { start: match.index, end: match.index + match[0].length };
        }
      } catch {}

      // 3. Punctuation-tolerant regex search
      try {
        const strippedWords = targetWords
          .map(w => w.replace(/[.,;:!?"'()\[\]{}\-—–]/g, '').trim())
          .filter(Boolean);
        if (strippedWords.length > 0) {
          const punctPattern = new RegExp(strippedWords.map(escapeRegex).join('[\\s.,;:!?"\'()\\-—–]+'));
          const matchP = normSeg.match(punctPattern);
          if (matchP && typeof matchP.index === 'number') {
            return { start: matchP.index, end: matchP.index + matchP[0].length };
          }
        }
      } catch {}
    }

    // 4. Full segment coverage: when target is a whole-verse or multi-verse highlight that completely covers this segment
    const trimmedNormSeg = normSeg.trim();
    if (trimmedNormSeg.length >= 4 && normTarget.includes(trimmedNormSeg)) {
      const segStart = normSeg.indexOf(trimmedNormSeg);
      return { start: segStart, end: segStart + trimmedNormSeg.length };
    }

    // 5. Cross-translation whole-verse fallback (only for full-verse targets with substantial word overlap)
    if (targetWords.length >= 6 && normTarget.length >= normSeg.length * 0.5) {
      let matchedCount = 0;
      for (const tw of targetWords) {
        if (normSeg.includes(tw)) matchedCount++;
      }
      if (matchedCount / targetWords.length >= 0.65) {
        return { start: 0, end: segText.length };
      }
    }

    return null;
  };

  const renderVerseContent = (verse: number, text: string, bookName = activeBook.name, chapterNum = activeChapter) => {
    const { mainText, footnote } = parseVerseFootnote(text);
    const verseHighlights = highlights.filter(h => 
      isSameBook(h.book, bookName) && 
      Number(h.chapter) === Number(chapterNum) && 
      Number(h.verse) === Number(verse)
    );
    if (verseHighlights.length === 0) {
      if (!footnote || !showFootnotes) return <>{renderTextWithInterlinear(mainText, verse, bookName, chapterNum)}</>;
      return (
        <>
          {renderTextWithInterlinear(mainText, verse, bookName, chapterNum)}
          {showFootnotes && (
            <span className="text-gray-500 text-sm italic ml-2 select-none break-words inline" data-footnote="true">
              {footnote}
            </span>
          )}
        </>
      );
    }

    // Sort so most recently added/updated highlights take rendering priority
    const sortedVerseHighlights = [...verseHighlights].sort((a, b) => b.id - a.id);

    // For perfect non-overlapping rendering with normalized matching:
    let segments: { text: string, highlight?: typeof highlights[0] }[] = [{ text: mainText }];
    
    sortedVerseHighlights.forEach(h => {
      let newSegments: typeof segments = [];
      segments.forEach(seg => {
        if (seg.highlight) {
          newSegments.push(seg);
        } else {
          const match = findHighlightMatch(seg.text, h.text, verse);
          if (match && match.end > match.start) {
            const before = seg.text.substring(0, match.start);
            const hlText = seg.text.substring(match.start, match.end);
            const after = seg.text.substring(match.end);

            if (before) newSegments.push({ text: before });
            if (hlText) newSegments.push({ text: hlText, highlight: h });
            if (after) newSegments.push({ text: after });
          } else {
            newSegments.push(seg);
          }
        }
      });
      segments = newSegments.filter(s => s.text.length > 0);
    });

    return (
      <>
        {segments.map((seg, i) => 
          seg.highlight ? (
            <mark 
              key={i} 
              data-highlight-id={seg.highlight.id}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - lastTouchEndRef.current < 450) return;
                console.log('[THEOLOGICA-HL] Mark clicked for highlight:', seg.highlight?.id);
                if (toolbarPosition && toolbarPosition.highlightId === seg.highlight?.id) {
                  setToolbarPosition(null);
                  setSelectionVerse(null);
                  setEndVerseNumber(null);
                  setSelectedText('');
                  return;
                }
                const vObj = bibleVerses.find(bv => bv.verse === verse);
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setSelectionVerse(verse);
                setEndVerseNumber(verse);
                setSelectedText(seg.text || (vObj ? parseVerseFootnote(vObj.text).mainText : ''));
                
                const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
                const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
                const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || winWidth <= 768);
                const toolbarHalfWidth = winWidth <= 640 ? 155 : 195;
                const verseCenterX = rect.left + rect.width / 2;
                const isNearTop = rect.top < 130;
                let isBelow: boolean;
                let y: number;

                if (isTouch) {
                  isBelow = isNearTop || rect.top < 140;
                  if (isBelow) {
                    y = Math.min(winHeight - (winWidth <= 768 ? 95 : 70), rect.bottom + 8);
                  } else {
                    y = Math.max(70, rect.top - 8);
                  }
                } else {
                  isBelow = isNearTop;
                  y = isNearTop ? rect.bottom + 8 : Math.max(70, rect.top - 6);
                  y = Math.max(70, Math.min(winHeight - 80, y));
                }

                setToolbarPosition({
                  x: winWidth <= 640 ? winWidth / 2 : Math.max(toolbarHalfWidth + 12, Math.min(winWidth - toolbarHalfWidth - 12, verseCenterX)),
                  y,
                  highlightId: seg.highlight!.id,
                  highlightIds: [seg.highlight!.id],
                  isBelow
                });
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                lastTouchEndRef.current = Date.now();
                console.log('[THEOLOGICA-HL] Mark touched for highlight:', seg.highlight?.id);
                if (toolbarPosition && toolbarPosition.highlightId === seg.highlight?.id) {
                  setToolbarPosition(null);
                  setSelectionVerse(null);
                  setEndVerseNumber(null);
                  setSelectedText('');
                  return;
                }
                const vObj = bibleVerses.find(bv => bv.verse === verse);
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setSelectionVerse(verse);
                setEndVerseNumber(verse);
                setSelectedText(seg.text || (vObj ? parseVerseFootnote(vObj.text).mainText : ''));
                
                const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
                const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
                const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || winWidth <= 768);
                const toolbarHalfWidth = winWidth <= 640 ? 155 : 195;
                const verseCenterX = rect.left + rect.width / 2;
                const isNearTop = rect.top < 130;
                let isBelow: boolean;
                let y: number;

                if (isTouch) {
                  isBelow = isNearTop || rect.top < 140;
                  if (isBelow) {
                    y = Math.min(winHeight - (winWidth <= 768 ? 95 : 70), rect.bottom + 8);
                  } else {
                    y = Math.max(70, rect.top - 8);
                  }
                } else {
                  isBelow = isNearTop;
                  y = isNearTop ? rect.bottom + 8 : Math.max(70, rect.top - 6);
                  y = Math.max(70, Math.min(winHeight - 80, y));
                }

                setToolbarPosition({
                  x: winWidth <= 640 ? winWidth / 2 : Math.max(toolbarHalfWidth + 12, Math.min(winWidth - toolbarHalfWidth - 12, verseCenterX)),
                  y,
                  highlightId: seg.highlight!.id,
                  highlightIds: [seg.highlight!.id],
                  isBelow
                });
              }}
              className={`theologica-highlight ${
                seg.highlight.color === 'yellow' ? 'hl-yellow' :
                seg.highlight.color === 'green' ? 'hl-green' :
                seg.highlight.color === 'blue' ? 'hl-blue' :
                seg.highlight.color === 'pink' ? 'hl-pink' :
                'hl-purple'
              }`}
              title="Click to change color or remove highlight"
            >
              {renderTextWithInterlinear(seg.text, verse, bookName, chapterNum)}
            </mark>
          ) : (
            <span key={i}>{renderTextWithInterlinear(seg.text, verse, bookName, chapterNum)}</span>
          )
        )}
        {showFootnotes && footnote && (
          <span className="text-gray-500 text-sm italic ml-2 select-none break-words inline" data-footnote="true">
            {footnote}
          </span>
        )}
      </>
    );
  };

  const scrollToBottom = scrollChatToBottom;

  // Only scroll to the bottom when explicitly opening an existing chat.
  // When chatting or receiving AI responses, the user's scroll position is preserved exactly where they were.
  useEffect(() => {
    if (scrollToBottomOnChatOpenRef.current) {
      scrollToBottomOnChatOpenRef.current = false;
      scrollChatToBottom();
    }
  }, [activeChatId, activeTab, mobileChatView, mobileStudyView, scrollChatToBottom]);

  // Preload Voices for High-Quality TTS
  useEffect(() => {
    const loadVoices = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        setVoices(loadedVoices);
      }
    };
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Timezone-Aware Day Calculation (America/Chicago)
  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
    const tzYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const tzMonth = parseInt(parts.find(p => p.type === 'month')!.value);
    const tzDay = parseInt(parts.find(p => p.type === 'day')!.value);
    
    // 1. Calculate actual day of the year for UI display
    const current = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay));
    const start = new Date(Date.UTC(tzYear, 0, 0));
    const actualDiff = current.getTime() - start.getTime();
    const actualDoy = Math.floor(actualDiff / (1000 * 60 * 60 * 24));
    
    // 2. Calculate leap-year-aligned day to perfectly map to our 366-day dataset
    const leapDaysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let alignedDoy = 0;
    for (let i = 0; i < tzMonth - 1; i++) {
      alignedDoy += leapDaysInMonth[i];
    }
    alignedDoy += tzDay;

    // Check if current year is a leap year for UI total
    const isLeapYear = (tzYear % 4 === 0 && tzYear % 100 !== 0) || (tzYear % 400 === 0);
    
    todayDayRef.current = actualDoy;
    setDisplayDay(actualDoy);
    setTotalDays(isLeapYear ? 366 : 365);
    fetchDevotionalForDay(alignedDoy).then(entry => {
      if (entry) setDevotionalEntry(entry);
    });
  }, []);

  // Devotional TTS
  useEffect(() => {
    // Cancel devo speech if changing time of day or changing main tabs
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // eslint-disable-next-line
    setIsDevoSpeaking(false);
    isDevoSpeakingRef.current = false;
  }, [devotionalTime, activeTab]);

  const toggleDevoSpeech = () => {
    if (isDevoSpeaking) {
      setIsDevoSpeaking(false);
      isDevoSpeakingRef.current = false;
      window.speechSynthesis.cancel();
    } else {
      if (!devotionalEntry) return;
      window.speechSynthesis.cancel();
      setIsDevoSpeaking(true);
      isDevoSpeakingRef.current = true;
      
      const v = devotionalTime === 'morning' ? devotionalEntry.morningVerse : devotionalEntry.eveningVerse;
      const t = getDevotionalBody(devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText);
      const textToSpeak = `${v}. ${t}`;
        
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      
      const preferredVoices = ['Samantha', 'Siri Female', 'Siri', 'Google UK English Female', 'Google US English', 'Microsoft Zira', 'Microsoft Mark'];
      let selectedVoice = null;
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(voiceName) && v.lang.startsWith('en'));
        if (selectedVoice) break;
      }
      if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('en')) || null;
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => {
        setIsDevoSpeaking(false);
        isDevoSpeakingRef.current = false;
      };
      utterance.onerror = () => {
        setIsDevoSpeaking(false);
        isDevoSpeakingRef.current = false;
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Fetch Verses on Chapter or Translation Change
  useEffect(() => {
    let isMounted = true;
    setIsVersesLoading(true);

    getPassage(translation, activeBook.name, activeChapter)
      .then(({ chapter }) => {
        if (isMounted) {
          if (chapter.verses && chapter.verses.length > 0) {
            setBibleVerses(chapter.verses);
          } else {
            setBibleVerses([{ verse: 1, text: "Chapter not found in this translation." }]);
          }

          // Extract official publisher copyright notice
          if (chapter.copyright) {
            setChapterCopyright(chapter.copyright);
          } else {
            const tr = AVAILABLE_TRANSLATIONS.find(t => t.id.toLowerCase() === translation.toLowerCase());
            setChapterCopyright(tr?.copyrightNotice || '');
          }

          // API.Bible FUMS compliance beacon
          if (chapter.fumsToken && typeof window !== 'undefined') {
            fetch(`https://fums.api.bible/track?token=${encodeURIComponent(chapter.fumsToken)}`, { mode: 'no-cors' }).catch(() => {});
          }

          setIsVersesLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setBibleVerses([{ verse: 1, text: err?.message || "Error loading scripture text." }]);
          setChapterCopyright('');
          setIsVersesLoading(false);
        }
      });

    // Ensure all local highlights are in state without clearing other chapters
    const localList = getLocalHighlights();
    if (isMounted && localList.length > 0) {
      setHighlights(prev => {
        if (prev.length === 0) return localList;
        const map = new Map<string, typeof prev[0]>();
        localList.forEach(h => {
          const canon = findCanonicalBook(h.book)?.code || h.book?.toLowerCase();
          map.set(`${canon}:${h.chapter}:${h.verse}:${h.text}`, h);
        });
        prev.forEach(h => {
          const canon = findCanonicalBook(h.book)?.code || h.book?.toLowerCase();
          map.set(`${canon}:${h.chapter}:${h.verse}:${h.text}`, h);
        });
        return Array.from(map.values());
      });
    }

    // Fetch highlights for current chapter from cloud and merge into full state
    fetchWithAuth(`${API_URL}/api/highlights?book=${encodeURIComponent(activeBook.name)}&chapter=${activeChapter}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setHighlights(prev => {
            // Keep highlights for all other chapters
            const otherChapterHighlights = prev.filter(h => 
              !isSameBook(h.book, activeBook.name) || Number(h.chapter) !== Number(activeChapter)
            );
            // Keep pending local highlights for this chapter (created offline or awaiting server ID)
            const pendingLocal = prev.filter(h =>
              isSameBook(h.book, activeBook.name) && 
              Number(h.chapter) === Number(activeChapter) && 
              h.id > 1000000000000
            );
            const currentChapterMap = new Map<number, typeof prev[0]>();
            data.forEach(ch => currentChapterMap.set(ch.id, ch));
            pendingLocal.forEach(h => currentChapterMap.set(h.id, h));

            const combined = [...otherChapterHighlights, ...Array.from(currentChapterMap.values())];
            saveLocalHighlights(combined);
            return combined;
          });
        }
      })
      .catch(e => console.warn("Using local highlights cache", e));
      
    // Cancel any ongoing speech when chapter changes
    // eslint-disable-next-line
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setCurrentSpeakingVerseIndex(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return () => { isMounted = false; };
  }, [activeBook, activeChapter, translation]);

  // Fetch Split Verses when Split View is active and chapter/translation changes
  useEffect(() => {
    if (!isSplitView) return;
    let isMounted = true;
    setIsSplitVersesLoading(true);

    getPassage(splitTranslation, splitBook.name, splitChapter)
      .then(({ chapter }) => {
        if (isMounted) {
          if (chapter.verses && chapter.verses.length > 0) {
            setSplitBibleVerses(chapter.verses);
          } else {
            setSplitBibleVerses([{ verse: 1, text: "Chapter not found in this translation." }]);
          }

          if (chapter.copyright) {
            setSplitChapterCopyright(chapter.copyright);
          } else {
            const tr = AVAILABLE_TRANSLATIONS.find(t => t.id.toLowerCase() === splitTranslation.toLowerCase());
            setSplitChapterCopyright(tr?.copyrightNotice || '');
          }

          setIsSplitVersesLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setSplitBibleVerses([{ verse: 1, text: err?.message || "Error loading scripture text." }]);
          setSplitChapterCopyright('');
          setIsSplitVersesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isSplitView, splitTranslation, splitBook.name, splitChapter]);

  // Audio Reader Toggle
  const toggleSpeech = () => {
    if (isSpeaking) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setCurrentSpeakingVerseIndex(null);
      window.speechSynthesis.cancel();
    } else {
      if (bibleVerses.length === 0) return;
      window.speechSynthesis.cancel();
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      playVerse(0);
    }
  };

  const playVerse = async (index: number) => {
    // Check if we were stopped while playing
    if (!isSpeakingRef.current && index !== 0) return;

    if (index >= bibleVerses.length) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setCurrentSpeakingVerseIndex(null);
      return;
    }
    
    setCurrentSpeakingVerseIndex(index);
    const textToSpeak = getCleanScriptureText(bibleVerses[index].text);
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = ttsSpeed;
    
    // Select voice: user preference first, then preferred system voices, then fallback
    let selectedVoice = null;
    if (ttsVoice && voices.length > 0) {
      selectedVoice = voices.find(v => v.name === ttsVoice) || null;
    }
    if (!selectedVoice) {
      const preferredVoices = [
        'Samantha',                 // macOS / iOS (excellent female voice)
        'Siri Female',              // macOS / iOS
        'Siri',                     // macOS / iOS
        'Google UK English Female', // Android / Chrome
        'Google US English',        // Android / Chrome
        'Microsoft Zira',           // Windows Female
        'Microsoft Mark'            // Windows Male
      ];
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(voiceName) && v.lang.startsWith('en'));
        if (selectedVoice) break;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en')) || null;
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    if (autoScrollAudio) {
      scrollToAndHighlightVerse(bibleVerses[index].verse);
    }

    utterance.onend = () => {
      if (isSpeakingRef.current) {
        if (index + 1 < bibleVerses.length) {
          playVerse(index + 1);
        } else if (autoAdvanceAudio) {
          // Seamlessly advance to next chapter
          if (activeChapter < activeBook.chapters) {
            setActiveChapter(prev => prev + 1);
          } else {
            const curIdx = ALL_BOOKS.findIndex(b => b.name === activeBook.name);
            if (curIdx !== -1 && curIdx + 1 < ALL_BOOKS.length) {
              setActiveBook(ALL_BOOKS[curIdx + 1]);
              setActiveChapter(1);
            } else {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              setCurrentSpeakingVerseIndex(null);
            }
          }
        } else {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setCurrentSpeakingVerseIndex(null);
        }
      }
    };
    
    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error", e);
      if (isSpeakingRef.current) {
        if (index + 1 < bibleVerses.length) {
          playVerse(index + 1);
        } else {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setCurrentSpeakingVerseIndex(null);
        }
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Desktop Global Keyboard Shortcuts (Cmd+K, Arrows, Escape, Space/Alt+P)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || 
                             activeElement instanceof HTMLTextAreaElement || 
                             (activeElement as HTMLElement)?.isContentEditable;

      // 1. Escape: Close modals, drawers, and floating menus
      if (e.key === 'Escape') {
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (isLectioModalOpen) { setIsLectioModalOpen(false); return; }
        if (backlinksDrawerState.isOpen) { setBacklinksDrawerState(prev => ({ ...prev, isOpen: false })); return; }
        if (activeInterlinearWord) { setActiveInterlinearWord(null); return; }
        if (isVerseInterlinearOpen) { setIsVerseInterlinearOpen(false); return; }
        if (isDesktopMoreMenuOpen) { setIsDesktopMoreMenuOpen(false); return; }
        if (mobileStudyView !== 'reader') { setMobileStudyView('reader'); return; }
      }

      // 2. Cmd+K / Ctrl+K: Focus book search or switch to study tab
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeTab !== 'study') {
          setActiveTab('study');
        }
        setShowLeftSidebar(true);
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search books"]') as HTMLInputElement;
          searchInput?.focus();
          searchInput?.select();
        }, 50);
        return;
      }

      // If user is currently typing in an input or textarea, don't trigger navigation shortcuts
      if (isInputFocused) return;

      // 3. ArrowLeft / ArrowRight: Previous / Next chapter when on study tab
      if (activeTab === 'study' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (activeChapter > 1) {
            setActiveChapter(prev => prev - 1);
          } else {
            const currentIndex = ALL_BOOKS.findIndex(b => b.name === activeBook.name);
            if (currentIndex > 0) {
              const prevBook = ALL_BOOKS[currentIndex - 1];
              setActiveBook(prevBook);
              setActiveChapter(prevBook.chapters);
            }
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (activeChapter < activeBook.chapters) {
            setActiveChapter(prev => prev + 1);
          } else {
            const currentIndex = ALL_BOOKS.findIndex(b => b.name === activeBook.name);
            if (currentIndex < ALL_BOOKS.length - 1) {
              const nextBook = ALL_BOOKS[currentIndex + 1];
              setActiveBook(nextBook);
              setActiveChapter(1);
            }
          }
        } else if (e.key === ' ' || (e.altKey && e.key.toLowerCase() === 'p')) {
          e.preventDefault();
          toggleSpeech();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeTab, 
    activeBook, 
    activeChapter, 
    isSettingsOpen, 
    isLectioModalOpen, 
    backlinksDrawerState.isOpen, 
    activeInterlinearWord, 
    isVerseInterlinearOpen,
    isDesktopMoreMenuOpen, 
    mobileStudyView
  ]);


  const updateNote = async (id: number, title: string, content: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, title, content, updatedAt: new Date().toISOString() } : n);
      saveLocalNotes(next);
      return next;
    });
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetchWithAuth(`${API_URL}/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        });
      } catch (err) {
        console.error('Failed to update note', err);
      }
    }, 1000);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setChatInput('');
    setChatQuotes([]);
    setAttachedScripture(null);
    setChatImage(null);
    setShowSlashCommands(false);
    setMobileChatView('chat');
    chatInputRef.current?.focus();
  };

  const handleDeleteChat = async (id: number) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
    await fetchWithAuth(`${API_URL}/api/chats/${id}`, {
      method: 'DELETE'
    });
  };

  const handleRenameChat = (id: number, oldTitle: string) => {
    setChatToRename({ id, title: oldTitle });
  };

  const submitRenameChat = async (newTitle: string) => {
    if (!chatToRename) return;
    const { id } = chatToRename;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    setChatToRename(null);
    await fetchWithAuth(`${API_URL}/api/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
  };

  const handleDeleteNote = async (id: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      saveLocalNotes(next);
      return next;
    });
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    try {
      await fetchWithAuth(`${API_URL}/api/notes/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleRenameNoteSidebar = (id: number, oldTitle: string, content: string) => {
    setNoteToRename({ id, title: oldTitle, content });
  };

  const submitRenameNote = (newTitle: string) => {
    if (!noteToRename) return;
    updateNote(noteToRename.id, newTitle, noteToRename.content);
    setNoteToRename(null);
  };


  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleSendMessage = async (
    e?: React.FormEvent | React.KeyboardEvent,
    overrideText?: string,
    explicitScripture?: { reference: string; text: string; translation: string }
  ) => {
    if (e) e.preventDefault();
    
    let textToSend = overrideText || chatInput;
    if (chatQuotes.length > 0 && !overrideText) {
      const quotesBlock = chatQuotes.map(q => `> "${q.text}" — *${q.reference}*`).join('\n\n');
      textToSend = `${quotesBlock}\n\n${textToSend}`.trim();
    }
    
    const currentChat = activeChatId ? chats.find(c => c.id === activeChatId) : null;
    const isFirstMessage = !activeChatId || (currentChat && currentChat.messages.length === 0);
    if (!textToSend.trim() && !chatImage && !attachedFile) return;
    
    setChatQuotes([]);
    setAttachedScripture(null);
    const currentImage = chatImage;
    const currentAttached = attachedFile;
    setChatImage(null);
    setAttachedFile(null);
    setFileUploadStatus(null);

    // If attached document has textContent, prefix it into textToSend
    if (currentAttached?.textContent) {
      const docHeader = `[Attached Document: "${currentAttached.name}"]\n${currentAttached.textContent}\n[End of Attached Document]`;
      textToSend = textToSend ? `${docHeader}\n\n${textToSend}` : docHeader;
    }

    let targetChatId = activeChatId;

    const optimisticAttached = currentAttached ? {
      name: currentAttached.name,
      size: currentAttached.size,
      type: currentAttached.type,
    } : undefined;

    // Create a new chat automatically if none exists
    if (!targetChatId) {
      let createdChatId = Math.floor(Math.random() * 2000000000) + 1;
      let newChat: any = {
        id: createdChatId,
        title: 'New Conversation',
        messages: []
      };

      try {
        const res = await fetchWithAuth(`${API_URL}/api/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Conversation' })
        });
        if (res.ok) {
          const serverChat = await res.json();
          if (serverChat && serverChat.id) {
            newChat = serverChat;
            createdChatId = serverChat.id;
          }
        }
      } catch (err) {
        console.warn('Chat initialized locally:', err);
      }

      targetChatId = createdChatId;
      
      const newMsg = { 
        role: 'user', 
        content: textToSend.trim(), 
        imagePreview: currentAttached?.preview || currentImage?.preview,
        attachedFile: optimisticAttached,
      };
      const chatWithOptimisticMsg = { ...newChat, messages: [newMsg] };
      
      setChats(prev => [chatWithOptimisticMsg, ...prev]);
      setActiveChatId(createdChatId);
    } else {
      const newMsg = { 
        role: 'user', 
        content: textToSend.trim(), 
        imagePreview: currentAttached?.preview || currentImage?.preview,
        attachedFile: optimisticAttached,
      };
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, newMsg] };
        }
        return c;
      }));
    }
    
    const currentInput = textToSend;
    if (!overrideText) setChatInput(''); else setChatInput('');
    setShowSlashCommands(false);
    const isImageReq = [
      'draw', 'generate an image', 'create an image', 'make an image', 'paint',
      'illustrate', 'visualize', 'show me a picture', 'create a picture',
      'generate a picture', 'make a picture', 'create a visual', 'depict',
      'render', 'generate art', 'create art', 'make art',
      'show me what', 'generate a photo', 'create a photo', 'make a photo'
    ].some(kw => currentInput.toLowerCase().includes(kw)) && !currentImage && !currentAttached;
    setAiActivityType(isImageReq ? 'image' : 'study');

    const scriptureContextToSend = explicitScripture || (attachedScripture ? attachedScripture : undefined);

    if (isImageReq) {
      setAiActivityStatus('Initiating sacred artwork generation...');
    } else if (currentAttached) {
      setAiActivityStatus(`Analyzing attached ${currentAttached.type === 'pdf' ? 'PDF' : currentAttached.type === 'image' ? 'image' : 'document'} with Theologica AI...`);
    } else {
      setAiActivityStatus('Thinking...');
    }

    setAiThinkingText('');
    setIsAiTyping(true);
    scrollToBottomOnChatOpenRef.current = false;

    trackClientEvent('ai_chat_prompt', {
      translation: translation.toUpperCase(),
      mode: isImageReq ? 'image' : 'study',
    });

    const filePayload = (currentAttached?.base64 && currentAttached?.mimeType) ? {
      base64: currentAttached.base64,
      mimeType: currentAttached.mimeType,
      fileName: currentAttached.name,
    } : (currentImage ? {
      base64: currentImage.base64,
      mimeType: currentImage.mimeType,
    } : undefined);

    const messagePromise = fetchWithAuth(`${API_URL}/api/chats/${targetChatId}/messages?stream=true`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ 
        content: currentInput,
        image: filePayload,
        scriptureContext: scriptureContextToSend,
        translation: translation.toUpperCase(),
        theologicalLens,
        includeOriginalRoots,
      })
    });

    // Fire auto-naming concurrently so it doesn't block the UI and types simultaneously
    let namePromise: Promise<Response> | null = null;
    if (isFirstMessage && targetChatId) {
      namePromise = fetchWithAuth(`${API_URL}/api/chats/${targetChatId}/name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: currentInput })
      });
    }

    try {
      const res = await messagePromise;
      
      if (res.ok) {
        const isStream = res.headers.get('content-type')?.includes('text/event-stream');
        if (isStream && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let streamResult: { userMessage?: any; aiMessage?: any } | null = null;
          let streamError: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(trimmed.slice(6));
                  if (payload.type === 'status' && payload.status) {
                    setAiActivityStatus(payload.status);
                  } else if (payload.type === 'thought' && payload.thought) {
                    setAiThinkingText(payload.thought);
                  } else if (payload.type === 'result') {
                    streamResult = payload;
                  } else if (payload.type === 'error') {
                    console.error('Server chat stream error:', payload.error);
                    streamError = payload.error;
                  }
                } catch {
                  // ignore chunk parse failure
                }
              }
            }
          }

          if (streamResult && streamResult.aiMessage) {
            const data = streamResult;
            setChats(prev => prev.map(c => {
              if (c.id === targetChatId) {
                const msgs = c.messages;
                const lastUserIdx = [...msgs].reverse().findIndex(m => m.role === 'user');
                const sliceEnd = lastUserIdx >= 0 ? msgs.length - lastUserIdx : msgs.length;
                return { ...c, messages: [...msgs.slice(0, sliceEnd - 1), { ...msgs[sliceEnd - 1], ...data.userMessage }, data.aiMessage] };
              }
              return c;
            }));
          } else if (streamError) {
            const errorMsg = { 
              id: Math.floor(Math.random() * 2000000000) + 1, 
              chatId: targetChatId, 
              role: 'model', 
              content: `**Error:** ${streamError}. Please try sending your message again.` 
            };
            setChats(prev => prev.map(c => {
              if (c.id === targetChatId) {
                return { ...c, messages: [...c.messages, errorMsg] };
              }
              return c;
            }));
          }
        } else {
          const data = await res.json();
          setChats(prev => prev.map(c => {
            if (c.id === targetChatId) {
              const msgs = c.messages;
              const lastUserIdx = [...msgs].reverse().findIndex(m => m.role === 'user');
              const sliceEnd = lastUserIdx >= 0 ? msgs.length - lastUserIdx : msgs.length;
              return { ...c, messages: [...msgs.slice(0, sliceEnd - 1), { ...msgs[sliceEnd - 1], ...data.userMessage }, data.aiMessage] };
            }
            return c;
          }));
        }

        if (namePromise) {
          namePromise.then(async (nameRes) => {
            if (nameRes.ok) {
              const { title } = await nameRes.json();
              setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, title } : c));
            }
          }).catch(() => {
            // Silent fail
          });
        }
      } else {
        const errorData = await res.json().catch(() => null);
        const errMsgText = String(errorData?.details || errorData?.error || '');

        // Auto-recover seamlessly if chat session ID was rejected or out-of-sync
        if (res.status === 404 || errMsgText.toLowerCase().includes('chat not found')) {
          try {
            console.warn('Chat ID out-of-sync, creating fresh conversation and auto-retrying message...');
            const newChatRes = await fetchWithAuth(`${API_URL}/api/chats`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'New Conversation' })
            });
            if (newChatRes.ok) {
              const freshChat = await newChatRes.json();
              if (freshChat?.id) {
                setActiveChatId(freshChat.id);
                setChats(prev => prev.map(c => c.id === targetChatId ? { ...c, id: freshChat.id } : c));
                return handleSendMessage(undefined, currentInput);
              }
            }
          } catch (recoveryErr) {
            console.error('Chat auto-recovery failed:', recoveryErr);
          }
        }

        const errorMsg = { 
          id: Math.floor(Math.random() * 2000000000) + 1, 
          chatId: targetChatId, 
          role: 'model', 
          content: `**Error:** ${errMsgText || 'Failed to get response from AI'}` 
        };
        setChats(prev => prev.map(c => {
          if (c.id === targetChatId) {
            return { ...c, messages: [...c.messages, errorMsg] };
          }
          return c;
        }));
      }
    } catch (networkErr: any) {
      console.error('Chat request network failure:', networkErr);
      const errorMsg = { 
        id: Math.floor(Math.random() * 2000000000) + 1, 
        chatId: targetChatId, 
        role: 'model', 
        content: '**Connection Error:** Unable to connect to Theologica AI. Please check your internet connection and try again.' 
      };
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, errorMsg] };
        }
        return c;
      }));
    } finally {
      setIsAiTyping(false);
    }
  };

  const currentChapterId = `${activeBook.name}-${activeChapter}`;
  const chapterTitle = `${activeBook.name} ${activeChapter}`;
  const chapterNote = notes.find(n => n.title === chapterTitle);

  const handleQuickNoteChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    if (chapterNote) {
      if (chapterNote.id < 0) {
        setNotes(prev => prev.map(n => n.id === chapterNote.id ? { ...n, content: newContent } : n));
      } else {
        updateNote(chapterNote.id, chapterNote.title, newContent);
      }
    } else if (tempNoteIdRef.current !== null) {
      const tempId = tempNoteIdRef.current;
      setNotes(prev => prev.map(n => n.id === tempId ? { ...n, content: newContent } : n));
    } else {
      // eslint-disable-next-line react-hooks/purity
      tempNoteIdRef.current = -Math.floor(Math.random() * 100000);
      const tempId = tempNoteIdRef.current;
      const optimisticNote = { id: tempId, title: chapterTitle, content: newContent };
      setNotes(prev => [optimisticNote, ...prev]);
      
      try {
        const res = await fetchWithAuth(`${API_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: chapterTitle, content: newContent })
        });
        const newNote = await res.json();
        trackClientEvent('note_created');
        
        setNotes(prev => {
          const latestTemp = prev.find(n => n.id === tempId);
          const finalContent = latestTemp ? latestTemp.content : newContent;
          
          if (finalContent !== newContent) {
            updateNote(newNote.id, chapterTitle, finalContent);
          }
          return prev.map(n => n.id === tempId ? { ...newNote, content: finalContent } : n);
        });
      } catch (err) {
        console.error('Failed to create note', err);
      } finally {
        tempNoteIdRef.current = null;
      }
    }
  };

  const isCompleted = completedChapters.includes(currentChapterId);
  const toggleCompleted = async () => {
    const prevStatus = isCompleted;
    setCompletedChapters(prev => {
      const next = prevStatus ? prev.filter(id => id !== currentChapterId) : [...prev, currentChapterId];
      try { localStorage.setItem('theologica_completed_chapters', JSON.stringify(next)); } catch {}
      return next;
    });
    if (!prevStatus) {
      recordHabitActivity('scripture', { chapterId: currentChapterId });
    } else {
      unmarkChapterActivity(1);
    }
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: currentChapterId })
    });
    trackClientEvent('reading_tracker_updated');
    queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
  };

  const lastMobileChapterTapRef = useRef<{ id: string; time: number } | null>(null);
  const chapterGridTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const toggleAnyChapter = async (id: string) => {
    // If recently toggled via mobile nearest-button touch handler, ignore synthetic duplicate click
    if (
      lastMobileChapterTapRef.current &&
      lastMobileChapterTapRef.current.id === id &&
      Date.now() - lastMobileChapterTapRef.current.time < 450
    ) {
      return;
    }

    const checked = completedChapters.includes(id);
    setCompletedChapters(prev => {
      const next = checked ? prev.filter(c => c !== id) : [...prev, id];
      try { localStorage.setItem('theologica_completed_chapters', JSON.stringify(next)); } catch {}
      return next;
    });
    if (!checked) {
      recordHabitActivity('scripture', { chapterId: id });
    } else {
      unmarkChapterActivity(1);
    }
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: id })
    });
    trackClientEvent('reading_tracker_updated');
    queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
  };

  const toggleBookAllChapters = async (book: { name: string; chapters: number }) => {
    const allIds = Array.from({ length: book.chapters }, (_, i) => `${book.name}-${i + 1}`);
    const completedInBook = completedChapters.filter(id => id.startsWith(`${book.name}-`));
    const isAllCompleted = completedInBook.length === book.chapters;

    if (isAllCompleted) {
      // Unmark all chapters of this book
      setCompletedChapters(prev => {
        const next = prev.filter(id => !id.startsWith(`${book.name}-`));
        try { localStorage.setItem('theologica_completed_chapters', JSON.stringify(next)); } catch {}
        return next;
      });
      unmarkChapterActivity(completedInBook.length);
      await fetchWithAuth(`${API_URL}/api/tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIds: allIds, action: 'unmark' })
      });
    } else {
      // Mark all chapters of this book as completed
      const newChapters = allIds.filter(id => !completedChapters.includes(id));
      setCompletedChapters(prev => {
        const next = Array.from(new Set([...prev, ...allIds]));
        try { localStorage.setItem('theologica_completed_chapters', JSON.stringify(next)); } catch {}
        return next;
      });
      newChapters.forEach(id => recordHabitActivity('scripture', { chapterId: id }));
      await fetchWithAuth(`${API_URL}/api/tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIds: allIds, action: 'mark' })
      });
    }
    trackClientEvent('reading_tracker_updated');
    queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
  };

  const handleChapterGridTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      chapterGridTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleChapterGridTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!chapterGridTouchStartRef.current) return;
    const start = chapterGridTouchStartRef.current;
    chapterGridTouchStartRef.current = null;

    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.time;

    // Must be an intentional tap (not a scroll or drag: < 12px travel, < 500ms duration)
    if (Math.hypot(dx, dy) > 12 || dt > 500) return;

    // Find all chapter buttons within this grid
    const container = e.currentTarget;
    const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-chapter-id]');
    if (buttons.length === 0) return;

    let closestId: string | null = null;
    let closestDistSq = Infinity;

    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distSq = (touch.clientX - cx) ** 2 + (touch.clientY - cy) ** 2;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestId = btn.getAttribute('data-chapter-id');
      }
    });

    // Proximity threshold: within 56px of the button center (covers the 44px button, plus the gap between buttons and edges)
    if (closestId && closestDistSq <= 56 * 56) {
      e.preventDefault();
      lastMobileChapterTapRef.current = { id: closestId, time: Date.now() };
      toggleAnyChapter(closestId);
    }
  };

  // Active reading dwell timer: soft-counts chapter reading toward daily habit & streak after 45s of active study
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellCreditedChaptersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab !== 'study' || !activeBook?.name || !activeChapter) {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      return;
    }
    const chapterKey = `${activeBook.name}-${activeChapter}`;
    if (dwellCreditedChaptersRef.current.has(chapterKey)) {
      return;
    }
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);

    dwellTimerRef.current = setTimeout(() => {
      if (activeTab === 'study') {
        dwellCreditedChaptersRef.current.add(chapterKey);
        recordHabitActivity('scripture', { chapterId: chapterKey });
        queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
      }
    }, 45000); // 45 seconds of active reading in this chapter

    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, [activeTab, activeBook?.name, activeChapter, fetchWithAuth, recordHabitActivity]);

  if (!isLoaded && !authTimeout) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-bg text-fg px-4 select-none">
        <noscript>
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm max-w-md text-center">
            JavaScript is required to run Theologica Study Workspace. Please enable JavaScript in your browser settings.
          </div>
        </noscript>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-lg animate-pulse flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.png" alt="Theologica Logo" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif text-xl font-bold tracking-tight text-[#c96442]">Theologica</h1>
            <p className="text-xs text-muted">Preparing Scripture study workspace...</p>
          </div>
          <div className="w-32 h-1 bg-surface-warm rounded-full overflow-hidden mt-2">
            <div className="h-full bg-accent rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Dynamic CSS transforms for smooth mobile study sidebar sliding (hardware accelerated)
  const isBookSelectorActive = mobileStudyView === 'chapters' || mobileDragSidebar === 'chapters';
  const isStudyAiActive = mobileStudyView === 'ai' || mobileDragSidebar === 'ai';
  const isStudyToolsActive = mobileStudyView === 'tools' || mobileDragSidebar === 'tools';

  let bookSelectorTransform = 'translate3d(-100%, 0, 0)';
  if (mobileStudyView === 'chapters') {
    if (mobileDragSidebar === 'chapters') {
      bookSelectorTransform = `translate3d(${mobileDragOffset}px, 0, 0)`;
    } else {
      bookSelectorTransform = 'translate3d(0px, 0, 0)';
    }
  } else if (mobileDragSidebar === 'chapters') {
    bookSelectorTransform = `translate3d(calc(-100% + ${mobileDragOffset}px), 0, 0)`;
  }

  let studyAiTransform = 'translate3d(100%, 0, 0)';
  if (mobileStudyView === 'ai') {
    if (mobileDragSidebar === 'ai') {
      studyAiTransform = `translate3d(${mobileDragOffset}px, 0, 0)`;
    } else {
      studyAiTransform = 'translate3d(0px, 0, 0)';
    }
  } else if (mobileDragSidebar === 'ai') {
    studyAiTransform = `translate3d(calc(100% - ${mobileDragOffset}px), 0, 0)`;
  }

  let studyToolsTransform = 'translate3d(100%, 0, 0)';
  if (mobileStudyView === 'tools') {
    if (mobileDragSidebar === 'tools') {
      studyToolsTransform = `translate3d(${mobileDragOffset}px, 0, 0)`;
    } else {
      studyToolsTransform = 'translate3d(0px, 0, 0)';
    }
  } else if (mobileDragSidebar === 'tools') {
    studyToolsTransform = `translate3d(calc(100% - ${mobileDragOffset}px), 0, 0)`;
  }

  // Backdrop opacity calculation for study drawers
  let backdropOpacity = 0;
  if (mobileStudyView === 'chapters') {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const progress = mobileDragSidebar === 'chapters' ? Math.max(0, 1 + mobileDragOffset / winW) : 1;
    backdropOpacity = progress * 0.45;
  } else if (mobileStudyView === 'ai') {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const progress = mobileDragSidebar === 'ai' ? Math.max(0, 1 - mobileDragOffset / winW) : 1;
    backdropOpacity = progress * 0.45;
  } else if (mobileStudyView === 'tools') {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const progress = mobileDragSidebar === 'tools' ? Math.max(0, 1 - mobileDragOffset / winW) : 1;
    backdropOpacity = progress * 0.45;
  } else if (mobileDragSidebar === 'chapters') {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 380;
    const progress = Math.max(0, mobileDragOffset / winW);
    backdropOpacity = progress * 0.45;
  }

  // Dynamic CSS transforms & backdrop for smooth AI Chats conversation drawer sliding (finger-tracking)
  const isChatDrawerActive = mobileChatView === 'list' || isChatDrawerDragging;
  const mobileChatWinW = typeof window !== 'undefined' ? window.innerWidth : 380;
  const chatDrawerWidth = Math.min(mobileChatWinW * 0.85, 320);

  let chatDrawerTransform = 'translate3d(-100%, 0, 0)';
  if (mobileChatView === 'list') {
    if (isChatDrawerDragging && chatDrawerInitialViewRef.current === 'list') {
      chatDrawerTransform = `translate3d(${chatDrawerOffset}px, 0, 0)`;
    } else {
      chatDrawerTransform = 'translate3d(0px, 0, 0)';
    }
  } else if (isChatDrawerDragging && chatDrawerInitialViewRef.current === 'chat') {
    chatDrawerTransform = `translate3d(calc(-100% + ${chatDrawerOffset}px), 0, 0)`;
  }

  let chatBackdropOpacity = 0;
  if (mobileChatView === 'list') {
    if (isChatDrawerDragging && chatDrawerInitialViewRef.current === 'list') {
      const progress = Math.max(0, 1 + chatDrawerOffset / chatDrawerWidth);
      chatBackdropOpacity = progress * 0.45;
    } else {
      chatBackdropOpacity = 0.45;
    }
  } else if (isChatDrawerDragging && chatDrawerInitialViewRef.current === 'chat') {
    const progress = Math.max(0, chatDrawerOffset / chatDrawerWidth);
    chatBackdropOpacity = progress * 0.45;
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full flex flex-col bg-bg text-fg overflow-hidden select-none">
        {/* Top Navbar (Desktop only - Mobile has dedicated clean native app bars per view) */}
        <header className="hidden lg:flex sticky top-0 z-40 min-h-14 h-[calc(3.5rem+env(safe-area-inset-top,0px))] border-b border-border items-center justify-between px-4 sm:px-6 bg-bg shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        
        {/* Left: Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="font-display text-[18px] sm:text-[20px] tracking-tight flex items-center gap-2 sm:gap-2.5 select-none shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={(theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png'} 
                alt="Theologica Logo" 
                className="w-full h-full object-contain filter contrast-105" 
              />
            </div>
            <span className="font-serif text-[18px] sm:text-[22px] font-bold tracking-tight text-[#c96442] inline shrink-0">
              Theologica
            </span>
          </div>
        </div>

        {/* Center: Tabs (Desktop) */}
        <nav 
          aria-label="Navigation Tabs"
          className="hidden lg:flex items-center gap-1 p-1 bg-surface border border-border-soft/60 rounded-xl shadow-xs select-none mx-auto shrink-0"
        >
          {['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'].map(tab => {
            const label = tab === 'chats' ? 'AI Chats' : tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <button 
                key={tab} 
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'notes') {
                    setActiveNoteId(null);
                  }
                  if (tab === 'canvas') {
                    setIsMobileTyping(false);
                    setCanvasFocusTrigger(prev => prev + 1);
                  }
                  if (tab === 'chats') {
                    setMobileChatView('chat');
                    scrollToBottomOnChatOpenRef.current = true;
                    scrollChatToBottom();
                  }
                }}
                title={label}
                className={`px-2.5 xl:px-3 py-1 rounded-lg text-xs xl:text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-bg text-fg shadow-xs border border-border-soft/60 font-semibold' 
                    : 'text-fg-2 hover:text-fg hover:bg-surface-hover/60 border border-transparent'
                }`}
              >
                {tab === 'study' && <Layout size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                {tab === 'canvas' && <Workflow size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                {tab === 'devotional' && <BookOpen size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                {tab === 'notes' && <Edit size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                {tab === 'chats' && <Sparkles size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                {tab === 'tracker' && <Target size={14} className={activeTab === tab ? 'text-accent' : ''} />}
                <span className="capitalize">{tab === 'chats' ? 'AI Chats' : tab}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Right: Panel Toggles, Streak, Settings & Clerk UserButton */}
        <div className="flex justify-end items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Collapsible Panel Toggles - Book Selector, Quick Note, Study AI & Preset */}
          {activeTab === 'study' && (
            <div className="hidden lg:flex items-center bg-surface border border-border-soft/60 rounded-lg p-0.5 shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => handleToggleLeftSidebar(!showLeftSidebar)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showLeftSidebar ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'
                }`}
                title={showLeftSidebar ? 'Collapse Book Selector' : 'Expand Book Selector'}
                aria-label="Toggle Book Selector"
              >
                {showLeftSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
              <button
                type="button"
                onClick={() => handleToggleBottomNotes(!showBottomNotes)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showBottomNotes ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'
                }`}
                title={showBottomNotes ? 'Collapse Notes' : 'Expand Notes'}
                aria-label="Toggle Notes"
              >
                {showBottomNotes ? <PanelBottomClose size={18} /> : <PanelBottomOpen size={18} />}
              </button>
              <button
                type="button"
                onClick={() => handleToggleRightSidebar(!showRightSidebar)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showRightSidebar ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'
                }`}
                title={showRightSidebar ? 'Collapse Study AI' : 'Expand Study AI'}
                aria-label="Toggle Study AI"
              >
                {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
              <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />
              {/* 1-Click Preset Toggle: Focus Mode vs Scholar Workspace */}
              <button
                type="button"
                onClick={handleToggleWorkspacePreset}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isFocusMode
                    ? 'bg-accent/15 text-accent font-bold hover:bg-accent/25'
                    : 'text-muted hover:text-fg hover:bg-border-soft'
                }`}
                title={
                  isFocusMode
                    ? 'Scholar Workspace: Expand all sidebars for deep study'
                    : 'Reader Focus: Collapse sidebars for distraction-free reading'
                }
                aria-label="Toggle Workspace Layout Preset"
              >
                <BookOpen size={13} className={isFocusMode ? "text-accent" : "opacity-70"} />
                <span>{isFocusMode ? 'Focus' : 'Workspace'}</span>
              </button>
              <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />
              {/* Parallel Split View Toggle (Desktop & Tablet) */}
              <button
                type="button"
                onClick={() => handleToggleSplitView(!isSplitView)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isSplitView
                    ? 'bg-accent/15 text-accent font-bold hover:bg-accent/25'
                    : 'text-muted hover:text-fg hover:bg-border-soft'
                }`}
                title={
                  isSplitView
                    ? 'Close Parallel Split View'
                    : 'Parallel Split View: Read two chapters side by side'
                }
                aria-label="Toggle Parallel Split View"
              >
                <Columns2 size={13} className={isSplitView ? "text-accent" : "opacity-70"} />
                <span>Split View</span>
              </button>
            </div>
          )}

          {/* Offline & Cloud Sync Status Pill */}
          <div 
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
            title={isOnline ? (userId ? "All notes, highlights, and tracker data synced to cloud & offline cache" : "Saved to local offline cache. Sign in to sync across devices.") : "Offline mode active. Your notes and tracker progress are safely saved locally."}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span>{isOnline ? (userId ? 'Synced & Offline' : 'Saved Offline') : 'Working Offline'}</span>
          </div>

          <StreakPopover 
            onNavigateToTab={setActiveTab} 
          />
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="text-muted hover:text-fg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-surface cursor-pointer" 
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          {userId ? (
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
              <UserButton />
            </div>
          ) : (
            <Link 
              href="/sign-in"
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-accent text-accent-on hover:opacity-90 transition-all cursor-pointer shadow-2xs shrink-0 inline-flex items-center justify-center active:scale-95"
              title="Sign in to Theologica"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Subtle Global Mobile Top Bar across non-study tabs */}
      {activeTab !== 'study' && (
        <header 
          className="lg:hidden border-b border-border/40 flex items-center justify-between px-3.5 sm:px-4 bg-bg/95 backdrop-blur-xs shrink-0 z-30 pb-1.5"
          style={{ paddingTop: mobileTopPadding }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {activeTab === 'canvas' && <Workflow size={13} className="text-muted/80 shrink-0" />}
            {activeTab === 'devotional' && <Sun size={13} className="text-muted/80 shrink-0" />}
            {activeTab === 'notes' && <Edit size={13} className="text-muted/80 shrink-0" />}
            {activeTab === 'chats' && <Sparkles size={13} className="text-muted/80 shrink-0" />}
            {activeTab === 'tracker' && <Target size={13} className="text-muted/80 shrink-0" />}
            <span className="font-sans text-[12px] font-medium tracking-wider uppercase text-muted/85 truncate">
              {activeTab === 'canvas' ? 'Study Canvas' :
               activeTab === 'devotional' ? 'Daily Devotional' :
               activeTab === 'notes' ? 'Study Notes' :
               activeTab === 'chats' ? 'Study AI' : 'Reading Tracker'}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <StreakPopover onNavigateToTab={setActiveTab} onNavigateToVerse={navigateToVerse} />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface/60 hover:bg-surface border border-border-soft/40 text-muted hover:text-fg active:scale-95 transition-all cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
            {userId ? (
              <div className="min-w-[32px] min-h-[32px] flex items-center justify-center scale-90">
                <UserButton />
              </div>
            ) : (
              <Link 
                href="/sign-in"
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-accent text-accent-on hover:opacity-90 transition-opacity cursor-pointer shadow-xs active:scale-95"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>
      )}
      
      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden min-h-0 flex relative">
        
        
        {/* MOBILE STUDY TAB (Finger-tracking smooth drawers & gestures) */}
        {activeTab === 'study' && (
          <div className="lg:hidden relative w-full h-full overflow-hidden bg-bg">
            {/* Mobile Left Sidebar: Navigation (Book & Chapter Selector) */}
            <aside 
              onTouchStart={handleBookSelectorTouchStart}
              onTouchMove={handleBookSelectorTouchMove}
              onTouchEnd={handleBookSelectorTouchEnd}
              style={{
                transform: bookSelectorTransform,
                transition: isMobileDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isBookSelectorActive ? 'auto' : 'none',
                visibility: isBookSelectorActive ? 'visible' : 'hidden',
              }}
              className="absolute inset-0 z-30 w-full h-full border-r border-border bg-bg flex flex-col shadow-2xl will-change-transform"
            >
              <header 
                className="min-h-[46px] border-b border-border/60 flex items-center justify-between px-4 shrink-0 bg-bg py-1.5"
                style={{ paddingTop: mobileTopPadding }}
              >
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setMobileStudyView('reader')} className="min-w-[40px] min-h-[40px] flex items-center justify-center -ml-2 p-2 text-fg-2 hover:text-fg rounded-xl hover:bg-surface cursor-pointer" title="Back to reader">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-semibold text-fg text-[16px]">Select Book & Chapter</span>
                </div>
                <div className="text-xs text-muted font-medium pr-1">
                  {isOldTestament ? 'Old Testament' : 'New Testament'}
                </div>
              </header>
              {/* Filter search bar */}
              <div className="p-3 pb-2.5 border-b border-border/40 shrink-0">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="Search books..."
                    className="w-full bg-surface border border-border/60 rounded-xl pl-10 pr-10 py-2.5 min-h-[44px] text-[16px] text-fg placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
                  />
                  {bookSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBookSearchQuery('')}
                      className="absolute right-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-fg rounded-full cursor-pointer"
                      title="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={mobileBookListScrollRef}
                style={{ overflowAnchor: 'none' }}
                className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2"
              >
                {/* Old Testament Section */}
                {filteredOtBooks.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsOtExpanded(!isOtExpanded)}
                      className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isOtExpanded ? "Collapse Old Testament" : "Expand Old Testament"}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isOtExpanded 
                            ? (isOldTestament ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-fg')
                            : 'bg-surface text-muted group-hover:text-fg'
                        }`}>
                          <ChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${isOtExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <span className={`text-[12px] font-bold tracking-wider uppercase truncate ${isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          Old Testament
                        </span>
                      </div>
                      <span className="text-[12px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredOtBooks.length}
                      </span>
                    </button>

                    {(isOtExpanded || Boolean(bookSearchQuery.trim())) && (
                      <div className="mt-1 space-y-1 pl-1">
                        {filteredOtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => handleBookAccordionToggle(e, b.name, mobileBookListScrollRef.current)}
                                className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl text-[15px] cursor-pointer list-none flex justify-between items-center transition-colors ${
                                  isCurrentBook
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-fg-2 hover:bg-surface hover:text-fg'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isCurrentBook && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                  )}
                                  <span className="truncate">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCurrentBook && (
                                    <span className="text-[11px] font-medium opacity-80">
                                      Ch. {activeChapter}
                                    </span>
                                  )}
                                  <ChevronRight size={14} className={`transition-transform duration-150 shrink-0 ${expandedBook === b.name ? 'rotate-90 text-accent' : 'opacity-40 text-muted'}`} />
                                </div>
                              </summary>
                              <div className="grid grid-cols-5 gap-2 p-2.5 bg-surface/40 rounded-xl my-1.5 border border-border/30">
                                {Array.from({ length: b.chapters }).map((_, i) => {
                                  const isCurrentChapter = isCurrentBook && activeChapter === i + 1;
                                  return (
                                    <button 
                                      key={i} 
                                      onClick={() => { 
                                        setActiveBook(b); 
                                        setActiveChapter(i + 1); 
                                        setExpandedBook(b.name); 
                                        setMobileStudyView('reader'); 
                                      }}
                                      className={`min-h-[44px] h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center cursor-pointer touch-manipulation ${
                                        isCurrentChapter 
                                          ? 'bg-accent text-accent-on font-bold shadow-xs' 
                                          : 'text-fg-2 hover:bg-surface hover:text-fg bg-bg/50'
                                      }`}
                                    >
                                      {i + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* New Testament Section */}
                {filteredNtBooks.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsNtExpanded(!isNtExpanded)}
                      className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isNtExpanded ? "Collapse New Testament" : "Expand New Testament"}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isNtExpanded 
                            ? (!isOldTestament ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-fg')
                            : 'bg-surface text-muted group-hover:text-fg'
                        }`}>
                          <ChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${isNtExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <span className={`text-[12px] font-bold tracking-wider uppercase truncate ${!isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          New Testament
                        </span>
                      </div>
                      <span className="text-[12px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredNtBooks.length}
                      </span>
                    </button>

                    {(isNtExpanded || Boolean(bookSearchQuery.trim())) && (
                      <div className="mt-1 space-y-1 pl-1">
                        {filteredNtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => handleBookAccordionToggle(e, b.name, mobileBookListScrollRef.current)}
                                className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl text-[15px] cursor-pointer list-none flex justify-between items-center transition-colors ${
                                  isCurrentBook
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-fg-2 hover:bg-surface hover:text-fg'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isCurrentBook && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                  )}
                                  <span className="truncate">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCurrentBook && (
                                    <span className="text-[11px] font-medium opacity-80">
                                      Ch. {activeChapter}
                                    </span>
                                  )}
                                  <ChevronRight size={14} className={`transition-transform duration-150 shrink-0 ${expandedBook === b.name ? 'rotate-90 text-accent' : 'opacity-40 text-muted'}`} />
                                </div>
                              </summary>
                              <div className="grid grid-cols-5 gap-2 p-2.5 bg-surface/40 rounded-xl my-1.5 border border-border/30">
                                {Array.from({ length: b.chapters }).map((_, i) => {
                                  const isCurrentChapter = isCurrentBook && activeChapter === i + 1;
                                  return (
                                    <button 
                                      key={i} 
                                      onClick={() => { 
                                        setActiveBook(b); 
                                        setActiveChapter(i + 1); 
                                        setExpandedBook(b.name); 
                                        setMobileStudyView('reader'); 
                                      }}
                                      className={`min-h-[44px] h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center cursor-pointer touch-manipulation ${
                                        isCurrentChapter 
                                          ? 'bg-accent text-accent-on font-bold shadow-xs' 
                                          : 'text-fg-2 hover:bg-surface hover:text-fg bg-bg/50'
                                      }`}
                                    >
                                      {i + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty Search State */}
                {filteredOtBooks.length === 0 && filteredNtBooks.length === 0 && (
                  <div className="py-12 text-center text-muted text-xs">
                    No books found matching &quot;{bookSearchQuery}&quot;
                  </div>
                )}
              </div>
            </aside>

            {/* Mobile Center: Bible Reader */}
            <section 
              onTouchStart={handleMobileReaderTouchStart}
              onTouchMove={handleMobileReaderTouchMove}
              onTouchEnd={handleMobileReaderTouchEnd}
              className="absolute inset-0 w-full h-full flex flex-col bg-bg z-10"
            >
              <header 
                ref={mobileReaderHeaderRef}
                className="min-h-[50px] border-b border-border/50 flex items-center justify-between px-1.5 xs:px-2.5 sm:px-3.5 bg-bg/85 backdrop-blur-xl shrink-0 relative z-30 py-1.5"
                style={{
                  paddingTop: mobileTopPadding,
                }}
              >
                {/* Left: Translation (pinned to top-left corner) + Book & Chapter Selector */}
                <div className="flex items-center flex-nowrap min-w-0 flex-1 mr-1 gap-1">
                  {/* Translation Selector (top left corner, left of book) */}
                  <TranslationSelector 
                    currentTranslation={translation} 
                    onSelectTranslation={setTranslation}
                    theme={theme as 'dark' | 'light'}
                    align="left"
                    className="shrink-0"
                  />

                  {/* Book & Chapter Selector Trigger — fits long names like Song of Solomon without truncating */}
                  <div ref={mobileReaderTitleRef} className="flex items-center min-w-0 flex-1 overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setMobileStudyView('chapters')} 
                      className="h-8.5 min-h-[34px] w-full flex items-center gap-1 py-1 px-2 rounded-full bg-surface/80 hover:bg-surface border border-border-soft/60 shadow-2xs text-fg transition-all cursor-pointer active:scale-95 touch-manipulation min-w-0" 
                      title="Choose Book & Chapter"
                    >
                      <BookOpen size={13} className="text-accent shrink-0" />
                      <span className={`font-display font-semibold whitespace-nowrap min-w-0 ${
                        (activeBook.name.length + String(activeChapter).length) > 13
                          ? 'text-[12px] xs:text-[13px] sm:text-[14.5px]'
                          : 'text-[13px] xs:text-[14px] sm:text-[15px]'
                      }`}>
                        {activeBook.name} {activeChapter}
                      </span>
                      <ChevronDown size={11} className="text-muted shrink-0 opacity-60 ml-auto" />
                    </button>
                  </div>

                  {/* Quick-Swap to Bookmarked Chapter */}
                  {bookmarkedChapter && (
                    <button
                      type="button"
                      onClick={handleQuickSwapChapter}
                      className="h-8.5 min-h-[34px] px-2 py-1 rounded-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent flex items-center gap-1 text-[11px] font-semibold transition-all shrink-0 active:scale-95 shadow-2xs cursor-pointer"
                      title={`Quick-swap to ${bookmarkedChapter.book} ${bookmarkedChapter.chapter}`}
                    >
                      <ArrowLeftRight size={11} className="shrink-0 text-accent" />
                      <span className="truncate max-w-[65px] xs:max-w-[80px]">
                        {bookmarkedChapter.book} {bookmarkedChapter.chapter}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
                  {/* Quick Speech / Listen button */}
                  <button 
                    onClick={toggleSpeech} 
                    className={`w-8.5 h-8.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 ${
                      isSpeaking 
                        ? 'bg-accent/15 text-accent animate-pulse border border-accent/30' 
                        : 'text-muted hover:text-fg hover:bg-surface/80 active:scale-95'
                    }`} 
                    title={isSpeaking ? "Stop reading chapter" : "Listen to chapter"}
                    aria-label={isSpeaking ? "Stop reading chapter" : "Listen to chapter"}
                  >
                    {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* Streak Flame (visible across all screens, matching the other mobile tabs) */}
                  <StreakPopover onNavigateToTab={setActiveTab} onNavigateToVerse={navigateToVerse} />

                  {/* Desktop & Tablet shortcuts (hidden on mobile phone screens for clean, uncluttered layout) */}
                  <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
                    {/* Reverse Interlinear Quick Button */}
                    <button 
                      onClick={() => handleToggleInterlinearMode()} 
                      className={`min-w-[38px] min-h-[38px] flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        isInterlinearMode ? 'bg-accent text-accent-on' : 'text-fg-2 hover:text-fg hover:bg-surface'
                      }`} 
                      title={isInterlinearMode ? "Disable Interlinear" : "Enable Interlinear"}
                    >
                      <Languages size={17} />
                    </button>

                    {/* Settings Button */}
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full bg-surface/60 hover:bg-surface border border-border-soft/40 text-muted hover:text-fg active:scale-95 transition-all cursor-pointer"
                      title="Settings"
                      aria-label="Settings"
                    >
                      <Settings size={15} />
                    </button>

                    {/* Profile / Sign In */}
                    {userId ? (
                      <div className="min-w-[30px] min-h-[30px] flex items-center justify-center scale-90">
                        <UserButton />
                      </div>
                    ) : (
                      <Link 
                        href="/sign-in"
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-accent text-accent-on hover:opacity-90 transition-opacity cursor-pointer shadow-xs active:scale-95 shrink-0"
                      >
                        Sign In
                      </Link>
                    )}
                  </div>

                  {/* Study AI Button (Always visible on mobile & desktop reader header) */}
                  <button 
                    onClick={() => {
                      setMobileStudyView('ai');
                      scrollToBottomOnChatOpenRef.current = true;
                      scrollChatToBottom();
                    }} 
                    className="w-8.5 h-8.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 active:scale-95 transition-all cursor-pointer shrink-0 relative" 
                    title="Study AI Assistant"
                    aria-label="Study AI Assistant"
                  >
                    <Sparkles size={15} />
                    {chatQuotes.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 bg-accent text-accent-on text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {chatQuotes.length}
                      </span>
                    )}
                  </button>

                  {/* 3 Dots More Menu Button (Toggles smooth sliding Study Tools drawer) */}
                  <button
                    type="button"
                    onClick={() => setMobileStudyView(prev => prev === 'tools' ? 'reader' : 'tools')}
                    className={`w-8.5 h-8.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full bg-surface/70 hover:bg-surface border border-border-soft/50 text-muted hover:text-fg active:scale-95 transition-all cursor-pointer touch-manipulation ${
                      mobileStudyView === 'tools' ? 'bg-surface text-fg ring-1 ring-border-soft' : ''
                    }`}
                    title="Study tools & options"
                    aria-label="Study tools & options"
                  >
                    <MoreVertical size={16} className="pointer-events-none" />
                  </button>
                </div>
              </header>

              <div 
                className="bible-reader-content select-text flex-1 overflow-y-auto custom-scroll px-4.5 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-10 pb-16 sm:pb-20 lg:pb-12" 
                onScroll={handleReaderScroll}
                onClick={handleReaderTap}
                onMouseUp={handleSelection} 
                onTouchEnd={handleSelection} 
                onContextMenu={handleReaderContextMenu}
              >
                <article className="max-w-[68ch] mx-auto w-full break-words select-text">
                  {isInterlinearMode && (
                    <InterlinearModeRibbon
                      isOldTestament={isOldTestament}
                      bookName={activeBook.name}
                      chapter={activeChapter}
                      showStrongs={interlinearShowStrongs}
                      onToggleShowStrongs={handleToggleStrongs}
                      showTranslit={interlinearShowTranslit}
                      onToggleShowTranslit={handleToggleTranslit}
                      onOpenVerseBreakdown={() => {
                        setVerseInterlinearTarget(1);
                        setIsVerseInterlinearOpen(true);
                      }}
                      onDisableInterlinear={() => handleToggleInterlinearMode(false)}
                      theme={theme as 'dark' | 'light'}
                    />
                  )}
                  {isVersesLoading ? (
                    <div className="space-y-4 py-4 animate-pulse">
                      <div className="h-4 bg-fg/10 rounded w-full"></div>
                      <div className="h-4 bg-fg/10 rounded w-11/12"></div>
                      <div className="h-4 bg-fg/10 rounded w-4/5"></div>
                      <div className="h-4 bg-fg/10 rounded w-full"></div>
                      <div className="h-4 bg-fg/10 rounded w-3/4"></div>
                    </div>
                  ) : bibleVerses.length > 0 ? (
                    <div className={`${getReaderFontClass()} ${getReaderSizeClass(true)} ${getReaderLeadingClass()} text-fg w-full break-words`}>
                      {readerLayout === 'paragraph' ? (
                        <div className="break-words">
                          {bibleVerses.map((v, index) => (
                            <span 
                              key={v.verse} 
                              data-verse={v.verse} 
                              className={`inline rounded-sm px-0.5 transition-colors duration-200 ${
                                currentSpeakingVerseIndex === index ? 'text-accent bg-accent/10' : ''
                              }`}
                            >
                              {showVerseNumbers && (
                                <sup 
                                  onClick={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1 cursor-pointer hover:text-accent hover:scale-110 align-baseline relative -top-0.5 inline-block shrink-0 transition-all ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 
                                    selectionVerse === v.verse ? 'text-accent font-bold scale-110' : 'text-muted/80'
                                  }`}
                                  title={`Click verse ${v.verse} number to highlight whole verse or study`}
                                >
                                  {v.verse}
                                </sup>
                              )}
                              {isInterlinearMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerseInterlinearTarget(v.verse);
                                    setIsVerseInterlinearOpen(true);
                                  }}
                                  className="inline-flex items-center text-muted/40 hover:text-accent transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0 p-0.5"
                                  title={`Open word-by-word original language table for verse ${v.verse}`}
                                >
                                  <Languages size={11} />
                                </button>
                              )}
                              {showBacklinksBadges && chapterBacklinksMap.has(v.verse) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const bInfo = chapterBacklinksMap.get(v.verse)!;
                                    setBacklinksDrawerState({
                                      isOpen: true,
                                      reference: `${activeBook.name} ${activeChapter}:${v.verse}`,
                                      backlinks: bInfo,
                                    });
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 text-accent/80 hover:text-accent font-sans font-medium transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0"
                                  title={`${chapterBacklinksMap.get(v.verse)!.totalCount} backlinks on verse ${v.verse}`}
                                >
                                  <Layers size={10} />
                                  <span>{chapterBacklinksMap.get(v.verse)!.totalCount}</span>
                                </button>
                              )}
                              <span className="verse-text break-words select-text cursor-text">
                                {renderVerseContent(v.verse, v.text)}
                              </span>{" "}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3.5 w-full break-words">
                          {bibleVerses.map((v, index) => (
                            <p 
                              key={v.verse} 
                              data-verse={v.verse} 
                              className={`group relative rounded-lg py-1 px-1.5 sm:px-2 -mx-1 sm:-mx-2 transition-colors duration-200 break-words ${
                                currentSpeakingVerseIndex === index ? 'text-accent bg-accent/5' : ''
                              }`}
                            >
                              {showVerseNumbers && (
                                <sup 
                                  onClick={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1.5 cursor-pointer hover:text-accent hover:scale-110 align-baseline relative -top-0.5 inline-block shrink-0 transition-all ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 
                                    selectionVerse === v.verse ? 'text-accent font-bold scale-110' : 'text-muted/80'
                                  }`}
                                  title={`Click verse ${v.verse} number to highlight whole verse or study`}
                                >
                                  {v.verse}
                                </sup>
                              )}
                              {isInterlinearMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerseInterlinearTarget(v.verse);
                                    setIsVerseInterlinearOpen(true);
                                  }}
                                  className="inline-flex items-center text-muted/40 hover:text-accent transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0 p-0.5"
                                  title={`Open word-by-word original language table for verse ${v.verse}`}
                                >
                                  <Languages size={11} />
                                </button>
                              )}
                              {showBacklinksBadges && chapterBacklinksMap.has(v.verse) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const bInfo = chapterBacklinksMap.get(v.verse)!;
                                    setBacklinksDrawerState({
                                      isOpen: true,
                                      reference: `${activeBook.name} ${activeChapter}:${v.verse}`,
                                      backlinks: bInfo,
                                    });
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 text-accent/80 hover:text-accent font-sans font-medium transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0"
                                  title={`${chapterBacklinksMap.get(v.verse)!.totalCount} backlinks on verse ${v.verse}`}
                                >
                                  <Layers size={10} />
                                  <span>{chapterBacklinksMap.get(v.verse)!.totalCount}</span>
                                </button>
                              )}
                              <span className="verse-text break-words select-text cursor-text">
                                {renderVerseContent(v.verse, v.text)}
                              </span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted">Loading chapter...</span>
                  )}

                  {/* Chapter Navigation on Mobile */}
                  {bibleVerses.length > 0 && !isVersesLoading && (
                    <nav aria-label="Chapter Navigation" className="mt-10 pt-6 border-t border-border flex items-center justify-between gap-3 text-sm">
                      {prevChapterInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigateToVerse(prevChapterInfo.book, prevChapterInfo.chapter, 1);
                            document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                          }}
                          className="flex-1 min-w-0 min-h-[48px] max-w-[220px] flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-fg text-[13px] sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <ChevronLeft size={18} className="shrink-0" />
                          <span className="truncate">{prevChapterInfo.book} {prevChapterInfo.chapter}</span>
                        </button>
                      ) : (
                        <div className="flex-1" />
                      )}

                      {nextChapterInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigateToVerse(nextChapterInfo.book, nextChapterInfo.chapter, 1);
                            document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                          }}
                          className="flex-1 min-w-0 min-h-[48px] max-w-[220px] flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-accent text-accent-on text-[13px] sm:text-sm font-semibold hover:opacity-95 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <span className="truncate">{nextChapterInfo.book} {nextChapterInfo.chapter}</span>
                          <ChevronRight size={18} className="shrink-0" />
                        </button>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </nav>
                  )}
                </article>
              </div>
            </section>

            {/* Backdrop overlay for drawers */}
            {(isBookSelectorActive || isStudyAiActive || isStudyToolsActive) && backdropOpacity > 0 && (
              <div 
                className="absolute inset-0 bg-black/45 z-20 will-change-[opacity]"
                style={{
                  opacity: backdropOpacity,
                  transition: isMobileDragging ? 'none' : 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                  pointerEvents: backdropOpacity > 0.05 ? 'auto' : 'none',
                }}
                onClick={() => {
                  setMobileStudyView('reader');
                  setMobileDragSidebar(null);
                  setMobileDragOffset(0);
                }}
              />
            )}

            {/* Mobile Right Sidebar: Study AI */}
            <aside 
              onTouchStart={handleMobileStudyAiTouchStart}
              onTouchMove={handleMobileStudyAiTouchMove}
              onTouchEnd={handleMobileStudyAiTouchEnd}
              style={{
                transform: studyAiTransform,
                transition: isMobileDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isStudyAiActive ? 'auto' : 'none',
                visibility: isStudyAiActive ? 'visible' : 'hidden',
              }}
              className="absolute inset-0 z-35 w-full h-full border-l border-border bg-bg flex flex-col shadow-2xl will-change-transform"
              onDragEnter={handleChatDragEnter}
              onDragOver={handleChatDragOver}
              onDragLeave={handleChatDragLeave}
              onDrop={handleChatDrop}
            >
              {isDraggingOverChat && (
                <div className="absolute inset-0 z-50 bg-bg/85 backdrop-blur-sm border-2 border-dashed border-accent rounded-2xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 m-2 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-3 shadow-inner">
                    <UploadCloud size={30} className="animate-bounce" />
                  </div>
                  <div className="text-[15px] font-semibold text-fg">Drop file to add to conversation</div>
                  <div className="text-[12px] text-muted mt-1 max-w-xs">Supports images, study PDFs, and notes</div>
                </div>
              )}
              <header 
                className="min-h-[46px] border-b border-border/60 flex items-center justify-between px-3 sm:px-4 text-[15px] font-medium text-fg shrink-0 gap-2 bg-bg py-1.5"
                style={{ paddingTop: mobileTopPadding }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <button onClick={() => setMobileStudyView('reader')} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 -ml-1 text-fg-2 hover:text-fg rounded-xl hover:bg-surface shrink-0 cursor-pointer" title="Back to reader">
                    <ChevronLeft size={22} />
                  </button>
                  <Sparkles size={16} className="text-accent shrink-0" />
                  <span className="truncate">Study AI</span>
                </div>
                <TheologicalLensSelector 
                  currentLens={theologicalLens} 
                  onSelectLens={setTheologicalLens} 
                  includeOriginalRoots={includeOriginalRoots} 
                  onToggleOriginalRoots={handleToggleOriginalRoots} 
                  compact 
                />
              </header>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div
                  ref={mobileStudyChatScrollRef}
                  style={isHomeTypingLocked ? { overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' } : undefined}
                  className={`flex-1 min-h-0 ${
                    isHomeTypingLocked
                      ? 'overflow-hidden overscroll-none touch-none select-none'
                      : 'overflow-y-auto custom-scroll'
                  } ${activeChat.messages.length === 0 && !isAiTyping ? 'flex flex-col' : 'space-y-4'} p-3 sm:p-4`}
                >
                  {activeChat.messages.length === 0 ? (
                    <ChatEmptyState
                      activeBook={activeBook}
                      activeChapter={activeChapter}
                      translation={translation}
                      theologicalLens={theologicalLens}
                      onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                      onSelectLens={setTheologicalLens}
                      isCompact
                    />
                  ) : (
                    activeChat.messages.map((m, i) => (
                      <AiChatMessageView
                        key={i}
                        message={m}
                        index={i}
                        totalMessages={activeChat.messages.length}
                        onVerseClick={navigateToVerse}
                        onSendToCanvas={sendChatMessageToCanvas}
                        onSaveToNotes={saveChatMessageToNotes}
                        onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                        onSelectLensComparison={(lens, prompt) => {
                          setTheologicalLens(lens);
                          handleSendMessage(undefined, prompt);
                        }}
                        chatTitle={activeChat?.title}
                        chatId={activeChatId || activeChat?.id}
                        activeLens={theologicalLens}
                        translation={translation}
                        onScrollToBottom={scrollToBottom}
                      />
                    ))
                  )}
                  {isAiTyping && (
                    <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} />
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-bg shrink-0">
                  {/* Contextual Sync Your Study Banner for Guests */}
                  {hasGuestData && !isSyncBannerDismissed && (
                    <ExpandableSyncBanner
                      message="Study saved locally."
                      onDismiss={() => setIsSyncBannerDismissed(true)}
                    />
                  )}
                  <div className="flex flex-col relative">
                    {/* Scripture Context Pill */}
                    {attachedScripture ? (
                      <div className="mb-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-surface border border-border-soft text-[11px] text-muted shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen size={11} className="text-accent shrink-0" />
                          <span className="font-medium text-fg truncate">{attachedScripture.reference}</span>
                          <span className="text-[9px] uppercase font-bold text-muted bg-surface-warm px-1 rounded shrink-0">{attachedScripture.translation}</span>
                          <span className="text-[10px] text-emerald-400 font-medium shrink-0">Attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedScripture(null)}
                          className="p-0.5 hover:text-fg hover:bg-surface-hover rounded transition-colors ml-1 cursor-pointer shrink-0"
                          title="Remove attached scripture"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : null}

                    {chatQuotes.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1 px-1">
                          <span className="text-[10px] font-semibold text-muted tracking-wider uppercase">
                            Referenced Scripture ({chatQuotes.length})
                          </span>
                          {chatQuotes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setChatQuotes([])}
                              className="text-[10px] text-muted hover:text-error transition-colors cursor-pointer"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="max-h-28 overflow-y-auto custom-scroll space-y-1.5 pr-0.5">
                          {chatQuotes.map((q) => (
                            <div 
                              key={q.id} 
                              className="relative border-l-[3px] border-accent bg-accent/10 py-1.5 px-3 rounded-r-xl rounded-bl-sm shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] text-fg italic line-clamp-2 leading-snug">"{q.text}"</p>
                                  <p className="text-[10px] text-muted font-semibold mt-0.5">— {q.reference}</p>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setChatQuotes(prev => prev.filter(item => item.id !== q.id))} 
                                  className="shrink-0 p-1 text-muted hover:text-error hover:bg-surface rounded-full transition-colors cursor-pointer"
                                  title="Remove reference"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {fileUploadStatus && (
                      <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[12px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-2xs self-start">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                        <span className="truncate">{fileUploadStatus}</span>
                      </div>
                    )}

                    {(attachedFile || chatImage) && (
                      <div className="mb-2 flex items-center gap-2.5 p-2 pr-3 rounded-xl bg-surface border border-border-soft/90 shadow-2xs self-start max-w-full">
                        {attachedFile?.type === 'image' || (!attachedFile && chatImage) ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-soft shrink-0 bg-surface-warm">
                            <img 
                              src={attachedFile?.preview || chatImage?.preview} 
                              alt={attachedFile?.name || 'Attached image'} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ) : (
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            attachedFile?.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'
                          }`}>
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-[12px] font-medium text-fg truncate max-w-[150px] sm:max-w-xs">
                            {attachedFile?.name || chatImage?.name || 'Attached file'}
                          </span>
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            {attachedFile?.size ? formatFileSize(attachedFile.size) : 'Ready'}
                            <span className="text-emerald-400 font-medium">· Added</span>
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={removeAttachedFile} 
                          className="p-1 text-muted hover:text-fg hover:bg-surface-hover rounded-lg transition-colors cursor-pointer shrink-0 ml-auto"
                          title="Remove attached file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {/* Slash Commands Popover */}
                    {showSlashCommands && chatInput.startsWith('/') && (
                      <ChatSlashCommands
                        filter={chatInput}
                        onSelectCommand={(cmd) => {
                          setChatInput(cmd.template);
                          if (cmd.lens) setTheologicalLens(cmd.lens);
                          setShowSlashCommands(false);
                          chatInputRef.current?.focus();
                        }}
                        onClose={() => setShowSlashCommands(false)}
                      />
                    )}

                    <div 
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5"
                    >
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={!isOnline} 
                        className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-0.5 cursor-pointer"
                        title="Attach file or image"
                      >
                        <Paperclip size={18} />
                      </button>
                      <TextareaAutosize 
                        ref={chatInputRef}
                        minRows={1}
                        maxRows={5}
                        className="flex-1 bg-transparent text-fg pl-1 pr-12 py-2.5 text-[16px] placeholder:text-meta focus:outline-none resize-none" 
                        placeholder={!isOnline ? "Study AI is unavailable offline" : "Ask anything (type / for commands)..."} 
                        value={chatInput}
                        onFocus={() => setIsChatInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsChatInputFocused(false), 150)}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          if (e.target.value.startsWith('/')) {
                            setShowSlashCommands(true);
                          } else {
                            setShowSlashCommands(false);
                          }
                        }}
                        onKeyDown={handleChatKeyDown}
                        disabled={!isOnline}
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || !isOnline}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center absolute right-1.5 bottom-1.5 p-2.5 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-30 disabled:hover:bg-accent transition-all shadow-sm shrink-0 cursor-pointer"
                        title="Send message"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-meta text-center mt-1 px-1 select-none leading-tight">
                      Theologica AI can produce inaccuracies. Always cross-reference with Scripture.
                    </p>
                  </div>
                </form>
              </div>
            </aside>

            {/* Mobile Right Sidebar: Study Tools & Options */}
            <aside 
              onTouchStart={handleMobileStudyToolsTouchStart}
              onTouchMove={handleMobileStudyToolsTouchMove}
              onTouchEnd={handleMobileStudyToolsTouchEnd}
              style={{
                transform: studyToolsTransform,
                transition: isMobileDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isStudyToolsActive ? 'auto' : 'none',
                visibility: isStudyToolsActive ? 'visible' : 'hidden',
              }}
              className="absolute inset-0 z-30 w-full h-full border-l border-border bg-bg flex flex-col shadow-2xl will-change-transform"
            >
              <header 
                className="min-h-[50px] border-b border-border/50 flex items-center justify-between px-3 sm:px-4 text-[15px] font-medium text-fg shrink-0 gap-2 bg-bg/85 backdrop-blur-xl py-2"
                style={{ paddingTop: mobileTopPadding }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <button 
                    type="button"
                    onClick={() => setMobileStudyView('reader')} 
                    className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center -ml-1 text-fg-2 hover:text-fg rounded-full hover:bg-surface/80 shrink-0 cursor-pointer" 
                    title="Back to reader"
                    aria-label="Back to reader"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <SlidersHorizontal size={15} className="text-accent shrink-0" />
                  <span className="truncate font-semibold text-[15px] tracking-tight">Study Tools</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-medium text-muted bg-surface/80 px-2.5 py-1 rounded-full border border-border-soft/60 truncate max-w-[130px]">
                    {activeBook.name} {activeChapter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileStudyView('reader')}
                    className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg rounded-full cursor-pointer hover:bg-surface/80"
                    title="Close study tools"
                    aria-label="Close study tools"
                  >
                    <X size={16} />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto custom-scroll p-3.5 sm:p-4 space-y-3.5 pb-24">
                {/* Mobile Chapter Bookmark & Quick-Swap */}
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted px-1.5 mb-1.5 flex items-center justify-between">
                    <span>Chapter Bookmark</span>
                    {bookmarkedChapter && (
                      <span className="text-[10px] text-accent font-semibold lowercase">Active Bookmark</span>
                    )}
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-md overflow-hidden divide-y divide-border/30 shadow-2xs">
                    {bookmarkedChapter ? (
                      <>
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                              <Bookmark size={16} className="fill-accent/30" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] text-muted font-normal">Held Chapter</div>
                              <div className="text-[13.5px] font-semibold text-fg truncate">
                                {bookmarkedChapter.book} {bookmarkedChapter.chapter}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleQuickSwapChapter();
                                setMobileStudyView('reader');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-accent text-accent-on text-xs font-semibold flex items-center gap-1 hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-xs"
                              title={`Swap to ${bookmarkedChapter.book} ${bookmarkedChapter.chapter}`}
                            >
                              <ArrowLeftRight size={13} />
                              <span>Swap</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveBookmark}
                              className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-colors cursor-pointer"
                              title="Remove Bookmark"
                              aria-label="Remove Bookmark"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        {(activeBook.name !== bookmarkedChapter.book || activeChapter !== bookmarkedChapter.chapter) && (
                          <button
                            type="button"
                            onClick={handleBookmarkCurrentChapter}
                            className="w-full min-h-[40px] flex items-center justify-between px-3.5 py-2 hover:bg-fg/5 text-fg text-xs font-medium cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 text-muted">
                              <Bookmark size={13} />
                              <span>Bookmark current chapter ({activeBook.name} {activeChapter})</span>
                            </div>
                            <Check size={14} className="text-muted/60" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleBookmarkCurrentChapter}
                        className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                            <Bookmark size={16} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-[13.5px] font-semibold text-fg truncate">
                              Bookmark {activeBook.name} {activeChapter}
                            </div>
                            <div className="text-[11px] text-muted font-normal truncate">
                              Hold chapter to swap back and forth easily
                            </div>
                          </div>
                        </div>
                        <Plus size={16} className="text-accent shrink-0 ml-2" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Study & Exegesis Group */}
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted px-1.5 mb-1.5">
                    Study Tools
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-md overflow-hidden divide-y divide-border/30 shadow-2xs">
                    {/* Study AI Assistant (Clean, blended row) */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileStudyView('ai');
                        scrollToBottomOnChatOpenRef.current = true;
                        scrollChatToBottom();
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                          <Sparkles size={16} className="text-accent" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Study AI Assistant</div>
                          <div className="text-[11px] text-muted font-normal truncate">Exegetical insights, context & theology</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                    </button>

                    {/* New Note for this Chapter */}
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileStudyView('reader');
                        const created = await handleCreateNote({
                          title: `${activeBook.name} ${activeChapter} Study Notes`,
                          content: `## ${activeBook.name} ${activeChapter} (${translation.toUpperCase()})\n\n### Observations\n- \n\n### Application\n- `,
                        });
                        if (created) setActiveNoteId(created.id);
                        setActiveTab('notes');
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-accent" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">New Note for this Chapter</div>
                          <div className="text-[11px] text-muted font-normal truncate">Open directly in Notes workspace</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                    </button>

                    {/* Reverse Interlinear */}
                    <button
                      type="button"
                      onClick={() => handleToggleInterlinearMode()}
                      className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-sm font-medium cursor-pointer transition-colors ${
                        isInterlinearMode ? 'bg-accent/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isInterlinearMode ? 'bg-accent text-accent-on' : 'bg-fg/5 text-fg-2'}`}>
                          <Languages size={16} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Reverse Interlinear</div>
                          <div className="text-[11px] text-muted font-normal truncate">Hebrew & Greek roots, Strong numbers</div>
                        </div>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                        isInterlinearMode ? 'bg-accent text-accent-on' : 'bg-fg/5 text-muted'
                      }`}>
                        {isInterlinearMode ? 'Active' : 'Off'}
                      </span>
                    </button>

                    {/* Read Chapter Aloud (TTS) */}
                    <button
                      type="button"
                      onClick={() => toggleSpeech()}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSpeaking ? 'bg-accent text-accent-on animate-pulse' : 'bg-fg/5 text-fg-2'}`}>
                          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">{isSpeaking ? 'Stop Reading Aloud' : 'Read Chapter Aloud'}</div>
                          <div className="text-[11px] text-muted font-normal truncate">High-quality voice narration</div>
                        </div>
                      </div>
                      {isSpeaking && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/20 text-accent animate-pulse shrink-0 ml-2">
                          Playing
                        </span>
                      )}
                    </button>

                    {/* Scripture Backlinks */}
                    <button
                      type="button"
                      onClick={() => {
                        setBacklinksDrawerState({
                          isOpen: true,
                          reference: `${activeBook.name} ${activeChapter}`,
                          backlinks: totalChapterBacklinks,
                        });
                        setMobileStudyView('reader');
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                          <Layers size={16} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Scripture Backlinks</div>
                          <div className="text-[11px] text-muted font-normal truncate">Cross-references & canvas connections</div>
                        </div>
                      </div>
                      {totalChapterBacklinks.totalCount > 0 ? (
                        <span className="min-w-[20px] h-5 px-1.5 bg-accent text-accent-on text-[11px] font-bold rounded-full flex items-center justify-center shrink-0 ml-2">
                          {totalChapterBacklinks.totalCount}
                        </span>
                      ) : (
                        <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                      )}
                    </button>

                    {/* Lectio Divina Guided Prayer */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLectioModalOpen(true);
                        setMobileStudyView('reader');
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <Heart size={16} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Lectio Divina</div>
                          <div className="text-[11px] text-muted font-normal truncate">4-step contemplative meditation</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                    </button>
                  </div>
                </div>

                {/* Workspace & Settings Group */}
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted px-1.5 mb-1.5">
                    Workspace & Settings
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-md overflow-hidden divide-y divide-border/30 shadow-2xs">
                    {/* Reading Tracker */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('tracker');
                        setMobileStudyView('reader');
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                          <Target size={16} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Reading Tracker & Goals</div>
                          <div className="text-[11px] text-muted font-normal truncate">Annual plan, chapter stats & streak</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                    </button>

                    {/* Display & Reader Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(true);
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 hover:bg-fg/5 active:bg-fg/10 text-fg text-sm font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-fg/5 text-fg-2 flex items-center justify-center shrink-0">
                          <Settings size={16} />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-[13.5px] font-semibold text-fg truncate">Typography & Reader Display</div>
                          <div className="text-[11px] text-muted font-normal truncate">Fonts, text size, theme & layout</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted/60 shrink-0 ml-2" />
                    </button>
                  </div>
                </div>

                {/* Mark as Completed */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleCompleted()}
                    className={`w-full min-h-[52px] flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                      isCompleted 
                        ? 'bg-accent/10 border-accent/35 text-accent shadow-2xs' 
                        : 'bg-surface/60 border-border/60 hover:bg-surface text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isCompleted ? 'bg-accent text-accent-on' : 'bg-fg/5 text-muted'
                      }`}>
                        <Check size={16} strokeWidth={isCompleted ? 2.8 : 2} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-[13.5px] font-semibold truncate">
                          {isCompleted ? 'Chapter Completed' : 'Mark as Completed'}
                        </div>
                        <div className="text-[11px] text-muted font-normal truncate">
                          {isCompleted ? 'Recorded in reading progress' : `Record ${activeBook.name} ${activeChapter} complete`}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-2 transition-colors ${
                      isCompleted ? 'bg-accent text-accent-on' : 'bg-fg/5 text-muted'
                    }`}>
                      {isCompleted ? 'Done' : 'Mark Done'}
                    </span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Mobile Study Floating Quick Actions (Ask AI & Quick Note) */}
            {mobileStudyView === 'reader' && (
              <aside 
                aria-label="Study quick actions"
                className="fixed bottom-[calc(56px+max(6px,calc(env(safe-area-inset-bottom,0px)-24px)))] right-3.5 z-30 flex md:hidden items-center gap-1.5 p-1 rounded-full bg-surface/90 backdrop-blur-xl border border-border shadow-xl pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMobileStudyView('ai');
                    scrollToBottomOnChatOpenRef.current = true;
                    scrollChatToBottom();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-on text-xs font-semibold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                  title="Ask Study AI"
                  aria-label="Ask Study AI"
                >
                  <Sparkles size={13} />
                  <span>Ask AI</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const created = await handleCreateNote({
                      title: `${activeBook.name} ${activeChapter} Study Notes`,
                      content: `## ${activeBook.name} ${activeChapter} (${translation.toUpperCase()})\n\n### Observations\n- \n\n### Application\n- `,
                    });
                    if (created) setActiveNoteId(created.id);
                    setActiveTab('notes');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface text-fg hover:bg-surface-hover text-xs font-medium border border-border-soft active:scale-95 transition-all cursor-pointer"
                  title="Create Study Note for this Chapter"
                  aria-label="Create Note"
                >
                  <FileText size={13} className="text-accent" />
                  <span>Note</span>
                </button>
              </aside>
            )}
          </div>
        )}

        {activeTab === 'study' && (
          <div className="hidden lg:flex w-full h-full min-h-0 overflow-hidden">
            <PanelGroup 
              orientation="horizontal" 
              id="theologica-layout-v2" 
              className="flex w-full h-full min-h-0 overflow-hidden"
              onLayoutChange={() => measureWidths()}
              onLayoutChanged={() => measureWidths()}
            >
            {/* Left Sidebar: Navigation */}
            {showLeftSidebar && (
              <Panel panelRef={leftPanelRef} defaultSize="15" minSize="15" className={`w-full lg:w-auto border-r border-border bg-bg flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
              <header className="lg:hidden h-[60px] border-b border-border flex items-center px-4 shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-2 text-fg-2 hover:text-fg">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-fg">Books</span>
              </header>
              {/* Filter search bar */}
              <div className="p-3 pb-2 border-b border-border/40 shrink-0">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="Search books..."
                    className="w-full bg-surface border border-border/60 rounded-xl pl-8 pr-7 py-1.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
                  />
                  {bookSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBookSearchQuery('')}
                      className="absolute right-2.5 p-0.5 text-muted hover:text-fg rounded-full cursor-pointer"
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={desktopBookListScrollRef}
                style={{ overflowAnchor: 'none' }}
                className="flex-1 min-h-0 overflow-y-auto custom-scroll p-2 space-y-1"
              >
                {/* Old Testament Section */}
                {filteredOtBooks.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsOtExpanded(!isOtExpanded)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isOtExpanded ? "Collapse Old Testament" : "Expand Old Testament"}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isOtExpanded 
                            ? (isOldTestament ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-fg')
                            : 'bg-surface text-muted group-hover:text-fg'
                        }`}>
                          <ChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${isOtExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          Old Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredOtBooks.length}
                      </span>
                    </button>

                    {(isOtExpanded || Boolean(bookSearchQuery.trim())) && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredOtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => handleBookAccordionToggle(e, b.name, desktopBookListScrollRef.current)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[13px] cursor-pointer list-none flex justify-between items-center transition-colors ${
                                  isCurrentBook
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-fg-2 hover:bg-surface hover:text-fg'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isCurrentBook && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                  )}
                                  <span className="truncate">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCurrentBook && (
                                    <span className="text-[10px] font-medium opacity-80">
                                      Ch. {activeChapter}
                                    </span>
                                  )}
                                  <ChevronRight size={13} className={`transition-transform duration-150 shrink-0 ${expandedBook === b.name ? 'rotate-90 text-accent' : 'opacity-40 text-muted'}`} />
                                </div>
                              </summary>
                              <div className="grid grid-cols-5 gap-1.5 p-2 bg-surface/40 rounded-xl my-1 border border-border/30">
                                {Array.from({ length: b.chapters }).map((_, i) => {
                                  const isCurrentChapter = isCurrentBook && activeChapter === i + 1;
                                  return (
                                    <button 
                                      key={i} 
                                      onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setExpandedBook(b.name); }}
                                      className={`h-7.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                                        isCurrentChapter
                                          ? 'bg-accent text-accent-on font-bold shadow-xs'
                                          : 'text-fg-2 hover:bg-surface hover:text-fg bg-bg/50'
                                      }`}
                                    >
                                      {i + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* New Testament Section */}
                {filteredNtBooks.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsNtExpanded(!isNtExpanded)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isNtExpanded ? "Collapse New Testament" : "Expand New Testament"}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isNtExpanded 
                            ? (!isOldTestament ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-fg')
                            : 'bg-surface text-muted group-hover:text-fg'
                        }`}>
                          <ChevronDown
                            size={12}
                            className={`transition-transform duration-200 ${isNtExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${!isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          New Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredNtBooks.length}
                      </span>
                    </button>

                    {(isNtExpanded || Boolean(bookSearchQuery.trim())) && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredNtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => handleBookAccordionToggle(e, b.name, desktopBookListScrollRef.current)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[13px] cursor-pointer list-none flex justify-between items-center transition-colors ${
                                  isCurrentBook
                                    ? 'bg-accent/10 text-accent font-semibold'
                                    : 'text-fg-2 hover:bg-surface hover:text-fg'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isCurrentBook && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                  )}
                                  <span className="truncate">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCurrentBook && (
                                    <span className="text-[10px] font-medium opacity-80">
                                      Ch. {activeChapter}
                                    </span>
                                  )}
                                  <ChevronRight size={13} className={`transition-transform duration-150 shrink-0 ${expandedBook === b.name ? 'rotate-90 text-accent' : 'opacity-40 text-muted'}`} />
                                </div>
                              </summary>
                              <div className="grid grid-cols-5 gap-1.5 p-2 bg-surface/40 rounded-xl my-1 border border-border/30">
                                {Array.from({ length: b.chapters }).map((_, i) => {
                                  const isCurrentChapter = isCurrentBook && activeChapter === i + 1;
                                  return (
                                    <button 
                                      key={i} 
                                      onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setExpandedBook(b.name); }}
                                      className={`h-7.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                                        isCurrentChapter
                                          ? 'bg-accent text-accent-on font-bold shadow-xs'
                                          : 'text-fg-2 hover:bg-surface hover:text-fg bg-bg/50'
                                      }`}
                                    >
                                      {i + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty Search State */}
                {filteredOtBooks.length === 0 && filteredNtBooks.length === 0 && (
                  <div className="py-12 text-center text-muted text-xs">
                    No books found matching &quot;{bookSearchQuery}&quot;
                  </div>
                )}
              </div>
              </div>
              </Panel>
            )}

            {showLeftSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Center: Bible Reader */}
            <Panel defaultSize="60" minSize="30" className={`w-full lg:w-auto flex-col h-full bg-bg min-w-0 ${mobileStudyView === 'reader' ? 'flex' : 'hidden lg:flex'}`}>
              <div ref={readerContainerRef} className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden relative">
                <PanelGroup orientation="vertical" id="theologica-layout-vertical-v2" className="flex-1 min-h-0">
                <Panel defaultSize="75" minSize="30" className="flex flex-col relative min-w-0">
                  <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden relative">
                    {isSplitView ? (
                      <PanelGroup orientation="horizontal" id="theologica-split-reader" className="flex-1 min-h-0 w-full flex">
                        {/* Primary Reader Pane (Pane 1) */}
                        <Panel defaultSize="50" minSize="30" className="flex flex-col h-full min-w-0 relative">
                          <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden relative">
                            {/* Pane 1 Header */}
                            <header className="w-full max-w-full min-w-0 h-[56px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-5 bg-bg shrink-0 gap-2 relative z-20">
                              <div className="flex items-center gap-1.5 shrink-0 z-1 select-none">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState = !showLeftSidebar;
                                    handleToggleLeftSidebar(nextState);
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1 -ml-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border text-fg transition-all cursor-pointer group text-left active:scale-[0.98]"
                                  title={showLeftSidebar ? "Collapse Book Selector" : "Browse Books & Chapters"}
                                >
                                  <span className="font-display text-[15px] sm:text-[17px] font-semibold whitespace-nowrap">
                                    {activeBook.name} {activeChapter}
                                  </span>
                                  <ChevronDown size={14} className={`text-muted group-hover:text-fg opacity-60 transition-transform ${showLeftSidebar ? 'rotate-180' : ''}`} />
                                </button>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border/60 text-muted">
                                  Primary
                                </span>
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                {prevChapterInfo && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToVerse(prevChapterInfo.book, prevChapterInfo.chapter, 1);
                                      document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                                    }}
                                    className="p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                                    title={`Previous: ${prevChapterInfo.book} ${prevChapterInfo.chapter}`}
                                    aria-label="Previous Chapter"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                )}
                                {nextChapterInfo && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToVerse(nextChapterInfo.book, nextChapterInfo.chapter, 1);
                                      document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                                    }}
                                    className="p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                                    title={`Next: ${nextChapterInfo.book} ${nextChapterInfo.chapter}`}
                                    aria-label="Next Chapter"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                )}
                                <div className="h-4 w-px bg-border/60 mx-0.5" />
                                <TranslationSelector 
                                  currentTranslation={translation} 
                                  onSelectTranslation={setTranslation}
                                  theme={theme as 'dark' | 'light'}
                                  align="right"
                                />
                              </div>
                            </header>

                            {/* Pane 1 Content */}
                            <div className="bible-reader-content select-text flex-1 overflow-y-auto custom-scroll p-6 lg:p-10" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                              <article className="max-w-2xl mx-auto w-full break-words select-text">
                                {isVersesLoading ? (
                                  <div className="space-y-4 py-4 animate-pulse">
                                    <div className="h-4 bg-fg/10 rounded w-full"></div>
                                    <div className="h-4 bg-fg/10 rounded w-11/12"></div>
                                    <div className="h-4 bg-fg/10 rounded w-4/5"></div>
                                    <div className="h-4 bg-fg/10 rounded w-full"></div>
                                  </div>
                                ) : bibleVerses.length > 0 ? (
                                  <div className={`${getReaderFontClass()} ${getReaderSizeClass(false)} ${getReaderLeadingClass()} text-fg w-full break-words`}>
                                    {readerLayout === 'paragraph' ? (
                                      <div className="break-words">
                                        {bibleVerses.map((v, index) => (
                                          <span 
                                            key={v.verse} 
                                            data-verse={v.verse} 
                                            className={`inline rounded-sm px-0.5 transition-colors duration-200 ${
                                              currentSpeakingVerseIndex === index ? 'text-accent bg-accent/10' : ''
                                            }`}
                                          >
                                            {showVerseNumbers && (
                                              <sup className="text-[11px] font-bold text-accent select-none mr-1.5 cursor-pointer hover:underline" onClick={() => scrollToAndHighlightVerse(v.verse)}>
                                                {v.verse}
                                              </sup>
                                            )}
                                            {renderVerseContent(v.verse, v.text, activeBook.name, activeChapter)}
                                            {' '}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {bibleVerses.map((v, index) => (
                                          <p 
                                            key={v.verse} 
                                            data-verse={v.verse} 
                                            className={`flex items-start gap-2 rounded-sm p-1 transition-colors duration-200 ${
                                              currentSpeakingVerseIndex === index ? 'text-accent bg-accent/10' : ''
                                            }`}
                                          >
                                            {showVerseNumbers && (
                                              <span className="text-xs font-bold text-accent select-none min-w-[24px] text-right pt-0.5 cursor-pointer hover:underline" onClick={() => scrollToAndHighlightVerse(v.verse)}>
                                                {v.verse}
                                              </span>
                                            )}
                                            <span className="flex-1">
                                              {renderVerseContent(v.verse, v.text, activeBook.name, activeChapter)}
                                            </span>
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-meta">Loading...</span>
                                )}

                                {bibleVerses.length > 0 && !isVersesLoading && (
                                  <nav aria-label="Pane 1 Chapter Navigation" className="mt-8 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs select-none">
                                    {prevChapterInfo ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigateToVerse(prevChapterInfo.book, prevChapterInfo.chapter, 1);
                                          document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-fg text-xs font-medium cursor-pointer"
                                      >
                                        <ChevronLeft size={14} />
                                        <span>{prevChapterInfo.book} {prevChapterInfo.chapter}</span>
                                      </button>
                                    ) : <div />}
                                    {nextChapterInfo ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigateToVerse(nextChapterInfo.book, nextChapterInfo.chapter, 1);
                                          document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-on text-xs font-medium cursor-pointer"
                                      >
                                        <span>{nextChapterInfo.book} {nextChapterInfo.chapter}</span>
                                        <ChevronRight size={14} />
                                      </button>
                                    ) : <div />}
                                  </nav>
                                )}
                              </article>
                            </div>
                          </div>
                        </Panel>

                        {/* Resizable Divider */}
                        <PanelResizeHandle className="w-1.5 bg-border/60 hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative flex items-center justify-center">
                          <div className="w-0.5 h-7 bg-muted/40 rounded-full" />
                        </PanelResizeHandle>

                        {/* Parallel Reader Pane (Pane 2) */}
                        <Panel defaultSize="50" minSize="30" className="flex flex-col h-full min-w-0 relative bg-surface/15">
                          <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden relative">
                            {/* Pane 2 Header */}
                            <header className="w-full max-w-full min-w-0 h-[56px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-5 bg-bg shrink-0 gap-2 relative z-20">
                              {/* Left: Book Picker & Chapter Selector */}
                              <div ref={splitBookSelectorRef} className="relative z-30 flex items-center gap-1.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => setIsSplitBookSelectorOpen(prev => !prev)}
                                  className="flex items-center gap-1.5 px-2 py-1 -ml-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border text-fg transition-all cursor-pointer group text-left active:scale-[0.98]"
                                  title="Choose Book & Chapter for Split Reader"
                                  aria-expanded={isSplitBookSelectorOpen}
                                >
                                  <span className="font-display text-[15px] sm:text-[17px] font-semibold whitespace-nowrap">
                                    {splitBook.name} {splitChapter}
                                  </span>
                                  <ChevronDown size={14} className={`text-muted group-hover:text-fg opacity-60 transition-transform ${isSplitBookSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                                  Parallel
                                </span>

                                {/* Popover Book/Chapter Picker for Pane 2 */}
                                {isSplitBookSelectorOpen && (
                                  <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-[460px] rounded-2xl bg-surface border border-border shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl flex flex-col space-y-2 select-none">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                      <input
                                        type="text"
                                        value={splitBookSearchQuery}
                                        onChange={(e) => setSplitBookSearchQuery(e.target.value)}
                                        placeholder="Search books..."
                                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-bg border border-border text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent"
                                        autoFocus
                                      />
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scroll space-y-1 max-h-[360px] pr-1">
                                      {splitFilteredOtBooks.length > 0 && (
                                        <div>
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-1">
                                            Old Testament
                                          </div>
                                          {splitFilteredOtBooks.map(b => (
                                            <div key={b.name} className="rounded-lg overflow-hidden">
                                              <button
                                                type="button"
                                                onClick={() => setSplitExpandedBook(splitExpandedBook === b.name ? null : b.name)}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                                                  splitBook.name === b.name ? 'bg-accent/15 text-accent font-semibold' : 'hover:bg-fg/5 text-fg'
                                                }`}
                                              >
                                                <span>{b.name}</span>
                                                <div className="flex items-center gap-1 text-[11px] text-muted">
                                                  <span>{b.chapters} ch</span>
                                                  <ChevronDown size={12} className={`transition-transform ${splitExpandedBook === b.name ? 'rotate-180' : ''}`} />
                                                </div>
                                              </button>
                                              {splitExpandedBook === b.name && (
                                                <div className="p-2 grid grid-cols-5 gap-1.5 bg-bg/50 rounded-lg my-1 border border-border/50">
                                                  {Array.from({ length: b.chapters }, (_, i) => i + 1).map(ch => (
                                                    <button
                                                      key={ch}
                                                      type="button"
                                                      onClick={() => {
                                                        navigateToSplitPassage(b.name, ch);
                                                        setIsSplitBookSelectorOpen(false);
                                                        setSplitBookSearchQuery('');
                                                      }}
                                                      className={`h-7 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                                        splitBook.name === b.name && splitChapter === ch
                                                          ? 'bg-accent text-accent-on font-bold shadow-xs'
                                                          : 'bg-surface hover:bg-surface-hover text-fg border border-border/50'
                                                      }`}
                                                    >
                                                      {ch}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {splitFilteredNtBooks.length > 0 && (
                                        <div className="pt-1.5">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-1">
                                            New Testament
                                          </div>
                                          {splitFilteredNtBooks.map(b => (
                                            <div key={b.name} className="rounded-lg overflow-hidden">
                                              <button
                                                type="button"
                                                onClick={() => setSplitExpandedBook(splitExpandedBook === b.name ? null : b.name)}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                                                  splitBook.name === b.name ? 'bg-accent/15 text-accent font-semibold' : 'hover:bg-fg/5 text-fg'
                                                }`}
                                              >
                                                <span>{b.name}</span>
                                                <div className="flex items-center gap-1 text-[11px] text-muted">
                                                  <span>{b.chapters} ch</span>
                                                  <ChevronDown size={12} className={`transition-transform ${splitExpandedBook === b.name ? 'rotate-180' : ''}`} />
                                                </div>
                                              </button>
                                              {splitExpandedBook === b.name && (
                                                <div className="p-2 grid grid-cols-5 gap-1.5 bg-bg/50 rounded-lg my-1 border border-border/50">
                                                  {Array.from({ length: b.chapters }, (_, i) => i + 1).map(ch => (
                                                    <button
                                                      key={ch}
                                                      type="button"
                                                      onClick={() => {
                                                        navigateToSplitPassage(b.name, ch);
                                                        setIsSplitBookSelectorOpen(false);
                                                        setSplitBookSearchQuery('');
                                                      }}
                                                      className={`h-7 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                                        splitBook.name === b.name && splitChapter === ch
                                                          ? 'bg-accent text-accent-on font-bold shadow-xs'
                                                          : 'bg-surface hover:bg-surface-hover text-fg border border-border/50'
                                                      }`}
                                                    >
                                                      {ch}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Prev/Next, Translation Selector, Close Split View */}
                              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                {splitPrevChapterInfo && (
                                  <button
                                    type="button"
                                    onClick={() => navigateToSplitPassage(splitPrevChapterInfo.book, splitPrevChapterInfo.chapter)}
                                    className="p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                                    title={`Previous: ${splitPrevChapterInfo.book} ${splitPrevChapterInfo.chapter}`}
                                    aria-label="Previous Chapter"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                )}
                                {splitNextChapterInfo && (
                                  <button
                                    type="button"
                                    onClick={() => navigateToSplitPassage(splitNextChapterInfo.book, splitNextChapterInfo.chapter)}
                                    className="p-1.5 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                                    title={`Next: ${splitNextChapterInfo.book} ${splitNextChapterInfo.chapter}`}
                                    aria-label="Next Chapter"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                )}
                                <div className="h-4 w-px bg-border/60 mx-0.5" />
                                <TranslationSelector 
                                  currentTranslation={splitTranslation} 
                                  onSelectTranslation={handleSelectSplitTranslation}
                                  theme={theme as 'dark' | 'light'}
                                  align="right"
                                />
                                <div className="h-4 w-px bg-border/60 mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => handleToggleSplitView(false)}
                                  className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
                                  title="Close Split View (Single Reader)"
                                  aria-label="Close Split View"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </header>

                            {/* Pane 2 Content */}
                            <div className="bible-reader-content select-text flex-1 overflow-y-auto custom-scroll p-6 lg:p-10" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                              <article className="max-w-2xl mx-auto w-full break-words select-text">
                                {isSplitVersesLoading ? (
                                  <div className="space-y-4 py-4 animate-pulse">
                                    <div className="h-4 bg-fg/10 rounded w-full"></div>
                                    <div className="h-4 bg-fg/10 rounded w-11/12"></div>
                                    <div className="h-4 bg-fg/10 rounded w-4/5"></div>
                                    <div className="h-4 bg-fg/10 rounded w-full"></div>
                                  </div>
                                ) : splitBibleVerses.length > 0 ? (
                                  <div className={`${getReaderFontClass()} ${getReaderSizeClass(false)} ${getReaderLeadingClass()} text-fg w-full break-words`}>
                                    {readerLayout === 'paragraph' ? (
                                      <div className="break-words">
                                        {splitBibleVerses.map(v => (
                                          <span 
                                            key={v.verse} 
                                            data-verse={v.verse} 
                                            className="inline rounded-sm px-0.5 transition-colors duration-200"
                                          >
                                            {showVerseNumbers && (
                                              <sup className="text-[11px] font-bold text-accent select-none mr-1.5">
                                                {v.verse}
                                              </sup>
                                            )}
                                            {renderVerseContent(v.verse, v.text, splitBook.name, splitChapter)}
                                            {' '}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {splitBibleVerses.map(v => (
                                          <p 
                                            key={v.verse} 
                                            data-verse={v.verse} 
                                            className="flex items-start gap-2 rounded-sm p-1 transition-colors duration-200"
                                          >
                                            {showVerseNumbers && (
                                              <span className="text-xs font-bold text-accent select-none min-w-[24px] text-right pt-0.5">
                                                {v.verse}
                                              </span>
                                            )}
                                            <span className="flex-1">
                                              {renderVerseContent(v.verse, v.text, splitBook.name, splitChapter)}
                                            </span>
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-meta">Loading...</span>
                                )}

                                {splitBibleVerses.length > 0 && !isSplitVersesLoading && (
                                  <nav aria-label="Pane 2 Chapter Navigation" className="mt-8 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs select-none">
                                    {splitPrevChapterInfo ? (
                                      <button
                                        type="button"
                                        onClick={() => navigateToSplitPassage(splitPrevChapterInfo.book, splitPrevChapterInfo.chapter)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-fg text-xs font-medium cursor-pointer"
                                      >
                                        <ChevronLeft size={14} />
                                        <span>{splitPrevChapterInfo.book} {splitPrevChapterInfo.chapter}</span>
                                      </button>
                                    ) : <div />}
                                    {splitNextChapterInfo ? (
                                      <button
                                        type="button"
                                        onClick={() => navigateToSplitPassage(splitNextChapterInfo.book, splitNextChapterInfo.chapter)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-on text-xs font-medium cursor-pointer"
                                      >
                                        <span>{splitNextChapterInfo.book} {splitNextChapterInfo.chapter}</span>
                                        <ChevronRight size={14} />
                                      </button>
                                    ) : <div />}
                                  </nav>
                                )}

                                {splitChapterCopyright && (
                                  <p className="mt-6 text-[10px] text-muted text-center italic select-none">
                                    {splitChapterCopyright}
                                  </p>
                                )}
                              </article>
                            </div>
                          </div>
                        </Panel>
                      </PanelGroup>
                    ) : (
                      <>
                  <header 
                    ref={readerHeaderRef}
                    className="w-full max-w-full min-w-0 h-[60px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-bg shrink-0 gap-2 relative z-20"
                  >
                    {/* Left: Book & Chapter Reference - ALWAYS visible, clickable to toggle book picker */}
                    <div ref={readerTitleRef} className="flex items-center gap-1.5 shrink-0 z-1 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !showLeftSidebar;
                          handleToggleLeftSidebar(nextState);
                          if (nextState) {
                            setTimeout(() => {
                              const searchInput = document.querySelector('input[placeholder*="Search books"]') as HTMLInputElement;
                              searchInput?.focus();
                            }, 80);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-fg transition-all cursor-pointer group text-left active:scale-[0.98]"
                        title={showLeftSidebar ? "Collapse Book & Chapter Selector" : "Browse Books & Chapters (or press Cmd+K)"}
                        aria-label={`Select Book & Chapter. Current: ${activeBook.name} ${activeChapter}`}
                        aria-expanded={showLeftSidebar}
                      >
                        <span className="font-display text-[16px] sm:text-[18px] lg:text-[20px] font-semibold whitespace-nowrap">
                          {activeBook.name} {activeChapter}
                        </span>
                        <ChevronDown size={15} className={`text-muted group-hover:text-fg opacity-60 transition-transform duration-200 shrink-0 ${showLeftSidebar ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
                      </button>
                    </div>

                    {/* Right: Actions container (Collapsible Tools + Permanent Right Controls) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 min-w-0 justify-end">
                      {/* Collapsible Study Tools - will shrink/clip if ever space is constrained, BEFORE any permanent controls */}
                      <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 min-w-0 overflow-hidden justify-end">
                        {/* 1. Backlinks: First to collapse into 3 dots on narrower widths */}
                        {showBacklinksInBar && (
                          <button
                            onClick={() => {
                              setBacklinksDrawerState({
                                isOpen: true,
                                reference: `${activeBook.name} ${activeChapter}`,
                                backlinks: totalChapterBacklinks,
                              });
                            }}
                            className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg border ring-shadow transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                              totalChapterBacklinks.totalCount > 0
                                ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15'
                                : 'border-border bg-surface text-fg hover:bg-border-soft'
                            }`}
                            title="Scripture Backlinks (Notes, Canvas Boards & Highlights)"
                          >
                            <Layers size={15} />
                            <span>Backlinks</span>
                            {totalChapterBacklinks.totalCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent text-accent-on ml-0.5">
                                {totalChapterBacklinks.totalCount}
                              </span>
                            )}
                          </button>
                        )}

                        {/* 2. Lectio: Second to collapse into 3 dots */}
                        {showLectioInBar && (
                          <button
                            onClick={() => setIsLectioModalOpen(true)}
                            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg bg-surface text-fg hover:bg-border-soft hover:text-accent border border-border ring-shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
                            title="Lectio Divina Guided Meditation"
                          >
                            <Heart size={15} className="text-accent" />
                            <span>Lectio</span>
                          </button>
                        )}

                        {/* 3. Interlinear: Third to collapse into 3 dots */}
                        {showInterlinearInBar && (
                          <button
                            onClick={() => handleToggleInterlinearMode()}
                            className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg border ring-shadow transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                              isInterlinearMode
                                ? 'border-accent bg-accent text-accent-on shadow-accent/20'
                                : 'border-border bg-surface text-fg hover:bg-border-soft'
                            }`}
                            title={isInterlinearMode ? "Disable Reverse Interlinear" : "Enable Reverse Interlinear (Original Hebrew/Greek Word Study)"}
                          >
                            <Languages size={15} />
                            <span>Interlinear</span>
                          </button>
                        )}

                        {/* 4. Mark Complete: Fourth/Last to collapse into 3 dots */}
                        {showMarkCompleteInBar && (
                          <button 
                            onClick={toggleCompleted} 
                            className="flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-lg bg-surface text-fg hover:bg-border-soft ring-shadow ring-shadow-hover transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Check size={16} className={isCompleted ? "text-accent" : "text-meta"} /> 
                            <span>{isCompleted ? "Completed" : "Mark Complete"}</span>
                          </button>
                        )}
                      </div>

                      {/* Permanent Controls: 3-dots (when tools collapsed), Audio, Divider, Translation Selector */}
                      {/* ALWAYS visible, NEVER cut off, strictly anchored to right edge */}
                      <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
                        {/* Desktop 3-dots more menu: visible when study tools collapse */}
                        {hasCollapsedStudyTools && (
                          <div ref={desktopMoreMenuRef} className="relative z-30 desktop-more-menu-container shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsDesktopMoreMenuOpen(prev => !prev)}
                              className={`p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer ${
                                isDesktopMoreMenuOpen ? 'bg-surface text-fg ring-1 ring-border-soft' : ''
                              }`}
                              title="More study tools & options"
                              aria-label="More study options"
                            >
                              <MoreVertical size={18} className="pointer-events-none" />
                            </button>

                            {isDesktopMoreMenuOpen && (
                              <div 
                                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl space-y-1 select-none"
                              >
                                {/* Scripture Backlinks */}
                                {!showBacklinksInBar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDesktopMoreMenuOpen(false);
                                      setBacklinksDrawerState({
                                        isOpen: true,
                                        reference: `${activeBook.name} ${activeChapter}`,
                                        backlinks: totalChapterBacklinks,
                                      });
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-fg/5 text-fg text-xs font-medium cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Layers size={16} className="text-accent" />
                                      <span>Scripture Backlinks</span>
                                    </div>
                                    {totalChapterBacklinks.totalCount > 0 && (
                                      <span className="min-w-[16px] h-4 px-1.5 bg-accent text-accent-on text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {totalChapterBacklinks.totalCount}
                                      </span>
                                    )}
                                  </button>
                                )}

                                {/* Lectio Divina */}
                                {!showLectioInBar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDesktopMoreMenuOpen(false);
                                      setIsLectioModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-fg/5 text-fg text-xs font-medium cursor-pointer transition-colors"
                                  >
                                    <Heart size={16} className="text-rose-400" />
                                    <span>Lectio Divina</span>
                                  </button>
                                )}

                                {/* Reverse Interlinear */}
                                {!showInterlinearInBar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDesktopMoreMenuOpen(false);
                                      handleToggleInterlinearMode();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-fg/5 text-xs font-medium cursor-pointer transition-colors ${
                                      isInterlinearMode ? 'text-accent bg-accent/10 font-semibold' : 'text-fg'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Languages size={16} className={isInterlinearMode ? "text-accent" : "text-fg-2"} />
                                      <span>Reverse Interlinear</span>
                                    </div>
                                    {isInterlinearMode && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent text-accent-on">
                                        Active
                                      </span>
                                    )}
                                  </button>
                                )}

                                {/* Mark Completed */}
                                {!showMarkCompleteInBar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDesktopMoreMenuOpen(false);
                                      toggleCompleted();
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-fg/5 text-xs font-medium cursor-pointer border-t border-border mt-1 pt-2 transition-colors ${
                                      isCompleted ? 'text-accent font-semibold' : 'text-fg'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Check size={16} className={isCompleted ? "text-accent" : "text-meta"} />
                                      <span>{isCompleted ? 'Marked Completed' : 'Mark Complete'}</span>
                                    </div>
                                    {isCompleted && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent/15 text-accent">
                                        Done
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Always Visible Audio Button */}
                        <button onClick={toggleSpeech} className="flex items-center justify-center p-2 min-w-[38px] min-h-[38px] rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer touch-manipulation shrink-0" title="Read chapter aloud">
                          {isSpeaking ? <VolumeX size={18} className="text-accent" /> : <Volume2 size={18} />}
                        </button>

                        <div className="hidden lg:block h-5 w-px bg-border/60 shrink-0"></div>
                        
                        <div className="shrink-0">
                          <TranslationSelector 
                            currentTranslation={translation} 
                            onSelectTranslation={setTranslation}
                            theme={theme as 'dark' | 'light'}
                            align="right"
                          />
                        </div>
                      </div>
                    </div>
                  </header>
              <div className="bible-reader-content select-text flex-1 overflow-y-auto custom-scroll p-10 lg:p-16" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                <article className={`${!showLeftSidebar && !showRightSidebar ? 'max-w-[68ch]' : 'max-w-3xl'} mx-auto w-full break-words select-text`}>
                  {isInterlinearMode && (
                    <InterlinearModeRibbon
                      isOldTestament={isOldTestament}
                      bookName={activeBook.name}
                      chapter={activeChapter}
                      showStrongs={interlinearShowStrongs}
                      onToggleShowStrongs={handleToggleStrongs}
                      showTranslit={interlinearShowTranslit}
                      onToggleShowTranslit={handleToggleTranslit}
                      onOpenVerseBreakdown={() => {
                        setVerseInterlinearTarget(1);
                        setIsVerseInterlinearOpen(true);
                      }}
                      onDisableInterlinear={() => handleToggleInterlinearMode(false)}
                      theme={theme as 'dark' | 'light'}
                    />
                  )}
                  {isVersesLoading ? (
                    <div className="space-y-4 py-4 animate-pulse">
                      <div className="h-4 bg-fg/10 rounded w-full"></div>
                      <div className="h-4 bg-fg/10 rounded w-11/12"></div>
                      <div className="h-4 bg-fg/10 rounded w-4/5"></div>
                      <div className="h-4 bg-fg/10 rounded w-full"></div>
                      <div className="h-4 bg-fg/10 rounded w-3/4"></div>
                    </div>
                  ) : bibleVerses.length > 0 ? (
                    <div className={`${getReaderFontClass()} ${getReaderSizeClass(false)} ${getReaderLeadingClass()} text-fg w-full break-words`}>
                      {readerLayout === 'paragraph' ? (
                        <div className="break-words">
                          {bibleVerses.map((v, index) => (
                            <span 
                              key={v.verse} 
                              data-verse={v.verse} 
                              className={`inline rounded-sm px-0.5 transition-colors duration-200 ${
                                currentSpeakingVerseIndex === index ? 'text-accent bg-accent/10' : ''
                              }`}
                            >
                              {showVerseNumbers && (
                                <sup 
                                  onClick={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1 cursor-pointer hover:text-accent hover:scale-110 align-baseline relative -top-0.5 inline-block shrink-0 transition-all ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 
                                    selectionVerse === v.verse ? 'text-accent font-bold scale-110' : 'text-muted/80'
                                  }`}
                                  title={`Click verse ${v.verse} number to highlight whole verse or study`}
                                >
                                  {v.verse}
                                </sup>
                              )}
                              {isInterlinearMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerseInterlinearTarget(v.verse);
                                    setIsVerseInterlinearOpen(true);
                                  }}
                                  className="inline-flex items-center text-muted/40 hover:text-accent transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0 p-0.5"
                                  title={`Open word-by-word original language table for verse ${v.verse}`}
                                >
                                  <Languages size={11} />
                                </button>
                              )}
                              {showBacklinksBadges && chapterBacklinksMap.has(v.verse) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const bInfo = chapterBacklinksMap.get(v.verse)!;
                                    setBacklinksDrawerState({
                                      isOpen: true,
                                      reference: `${activeBook.name} ${activeChapter}:${v.verse}`,
                                      backlinks: bInfo,
                                    });
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 text-accent/80 hover:text-accent font-sans font-medium transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0"
                                  title={`${chapterBacklinksMap.get(v.verse)!.totalCount} backlinks on verse ${v.verse}`}
                                >
                                  <Layers size={10} />
                                  <span>{chapterBacklinksMap.get(v.verse)!.totalCount}</span>
                                </button>
                              )}
                              <span className="verse-text break-words select-text cursor-text">
                                {renderVerseContent(v.verse, v.text)}
                              </span>{" "}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3.5 w-full break-words">
                          {bibleVerses.map((v, index) => (
                            <p 
                              key={v.verse} 
                              data-verse={v.verse} 
                              className={`group relative rounded-lg py-1 px-2 -mx-2 transition-colors duration-300 break-words ${
                                currentSpeakingVerseIndex === index ? 'text-accent bg-accent/5' : ''
                              }`}
                            >
                              {showVerseNumbers && (
                                <sup 
                                  onClick={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  onTouchEnd={(e) => { e.stopPropagation(); handleVerseNumberClick(e, v.verse); }}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1.5 cursor-pointer hover:text-accent hover:scale-110 align-baseline relative -top-0.5 inline-block shrink-0 transition-all ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 
                                    selectionVerse === v.verse ? 'text-accent font-bold scale-110' : 'text-muted/80'
                                  }`}
                                  title={`Click verse ${v.verse} number to highlight whole verse or study`}
                                >
                                  {v.verse}
                                </sup>
                              )}
                              {isInterlinearMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVerseInterlinearTarget(v.verse);
                                    setIsVerseInterlinearOpen(true);
                                  }}
                                  className="inline-flex items-center text-muted/40 hover:text-accent transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0 p-0.5"
                                  title={`Open word-by-word original language table for verse ${v.verse}`}
                                >
                                  <Languages size={11} />
                                </button>
                              )}
                              {showBacklinksBadges && chapterBacklinksMap.has(v.verse) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const bInfo = chapterBacklinksMap.get(v.verse)!;
                                    setBacklinksDrawerState({
                                      isOpen: true,
                                      reference: `${activeBook.name} ${activeChapter}:${v.verse}`,
                                      backlinks: bInfo,
                                    });
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 text-accent/80 hover:text-accent font-sans font-medium transition-colors select-none cursor-pointer align-baseline relative -top-0.5 mr-1 shrink-0"
                                  title={`${chapterBacklinksMap.get(v.verse)!.totalCount} backlinks on verse ${v.verse}`}
                                >
                                  <Layers size={10} />
                                  <span>{chapterBacklinksMap.get(v.verse)!.totalCount}</span>
                                </button>
                              )}
                              <span className="verse-text break-words select-text cursor-text">
                                {renderVerseContent(v.verse, v.text)}
                              </span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-meta">Loading...</span>
                  )}

                  {/* Chapter Navigation on Desktop */}
                  {bibleVerses.length > 0 && !isVersesLoading && (
                    <nav aria-label="Chapter Navigation" className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4 text-sm select-none">
                      {prevChapterInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigateToVerse(prevChapterInfo.book, prevChapterInfo.chapter, 1);
                            document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-fg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <ChevronLeft size={16} />
                          <span>Previous: {prevChapterInfo.book} {prevChapterInfo.chapter}</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {nextChapterInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigateToVerse(nextChapterInfo.book, nextChapterInfo.chapter, 1);
                            document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <span>Next: {nextChapterInfo.book} {nextChapterInfo.chapter}</span>
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <div />
                      )}
                    </nav>
                  )}
                </article>
              </div>
                      </>
                    )}
                  </div>
                </Panel>
                
                {showBottomNotes && (
                  <PanelResizeHandle className="h-1 bg-surface hover:bg-accent active:bg-accent transition-colors cursor-row-resize shrink-0 z-10 w-full" />
                )}

              {/* Quick Note Split */}
                {showBottomNotes && (
                <Panel panelRef={bottomPanelRef} defaultSize="25" minSize="20" className="hidden lg:flex border-t border-border bg-bg flex-col shrink-0">
                <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                  <div className="h-10 border-b border-border flex items-center justify-between px-6 text-[11px] font-bold text-muted uppercase tracking-widest shrink-0">
                    <span>Quick Note — {chapterTitle}</span>
                    {hasGuestData && !isSyncBannerDismissed && (
                      <span className="text-[10px] lowercase font-normal text-accent flex items-center gap-1">
                        <UploadCloud size={11} /> Saved locally · <Link href="/sign-in" className="underline font-semibold">Sign in</Link> to sync
                      </span>
                    )}
                  </div>
                  <textarea 
                    className="flex-1 min-h-0 bg-transparent p-6 focus:outline-none resize-none text-[15px] leading-relaxed text-fg custom-scroll" 
                    placeholder={`Take notes for ${chapterTitle}...`}
                    value={chapterNote ? chapterNote.content : ''}
                    onChange={handleQuickNoteChange}
                  />
                </div>
                </Panel>
                )}
              </PanelGroup>
              </div>
            </Panel>

            {showRightSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Right Sidebar: Study AI */}
            {showRightSidebar && (
              <Panel 
                panelRef={rightPanelRef} 
                defaultSize="22" 
                minSize="18" 
                className={`relative w-full lg:w-auto border-l border-border bg-bg flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden lg:flex'}`}
                onDragEnter={handleChatDragEnter}
                onDragOver={handleChatDragOver}
                onDragLeave={handleChatDragLeave}
                onDrop={handleChatDrop}
              >
              <div className="w-full h-full flex flex-col min-h-0 min-w-0 overflow-hidden relative">
              {isDraggingOverChat && (
                <div className="absolute inset-0 z-50 bg-bg/85 backdrop-blur-sm border-2 border-dashed border-accent rounded-2xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 m-2 shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-3 shadow-inner">
                    <UploadCloud size={30} className="animate-bounce" />
                  </div>
                  <div className="text-[15px] font-semibold text-fg">Drop file to add to conversation</div>
                  <div className="text-[12px] text-muted mt-1 max-w-xs">Supports images, study PDFs, and notes</div>
                </div>
              )}
              <header className="h-[60px] border-b border-border flex items-center justify-between px-2.5 sm:px-3 lg:px-4 text-[15px] font-medium text-fg shrink-0 gap-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <button onClick={() => setMobileStudyView('reader')} className="lg:hidden p-1.5 -ml-1 text-fg-2 hover:text-fg shrink-0 cursor-pointer" title="Back to reader">
                    <ChevronLeft size={20} />
                  </button>
                  <Sparkles size={16} className="hidden lg:block text-accent shrink-0" />
                  <span className="truncate">Study AI</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <TheologicalLensSelector 
                    currentLens={theologicalLens} 
                    onSelectLens={setTheologicalLens} 
                    includeOriginalRoots={includeOriginalRoots} 
                    onToggleOriginalRoots={handleToggleOriginalRoots} 
                    compact 
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleRightSidebar(false)}
                    className="hidden lg:flex p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
                    title="Collapse Study AI Panel"
                    aria-label="Collapse Study AI Panel"
                  >
                    <PanelRightClose size={16} />
                  </button>
                </div>
              </header>
              <div
                ref={desktopStudyChatScrollRef}
                style={isHomeTypingLocked ? { overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' } : undefined}
                className={`flex-1 min-h-0 ${
                  isHomeTypingLocked
                    ? 'overflow-hidden overscroll-none touch-none select-none'
                    : 'overflow-y-auto custom-scroll'
                } ${activeChat.messages.length === 0 && !isAiTyping ? 'flex flex-col' : 'space-y-6'} p-4`}
              >
                {activeChat.messages.length === 0 ? (
                  <ChatEmptyState
                    activeBook={activeBook}
                    activeChapter={activeChapter}
                    translation={translation}
                    theologicalLens={theologicalLens}
                    onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                    onSelectLens={setTheologicalLens}
                    isCompact
                  />
                ) : (
                  activeChat.messages.map((m, i) => (
                    <AiChatMessageView
                      key={i}
                      message={m}
                      index={i}
                      totalMessages={activeChat.messages.length}
                      onVerseClick={navigateToVerse}
                      onSendToCanvas={sendChatMessageToCanvas}
                      onSaveToNotes={saveChatMessageToNotes}
                      onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                      onSelectLensComparison={(lens, prompt) => {
                        setTheologicalLens(lens);
                        handleSendMessage(undefined, prompt);
                      }}
                      chatTitle={activeChat?.title}
                      chatId={activeChatId || activeChat?.id}
                      activeLens={theologicalLens}
                      translation={translation}
                      onScrollToBottom={scrollToBottom}
                    />
                  ))
                )}
                {isAiTyping && (
                  <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} />
                )}
              </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-bg shrink-0">
                  {/* Contextual Sync Your Study Banner for Guests */}
                  {hasGuestData && !isSyncBannerDismissed && (
                    <ExpandableSyncBanner
                      message="Study saved locally."
                      onDismiss={() => setIsSyncBannerDismissed(true)}
                    />
                  )}
                  <div className="flex flex-col relative">
                    {/* Scripture Context Pill */}
                    {attachedScripture ? (
                      <div className="mb-2.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-surface border border-border-soft text-[11px] text-muted shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen size={11} className="text-accent shrink-0" />
                          <span className="font-medium text-fg truncate">{attachedScripture.reference}</span>
                          <span className="text-[9px] uppercase font-bold text-muted bg-surface-warm px-1 rounded shrink-0">{attachedScripture.translation}</span>
                          <span className="text-[10px] text-emerald-400 font-medium shrink-0">Attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedScripture(null)}
                          className="p-0.5 hover:text-fg hover:bg-surface-hover rounded transition-colors ml-1 cursor-pointer shrink-0"
                          title="Remove attached scripture"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : null}

                    {chatQuotes.length > 0 && (
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between mb-1 px-1">
                          <span className="text-[11px] font-semibold text-muted tracking-wider uppercase">
                            Referenced Scripture ({chatQuotes.length})
                          </span>
                          {chatQuotes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setChatQuotes([])}
                              className="text-[11px] text-muted hover:text-error transition-colors cursor-pointer"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="max-h-36 overflow-y-auto custom-scroll space-y-1.5 pr-0.5">
                          {chatQuotes.map((q) => (
                            <div 
                              key={q.id} 
                              className="group relative border-l-[3px] border-accent bg-accent/10 py-2 px-3.5 rounded-r-xl rounded-bl-sm shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] text-fg-hover italic line-clamp-2 leading-snug">"{q.text}"</p>
                                  <p className="text-[11px] text-muted font-semibold mt-1">— {q.reference}</p>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setChatQuotes(prev => prev.filter(item => item.id !== q.id))} 
                                  className="shrink-0 p-1 text-muted hover:text-error hover:bg-surface rounded-full transition-colors cursor-pointer"
                                  title="Remove reference"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fileUploadStatus && (
                      <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[12px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-2xs self-start">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                        <span className="truncate">{fileUploadStatus}</span>
                      </div>
                    )}

                    {(attachedFile || chatImage) && (
                      <div className="mb-2 flex items-center gap-2.5 p-2 pr-3 rounded-xl bg-surface border border-border-soft/90 shadow-2xs self-start max-w-full">
                        {attachedFile?.type === 'image' || (!attachedFile && chatImage) ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-soft shrink-0 bg-surface-warm">
                            <img 
                              src={attachedFile?.preview || chatImage?.preview} 
                              alt={attachedFile?.name || 'Attached image'} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ) : (
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            attachedFile?.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'
                          }`}>
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-[12px] font-medium text-fg truncate max-w-[150px] sm:max-w-xs">
                            {attachedFile?.name || chatImage?.name || 'Attached file'}
                          </span>
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            {attachedFile?.size ? formatFileSize(attachedFile.size) : 'Ready'}
                            <span className="text-emerald-400 font-medium">· Added</span>
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={removeAttachedFile} 
                          className="p-1 text-muted hover:text-fg hover:bg-surface-hover rounded-lg transition-colors cursor-pointer shrink-0 ml-auto"
                          title="Remove attached file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {/* Slash Commands Popover */}
                    {showSlashCommands && chatInput.startsWith('/') && (
                      <ChatSlashCommands
                        filter={chatInput}
                        onSelectCommand={(cmd) => {
                          setChatInput(cmd.template);
                          if (cmd.lens) setTheologicalLens(cmd.lens);
                          setShowSlashCommands(false);
                          chatInputRef.current?.focus();
                        }}
                        onClose={() => setShowSlashCommands(false)}
                      />
                    )}

                    <div 
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5"
                    >
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={!isOnline} 
                        className="flex-shrink-0 p-2 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1 cursor-pointer"
                        title="Attach file or image"
                      >
                        <Paperclip size={16} />
                      </button>
                      <TextareaAutosize 
                        ref={chatInputRef}
                        minRows={1}
                        maxRows={6}
                        value={chatInput} 
                        onFocus={() => setIsChatInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsChatInputFocused(false), 150)}
                        onChange={e => {
                          setChatInput(e.target.value);
                          if (e.target.value.startsWith('/')) {
                            setShowSlashCommands(true);
                          } else {
                            setShowSlashCommands(false);
                          }
                        }}
                        onKeyDown={handleChatKeyDown}
                        disabled={!isOnline}
                        placeholder={!isOnline ? "Study AI is unavailable offline" : "Message Study AI (type / for commands)..."}
                        className="flex-1 bg-transparent text-fg pl-1 pr-10 py-2 text-[14px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || !isOnline} 
                        className="absolute right-2 bottom-2 p-2 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-40 disabled:hover:bg-accent transition-all shadow-sm cursor-pointer"
                        title="Send message"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-meta text-center mt-1.5 px-1 select-none leading-tight">
                      Theologica AI can produce inaccuracies. Always cross-reference with Scripture and verify primary sources.
                    </p>
                  </div>
                </form>
              </div>
              </Panel>
            )}
          </PanelGroup>
          </div>
        )}


        {/* Floating Toolbar for Highlighting & Referencing */}
        {toolbarPosition && (
          <>
            {/* Mobile Slide-up Verse Action Bottom Sheet (< 768px) */}
            <div 
              className="md:hidden floating-verse-toolbar fixed inset-x-0 bottom-0 z-50 bg-surface/98 border-t border-border/80 rounded-t-[28px] shadow-2xl p-4 animate-in slide-in-from-bottom duration-200 backdrop-blur-2xl"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
            >
              <div className="w-10 h-1 bg-border-soft rounded-full mx-auto mb-3" />
              {/* Header: Verse reference & close button */}
              <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={16} className="text-accent shrink-0" />
                  <span className="font-semibold text-fg text-sm truncate">
                    {activeBook.name} {activeChapter}{selectionVerse ? `:${selectionVerse}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToolbarPosition(null);
                    setSelectionVerse(null);
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-fg rounded-full cursor-pointer -mr-2"
                  title="Close toolbar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Highlight color swatches */}
              <div className="flex items-center justify-between gap-2 px-1 py-1 mb-3">
                {[
                  { color: 'yellow', bg: 'bg-yellow-400', label: 'Yellow' },
                  { color: 'green', bg: 'bg-green-500', label: 'Green' },
                  { color: 'blue', bg: 'bg-blue-500', label: 'Blue' },
                  { color: 'pink', bg: 'bg-pink-400', label: 'Pink' },
                  { color: 'purple', bg: 'bg-purple-400', label: 'Purple' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => saveHighlight(item.color)}
                    className={`w-10 h-10 rounded-full ${item.bg} hover:scale-110 active:scale-90 transition-transform shadow-xs cursor-pointer ring-2 ring-black/10 dark:ring-white/10 flex items-center justify-center`}
                    title={`Highlight ${item.label}`}
                  />
                ))}
                {toolbarPosition.highlightId && (
                  <button
                    type="button"
                    onClick={() => deleteHighlight(toolbarPosition.highlightId!, toolbarPosition.highlightIds)}
                    className="w-10 h-10 rounded-full bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center cursor-pointer ring-1 ring-error/30"
                    title="Delete Highlight"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Action buttons in a comfortable 2-row grid */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={askAiAboutHighlight}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-accent-on hover:opacity-95 text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all"
                >
                  <Sparkles size={15} />
                  <span>Ask AI</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySelectedText}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-warm border border-border text-fg hover:bg-border-soft text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all"
                >
                  {copiedHighlightToast ? (
                    <>
                      <Check size={15} className="text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={addHighlightToChat}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-warm border border-border text-fg hover:bg-border-soft text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all"
                >
                  <MessageSquarePlus size={15} />
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={addHighlightToCanvas}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-warm border border-border text-fg hover:bg-border-soft text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all col-span-1"
                  title="Send to Canvas"
                  aria-label="Send to Canvas"
                >
                  <Workflow size={15} />
                  <span>Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={addHighlightToNotes}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-warm border border-border text-fg hover:bg-border-soft text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all col-span-1"
                  title="Send to Notes"
                  aria-label="Send to Notes"
                >
                  <FileText size={15} />
                  <span>Note</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectionWordStudy}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-warm border border-border text-fg hover:bg-border-soft text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all col-span-1"
                  title="Word Study"
                  aria-label="Word Study"
                >
                  <Languages size={15} className="text-accent" />
                  <span>Words</span>
                </button>
              </div>
            </div>

            {/* Desktop / Tablet Floating Toolbar (>= 768px) */}
            <div 
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  toolbarTouchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    time: Date.now(),
                    hasMoved: false,
                  };
                }
              }}
              onTouchMove={(e) => {
                if (toolbarTouchStartRef.current && e.touches.length > 0) {
                  const dx = Math.abs(e.touches[0].clientX - toolbarTouchStartRef.current.x);
                  const dy = Math.abs(e.touches[0].clientY - toolbarTouchStartRef.current.y);
                  if (dx > 7 || dy > 7) {
                    toolbarTouchStartRef.current.hasMoved = true;
                  }
                }
              }}
              className="hidden md:flex floating-verse-toolbar fixed z-50 items-center gap-1 sm:gap-1.5 bg-surface/95 border border-border-soft p-1.5 rounded-xl shadow-xl backdrop-blur-md max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar custom-scroll transition-opacity"
              style={{ 
                left: Math.max(12, Math.min(typeof window !== 'undefined' ? window.innerWidth - 12 : 360, toolbarPosition.x)), 
                top: toolbarPosition.y,
                transform: toolbarPosition.isBelow ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))'
              }}
            >
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                saveHighlight('yellow'); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                saveHighlight('yellow'); 
              }} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-yellow-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Yellow" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                saveHighlight('green'); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                saveHighlight('green'); 
              }} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-green-500 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Green" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                saveHighlight('blue'); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                saveHighlight('blue'); 
              }} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-blue-500 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Blue" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                saveHighlight('pink'); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                saveHighlight('pink'); 
              }} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-pink-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Pink" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                saveHighlight('purple'); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                saveHighlight('purple'); 
              }} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-purple-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Purple" 
            />
            <div className="w-[1px] h-5 bg-border-soft mx-0.5" />
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                askAiAboutHighlight(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                askAiAboutHighlight(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-accent text-white hover:bg-[#d87654] active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0"
              title="Ask AI about this verse"
            >
              <Sparkles size={14} /> <span className="hidden sm:inline">Ask AI</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                handleCopySelectedText(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                handleCopySelectedText(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Copy scripture citation to clipboard"
            >
              {copiedHighlightToast ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="hidden sm:inline text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                addHighlightToChat(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                addHighlightToChat(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Add to Chat"
            >
              <MessageSquarePlus size={14} />
              <span className="hidden sm:inline">Quote</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                addHighlightToCanvas(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                addHighlightToCanvas(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Send to Canvas"
            >
              <Workflow size={14} />
              <span className="hidden sm:inline">Canvas</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                addHighlightToNotes(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                addHighlightToNotes(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Send to Notes"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Notes</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onTouchEnd={(e) => { 
                e.stopPropagation(); 
                if (toolbarTouchStartRef.current?.hasMoved) return;
                lastTouchEndRef.current = Date.now();
                handleSelectionWordStudy(); 
              }}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (Date.now() - lastTouchEndRef.current < 450) return;
                if (toolbarTouchStartRef.current?.hasMoved) return;
                handleSelectionWordStudy(); 
              }} 
              className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Inspect Hebrew/Greek Word Study"
            >
              <Languages size={14} className="text-accent" />
              <span className="hidden sm:inline">Word Study</span>
            </button>
            {toolbarPosition.highlightId && (
              <>
                <div className="w-[1px] h-5 bg-border-soft mx-0.5" />
                <button 
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} 
                  onTouchEnd={(e) => { 
                    e.stopPropagation(); 
                    if (toolbarTouchStartRef.current?.hasMoved) return;
                    lastTouchEndRef.current = Date.now();
                    deleteHighlight(toolbarPosition.highlightId!, toolbarPosition.highlightIds); 
                  }}
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (Date.now() - lastTouchEndRef.current < 450) return;
                    if (toolbarTouchStartRef.current?.hasMoved) return;
                    deleteHighlight(toolbarPosition.highlightId!, toolbarPosition.highlightIds); 
                  }} 
                  className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-8 px-0 sm:px-2 rounded-lg bg-surface border border-border-soft text-error hover:bg-error hover:text-white transition-all shadow-xs cursor-pointer shrink-0"
                  title="Delete Highlight"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </>
      )}

        {/* DEVOTIONAL TAB */}
        {activeTab === 'devotional' && (
          <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-bg overflow-hidden">
            <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-10 pb-16 lg:pb-10 bg-bg">
            <div className="w-full max-w-4xl xl:max-w-5xl space-y-6">
              {/* Today's local date header */}
              <div className="text-xs sm:text-sm font-medium text-muted tracking-wide">
                Today is {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
              </div>

              {/* Day navigation & Time toggle header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0 pb-3 border-b border-border/50">
                {/* Prev / Today / Next Day Navigation */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeDevotionalDay(displayDay - 1)}
                    className="min-h-[44px] flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold transition-all text-fg cursor-pointer active:scale-95"
                    title="Previous Day"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <div className="min-h-[44px] flex items-center px-3.5 py-2 rounded-xl bg-surface/60 border border-border/50 text-xs font-bold text-fg-hover tracking-wide">
                    Day {displayDay} <span className="text-muted font-normal ml-1">/ {totalDays}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => changeDevotionalDay(displayDay + 1)}
                    className="min-h-[44px] flex items-center gap-1 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold transition-all text-fg cursor-pointer active:scale-95"
                    title="Next Day"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>

                  {displayDay !== todayDayRef.current && (
                    <button
                      type="button"
                      onClick={() => changeDevotionalDay(todayDayRef.current)}
                      className="min-h-[44px] ml-1 px-3 py-2 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/25 transition-all cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Morning / Evening Toggle switch */}
                <div className="flex p-1 bg-surface rounded-xl ring-shadow border border-border/40 min-h-[44px]">
                  <button 
                    onClick={() => setDevotionalTime('morning')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      devotionalTime === 'morning' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Sun size={15} />
                    <span>Morning</span>
                  </button>
                  <button 
                    onClick={() => setDevotionalTime('evening')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      devotionalTime === 'evening' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Moon size={15} />
                    <span>Evening</span>
                  </button>
                </div>
              </div>

              {/* Devotional Article Card with smooth non-overflowing transition */}
              {devotionalEntry && (
                <article className="border-0 sm:border border-border/80 rounded-none sm:rounded-2xl p-1 sm:p-8 lg:p-14 shadow-none sm:shadow-lg bg-transparent sm:bg-surface/25 backdrop-blur-sm ring-0 sm:ring-shadow w-full break-words">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${displayDay}-${devotionalTime}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="w-full"
                    >
                      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                        {(() => {
                          const currentVerse = devotionalTime === 'morning' ? devotionalEntry.morningVerse : devotionalEntry.eveningVerse;
                          const parsedVerse = parseVerseReference(currentVerse);
                          const splitMatch = currentVerse.match(/^(".*?")\s*[-—–]\s*(.+)$/);
                          const quote = splitMatch ? splitMatch[1] : currentVerse;
                          const citation = splitMatch ? splitMatch[2] : (parsedVerse ? parsedVerse.raw : '');

                          return (
                            <div className="space-y-2.5 max-w-3xl">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 tracking-widest uppercase">
                                  {devotionalTime === 'morning' ? 'Morning Devotion' : 'Evening Devotion'}
                                </span>
                                <span className="text-muted text-xs font-medium">
                                  Day {displayDay} of {totalDays}
                                </span>
                              </div>
                              <h2 
                                onClick={() => {
                                  setDailyVerseModal({
                                    isOpen: true,
                                    verseRef: citation || currentVerse,
                                    excerpt: quote,
                                  });
                                }}
                                className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg transition-colors break-words cursor-pointer hover:text-accent group/devo-title"
                                title="Click to read full scripture verse"
                              >
                                {quote}
                              </h2>
                              {citation && (
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDailyVerseModal({
                                        isOpen: true,
                                        verseRef: citation,
                                        excerpt: quote,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-sm sm:text-base font-semibold border border-accent/25 hover:border-accent/40 transition-all cursor-pointer group/devo-verse active:scale-95 shadow-2xs"
                                    title="Click to view full scripture verse"
                                  >
                                    <span>{citation}</span>
                                    <Sparkles size={14} className="text-accent" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDailyVerseModal({
                                        isOpen: true,
                                        verseRef: citation,
                                        excerpt: quote,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface/70 hover:bg-surface text-fg-2 hover:text-fg text-xs font-medium border border-border-soft/50 transition-all cursor-pointer active:scale-95"
                                    title="Read full verse text and context"
                                  >
                                    <BookOpen size={13} className="text-accent" />
                                    <span>Full Verse</span>
                                  </button>

                                  {parsedVerse && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setChatQuotes([{ id: String(Date.now()), text: quote, reference: citation || currentVerse }]);
                                        navigateToVerse(parsedVerse.book, parsedVerse.chapter, parsedVerse.verse);
                                        setActiveTab('study');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 transition-all cursor-pointer active:scale-95 shadow-xs"
                                      title="Open passage in Study with AI context preloaded"
                                      aria-label="Open in Study"
                                    >
                                      <Sparkles size={13} />
                                      <span>Open in Study</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Action controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const v = devotionalTime === 'morning' ? devotionalEntry.morningVerse : devotionalEntry.eveningVerse;
                              const rawT = devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText;
                              const t = getDevotionalBody(rawT);
                              setCanvasIncomingNode({
                                title: `Devotional: ${v}`,
                                content: `### ${v}\n\n${t}\n\n*${devotionalEntry.citation}*`,
                                category: 'application',
                              });
                              setActiveTab('canvas');
                            }}
                            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover text-fg text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
                            title="Send Devotional to Canvas"
                          >
                            <Workflow size={15} className="text-accent" />
                            <span className="hidden sm:inline">Canvas</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const currentVerse = devotionalTime === 'morning' ? devotionalEntry.morningVerse : devotionalEntry.eveningVerse;
                              const splitMatch = currentVerse.match(/^(".*?")\s*[-—–]\s*(.+)$/);
                              const quote = splitMatch ? splitMatch[1] : currentVerse;
                              const citation = splitMatch ? splitMatch[2] : currentVerse;
                              const rawT = devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText;
                              const t = getDevotionalBody(rawT);
                              const created = await handleCreateNote({
                                title: `Devotional: ${citation}`,
                                content: `## ${citation}\n\n> "${quote}"\n\n### Reflection\n${t}\n\n*${devotionalEntry.citation}*\n\n### Study Notes & Reflection\n- `,
                              });
                              if (created) setActiveNoteId(created.id);
                              setActiveTab('notes');
                            }}
                            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover text-fg text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
                            title="Send Devotional to Notes"
                            aria-label="Send to Notes"
                          >
                            <FileText size={15} className="text-accent" />
                            <span className="hidden sm:inline">Send to Notes</span>
                          </button>

                          <button 
                            type="button"
                            onClick={toggleDevoSpeech}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                              isDevoSpeaking 
                                ? 'bg-accent text-white border-accent' 
                                : 'bg-surface text-fg hover:bg-surface-hover border-border'
                            }`}
                            title={isDevoSpeaking ? 'Stop Audio' : 'Listen to Devotional'}
                          >
                            {isDevoSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </button>
                        </div>
                      </header>

                      <div className="w-full h-px bg-border/60 mb-8" />

                      <div className="text-[17px] sm:text-[18px] lg:text-[20px] leading-[1.8] sm:leading-[2.0] text-fg font-serif mb-10 whitespace-pre-wrap break-words selection:bg-accent/20">
                        {linkifyBibleReferences(
                          getDevotionalBody(devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText),
                          navigateToVerse
                        )}
                      </div>

                      <footer className="text-muted text-sm font-medium italic border-t border-border/60 pt-5 flex flex-wrap gap-2 items-center justify-between">
                        <span>{devotionalEntry.citation}</span>
                        <span className="text-xs text-muted/80">Spurgeon’s Morning and Evening</span>
                      </footer>
                    </motion.div>
                  </AnimatePresence>
                </article>
              )}
            </div>
            </div>
          </div>
        )}

        {/* AI CHATS TAB */}
        {activeTab === 'chats' && (() => {
          const chatSidebarContent = (
            <>
              <header 
                className="min-h-[46px] lg:min-h-[60px] border-b border-border flex items-center justify-between px-4 sm:px-5 shrink-0 bg-bg py-1.5 lg:py-0"
              >
                <span className="text-[15px] font-medium text-fg">Conversations</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      handleNewChat();
                      setMobileChatView('chat');
                    }} 
                    className="p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
                    title="New Conversation"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => setMobileChatView('chat')}
                    className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-xl transition-colors cursor-pointer"
                    title="Collapse Conversations"
                    aria-label="Collapse Conversations"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>
              </header>

              {/* Prominent New Conversation Button like ChatGPT / Gemini */}
              <div className="p-3 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleNewChat();
                    setMobileChatView('chat');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
                    !activeChatId 
                      ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-xs' 
                      : 'bg-surface hover:bg-surface-hover border-border-soft text-fg hover:border-border'
                  }`}
                >
                  <Plus size={15} className="shrink-0 text-accent" />
                  <span className="truncate">New Conversation</span>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3 pb-16 lg:pb-3 space-y-1">
                {chats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      openExistingChat(c.id);
                      setMobileChatView('chat');
                    }} 
                    className={`group flex items-center justify-between w-full px-4 py-3 rounded-lg text-[14px] transition-colors cursor-pointer ${activeChatId === c.id ? 'bg-surface text-fg ring-shadow font-medium' : 'text-muted hover:bg-surface hover:text-fg'}`}
                  >
                    <span className="truncate pr-2"><TypewriterTitle title={c.title} /></span>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameChat(c.id, c.title);
                        }} 
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-fg-hover transition-colors cursor-pointer"
                        title="Rename Conversation"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete({ id: c.id, title: c.title });
                        }} 
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete Conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );

          return (
            <div className="flex w-full h-full min-h-0 overflow-hidden relative">
              {/* Desktop Persistent Sidebar (Always visible on desktop screen >= 1024px) */}
              <aside className="hidden lg:flex relative inset-auto z-auto w-[280px] h-full min-h-0 border-r border-border bg-bg flex-col shrink-0 overflow-hidden">
                {chatSidebarContent}
              </aside>

              {/* Mobile Drawer (Finger-tracking touch slide-out & backdrop) */}
              <div className="lg:hidden">
                {isChatDrawerActive && chatBackdropOpacity > 0 && (
                  <div 
                    onClick={() => {
                      setMobileChatView('chat');
                      setIsChatDrawerDragging(false);
                      setChatDrawerOffset(0);
                    }}
                    onTouchStart={handleConversationTouchStart}
                    onTouchMove={handleConversationTouchMove}
                    onTouchEnd={handleConversationTouchEnd}
                    className="absolute inset-0 z-20 bg-black/45 will-change-[opacity]"
                    style={{
                      opacity: chatBackdropOpacity,
                      transition: isChatDrawerDragging ? 'none' : 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                      pointerEvents: chatBackdropOpacity > 0.05 ? 'auto' : 'none',
                    }}
                  />
                )}

                <aside 
                  onTouchStart={handleConversationTouchStart}
                  onTouchMove={handleConversationTouchMove}
                  onTouchEnd={handleConversationTouchEnd}
                  style={{
                    transform: chatDrawerTransform,
                    transition: isChatDrawerDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: isChatDrawerActive ? 'auto' : 'none',
                    visibility: isChatDrawerActive ? 'visible' : 'hidden',
                  }}
                  className="absolute inset-y-0 left-0 z-30 w-[85vw] max-w-[320px] h-full min-h-0 border-r border-border bg-bg flex flex-col shrink-0 overflow-hidden shadow-2xl will-change-transform"
                >
                  {chatSidebarContent}
                </aside>
              </div>

              <section 
                onTouchStart={handleChatTouchStart}
                onTouchMove={handleChatTouchMove}
                onTouchEnd={handleChatTouchEnd}
                className="relative flex-1 h-full min-h-0 flex flex-col bg-bg overflow-hidden"
              onDragEnter={handleChatDragEnter}
              onDragOver={handleChatDragOver}
              onDragLeave={handleChatDragLeave}
              onDrop={handleChatDrop}
            >
              {isDraggingOverChat && (
                <div className="absolute inset-0 z-50 bg-bg/85 backdrop-blur-sm border-2 border-dashed border-accent rounded-3xl flex flex-col items-center justify-center p-8 text-center pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 m-3 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-4 shadow-inner">
                    <UploadCloud size={34} className="animate-bounce" />
                  </div>
                  <div className="text-[18px] font-semibold text-fg tracking-tight">Drop file to add to conversation</div>
                  <div className="text-[13px] text-muted mt-1.5 max-w-sm leading-normal">
                    Drag & drop images (PNG, JPG, WebP), study PDFs, and notes directly into your Bible study chat
                  </div>
                  <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface border border-border-soft text-[12px] font-medium text-accent">
                    <span>Release to attach</span>
                  </div>
                </div>
              )}
              <header 
                className="min-h-[46px] lg:min-h-[60px] border-b border-border/60 flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 bg-bg py-1.5 lg:py-0"
              >
                <div className="flex items-center min-w-0 mr-2 flex-1">
                  <button 
                    onClick={() => {
                      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
                      const isInputActive = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
                      if (isChatInputFocused || isInputActive || isMobileTyping) {
                        (activeEl as HTMLElement)?.blur();
                        return;
                      }
                      setMobileChatView('list');
                    }} 
                    disabled={isChatInputFocused || isMobileTyping}
                    className={`lg:hidden w-9 h-9 p-1.5 mr-2 text-fg-2 hover:text-fg hover:bg-surface rounded-full transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95 ${
                      (isChatInputFocused || isMobileTyping) ? 'opacity-30 pointer-events-none' : ''
                    }`}
                    title="Open Conversations"
                    aria-label="Open Conversations"
                  >
                    <Menu size={18} />
                  </button>
                  <h2 className="text-[15px] sm:text-[18px] font-semibold text-fg truncate">
                    {activeChat.title ? activeChat.title : 'Study AI'}
                  </h2>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <TheologicalLensSelector 
                    currentLens={theologicalLens} 
                    onSelectLens={setTheologicalLens} 
                    includeOriginalRoots={includeOriginalRoots} 
                    onToggleOriginalRoots={handleToggleOriginalRoots} 
                    compact 
                  />
                </div>
              </header>
              <div
                ref={fullChatScrollRef}
                style={isHomeTypingLocked ? { overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' } : undefined}
                className={`flex-1 min-h-0 ${
                  isHomeTypingLocked
                    ? 'overflow-hidden overscroll-none touch-none select-none'
                    : 'overflow-y-auto custom-scroll'
                } ${activeChat.messages.length === 0 && !isAiTyping ? 'flex flex-col' : 'space-y-6 sm:space-y-8'} p-2.5 sm:p-8 lg:p-12`}
              >
                {activeChat.messages.length === 0 ? (
                  <ChatEmptyState
                    activeBook={activeBook}
                    activeChapter={activeChapter}
                    translation={translation}
                    theologicalLens={theologicalLens}
                    onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                    onSelectLens={setTheologicalLens}
                    isCompact={false}
                  />
                ) : (
                  activeChat.messages.map((m, i) => (
                    <AiChatMessageView
                      key={i}
                      message={m}
                      index={i}
                      totalMessages={activeChat.messages.length}
                      onVerseClick={navigateToVerse}
                      onSendToCanvas={sendChatMessageToCanvas}
                      onSaveToNotes={saveChatMessageToNotes}
                      onSelectPrompt={(prompt) => handleSendMessage(undefined, prompt)}
                      onSelectLensComparison={(lens, prompt) => {
                        setTheologicalLens(lens);
                        handleSendMessage(undefined, prompt);
                      }}
                      chatTitle={activeChat?.title}
                      chatId={activeChatId || activeChat?.id}
                      activeLens={theologicalLens}
                      translation={translation}
                      isFullView
                      onScrollToBottom={scrollToBottom}
                    />
                  ))
                )}
                {isAiTyping && (
                  <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} isFullView />
                )}
              </div>
              <form onSubmit={handleSendMessage} className="p-2 sm:p-5 border-t border-border w-full shrink-0">
                <div className="flex flex-col max-w-4xl mx-auto w-full relative">
                  {/* Contextual Sync Your Study Banner for Guests */}
                  {hasGuestData && !isSyncBannerDismissed && (
                    <ExpandableSyncBanner
                      message="Your study notes & chats are saved locally on this device."
                      onDismiss={() => setIsSyncBannerDismissed(true)}
                    />
                  )}
                  {/* Scripture Context Pill */}
                  {attachedScripture ? (
                    <div className="mb-1.5 sm:mb-2.5 flex items-center justify-between px-3 py-1 rounded-xl bg-surface border border-border-soft text-[11px] sm:text-[12px] text-muted shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen size={13} className="text-accent shrink-0" />
                        <span className="font-medium text-fg truncate">Attached: {attachedScripture.reference}</span>
                        <span className="text-[10px] uppercase font-bold text-muted bg-surface-warm px-1.5 py-0.5 rounded shrink-0">{attachedScripture.translation}</span>
                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">Scripture Attached</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedScripture(null)}
                        className="p-1 hover:text-fg hover:bg-surface-hover rounded-lg transition-colors ml-2 cursor-pointer shrink-0"
                        title="Remove attached scripture"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}

                  {chatQuotes.length > 0 && (
                    <div className="mb-3 max-w-3xl">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[11px] font-semibold text-muted tracking-wider uppercase">
                          Referenced Scripture ({chatQuotes.length})
                        </span>
                        {chatQuotes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setChatQuotes([])}
                            className="text-[11px] text-muted hover:text-error transition-colors cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="max-h-36 overflow-y-auto custom-scroll space-y-2 pr-1">
                        {chatQuotes.map((q) => (
                          <div 
                            key={q.id} 
                            className="group relative border-l-[3px] border-accent bg-accent/10 py-2.5 px-4 rounded-r-xl rounded-bl-sm shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] text-fg-hover italic line-clamp-3 leading-snug">"{q.text}"</p>
                                <p className="text-[12px] text-muted font-semibold mt-1">— {q.reference}</p>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setChatQuotes(prev => prev.filter(item => item.id !== q.id))} 
                                className="shrink-0 p-1 text-muted hover:text-error hover:bg-surface rounded-full transition-colors cursor-pointer"
                                title="Remove reference"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fileUploadStatus && (
                    <div className="mb-2.5 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[13px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-2xs self-start">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                      <span className="truncate">{fileUploadStatus}</span>
                    </div>
                  )}

                  {(attachedFile || chatImage) && (
                    <div className="mb-3 flex items-center gap-3 p-2.5 pr-3.5 rounded-xl bg-surface border border-border-soft/90 shadow-2xs self-start max-w-full">
                      {attachedFile?.type === 'image' || (!attachedFile && chatImage) ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border-soft shrink-0 bg-surface-warm">
                          <img 
                            src={attachedFile?.preview || chatImage?.preview} 
                            alt={attachedFile?.name || 'Attached image'} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          attachedFile?.type === 'pdf' ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'
                        }`}>
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[13px] font-medium text-fg truncate max-w-[200px] sm:max-w-xs">
                          {attachedFile?.name || chatImage?.name || 'Attached file'}
                        </span>
                        <span className="text-[11px] text-muted flex items-center gap-1.5">
                          {attachedFile?.size ? formatFileSize(attachedFile.size) : 'Ready'}
                          <span className="text-emerald-400 font-medium">· Attached to conversation</span>
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={removeAttachedFile} 
                        className="p-1 text-muted hover:text-fg hover:bg-surface-hover rounded-lg transition-colors cursor-pointer shrink-0 ml-auto"
                        title="Remove attached file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Slash Commands Popover */}
                  {showSlashCommands && chatInput.startsWith('/') && (
                    <ChatSlashCommands
                      filter={chatInput}
                      onSelectCommand={(cmd) => {
                        setChatInput(cmd.template);
                        if (cmd.lens) setTheologicalLens(cmd.lens);
                        setShowSlashCommands(false);
                        chatInputRef.current?.focus();
                      }}
                      onClose={() => setShowSlashCommands(false)}
                    />
                  )}

                  <div 
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-md focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-2"
                  >
                    <button 
                      type="button" 
                      onClick={() => imageFileRef.current?.click()} 
                      disabled={!isOnline} 
                      className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1 cursor-pointer"
                      title="Attach file or image"
                    >
                      <Paperclip size={18} />
                    </button>
                    <TextareaAutosize 
                      ref={chatInputRef}
                      minRows={1}
                      maxRows={6}
                      value={chatInput} 
                      onFocus={() => setIsChatInputFocused(true)}
                      onBlur={() => setTimeout(() => setIsChatInputFocused(false), 150)}
                      onChange={e => {
                        setChatInput(e.target.value);
                        if (e.target.value.startsWith('/')) {
                          setShowSlashCommands(true);
                        } else {
                          setShowSlashCommands(false);
                        }
                      }}
                      onKeyDown={handleChatKeyDown}
                      disabled={!isOnline}
                      placeholder={!isOnline ? "Study AI is unavailable offline" : "Ask anything (type / for commands)..."}
                      className="flex-1 bg-transparent text-fg pl-1 pr-14 py-2.5 text-[16px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                    />
                    <button 
                      type="submit" 
                      disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || !isOnline} 
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center absolute right-2 bottom-2 p-2.5 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-40 disabled:hover:bg-accent transition-all shadow-sm cursor-pointer"
                      title="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-[12px] text-meta text-center mt-1 sm:mt-2 px-2 select-none leading-tight truncate">
                    Theologica AI can produce inaccuracies. Always cross-reference with Scripture.
                  </p>
                </div>
              </form>
            </section>
            </div>
          );
        })()}

        {/* TRACKER TAB */}
        {activeTab === 'tracker' && (() => {
          const totalChapters = 1189;
          const completedCount = completedChapters.length;
          const progressPercent = Math.round((completedCount / totalChapters) * 100) || 0;
          
          const otTotal = OT_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
          const ntTotal = NT_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
          const otCompleted = OT_BOOKS.reduce((acc, b) => acc + completedChapters.filter(c => c.startsWith(b.name + '-')).length, 0);
          const ntCompleted = NT_BOOKS.reduce((acc, b) => acc + completedChapters.filter(c => c.startsWith(b.name + '-')).length, 0);
          const otPercent = Math.round((otCompleted / otTotal) * 100) || 0;
          const ntPercent = Math.round((ntCompleted / ntTotal) * 100) || 0;


          return (
            <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-bg overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-10 lg:p-16 pb-16 lg:pb-16 bg-bg">
              <div className="max-w-5xl mx-auto">
                <header className="hidden lg:block mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-[40px] font-display text-fg mb-2 sm:mb-3">Reading Tracker</h1>
                  <p className="text-sm sm:text-[16px] text-muted">Track your reading streak, daily goals, and progress through all 66 books.</p>
                </header>

                {/* Streak, Daily Goal & 7-Day Consistency Dashboard */}
                <TrackerStreakHero
                  dailyChapterGoal={dailyChapterGoal}
                  totalChaptersCompleted={completedCount}
                  onNavigateToTab={setActiveTab}
                  onNavigateToVerse={navigateToVerse}
                  onUpdateDailyChapterGoal={handleDailyChapterGoalChange}
                />

                <div className="bg-surface p-4 sm:p-8 rounded-[20px] ring-shadow mb-8 sm:mb-16">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-[12px] font-bold tracking-widest text-muted uppercase mb-2">Overall Progress</div>
                      <div className="text-[28px] sm:text-[32px] font-semibold text-fg leading-none">{progressPercent}%</div>
                    </div>
                    <div className="text-xs sm:text-[15px] font-medium text-fg-2">{completedCount} / {totalChapters} Chapters</div>
                  </div>
                  <div className="h-3.5 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                    <div className="h-full bg-accent transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* Guided Reading Plans Section */}
                <section className="mb-8 sm:mb-14">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-fg tracking-wide uppercase">Reading Plans</h2>
                      <p className="text-xs text-muted">Curated paths that advance your tracker and daily goals</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                    {[
                      {
                        id: 'gospels',
                        title: 'The Four Gospels',
                        tagline: 'Life & Teachings of Jesus Christ',
                        books: ['Matthew', 'Mark', 'Luke', 'John'],
                      },
                      {
                        id: 'nt',
                        title: 'The New Testament',
                        tagline: 'Complete Apostolic Witness & Early Church',
                        books: NT_BOOKS.map(b => b.name),
                      },
                      {
                        id: 'psalms-proverbs',
                        title: 'Psalms & Proverbs',
                        tagline: 'Daily Prayer, Worship & Practical Wisdom',
                        books: ['Psalms', 'Proverbs'],
                      },
                      {
                        id: 'epistles',
                        title: 'Paul’s Epistles',
                        tagline: 'Doctrines of Grace, Salvation & Faith',
                        books: [
                          'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
                          'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
                          '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'
                        ],
                      },
                    ].map((plan) => {
                      const allPlanChapters = plan.books.flatMap(bookName => {
                        const bookInfo = [...OT_BOOKS, ...NT_BOOKS].find(b => b.name === bookName);
                        if (!bookInfo) return [];
                        return Array.from({ length: bookInfo.chapters }, (_, i) => ({
                          book: bookName,
                          chapter: i + 1,
                          id: `${bookName}-${i + 1}`
                        }));
                      });
                      const completedInPlan = allPlanChapters.filter(c => completedChapters.includes(c.id)).length;
                      const planPercent = Math.round((completedInPlan / allPlanChapters.length) * 100) || 0;
                      const nextChapter = allPlanChapters.find(c => !completedChapters.includes(c.id));

                      return (
                        <div 
                          key={plan.id}
                          className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-surface/60 hover:bg-surface ring-shadow transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm sm:text-[15px] font-bold text-fg">{plan.title}</h3>
                              <p className="text-[11.5px] text-muted">{plan.tagline}</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 shrink-0">
                              {planPercent}%
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-meta">
                              <span>Progress</span>
                              <span>{completedInPlan} / {allPlanChapters.length} Chapters</span>
                            </div>
                            <div className="h-2 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                              <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${planPercent}%` }} />
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted truncate">
                              {nextChapter ? (
                                <>Next: <span className="font-semibold text-fg">{nextChapter.book} {nextChapter.chapter}</span></>
                              ) : (
                                <span className="text-emerald-500 font-semibold">✓ Plan Completed</span>
                              )}
                            </span>

                            {nextChapter ? (
                              <button
                                type="button"
                                onClick={() => {
                                  navigateToVerse(nextChapter.book, nextChapter.chapter, 1);
                                  setActiveTab('study');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-on text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                              >
                                <span>Read Chapter</span>
                                <ChevronRight size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  navigateToVerse(allPlanChapters[0].book, allPlanChapters[0].chapter, 1);
                                  setActiveTab('study');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-muted hover:text-fg transition-all cursor-pointer shrink-0"
                              >
                                <span>Review</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Old Testament Accordion */}
                <div className="mb-6">
                  <button 
                    onClick={() => toggleTestament('OT')}
                    className="w-full min-h-[52px] flex items-center justify-between text-left bg-surface p-3.5 sm:p-5 rounded-2xl ring-shadow hover:bg-surface-warm transition-colors cursor-pointer"
                  >
                    <div className="text-sm sm:text-[16px] font-bold tracking-widest text-fg uppercase">Old Testament</div>
                    
                      <div className="flex-1 mx-3 sm:mx-6 min-w-[50px]">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${otPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-3 sm:mr-4 shrink-0">{trackerFormat === 'percent' ? `${otPercent}%` : `${otCompleted}/${otTotal}`}</div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                        expandedTestaments.includes('OT') 
                          ? 'bg-accent/15 text-accent rotate-180' 
                          : 'bg-bg text-muted rotate-0'
                      }`}>
                        <ChevronDown size={16} className="transition-transform duration-300" />
                      </div>
                  </button>
                  
                  {expandedTestaments.includes('OT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-border">
                      {OT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        const comp = completedChapters.filter(c => c.startsWith(book.name + '-')).length;
                        const allRead = comp === book.chapters;
                        return (
                          <div key={book.name} className="bg-surface rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full min-h-[48px] flex items-center justify-between p-3.5 sm:p-4 hover:bg-surface transition-colors cursor-pointer"
                            >
                              <h3 className="font-medium text-[15px] text-fg">{book.name}</h3>
                              
                              <div className="flex items-center gap-2">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookAllChapters(book);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      toggleBookAllChapters(book);
                                    }
                                  }}
                                  title={allRead ? `Unmark all ${book.chapters} chapters of ${book.name}` : `Mark all ${book.chapters} chapters of ${book.name} as read in one click`}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                                    allRead
                                      ? 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-semibold'
                                      : 'bg-bg text-muted hover:text-fg hover:bg-border-soft border border-border/60'
                                  }`}
                                >
                                  {allRead ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2} />}
                                  <span>Mark All</span>
                                </span>
                                <span className="text-[13px] text-muted font-mono bg-bg px-2 py-1 rounded-md">
                                  {trackerFormat === 'percent' ? `${Math.round((comp / book.chapters) * 100) || 0}%` : `${comp}/${book.chapters}`}
                                </span>
                              </div>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-border bg-bg">
                                <div className="pt-3 pb-1.5 border-b border-border/40">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                    Chapters (1–{book.chapters})
                                  </span>
                                </div>

                                <div 
                                  className="flex flex-wrap gap-2 mt-4 select-none touch-manipulation"
                                  onTouchStart={handleChapterGridTouchStart}
                                  onTouchEnd={handleChapterGridTouchEnd}
                                >
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = `${book.name}-${i + 1}`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        data-chapter-id={id}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked 
                                            ? 'bg-accent text-white shadow-sm' 
                                            : 'bg-surface text-muted hover:text-fg hover:bg-border-soft'
                                        }`}
                                      >
                                        {i + 1}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* New Testament Accordion */}
                <div className="mb-16">
                  <button 
                    onClick={() => toggleTestament('NT')}
                    className="w-full min-h-[52px] flex items-center justify-between text-left bg-surface p-3.5 sm:p-5 rounded-2xl ring-shadow hover:bg-surface-warm transition-colors cursor-pointer"
                  >
                    <div className="text-sm sm:text-[16px] font-bold tracking-widest text-fg uppercase">New Testament</div>
                    
                      <div className="flex-1 mx-3 sm:mx-6 min-w-[50px]">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${ntPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-3 sm:mr-4 shrink-0">{trackerFormat === 'percent' ? `${ntPercent}%` : `${ntCompleted}/${ntTotal}`}</div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                        expandedTestaments.includes('NT') 
                          ? 'bg-accent/15 text-accent rotate-180' 
                          : 'bg-bg text-muted rotate-0'
                      }`}>
                        <ChevronDown size={16} className="transition-transform duration-300" />
                      </div>
                  </button>
                  
                  {expandedTestaments.includes('NT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-border">
                      {NT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        const comp = completedChapters.filter(c => c.startsWith(book.name + '-')).length;
                        const allRead = comp === book.chapters;
                        return (
                          <div key={book.name} className="bg-surface rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full min-h-[48px] flex items-center justify-between p-3.5 sm:p-4 hover:bg-surface transition-colors cursor-pointer"
                            >
                              <h3 className="font-medium text-[15px] text-fg">{book.name}</h3>
                              
                              <div className="flex items-center gap-2">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookAllChapters(book);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      toggleBookAllChapters(book);
                                    }
                                  }}
                                  title={allRead ? `Unmark all ${book.chapters} chapters of ${book.name}` : `Mark all ${book.chapters} chapters of ${book.name} as read in one click`}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                                    allRead
                                      ? 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-semibold'
                                      : 'bg-bg text-muted hover:text-fg hover:bg-border-soft border border-border/60'
                                  }`}
                                >
                                  {allRead ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2} />}
                                  <span>Mark All</span>
                                </span>
                                <span className="text-[13px] text-muted font-mono bg-bg px-2 py-1 rounded-md">
                                  {trackerFormat === 'percent' ? `${Math.round((comp / book.chapters) * 100) || 0}%` : `${comp}/${book.chapters}`}
                                </span>
                              </div>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-border bg-bg">
                                <div className="pt-3 pb-1.5 border-b border-border/40">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                    Chapters (1–{book.chapters})
                                  </span>
                                </div>

                                <div 
                                  className="flex flex-wrap gap-2 mt-4 select-none touch-manipulation"
                                  onTouchStart={handleChapterGridTouchStart}
                                  onTouchEnd={handleChapterGridTouchEnd}
                                >
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = `${book.name}-${i + 1}`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        data-chapter-id={id}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked 
                                            ? 'bg-accent text-white shadow-sm' 
                                            : 'bg-surface text-muted hover:text-fg hover:bg-border-soft'
                                        }`}
                                      >
                                        {i + 1}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })()}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <NotesWorkspace
            notes={notes}
            highlights={highlights}
            onSendHighlightToCanvas={(hl) => {
              const reference = `${hl.book} ${hl.chapter}:${hl.verse}`;
              setCanvasIncomingNode({
                title: reference,
                content: `> "${hl.text}"\n\n*${reference}*`,
                category: 'scripture',
              });
              setActiveTab('canvas');
            }}
            activeNoteId={activeNoteId}
            onSelectNote={setActiveNoteId}
            onCreateNote={handleCreateNote}
            onUpdateNote={updateNote}
            onDeleteNote={handleDeleteNote}
            onNavigateToVerse={navigateToVerse}
            theologicalLens={theologicalLens}
            currentTranslation={translation}
            theme={theme as 'dark' | 'light'}
          />
        )}


        {/* CANVAS TAB */}
        <div className={`flex-1 w-full h-full relative overflow-hidden ${activeTab === 'canvas' ? 'flex flex-col' : 'hidden'}`}>
          <CanvasBoard
            theme={theme as 'dark' | 'light'}
            incomingNode={canvasIncomingNode}
            onIncomingNodeHandled={() => setCanvasIncomingNode(null)}
            isActiveTab={activeTab === 'canvas'}
            focusTrigger={canvasFocusTrigger}
            onNavigateToVerse={navigateToVerse}
          />
        </div>
      </main>
        {/* Mobile Bottom Navigation — Sleek, modern app tab bar safely anchored above iOS home indicator */}
        <nav 
          aria-label="Mobile Navigation"
          className={`lg:hidden shrink-0 bg-bg/90 backdrop-blur-2xl border-t border-border/40 flex items-center justify-around px-1 z-40 w-full select-none ${
            (isMobileTyping && activeTab !== 'canvas') ? 'hidden pointer-events-none' : 'flex'
          }`}
          style={{ 
            height: 'calc(44px + max(calc(env(safe-area-inset-bottom, 0px) - 28px), 4px))',
            paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) - 28px), 4px)',
            paddingTop: '2px',
            transition: 'background-color 200ms ease'
          }}
        >
          {[
            { id: 'study', label: 'Study', icon: BookOpen },
            { id: 'canvas', label: 'Canvas', icon: Workflow },
            { id: 'devotional', label: 'Devotional', icon: Sun },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'chats', label: 'AI Chats', icon: Sparkles },
            { id: 'tracker', label: 'Tracker', icon: Target },
          ].map(tab => {
            const isTabActive = activeTab === tab.id;

            return (
              <button 
                key={tab.id} 
                onClick={() => {
                  setActiveTab(tab.id as ValidTab);
                  if (tab.id === 'notes') {
                    setActiveNoteId(null);
                  }
                  if (tab.id === 'canvas') {
                    setIsMobileTyping(false);
                    setCanvasFocusTrigger(prev => prev + 1);
                  }
                  if (tab.id === 'chats') {
                    setMobileChatView('chat');
                    scrollToBottomOnChatOpenRef.current = true;
                    scrollChatToBottom();
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center h-[42px] py-0.5 transition-all duration-200 ease-out relative cursor-pointer active:scale-95 touch-manipulation select-none"
                title={tab.label}
                aria-label={tab.label}
              >
                <div className="relative flex items-center justify-center">
                  <tab.icon 
                    size={18} 
                    strokeWidth={isTabActive ? 2.2 : 1.7}
                    className={`transition-all duration-200 ease-out ${
                      isTabActive ? 'text-accent scale-105' : 'text-muted/70 hover:text-fg scale-100'
                    }`}
                  />
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 leading-none transition-all duration-200 ease-out ${
                  isTabActive ? 'text-accent font-semibold' : 'text-meta font-medium'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* SETTINGS MODAL */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          theme={theme}
          onThemeChange={handleThemeChange}
          accentColor={accentColor}
          onAccentColorChange={handleAccentColorChange}
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={handleToggleLeftSidebar}
          showRightSidebar={showRightSidebar}
          onToggleRightSidebar={handleToggleRightSidebar}
          showBottomNotes={showBottomNotes}
          onToggleBottomNotes={handleToggleBottomNotes}
          isSplitView={isSplitView}
          onToggleSplitView={handleToggleSplitView}
          readerFontFamily={readerFontFamily}
          onReaderFontFamilyChange={handleReaderFontFamilyChange}
          readerFontSize={readerFontSize}
          onReaderFontSizeChange={handleReaderFontSizeChange}
          readerLineHeight={readerLineHeight}
          onReaderLineHeightChange={handleReaderLineHeightChange}
          readerLayout={readerLayout}
          onReaderLayoutChange={handleReaderLayoutChange}
          showVerseNumbers={showVerseNumbers}
          onToggleVerseNumbers={handleToggleVerseNumbers}
          showFootnotes={showFootnotes}
          onToggleFootnotes={handleToggleFootnotes}
          showBacklinksBadges={showBacklinksBadges}
          onToggleBacklinksBadges={handleToggleBacklinksBadges}
          ttsSpeed={ttsSpeed}
          onTtsSpeedChange={handleTtsSpeedChange}
          ttsVoice={ttsVoice}
          onTtsVoiceChange={handleTtsVoiceChange}
          availableVoices={voices}
          autoScrollAudio={autoScrollAudio}
          onToggleAutoScrollAudio={handleToggleAutoScrollAudio}
          autoAdvanceAudio={autoAdvanceAudio}
          onToggleAutoAdvanceAudio={handleToggleAutoAdvanceAudio}
          defaultTranslation={translation}
          onDefaultTranslationChange={handleDefaultTranslationChange}
          theologicalLens={theologicalLens}
          onTheologicalLensChange={handleTheologicalLensChange}
          trackerFormat={trackerFormat}
          onTrackerFormatChange={handleTrackerFormatChange}
          dailyChapterGoal={dailyChapterGoal}
          onDailyChapterGoalChange={handleDailyChapterGoalChange}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onResetPreferences={handleResetPreferences}
        />

        {/* DAILY VERSE FULL SCRIPTURE MODAL */}
        <DailyVerseModal
          isOpen={dailyVerseModal.isOpen}
          onClose={() => setDailyVerseModal(prev => ({ ...prev, isOpen: false }))}
          verseRef={dailyVerseModal.verseRef}
          initialExcerpt={dailyVerseModal.excerpt}
          translation={translation}
          theme={theme as 'dark' | 'light'}
          onNavigateToVerse={(book, chapter, verse) => {
            setDailyVerseModal(prev => ({ ...prev, isOpen: false }));
            navigateToVerse(book, chapter, verse);
          }}
        />

        <PWAInstallPrompt />
        <CookieConsentPrompt theme={theme as 'dark' | 'light'} />

        {/* Lectio Divina Guided Prayer Modal */}
        <LectioDivinaModal
          isOpen={isLectioModalOpen}
          onClose={() => setIsLectioModalOpen(false)}
          passageReference={`${activeBook.name} ${activeChapter}`}
          passageText={bibleVerses.map(v => `${v.verse} ${v.text}`).join('\n')}
          verses={bibleVerses}
          theme={theme as 'dark' | 'light'}
          onSaveToNotes={handleSaveLectioToNotes}
        />

        {/* Scripture Backlinks Drawer (Scripture Connections) */}
        <ScriptureBacklinksDrawer
          isOpen={backlinksDrawerState.isOpen}
          onClose={() => setBacklinksDrawerState(prev => ({ ...prev, isOpen: false }))}
          reference={backlinksDrawerState.reference}
          notes={backlinksDrawerState.backlinks?.notes || []}
          canvasItems={backlinksDrawerState.backlinks?.canvasItems || []}
          highlights={backlinksDrawerState.backlinks?.highlights || []}
          onOpenNote={handleOpenBacklinkNote}
          onOpenCanvasBoard={handleOpenBacklinkCanvasBoard}
          theme={theme as 'dark' | 'light'}
        />

        {/* Full Verse Interlinear Breakdown Modal */}
        <VerseInterlinearModal
          isOpen={isVerseInterlinearOpen}
          onClose={() => setIsVerseInterlinearOpen(false)}
          bookName={activeBook.name}
          chapter={activeChapter}
          initialVerse={verseInterlinearTarget}
          totalVerses={bibleVerses.length}
          verses={bibleVerses}
          isOldTestament={isOldTestament}
          theme={theme as 'dark' | 'light'}
          strongsVersesMap={strongsVersesMap}
          onSendToCanvas={handleSendWordStudyToCanvas}
          onSelectWord={(w) => {
            setActiveInterlinearWord({
              word: w,
              position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              verseRef: `${activeBook.name} ${activeChapter}:${verseInterlinearTarget}`,
            });
          }}
        />

        {/* Reverse Interlinear Original Language Word Card */}
        {activeInterlinearWord && (
          <div 
            className="fixed inset-0 z-[70] pointer-events-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setActiveInterlinearWord(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <InterlinearHoverCard
                word={activeInterlinearWord.word}
                onClose={() => setActiveInterlinearWord(null)}
                onSendToCanvas={handleSendWordStudyToCanvas}
                theme={theme as 'dark' | 'light'}
              />
            </div>
          </div>
        )}

        {/* Global Chat File Attachment Input */}
        <input
          ref={imageFileRef}
          type="file"
          accept="image/*,application/pdf,text/*,.txt,.md,.json,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              processSelectedFile(file);
            }
            e.target.value = '';
          }}
        />

        {/* AI Chat Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={chatToDelete !== null}
          title="Delete Conversation?"
          message={`Are you sure you want to delete "${chatToDelete?.title || 'this conversation'}"? All messages in this conversation will be permanently removed.`}
          confirmLabel="Delete Conversation"
          variant="danger"
          icon="trash"
          onConfirm={() => {
            if (chatToDelete) {
              handleDeleteChat(chatToDelete.id);
              setChatToDelete(null);
            }
          }}
          onCancel={() => setChatToDelete(null)}
        />

        {/* Rename Conversation Modal */}
        <PromptModal
          isOpen={chatToRename !== null}
          title="Rename Conversation"
          message="Enter a new title for this conversation:"
          initialValue={chatToRename?.title || ''}
          placeholder="Conversation title..."
          confirmLabel="Rename"
          onConfirm={submitRenameChat}
          onCancel={() => setChatToRename(null)}
        />

        {/* Rename Note Modal */}
        <PromptModal
          isOpen={noteToRename !== null}
          title="Rename Note"
          message="Enter a new title for this note:"
          initialValue={noteToRename?.title || ''}
          placeholder="Note title..."
          confirmLabel="Rename"
          onConfirm={submitRenameNote}
          onCancel={() => setNoteToRename(null)}
        />
      </div>
    </>
  );
}
