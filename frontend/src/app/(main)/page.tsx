"use client";
const API_URL = '';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth, UserButton, SignIn } from '@clerk/nextjs';
import { Send, Plus, Layout, Edit, Sparkles, Target, Check, Copy, ChevronRight, ChevronLeft, Trash2, Volume2, VolumeX, Sun, Moon, BookOpen, GripVertical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen, MessageSquarePlus, X, Paperclip, Image as ImageIcon , Settings, Workflow } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { getDevotionalForDay, DevotionalEntry } from '../../lib/devotionals';
import PWAInstallPrompt from '../PWAInstallPrompt';
import { CanvasBoard } from '@/components/canvas/CanvasBoard';
import { NodeCategory } from '@/types/canvas';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  linkifyBibleReferences, 
  parseVerseReference, 
  createMarkdownComponents, 
  VerseClickHandler 
} from '@/lib/bibleReferences';
import { TranslationSelector } from '@/components/bible/TranslationSelector';
import { getPassage } from '@/lib/bibleProvider';

// --- All 66 Books ---
const otStr = "Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,1 Samuel:31,2 Samuel:24,1 Kings:22,2 Kings:25,1 Chronicles:29,2 Chronicles:36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,Song of Solomon:8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4";
const ntStr = "Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,1 Corinthians:16,2 Corinthians:13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,1 Thessalonians:5,2 Thessalonians:3,1 Timothy:6,2 Timothy:4,Titus:3,Philemon:1,Hebrews:13,James:5,1 Peter:5,2 Peter:3,1 John:5,2 John:1,3 John:1,Jude:1,Revelation:22";

const OT_BOOKS = otStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const NT_BOOKS = ntStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });

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

