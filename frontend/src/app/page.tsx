"use client";
const API_URL = '';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, UserButton, SignIn } from '@clerk/nextjs';
import { Send, Plus, Layout, Edit, Sparkles, Target, Check, ChevronRight, ChevronLeft, Trash2, Volume2, VolumeX, Sun, Moon, BookOpen, GripVertical, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDevotionalForDay, DevotionalEntry } from '../lib/devotionals';
import PWAInstallPrompt from './PWAInstallPrompt';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';

// --- All 66 Books ---
const otStr = "Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,1 Samuel:31,2 Samuel:24,1 Kings:22,2 Kings:25,1 Chronicles:29,2 Chronicles:36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,Song of Solomon:8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4";
const ntStr = "Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,1 Corinthians:16,2 Corinthians:13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,1 Thessalonians:5,2 Thessalonians:3,1 Timothy:6,2 Timothy:4,Titus:3,Philemon:1,Hebrews:13,James:5,1 Peter:5,2 Peter:3,1 John:5,2 John:1,3 John:1,Jude:1,Revelation:22";

const OT_BOOKS = otStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const NT_BOOKS = ntStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });

export default function App() {
  const { getToken } = useAuth();
  
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
  const [activeTab, setActiveTab] = useState('study'); // study, notes, chats, tracker, devotional
  
  // Devotional State
  const [displayDay, setDisplayDay] = useState(1);
  const [totalDays, setTotalDays] = useState(365);
  const [devotionalTime, setDevotionalTime] = useState<'morning' | 'evening'>('morning');
  const [devotionalEntry, setDevotionalEntry] = useState<DevotionalEntry | null>(null);
  const [isDevoSpeaking, setIsDevoSpeaking] = useState(false);
  const isDevoSpeakingRef = useRef(false);

  // Bible State
  const [activeBook, setActiveBook] = useState(OT_BOOKS[0]);
  const [activeChapter, setActiveChapter] = useState(1);
  const [translation, setTranslation] = useState("kjv");
  const [bibleVerses, setBibleVerses] = useState<{verse: number, text: string}[]>([]);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [mobileStudyView, setMobileStudyView] = useState<'reader' | 'chapters' | 'ai'>('reader');
  
  // Layout State
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
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
  const [chatInput, setChatInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/notes`).then(r => r.json()).then(data => {
      setNotes(data);
      if (data.length > 0) setActiveNoteId(data[0].id);
    });
    fetchWithAuth(`${API_URL}/api/chats`).then(r => r.json()).then(data => {
      setChats(data);
      setActiveChatId(null); // Fresh session on reload
    });
    fetchWithAuth(`${API_URL}/api/tracker`).then(r => r.json()).then(data => {
      setCompletedChapters(data.map((item: {chapterId: string}) => item.chapterId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId) || { id: 0, title: 'No Note Selected', content: '' };
  const activeChat = chats.find(c => c.id === activeChatId) || { id: 0, title: 'No Conversation Selected', messages: [] };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const parent = messagesEndRef.current.parentElement;
      if (parent) parent.scrollTop = parent.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, activeTab]);

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
    
    // eslint-disable-next-line
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

  // Fetch Verses on Chapter Change
  useEffect(() => {
    let isMounted = true;
    fetch(`https://bible-api.com/${activeBook.name.toLowerCase().replace(/ /g, '')}+${activeChapter}?translation=${translation}`)
      .then(r => r.json())
      .then(data => {
        if (isMounted) {
          if (data.verses && data.verses.length > 0) {
            setBibleVerses(data.verses);
          } else {
            setBibleVerses([{verse: 1, text: data.text || "Chapter not found in this translation."}]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setBibleVerses([{verse: 1, text: "Error loading text from bible-api.com."}]);
      });
      
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


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || cooldown > 0) return;

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
      
      const newMsg = { role: 'user', content: chatInput.trim() };
      const chatWithOptimisticMsg = { ...newChat, messages: [newMsg] };
      
      setChats(prev => [chatWithOptimisticMsg, ...prev]);
      setActiveChatId(newChat.id);
    } else {
      const newMsg = { role: 'user', content: chatInput.trim() };
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages, newMsg] };
        }
        return c;
      }));
    }
    
    const currentInput = chatInput;
    setChatInput('');
    setCooldown(30); // 30s cooldown
    setIsAiTyping(true);

    const res = await fetchWithAuth(`${API_URL}/api/chats/${targetChatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: currentInput })
    });
    
    if (res.ok) {
      const data = await res.json();
      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, messages: [...c.messages.slice(0, -1), data.userMessage, data.aiMessage] };
        }
        return c;
      }));
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
    
    setIsAiTyping(false);
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
  
  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#141413] text-white">Loading...</div>;
  
  if (!userId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#141413]">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <>
        <div className="h-full flex flex-col bg-[#141413] text-[#faf9f5]">
      {/* Top Navbar */}
      <header className="relative h-14 border-b border-[#30302e] flex items-center justify-between px-6 bg-[#141413] z-10 shrink-0">
        
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <div className="font-display text-[22px] tracking-tight text-[#c96442] flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="Theologica Logo" className="w-8 h-8 object-contain drop-shadow-md rounded-md" />
            <span className="inline">Theologica</span>
          </div>
        </div>

        {/* Center: Tabs (Desktop) */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-1.5 p-1.5 bg-[#30302e] rounded-xl ring-shadow">
          {['study', 'devotional', 'notes', 'chats', 'tracker'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-[#4d4c48] text-white shadow-sm' : 'text-[#87867f] hover:text-[#faf9f5]'}`}
            >
              {tab === 'study' && <Layout size={16} />}
              {tab === 'devotional' && <BookOpen size={16} />}
              {tab === 'notes' && <Edit size={16} />}
              {tab === 'chats' && <Sparkles size={16} />}
              {tab === 'tracker' && <Target size={16} />}
              <span className="capitalize">{tab === 'chats' ? 'AI Chats' : tab}</span>
            </button>
          ))}
        </div>
        
        {/* Right: Clerk UserButton */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <UserButton />
        </div>
        
      </header>
      
      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden flex relative">
        
        {/* STUDY TAB */}
        {activeTab === 'study' && (
          <PanelGroup orientation="horizontal" id="theologica-layout" className="flex w-full h-full">
            {/* Left Sidebar: Navigation */}
            {showLeftSidebar && (
              <Panel defaultSize={20} minSize={20} className={`w-full lg:w-auto border-r border-[#30302e] bg-[#141413] flex-col ${mobileStudyView === 'chapters' ? 'flex' : 'hidden lg:flex'}`}>
              <header className="lg:hidden h-[60px] border-b border-[#30302e] flex items-center px-4 shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-2 text-[#b0aea5] hover:text-[#faf9f5]">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-[#faf9f5]">Books</span>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                <div className="text-[11px] font-bold tracking-widest text-[#87867f] uppercase mb-3 ml-2 mt-2">Old Testament</div>
                {OT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#b0aea5] hover:bg-[#30302e] hover:text-[#faf9f5] cursor-pointer list-none flex justify-between items-center transition-colors">
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
                            className={`text-xs min-h-[44px] lg:min-h-0 py-2 lg:py-1.5 rounded-md transition-colors ${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
                <div className="text-[11px] font-bold tracking-widest text-[#87867f] uppercase mb-3 ml-2 mt-6">New Testament</div>
                {NT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#b0aea5] hover:bg-[#30302e] hover:text-[#faf9f5] cursor-pointer list-none flex justify-between items-center transition-colors">
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
                            className={`text-xs min-h-[44px] lg:min-h-0 py-2 lg:py-1.5 rounded-md transition-colors ${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}`}
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
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Center: Bible Reader */}
            <Panel defaultSize={57} minSize={15} className={`w-full lg:w-auto flex-col h-full bg-[#141413] ${mobileStudyView === 'reader' ? 'flex' : 'hidden lg:flex'}`}>
              <PanelGroup orientation="vertical">
                <Panel defaultSize={75} minSize={20} className="flex flex-col relative">
                  <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-4 lg:px-6 bg-[#141413] shrink-0">
                <div className="flex items-center gap-1 lg:gap-2">
                  <button onClick={() => setMobileStudyView('chapters')} className="lg:hidden p-2 text-[#b0aea5] hover:text-[#faf9f5]">
                    <Layout size={20} />
                  </button>
                  <div className="font-display text-[18px] lg:text-[22px] ml-1">{activeBook.name} {activeChapter}</div>
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                  <button onClick={() => setMobileStudyView('ai')} className="lg:hidden p-2 text-[#b0aea5] hover:text-[#faf9f5]">
                    <Sparkles size={20} />
                  </button>
                  <button onClick={toggleCompleted} className="hidden lg:flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[#30302e] text-[#faf9f5] hover:bg-[#4d4c48] ring-shadow ring-shadow-hover transition-all">
                    <Check size={16} className={isCompleted ? "text-[#c96442]" : "text-[#5e5d59]"} /> 
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </button>
                  <button onClick={toggleCompleted} className="lg:hidden flex items-center justify-center p-2 rounded-lg bg-[#30302e] text-[#faf9f5]">
                    <Check size={20} className={isCompleted ? "text-[#c96442]" : "text-[#5e5d59]"} /> 
                  </button>
                  <button onClick={toggleSpeech} className="flex items-center justify-center p-2 lg:p-2 rounded-lg text-[#b0aea5] hover:text-[#faf9f5] hover:bg-[#30302e] transition-colors" title="Read chapter aloud">
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="hidden lg:block h-6 w-px bg-[#30302e]"></div>
                  <select value={translation} onChange={(e) => setTranslation(e.target.value)} className="bg-transparent text-sm font-medium text-[#b0aea5] hover:text-[#faf9f5] focus:outline-none cursor-pointer transition-colors max-w-[60px] lg:max-w-none mr-2">
                    <option value="kjv" className="bg-[#30302e]">KJV</option>
                    <option value="web" className="bg-[#30302e]">WEB</option>
                    <option value="bbe" className="bg-[#30302e]">BBE</option>
                  </select>
                  <div className="hidden lg:flex items-center bg-[#30302e] rounded-lg p-0.5">
                    <button onClick={() => setShowLeftSidebar(!showLeftSidebar)} className={`p-1.5 rounded-md transition-colors ${showLeftSidebar ? 'text-[#faf9f5] hover:bg-[#4d4c48]' : 'text-[#87867f] hover:text-[#faf9f5]'}`} title="Toggle Navigation">
                      {showLeftSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>
                    <button onClick={() => setShowBottomNotes(!showBottomNotes)} className={`p-1.5 rounded-md transition-colors ${showBottomNotes ? 'text-[#faf9f5] hover:bg-[#4d4c48]' : 'text-[#87867f] hover:text-[#faf9f5]'}`} title="Toggle Notes">
                      {showBottomNotes ? <PanelBottomClose size={18} /> : <PanelBottomOpen size={18} />}
                    </button>
                    <button onClick={() => setShowRightSidebar(!showRightSidebar)} className={`p-1.5 rounded-md transition-colors ${showRightSidebar ? 'text-[#faf9f5] hover:bg-[#4d4c48]' : 'text-[#87867f] hover:text-[#faf9f5]'}`} title="Toggle Study AI">
                      {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16">
                <article className="max-w-3xl mx-auto">
                  <p className="font-serif text-[18px] leading-[1.8] text-[#faf9f5] whitespace-pre-wrap">
                    {bibleVerses.length > 0 ? (
                      bibleVerses.map((v, index) => (
                        <span key={v.verse} className={`transition-colors duration-300 ${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : ''}`}>
                          <sup className={`text-[10px] font-sans font-semibold mr-1.5 opacity-80 ${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : 'text-[#87867f]'}`}>{v.verse}</sup>
                          {v.text}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#5e5d59]">Loading...</span>
                    )}
                  </p>
                </article>
              </div>
                </Panel>
                
                {showBottomNotes && (
                  <PanelResizeHandle className="h-1 bg-[#30302e] hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-row-resize shrink-0 z-10 w-full" />
                )}

              {/* Quick Note Split */}
                {showBottomNotes && (
                  <Panel defaultSize={25} minSize={20} className="border-t border-[#30302e] bg-[#141413] flex flex-col shrink-0">
                <div className="h-10 border-b border-[#30302e] flex items-center px-6 text-[11px] font-bold text-[#87867f] uppercase tracking-widest">
                  Quick Note — {chapterTitle}
                </div>
                <textarea 
                  className="flex-1 bg-transparent p-6 focus:outline-none resize-none text-[15px] leading-relaxed text-[#faf9f5] custom-scroll" 
                  placeholder={`Take notes for ${chapterTitle}...`}
                  value={chapterNote ? chapterNote.content : ''}
                  onChange={handleQuickNoteChange}
                />
                </Panel>
                )}
              </PanelGroup>
            </Panel>

            {showRightSidebar && (
              <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative" />
            )}

            {/* Right Sidebar: Study AI */}
            {showRightSidebar && (
              <Panel defaultSize={25} minSize={25} className={`w-full lg:w-auto border-l border-[#30302e] bg-[#141413] flex-col ${mobileStudyView === 'ai' ? 'flex' : 'hidden lg:flex'}`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center px-4 lg:px-6 gap-2 text-[15px] font-medium text-[#faf9f5] shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="lg:hidden p-2 mr-1 text-[#b0aea5] hover:text-[#faf9f5]">
                  <ChevronLeft size={20} />
                </button>
                <Sparkles size={16} className="hidden lg:block" /> Study AI
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6">
                {activeChat.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#5e5d59] text-sm">
                    <Sparkles size={16} />
                    <span className="mt-3">Ask Study AI a question</span>
                  </div>
                ) : (
                  activeChat.messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {m.role === 'model' && <span className="text-[11px] text-[#87867f] mb-1.5 ml-1 font-semibold tracking-wide uppercase">Study AI</span>}
                      <div className={`px-4 py-3 max-w-[95%] sm:max-w-[90%] text-[14px] leading-relaxed overflow-x-auto break-words ${
                        m.role === 'user' 
                        ? 'bg-[#c96442] text-white rounded-2xl rounded-br-sm shadow-sm' 
                        : 'bg-[#30302e] text-[#faf9f5] rounded-2xl rounded-bl-sm ring-1 ring-[#4d4c48] shadow-sm markdown-body'
                      }`}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isAiTyping && (
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] text-[#87867f] mb-1.5 ml-1 font-semibold tracking-wide uppercase">Study AI</span>
                    <div className="px-4 py-3 max-w-[90%] text-[14px] leading-relaxed bg-[#30302e] text-[#faf9f5] rounded-2xl rounded-bl-sm ring-1 ring-[#4d4c48] shadow-sm flex gap-1.5 items-center h-[46px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-[#30302e] bg-[#141413] shrink-0">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    disabled={cooldown > 0}
                    placeholder={cooldown > 0 ? `Study AI is resting... (${cooldown}s)` : "Message Study AI..."}
                    className="w-full bg-[#30302e] text-[#faf9f5] rounded-full pl-5 pr-12 py-3 text-[14px] focus:outline-none focus:ring-[3px] focus:ring-[rgba(56,152,236,0.3)] disabled:opacity-50 transition-all placeholder:text-[#5e5d59]"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || cooldown > 0} 
                    className="absolute right-1.5 top-1.5 p-2 bg-[#c96442] hover:bg-[#b5583b] text-white rounded-full disabled:opacity-50 disabled:hover:bg-[#c96442] transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </Panel>
            )}
          </PanelGroup>
        )}

        {/* DEVOTIONAL TAB */}
        {activeTab === 'devotional' && (
          <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scroll p-4 lg:p-8 bg-[#141413]">
            <div className="w-full max-w-2xl bg-[#141413]">
              {/* Toggle switch */}
              <div className="flex justify-center mb-8 shrink-0">
                <div className="flex p-1 bg-[#30302e] rounded-full ring-shadow">
                  <button 
                    onClick={() => setDevotionalTime('morning')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${devotionalTime === 'morning' ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:text-[#faf9f5]'}`}
                  >
                    <Sun size={16} /> Morning
                  </button>
                  <button 
                    onClick={() => setDevotionalTime('evening')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${devotionalTime === 'evening' ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:text-[#faf9f5]'}`}
                  >
                    <Moon size={16} /> Evening
                  </button>
                </div>
              </div>

              {/* Devotional Card */}
              {devotionalEntry && (
                <article className="border border-[#30302e] rounded-2xl p-6 lg:p-10 shadow-sm bg-[#141413] ring-shadow overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={devotionalTime}
                      initial={{ x: devotionalTime === 'morning' ? -100 : 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: devotionalTime === 'morning' ? -100 : 100, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      <header className="flex justify-between items-start mb-6">
                        <div>
                          <h2 className="text-[#c96442] font-display text-2xl lg:text-3xl mb-2">
                            {devotionalTime === 'morning' ? devotionalEntry.morningVerse : devotionalEntry.eveningVerse}
                          </h2>
                          <p className="text-[#87867f] text-sm uppercase tracking-widest font-bold">
                            Day {displayDay} of {totalDays}
                          </p>
                        </div>
                        <button 
                          onClick={toggleDevoSpeech}
                          className="p-3 bg-[#30302e] text-[#faf9f5] rounded-full hover:bg-[#4d4c48] transition-colors shrink-0 ring-shadow"
                        >
                          {isDevoSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                      </header>
                      
                      <div className="w-full h-px bg-[#30302e] mb-8" />
                      
                      <div className="text-[17px] leading-[1.8] text-[#faf9f5] font-serif mb-10 whitespace-pre-wrap">
                        {devotionalTime === 'morning' ? devotionalEntry.morningText : devotionalEntry.eveningText}
                      </div>
                      
                      <footer className="text-[#87867f] text-sm italic border-t border-[#30302e] pt-4">
                        {devotionalEntry.citation}
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
            <aside className={`w-full lg:w-[280px] border-r border-[#30302e] bg-[#141413] flex-col shrink-0 ${activeChatId ? 'hidden lg:flex' : 'flex'}`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-5 shrink-0">
                <span className="text-[15px] font-medium text-[#faf9f5]">Conversations</span>
                <button onClick={handleNewChat} className="p-2 text-[#b0aea5] hover:text-[#faf9f5] hover:bg-[#30302e] rounded-lg transition-colors"><Plus size={16} /></button>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-1">
                {chats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveChatId(c.id)} 
                    className={`group flex items-center justify-between w-full px-4 py-3 rounded-lg text-[14px] transition-colors cursor-pointer ${activeChatId === c.id ? 'bg-[#30302e] text-[#faf9f5] ring-shadow' : 'text-[#87867f] hover:bg-[#30302e] hover:text-[#faf9f5]'}`}
                  >
                    <span className="truncate pr-2">{c.title}</span>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameChat(c.id, c.title);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-[#5e5d59] hover:text-[#e4e1cf] transition-colors"
                        title="Rename Conversation"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(c.id);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-[#5e5d59] hover:text-[#c96442] transition-colors"
                        title="Delete Conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            
            <section className={`flex-1 flex-col bg-[#141413] ${activeChatId ? 'flex' : 'hidden lg:flex'}`}>
              {activeChatId ? (
                <>
                  <header className="h-[60px] border-b border-[#30302e] flex items-center px-4 lg:px-8 shrink-0">
                    <button onClick={() => setActiveChatId(null)} className="lg:hidden p-2 mr-2 text-[#b0aea5] hover:text-[#faf9f5]">
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-[18px] font-medium">{activeChat.title}</h2>
                  </header>
                  <div className="flex-1 overflow-y-auto custom-scroll p-8 lg:p-12 space-y-8 flex flex-col">
                    {activeChat.messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#5e5d59]">
                        <Sparkles size={24} />
                        <p className="mt-4 text-[15px]">Start a new conversation with Study AI</p>
                      </div>
                    ) : (
                      activeChat.messages.map((m, i) => (
                        <div key={i} className={`flex flex-col max-w-3xl w-full mx-auto ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                          {m.role === 'model' && <span className="text-[11px] text-[#87867f] mb-2 ml-1 font-semibold tracking-wide uppercase">Study AI</span>}
                          <div className={`px-5 py-4 text-[15px] leading-[1.7] ${
                            m.role === 'user' 
                            ? 'bg-[#c96442] text-white rounded-[20px] rounded-br-sm shadow-sm' 
                            : 'bg-[#30302e] text-[#faf9f5] rounded-[20px] rounded-bl-sm ring-1 ring-[#4d4c48] shadow-sm markdown-body'
                          }`}>
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                    {isAiTyping && (
                      <div className="flex flex-col max-w-3xl w-full mx-auto items-start">
                        <span className="text-[11px] text-[#87867f] mb-2 ml-1 font-semibold tracking-wide uppercase">Study AI</span>
                        <div className="px-5 py-4 text-[15px] leading-[1.7] bg-[#30302e] text-[#faf9f5] rounded-[20px] rounded-bl-sm ring-1 ring-[#4d4c48] shadow-sm flex gap-1.5 items-center h-[58px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#87867f] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-6 border-t border-[#30302e] w-full shrink-0">
                    <div className="relative max-w-4xl mx-auto">
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        disabled={cooldown > 0}
                        placeholder={cooldown > 0 ? `Study AI is resting... (${cooldown}s remaining)` : "Message Study AI..."}
                        className="w-full bg-[#30302e] text-[#faf9f5] rounded-full pl-6 pr-14 py-4 text-[15px] focus:outline-none focus:ring-[3px] focus:ring-[rgba(56,152,236,0.3)] disabled:opacity-50 transition-all placeholder:text-[#5e5d59]"
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || cooldown > 0} 
                        className="absolute right-2 top-2 p-2.5 bg-[#c96442] hover:bg-[#b5583b] text-white rounded-full disabled:opacity-50 disabled:hover:bg-[#c96442] transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5e5d59]">
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

          return (
            <div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16 bg-[#141413]">
              <div className="max-w-5xl mx-auto">
                <header className="mb-12">
                  <h1 className="text-[40px] font-display text-[#faf9f5] mb-3">Reading Tracker</h1>
                  <p className="text-[16px] text-[#87867f]">Track your progress through all 66 books.</p>
                </header>

                <div className="bg-[#30302e] p-8 rounded-[20px] ring-shadow mb-16">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-[12px] font-bold tracking-widest text-[#87867f] uppercase mb-2">Overall Progress</div>
                      <div className="text-[32px] font-semibold text-[#faf9f5] leading-none">{progressPercent}%</div>
                    </div>
                    <div className="text-[15px] font-medium text-[#b0aea5]">{completedCount} / {totalChapters} Chapters</div>
                  </div>
                  <div className="h-3.5 w-full bg-[#141413] rounded-full overflow-hidden inset-shadow">
                    <div className="h-full bg-[#c96442] transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="text-[13px] font-bold tracking-widest text-[#87867f] uppercase mb-6 ml-2">Old Testament</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
                  {OT_BOOKS.map(book => (
                    <div key={book.name} className="bg-[#30302e] p-6 rounded-[20px] ring-shadow">
                      <h3 className="font-medium text-[16px] text-[#faf9f5] mb-5">{book.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: book.chapters }).map((_, i) => {
                          const id = `${book.name}-${i + 1}`;
                          const isChecked = completedChapters.includes(id);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleAnyChapter(id)}
                              className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                                isChecked 
                                  ? 'bg-[#c96442] text-white shadow-sm' 
                                  : 'bg-[#141413] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                              }`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[13px] font-bold tracking-widest text-[#87867f] uppercase mb-6 ml-2">New Testament</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
                  {NT_BOOKS.map(book => (
                    <div key={book.name} className="bg-[#30302e] p-6 rounded-[20px] ring-shadow">
                      <h3 className="font-medium text-[16px] text-[#faf9f5] mb-5">{book.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: book.chapters }).map((_, i) => {
                          const id = `${book.name}-${i + 1}`;
                          const isChecked = completedChapters.includes(id);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleAnyChapter(id)}
                              className={`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                                isChecked 
                                  ? 'bg-[#c96442] text-white shadow-sm' 
                                  : 'bg-[#141413] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                              }`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="flex w-full h-full">
            <aside className={`w-full lg:w-[280px] border-r border-[#30302e] bg-[#141413] flex-col shrink-0 ${activeNoteId ? 'hidden lg:flex' : 'flex'}`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-5 shrink-0">
                <span className="text-[15px] font-medium text-[#faf9f5]">Notebooks</span>
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
                  className="p-2 text-[#b0aea5] hover:text-[#faf9f5] hover:bg-[#30302e] rounded-lg transition-colors"
                >
                  <Plus size={16} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                {notes.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => setActiveNoteId(n.id)} 
                    className={`group flex items-center justify-between w-full px-4 py-3 rounded-lg text-[14px] transition-colors mb-1 cursor-pointer ${activeNoteId === n.id ? 'bg-[#30302e] text-[#faf9f5] ring-shadow' : 'text-[#87867f] hover:bg-[#30302e] hover:text-[#faf9f5]'}`}
                  >
                    <span className="truncate pr-2">{n.title || 'Untitled Note'}</span>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameNoteSidebar(n.id, n.title, n.content);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-[#5e5d59] hover:text-[#e4e1cf] transition-colors"
                        title="Rename Note"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(n.id);
                        }}
                        className="p-2 lg:p-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 text-[#5e5d59] hover:text-[#c96442] transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <section className={`flex-1 flex-col bg-[#141413] ${activeNoteId ? 'flex' : 'hidden lg:flex'}`}>
              {activeNoteId ? (
                <>
                  <header className="h-[60px] border-b border-[#30302e] flex items-center px-4 lg:px-8 shrink-0">
                    <button onClick={() => setActiveNoteId(null)} className="lg:hidden p-2 mr-2 text-[#b0aea5] hover:text-[#faf9f5]">
                      <ChevronLeft size={20} />
                    </button>
                    <input 
                      type="text" 
                      value={activeNote.title} 
                      onChange={(e) => updateNote(activeNote.id, e.target.value, activeNote.content)}
                      className="bg-transparent text-[20px] font-medium text-[#faf9f5] focus:outline-none w-full" 
                      placeholder="Note Title..."
                    />
                  </header>
                  <textarea 
                    className="flex-1 bg-transparent p-8 lg:p-16 focus:outline-none resize-none text-[16px] leading-[1.8] text-[#faf9f5] custom-scroll" 
                    value={activeNote.content} 
                    onChange={(e) => updateNote(activeNote.id, activeNote.title, e.target.value)}
                    placeholder="Start typing your note here..."
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5e5d59]">
                  <Edit size={24} className="mb-4" />
                  <p className="text-[15px]">Select a note or create a new one.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
        {/* Mobile Bottom Navigation */}
        <div 
          className="lg:hidden shrink-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-[#141413] border-t border-[#30302e] flex items-center justify-around px-2 z-50 w-full"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {['study', 'devotional', 'notes', 'chats', 'tracker'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${activeTab === tab ? 'text-[#c96442]' : 'text-[#87867f] hover:text-[#faf9f5]'}`}
            >
              {tab === 'study' && <Layout size={20} className="mb-1" />}
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
