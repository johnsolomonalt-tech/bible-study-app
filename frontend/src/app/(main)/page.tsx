"use client";
const API_URL = '';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth, UserButton, SignIn } from '@clerk/nextjs';
import { Send, Plus, Layout, Edit, Sparkles, Target, Check, Copy, ChevronRight, ChevronLeft, ChevronDown, Trash2, Volume2, VolumeX, Sun, Moon, BookOpen, GripVertical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen, MessageSquare, MessageSquarePlus, X, Paperclip, Image as ImageIcon , Settings, Workflow, ShieldCheck, Heart, Layers, Languages, MoreVertical, Search, BookMarked, Quote, Compass, ArrowRight, Square, BrainCircuit, FileText, UploadCloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { getDevotionalForDay, DevotionalEntry, getDevotionalBody } from '../../lib/devotionals';
import PWAInstallPrompt from '../PWAInstallPrompt';
import { CookieConsentPrompt } from '@/components/bible/CookieConsentPrompt';
import { CanvasBoard } from '@/components/canvas/CanvasBoard';
import { NodeCategory } from '@/types/canvas';
import { LectioDivinaModal } from '@/components/bible/LectioDivinaModal';
import { ScriptureBacklinksDrawer } from '@/components/bible/ScriptureBacklinksDrawer';
import { InterlinearHoverCard } from '@/components/bible/InterlinearHoverCard';
import { InterlinearModeRibbon } from '@/components/bible/InterlinearModeRibbon';
import { VerseInterlinearModal } from '@/components/bible/VerseInterlinearModal';
import { findInterlinearWord, getOrGenerateInterlinearWord, fetchInterlinearWord, getVerseInterlinearTokens, preloadChapterLexicon, STOPWORDS, InterlinearWord } from '@/lib/interlinearData';
import { getScriptureBacklinks, BacklinksResult } from '@/lib/backlinks';
import { TheologicalLensSelector, TheologicalLensType, THEOLOGICAL_LENS_OPTIONS } from '@/components/chat/TheologicalLensSelector';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatSlashCommands, SLASH_COMMANDS, SlashCommand } from '@/components/chat/ChatSlashCommands';
import { ChatFollowUps } from '@/components/chat/ChatFollowUps';
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
import { 
  getPreference, 
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
import { SettingsModal } from '@/components/settings/SettingsModal';
import { initSessionTracking, trackClientEvent } from '@/lib/analyticsClient';
import { NotesWorkspace, NoteItem } from '@/components/notes/NotesWorkspace';
import { StreakPopover } from '@/components/bible/StreakPopover';
import { TrackerStreakHero } from '@/components/bible/TrackerStreakHero';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PromptModal } from '@/components/ui/PromptModal';
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

