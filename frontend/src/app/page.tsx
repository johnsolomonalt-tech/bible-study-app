const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Layout, Edit, Sparkles, Target, Check, ChevronRight, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- All 66 Books ---
const otStr = "Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,1 Samuel:31,2 Samuel:24,1 Kings:22,2 Kings:25,1 Chronicles:29,2 Chronicles:36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,Song of Solomon:8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4";
const ntStr = "Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,1 Corinthians:16,2 Corinthians:13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,1 Thessalonians:5,2 Thessalonians:3,1 Timothy:6,2 Timothy:4,Titus:3,Philemon:1,Hebrews:13,James:5,1 Peter:5,2 Peter:3,1 John:5,2 John:1,3 John:1,Jude:1,Revelation:22";

const OT_BOOKS = otStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const NT_BOOKS = ntStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });

export default function App() {
  const [activeTab, setActiveTab] = useState('study'); // study, notes, chats, tracker
  
  // Bible State
  const [activeBook, setActiveBook] = useState(OT_BOOKS[0]);
  const [activeChapter, setActiveChapter] = useState(1);
  const [translation, setTranslation] = useState("kjv");
  const [bibleVerses, setBibleVerses] = useState<{verse: number, text: string}[]>([]);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);

  // Notes State
  const [notes, setNotes] = useState<{id: number, title: string, content: string}[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Chats State
  const [chats, setChats] = useState<{id: number, title: string, messages: any[]}[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    fetch(`${API_URL}/api/notes`).then(r => r.json()).then(data => {
      setNotes(data);
      if (data.length > 0) setActiveNoteId(data[0].id);
    });
    fetch(`${API_URL}/api/chats`).then(r => r.json()).then(data => {
      setChats(data);
      setActiveChatId(null); // Fresh session on reload
    });
    fetch(`${API_URL}/api/tracker`).then(r => r.json()).then(data => {
      setCompletedChapters(data);
    });
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

  // Fetch live Bible text
  useEffect(() => {
    let isMounted = true;
    setBibleVerses([]);
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
    return () => { isMounted = false; };
  }, [activeBook, activeChapter, translation]);

  const updateNote = async (id: number, title: string, content: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
    await fetch(`${API_URL}/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
  };

  const handleNewChat = async () => {
    const res = await fetch(`${API_URL}/api/chats`, {
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
    await fetch(`${API_URL}/api/chats/${id}`, {
      method: 'DELETE'
    });
  };

  const handleDeleteNote = async (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    await fetch(`${API_URL}/api/notes/${id}`, {
      method: 'DELETE'
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || cooldown > 0) return;

    let targetChatId = activeChatId;

    // Create a new chat automatically if none exists
    if (!targetChatId) {
      const res = await fetch(`${API_URL}/api/chats`, {
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

    const res = await fetch(`${API_URL}/api/chats/${targetChatId}/messages`, {
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
    } else {
      if (isCreatingNote) return;
      setIsCreatingNote(true);
      
      const tempId = -Date.now();
      const optimisticNote = { id: tempId, title: chapterTitle, content: newContent };
      setNotes(prev => [optimisticNote, ...prev]);
      
      const res = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chapterTitle, content: newContent })
      });
      const newNote = await res.json();
      
      setNotes(prev => {
        const latestTemp = prev.find(n => n.id === tempId);
        const finalContent = latestTemp ? latestTemp.content : newContent;
        
        if (finalContent !== newContent) {
          fetch(`${API_URL}/api/notes/${newNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: chapterTitle, content: finalContent })
          });
        }
        return prev.map(n => n.id === tempId ? { ...newNote, content: finalContent } : n);
      });
      setIsCreatingNote(false);
    }
  };

  const isCompleted = completedChapters.includes(currentChapterId);
  const toggleCompleted = async () => {
    // Optimistic
    setCompletedChapters(prev => 
      isCompleted ? prev.filter(id => id !== currentChapterId) : [...prev, currentChapterId]
    );
    await fetch(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: currentChapterId })
    });
  };

  const toggleAnyChapter = async (id: string) => {
    const checked = completedChapters.includes(id);
    setCompletedChapters(prev => checked ? prev.filter(c => c !== id) : [...prev, id]);
    await fetch(`${API_URL}/api/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: id })
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#141413] text-[#faf9f5]">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#30302e] flex items-center justify-between px-6 bg-[#141413] z-10 shrink-0">
        <div className="font-display text-[22px] tracking-tight text-[#c96442] flex items-center gap-3">
          <img src="/logo.png" alt="Theologica Logo" className="w-8 h-8 object-contain drop-shadow-md" />
          Theologica
        </div>
        <div className="flex gap-1.5 p-1.5 bg-[#30302e] rounded-xl ring-shadow">
          {['study', 'notes', 'chats', 'tracker'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-[#4d4c48] text-white shadow-sm' : 'text-[#87867f] hover:text-[#faf9f5]'}`}
            >
              {tab === 'study' && <Layout size={16} />}
              {tab === 'notes' && <Edit size={16} />}
              {tab === 'chats' && <Sparkles size={16} />}
              {tab === 'tracker' && <Target size={16} />}
              <span className="capitalize">{tab === 'chats' ? 'AI Chats' : tab}</span>
            </button>
          ))}
        </div>
        <div className="w-[100px]"></div> {/* Spacer for center alignment */}
      </header>
      
      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden flex">
        
        {/* STUDY TAB */}
        {activeTab === 'study' && (
          <div className="flex w-full h-full">
            {/* Left Sidebar: Navigation */}
            <aside className="hidden md:flex flex-col w-[260px] border-r border-[#30302e] bg-[#141413]">
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
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); }}
                            className={`text-xs py-1.5 rounded-md transition-colors ${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}`}
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
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); }}
                            className={`text-xs py-1.5 rounded-md transition-colors ${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}`}
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

            {/* Center: Bible Reader */}
            <section className="flex-1 flex flex-col h-full bg-[#141413]">
              <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-6 bg-[#141413] shrink-0">
                <div className="font-display text-[22px]">{activeBook.name} {activeChapter}</div>
                <div className="flex items-center gap-4">
                  <button onClick={toggleCompleted} className="flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-lg bg-[#30302e] text-[#faf9f5] hover:bg-[#4d4c48] ring-shadow ring-shadow-hover transition-all">
                    <Check size={16} className={isCompleted ? "text-[#c96442]" : "text-[#5e5d59]"} /> 
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </button>
                  <div className="h-6 w-px bg-[#30302e]"></div>
                  <select value={translation} onChange={(e) => setTranslation(e.target.value)} className="bg-transparent text-sm font-medium text-[#b0aea5] hover:text-[#faf9f5] focus:outline-none cursor-pointer transition-colors">
                    <option value="kjv" className="bg-[#30302e]">KJV</option>
                    <option value="web" className="bg-[#30302e]">WEB</option>
                    <option value="bbe" className="bg-[#30302e]">BBE</option>
                  </select>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16">
                <article className="max-w-3xl mx-auto">
                  <p className="font-serif text-[18px] leading-[1.8] text-[#faf9f5] whitespace-pre-wrap">
                    {bibleVerses.length > 0 ? (
                      bibleVerses.map(v => (
                        <span key={v.verse}>
                          <sup className="text-[10px] font-sans font-semibold text-[#87867f] mr-1.5 opacity-80">{v.verse}</sup>
                          {v.text}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#5e5d59]">Loading...</span>
                    )}
                  </p>
                </article>
              </div>
              {/* Quick Note Split */}
              <div className="h-[220px] border-t border-[#30302e] bg-[#141413] flex flex-col shrink-0">
                <div className="h-10 border-b border-[#30302e] flex items-center px-6 text-[11px] font-bold text-[#87867f] uppercase tracking-widest">
                  Quick Note — {chapterTitle}
                </div>
                <textarea 
                  className="flex-1 bg-transparent p-6 focus:outline-none resize-none text-[15px] leading-relaxed text-[#faf9f5] custom-scroll" 
                  placeholder={`Take notes for ${chapterTitle}...`}
                  value={chapterNote ? chapterNote.content : ''}
                  onChange={handleQuickNoteChange}
                />
              </div>
            </section>

            {/* Right Sidebar: Study AI */}
            <aside className="hidden lg:flex flex-col w-[360px] border-l border-[#30302e] bg-[#141413]">
              <header className="h-[60px] border-b border-[#30302e] flex items-center px-6 gap-2 text-[15px] font-medium text-[#faf9f5] shrink-0">
                <Sparkles size={16} /> Study AI
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
                      <div className={`px-4 py-3 max-w-[90%] text-[14px] leading-relaxed ${
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
            </aside>
          </div>
        )}

        {/* AI CHATS TAB */}
        {activeTab === 'chats' && (
          <div className="flex w-full h-full">
            <aside className="w-[280px] border-r border-[#30302e] bg-[#141413] flex flex-col shrink-0">
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#5e5d59] hover:text-[#c96442] transition-colors shrink-0"
                      title="Delete Conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
            
            <section className="flex-1 flex flex-col bg-[#141413]">
              {activeChatId ? (
                <>
                  <header className="h-[60px] border-b border-[#30302e] flex items-center px-8 shrink-0">
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
                              className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
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
                              className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
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
            <aside className="w-[280px] border-r border-[#30302e] bg-[#141413] flex flex-col shrink-0">
              <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-5 shrink-0">
                <span className="text-[15px] font-medium text-[#faf9f5]">Notebooks</span>
                <button 
                  onClick={async () => {
                    const res = await fetch(`${API_URL}/api/notes`, {
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#5e5d59] hover:text-[#c96442] transition-colors shrink-0"
                      title="Delete Note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
            <section className="flex-1 flex flex-col bg-[#141413]">
              {activeNoteId ? (
                <>
                  <header className="h-[60px] border-b border-[#30302e] flex items-center px-8 shrink-0">
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
    </div>
  );
}
