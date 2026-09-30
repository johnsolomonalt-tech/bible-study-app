"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, BookOpen, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

interface Reflection {
  badge: string;
  title: string;
  description: string;
  scripture: string;
  reference: string;
}

const REFLECTIONS: Reflection[] = [
  {
    badge: "Wayfarer's Crossing",
    title: "Seeking a Path Less Traveled",
    description: "The chapter, board, or study note you are seeking has wandered beyond the familiar trails.",
    scripture: "“Stand at the crossroads and look; ask for the ancient paths, ask where the good way is, and walk in it.”",
    reference: "Jeremiah 6:16",
  },
  {
    badge: "Scribe's Manuscript",
    title: "A Verse Beyond the Horizon",
    description: "This page is unwritten in our current volume, or the parchment has been moved to another chapter.",
    scripture: "“Your word is a lamp to my feet and a light to my path.”",
    reference: "Psalm 119:105",
  },
  {
    badge: "Quiet Vista",
    title: "Still Waters, Uncharted Shore",
    description: "You have arrived at a quiet clearing where no study materials are currently inscribed.",
    scripture: "“He leads me beside still waters. He restores my soul; He leads me in paths of righteousness.”",
    reference: "Psalm 23:2–3",
  },
  {
    badge: "Scholarly Margin",
    title: "Wandering Beyond the Margin",
    description: "Even the most attentive readers occasionally turn past the final column of the text.",
    scripture: "“Trust in the Lord with all your heart, and do not lean on your own understanding.”",
    reference: "Proverbs 3:5",
  },
  {
    badge: "Sanctuary Gate",
    title: "A Door Awaiting Discovery",
    description: "The specific study link you followed is not found, but the full biblical canon awaits.",
    scripture: "“Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.”",
    reference: "Matthew 7:7",
  },
  {
    badge: "Desert Clearing",
    title: "A Fountain in the Wilderness",
    description: "You have wandered off the marked trail, but every turn is an invitation to begin again.",
    scripture: "“Behold, I am doing a new thing! Now it springs forth; do you not perceive it? I will make a way in the wilderness.”",
    reference: "Isaiah 43:19",
  },
];

export default function NotFound() {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Initialize with a random reflection on client mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * REFLECTIONS.length);
    setIndex(randomIndex);
  }, []);

  const handleNextMessage = () => {
    setIsFading(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % REFLECTIONS.length);
      setIsFading(false);
    }, 180);
  };

  const item = REFLECTIONS[index];

  return (
    <main className="min-h-screen w-full relative flex flex-col items-center justify-center p-6 bg-[#121213] text-[#e8e6e3] overflow-hidden select-none">
      {/* Subtle ambient lighting */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(201,100,66,0.35) 0%, rgba(201,100,66,0.05) 60%, transparent 80%)',
        }}
      />
      <div 
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[260px] rounded-full pointer-events-none blur-3xl opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-7">
        
        {/* Top Floating Badge & Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl bg-[#1c1c1f] border border-[#2e2e34] flex items-center justify-center text-[#c96442] shadow-xl shadow-black/40 transition-transform duration-300 group-hover:scale-105">
              <Compass className="w-7 h-7 stroke-[1.6]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#c96442]/20 border border-[#c96442]/40 flex items-center justify-center text-[#c96442]">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1c20] border border-[#2c2c32] text-[11px] font-medium tracking-wider uppercase text-[#c96442]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c96442] animate-pulse" />
            404 &bull; {item.badge}
          </div>
        </div>

        {/* Dynamic Heading & Description */}
        <div 
          className={`space-y-3 transition-opacity duration-200 ${
            isFading ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
          }`}
        >
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-[#fafafa]">
            {item.title}
          </h1>
          <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-md mx-auto">
            {item.description}
          </p>
        </div>

        {/* Scripture Reflection Card */}
        <div 
          className={`w-full p-4 sm:p-5 rounded-2xl bg-[#171719]/80 border border-[#27272b] backdrop-blur-md shadow-2xl text-left transition-all duration-200 ${
            isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
          }`}
        >
          <p className="text-xs sm:text-sm text-[#d4d4d8] font-serif italic leading-relaxed">
            {item.scripture}
          </p>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#26262a]">
            <span className="text-xs font-medium tracking-wide text-[#c96442] font-sans">
              {item.reference}
            </span>
            <button
              onClick={handleNextMessage}
              title="Another reflection"
              className="inline-flex items-center gap-1.5 text-[11px] text-[#71717a] hover:text-[#e4e4e7] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 hover:rotate-90 transition-transform duration-200" />
              <span>Alternate reflection</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#c96442] text-white text-sm font-medium hover:bg-[#b85838] active:scale-[0.98] transition-all shadow-lg shadow-[#c96442]/25"
          >
            <BookOpen className="w-4 h-4" />
            <span>Return to Study Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </Link>
        </div>

      </div>
    </main>
  );
}