// Parse AI message content — handles __GENERATED_IMAGE__, __LENS__, and __SUGGESTED_FOLLOW_UPS__ markers
function parseAiMessage(content: string): { 
  imageBase64: string | null; 
  textContent: string;
  theologicalLens: TheologicalLensType | null;
  suggestedFollowUps: string[];
  thoughtContent: string | null;
} {
  let text = content || '';
  let imageBase64: string | null = null;
  let theologicalLens: TheologicalLensType | null = null;
  let suggestedFollowUps: string[] = [];
  let thoughtContent: string | null = null;

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

  return { imageBase64, textContent: text, theologicalLens, suggestedFollowUps, thoughtContent };
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

const TypewriterMessage = ({ content, onVerseClick }: { content: string; onVerseClick?: VerseClickHandler }) => {
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
    const interval = setInterval(() => {
      index += 25; // Type 25 chars every 15ms for an extremely fast but noticeable typing effect
      if (index > textContent.length) index = textContent.length;
      setDisplayed(textContent.slice(0, index));
      
      if (index >= textContent.length) {
        clearInterval(interval);
        seenMessages.add(content);
      }
    }, 15);
    
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
    <div className="w-full mb-3 rounded-xl border border-border-soft/80 bg-surface/30 hover:bg-surface/50 transition-all overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer group select-none transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 text-muted group-hover:text-fg transition-colors">
          <BrainCircuit size={13} className="text-accent/80 shrink-0" />
          <span className="text-[12px] font-medium">
            {isOpen ? 'Hide thinking' : 'Show thinking'}
          </span>
        </div>
        <ChevronDown size={13} className={`text-muted group-hover:text-fg transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-border-soft/50 bg-bg/40 text-[12px] leading-relaxed text-muted/95 max-h-72 overflow-y-auto custom-scroll whitespace-pre-wrap font-sans space-y-1.5 selection:bg-accent/20">
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
  const [elapsedMs, setElapsedMs] = useState(0);

  // Real-time elapsed stopwatch (updates every 100ms)
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div className={`flex flex-col items-start w-full ${isFullView ? 'max-w-3xl mx-auto' : ''} py-3 animate-in fade-in duration-200`}>
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent animate-pulse">
          <BrainCircuit size={12} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">Theologica AI</span>
        <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-mono font-medium animate-pulse">
          Thinking • {elapsedSec}s
        </span>
      </div>

      <div className="w-full rounded-2xl bg-surface/70 border border-border-soft shadow-xs overflow-hidden transition-all">
        {/* Status Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="flex gap-1 items-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span 
              key={status} 
              className="text-[12.5px] sm:text-[13px] text-fg font-medium truncate inline-block animate-in fade-in duration-150"
            >
              {status || "Grounding in verified Scripture..."}
            </span>
          </div>

          {thinkingText && (
            <button
              type="button"
              onClick={() => setShowLiveThoughts(prev => !prev)}
              className="text-[11px] text-muted hover:text-fg transition-colors flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
            >
              <span>{showLiveThoughts ? 'Hide thinking' : 'Show thinking'}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${showLiveThoughts ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Real-time thoughts stream */}
        {thinkingText && showLiveThoughts && (
          <div className="px-4 py-3 bg-bg/60 text-[12px] leading-relaxed text-muted/90 max-h-56 overflow-y-auto custom-scroll whitespace-pre-wrap border-t border-border-soft/50 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-accent mb-1.5 select-none">
              <Sparkles size={10} />
              <span>Thinking Process</span>
            </div>
            {thinkingText}
            <span className="inline-block w-1.5 h-3 ml-1 bg-accent animate-pulse align-middle" />
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
  chatTitle,
  chatId,
  activeLens = 'canonical',
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
      <div className={`flex flex-col items-end w-full ${isFullView ? 'max-w-3xl mx-auto' : ''} py-1.5`}>
        <div className="flex items-center gap-1.5 mb-1.5 select-none pr-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">You</span>
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
  const { imageBase64, textContent, theologicalLens: msgLens, suggestedFollowUps, thoughtContent } = parseAiMessage(message.content);
  const effectiveLens = msgLens || activeLens;
  const lensMeta = THEOLOGICAL_LENS_OPTIONS.find(l => l.id === effectiveLens) || THEOLOGICAL_LENS_OPTIONS[0];

  const hasOriginalLanguages = /[\u0370-\u03FF\u0590-\u05FF]/.test(textContent);
  const verseMatches = Array.from(textContent.matchAll(new RegExp(BIBLE_VERSE_REGEX.source, 'gi')));
  const verseCount = verseMatches.length;

  return (
    <div className={`flex flex-col items-start w-full ${isFullView ? 'max-w-3xl mx-auto' : ''} py-2.5`}>
      {/* Header with Lens & Language Badges */}
      <div className="flex items-center gap-2 mb-2 select-none flex-wrap">
        <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0">
          <Sparkles size={11} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">Theologica AI</span>

        {/* Theological Lens Badge */}
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs"
          style={{ 
            backgroundColor: lensMeta.bgLight, 
            borderColor: lensMeta.borderLight, 
            color: lensMeta.accentColor 
          }}
        >
          {lensMeta.icon}
          <span>{lensMeta.name} Lens</span>
        </span>

        {/* Original Language Badge */}
        {hasOriginalLanguages && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span>א / Ω</span>
            <span>Original Roots</span>
          </span>
        )}

        {/* Scripture Citation Count */}
        {verseCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BookOpen size={10} />
            <span>{verseCount} {verseCount === 1 ? 'Reference' : 'References'}</span>
          </span>
        )}
      </div>

      {/* Real Theological Reasoning Trace */}
      {thoughtContent && (
        <AiThinkingAccordion thought={thoughtContent} />
      )}

      <div className={`w-full ${isFullView ? 'text-[15px] leading-[1.75]' : 'text-[14px] leading-relaxed'} text-fg overflow-x-auto break-words markdown-body`}>
        {isLast ? (
          <TypewriterMessage content={message.content} onVerseClick={onVerseClick} />
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

      {/* Tailored Follow-Ups and Multi-Lens Comparison */}
      {isLast && onSelectPrompt && onSelectLensComparison && (
        <ChatFollowUps
          questions={suggestedFollowUps}
          messageContent={textContent}
          currentLens={effectiveLens}
          onSelectQuestion={onSelectPrompt}
          onSelectLensComparison={onSelectLensComparison}
          isCompact={!isFullView}
        />
      )}
    </div>
  );
};

export default function App() {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Small timeout to allow the toolbar buttons to fire their click handlers first
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setToolbarPosition(null);
        }
      }, 50);
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);
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
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
  }, [getToken]);
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
    if (activeTab === 'devotional') {
      recordHabitActivity('devotional');
    }
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
    setDevotionalEntry(getDevotionalForDay(nextDay));
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
  const [toolbarPosition, setToolbarPosition] = useState<{x: number, y: number, highlightId?: number, isBelow?: boolean} | null>(null);
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
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  
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

  // Pre-load Strong's tagged chapter for accurate word-by-word reverse interlinear alignment
  useEffect(() => {
    if (!isInterlinearMode) return;
    let isCancelled = false;
    getStrongsPassage(activeBook.name, activeChapter)
      .then(async (ch) => {
        if (ch && ch.verses) {
          await preloadChapterLexicon(ch.verses);
          if (isCancelled) return;
          const map: Record<number, string> = {};
          ch.verses.forEach((v) => {
            map[v.verse] = v.text;
          });
          setStrongsVersesMap(map);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [isInterlinearMode, activeBook.name, activeChapter]);
  const [backlinksDrawerState, setBacklinksDrawerState] = useState<{
    isOpen: boolean;
    reference: string;
    backlinks: BacklinksResult | null;
  }>({
    isOpen: false,
    reference: '',
    backlinks: null,
  });
  const [isMobileMoreMenuOpen, setIsMobileMoreMenuOpen] = useState(false);
  const [isMobileTyping, setIsMobileTyping] = useState(false);

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
      if (isInputElement(e.target as Element)) {
        setIsMobileTyping(true);
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
      if (window.innerWidth < 1024 && isInputElement(document.activeElement)) {
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
        if (isKeyboardOpen && isInputElement(document.activeElement)) {
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
      setSelectedText(verseEl.textContent || '');
    }

    const toolbarHalfWidth = 195;
    const x = Math.max(toolbarHalfWidth + 12, Math.min(window.innerWidth - toolbarHalfWidth - 12, e.clientX));
    const isNearTop = e.clientY < 110;
    const y = isNearTop ? e.clientY + 24 : e.clientY - 12;

    const existingHighlight = highlights.find(
      h => h.book === activeBook.name && h.chapter === activeChapter && h.verse === verseNum
    );

    setToolbarPosition({
      x,
      y,
      highlightId: existingHighlight?.id,
      isBelow: isNearTop,
    });
  }, [activeBook.name, activeChapter, highlights]);
  
  // Tracker State
  const [expandedTestaments, setExpandedTestaments] = useState<string[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<string[]>([]);
  
  const toggleTestament = (t: string) => setExpandedTestaments(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleBook = (b: string) => setExpandedBooks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const [mobileStudyView, setMobileStudyView] = useState<'reader' | 'chapters' | 'ai'>('reader');
  
  // Layout State
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);
  const bottomPanelRef = useRef<PanelImperativeHandle>(null);
  const [showBottomNotes, setShowBottomNotes] = useState(true);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const readerHeaderRef = useRef<HTMLElement>(null);
  const [readerHeaderWidth, setReaderHeaderWidth] = useState<number>(1200);
  const readerTitleRef = useRef<HTMLDivElement>(null);
  const [readerTitleWidth, setReaderTitleWidth] = useState<number>(180);
  const desktopMoreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMoreMenuRef = useRef<HTMLDivElement>(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Notes State
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

    // 4. Layout Sidebars
    const leftPref = getPreference(PREF_KEYS.SHOW_LEFT_SIDEBAR);
    if (leftPref !== '') setShowLeftSidebar(leftPref === 'true');
    const rightPref = getPreference(PREF_KEYS.SHOW_RIGHT_SIDEBAR);
    if (rightPref !== '') setShowRightSidebar(rightPref === 'true');
    const bottomPref = getPreference(PREF_KEYS.SHOW_BOTTOM_NOTES);
    if (bottomPref !== '') setShowBottomNotes(bottomPref === 'true');

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

    // 10. Study & AI
    const savedLens = getPreference(PREF_KEYS.THEOLOGICAL_LENS) as TheologicalLensType;
    if (savedLens && THEOLOGICAL_LENS_OPTIONS.some(o => o.id === savedLens)) setTheologicalLens(savedLens);

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

  // Persist layout sidebars
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  // Measure Bible reader column width and title width to dynamically collapse study tools ONLY when actually cramped
  const measureWidths = useCallback(() => {
    const containerEl = readerContainerRef.current || readerHeaderRef.current;
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
  }, []);

  useEffect(() => {
    if (activeTab !== 'study') return;

    measureWidths();

    const targetEl = readerContainerRef.current || readerHeaderRef.current;
    if (!targetEl) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if ((entry.target === targetEl || entry.target === targetEl.parentElement) && entry.contentRect.width > 0) {
          setReaderHeaderWidth(entry.contentRect.width);
        } else if (entry.target === readerTitleRef.current && entry.contentRect.width > 0) {
          setReaderTitleWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(targetEl);
    if (readerTitleRef.current) {
      observer.observe(readerTitleRef.current);
    }

    window.addEventListener('resize', measureWidths);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureWidths);
    };
  }, [activeTab, showLeftSidebar, showRightSidebar, activeBook.name, activeChapter, measureWidths]);

  // Available space for right-side study tools:
  // Reader column width minus title width, horizontal padding (~48px), and safety margin (24px)
  const availableToolsWidth = Math.max(0, readerHeaderWidth - readerTitleWidth - 72);

  // Progressive study tools collapse thresholds: ONLY collapse when ACTUALLY cramped!
  //
  // Tool widths:
  // Permanent controls (Audio ~38px, divider ~13px, Translation selector ~74px, gaps ~12px) = ~137px
  // 3-dots button (when active) = ~38px + 6px gap = ~44px -> Base with 3-dots = ~181px
  // 1. Backlinks (~126px) -> 1st to collapse into 3 dots
  // 2. Lectio (~86px) -> 2nd to collapse into 3 dots
  // 3. Interlinear (~116px) -> 3rd to collapse into 3 dots
  // 4. Mark Complete (~141px) -> 4th/last to collapse into 3 dots
  //
  // Cumulative needed widths:
  // All 4 tools: 137 + 126 + 86 + 116 + 141 + gaps ~24 = ~630px (threshold: 670px)
  // 3 tools (without Backlinks): 181 + 86 + 116 + 141 + gaps ~18 = ~542px (threshold: 565px)
  // 2 tools (without Lectio): 181 + 116 + 141 + gaps ~12 = ~450px (threshold: 465px)
  // 1 tool (without Interlinear): 181 + 141 + gaps ~6 = ~328px (threshold: 345px)
  // 0 tools (all in 3 dots): ~181px
  const showBacklinksInBar = availableToolsWidth >= 670;
  const showLectioInBar = availableToolsWidth >= 565;
  const showInterlinearInBar = availableToolsWidth >= 465;
  const showMarkCompleteInBar = availableToolsWidth >= 345;
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

  // Outside click handler for mobile 3-dots study options menu
  useEffect(() => {
    if (!isMobileMoreMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (mobileMoreMenuRef.current && !mobileMoreMenuRef.current.contains(target)) {
        setIsMobileMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMobileMoreMenuOpen]);

  // Unified Settings Handlers
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
    if (readerFontSize === 'sm') return isMobile ? 'text-[15px]' : 'text-[15px] sm:text-[16px]';
    if (readerFontSize === 'lg') return isMobile ? 'text-[19px]' : 'text-[19px] sm:text-[20px]';
    if (readerFontSize === 'xl') return isMobile ? 'text-[22px]' : 'text-[22px] sm:text-[23px]';
    return isMobile ? 'text-[17px]' : 'text-[17px] sm:text-[18px]';
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
    handleTheologicalLensChange('canonical');
    handleTrackerFormatChange('percent');
    handleDailyChapterGoalChange(3);
    setShowLeftSidebar(true);
    setShowRightSidebar(true);
    setShowBottomNotes(true);
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
  const [cooldown, setCooldown] = useState(0);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const res = await fetchWithAuth(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: contentWithTags,
        }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [newNote, ...prev]);
        trackClientEvent('note_created_from_chat');
        return true;
      }
    } catch (err) {
      console.error('Failed to save chat insight to notes:', err);
    }
    return false;
  }, [fetchWithAuth, theologicalLens, activeBook, activeChapter]);

  // Load Data & Sync Account Streak across devices
  useEffect(() => {
    initSessionTracking(userId);

    // Register sync callbacks so habit activities immediately push to account
    registerStreakSyncCallback(() => {
      queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 200);
    });

    fetchWithAuth(`${API_URL}/api/notes`).then(r => r.json()).then(data => {
      setNotes(data);
    });
    fetchWithAuth(`${API_URL}/api/chats`).then(r => r.json()).then(data => {
      setChats(data);
      if (Array.isArray(data)) {
        data.forEach((c: { title: string }) => seenTitles.add(c.title));
        const savedChatIdStr = getPreference(PREF_KEYS.ACTIVE_CHAT_ID);
        const savedChatId = savedChatIdStr ? parseInt(savedChatIdStr, 10) : null;
        if (savedChatId && data.some((c: { id: number }) => c.id === savedChatId)) {
          setActiveChatId(savedChatId);
        } else {
          setActiveChatId(null);
        }
      }
    });
    fetchWithAuth(`${API_URL}/api/tracker`).then(r => r.json()).then(data => {
      setCompletedChapters(data.map((item: {chapterId: string}) => item.chapterId));
    });

    // 1. Initial Pull: syncs streaks, habits, reading pace from account
    pullStreakFromAccount(fetchWithAuth, dailyChapterGoalRef.current).then(res => {
      if (res?.dailyChapterGoal && typeof res.dailyChapterGoal === 'number' && res.dailyChapterGoal > 0) {
        setDailyChapterGoal(res.dailyChapterGoal);
        setPreference(PREF_KEYS.DAILY_CHAPTER_GOAL, String(res.dailyChapterGoal));
      }
    });

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

  // Helper to clean verse text and strip verse numbers cleanly
  const cleanVerseText = (rawText: string, startVerse?: number | null, endVerse?: number | null): string => {
    if (!rawText) return '';
    let cleaned = rawText.trim();
    
    const sVerse = startVerse && endVerse ? Math.min(startVerse, endVerse) : startVerse;
    const eVerse = startVerse && endVerse ? Math.max(startVerse, endVerse) : endVerse;

    // 1. Remove leading verse number if present (e.g. "1 In the beginning" or "16 For God")
    if (sVerse) {
      cleaned = cleaned.replace(new RegExp(`^${sVerse}\\s*`), '');
    }
    // Fallback: strip any generic leading digits
    cleaned = cleaned.replace(/^\d+\s+/, '');

    // 2. If multiple verses are spanned, remove verse numbers that appear between verses
    if (sVerse && eVerse && eVerse > sVerse) {
      for (let v = sVerse; v <= eVerse; v++) {
        cleaned = cleaned.replace(new RegExp(`\\s+${v}\\s+`, 'g'), ' ');
        cleaned = cleaned.replace(new RegExp(`([.!?,"';:])\\s*${v}\\s+`, 'g'), '$1 ');
      }
    }

    // 3. Remove any remaining standalone numbers followed by capitalized words
    cleaned = cleaned.replace(/([.!?,"';:])\s*\d+\s+([A-Z])/g, '$1 $2');

    // 4. Normalize multiple spaces / newlines
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  };

  // Clicking a verse number dismisses any active toolbar without opening selection toolbar
  const handleVerseNumberClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    setToolbarPosition(null);
  };

  // Highlighting & Drag Selection Logic
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const rawText = selection.toString().trim();
    // Do not trigger toolbar on empty text or isolated verse numbers
    if (!rawText || /^\d+$/.test(rawText)) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    
    // Find the verse this selection belongs to by looking at parent elements
    const getVerseFromNode = (n: Node | null): number | null => {
      if (!n) return null;
      const el = n.nodeType === Node.ELEMENT_NODE ? (n as HTMLElement) : n.parentElement;
      const verseEl = el?.closest('[data-verse]');
      if (!verseEl) return null;
      const v = verseEl.getAttribute('data-verse');
      return v ? parseInt(v, 10) : null;
    };

    let startVerse = getVerseFromNode(range.startContainer);
    let endVerse = getVerseFromNode(range.endContainer) || startVerse;
    if (!startVerse && endVerse) startVerse = endVerse;
    
    if (startVerse) {
      const actualStart = Math.min(startVerse, endVerse || startVerse);
      const actualEnd = Math.max(startVerse, endVerse || startVerse);

      setSelectionRange(range);
      setSelectionVerse(actualStart);
      setEndVerseNumber(actualEnd);
      setSelectedText(rawText);
      
      let activeHighlightId: number | undefined = undefined;
      const commonAncestor = range.commonAncestorContainer;
      const parentElement = commonAncestor.nodeType === 3 ? commonAncestor.parentElement : commonAncestor as HTMLElement;
      
      if (parentElement) {
        if (parentElement.tagName === 'MARK' && parentElement.dataset.highlightId) {
          activeHighlightId = parseInt(parentElement.dataset.highlightId, 10);
        } else {
          const marks = parentElement.querySelectorAll('mark');
          for (let i = 0; i < marks.length; i++) {
            if (window.getSelection()?.containsNode(marks[i], true)) {
              activeHighlightId = parseInt(marks[i].dataset.highlightId!, 10);
              break;
            }
          }
        }
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const toolbarHalfWidth = 195;
      const x = isMobile 
        ? window.innerWidth / 2 
        : Math.max(toolbarHalfWidth + 12, Math.min(window.innerWidth - toolbarHalfWidth - 12, rect.left + rect.width / 2));
      const isNearTop = rect.top < 130;
      const y = isNearTop ? rect.bottom + 8 : Math.max(70, rect.top - 6);

      setToolbarPosition({
        x,
        y,
        highlightId: activeHighlightId,
        isBelow: isNearTop
      });
    }
  }, []);

  // Dismiss toolbar when clicking outside (safely ignoring selection & toolbar clicks)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.floating-verse-toolbar') || target.closest('.verse-number-btn')) return;
      
      // Do not dismiss if user is actively selecting text
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        return;
      }

      setToolbarPosition(null);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchend', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchend', handleDocumentClick);
    };
  }, []);

  // Listen to mobile selectionchange for seamless mobile text selection
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const onSelectionChange = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          const range = sel.getRangeAt(0);
          const el = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as HTMLElement) : range.startContainer.parentElement;
          if (el?.closest('.bible-reader-content')) {
            handleSelection();
          }
        }
      }, 150);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [handleSelection]);

  const activeNote = notes.find(n => n.id === activeNoteId) || { id: 0, title: 'No Note Selected', content: '' };
  const activeChat = (activeChatId ? chats.find(c => c.id === activeChatId) : null) || { id: 0, title: 'New Conversation', messages: [] };

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

  const saveHighlight = async (color: string) => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    if (toolbarPosition?.highlightId) {
      const existingId = toolbarPosition.highlightId;
      setHighlights(prev => {
        const updated = prev.map(h => h.id === existingId ? { ...h, color } : h);
        saveLocalHighlights(updated);
        return updated;
      });
      setToolbarPosition(null);
      window.getSelection()?.removeAllRanges();

      if (isOnline) {
        try {
          await fetchWithAuth(`${API_URL}/api/highlights/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color })
          });
        } catch (e) {
          console.warn("Highlight saved locally (cloud sync pending)", e);
        }
      }
      return;
    }
    
    let text = cleanVerseText(rawText, selectionVerse, endVerseNumber || selectionVerse);
    
    // Fallback protection: if they try to highlight over text that is already highlighted
    const verseHighlights = highlights.filter(h => (!h.book || h.book === activeBook.name) && (!h.chapter || h.chapter === activeChapter) && h.verse === selectionVerse);
    const hasOverlap = verseHighlights.some(h => h.text.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(h.text.toLowerCase()));
    
    if (hasOverlap) {
      alert("This text is already highlighted. Click the highlight to change its color or delete it.");
      setToolbarPosition(null);
      window.getSelection()?.removeAllRanges();
      return;
    }
    
    const verse = selectionVerse;
    const book = activeBook.name;
    const chapter = activeChapter;

    // Optimistic UI and immediate local cache update
    const tempId = Date.now();
    const newHighlight = { id: tempId, book, chapter, verse, text, color };
    setHighlights(prev => {
      const updated = [...prev, newHighlight];
      saveLocalHighlights(updated);
      return updated;
    });
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();

    if (isOnline) {
      try {
        const res = await fetchWithAuth(`${API_URL}/api/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book, chapter, verse, text, color })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setHighlights(prev => {
              const updated = prev.map(h => h.id === tempId ? data : h);
              saveLocalHighlights(updated);
              return updated;
            });
          }
        }
      } catch (e) {
        console.warn("Highlight saved locally, cloud sync pending", e);
      }
    }
  };

  const deleteHighlight = async (id: number) => {
    setToolbarPosition(null);
    setHighlights(prev => {
      const updated = prev.filter(h => h.id !== id);
      saveLocalHighlights(updated);
      return updated;
    });

    if (isOnline) {
      try {
        await fetchWithAuth(`${API_URL}/api/highlights/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn("Deleted highlight locally", e);
      }
    }
  };

  const askAiAboutHighlight = () => {
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    if (cooldown > 0) {
      alert(`Study AI is resting (${cooldown}s remaining). Please wait a moment.`);
      return;
    }

    const startVerse = Math.min(selectionVerse, endVerseNumber || selectionVerse);
    const endVerse = Math.max(selectionVerse, endVerseNumber || selectionVerse);
    const verseText = startVerse === endVerse 
      ? `verse ${startVerse}` 
      : `verses ${startVerse}-${endVerse}`;

    const cleanText = cleanVerseText(rawText, startVerse, endVerse);
    const query = `What does "${cleanText}" mean in ${verseText} of ${activeBook.name} ${activeChapter}?`;
    
    // Switch to AI tab
    setMobileStudyView('ai');
    if (!showRightSidebar) setShowRightSidebar(true);
    
    setToolbarPosition(null);
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
    
    // Switch to AI tab
    setMobileStudyView('ai');
    if (!showRightSidebar) setShowRightSidebar(true);
    
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
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
    window.getSelection()?.removeAllRanges();
    setActiveTab('canvas');
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
      category: 'theological_point',
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
    setCanvasIncomingNode(nodePayload);
    setActiveTab('canvas');
    setActiveInterlinearWord(null);
  };

  const handleSaveLectioToNotes = async (title: string, content: string) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
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
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText) return;
    const firstWord = rawText.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
    if (!firstWord) return;
    const verseRef = `${activeBook.name} ${activeChapter}:${selectionVerse || 1}`;
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();

    // Check synchronous lookup first for 0ms render
    const syncWord = getOrGenerateInterlinearWord(firstWord, isOldTestament, verseRef);
    setActiveInterlinearWord({
      word: syncWord,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      verseRef,
    });

    // Asynchronously resolve authentic Strong's entry (e.g. Jezreel -> H3157)
    const authenticWord = await fetchInterlinearWord(firstWord, isOldTestament, verseRef);
    if (authenticWord && authenticWord.id !== syncWord.id) {
      setActiveInterlinearWord({
        word: authenticWord,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        verseRef,
      });
    }
  };

  const renderTextWithInterlinear = (rawStr: string, verseNum: number) => {
    if (!isInterlinearMode) {
      return rawStr;
    }
    const verseRef = `${activeBook.name} ${activeChapter}:${verseNum}`;
    const taggedStr = strongsVersesMap[verseNum];

    if (taggedStr) {
      const tokens = getVerseInterlinearTokens(taggedStr, isOldTestament, verseRef);
      return tokens.map((token, tIdx) => {
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
            className="inline-block text-center align-baseline cursor-pointer group px-0.5 select-none max-w-full break-inside-avoid"
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

            <span className="block text-center border-b border-dotted border-border-soft/80 group-hover:border-accent group-hover:text-accent transition-colors leading-normal font-serif break-words">
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
          className="inline-block text-center align-baseline cursor-pointer group px-0.5 select-none max-w-full break-inside-avoid"
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

  const renderVerseContent = (verse: number, text: string) => {
    const { mainText, footnote } = parseVerseFootnote(text);
    const verseHighlights = highlights.filter(h => 
      (!h.book || h.book === activeBook.name) && 
      (!h.chapter || h.chapter === activeChapter) && 
      h.verse === verse
    );
    if (verseHighlights.length === 0) {
      if (!footnote || !showFootnotes) return <>{renderTextWithInterlinear(mainText, verse)}</>;
      return (
        <>
          {renderTextWithInterlinear(mainText, verse)}
          {showFootnotes && (
            <span className="text-gray-500 text-sm italic ml-2 select-none break-words inline" data-footnote="true">
              {footnote}
            </span>
          )}
        </>
      );
    }

    // For perfect non-overlapping rendering:
    let segments: { text: string, highlight?: typeof highlights[0] }[] = [{ text: mainText }];
    
    verseHighlights.forEach(h => {
      let newSegments: typeof segments = [];
      segments.forEach(seg => {
        if (seg.highlight) {
          newSegments.push(seg);
        } else {
          let matchText = h.text;
          let index = seg.text.toLowerCase().indexOf(matchText.toLowerCase());
          
          if (index === -1) {
            // Strip leading verse number if accidentally highlighted
            const cleanedMatch = matchText.replace(new RegExp('^\\s*' + verse + '\\s*'), '');
            index = seg.text.toLowerCase().indexOf(cleanedMatch.toLowerCase());
            if (index !== -1) {
              matchText = cleanedMatch;
            }
          }

          if (index !== -1) {
            newSegments.push({ text: seg.text.substring(0, index) });
            newSegments.push({ text: seg.text.substring(index, index + matchText.length), highlight: h });
            newSegments.push({ text: seg.text.substring(index + matchText.length) });
          } else if (h.text.toLowerCase().includes(seg.text.toLowerCase().trim()) && seg.text.trim().length > 0) {
            // Highlight covers this entire segment
            newSegments.push({ text: seg.text, highlight: h });
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
                const range = document.createRange();
                range.selectNodeContents(e.target as Node);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setSelectionRange(range);
                
                let verseNumber = null;
                const verseNode = (e.target as HTMLElement).closest('[data-verse]');
                if (verseNode) {
                  verseNumber = parseInt(verseNode.getAttribute('data-verse')!, 10);
                }
                setSelectionVerse(verseNumber);
                
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                const isNearTop = rect.top < 130;
                setToolbarPosition({
                  x: isMobile ? window.innerWidth / 2 : Math.max(200, Math.min(window.innerWidth - 200, rect.left + rect.width / 2)),
                  y: isNearTop ? rect.bottom + 8 : Math.max(70, rect.top - 6),
                  highlightId: seg.highlight!.id,
                  isBelow: isNearTop
                });
              }}
              className={`cursor-pointer rounded-sm px-0.5 ${seg.highlight.color === 'yellow' ? 'bg-yellow-500/40 text-inherit' : seg.highlight.color === 'green' ? 'bg-green-500/40 text-inherit' : seg.highlight.color === 'blue' ? 'bg-blue-500/40 text-inherit' : seg.highlight.color === 'pink' ? 'bg-pink-500/40 text-inherit' : 'bg-purple-500/40 text-inherit'}`}
              title="Click to remove highlight"
            >
              {renderTextWithInterlinear(seg.text, verse)}
            </mark>
          ) : (
            <span key={i}>{renderTextWithInterlinear(seg.text, verse)}</span>
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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const parent = messagesEndRef.current.parentElement;
      if (parent) parent.scrollTop = parent.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.id, activeTab]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

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
    setDevotionalEntry(getDevotionalForDay(alignedDoy));
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

    // Immediately load highlights from local storage for instant responsiveness
    const localList = getLocalHighlights();
    const chapterLocal = localList.filter(h => (!h.book || h.book === activeBook.name) && (!h.chapter || h.chapter === activeChapter));
    if (isMounted) {
      setHighlights(chapterLocal);
    }

    // Fetch highlights for current chapter from cloud and merge
    fetchWithAuth(`${API_URL}/api/highlights?book=${encodeURIComponent(activeBook.name)}&chapter=${activeChapter}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          const combined = [...data];
          chapterLocal.forEach(lh => {
            if (!combined.some(ch => ch.verse === lh.verse && ch.text === lh.text)) {
              combined.push(lh);
            }
          });
          setHighlights(combined);
          const allOther = localList.filter(h => (h.book !== activeBook.name || h.chapter !== activeChapter));
          saveLocalHighlights([...allOther, ...combined]);
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
        if (isDesktopMoreMenuOpen) { setIsDesktopMoreMenuOpen(false); return; }
        if (isMobileMoreMenuOpen) { setIsMobileMoreMenuOpen(false); return; }
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
    isDesktopMoreMenuOpen, 
    isMobileMoreMenuOpen
  ]);


  const updateNote = async (id: number, title: string, content: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
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
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    await fetchWithAuth(`${API_URL}/api/notes/${id}`, {
      method: 'DELETE'
    });
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
    if (cooldown > 0) return;
    
    setChatQuotes([]);
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
      try {
        const res = await fetchWithAuth(`${API_URL}/api/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Conversation' })
        });
        if (!res.ok) {
          setIsAiTyping(false);
          alert('Failed to initialize conversation. Please check your connection and try again.');
          return;
        }
        const newChat = await res.json();
        targetChatId = newChat.id;
        
        const newMsg = { 
          role: 'user', 
          content: textToSend.trim(), 
          imagePreview: currentAttached?.preview || currentImage?.preview,
          attachedFile: optimisticAttached,
        };
        const chatWithOptimisticMsg = { ...newChat, messages: [newMsg] };
        
        setChats(prev => [chatWithOptimisticMsg, ...prev]);
        setActiveChatId(newChat.id);
      } catch (err) {
        setIsAiTyping(false);
        console.error('Error creating chat:', err);
        return;
      }
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
    setCooldown(30); // 30s cooldown
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
    } else if (scriptureContextToSend) {
      setAiActivityStatus(`Connecting to Theologica AI with ${scriptureContextToSend.reference} context...`);
    } else {
      setAiActivityStatus('Connecting to Theologica AI...');
    }

    setAiThinkingText('');
    setIsAiTyping(true);
    setTimeout(scrollToBottom, 50);

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

    const res = await messagePromise;
    
    if (res.ok) {
      const isStream = res.headers.get('content-type')?.includes('text/event-stream');
      if (isStream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamResult: { userMessage?: any; aiMessage?: any } | null = null;

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
                }
              } catch {
                // ignore chunk parse failure
              }
            }
          }
        }

        setIsAiTyping(false);

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
        }
      } else {
        const data = await res.json();
        setIsAiTyping(false);
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
      setIsAiTyping(false);
      const errorData = await res.json().catch(() => null);
      const errorMsg = { 
        id: Date.now(), 
        chatId: targetChatId, 
        role: 'model', 
        content: `**Error:** ${errorData?.details || errorData?.error || 'Failed to get response from AI'}` 
      };
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, errorMsg] };
        }
        return c;
      }));
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
    setCompletedChapters(prev => 
      prevStatus ? prev.filter(id => id !== currentChapterId) : [...prev, currentChapterId]
    );
    if (!prevStatus) {
      recordHabitActivity('scripture', { chapterId: currentChapterId });
    } else {
      unmarkChapterActivity(Math.max(0, completedChapters.length - 1));
    }
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: currentChapterId })
    });
    trackClientEvent('reading_tracker_updated');
    queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
  };

  const toggleAnyChapter = async (id: string) => {
    const checked = completedChapters.includes(id);
    setCompletedChapters(prev => checked ? prev.filter(c => c !== id) : [...prev, id]);
    if (!checked) {
      recordHabitActivity('scripture', { chapterId: id });
    } else {
      unmarkChapterActivity(Math.max(0, completedChapters.length - 1));
    }
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: id })
    });
    trackClientEvent('reading_tracker_updated');
    queueStreakPush(fetchWithAuth, dailyChapterGoalRef.current, 100);
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-bg text-white">Loading...</div>;
  
  if (!userId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg p-4 overflow-y-auto">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-bg text-fg overflow-hidden select-none">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 min-h-14 h-[calc(3.5rem+env(safe-area-inset-top,0px))] border-b border-border flex items-center justify-between px-4 sm:px-6 bg-bg shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="font-display text-[20px] tracking-tight flex items-center gap-2.5 select-none shrink-0">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={(theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png'} 
                alt="Theologica Logo" 
                className="w-full h-full object-contain filter contrast-105" 
              />
            </div>
            <span className="font-serif text-[22px] font-bold tracking-tight text-[#c96442] hidden sm:inline">
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
                    setCanvasFocusTrigger(prev => prev + 1);
                  }
                  if (tab === 'chats') {
                    setMobileChatView('chat');
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
          {/* Collapsible Panel Toggles - Book Selector, Quick Note, Study AI */}
          {activeTab === 'study' && (
            <div className="hidden lg:flex items-center bg-surface border border-border-soft/60 rounded-lg p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
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
                onClick={() => setShowBottomNotes(!showBottomNotes)}
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
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  showRightSidebar ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'
                }`}
                title={showRightSidebar ? 'Collapse Study AI' : 'Expand Study AI'}
                aria-label="Toggle Study AI"
              >
                {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>
          )}

          <StreakPopover 
            onNavigateToTab={setActiveTab} 
          />
          <button onClick={() => setIsSettingsOpen(true)} className="text-muted hover:text-fg transition-colors p-1.5 rounded-lg hover:bg-surface cursor-pointer" title="Settings">
            <Settings size={18} />
          </button>
          <UserButton />
        </div>

        {/* SETTINGS MODAL */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          theme={theme}
          onThemeChange={handleThemeChange}
          accentColor={accentColor}
          onAccentColorChange={handleAccentColorChange}
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={setShowLeftSidebar}
          showRightSidebar={showRightSidebar}
          onToggleRightSidebar={setShowRightSidebar}
          showBottomNotes={showBottomNotes}
          onToggleBottomNotes={setShowBottomNotes}
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
        
      </header>
      
      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden min-h-0 flex relative">
        
        
        {/* MOBILE STUDY TAB (No Resizable Panels) */}
        {activeTab === 'study' && (
          <div className="lg:hidden flex w-full h-full">
            {/* Mobile Left Sidebar: Navigation */}
            <aside className={`w-full border-r border-border bg-bg flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-4 shrink-0 bg-bg">
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileStudyView('reader')} className="p-2 -ml-2 text-fg-2 hover:text-fg rounded-lg hover:bg-surface cursor-pointer" title="Back to reader">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-semibold text-fg text-[16px]">Select Book & Chapter</span>
                </div>
                <div className="text-xs text-muted font-medium">
                  {isOldTestament ? 'Old Testament' : 'New Testament'}
                </div>
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

              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {/* Old Testament Section */}
                {filteredOtBooks.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsOtExpanded(!isOtExpanded)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isOtExpanded ? "Collapse Old Testament" : "Expand Old Testament"}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 shrink-0 ${isOldTestament ? 'text-accent' : 'text-muted'} ${isOtExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          Old Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredOtBooks.length}
                      </span>
                    </button>

                    {isOtExpanded && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredOtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              name="mobile-bible-books"
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedBook(prev => prev === b.name ? null : b.name);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[13.5px] cursor-pointer list-none flex justify-between items-center transition-colors ${
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
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isNtExpanded ? "Collapse New Testament" : "Expand New Testament"}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 shrink-0 ${!isOldTestament ? 'text-accent' : 'text-muted'} ${isNtExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${!isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          New Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredNtBooks.length}
                      </span>
                    </button>

                    {isNtExpanded && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredNtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              name="mobile-bible-books"
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedBook(prev => prev === b.name ? null : b.name);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[13.5px] cursor-pointer list-none flex justify-between items-center transition-colors ${
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
            <section className={`flex-1 flex-col h-full bg-bg ${mobileStudyView === 'reader' ? 'flex' : 'hidden'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-3 sm:px-4 bg-bg shrink-0 relative z-20">
                {/* Left: Book & Chapter Selector Trigger */}
                <div className="flex items-center gap-1 min-w-0 shrink">
                  <button 
                    onClick={() => setMobileStudyView('chapters')} 
                    className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl text-fg hover:bg-surface transition-colors shrink min-w-0 cursor-pointer" 
                    title="Choose Book & Chapter"
                  >
                    <Layout size={18} className="text-accent shrink-0" />
                    <span className="font-display text-[15px] sm:text-[18px] font-semibold truncate">
                      {activeBook.name} {activeChapter}
                    </span>
                    <ChevronDown size={14} className="text-muted shrink-0 opacity-60" />
                  </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Quick Speech / Pause button if currently speaking */}
                  {isSpeaking && (
                    <button 
                      onClick={toggleSpeech} 
                      className="p-2 rounded-lg bg-accent/15 text-accent animate-pulse cursor-pointer shrink-0" 
                      title="Stop reading chapter"
                    >
                      <VolumeX size={18} />
                    </button>
                  )}

                  {/* Translation Selector */}
                  <TranslationSelector 
                    currentTranslation={translation} 
                    onSelectTranslation={setTranslation}
                    theme={theme as 'dark' | 'light'}
                  />

                  {/* Reverse Interlinear Quick Button (Visible on tablet screens where there is room) */}
                  <button 
                    onClick={() => handleToggleInterlinearMode()} 
                    className={`hidden md:flex p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isInterlinearMode ? 'bg-accent text-accent-on' : 'text-fg-2 hover:text-fg hover:bg-surface'
                    }`} 
                    title={isInterlinearMode ? "Disable Interlinear" : "Enable Interlinear"}
                  >
                    <Languages size={18} />
                  </button>

                  {/* Study AI Button */}
                  <button 
                    onClick={() => setMobileStudyView('ai')} 
                    className="p-2 text-fg-2 hover:text-fg relative rounded-lg hover:bg-surface transition-colors cursor-pointer shrink-0" 
                    title="Study AI Assistant"
                  >
                    <Sparkles size={18} className="text-accent" />
                    {chatQuotes.length > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent text-accent-on text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {chatQuotes.length}
                      </span>
                    )}
                  </button>

                  {/* 3 Dots More Menu (Always available on mobile & tablet) */}
                  <div ref={mobileMoreMenuRef} className="relative z-30 mobile-more-menu-container">
                    <button
                      type="button"
                      onClick={() => setIsMobileMoreMenuOpen(prev => !prev)}
                      className={`p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors cursor-pointer ${
                        isMobileMoreMenuOpen ? 'bg-surface text-fg' : ''
                      }`}
                      title="More study tools & options"
                      aria-label="More study options"
                    >
                      <MoreVertical size={18} className="pointer-events-none" />
                    </button>

                    {isMobileMoreMenuOpen && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl space-y-1"
                        onClick={() => setIsMobileMoreMenuOpen(false)}
                      >
                        {/* Reverse Interlinear toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleInterlinearMode()}
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

                        {/* Read Chapter Aloud */}
                        <button
                          type="button"
                          onClick={toggleSpeech}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-fg/5 text-fg text-xs font-medium cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {isSpeaking ? <VolumeX size={16} className="text-accent" /> : <Volume2 size={16} className="text-fg-2" />}
                            <span>{isSpeaking ? 'Stop Reading Aloud' : 'Read Chapter Aloud'}</span>
                          </div>
                          {isSpeaking && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent/20 text-accent animate-pulse">
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

                        {/* Lectio Divina */}
                        <button
                          type="button"
                          onClick={() => setIsLectioModalOpen(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-fg/5 text-fg text-xs font-medium cursor-pointer transition-colors"
                        >
                          <Heart size={16} className="text-rose-400" />
                          <span>Lectio Divina</span>
                        </button>

                        {/* Mark Completed */}
                        <button
                          type="button"
                          onClick={toggleCompleted}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-fg/5 text-xs font-medium cursor-pointer border-t border-border mt-1 pt-2 transition-colors ${
                            isCompleted ? 'text-accent font-semibold' : 'text-fg'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Check size={16} className={isCompleted ? "text-accent" : "text-meta"} />
                            <span>{isCompleted ? 'Marked Completed' : 'Mark as Completed'}</span>
                          </div>
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent/15 text-accent">
                              Done
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="bible-reader-content flex-1 overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-10" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                <article className="max-w-3xl mx-auto w-full break-words">
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
                                  onClick={handleVerseNumberClick}
                                  onTouchEnd={handleVerseNumberClick}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1 cursor-default align-baseline relative -top-0.5 inline-block shrink-0 ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 'text-muted/80'
                                  }`}
                                  title={`Verse ${v.verse}`}
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
                              <span className="verse-text break-words">
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
                                  onClick={handleVerseNumberClick}
                                  onTouchEnd={handleVerseNumberClick}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1.5 cursor-default align-baseline relative -top-0.5 inline-block shrink-0 ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 'text-muted/80'
                                  }`}
                                  title={`Verse ${v.verse}`}
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
                              <span className="verse-text break-words">
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
                    <nav aria-label="Chapter Navigation" className="mt-10 pt-6 border-t border-border flex items-center justify-between gap-2.5 text-xs sm:text-sm">
                      {prevChapterInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigateToVerse(prevChapterInfo.book, prevChapterInfo.chapter, 1);
                            document.querySelectorAll('.bible-reader-content').forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
                          }}
                          className="flex-1 min-w-0 max-w-[210px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border text-fg font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <ChevronLeft size={16} className="shrink-0" />
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
                          className="flex-1 min-w-0 max-w-[210px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-accent-on font-semibold hover:opacity-95 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <span className="truncate">{nextChapterInfo.book} {nextChapterInfo.chapter}</span>
                          <ChevronRight size={16} className="shrink-0" />
                        </button>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </nav>
                  )}
                </article>
              </div>
            </section>

            {/* Mobile Right Sidebar: Study AI */}
            <aside 
              className={`relative w-full border-l border-border bg-bg flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden'}`}
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
              <header className="h-[60px] border-b border-border flex items-center justify-between px-3 sm:px-4 text-[15px] font-medium text-fg shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setMobileStudyView('reader')} className="p-1.5 -ml-1 text-fg-2 hover:text-fg shrink-0 cursor-pointer" title="Back to reader">
                    <ChevronLeft size={20} />
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
              <div className="flex-1 flex flex-col h-[calc(100%-60px)]">
                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
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
                      />
                    ))
                  )}
                  {isAiTyping && (
                    <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-bg shrink-0">
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
                    ) : (
                      <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const vNum = selectionVerse || 1;
                            const vObj = bibleVerses.find(v => v.verse === vNum) || bibleVerses[0];
                            setAttachedScripture({
                              reference: `${activeBook.name} ${activeChapter}:${vNum}`,
                              text: cleanVerseText(vObj?.text || ''),
                              translation: translation.toUpperCase(),
                              isSpecificVerse: true,
                            });
                          }}
                          className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-lg border border-dashed border-border-soft hover:border-accent/40 text-[10px] text-meta hover:text-fg transition-colors cursor-pointer"
                        >
                          <BookOpen size={10} className="text-accent" />
                          <span>+ Attach Verse ({activeBook.name} {activeChapter}:{selectionVerse || 1})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedScripture({
                              reference: `${activeBook.name} ${activeChapter}`,
                              text: bibleVerses.slice(0, 30).map(v => `${v.verse}. ${cleanVerseText(v.text)}`).join(' '),
                              translation: translation.toUpperCase(),
                              isSpecificVerse: false,
                            });
                          }}
                          className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-lg border border-dashed border-border-soft hover:border-accent/40 text-[10px] text-meta hover:text-fg transition-colors cursor-pointer"
                        >
                          <span>+ Attach Chapter</span>
                        </button>
                      </div>
                    )}

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

                    <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5">
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={cooldown > 0 || !isOnline} 
                        className="flex-shrink-0 p-2 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1 cursor-pointer"
                        title="Attach file or image"
                      >
                        <Paperclip size={16} />
                      </button>
                      <TextareaAutosize 
                        ref={chatInputRef}
                        minRows={1}
                        maxRows={5}
                        className="flex-1 bg-transparent text-fg pl-1 pr-10 py-2 text-[14px] placeholder:text-meta focus:outline-none resize-none" 
                        placeholder={!isOnline ? "Study AI is unavailable offline" : cooldown > 0 ? `Study AI is resting... (${cooldown}s)` : "Ask anything (type / for commands)..."} 
                        value={chatInput}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          if (e.target.value.startsWith('/')) {
                            setShowSlashCommands(true);
                          } else {
                            setShowSlashCommands(false);
                          }
                        }}
                        onKeyDown={handleChatKeyDown}
                        disabled={cooldown > 0 || !isOnline}
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || cooldown > 0 || !isOnline}
                        className="absolute right-2 bottom-2 p-2 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-30 disabled:hover:bg-accent transition-all shadow-sm shrink-0 cursor-pointer"
                        title="Send message"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="hidden lg:flex w-full h-full">
            <PanelGroup 
              orientation="horizontal" 
              id="theologica-layout-v2" 
              className="flex w-full h-full"
              onLayoutChange={() => measureWidths()}
              onLayoutChanged={() => measureWidths()}
            >
            {/* Left Sidebar: Navigation */}
            {showLeftSidebar && (
              <Panel panelRef={leftPanelRef} defaultSize="15" minSize="15" className={`w-full lg:w-auto border-r border-border bg-bg flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden lg:flex'}`}>
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

              <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {/* Old Testament Section */}
                {filteredOtBooks.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsOtExpanded(!isOtExpanded)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xl hover:bg-surface/50 transition-colors group cursor-pointer"
                      title={isOtExpanded ? "Collapse Old Testament" : "Expand Old Testament"}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 shrink-0 ${isOldTestament ? 'text-accent' : 'text-muted'} ${isOtExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          Old Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredOtBooks.length}
                      </span>
                    </button>

                    {isOtExpanded && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredOtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              name="desktop-bible-books"
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedBook(prev => prev === b.name ? null : b.name);
                                }}
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
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 shrink-0 ${!isOldTestament ? 'text-accent' : 'text-muted'} ${isNtExpanded ? '' : '-rotate-90'}`}
                        />
                        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${!isOldTestament ? 'text-accent' : 'text-muted group-hover:text-fg'}`}>
                          New Testament
                        </span>
                      </div>
                      <span className="text-[11px] text-muted tabular-nums opacity-60 shrink-0">
                        {filteredNtBooks.length}
                      </span>
                    </button>

                    {isNtExpanded && (
                      <div className="mt-0.5 space-y-0.5 pl-1">
                        {filteredNtBooks.map(b => {
                          const isCurrentBook = activeBook.name === b.name;
                          return (
                            <details
                              key={b.name}
                              name="desktop-bible-books"
                              open={expandedBook === b.name}
                              className="group"
                            >
                              <summary
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedBook(prev => prev === b.name ? null : b.name);
                                }}
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
              </Panel>
            )}

            {showLeftSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Center: Bible Reader */}
            <Panel defaultSize="60" minSize="30" className={`w-full lg:w-auto flex-col h-full bg-bg min-w-0 ${mobileStudyView === 'reader' ? 'flex' : 'hidden lg:flex'}`}>
              <div ref={readerContainerRef} className="w-full h-full flex flex-col min-w-0 overflow-hidden relative">
                <PanelGroup orientation="vertical" id="theologica-layout-vertical-v2">
                <Panel defaultSize="75" minSize="30" className="flex flex-col relative min-w-0">
                  <header 
                    ref={readerHeaderRef}
                    className="w-full max-w-full min-w-0 h-[60px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-bg shrink-0 gap-2 relative z-20"
                  >
                    {/* Left: Book & Chapter Reference - ALWAYS visible, NEVER shrinks or gets clipped */}
                    <div ref={readerTitleRef} className="flex items-center gap-1.5 shrink-0 z-1 select-none">
                      <div className="font-display text-[16px] sm:text-[18px] lg:text-[20px] font-semibold whitespace-nowrap shrink-0">
                        {activeBook.name} {activeChapter}
                      </div>
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
                          />
                        </div>
                      </div>
                    </div>
                  </header>
              <div className="bible-reader-content flex-1 overflow-y-auto custom-scroll p-10 lg:p-16" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                <article className="max-w-3xl mx-auto w-full break-words">
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
                                  onClick={handleVerseNumberClick}
                                  onTouchEnd={handleVerseNumberClick}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1 cursor-default align-baseline relative -top-0.5 inline-block shrink-0 ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 'text-muted/80'
                                  }`}
                                  title={`Verse ${v.verse}`}
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
                              <span className="verse-text break-words">
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
                                  onClick={handleVerseNumberClick}
                                  onTouchEnd={handleVerseNumberClick}
                                  className={`verse-number select-none text-[11px] font-sans font-semibold mr-1.5 cursor-default align-baseline relative -top-0.5 inline-block shrink-0 ${
                                    currentSpeakingVerseIndex === index ? 'text-accent' : 'text-muted/80'
                                  }`}
                                  title={`Verse ${v.verse}`}
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
                              <span className="verse-text break-words">
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
                </Panel>
                
                {showBottomNotes && (
                  <PanelResizeHandle className="h-1 bg-surface hover:bg-accent active:bg-accent transition-colors cursor-row-resize shrink-0 z-10 w-full" />
                )}

              {/* Quick Note Split */}
                {showBottomNotes && (
                <Panel panelRef={bottomPanelRef} defaultSize="25" minSize="20" className="hidden lg:flex border-t border-border bg-bg flex-col shrink-0">
                <div className="h-10 border-b border-border flex items-center justify-between px-6 text-[11px] font-bold text-muted uppercase tracking-widest">
                  <span>Quick Note — {chapterTitle}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (chapterNote) {
                        setActiveTab('notes');
                        setActiveNoteId(chapterNote.id);
                      } else {
                        const res = await fetchWithAuth(`${API_URL}/api/notes`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: chapterTitle, content: '' })
                        });
                        const newNote = await res.json();
                        setNotes(prev => [newNote, ...prev]);
                        setActiveTab('notes');
                        setActiveNoteId(newNote.id);
                      }
                    }}
                    className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 normal-case tracking-normal cursor-pointer"
                    title="Open in full Study Notebook with rich formatting and AI"
                  >
                    <span>Open in Full Notes</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
                <textarea 
                  className="flex-1 bg-transparent p-6 focus:outline-none resize-none text-[15px] leading-relaxed text-fg custom-scroll" 
                  placeholder={`Take notes for ${chapterTitle}...`}
                  value={chapterNote ? chapterNote.content : ''}
                  onChange={handleQuickNoteChange}
                />
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
                defaultSize="25" 
                minSize="20" 
                className={`relative w-full lg:w-auto border-l border-border bg-bg flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden lg:flex'}`}
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
              <header className="h-[60px] border-b border-border flex items-center justify-between px-2.5 sm:px-3 lg:px-4 text-[15px] font-medium text-fg shrink-0 gap-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <button onClick={() => setMobileStudyView('reader')} className="lg:hidden p-1.5 -ml-1 text-fg-2 hover:text-fg shrink-0 cursor-pointer" title="Back to reader">
                    <ChevronLeft size={20} />
                  </button>
                  <Sparkles size={16} className="hidden lg:block text-accent shrink-0" />
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
              <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6">
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
                    />
                  ))
                )}
                {isAiTyping && (
                  <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} />
                )}
                <div ref={messagesEndRef} />
              </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-bg shrink-0">
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
                    ) : (
                      <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const vNum = selectionVerse || 1;
                            const vObj = bibleVerses.find(v => v.verse === vNum) || bibleVerses[0];
                            setAttachedScripture({
                              reference: `${activeBook.name} ${activeChapter}:${vNum}`,
                              text: cleanVerseText(vObj?.text || ''),
                              translation: translation.toUpperCase(),
                              isSpecificVerse: true,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border border-dashed border-border-soft hover:border-accent/50 text-[11px] text-meta hover:text-fg transition-all cursor-pointer bg-surface/40 hover:bg-surface"
                        >
                          <BookOpen size={11} className="text-accent" />
                          <span>+ Attach Verse ({activeBook.name} {activeChapter}:{selectionVerse || 1})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedScripture({
                              reference: `${activeBook.name} ${activeChapter}`,
                              text: bibleVerses.slice(0, 30).map(v => `${v.verse}. ${cleanVerseText(v.text)}`).join(' '),
                              translation: translation.toUpperCase(),
                              isSpecificVerse: false,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border border-dashed border-border-soft hover:border-accent/50 text-[11px] text-meta hover:text-fg transition-all cursor-pointer bg-surface/20 hover:bg-surface"
                        >
                          <span>+ Attach Chapter</span>
                        </button>
                      </div>
                    )}

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

                    <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5">
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={cooldown > 0 || !isOnline} 
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
                        onChange={e => {
                          setChatInput(e.target.value);
                          if (e.target.value.startsWith('/')) {
                            setShowSlashCommands(true);
                          } else {
                            setShowSlashCommands(false);
                          }
                        }}
                        onKeyDown={handleChatKeyDown}
                        disabled={cooldown > 0 || !isOnline}
                        placeholder={!isOnline ? "Study AI is unavailable offline" : cooldown > 0 ? `Study AI is resting... (${cooldown}s)` : "Message Study AI (type / for commands)..."}
                        className="flex-1 bg-transparent text-fg pl-1 pr-10 py-2 text-[14px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || cooldown > 0 || !isOnline} 
                        className="absolute right-2 bottom-2 p-2 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-40 disabled:hover:bg-accent transition-all shadow-sm cursor-pointer"
                        title="Send message"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                </form>
              </Panel>
            )}
          </PanelGroup>
          </div>
        )}


        {/* Floating Toolbar for Highlighting & Referencing */}
        {toolbarPosition && (
          <div 
            onMouseDown={(e) => e.preventDefault()}
            className="floating-verse-toolbar fixed z-50 flex items-center gap-1 sm:gap-1.5 bg-surface/95 border border-border-soft p-1.5 rounded-xl shadow-xl backdrop-blur-md max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar custom-scroll transition-opacity"
            style={{ 
              left: Math.max(12, Math.min(typeof window !== 'undefined' ? window.innerWidth - 12 : 360, toolbarPosition.x)), 
              top: toolbarPosition.y,
              transform: toolbarPosition.isBelow ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))'
            }}
          >
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('yellow')} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-yellow-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Yellow" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('green')} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-green-500 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Green" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('blue')} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-blue-500 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Blue" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('pink')} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-pink-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Pink" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('purple')} 
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 min-w-[20px] sm:min-w-[22px] rounded-full bg-purple-400 hover:scale-120 active:scale-90 transition-transform shadow-xs cursor-pointer ring-1 ring-black/10 dark:ring-white/10" 
              title="Highlight Purple" 
            />
            <div className="w-[1px] h-5 bg-border-soft mx-0.5" />
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={askAiAboutHighlight} 
              className="flex items-center justify-center h-7 sm:h-8 px-2.5 rounded-lg bg-accent text-white hover:bg-[#d87654] active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0"
              title="Ask AI about this verse"
            >
              <Sparkles size={13} /> <span>Ask AI</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={addHighlightToChat} 
              className="flex items-center justify-center h-7 sm:h-8 px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Add to Chat"
            >
              <MessageSquarePlus size={13} />
              <span>Quote</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={addHighlightToCanvas} 
              className="flex items-center justify-center h-7 sm:h-8 px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Send to Canvas"
            >
              <Workflow size={13} />
              <span>Canvas</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={handleSelectionWordStudy} 
              className="flex items-center justify-center h-7 sm:h-8 px-2.5 rounded-lg bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs font-semibold shadow-xs gap-1.5 cursor-pointer shrink-0" 
              title="Inspect Hebrew/Greek Word Study"
            >
              <Languages size={13} className="text-accent" />
              <span>Word Study</span>
            </button>
            {toolbarPosition.highlightId && (
              <>
                <div className="w-[1px] h-5 bg-border-soft mx-0.5" />
                <button 
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => deleteHighlight(toolbarPosition.highlightId!)} 
                  className="flex items-center justify-center h-7 sm:h-8 px-2 rounded-lg bg-surface border border-border-soft text-error hover:bg-error hover:text-white transition-all shadow-xs cursor-pointer shrink-0"
                  title="Delete Highlight"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}

        {/* DEVOTIONAL TAB */}
        {activeTab === 'devotional' && (
          <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-10 pb-24 lg:pb-10 bg-bg">
            <div className="w-full max-w-4xl xl:max-w-5xl space-y-6">
              {/* Day navigation & Time toggle header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 pb-2 border-b border-border/50">
                {/* Prev / Today / Next Day Navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeDevotionalDay(displayDay - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold transition-all text-fg cursor-pointer active:scale-95"
                    title="Previous Day"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <div className="px-3 py-1.5 rounded-xl bg-surface/60 border border-border/50 text-xs font-bold text-fg-hover tracking-wide">
                    Day {displayDay} <span className="text-muted font-normal">/ {totalDays}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => changeDevotionalDay(displayDay + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold transition-all text-fg cursor-pointer active:scale-95"
                    title="Next Day"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>

                  {displayDay !== todayDayRef.current && (
                    <button
                      type="button"
                      onClick={() => changeDevotionalDay(todayDayRef.current)}
                      className="ml-1 px-2.5 py-1.5 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/25 transition-all cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Morning / Evening Toggle switch */}
                <div className="flex p-1 bg-surface rounded-xl ring-shadow border border-border/40">
                  <button 
                    onClick={() => setDevotionalTime('morning')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      devotionalTime === 'morning' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Sun size={14} />
                    <span>Morning</span>
                  </button>
                  <button 
                    onClick={() => setDevotionalTime('evening')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      devotionalTime === 'evening' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <Moon size={14} />
                    <span>Evening</span>
                  </button>
                </div>
              </div>

              {/* Devotional Article Card with smooth non-overflowing transition */}
              {devotionalEntry && (
                <article className="border border-border/80 rounded-2xl p-4 sm:p-8 lg:p-14 shadow-lg bg-surface/25 backdrop-blur-sm ring-shadow w-full break-words">
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
                                  if (parsedVerse) {
                                    navigateToVerse(parsedVerse.book, parsedVerse.chapter, parsedVerse.verse);
                                  }
                                }}
                                className={`font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg transition-colors break-words ${
                                  parsedVerse ? 'cursor-pointer hover:text-accent' : ''
                                }`}
                                title={parsedVerse ? `Open ${parsedVerse.book} ${parsedVerse.chapter}:${parsedVerse.verse} in Bible reader` : undefined}
                              >
                                {quote}
                              </h2>
                              {citation && (
                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (parsedVerse) {
                                        navigateToVerse(parsedVerse.book, parsedVerse.chapter, parsedVerse.verse);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm sm:text-base font-semibold border border-accent/25 hover:border-accent/40 transition-all cursor-pointer group/devo-verse"
                                    title={parsedVerse ? `Open ${parsedVerse.book} ${parsedVerse.chapter}:${parsedVerse.verse} in Bible reader` : undefined}
                                  >
                                    <span>{citation}</span>
                                    <BookOpen size={15} className="opacity-70 group-hover/devo-verse:opacity-100 transition-opacity" />
                                  </button>
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
                            className="flex items-center gap-1 px-3 py-2 bg-surface hover:bg-surface-hover text-fg text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
                            title="Send Devotional to Canvas"
                          >
                            <Workflow size={14} className="text-accent" />
                            <span className="hidden sm:inline">Canvas</span>
                          </button>

                          <button 
                            type="button"
                            onClick={toggleDevoSpeech}
                            className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
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

                      <div className="text-[17px] sm:text-[18px] lg:text-[20px] leading-[2.0] text-fg font-serif mb-10 whitespace-pre-wrap break-words selection:bg-accent/20">
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
        )}

        {/* AI CHATS TAB */}
        {activeTab === 'chats' && (
          <div className="flex w-full h-full min-h-0 overflow-hidden">
            <aside className={`w-full lg:w-[280px] h-full min-h-0 border-r border-border bg-bg flex flex-col shrink-0 overflow-hidden ${mobileChatView === 'list' ? 'flex' : 'hidden lg:flex'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-4 sm:px-5 shrink-0">
                <span className="text-[15px] font-medium text-fg">Conversations</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleNewChat} 
                    className="p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
                    title="New Conversation"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => setMobileChatView('chat')}
                    className="lg:hidden p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-lg transition-colors cursor-pointer"
                    title="Back to Chat"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </header>

              {/* Prominent New Conversation Button like ChatGPT / Gemini */}
              <div className="p-3 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={handleNewChat}
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

              <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3 pb-24 lg:pb-3 space-y-1">
                {chats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      setActiveChatId(c.id);
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
            </aside>
            
            <section 
              className={`relative flex-1 h-full min-h-0 flex flex-col bg-bg overflow-hidden ${mobileChatView === 'chat' ? 'flex' : 'hidden lg:flex'}`}
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
              <header className="h-[60px] border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0">
                <div className="flex items-center min-w-0 mr-2">
                  <button 
                    onClick={() => setMobileChatView('list')} 
                    className="lg:hidden p-2 mr-1 text-fg-2 hover:text-fg shrink-0 cursor-pointer flex items-center"
                    title="View Conversations"
                  >
                    {activeChatId ? <ChevronLeft size={20} /> : <MessageSquare size={18} />}
                  </button>
                  <h2 className="text-[15px] sm:text-[18px] font-medium truncate max-w-[140px] xs:max-w-[220px] sm:max-w-md">
                    {activeChat.title || 'New Conversation'}
                  </h2>
                </div>
                <TheologicalLensSelector 
                  currentLens={theologicalLens} 
                  onSelectLens={setTheologicalLens} 
                  includeOriginalRoots={includeOriginalRoots} 
                  onToggleOriginalRoots={handleToggleOriginalRoots} 
                  compact 
                />
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-8 lg:p-12 space-y-6 sm:space-y-8 flex flex-col">
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
                    />
                  ))
                )}
                {isAiTyping && (
                  <AiThinkingIndicator status={aiActivityStatus} thinkingText={aiThinkingText} isFullView />
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-3 sm:p-6 border-t border-border w-full shrink-0">
                <div className="flex flex-col max-w-4xl mx-auto w-full relative">
                  {/* Scripture Context Pill */}
                  {attachedScripture ? (
                    <div className="mb-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface border border-border-soft text-[12px] text-muted shadow-2xs">
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
                  ) : (
                    <div className="mb-2.5 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const vNum = selectionVerse || 1;
                          const vObj = bibleVerses.find(v => v.verse === vNum) || bibleVerses[0];
                          setAttachedScripture({
                            reference: `${activeBook.name} ${activeChapter}:${vNum}`,
                            text: cleanVerseText(vObj?.text || ''),
                            translation: translation.toUpperCase(),
                            isSpecificVerse: true,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-xl border border-dashed border-border-soft hover:border-accent/50 text-[11px] text-meta hover:text-fg transition-all cursor-pointer bg-surface/40 hover:bg-surface"
                      >
                        <BookOpen size={12} className="text-accent" />
                        <span>+ Attach Verse ({activeBook.name} {activeChapter}:{selectionVerse || 1})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedScripture({
                            reference: `${activeBook.name} ${activeChapter}`,
                            text: bibleVerses.slice(0, 30).map(v => `${v.verse}. ${cleanVerseText(v.text)}`).join(' '),
                            translation: translation.toUpperCase(),
                            isSpecificVerse: false,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-xl border border-dashed border-border-soft hover:border-accent/50 text-[11px] text-meta hover:text-fg transition-all cursor-pointer bg-surface/20 hover:bg-surface"
                      >
                        <span>+ Attach Chapter ({activeBook.name} {activeChapter})</span>
                      </button>
                    </div>
                  )}

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

                  <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-md focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-2">
                    <button 
                      type="button" 
                      onClick={() => imageFileRef.current?.click()} 
                      disabled={cooldown > 0} 
                      className="flex-shrink-0 p-2.5 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1 cursor-pointer"
                      title="Attach file or image"
                    >
                      <Paperclip size={18} />
                    </button>
                    <TextareaAutosize 
                      ref={chatInputRef}
                      minRows={1}
                      maxRows={6}
                      value={chatInput} 
                      onChange={e => {
                        setChatInput(e.target.value);
                        if (e.target.value.startsWith('/')) {
                          setShowSlashCommands(true);
                        } else {
                          setShowSlashCommands(false);
                        }
                      }}
                      onKeyDown={handleChatKeyDown}
                      disabled={cooldown > 0}
                      placeholder={cooldown > 0 ? `Study AI is resting... (${cooldown}s remaining)` : "Message Study AI (type / for exegesis & language commands)..."}
                      className="flex-1 bg-transparent text-fg pl-1 pr-14 py-2 text-[15px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                    />
                    <button 
                      type="submit" 
                      disabled={isAiTyping || (!chatInput.trim() && !chatImage && !attachedFile && chatQuotes.length === 0) || cooldown > 0} 
                      className="absolute right-2.5 bottom-2.5 p-2.5 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-40 disabled:hover:bg-accent transition-all shadow-sm cursor-pointer"
                      title="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        )}

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
            <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-10 lg:p-16 pb-24 lg:pb-16 bg-bg">
              <div className="max-w-5xl mx-auto">
                <header className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-[40px] font-display text-fg mb-2 sm:mb-3">Reading Tracker</h1>
                  <p className="text-sm sm:text-[16px] text-muted">Track your reading streak, daily goals, and progress through all 66 books.</p>
                </header>

                {/* Streak, Daily Goal & 7-Day Consistency Dashboard */}
                <TrackerStreakHero
                  dailyChapterGoal={dailyChapterGoal}
                  totalChaptersCompleted={completedCount}
                  onNavigateToTab={setActiveTab}
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

                {/* Old Testament Accordion */}
                <div className="mb-6">
                  <button 
                    onClick={() => toggleTestament('OT')}
                    className="w-full flex items-center justify-between text-left bg-surface p-3.5 sm:p-5 rounded-[20px] ring-shadow hover:bg-surface-warm transition-colors cursor-pointer"
                  >
                    <div className="text-sm sm:text-[16px] font-bold tracking-widest text-fg uppercase">Old Testament</div>
                    
                      <div className="flex-1 mx-3 sm:mx-6 min-w-[50px]">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${otPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-3 sm:mr-4 shrink-0">{trackerFormat === 'percent' ? `${otPercent}%` : `${otCompleted}/${otTotal}`}</div>
                      <div className="text-muted">{expandedTestaments.includes('OT') ? '▲' : '▼'}</div>
                  </button>
                  
                  {expandedTestaments.includes('OT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-border">
                      {OT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        return (
                          <div key={book.name} className="bg-surface rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors cursor-pointer"
                            >
                              <h3 className="font-medium text-[15px] text-fg">{book.name}</h3>
                              
                              <span className="text-[13px] text-muted font-mono bg-bg px-2 py-1 rounded-md">
                                {(() => {
                                  const comp = completedChapters.filter(c => c.startsWith(book.name + '-')).length;
                                  return trackerFormat === 'percent' ? `${Math.round((comp / book.chapters) * 100) || 0}%` : `${comp}/${book.chapters}`;
                                })()}
                              </span>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-border bg-bg">
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = `${book.name}-${i + 1}`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked 
                                            ? 'bg-accent text-white shadow-sm' 
                                            : 'bg-surface text-muted hover:text-fg hover:bg-border-soft'
                                        }`}
                                      >
                                        {i + 1}
                                      </button>
                                    )
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
                    className="w-full flex items-center justify-between text-left bg-surface p-3.5 sm:p-5 rounded-[20px] ring-shadow hover:bg-surface-warm transition-colors cursor-pointer"
                  >
                    <div className="text-sm sm:text-[16px] font-bold tracking-widest text-fg uppercase">New Testament</div>
                    
                      <div className="flex-1 mx-3 sm:mx-6 min-w-[50px]">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${ntPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-3 sm:mr-4 shrink-0">{trackerFormat === 'percent' ? `${ntPercent}%` : `${ntCompleted}/${ntTotal}`}</div>
                      <div className="text-muted">{expandedTestaments.includes('NT') ? '▲' : '▼'}</div>
                  </button>
                  
                  {expandedTestaments.includes('NT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-border">
                      {NT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        return (
                          <div key={book.name} className="bg-surface rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors cursor-pointer"
                            >
                              <h3 className="font-medium text-[15px] text-fg">{book.name}</h3>
                              
                              <span className="text-[13px] text-muted font-mono bg-bg px-2 py-1 rounded-md">
                                {(() => {
                                  const comp = completedChapters.filter(c => c.startsWith(book.name + '-')).length;
                                  return trackerFormat === 'percent' ? `${Math.round((comp / book.chapters) * 100) || 0}%` : `${comp}/${book.chapters}`;
                                })()}
                              </span>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-border bg-bg">
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = `${book.name}-${i + 1}`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked 
                                            ? 'bg-accent text-white shadow-sm' 
                                            : 'bg-surface text-muted hover:text-fg hover:bg-border-soft'
                                        }`}
                                      >
                                        {i + 1}
                                      </button>
                                    )
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
          );
        })()}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <NotesWorkspace
            notes={notes}
            activeNoteId={activeNoteId}
            onSelectNote={setActiveNoteId}
            onCreateNote={async (initialData) => {
              const res = await fetchWithAuth(`${API_URL}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  title: initialData?.title || 'New Note', 
                  content: initialData?.content || '' 
                })
              });
              const newNote = await res.json();
              setNotes(prev => [newNote, ...prev]);
              return newNote;
            }}
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
        {/* Mobile Bottom Navigation */}
        <nav 
          aria-label="Mobile Navigation"
          className={`lg:hidden shrink-0 h-[calc(60px+env(safe-area-inset-bottom))] bg-bg/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 z-40 w-full transition-all duration-200 select-none ${
            isMobileTyping ? 'hidden pointer-events-none' : 'flex'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'notes') {
                    setActiveNoteId(null);
                  }
                  if (tab === 'canvas') {
                    setCanvasFocusTrigger(prev => prev + 1);
                  }
                  if (tab === 'chats') {
                    setMobileChatView('chat');
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-colors relative cursor-pointer active:scale-95 touch-manipulation ${
                  isActive ? 'text-accent font-semibold' : 'text-muted hover:text-fg font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0.5 w-6 h-0.5 rounded-full bg-accent" />
                )}
                <div className="relative">
                  {tab === 'study' && <Layout size={19} className="mb-0.5" />}
                  {tab === 'canvas' && <Workflow size={19} className="mb-0.5" />}
                  {tab === 'devotional' && <BookOpen size={19} className="mb-0.5" />}
                  {tab === 'notes' && <Edit size={19} className="mb-0.5" />}
                  {tab === 'chats' && <Sparkles size={19} className="mb-0.5" />}
                  {tab === 'tracker' && <Target size={19} className="mb-0.5" />}
                </div>
                <span className="text-[10px] tracking-tight capitalize truncate max-w-full px-0.5">
                  {tab === 'chats' ? 'Chats' : tab === 'devotional' ? 'Devotion' : tab}
                </span>
              </button>
            );
          })}
        </nav>

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
            className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
