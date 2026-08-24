"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, WifiOff, BookOpen } from 'lucide-react';

// --- All 66 Books ---
const otStr = "Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,1 Samuel:31,2 Samuel:24,1 Kings:22,2 Kings:25,1 Chronicles:29,2 Chronicles:36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,Song of Solomon:8,Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4";
const ntStr = "Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,1 Corinthians:16,2 Corinthians:13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,1 Thessalonians:5,2 Thessalonians:3,1 Timothy:6,2 Timothy:4,Titus:3,Philemon:1,Hebrews:13,James:5,1 Peter:5,2 Peter:3,1 John:5,2 John:1,3 John:1,Jude:1,Revelation:22";

const OT_BOOKS = otStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const NT_BOOKS = ntStr.split(',').map(s => { const [n, c] = s.split(':'); return { name: n, chapters: parseInt(c) }; });
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

type Verse = {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
};

export default function OfflinePage() {
  const [activeBook, setActiveBook] = useState('Genesis');
  const [activeChapter, setActiveChapter] = useState(1);
  const [translation, setTranslation] = useState('kjv');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load saved state on mount
  useEffect(() => {
    const savedBook = localStorage.getItem('lastBook');
    const savedChapter = localStorage.getItem('lastChapter');
    const savedTrans = localStorage.getItem('lastTranslation');
    if (savedBook) setActiveBook(savedBook);
    if (savedChapter) setActiveChapter(parseInt(savedChapter, 10));
    if (savedTrans) setTranslation(savedTrans);
  }, []);

  // Fetch text
  useEffect(() => {
    async function fetchChapter() {
      setLoading(true);
      setError('');
      try {
        const url = `https://bible-api.com/${activeBook}+${activeChapter}?translation=${translation}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Chapter not available offline. Try reading a chapter you have previously loaded while online.');
        }
        const data = await res.json();
        setVerses(data.verses || []);
        
        // Save to local storage for when we come back online
        localStorage.setItem('lastBook', activeBook);
        localStorage.setItem('lastChapter', activeChapter.toString());
        localStorage.setItem('lastTranslation', translation);
      } catch (err: any) {
        setVerses([]);
        setError(err.message || 'Chapter not found in offline cache.');
      } finally {
        setLoading(false);
      }
    }
    fetchChapter();
  }, [activeBook, activeChapter, translation]);

  const currentBookData = ALL_BOOKS.find(b => b.name === activeBook);
  const maxChapters = currentBookData?.chapters || 1;

  const handlePrevChapter = () => {
    if (activeChapter > 1) {
      setActiveChapter(prev => prev - 1);
    }
  };

  const handleNextChapter = () => {
    if (activeChapter < maxChapters) {
      setActiveChapter(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a09] text-gray-200 font-inter flex flex-col items-center">
      
      {/* Offline Banner */}
      <div className="w-full bg-amber-600/10 border-b border-amber-500/20 py-2 px-4 flex items-center justify-center gap-2 text-amber-500 text-sm">
        <WifiOff size={16} />
        <span>You are currently offline. Notes, AI, and un-cached chapters are disabled.</span>
      </div>

      <div className="w-full max-w-3xl px-4 py-8 flex-1 flex flex-col">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#1a1a19] p-4 rounded-2xl border border-[#2a2a29] mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="text-amber-500" />
            <span className="font-semibold text-gray-100">Theologica Offline</span>
          </div>

          <div className="flex gap-2">
            <select
              value={activeBook}
              onChange={(e) => {
                setActiveBook(e.target.value);
                setActiveChapter(1);
              }}
              className="bg-[#0a0a09] border border-[#2a2a29] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
            >
              <optgroup label="Old Testament">
                {OT_BOOKS.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="New Testament">
                {NT_BOOKS.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
            </select>

            <select
              value={activeChapter}
              onChange={(e) => setActiveChapter(parseInt(e.target.value, 10))}
              className="bg-[#0a0a09] border border-[#2a2a29] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
            >
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(c => (
                <option key={c} value={c}>Ch. {c}</option>
              ))}
            </select>

            <select 
              value={translation} 
              onChange={(e) => setTranslation(e.target.value)}
              className="bg-[#0a0a09] border border-[#2a2a29] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="kjv">KJV</option>
              <option value="asv">ASV</option>
              <option value="web">WEB</option>
              <option value="bbe">BBE</option>
              <option value="darby">DARBY</option>
              <option value="dra">DRA</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#1a1a19]/50 rounded-3xl border border-[#2a2a29] p-6 sm:p-10">
          <h1 className="text-3xl font-merriweather text-amber-500 mb-8 text-center font-bold">
            {activeBook} {activeChapter}
          </h1>

          {loading ? (
            <div className="text-center text-gray-500 my-20 animate-pulse">Checking local cache...</div>
          ) : error ? (
            <div className="text-center text-red-400 my-20 bg-red-400/10 p-6 rounded-2xl border border-red-500/20 max-w-md mx-auto">
              <WifiOff className="mx-auto mb-4" size={32} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4 font-merriweather text-lg leading-relaxed text-gray-300">
              {verses.map(verse => (
                <div key={verse.verse} className="flex gap-4">
                  <span className="text-amber-600/50 text-sm mt-1.5 min-w-[1.5rem] font-sans font-medium">{verse.verse}</span>
                  <p>{verse.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrevChapter}
            disabled={activeChapter === 1}
            className="p-3 rounded-full bg-[#1a1a19] border border-[#2a2a29] text-gray-400 hover:text-amber-500 hover:border-amber-500 disabled:opacity-50 disabled:hover:text-gray-400 disabled:hover:border-[#2a2a29] transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={handleNextChapter}
            disabled={activeChapter === maxChapters}
            className="p-3 rounded-full bg-[#1a1a19] border border-[#2a2a29] text-gray-400 hover:text-amber-500 hover:border-amber-500 disabled:opacity-50 disabled:hover:text-gray-400 disabled:hover:border-[#2a2a29] transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>

      </div>
    </div>
  );
}
