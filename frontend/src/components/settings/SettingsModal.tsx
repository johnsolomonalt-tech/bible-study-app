"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Palette, BookOpen, Volume2, Sparkles, Target, Database,
  Check, RotateCcw, Download, Upload, Play, Square, Info, Eye, ShieldCheck
} from 'lucide-react';
import { 
  ReaderFontFamily, 
  ReaderFontSize, 
  ReaderLineHeight, 
  ReaderLayout 
} from '@/lib/appPreferences';
import { TheologicalLensType, THEOLOGICAL_LENS_OPTIONS } from '@/components/chat/TheologicalLensSelector';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface AccentOption {
  id: string;
  name: string;
  hex: string;
}

export const ACCENT_COLORS: AccentOption[] = [
  { id: 'terracotta', name: 'Terracotta', hex: '#c96442' },
  { id: 'blue', name: 'Royal Blue', hex: '#3b82f6' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'purple', name: 'Regal Purple', hex: '#8b5cf6' },
  { id: 'amber', name: 'Amber Gold', hex: '#d97706' },
  { id: 'crimson', name: 'Rose Crimson', hex: '#e11d48' },
];

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Appearance & Theme
  theme: string;
  onThemeChange: (theme: 'dark' | 'light' | 'sepia') => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  showLeftSidebar: boolean;
  onToggleLeftSidebar: (show: boolean) => void;
  showRightSidebar: boolean;
  onToggleRightSidebar: (show: boolean) => void;
  showBottomNotes: boolean;
  onToggleBottomNotes: (show: boolean) => void;

  // Reading & Typography
  readerFontFamily: ReaderFontFamily;
  onReaderFontFamilyChange: (font: ReaderFontFamily) => void;
  readerFontSize: ReaderFontSize;
  onReaderFontSizeChange: (size: ReaderFontSize) => void;
  readerLineHeight: ReaderLineHeight;
  onReaderLineHeightChange: (lh: ReaderLineHeight) => void;
  readerLayout: ReaderLayout;
  onReaderLayoutChange: (layout: ReaderLayout) => void;
  showVerseNumbers: boolean;
  onToggleVerseNumbers: (show: boolean) => void;
  showFootnotes: boolean;
  onToggleFootnotes: (show: boolean) => void;
  showBacklinksBadges: boolean;
  onToggleBacklinksBadges: (show: boolean) => void;

  // Audio & TTS
  ttsSpeed: number;
  onTtsSpeedChange: (speed: number) => void;
  ttsVoice: string;
  onTtsVoiceChange: (voice: string) => void;
  availableVoices: SpeechSynthesisVoice[];
  autoScrollAudio: boolean;
  onToggleAutoScrollAudio: (val: boolean) => void;
  autoAdvanceAudio: boolean;
  onToggleAutoAdvanceAudio: (val: boolean) => void;

  // Study & AI
  defaultTranslation: string;
  onDefaultTranslationChange: (version: string) => void;
  theologicalLens: TheologicalLensType;
  onTheologicalLensChange: (lens: TheologicalLensType) => void;

  // Tracker & Goals
  trackerFormat: 'percent' | 'fraction';
  onTrackerFormatChange: (format: 'percent' | 'fraction') => void;
  dailyChapterGoal: number;
  onDailyChapterGoalChange: (goal: number) => void;

  // Data & Backup
  onExportData: () => void;
  onImportData: (file: File) => Promise<boolean>;
  onResetPreferences: () => void;
}

type SettingsTab = 'appearance' | 'reader' | 'audio' | 'study' | 'tracker' | 'storage' | 'about';

