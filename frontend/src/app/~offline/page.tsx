"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, WifiOff, BookOpen } from 'lucide-react';
import { getPassage } from '@/lib/bibleProvider';
import { BibleVerse } from '@/types/bible';
import { getPreference, setPreference, PREF_KEYS } from '@/lib/appPreferences';
import { parseVerseFootnote } from '@/lib/verseParser';
import { OT_BOOKS, NT_BOOKS, ALL_BOOKS } from '@/lib/bibleCanon';

const OFFLINE_TRANSLATIONS = ['bsb', 'web', 'kjv'];

export default function OfflinePage() {
  const [activeBook, setActiveBook] = useState('Genesis');
  const [activeChapter, setActiveChapter] = useState(1);
  const [translation, setTranslation] = useState('bsb');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load saved state on mount
  useEffect(() => {
    const savedBook = getPreference(PREF_KEYS.LAST_BOOK, 'Genesis');
    const savedChapter = getPreference(PREF_KEYS.LAST_CHAPTER, '1');
    const savedTrans = getPreference(PREF_KEYS.BIBLE_VERSION, 'bsb')?.toLowerCase() || 'bsb';
    if (savedBook) setActiveBook(savedBook);
    if (savedChapter) setActiveChapter(parseInt(savedChapter, 10));
    setTranslation(OFFLINE_TRANSLATIONS.includes(savedTrans) ? savedTrans : 'bsb');
  }, []);

  // Fetch text using unified engine
  useEffect(() => {
    let isCancelled = false;
    async function fetchChapter() {
      setLoading(true);
      setError('');
      try {
        const { chapter } = await getPassage(translation, activeBook, activeChapter);
        if (!isCancelled) {
          setVerses(chapter.verses || []);
          setPreference(PREF_KEYS.LAST_BOOK, activeBook);
          setPreference(PREF_KEYS.LAST_CHAPTER, activeChapter.toString());
          setPreference(PREF_KEYS.BIBLE_VERSION, translation);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setVerses([]);
          setError(err.message || 'Chapter not found in offline storage.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    fetchChapter();
    return () => {
      isCancelled = true;
    };
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

          <div className="flex flex-wrap gap-2">
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
              className="bg-[#0a0a09] border border-[#2a2a29] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 text-gray-200"
            >
              <option value="bsb">BSB (Berean Standard)</option>
              <option value="web">WEB (World English)</option>
              <option value="kjv">KJV (King James)</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#1a1a19]/50 rounded-3xl border border-[#2a2a29] p-6 sm:p-10">
          <h1 className="text-3xl font-merriweather text-amber-500 mb-8 text-center font-bold break-words">
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
              {verses.map(verse => {
                const { mainText, footnote } = parseVerseFootnote(verse.text);
                return (
                  <div key={verse.verse} className="flex gap-3 sm:gap-4 items-baseline">
                    <span className="text-amber-600/50 text-sm mt-1.5 min-w-[1.5rem] font-sans font-medium shrink-0">{verse.verse}</span>
                    <p className="break-words flex-1 min-w-0">
                      {mainText}
                      {footnote && (
                        <span className="text-gray-500 text-sm italic ml-2">
                          {footnote}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
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