// Parse AI message content — handles __GENERATED_IMAGE__ markers
function parseAiMessage(content: string): { imageBase64: string | null; textContent: string } {
  const imageMatch = content.match(/__GENERATED_IMAGE__([\s\S]*?)__END_IMAGE__/);
  if (imageMatch) {
    const imageBase64 = imageMatch[1];
    const textContent = content.replace(/__GENERATED_IMAGE__[\s\S]*?__END_IMAGE__/, '').trim();
    return { imageBase64, textContent };
  }
  return { imageBase64: null, textContent: content };
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
  onSendToCanvas
}: {
  content: string;
  chatTitle?: string;
  onSendToCanvas?: (content: string, title?: string) => void;
}) => {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex items-center gap-1.5 mt-2.5 pt-1.5 select-none text-muted">
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

      {onSendToCanvas && (
        <button
          type="button"
          onClick={() => onSendToCanvas(content, chatTitle)}
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

const AiThinkingIndicator = ({ status, isFullView }: { status: string; isFullView?: boolean }) => {
  return (
    <div className={`flex flex-col items-start w-full ${isFullView ? 'max-w-3xl mx-auto' : ''} py-2`}>
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
          <Sparkles size={11} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">Study AI</span>
      </div>
      <div className="flex items-center gap-2.5 text-[13px] text-muted font-medium py-1 select-none">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-fg-2 transition-all duration-200">{status}</span>
      </div>
    </div>
  );
};

const AiChatMessageView = ({
  message,
  index,
  totalMessages,
  onVerseClick,
  onSendToCanvas,
  chatTitle,
  isFullView,
}: {
  message: { role: string; content: string; imagePreview?: string };
  index: number;
  totalMessages: number;
  onVerseClick?: VerseClickHandler;
  onSendToCanvas?: (content: string, title?: string) => void;
  chatTitle?: string;
  isFullView?: boolean;
}) => {
  const isUser = message.role === 'user';
  const isLast = index === totalMessages - 1;
  const mdComponents = useMemo(() => createMarkdownComponents(onVerseClick), [onVerseClick]);

  if (isUser) {
    return (
      <div className={`flex flex-col items-end w-full ${isFullView ? 'max-w-3xl mx-auto' : ''}`}>
        <div className={`${
          isFullView 
            ? 'px-5 py-3 max-w-[85%] sm:max-w-[75%] text-[15px]' 
            : 'px-4 py-2.5 max-w-[90%] sm:max-w-[85%] text-[14px]'
        } leading-relaxed bg-surface border border-border-soft/60 text-fg rounded-2xl shadow-sm break-words`}>
          {message.imagePreview && (
            <img 
              src={message.imagePreview} 
              alt="attached" 
              className={`${isFullView ? 'max-h-52 mb-3' : 'max-h-40 mb-2'} rounded-xl object-contain`} 
            />
          )}
          <ReactMarkdown components={userMarkdownComponents}>{message.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Study AI message
  const { imageBase64, textContent } = parseAiMessage(message.content);

  return (
    <div className={`flex flex-col items-start w-full ${isFullView ? 'max-w-3xl mx-auto' : ''} py-2`}>
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
          <Sparkles size={11} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">Study AI</span>
      </div>

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
        onSendToCanvas={onSendToCanvas}
      />
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
  const { getToken } = useAuth();
  
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
  const [canvasIncomingNode, setCanvasIncomingNode] = useState<{
    title: string;
    content: string;
    category?: NodeCategory;
  } | null>(null);

  // Initialize active tab from URL query params (e.g. /?tab=canvas or via /canvas rewrite)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Synchronize activeTab to URL query params for reliable refresh & bookmarking
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
  const [translation, setTranslation] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theologica_bible_version') || 'bsb';
    }
    return 'bsb';
  });
  const [isVersesLoading, setIsVersesLoading] = useState(false);
  const [bibleVerses, setBibleVerses] = useState<{verse: number, text: string}[]>([]);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  
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
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Notes State
  const [notes, setNotes] = useState<{id: number, title: string, content: string}[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const tempNoteIdRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chats State
  const [chats, setChats] = useState<{id: number, title: string, messages: {role: string, content: string}[]}[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [trackerFormat, setTrackerFormat] = useState<'percent' | 'fraction'>('percent');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
    const savedTracker = (localStorage.getItem('trackerFormat') as 'percent' | 'fraction') || 'percent';
    setTrackerFormat(savedTracker);
  }, []);

  // Dynamic favicon and theme sync effect across browser tab and mobile
  useEffect(() => {
    const iconUrl = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';

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
    const themeColor = theme === 'light' ? '#faf9f5' : '#141413';
    let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  };

  const toggleTrackerFormat = () => {
    const newFormat = trackerFormat === 'percent' ? 'fraction' : 'percent';
    setTrackerFormat(newFormat);
    localStorage.setItem('trackerFormat', newFormat);
  };
  const [chatInput, setChatInput] = useState('');
  const [chatQuotes, setChatQuotes] = useState<{id: string, text: string, reference: string}[]>([]);
  const [chatImage, setChatImage] = useState<{base64: string, mimeType: string, preview: string} | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiActivityStatus, setAiActivityStatus] = useState('Thinking...');
  const [aiActivityType, setAiActivityType] = useState<'study' | 'image'>('study');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAiTyping) {
      setAiActivityStatus('Thinking...');
      return;
    }

    if (aiActivityType === 'image') {
      setAiActivityStatus('Thinking...');
      const t1 = setTimeout(() => setAiActivityStatus('Envisioning biblical scene...'), 2000);
      const t2 = setTimeout(() => setAiActivityStatus('Composing sacred artwork...'), 5000);
      const t3 = setTimeout(() => setAiActivityStatus('Rendering image details...'), 9000);
      const t4 = setTimeout(() => setAiActivityStatus('Finalizing artwork...'), 14000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }

    // Default: Bible study query progression
    setAiActivityStatus('Thinking...');
    const t1 = setTimeout(() => setAiActivityStatus('Finding verses...'), 1800);
    const t2 = setTimeout(() => setAiActivityStatus('Looking for Greek & Hebrew roots...'), 4200);
    const t3 = setTimeout(() => setAiActivityStatus('Analyzing scriptural context & theology...'), 7200);
    const t4 = setTimeout(() => setAiActivityStatus('Formulating response...'), 11000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isAiTyping, aiActivityType]);

  // Load Data
  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/notes`).then(r => r.json()).then(data => {
      setNotes(data);
      if (data.length > 0) setActiveNoteId(data[0].id);
    });
    fetchWithAuth(`${API_URL}/api/chats`).then(r => r.json()).then(data => {
      setChats(data);
      data.forEach((c: { title: string }) => seenTitles.add(c.title));
      setActiveChatId(null); // Fresh session on reload
    });
    fetchWithAuth(`${API_URL}/api/tracker`).then(r => r.json()).then(data => {
      setCompletedChapters(data.map((item: {chapterId: string}) => item.chapterId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Click on a verse number to reference that verse directly
  const handleVerseNumberClick = (verseNum: number, verseText: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Clear any native browser selection
    window.getSelection()?.removeAllRanges();

    setSelectedText(verseText);
    setSelectionVerse(verseNum);
    setEndVerseNumber(verseNum);
    setSelectionRange(null);
    
    const existingHighlight = highlights.find(h => h.book === activeBook.name && h.chapter === activeChapter && h.verse === verseNum);

    const toolbarHalfWidth = 165;
    const x = Math.max(toolbarHalfWidth + 12, Math.min(window.innerWidth - toolbarHalfWidth - 12, rect.left + rect.width / 2));
    const isNearTop = rect.top < 110;
    const y = isNearTop ? rect.bottom + 8 : rect.top - 6;

    setToolbarPosition({
      x,
      y,
      highlightId: existingHighlight?.id,
      isBelow: isNearTop
    });
  };

  // Highlighting & Drag Selection Logic
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const rawText = selection.toString().trim();
    if (!rawText) return;

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

      const toolbarHalfWidth = 195;
      const x = Math.max(toolbarHalfWidth + 12, Math.min(window.innerWidth - toolbarHalfWidth - 12, rect.left + rect.width / 2));
      const isNearTop = rect.top < 110;
      const y = isNearTop ? rect.bottom + 8 : rect.top - 6;

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
  const activeChat = chats.find(c => c.id === activeChatId) || { id: 0, title: 'No Conversation Selected', messages: [] };

  const saveHighlight = async (color: string) => {
    if (!isOnline) {
      alert("You must be connected to the internet to save highlights.");
      return;
    }
    const rawText = selectedText || selectionRange?.toString().trim() || '';
    if (!rawText || !selectionVerse) return;
    
    if (toolbarPosition?.highlightId) {
      const existingId = toolbarPosition.highlightId;
      setHighlights(prev => prev.map(h => h.id === existingId ? { ...h, color } : h));
      setToolbarPosition(null);
      window.getSelection()?.removeAllRanges();

      try {
        await fetchWithAuth(`${API_URL}/api/highlights/${existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color })
        });
      } catch (e) {
        console.error("Failed to update highlight", e);
      }
      return;
    }
    
    let text = cleanVerseText(rawText, selectionVerse, endVerseNumber || selectionVerse);
    
    // Fallback protection: if they try to highlight over text that is already highlighted
    const verseHighlights = highlights.filter(h => h.book === activeBook.name && h.chapter === activeChapter && h.verse === selectionVerse);
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

    // Optimistic UI update
    const tempId = Date.now();
    const newHighlight = { id: tempId, book, chapter, verse, text, color };
    setHighlights(prev => [...prev, newHighlight]);
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();

    try {
      const res = await fetchWithAuth(`${API_URL}/api/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, chapter, verse, text, color })
      });
      const data = await res.json();
      setHighlights(prev => prev.map(h => h.id === tempId ? data : h));
    } catch (e) {
      setHighlights(prev => prev.filter(h => h.id !== tempId));
      console.error("Failed to save highlight", e);
    }
  };

  const deleteHighlight = async (id: number) => {
    setToolbarPosition(null);
    if (!isOnline) {
      alert("You must be connected to the internet to delete highlights.");
      return;
    }

    setHighlights(prev => prev.filter(h => h.id !== id));
    try {
      await fetchWithAuth(`${API_URL}/api/highlights/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete highlight", e);
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
    };
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

  const sendChatMessageToCanvas = (content: string, title?: string) => {
    const { textContent } = parseAiMessage(content);
    if (!textContent) return;
    setCanvasIncomingNode({
      title: title ? `Insight: ${title}` : 'AI Theological Insight',
      content: textContent,
      category: 'theological_point',
    });
    setActiveTab('canvas');
  };


  const renderVerseContent = (verse: number, text: string) => {
    const verseHighlights = highlights.filter(h => h.verse === verse);
    if (verseHighlights.length === 0) return <>{text}</>;

    // Simple implementation: sort highlights by length descending to replace biggest first
    // In a robust implementation, we would split the string using offsets.
    // For now, let's use a regex replacement to wrap text in marked spans.
    // Since React needs elements, we can do this by splitting the string safely.
    
    // For perfect non-overlapping rendering:
    let segments: { text: string, highlight?: typeof highlights[0] }[] = [{ text }];
    
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
                
                setToolbarPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 4,
                  highlightId: seg.highlight!.id
                });
              }}
              className={`cursor-pointer rounded-sm px-0.5 ${seg.highlight.color === 'yellow' ? 'bg-yellow-500/40 text-inherit' : seg.highlight.color === 'green' ? 'bg-green-500/40 text-inherit' : seg.highlight.color === 'blue' ? 'bg-blue-500/40 text-inherit' : seg.highlight.color === 'pink' ? 'bg-pink-500/40 text-inherit' : 'bg-purple-500/40 text-inherit'}`}
              title="Click to remove highlight"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
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
      
      const textToSpeak = devotionalTime === 'morning' 
        ? `${devotionalEntry.morningVerse}. ${devotionalEntry.morningText}`
        : `${devotionalEntry.eveningVerse}. ${devotionalEntry.eveningText}`;
        
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
          setIsVersesLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setBibleVerses([{ verse: 1, text: err?.message || "Error loading scripture text." }]);
          setIsVersesLoading(false);
        }
      });

    // Fetch highlights for current chapter
    fetchWithAuth(`${API_URL}/api/highlights?book=${encodeURIComponent(activeBook.name)}&chapter=${activeChapter}`)
      .then(r => r.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) setHighlights(data);
      })
      .catch(e => console.error("Failed to load highlights", e));
      
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
    const textToSpeak = bibleVerses[index].text;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9; // Slightly slower for reverence
    
    // Select the best available premium voice
    const preferredVoices = [
      'Samantha',                 // macOS / iOS (excellent female voice)
      'Siri Female',              // macOS / iOS
      'Siri',                     // macOS / iOS
      'Google UK English Female', // Android / Chrome
      'Google US English',        // Android / Chrome
      'Microsoft Zira',           // Windows Female
      'Microsoft Mark'            // Windows Male
    ];
    
    let selectedVoice = null;
    for (const voiceName of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(voiceName) && v.lang.startsWith('en'));
      if (selectedVoice) break;
    }
    
    // Fallback to any english voice if no premium voice is found
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en')) || null;
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (isSpeakingRef.current) {
        playVerse(index + 1);
      }
    };
    
    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error", e);
      // Try to gracefully continue on minor errors
      if (isSpeakingRef.current) {
         playVerse(index + 1);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

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

  const handleNewChat = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Conversation' })
    });
    const newChat = await res.json();
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
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

  const handleRenameChat = async (id: number, oldTitle: string) => {
    const newTitle = window.prompt('Rename conversation:', oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    await fetchWithAuth(`${API_URL}/api/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
  };


  const handleDeleteNote = async (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    await fetchWithAuth(`${API_URL}/api/notes/${id}`, {
      method: 'DELETE'
    });
  };

  const handleRenameNoteSidebar = (id: number, oldTitle: string, content: string) => {
    const newTitle = window.prompt('Rename note:', oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    updateNote(id, newTitle, content);
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
    if (!textToSend.trim() && !chatImage) return;
    if (cooldown > 0) return;
    
    setChatQuotes([]);
    const currentImage = chatImage;
    setChatImage(null);

    let targetChatId = activeChatId;

    // Create a new chat automatically if none exists
    if (!targetChatId) {
      const res = await fetchWithAuth(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      });
      const newChat = await res.json();
      targetChatId = newChat.id;
      
      const newMsg = { role: 'user', content: textToSend.trim(), imagePreview: currentImage?.preview };
      const chatWithOptimisticMsg = { ...newChat, messages: [newMsg] };
      
      setChats(prev => [chatWithOptimisticMsg, ...prev]);
      setActiveChatId(newChat.id);
    } else {
      const newMsg = { role: 'user', content: textToSend.trim(), imagePreview: currentImage?.preview };
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, newMsg] };
        }
        return c;
      }));
    }
    
    const currentInput = textToSend;
    if (!overrideText) setChatInput(''); else setChatInput('');
    setCooldown(30); // 30s cooldown
    const isImageReq = [
      'draw', 'generate an image', 'create an image', 'make an image', 'paint',
      'illustrate', 'visualize', 'show me a picture', 'create a picture',
      'generate a picture', 'make a picture', 'create a visual', 'depict',
      'render', 'generate art', 'create art', 'make art',
      'show me what', 'generate a photo', 'create a photo', 'make a photo'
    ].some(kw => currentInput.toLowerCase().includes(kw)) && !currentImage;
    setAiActivityType(isImageReq ? 'image' : 'study');
    setIsAiTyping(true);
    setTimeout(scrollToBottom, 50);

    const messagePromise = fetchWithAuth(`${API_URL}/api/chats/${targetChatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: currentInput,
        image: currentImage ? { base64: currentImage.base64, mimeType: currentImage.mimeType } : undefined,
        scriptureContext: explicitScripture,
        translation: translation.toUpperCase()
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
    setIsAiTyping(false); // Hide 3 dots immediately once the message is back
    
    if (res.ok) {
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
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: currentChapterId })
    });
  };

  const toggleAnyChapter = async (id: string) => {
    const checked = completedChapters.includes(id);
    setCompletedChapters(prev => checked ? prev.filter(c => c !== id) : [...prev, id]);
    await fetchWithAuth(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: id })
    });
  };

  const { isLoaded, userId } = useAuth();
  
  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-bg text-white">Loading...</div>;
  
  if (!userId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <>
        <div className="h-full flex flex-col bg-bg text-fg">
      {/* Top Navbar */}
      <header className="relative h-14 border-b border-border flex items-center justify-between px-6 bg-bg z-10 shrink-0">
        
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <div className="font-display text-[22px] tracking-tight text-accent flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === 'light' ? '/logo-light.png' : '/logo-dark.png'} alt="Theologica Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-lg" />
            <span className="inline">Theologica</span>
          </div>
        </div>

        {/* Center: Tabs (Desktop) */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-1.5 p-1.5 bg-surface rounded-xl ring-shadow">
          {['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-border-soft text-white shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              {tab === 'study' && <Layout size={16} />}
              {tab === 'canvas' && <Workflow size={16} />}
              {tab === 'devotional' && <BookOpen size={16} />}
              {tab === 'notes' && <Edit size={16} />}
              {tab === 'chats' && <Sparkles size={16} />}
              {tab === 'tracker' && <Target size={16} />}
              <span className="capitalize">{tab === 'chats' ? 'AI Chats' : tab}</span>
            </button>
          ))}
        </div>
        
        {/* Right: Settings & Clerk UserButton */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <button onClick={() => setIsSettingsOpen(true)} className="text-muted hover:text-fg transition-colors" title="Settings">
            <Settings size={20} />
          </button>
          <UserButton />
        </div>

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-bg w-full max-w-sm rounded-[24px] p-6 shadow-2xl ring-1 ring-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-fg">Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-muted hover:text-fg transition-colors">✕</button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-surface rounded-[16px] ring-1 ring-border">
                  <div>
                    <div className="text-[15px] font-medium text-fg">Appearance</div>
                    <div className="text-[13px] text-muted">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                  </div>
                  <button onClick={toggleTheme} className="w-12 h-6 rounded-full bg-border-soft relative transition-colors" style={{ backgroundColor: theme === 'light' ? 'var(--accent)' : 'var(--border-soft)' }}>
                    <div className="w-5 h-5 rounded-full bg-bg absolute top-0.5 transition-transform" style={{ transform: theme === 'light' ? 'translateX(26px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-surface rounded-[16px] ring-1 ring-border">
                  <div>
                    <div className="text-[15px] font-medium text-fg">Tracker Format</div>
                    <div className="text-[13px] text-muted">{trackerFormat === 'percent' ? 'Percentage (%)' : 'Fractions (1/10)'}</div>
                  </div>
                  <button onClick={toggleTrackerFormat} className="text-[13px] font-semibold bg-bg px-3 py-1.5 rounded-lg text-fg ring-1 ring-border hover:bg-surface-warm transition-colors">
                    Toggle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </header>
      
      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden flex relative">
        
        
        {/* MOBILE STUDY TAB (No Resizable Panels) */}
        {activeTab === 'study' && (
          <div className="lg:hidden flex w-full h-full">
            {/* Mobile Left Sidebar: Navigation */}
            <aside className={`w-full border-r border-border bg-bg flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden'}`}>
              <header className="h-[60px] border-b border-border flex items-center px-4 shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-2 text-fg-2 hover:text-fg">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-fg">Books</span>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-3 ml-2 mt-2">Old Testament</div>
                {OT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-fg-2 hover:bg-surface hover:text-fg cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={`text-xs min-h-[44px] py-2 rounded-md transition-colors ${isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-border-soft hover:text-fg'}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
                <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-3 ml-2 mt-6">New Testament</div>
                {NT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-fg-2 hover:bg-surface hover:text-fg cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={`text-xs min-h-[44px] py-2 rounded-md transition-colors ${isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-border-soft hover:text-fg'}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </aside>

            {/* Mobile Center: Bible Reader */}
            <section className={`flex-1 flex-col h-full bg-bg ${mobileStudyView === 'reader' ? 'flex' : 'hidden'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-4 bg-bg shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => setMobileStudyView('chapters')} className="p-2 text-fg-2 hover:text-fg">
                    <Layout size={20} />
                  </button>
                  <div className="font-display text-[18px] ml-1">{activeBook.name} {activeChapter}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileStudyView('ai')} className="p-2 text-fg-2 hover:text-fg relative" title="Study AI">
                    <Sparkles size={20} />
                    {chatQuotes.length > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {chatQuotes.length}
                      </span>
                    )}
                  </button>
                  <button onClick={toggleCompleted} className="flex items-center justify-center p-2 rounded-lg bg-surface text-fg">
                    <Check size={20} className={isCompleted ? "text-accent" : "text-meta"} /> 
                  </button>
                  <button onClick={toggleSpeech} className="flex items-center justify-center p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors" title="Read chapter aloud">
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <TranslationSelector 
                    currentTranslation={translation} 
                    onSelectTranslation={setTranslation} 
                  />
                </div>
              </header>

              <div className="bible-reader-content flex-1 overflow-y-auto custom-scroll p-6" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                <article className="max-w-3xl mx-auto">
                  <p className="font-serif text-[18px] leading-[1.8] text-fg whitespace-pre-wrap">
                    {isVersesLoading ? (
                      <span className="block space-y-3 py-4 animate-pulse">
                        <span className="block h-4 bg-fg/10 rounded w-full"></span>
                        <span className="block h-4 bg-fg/10 rounded w-11/12"></span>
                        <span className="block h-4 bg-fg/10 rounded w-4/5"></span>
                        <span className="block h-4 bg-fg/10 rounded w-full"></span>
                        <span className="block h-4 bg-fg/10 rounded w-3/4"></span>
                      </span>
                    ) : bibleVerses.length > 0 ? (
                      bibleVerses.map((v, index) => (
                        <span key={index} data-verse={v.verse} className={`transition-colors duration-200 ${currentSpeakingVerseIndex === index ? 'text-accent' : ''}`}>
                          <sup 
                            onClick={(e) => handleVerseNumberClick(v.verse, v.text, e)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVerseNumberClick(v.verse, v.text, e);
                            }}
                            className="verse-number-btn select-none text-muted hover:text-accent font-semibold text-[11px] mr-1.5 cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-surface"
                            title={`Reference ${activeBook.name} ${activeChapter}:${v.verse}`}
                          >
                            {v.verse}
                          </sup>
                          {renderVerseContent(v.verse, v.text)}{' '}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted">Loading chapter...</span>
                    )}
                  </p>
                </article>
              </div>
            </section>

            {/* Mobile Right Sidebar: Study AI */}
            <aside className={`w-full border-l border-border bg-bg flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden'}`}>
              <header className="h-[60px] border-b border-border flex items-center px-4 gap-2 text-[15px] font-medium text-fg shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-1 text-fg-2 hover:text-fg">
                  <ChevronLeft size={20} />
                </button>
                <Sparkles size={16} className="text-accent" /> Study AI
              </header>
              <div className="flex-1 flex flex-col h-[calc(100%-60px)]">
                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
                  {activeChat.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted p-4">
                      <Sparkles size={32} className="mb-3 opacity-20" />
                      <p className="text-sm">Ask a question about {activeBook.name} {activeChapter}</p>
                    </div>
                  ) : (
                    activeChat.messages.map((m, i) => (
                      <AiChatMessageView
                        key={i}
                        message={m}
                        index={i}
                        totalMessages={activeChat.messages.length}
                        onVerseClick={navigateToVerse}
                        onSendToCanvas={sendChatMessageToCanvas}
                        chatTitle={activeChat?.title}
                      />
                    ))
                  )}
                  {isAiTyping && (
                    <AiThinkingIndicator status={aiActivityStatus} />
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-bg shrink-0">
                  <div className="flex flex-col">
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
                    {chatImage && (
                      <div className="mb-2 relative self-start">
                        <img src={chatImage.preview} alt="preview" className="h-16 rounded-xl object-cover border border-border-soft" />
                        <button type="button" onClick={() => setChatImage(null)} className="absolute -top-1.5 -right-1.5 bg-surface border border-border-soft rounded-full p-0.5">
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    )}
                    <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5">
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={cooldown > 0 || !isOnline} 
                        className="flex-shrink-0 p-2 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1"
                        title="Attach image"
                      >
                        <Paperclip size={16} />
                      </button>
                      <TextareaAutosize 
                        minRows={1}
                        maxRows={5}
                        className="flex-1 bg-transparent text-fg pl-1 pr-10 py-2 text-[14px] placeholder:text-meta focus:outline-none resize-none" 
                        placeholder={!isOnline ? "Study AI is unavailable offline" : cooldown > 0 ? `Study AI is resting... (${cooldown}s)` : "Ask anything..."} 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        disabled={cooldown > 0 || !isOnline}
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && chatQuotes.length === 0) || cooldown > 0 || !isOnline}
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

        {/* DESKTOP STUDY TAB (With Resizable Panels) */}
        {activeTab === 'study' && (
          <div className="hidden lg:flex w-full h-full">
            <PanelGroup orientation="horizontal" id="theologica-layout-v2" className="flex w-full h-full">
            {/* Left Sidebar: Navigation */}
            {showLeftSidebar && (
              <Panel panelRef={leftPanelRef} defaultSize="15" minSize="15" className={`w-full lg:w-auto border-r border-border bg-bg flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden lg:flex'}`}>
              <header className="lg:hidden h-[60px] border-b border-border flex items-center px-4 shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-2 text-fg-2 hover:text-fg">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-fg">Books</span>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-3 ml-2 mt-2">Old Testament</div>
                {OT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-fg-2 hover:bg-surface hover:text-fg cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={`text-xs min-h-[44px] lg:min-h-0 py-2 lg:py-1.5 rounded-md transition-colors ${isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-border-soft hover:text-fg'}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
                <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-3 ml-2 mt-6">New Testament</div>
                {NT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-fg-2 hover:bg-surface hover:text-fg cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={`text-xs min-h-[44px] lg:min-h-0 py-2 lg:py-1.5 rounded-md transition-colors ${isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-border-soft hover:text-fg'}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>
              </Panel>
            )}

            {showLeftSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Center: Bible Reader */}
            <Panel defaultSize="60" minSize="30" className={`w-full lg:w-auto flex-col h-full bg-bg ${mobileStudyView === 'reader' ? 'flex' : 'hidden lg:flex'}`}>
              <PanelGroup orientation="vertical" id="theologica-layout-vertical-v2">
                <Panel defaultSize="75" minSize="30" className="flex flex-col relative">
                  <header className="h-[60px] border-b border-border flex items-center justify-between px-4 lg:px-6 bg-bg shrink-0">
                <div className="flex items-center gap-1 lg:gap-2">
                  <button onClick={() => setMobileStudyView('chapters')} className="lg:hidden p-2 text-fg-2 hover:text-fg">
                    <Layout size={20} />
                  </button>
                  <div className="font-display text-[18px] lg:text-[22px] ml-1">{activeBook.name} {activeChapter}</div>
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                  <button onClick={() => setMobileStudyView('ai')} className="lg:hidden p-2 text-fg-2 hover:text-fg">
                    <Sparkles size={20} />
                  </button>
                  <button onClick={toggleCompleted} className="hidden lg:flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-lg bg-surface text-fg hover:bg-border-soft ring-shadow ring-shadow-hover transition-all">
                    <Check size={16} className={isCompleted ? "text-accent" : "text-meta"} /> 
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </button>
                  <button onClick={toggleCompleted} className="lg:hidden flex items-center justify-center p-2 rounded-lg bg-surface text-fg">
                    <Check size={20} className={isCompleted ? "text-accent" : "text-meta"} /> 
                  </button>
                  <button onClick={toggleSpeech} className="flex items-center justify-center p-2 lg:p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface transition-colors" title="Read chapter aloud">
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="hidden lg:block h-6 w-px bg-surface"></div>
                  <TranslationSelector 
                    currentTranslation={translation} 
                    onSelectTranslation={setTranslation} 
                  />
                  <div className="hidden lg:flex items-center bg-surface rounded-lg p-0.5">
                    <button onClick={() => setShowLeftSidebar(!showLeftSidebar)} className={`p-1.5 rounded-md transition-colors ${showLeftSidebar ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'}`} title="Toggle Navigation">
                      {showLeftSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>
                    <button onClick={() => setShowBottomNotes(!showBottomNotes)} className={`p-1.5 rounded-md transition-colors ${showBottomNotes ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'}`} title="Toggle Notes">
                      {showBottomNotes ? <PanelBottomClose size={18} /> : <PanelBottomOpen size={18} />}
                    </button>
                    <button onClick={() => setShowRightSidebar(!showRightSidebar)} className={`p-1.5 rounded-md transition-colors ${showRightSidebar ? 'text-fg hover:bg-border-soft' : 'text-muted hover:text-fg'}`} title="Toggle Study AI">
                      {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                  </div>
                </div>
              </header>
              <div className="bible-reader-content flex-1 overflow-y-auto custom-scroll p-10 lg:p-16" onMouseUp={handleSelection} onTouchEnd={handleSelection} onContextMenu={handleReaderContextMenu}>
                <article className="max-w-3xl mx-auto">
                  <p className="font-serif text-[18px] leading-[1.8] text-fg whitespace-pre-wrap">
                    {isVersesLoading ? (
                      <span className="block space-y-4 py-4 animate-pulse">
                        <span className="block h-4 bg-fg/10 rounded w-full"></span>
                        <span className="block h-4 bg-fg/10 rounded w-11/12"></span>
                        <span className="block h-4 bg-fg/10 rounded w-4/5"></span>
                        <span className="block h-4 bg-fg/10 rounded w-full"></span>
                        <span className="block h-4 bg-fg/10 rounded w-3/4"></span>
                      </span>
                    ) : bibleVerses.length > 0 ? (
                      bibleVerses.map((v, index) => (
                        <span key={v.verse} data-verse={v.verse} className={`transition-colors duration-300 ${currentSpeakingVerseIndex === index ? 'text-accent' : ''}`}>
                          <sup 
                            onClick={(e) => handleVerseNumberClick(v.verse, v.text, e)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVerseNumberClick(v.verse, v.text, e);
                            }}
                            className={`verse-number-btn select-none text-[10px] font-sans font-semibold mr-1.5 cursor-pointer px-1 py-0.5 rounded hover:bg-surface hover:text-accent transition-colors ${currentSpeakingVerseIndex === index ? 'text-accent' : 'text-muted'}`}
                            title={`Reference ${activeBook.name} ${activeChapter}:${v.verse}`}
                          >
                            {v.verse}
                          </sup>
                          {renderVerseContent(v.verse, v.text)}
                        </span>
                      ))
                    ) : (
                      <span className="text-meta">Loading...</span>
                    )}
                  </p>
                </article>
              </div>
                </Panel>
                
                {showBottomNotes && (
                  <PanelResizeHandle className="h-1 bg-surface hover:bg-accent active:bg-accent transition-colors cursor-row-resize shrink-0 z-10 w-full" />
                )}

              {/* Quick Note Split */}
                {showBottomNotes && (
                <Panel panelRef={bottomPanelRef} defaultSize="25" minSize="20" className="hidden lg:flex border-t border-border bg-bg flex-col shrink-0">
                <div className="h-10 border-b border-border flex items-center px-6 text-[11px] font-bold text-muted uppercase tracking-widest">
                  Quick Note — {chapterTitle}
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
            </Panel>

            {showRightSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-accent active:bg-accent transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Right Sidebar: Study AI */}
            {showRightSidebar && (
              <Panel panelRef={rightPanelRef} defaultSize="25" minSize="20" className={`w-full lg:w-auto border-l border-border bg-bg flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden lg:flex'}`}>
              <header className="h-[60px] border-b border-border flex items-center px-4 lg:px-6 gap-2 text-[15px] font-medium text-fg shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="lg:hidden p-2 mr-1 text-fg-2 hover:text-fg">
                  <ChevronLeft size={20} />
                </button>
                <Sparkles size={16} className="hidden lg:block" /> Study AI
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6">
                {activeChat.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-meta text-sm">
                    <Sparkles size={16} />
                    <span className="mt-3">Ask Study AI a question</span>
                  </div>
                ) : (
                  activeChat.messages.map((m, i) => (
                    <AiChatMessageView
                      key={i}
                      message={m}
                      index={i}
                      totalMessages={activeChat.messages.length}
                      onVerseClick={navigateToVerse}
                      onSendToCanvas={sendChatMessageToCanvas}
                      chatTitle={activeChat?.title}
                    />
                  ))
                )}
                {isAiTyping && (
                  <AiThinkingIndicator status={aiActivityStatus} />
                )}
                <div ref={messagesEndRef} />
              </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-bg shrink-0">
                  <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      const base64 = dataUrl.split(',')[1];
                      setChatImage({ base64, mimeType: file.type, preview: dataUrl });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                  <div className="flex flex-col">
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
                    {chatImage && (
                      <div className="mb-2 relative self-start">
                        <img src={chatImage.preview} alt="preview" className="h-16 rounded-xl object-cover border border-border-soft" />
                        <button type="button" onClick={() => setChatImage(null)} className="absolute -top-1.5 -right-1.5 bg-surface border border-border-soft rounded-full p-0.5">
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    )}
                    <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-1.5">
                      <button 
                        type="button" 
                        onClick={() => imageFileRef.current?.click()} 
                        disabled={cooldown > 0 || !isOnline} 
                        className="flex-shrink-0 p-2 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1"
                        title="Attach image"
                      >
                        <Paperclip size={16} />
                      </button>
                      <TextareaAutosize 
                        minRows={1}
                        maxRows={6}
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        disabled={cooldown > 0 || !isOnline}
                        placeholder={!isOnline ? "Study AI is unavailable offline" : cooldown > 0 ? `Study AI is resting... (${cooldown}s)` : "Message Study AI..."}
                        className="flex-1 bg-transparent text-fg pl-1 pr-10 py-2 text-[14px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                      />
                      <button 
                        type="submit" 
                        disabled={isAiTyping || (!chatInput.trim() && !chatImage && chatQuotes.length === 0) || cooldown > 0 || !isOnline} 
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
            className={`floating-verse-toolbar fixed z-50 flex items-center gap-2 bg-surface border border-border-soft p-2 rounded-2xl shadow-2xl backdrop-blur-md transform -translate-x-1/2 max-w-[95vw] ${
              toolbarPosition.isBelow ? 'translate-y-2' : '-translate-y-full'
            }`}
            style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
          >
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('yellow')} 
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] rounded-full bg-yellow-500 hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer" 
              title="Highlight Yellow" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('green')} 
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] rounded-full bg-green-500 hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer" 
              title="Highlight Green" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('blue')} 
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] rounded-full bg-blue-500 hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer" 
              title="Highlight Blue" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('pink')} 
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] rounded-full bg-pink-500 hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer" 
              title="Highlight Pink" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => saveHighlight('purple')} 
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] rounded-full bg-purple-500 hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer" 
              title="Highlight Purple" 
            />
            <div className="w-[1px] h-6 bg-border-soft mx-0.5" />
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={askAiAboutHighlight} 
              className="flex items-center justify-center h-8 sm:h-9 px-3 rounded-xl bg-accent text-white hover:bg-[#d87654] active:scale-95 transition-all text-xs sm:text-sm font-semibold shadow-sm gap-1.5 cursor-pointer shrink-0"
              title="Ask AI about this verse"
            >
              <Sparkles size={15} /> <span>Ask AI</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={addHighlightToChat} 
              className="flex items-center justify-center h-8 sm:h-9 px-3 rounded-xl bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs sm:text-sm font-semibold shadow-sm gap-1.5 cursor-pointer shrink-0" 
              title="Add to Chat"
            >
              <MessageSquarePlus size={15} />
              <span>Quote</span>
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()} 
              onClick={addHighlightToCanvas} 
              className="flex items-center justify-center h-8 sm:h-9 px-3 rounded-xl bg-surface border border-border-soft text-fg hover:bg-border-soft active:scale-95 transition-all text-xs sm:text-sm font-semibold shadow-sm gap-1.5 cursor-pointer shrink-0" 
              title="Send to Canvas"
            >
              <Workflow size={15} />
              <span>Canvas</span>
            </button>
            {toolbarPosition.highlightId && (
              <>
                <div className="w-[1px] h-6 bg-border-soft mx-0.5" />
                <button 
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => deleteHighlight(toolbarPosition.highlightId!)} 
                  className="flex items-center justify-center h-8 sm:h-9 px-2.5 rounded-xl bg-surface border border-border-soft text-error hover:bg-error hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
                  title="Delete Highlight"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        )}

        {/* DEVOTIONAL TAB */}
        {activeTab === 'devotional' && (
          <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-10 bg-bg">
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
                <article className="border border-border/80 rounded-2xl p-6 sm:p-10 lg:p-14 shadow-lg bg-surface/25 backdrop-blur-sm ring-shadow w-full">
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
                                className={`font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg transition-colors ${
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
                              const t = devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText;
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

                      <div className="text-[18px] lg:text-[20px] leading-[2.0] text-fg font-serif mb-10 whitespace-pre-wrap selection:bg-accent/20">
                        {linkifyBibleReferences(
                          devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText,
                          navigateToVerse
                        )}
                      </div>

                      <footer className="text-muted text-sm font-medium italic border-t border-border/60 pt-5 flex items-center justify-between">
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
          <div className="flex w-full h-full">
            <aside className={`w-full lg:w-[280px] border-r border-border bg-bg flex-col shrink-0 ${activeChatId ? 'hidden lg:flex' : 'flex'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-5 shrink-0">
                <span className="text-[15px] font-medium text-fg">Conversations</span>
                <button onClick={handleNewChat} className="p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-lg transition-colors"><Plus size={16} /></button>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-1">
                {chats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveChatId(c.id)} 
                    className={`group flex items-center justify-between w-full px-4 py-3 rounded-lg text-[14px] transition-colors cursor-pointer ${activeChatId === c.id ? 'bg-surface text-fg ring-shadow' : 'text-muted hover:bg-surface hover:text-fg'}`}
                  >
                    <span className="truncate pr-2"><TypewriterTitle title={c.title} /></span>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameChat(c.id, c.title);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-fg-hover transition-colors"
                        title="Rename Conversation"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(c.id);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-accent transition-colors"
                        title="Delete Conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            
            <section className={`flex-1 flex-col bg-bg ${activeChatId ? 'flex' : 'hidden lg:flex'}`}>
              {activeChatId ? (
                <>
                  <header className="h-[60px] border-b border-border flex items-center px-4 lg:px-8 shrink-0">
                    <button onClick={() => setActiveChatId(null)} className="lg:hidden p-2 mr-2 text-fg-2 hover:text-fg">
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-[18px] font-medium">{activeChat.title}</h2>
                  </header>
                  <div className="flex-1 overflow-y-auto custom-scroll p-8 lg:p-12 space-y-8 flex flex-col">
                    {activeChat.messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-meta">
                        <Sparkles size={24} />
                        <p className="mt-4 text-[15px]">Start a new conversation with Study AI</p>
                      </div>
                    ) : (
                      activeChat.messages.map((m, i) => (
                        <AiChatMessageView
                          key={i}
                          message={m}
                          index={i}
                          totalMessages={activeChat.messages.length}
                          onVerseClick={navigateToVerse}
                          onSendToCanvas={sendChatMessageToCanvas}
                          chatTitle={activeChat?.title}
                          isFullView
                        />
                      ))
                    )}
                    {isAiTyping && (
                      <AiThinkingIndicator status={aiActivityStatus} isFullView />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-6 border-t border-border w-full shrink-0">
                    <div className="flex flex-col max-w-4xl mx-auto w-full">
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
                      {chatImage && (
                        <div className="mb-2 relative self-start">
                          <img src={chatImage.preview} alt="preview" className="h-20 rounded-xl object-cover border border-border-soft" />
                          <button type="button" onClick={() => setChatImage(null)} className="absolute -top-1.5 -right-1.5 bg-surface border border-border-soft rounded-full p-0.5">
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      )}
                      <div className="relative flex items-end bg-surface border border-border-soft/80 rounded-2xl shadow-md focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all p-2">
                        <button 
                          type="button" 
                          onClick={() => imageFileRef.current?.click()} 
                          disabled={cooldown > 0} 
                          className="flex-shrink-0 p-2.5 text-muted hover:text-fg disabled:opacity-40 transition-colors mr-1"
                          title="Attach image"
                        >
                          <Paperclip size={18} />
                        </button>
                        <TextareaAutosize 
                          minRows={1}
                          maxRows={6}
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          disabled={cooldown > 0}
                          placeholder={cooldown > 0 ? `Study AI is resting... (${cooldown}s remaining)` : "Message Study AI..."}
                          className="flex-1 bg-transparent text-fg pl-1 pr-14 py-2 text-[15px] focus:outline-none disabled:opacity-50 transition-all placeholder:text-meta resize-none"
                        />
                        <button 
                          type="submit" 
                          disabled={isAiTyping || (!chatInput.trim() && !chatImage && chatQuotes.length === 0) || cooldown > 0} 
                          className="absolute right-2.5 bottom-2.5 p-2.5 bg-accent hover:bg-[#b5583b] text-white rounded-xl disabled:opacity-40 disabled:hover:bg-accent transition-all shadow-sm cursor-pointer"
                          title="Send message"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-meta">
                  <Sparkles size={24} className="mb-4" />
                  <p className="text-[15px]">Select a conversation or create a new one.</p>
                </div>
              )}
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
            <div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16 bg-bg">
              <div className="max-w-5xl mx-auto">
                <header className="mb-12">
                  <h1 className="text-[40px] font-display text-fg mb-3">Reading Tracker</h1>
                  <p className="text-[16px] text-muted">Track your progress through all 66 books.</p>
                </header>

                <div className="bg-surface p-8 rounded-[20px] ring-shadow mb-16">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-[12px] font-bold tracking-widest text-muted uppercase mb-2">Overall Progress</div>
                      <div className="text-[32px] font-semibold text-fg leading-none">{progressPercent}%</div>
                    </div>
                    <div className="text-[15px] font-medium text-fg-2">{completedCount} / {totalChapters} Chapters</div>
                  </div>
                  <div className="h-3.5 w-full bg-bg rounded-full overflow-hidden inset-shadow">
                    <div className="h-full bg-accent transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* Old Testament Accordion */}
                <div className="mb-6">
                  <button 
                    onClick={() => toggleTestament('OT')}
                    className="w-full flex items-center justify-between text-left bg-surface p-5 rounded-[20px] ring-shadow hover:bg-surface-warm transition-colors"
                  >
                    <div className="text-[16px] font-bold tracking-widest text-fg uppercase">Old Testament</div>
                    
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
                          <div key={book.name} className="bg-[#1c1c1b] rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
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
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
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
                    className="w-full flex items-center justify-between text-left bg-surface p-5 rounded-[20px] ring-shadow hover:bg-surface-warm transition-colors"
                  >
                    <div className="text-[16px] font-bold tracking-widest text-fg uppercase">New Testament</div>
                    
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
                          <div key={book.name} className="bg-[#1c1c1b] rounded-[16px] overflow-hidden ring-1 ring-border">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
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
                                        className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
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
          <div className="flex w-full h-full">
            <aside className={`w-full lg:w-[280px] border-r border-border bg-bg flex-col shrink-0 ${activeNoteId ? 'hidden lg:flex' : 'flex'}`}>
              <header className="h-[60px] border-b border-border flex items-center justify-between px-5 shrink-0">
                <span className="text-[15px] font-medium text-fg">Notebooks</span>
                <button 
                  onClick={async () => {
                    const res = await fetchWithAuth(`${API_URL}/api/notes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: 'New Note', content: '' })
                    });
                    const newNote = await res.json();
                    setNotes([newNote, ...notes]);
                    setActiveNoteId(newNote.id);
                  }}
                  className="p-2 text-fg-2 hover:text-fg hover:bg-surface rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                {notes.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => setActiveNoteId(n.id)} 
                    className={`group flex items-center justify-between w-full px-4 py-3 rounded-lg text-[14px] transition-colors mb-1 cursor-pointer ${activeNoteId === n.id ? 'bg-surface text-fg ring-shadow' : 'text-muted hover:bg-surface hover:text-fg'}`}
                  >
                    <span className="truncate pr-2">{n.title || 'Untitled Note'}</span>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameNoteSidebar(n.id, n.title, n.content);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-fg-hover transition-colors"
                        title="Rename Note"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(n.id);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-meta hover:text-accent transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <section className={`flex-1 flex-col bg-bg ${activeNoteId ? 'flex' : 'hidden lg:flex'}`}>
              {activeNoteId ? (
                <>
                  <header className="h-[60px] border-b border-border flex items-center px-4 lg:px-8 shrink-0">
                    <button onClick={() => setActiveNoteId(null)} className="lg:hidden p-2 mr-2 text-fg-2 hover:text-fg">
                      <ChevronLeft size={20} />
                    </button>
                    <input 
                      type="text" 
                      value={activeNote.title} 
                      onChange={(e) => updateNote(activeNote.id, e.target.value, activeNote.content)}
                      className="bg-transparent text-[20px] font-medium text-fg focus:outline-none w-full" 
                      placeholder="Note Title..."
                    />
                  </header>
                  <textarea 
                    className="flex-1 bg-transparent p-8 lg:p-16 focus:outline-none resize-none text-[16px] leading-[1.8] text-fg custom-scroll" 
                    value={activeNote.content} 
                    onChange={(e) => updateNote(activeNote.id, activeNote.title, e.target.value)}
                    placeholder="Start typing your note here..."
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-meta">
                  <Edit size={24} className="mb-4" />
                  <p className="text-[15px]">Select a note or create a new one.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* CANVAS TAB */}
        <div className={`flex-1 w-full h-full relative overflow-hidden ${activeTab === 'canvas' ? 'flex flex-col' : 'hidden'}`}>
          <CanvasBoard
            theme={theme as 'dark' | 'light'}
            incomingNode={canvasIncomingNode}
            onIncomingNodeHandled={() => setCanvasIncomingNode(null)}
            isActiveTab={activeTab === 'canvas'}
            onNavigateToVerse={navigateToVerse}
          />
        </div>
      </main>
        {/* Mobile Bottom Navigation */}
        <div 
          className="lg:hidden shrink-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-bg border-t border-border flex items-center justify-around px-2 z-50 w-full"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {['study', 'canvas', 'devotional', 'notes', 'chats', 'tracker'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${activeTab === tab ? 'text-accent' : 'text-muted hover:text-fg'}`}
            >
              {tab === 'study' && <Layout size={20} className="mb-1" />}
              {tab === 'canvas' && <Workflow size={20} className="mb-1" />}
              {tab === 'devotional' && <BookOpen size={20} className="mb-1" />}
              {tab === 'notes' && <Edit size={20} className="mb-1" />}
              {tab === 'chats' && <Sparkles size={20} className="mb-1" />}
              {tab === 'tracker' && <Target size={20} className="mb-1" />}
              <span className="text-[10px] font-medium capitalize">{tab === 'chats' ? 'AI Chats' : tab}</span>
            </button>
          ))}
        </div>

        <PWAInstallPrompt />
      </div>
    </>
  );
}