export function SettingsModal(props: SettingsModalProps) {
  const {
    isOpen,
    onClose,
    theme,
    onThemeChange,
    accentColor,
    onAccentColorChange,
    showLeftSidebar,
    onToggleLeftSidebar,
    showRightSidebar,
    onToggleRightSidebar,
    showBottomNotes,
    onToggleBottomNotes,
    readerFontFamily,
    onReaderFontFamilyChange,
    readerFontSize,
    onReaderFontSizeChange,
    readerLineHeight,
    onReaderLineHeightChange,
    readerLayout,
    onReaderLayoutChange,
    showVerseNumbers,
    onToggleVerseNumbers,
    showFootnotes,
    onToggleFootnotes,
    showBacklinksBadges,
    onToggleBacklinksBadges,
    ttsSpeed,
    onTtsSpeedChange,
    ttsVoice,
    onTtsVoiceChange,
    availableVoices,
    autoScrollAudio,
    onToggleAutoScrollAudio,
    autoAdvanceAudio,
    onToggleAutoAdvanceAudio,
    defaultTranslation,
    onDefaultTranslationChange,
    theologicalLens,
    onTheologicalLensChange,
    trackerFormat,
    onTrackerFormatChange,
    dailyChapterGoal,
    onDailyChapterGoalChange,
    onExportData,
    onImportData,
    onResetPreferences,
  } = props;

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [isPreviewAudioPlaying, setIsPreviewAudioPlaying] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up audio on close
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPreviewAudioPlaying) {
      window.speechSynthesis.cancel();
      setIsPreviewAudioPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("The Lord is my shepherd; I shall not want.");
    utterance.rate = ttsSpeed;

    if (ttsVoice && availableVoices.length > 0) {
      const selected = availableVoices.find(v => v.name === ttsVoice);
      if (selected) utterance.voice = selected;
    }

    utterance.onend = () => setIsPreviewAudioPlaying(false);
    utterance.onerror = () => setIsPreviewAudioPlaying(false);

    setIsPreviewAudioPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Importing...');
      const success = await onImportData(file);
      if (success) {
        setImportStatus('Backup restored successfully!');
      } else {
        setImportStatus('Invalid backup file format.');
      }
    } catch {
      setImportStatus('Failed to read file.');
    }
    setTimeout(() => setImportStatus(null), 3500);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tabs = [
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'reader' as SettingsTab, label: 'Reading', icon: <BookOpen size={16} /> },
    { id: 'audio' as SettingsTab, label: 'Audio', icon: <Volume2 size={16} /> },
    { id: 'study' as SettingsTab, label: 'Study & AI', icon: <Sparkles size={16} /> },
    { id: 'tracker' as SettingsTab, label: 'Goals', icon: <Target size={16} /> },
    { id: 'storage' as SettingsTab, label: 'Data', icon: <Database size={16} /> },
    { id: 'about' as SettingsTab, label: 'Privacy & Legal', icon: <ShieldCheck size={16} /> },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-5 animate-in fade-in-50 duration-200"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-bg text-fg w-full max-w-3xl h-[88vh] max-h-[720px] rounded-[24px] sm:rounded-[28px] shadow-2xl ring-1 ring-border flex flex-col overflow-hidden"
      >
        {/* Header */}
        <header className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-display font-medium text-sm">
              ⚙
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-base sm:text-lg font-medium text-fg">
                Settings & Preferences
              </h2>
              <p className="text-xs text-muted">Customize your personal Bible study workspace</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:text-fg hover:bg-surface rounded-xl transition-colors"
            title="Close Settings (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Body: Sidebar Tabs + Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Tabs (Top strip on mobile, Left rail on tablet/desktop) */}
          <nav 
            className="flex md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 p-2 md:p-3 border-b md:border-b-0 md:border-r border-border md:w-48 bg-surface/20 gap-1 custom-scroll"
            aria-label="Settings Categories"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap text-left ${
                    isActive 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'text-fg-2 hover:bg-surface hover:text-fg'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-muted'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scroll space-y-6">
            
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Color Theme</h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                        theme === 'dark' 
                          ? 'border-accent ring-2 ring-accent/30 bg-[#1e1e20]' 
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="w-full h-8 rounded-lg bg-[#141413] border border-white/10 flex items-center px-2 gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                        <div className="w-8 h-1.5 rounded-full bg-white/20" />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-fg">
                        <span>Dark</span>
                        {theme === 'dark' && <Check size={14} className="text-accent" />}
                      </div>
                    </button>

                    <button
                      onClick={() => onThemeChange('light')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                        theme === 'light' 
                          ? 'border-accent ring-2 ring-accent/30 bg-surface' 
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="w-full h-8 rounded-lg bg-[#faf9f5] border border-black/10 flex items-center px-2 gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                        <div className="w-8 h-1.5 rounded-full bg-black/20" />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-fg">
                        <span>Light</span>
                        {theme === 'light' && <Check size={14} className="text-accent" />}
                      </div>
                    </button>

                    <button
                      onClick={() => onThemeChange('sepia')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                        theme === 'sepia' 
                          ? 'border-accent ring-2 ring-accent/30 bg-surface' 
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="w-full h-8 rounded-lg bg-[#f8f1e3] border border-black/10 flex items-center px-2 gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
                        <div className="w-8 h-1.5 rounded-full bg-[#8c7a68]/40" />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-fg">
                        <span>Sepia</span>
                        {theme === 'sepia' && <Check size={14} className="text-accent" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Accent Tint</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ACCENT_COLORS.map(color => {
                      const isSelected = accentColor.toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.id}
                          onClick={() => onAccentColorChange(color.hex)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                            isSelected 
                              ? 'border-accent ring-2 ring-accent/30 bg-surface-warm' 
                              : 'border-border bg-surface hover:border-border-soft'
                          }`}
                        >
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs"
                            style={{ backgroundColor: color.hex }}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-[11px] font-medium text-fg truncate">{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Sidebars */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Desktop Layout Panels</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                      <div>
                        <div className="text-sm font-medium text-fg">Left Book Navigation</div>
                        <div className="text-xs text-muted">Keep books and chapters panel open by default</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={showLeftSidebar}
                        onChange={(e) => onToggleLeftSidebar(e.target.checked)}
                        className="tracker-checkbox cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                      <div>
                        <div className="text-sm font-medium text-fg">Right AI Assistant</div>
                        <div className="text-xs text-muted">Keep Study AI chat panel open by default</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={showRightSidebar}
                        onChange={(e) => onToggleRightSidebar(e.target.checked)}
                        className="tracker-checkbox cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                      <div>
                        <div className="text-sm font-medium text-fg">Bottom Notes Drawer</div>
                        <div className="text-xs text-muted">Keep personal study notes drawer visible</div>
                      </div>
                      <input 
                        type="checkbox"
                        checked={showBottomNotes}
                        onChange={(e) => onToggleBottomNotes(e.target.checked)}
                        className="tracker-checkbox cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. READING & TYPOGRAPHY TAB */}
            {activeTab === 'reader' && (
              <div className="space-y-6">
                {/* Live Preview Box */}
                <div className="p-4 rounded-2xl bg-surface-warm/40 border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    <Eye size={13} className="text-accent" />
                    <span>Live Typography Preview</span>
                  </div>
                  <div className={`p-4 rounded-xl bg-bg border border-border/80 ${
                    readerFontFamily === 'serif' ? 'font-serif' : readerFontFamily === 'mono' ? 'font-mono-reader' : 'font-sans-reader'
                  } ${
                    readerFontSize === 'sm' ? 'text-[15px]' : readerFontSize === 'lg' ? 'text-[20px]' : readerFontSize === 'xl' ? 'text-[23px]' : 'text-[17px]'
                  } ${
                    readerLineHeight === 'compact' ? 'leading-[1.55]' : readerLineHeight === 'relaxed' ? 'leading-[2.2]' : 'leading-[1.85]'
                  } text-fg`}>
                    {readerLayout === 'verse' ? (
                      <div className="space-y-2">
                        <p>
                          {showVerseNumbers && <sup className="text-xs font-sans font-semibold text-muted mr-1.5">1</sup>}
                          The LORD is my shepherd; I shall not want.
                          {showFootnotes && <span className="text-gray-500 text-xs italic ml-2 select-none">want: Heb. lack</span>}
                        </p>
                        <p>
                          {showVerseNumbers && <sup className="text-xs font-sans font-semibold text-muted mr-1.5">2</sup>}
                          He maketh me to lie down in green pastures: he leadeth me beside the still waters.
                        </p>
                      </div>
                    ) : (
                      <p>
                        {showVerseNumbers && <sup className="text-xs font-sans font-semibold text-muted mr-1.5">1</sup>}
                        The LORD is my shepherd; I shall not want.
                        {showFootnotes && <span className="text-gray-500 text-xs italic ml-2 select-none">want: Heb. lack</span>}{" "}
                        {showVerseNumbers && <sup className="text-xs font-sans font-semibold text-muted mx-1.5">2</sup>}
                        He maketh me to lie down in green pastures: he leadeth me beside the still waters.
                      </p>
                    )}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Scripture Font Family</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'serif' as ReaderFontFamily, label: 'Serif', desc: 'Merriweather Book' },
                      { id: 'sans' as ReaderFontFamily, label: 'Sans', desc: 'Modern Clean' },
                      { id: 'mono' as ReaderFontFamily, label: 'Mono', desc: 'Scholar Study' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => onReaderFontFamilyChange(f.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          readerFontFamily === f.id
                            ? 'border-accent bg-accent/10 ring-1 ring-accent text-fg'
                            : 'border-border bg-surface text-fg-2 hover:border-border-soft'
                        }`}
                      >
                        <div className={`text-sm font-bold ${f.id === 'serif' ? 'font-serif' : f.id === 'mono' ? 'font-mono' : 'font-sans'}`}>
                          {f.label}
                        </div>
                        <div className="text-[11px] text-muted">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size & Line Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Text Size</h3>
                    <div className="grid grid-cols-4 gap-1 bg-surface p-1 rounded-xl border border-border">
                      {[
                        { id: 'sm' as ReaderFontSize, label: 'S' },
                        { id: 'md' as ReaderFontSize, label: 'M' },
                        { id: 'lg' as ReaderFontSize, label: 'L' },
                        { id: 'xl' as ReaderFontSize, label: 'XL' },
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => onReaderFontSizeChange(s.id)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            readerFontSize === s.id ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-fg'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Line Spacing</h3>
                    <div className="grid grid-cols-3 gap-1 bg-surface p-1 rounded-xl border border-border">
                      {[
                        { id: 'compact' as ReaderLineHeight, label: 'Compact' },
                        { id: 'standard' as ReaderLineHeight, label: 'Normal' },
                        { id: 'relaxed' as ReaderLineHeight, label: 'Relaxed' },
                      ].map(lh => (
                        <button
                          key={lh.id}
                          onClick={() => onReaderLineHeightChange(lh.id)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            readerLineHeight === lh.id ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-fg'
                          }`}
                        >
                          {lh.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reader Layout Mode */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Reader Layout Mode</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => onReaderLayoutChange('verse')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        readerLayout === 'verse'
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="text-sm font-semibold text-fg">Verse-by-Verse</div>
                      <div className="text-xs text-muted mt-0.5">Each verse begins on a clean new line</div>
                    </button>
                    <button
                      onClick={() => onReaderLayoutChange('paragraph')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        readerLayout === 'paragraph'
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="text-sm font-semibold text-fg">Paragraph Flow</div>
                      <div className="text-xs text-muted mt-0.5">Verses flow continuously like a printed Bible</div>
                    </button>
                  </div>
                </div>

                {/* Reader Elements Toggles */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                    <div>
                      <div className="text-sm font-medium text-fg">Verse Numbers</div>
                      <div className="text-xs text-muted">Show superscript reference numbers before each verse</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={showVerseNumbers}
                      onChange={(e) => onToggleVerseNumbers(e.target.checked)}
                      className="tracker-checkbox cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                    <div>
                      <div className="text-sm font-medium text-fg">Translator Footnotes</div>
                      <div className="text-xs text-muted">Display original language translator notes (Heb., Gr., etc.) inline</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={showFootnotes}
                      onChange={(e) => onToggleFootnotes(e.target.checked)}
                      className="tracker-checkbox cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                    <div>
                      <div className="text-sm font-medium text-fg">Cross-Reference Backlinks</div>
                      <div className="text-xs text-muted">Show clickable reference badges on verses</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={showBacklinksBadges}
                      onChange={(e) => onToggleBacklinksBadges(e.target.checked)}
                      className="tracker-checkbox cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. AUDIO & TTS TAB */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                {/* Narration Speed */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Audio Reading Speed</h3>
                  <div className="grid grid-cols-5 gap-1.5 bg-surface p-1.5 rounded-2xl border border-border">
                    {[
                      { val: 0.75, label: '0.75x', desc: 'Meditative' },
                      { val: 0.9, label: '0.9x', desc: 'Reverent' },
                      { val: 1.0, label: '1.0x', desc: 'Normal' },
                      { val: 1.25, label: '1.25x', desc: 'Brisk' },
                      { val: 1.5, label: '1.5x', desc: 'Fast' },
                    ].map(speed => (
                      <button
                        key={speed.val}
                        onClick={() => onTtsSpeedChange(speed.val)}
                        className={`py-2 px-1 rounded-xl text-center transition-all ${
                          Math.abs(ttsSpeed - speed.val) < 0.05
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-fg-2 hover:bg-surface-warm'
                        }`}
                      >
                        <div className="text-xs font-bold">{speed.label}</div>
                        <div className="text-[10px] opacity-75 hidden sm:block">{speed.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection & Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Preferred Narration Voice</h3>
                    <button
                      onClick={handleTestVoice}
                      className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      {isPreviewAudioPlaying ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                      <span>{isPreviewAudioPlaying ? 'Stop Test' : 'Test Voice'}</span>
                    </button>
                  </div>
                  
                  {availableVoices.length > 0 ? (
                    <select
                      value={ttsVoice}
                      onChange={(e) => onTtsVoiceChange(e.target.value)}
                      className="w-full bg-surface border border-border text-fg rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Auto-Select Best Available Voice</option>
                      {availableVoices.map(v => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-surface rounded-xl border border-border text-xs text-muted flex items-center gap-2">
                      <Info size={14} className="text-accent" />
                      <span>Speech synthesis voices will automatically populate once initialized by your browser.</span>
                    </div>
                  )}
                </div>

                {/* Audio Behaviors */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                    <div>
                      <div className="text-sm font-medium text-fg">Auto-Scroll During Narration</div>
                      <div className="text-xs text-muted">Smoothly follow and center scripture as verses are spoken aloud</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={autoScrollAudio}
                      onChange={(e) => onToggleAutoScrollAudio(e.target.checked)}
                      className="tracker-checkbox cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface rounded-2xl border border-border">
                    <div>
                      <div className="text-sm font-medium text-fg">Auto-Advance Chapters</div>
                      <div className="text-xs text-muted">Seamlessly load and read the next chapter when audio completes</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={autoAdvanceAudio}
                      onChange={(e) => onToggleAutoAdvanceAudio(e.target.checked)}
                      className="tracker-checkbox cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. STUDY & AI TAB */}
            {activeTab === 'study' && (
              <div className="space-y-6">
                {/* Default Bible Translation */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Default Bible Translation</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'bsb', name: 'BSB', label: 'Berean Standard Bible' },
                      { id: 'web', name: 'WEB', label: 'World English Bible' },
                      { id: 'kjv', name: 'KJV', label: 'King James Version' },
                      { id: 'asv', name: 'ASV', label: 'American Standard Version' },
                      { id: 'ylt', name: 'YLT', label: "Young's Literal Translation" },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => onDefaultTranslationChange(t.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          defaultTranslation.toLowerCase() === t.id
                            ? 'border-accent bg-accent/10 ring-1 ring-accent'
                            : 'border-border bg-surface hover:border-border-soft'
                        }`}
                      >
                        <div className="text-sm font-bold text-fg">{t.name}</div>
                        <div className="text-[11px] text-muted truncate">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Theological Lens */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Default AI Theological Lens</h3>
                  <div className="space-y-2">
                    {THEOLOGICAL_LENS_OPTIONS.map(opt => {
                      const isSelected = theologicalLens === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onTheologicalLensChange(opt.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                            isSelected 
                              ? 'border-accent bg-surface-warm ring-1 ring-accent' 
                              : 'border-border bg-surface hover:border-border-soft'
                          }`}
                        >
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: opt.bgLight, color: opt.accentColor }}
                          >
                            {opt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-fg">{opt.name}</span>
                              <span className="text-[11px] text-muted font-medium">({opt.tagline})</span>
                              {isSelected && <Check size={14} className="text-accent ml-auto shrink-0" />}
                            </div>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{opt.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5. TRACKER & GOALS TAB */}
            {activeTab === 'tracker' && (
              <div className="space-y-6">
                {/* Tracker Format */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Progress Format</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => onTrackerFormatChange('percent')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        trackerFormat === 'percent'
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="text-sm font-bold text-fg">Percentage (%)</div>
                      <div className="text-xs text-muted mt-0.5">e.g., 68% complete</div>
                    </button>

                    <button
                      onClick={() => onTrackerFormatChange('fraction')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        trackerFormat === 'fraction'
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="text-sm font-bold text-fg">Fractions (X / Total)</div>
                      <div className="text-xs text-muted mt-0.5">e.g., 34/50 chapters</div>
                    </button>
                  </div>
                </div>

                {/* Daily Reading Target relocated to Reading Tracker */}
                <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Daily Reading Target</span>
                    <span className="text-xs font-bold text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                      {dailyChapterGoal} {dailyChapterGoal === 1 ? 'Chapter' : 'Chapters'} / day
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Daily chapter goals and reading timeline estimates can now be changed directly in the <strong className="text-fg">Reading Tracker</strong> tab using the <strong className="text-accent">&quot;Edit Daily Goal&quot;</strong> button.
                  </p>
                </div>
              </div>
            )}

            {/* 6. DATA & STORAGE TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2.5">Backup & Export</h3>
                  <p className="text-xs text-muted mb-3">Download a portable JSON backup file of all your personal notebooks, highlights, and custom study preferences.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={onExportData}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-xl text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
                    >
                      <Download size={16} />
                      <span>Export Data Backup (JSON)</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border text-fg rounded-xl text-xs sm:text-sm font-medium hover:bg-surface-warm transition-colors"
                    >
                      <Upload size={16} />
                      <span>Import Data Backup (JSON)</span>
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {importStatus && (
                    <div className="mt-3 p-3 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-medium animate-in fade-in">
                      {importStatus}
                    </div>
                  )}
                </div>

                {/* Reset Preferences */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-2">Reset Defaults</h3>
                  <p className="text-xs text-muted mb-3">Restore all appearance, reader typography, and audio settings back to original defaults. Your saved notes and highlights will not be deleted.</p>
                  
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-red-500 hover:text-white hover:bg-red-500/90 rounded-xl border border-red-500/30 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    <span>Reset Settings to Defaults</span>
                  </button>
                </div>
              </div>
            )}

            {/* 7. PRIVACY & LEGAL TAB */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="text-accent" size={20} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">Privacy &amp; Data Sovereignty</h3>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 text-xs text-muted leading-relaxed">
                    <p>
                      <strong className="text-fg font-medium">Your Data Belongs to You:</strong> All personal reflections, private notes, sermon study materials, reading logs, and highlights are treated with strict confidentiality.
                    </p>
                    <p>
                      <strong className="text-fg font-medium">No Public AI Model Training:</strong> Your private notes, journal entries, and personal prayers are <span className="text-accent font-semibold">never sold, rented, or used to train public machine learning models</span>.
                    </p>
                    <p>
                      <strong className="text-fg font-medium">Local First &amp; Portable:</strong> You can export a complete, unencrypted JSON archive of all your personal notes, boards, and reading progress at any time from the <span className="text-fg font-medium">Data tab</span>.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-accent" size={20} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">AI Theological Assistant Disclosures</h3>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5 text-xs text-muted leading-relaxed">
                    <p>
                      Theologica AI provides assistive theological insights, historical/cultural context, original language definitions, and inductive study questions to enhance your personal study of Holy Scripture.
                    </p>
                    <p>
                      AI responses are generated to assist reflection and study. Users are encouraged to prayerfully examine all scriptures, test insights against the canonical Word of God, and rely on the Holy Spirit and sound pastoral community.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="text-accent" size={20} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">Scripture Translations &amp; Public Domain</h3>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs text-muted leading-relaxed">
                    <p>
                      <strong className="text-fg">Berean Standard Bible (BSB)</strong> &bull; Public Domain dedication. The BSB text is dedicated to the public domain to ensure open access to the Word of God worldwide.
                    </p>
                    <p>
                      <strong className="text-fg">World English Bible (WEB) &amp; King James Version (KJV)</strong> &bull; 100% Public Domain and royalty-free.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-6 py-3 border-t border-border flex items-center justify-between shrink-0 bg-surface/30">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>Theologica Study Workspace</span>
            <span>&bull;</span>
            <button 
              type="button" 
              onClick={() => setActiveTab('about')}
              className="text-muted hover:text-accent underline transition-colors cursor-pointer"
            >
              Privacy &amp; Disclosures
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            Done
          </button>
        </footer>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset All Workspace Settings?"
        message="Are you sure you want to reset all appearance, reader typography, and audio settings back to defaults? Your saved notes, chats, and highlights will not be affected."
        confirmLabel="Reset Defaults"
        variant="danger"
        icon="warning"
        onConfirm={() => {
          onResetPreferences();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
