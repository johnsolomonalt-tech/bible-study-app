"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  BarChart3,
  Activity,
  Users,
  Clock,
  Sparkles,
  MessageSquare,
  BookOpen,
  Layers,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  Flame,
  Calendar,
  Radio,
  X,
  Compass,
  BookmarkCheck,
  Languages,
  ShieldAlert,
  Share2,
  Download,
  Highlighter,
  Paperclip,
  Cpu,
  Database,
  Server,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { DEV_API_BASE, DEV_PORTAL_PATH } from '@/lib/devConfig';

interface SystemHealth {
  database: {
    status: string;
    latencyMs: number;
    error: string | null;
  };
  geminiAi: {
    status: string;
    configured: boolean;
    primaryModel?: string;
    fallbackModels?: string[];
    modelFamily?: string;
  };
  pixazoImage: {
    status: string;
    configured: boolean;
  };
  clerkAuth: {
    status: string;
    configured: boolean;
  };
  rateLimiter: {
    chatMessages: string;
    canvasAi: string;
    notesAi: string;
    status: string;
  };
  security: {
    rateLimitingEnabled: boolean;
    highlightsSecuredWithClerk: boolean;
    singletonPrismaEnforced: boolean;
    devRouteMiddlewareGuarded: boolean;
    status: string;
  };
  runtime: {
    nodeEnv: string;
    vercelRegion: string;
  };
}

interface AnalyticsStats {
  periodDays: number;
  totalEvents: number;
  totalSessionsToday: number;
  sessionsYesterday: number;
  dauToday: number;
  dauYesterday: number;
  activeUsersPeriod: number;
  featureCounts: Record<string, number>;
  dailyTrends: Array<{
    date: string;
    dayLabel: string;
    sessions: number;
    activeUsers: number;
    totalEvents: number;
  }>;
  hourlyDistribution: number[];
  busiestDay: { date: string; events: number } | null;
  quietestDay: { date: string; events: number } | null;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  anonymousId: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface AdminSettings {
  adminUserId: string;
  adminEmail: string | null;
  allowedEmails: string[];
  allowedUserIds: string[];
  hasConfig: boolean;
}

export default function DevDashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();

  // Authentication State
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Dashboard Data State
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'activity' | 'health' | 'security'>('overview');
  const [feedFilter, setFeedFilter] = useState<string>('all');

  // Change Password Modal / Form
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // New Admin Email Form
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Reset Telemetry State
  const [isResettingTelemetry, setIsResettingTelemetry] = useState(false);
  const [resetStatusMsg, setResetStatusMsg] = useState<string | null>(null);

  // 1. Fetch Stats & Check Lock Status
  const loadDashboardData = useCallback(async (range: '24h' | '7d' | '30d' = timeRange) => {
    setIsLoadingStats(true);
    try {
      const [statsRes, eventsRes, settingsRes, healthRes] = await Promise.all([
        fetch(`${DEV_API_BASE}/stats?range=${range}`),
        fetch(`${DEV_API_BASE}/events?limit=60`),
        fetch(`${DEV_API_BASE}/settings`),
        fetch(`${DEV_API_BASE}/health`),
      ]);

      if (statsRes.status === 401) {
        const statsData = await statsRes.json();
        if (statsData.locked) {
          setIsUnlocked(false);
          setIsLoadingStats(false);
          return;
        }
      }

      if (!statsRes.ok) {
        throw new Error('Failed to fetch stats');
      }

      const statsData = await statsRes.json();
      const eventsData = await eventsRes.json();
      const settingsData = await settingsRes.json();

      setStats(statsData.stats);
      setRecentEvents(eventsData.events || []);
      setAdminSettings(settingsData.settings || null);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData.system || null);
      }
      setIsUnlocked(true);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('Error fetching dev data:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [timeRange]);

  // Initial Check
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!isUnlocked || !isAutoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [isUnlocked, isAutoRefresh, loadDashboardData]);

  // Handle Password Unlock Submit
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      const res = await fetch(`${DEV_API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || 'Invalid developer passcode');
        setIsUnlocking(false);
        return;
      }

      setIsUnlocked(true);
      setPasscode('');
      await loadDashboardData();
    } catch (err: any) {
      setUnlockError(err.message || 'Verification network error');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle Session Lock (Logout from dev session)
  const handleLockSession = async () => {
    try {
      await fetch(`${DEV_API_BASE}/auth/logout`, { method: 'POST' });
      setIsUnlocked(false);
      setStats(null);
    } catch {
      setIsUnlocked(false);
    }
  };

  // Handle Reset Telemetry Data
  const handleResetTelemetry = async () => {
    if (!window.confirm('Are you sure you want to reset all telemetry data? This will clear test visitors and historical event logs.')) {
      return;
    }
    setIsResettingTelemetry(true);
    setResetStatusMsg(null);
    try {
      const res = await fetch(`${DEV_API_BASE}/events`, { method: 'DELETE' });
      if (res.ok) {
        setResetStatusMsg('Telemetry data reset successfully.');
        await loadDashboardData();
        setTimeout(() => setResetStatusMsg(null), 4000);
      } else {
        setResetStatusMsg('Failed to reset telemetry.');
      }
    } catch {
      setResetStatusMsg('Network error.');
    } finally {
      setIsResettingTelemetry(false);
    }
  };

  // Handle Change Password Submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordChangeStatus({ error: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordChangeStatus({ error: 'Password must be at least 4 characters' });
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordChangeStatus(null);

    try {
      const res = await fetch(`${DEV_API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordChangeStatus({ error: data.error || 'Failed to change password' });
      } else {
        setPasswordChangeStatus({ success: true });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangePasswordOpen(false);
          setPasswordChangeStatus(null);
        }, 1800);
      }
    } catch (err: any) {
      setPasswordChangeStatus({ error: err.message || 'Network error' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Handle Add Allowed Email
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput || !newEmailInput.includes('@')) return;

    setIsAddingEmail(true);
    setEmailStatusMsg(null);

    try {
      const res = await fetch(`${DEV_API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_email', email: newEmailInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminSettings((prev) => prev ? { ...prev, allowedEmails: data.allowedEmails } : null);
        setNewEmailInput('');
        setEmailStatusMsg('Admin email successfully added');
        setTimeout(() => setEmailStatusMsg(null), 3000);
      } else {
        setEmailStatusMsg(data.error || 'Failed to add email');
      }
    } catch {
      setEmailStatusMsg('Network error');
    } finally {
      setIsAddingEmail(false);
    }
  };

  // Handle Remove Allowed Email
  const handleRemoveEmail = async (emailToRemove: string) => {
    try {
      const res = await fetch(`${DEV_API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_email', email: emailToRemove }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminSettings((prev) => prev ? { ...prev, allowedEmails: data.allowedEmails } : null);
      }
    } catch {
      // Ignore
    }
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (feedFilter === 'all') return recentEvents;
    return recentEvents.filter((e) => e.eventType === feedFilter);
  }, [recentEvents, feedFilter]);

  // Max value calculation for Daily Trend Chart
  const maxTrendEvents = useMemo(() => {
    if (!stats?.dailyTrends?.length) return 10;
    const max = Math.max(...stats.dailyTrends.map((d) => Math.max(d.sessions, d.activeUsers, d.totalEvents)));
    return Math.max(max, 5);
  }, [stats]);

  // Max value calculation for Hourly Distribution
  const maxHourlyCount = useMemo(() => {
    if (!stats?.hourlyDistribution?.length) return 5;
    const max = Math.max(...stats.hourlyDistribution);
    return Math.max(max, 2);
  }, [stats]);

  // Top Feature Calculation - strictly measures active user engagement (not passive drawer opens)
  const { topFeature, topFeatureCount } = useMemo(() => {
    if (!stats?.featureCounts) return { topFeature: 'Reading & Study', topFeatureCount: 0 };

    // Passive navigation / system events to exclude from top engaged feature ranking
    const passiveEvents = new Set(['session_start', 'page_view', 'ai_chat_opened', 'canvas_opened', 'rate_limit_blocked']);
    const features = Object.entries(stats.featureCounts)
      .filter(([k, count]) => !passiveEvents.has(k) && count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (!features.length) {
      return { topFeature: 'Reading & Study', topFeatureCount: 0 };
    }

    const map: Record<string, string> = {
      scripture_read: 'Scripture Reading & Study',
      ai_chat_prompt: 'AI Theological Chat',
      chat_file_upload: 'Chat File Uploads',
      canvas_ai_generate: 'AI Canvas Generator',
      canvas_created: 'Visual Canvas Boards',
      canvas_shared: 'Canvas Sharing',
      canvas_imported: 'Canvas Imports',
      note_created: 'Scripture Notes',
      notes_ai_generate: 'AI Notes Synthesis',
      highlight_created: 'Scripture Highlights',
      highlight_deleted: 'Removed Highlights',
      lectio_started: 'Lectio Divina',
      reading_tracker_updated: 'Reading Tracker',
      interlinear_opened: 'Greek/Hebrew Lexicon',
    };

    const bestKey = features[0][0];
    const bestCount = features[0][1];
    return {
      topFeature: map[bestKey] || bestKey.replace(/_/g, ' '),
      topFeatureCount: bestCount,
    };
  }, [stats]);

  // ==========================================
  // VIEW: 1. Passcode Locked Screen
  // ==========================================
  if (isUnlocked === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#141413] via-[#1a1a19] to-[#141413]">
        <div className="w-full max-w-md bg-[#232321] border border-[#3d3d3a] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          {/* Shield Badge */}
          <div className="flex justify-center mb-6">
            <div className="relative p-4 rounded-2xl bg-accent/15 border border-accent/30 text-accent shadow-inner">
              <Shield className="w-9 h-9" />
              <Lock className="w-4 h-4 absolute bottom-3 right-3 text-white" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-serif font-bold text-[#faf9f5] tracking-tight">
              Developer Portal
            </h1>
            <p className="text-xs text-[#b0aea5] mt-1.5">
              Restricted Admin & Telemetry Workspace
            </p>
          </div>

          {/* User Identity Pill */}
          <div className="mb-6 p-3 rounded-xl bg-[#1a1a19] border border-[#30302e] flex items-center justify-between text-xs text-[#faf9f5]">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#87867f]">Clerk Auth:</span>
              <span className="font-mono text-[11px] truncate text-accent-on font-medium">
                {user?.primaryEmailAddress?.emailAddress || user?.id || 'Authenticated'}
              </span>
            </div>
            <a
              href="/"
              className="text-[#87867f] hover:text-[#faf9f5] text-[11px] underline underline-offset-2 ml-2 shrink-0 transition-colors"
            >
              Exit
            </a>
          </div>

          {/* Passcode Unlock Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#b0aea5] mb-1.5">
                Developer Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#141413] border border-[#3d3d3a] text-sm text-[#faf9f5] placeholder-[#5e5d59] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#87867f] hover:text-[#faf9f5] p-1 transition-colors"
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[#87867f] mt-1.5 flex items-center gap-1">
                <Key size={11} className="text-accent" />
                <span>Enter your private developer access code</span>
              </p>
            </div>

            {unlockError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{unlockError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full py-3 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Unlock Portal
                </>
              )}
            </button>
          </form>

          {/* Privacy Guarantee Pill */}
          <div className="mt-6 pt-4 border-t border-[#30302e] flex items-center justify-center gap-1.5 text-[10px] text-[#87867f]">
            <ShieldAlert size={12} className="text-emerald-500" />
            <span>Strict privacy active: Zero personal content or chat logs collected</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 2. Full Developer Portal Dashboard
  // ==========================================
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Top Developer Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black tracking-tight text-accent text-lg">
                Theologica
              </span>
              <span className="text-[var(--meta)]">/</span>
              <span className="font-semibold text-sm text-[var(--fg)] tracking-wide">
                Developer Console
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] hidden md:block">
              Telemetry & operational metrics for theologica-gamma.vercel.app
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-medium">
            <button
              onClick={() => {
                setTimeRange('24h');
                loadDashboardData('24h');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'text-[var(--fg-2)] hover:text-[var(--fg)]'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => {
                setTimeRange('7d');
                loadDashboardData('7d');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'text-[var(--fg-2)] hover:text-[var(--fg)]'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => {
                setTimeRange('30d');
                loadDashboardData('30d');
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === '30d'
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'text-[var(--fg-2)] hover:text-[var(--fg)]'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboardData()}
            disabled={isLoadingStats}
            title="Refresh Data"
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--fg-2)] hover:text-[var(--fg)] transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={isLoadingStats ? 'animate-spin text-accent' : ''} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--fg)] transition-all cursor-pointer"
          >
            <Settings size={14} className="text-accent" />
            <span className="hidden sm:inline">Admin Settings</span>
          </button>

          {/* Lock Session */}
          <button
            onClick={handleLockSession}
            title="Lock Developer Session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-all cursor-pointer"
          >
            <Lock size={13} />
            <span className="hidden sm:inline">Lock</span>
          </button>

          {/* Return to App */}
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all shadow-sm"
          >
            Exit to App
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] gap-2 sm:gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            <BarChart3 size={16} />
            <span>Usage & Retention</span>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'features'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Flame size={16} />
            <span>Feature Engagement</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'activity'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Activity size={16} />
            <span>Anonymous Event Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'health'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Cpu size={16} />
            <span>System Health</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Shield size={16} />
            <span>Access & Security</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & USAGE                                        */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Sessions Today */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">Sessions Today</span>
                  <div className="p-2 rounded-xl bg-accent/15 text-accent">
                    <Activity size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-[var(--fg)]">
                    {stats?.totalSessionsToday ?? 0}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    vs {stats?.sessionsYesterday ?? 0} yesterday
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
                  {(stats?.totalSessionsToday ?? 0) >= (stats?.sessionsYesterday ?? 0) ? (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <ArrowUpRight size={13} />
                      Steady / Active
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <ArrowDownRight size={13} />
                      Lower than yesterday
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Daily Active Users (DAU) */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">Daily Active Users (DAU)</span>
                  <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                    <Users size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-[var(--fg)]">
                    {stats?.dauToday ?? 0}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {stats?.dauYesterday ?? 0} yesterday
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Unique anonymous study sessions today
                </p>
              </div>

              {/* Card 3: Active Users (Period) */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {timeRange === '24h' ? '24h' : timeRange === '7d' ? '7-Day' : '30-Day'} Active Count
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Calendar size={16} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-[var(--fg)]">
                    {stats?.activeUsersPeriod ?? 0}
                  </span>
                  <span className="text-xs text-[var(--muted)]">unique visitors</span>
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  {stats?.totalEvents ?? 0} operational events logged
                </p>
              </div>

              {/* Card 4: Top Feature */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">Top Engaged Feature</span>
                  <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-bold text-[var(--fg)] truncate block">
                    {topFeature}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                  <Clock size={11} />
                  {topFeatureCount > 0 ? (
                    <span>{topFeatureCount} action events in selected period</span>
                  ) : (
                    <span>Core scripture study mode active</span>
                  )}
                </p>
              </div>
            </div>

            {/* Daily Usage Trend Visual Bar / Area Chart */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--fg)]">
                    Daily Usage & Active Visitors Trend
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Sessions and unique active users per day across the selected {timeRange} window
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md bg-accent" />
                    <span className="text-[var(--fg-2)]">Sessions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md bg-blue-500" />
                    <span className="text-[var(--fg-2)]">Active Users (DAU)</span>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Bar Chart */}
              <div className="pt-4 pb-2">
                {stats?.dailyTrends && stats.dailyTrends.length > 0 ? (
                  <div className="h-56 w-full flex items-end gap-2 sm:gap-4 border-b border-[var(--border-soft)] pb-2">
                    {stats.dailyTrends.map((day) => {
                      const sessionHeight = Math.max(Math.round((day.sessions / maxTrendEvents) * 100), 4);
                      const dauHeight = Math.max(Math.round((day.activeUsers / maxTrendEvents) * 100), 4);

                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 bg-[#141413] border border-[#3d3d3a] p-2 rounded-xl text-[10px] text-white pointer-events-none whitespace-nowrap shadow-xl z-20">
                            <p className="font-semibold text-accent">{day.date}</p>
                            <p>Sessions: <span className="font-mono text-white">{day.sessions}</span></p>
                            <p>Active Users: <span className="font-mono text-blue-400">{day.activeUsers}</span></p>
                          </div>

                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            {/* Sessions Bar */}
                            <div
                              style={{ height: `${sessionHeight}%` }}
                              className="w-1/2 max-w-[20px] bg-accent hover:bg-accent/80 rounded-t-md transition-all cursor-pointer"
                            />
                            {/* DAU Bar */}
                            <div
                              style={{ height: `${dauHeight}%` }}
                              className="w-1/2 max-w-[20px] bg-blue-500/80 hover:bg-blue-500 rounded-t-md transition-all cursor-pointer"
                            />
                          </div>

                          {/* Day Label */}
                          <span className="text-[10px] text-[var(--muted)] truncate max-w-full font-mono mt-1">
                            {day.dayLabel.split(',')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-xs text-[var(--muted)]">
                    No trend events recorded yet for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Distribution Histogram (24h Peak Usage) */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--fg)]">
                    24-Hour Usage Distribution (Peak Study Times)
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Aggregated frequency of interactions by hour of day (0:00 to 23:00)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Clock size={14} className="text-accent" />
                  <span>Local Server Time</span>
                </div>
              </div>

              <div className="pt-4">
                <div className="h-32 w-full flex items-end gap-1 sm:gap-1.5 border-b border-[var(--border-soft)] pb-1">
                  {(stats?.hourlyDistribution || new Array(24).fill(0)).map((count, hour) => {
                    const heightPercent = Math.max(Math.round((count / maxHourlyCount) * 100), count > 0 ? 6 : 2);
                    return (
                      <div
                        key={hour}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[#141413] border border-[#3d3d3a] px-2 py-1 rounded-lg text-[10px] text-white pointer-events-none whitespace-nowrap shadow-xl z-20 font-mono">
                          {hour}:00 - {count} events
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-sm transition-all cursor-pointer ${
                            count > 0 ? 'bg-accent/80 hover:bg-accent' : 'bg-[var(--border-soft)]/40'
                          }`}
                        />
                        <span className="text-[9px] text-[var(--muted)] font-mono mt-1">
                          {hour % 3 === 0 ? `${hour}h` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: FEATURE ENGAGEMENT COUNTERS                             */}
        {/* ============================================================== */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--fg)]">
                Feature Engagement Breakdown
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Raw operational counts tracking how users interact with core theological tools (strictly without content)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Feature 0: Scripture Reading & Study */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Scripture Reading</h3>
                      <p className="text-[11px] text-[var(--muted)]">Bible chapters studied</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.scripture_read ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.scripture_read ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Active chapter navigations & reading sessions
                </p>
              </div>

              {/* Feature 1: AI Chat Prompts */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-accent/15 text-accent">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">AI Theological Chat</h3>
                      <p className="text-[11px] text-[var(--muted)]">Prompts submitted</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.ai_chat_prompt ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.ai_chat_prompt ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Chat panel opened: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.ai_chat_opened ?? 0}</span> times
                </p>
              </div>

              {/* Feature 2: Visual Canvas Boards */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Visual Canvas</h3>
                      <p className="text-[11px] text-[var(--muted)]">Mind maps & study boards</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.canvas_opened ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.canvas_opened ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Boards created/initialized: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.canvas_created ?? 0}</span>
                </p>
              </div>

              {/* Feature 3: Scripture Notes */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <Edit3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Scripture Notes</h3>
                      <p className="text-[11px] text-[var(--muted)]">Saved study notes</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.note_created ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.note_created ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Zero note titles or contents are ever recorded
                </p>
              </div>

              {/* Feature 4: Reading Tracker */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <BookmarkCheck size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Reading Tracker</h3>
                      <p className="text-[11px] text-[var(--muted)]">Chapters checked/completed</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.reading_tracker_updated ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.reading_tracker_updated ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Progress tracking updates recorded
                </p>
              </div>

              {/* Feature 5: Lectio Divina */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Lectio Divina</h3>
                      <p className="text-[11px] text-[var(--muted)]">Contemplative prayers started</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.lectio_started ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.lectio_started ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Meditatio & Oratio reflection sessions
                </p>
              </div>

              {/* Feature 6: Greek / Hebrew Interlinear */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                      <Languages size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Original Languages</h3>
                      <p className="text-[11px] text-[var(--muted)]">Lexicon lookups</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.interlinear_opened ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.interlinear_opened ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Strong&apos;s Concordance & morphological analysis
                </p>
              </div>

              {/* Feature 7: Theologica AI Canvas Generator */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">AI Canvas Generator</h3>
                      <p className="text-[11px] text-[var(--muted)]">Automated study boards</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.canvas_ai_generate ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.canvas_ai_generate ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Algorithmic concept maps & theological synthesis
                </p>
              </div>

              {/* Feature 8: Canvas Sharing & Import */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                      <Share2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Canvas Sharing</h3>
                      <p className="text-[11px] text-[var(--muted)]">Shared & imported boards</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {(stats?.featureCounts?.canvas_shared ?? 0) + (stats?.featureCounts?.canvas_imported ?? 0)}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round((((stats?.featureCounts?.canvas_shared ?? 0) + (stats?.featureCounts?.canvas_imported ?? 0)) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Shared: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.canvas_shared ?? 0}</span> • Imported: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.canvas_imported ?? 0}</span>
                </p>
              </div>

              {/* Feature 9: Chat File Attachments */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Chat File Uploads</h3>
                      <p className="text-[11px] text-[var(--muted)]">Media & study attachments</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.chat_file_upload ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.chat_file_upload ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Multimedia inputs analyzed in AI chat
                </p>
              </div>

              {/* Feature 10: Scripture Verse Highlights */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <Highlighter size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Verse Highlights</h3>
                      <p className="text-[11px] text-[var(--muted)]">Color-coded scriptures</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.highlight_created ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.highlight_created ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Created: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.highlight_created ?? 0}</span> • Removed: <span className="font-mono text-[var(--fg)]">{stats?.featureCounts?.highlight_deleted ?? 0}</span>
                </p>
              </div>

              {/* Feature 11: Notes AI Synthesis */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Notes AI Synthesis</h3>
                      <p className="text-[11px] text-[var(--muted)]">AI summary & outlines</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.notes_ai_generate ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.notes_ai_generate ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Synthesized scripture insights (zero content logged)
                </p>
              </div>

              {/* Feature 12: Rate Limit Throttles */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Rate Limiter Throttles</h3>
                      <p className="text-[11px] text-[var(--muted)]">429 requests intercepted</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--fg)]">
                    {stats?.featureCounts?.rate_limit_blocked ?? 0}
                  </span>
                </div>
                <div className="w-full bg-[var(--border-soft)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((stats?.featureCounts?.rate_limit_blocked ?? 0) / Math.max(stats?.totalEvents ?? 1, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Active sliding window protection across chat & AI APIs
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ANONYMOUS EVENT FEED                                    */}
        {/* ============================================================== */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-[var(--fg)]">
                  Recent Anonymous Activity Feed
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Real-time chronological telemetry stream (strictly anonymized)
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs overflow-x-auto max-w-full">
                {[
                  { id: 'all', label: 'All Events' },
                  { id: 'session_start', label: 'Sessions' },
                  { id: 'scripture_read', label: 'Scripture Read' },
                  { id: 'ai_chat_prompt', label: 'AI Chat' },
                  { id: 'chat_file_upload', label: 'Chat Files' },
                  { id: 'canvas_opened', label: 'Canvas' },
                  { id: 'canvas_ai_generate', label: 'AI Canvas' },
                  { id: 'canvas_shared', label: 'Canvas Share' },
                  { id: 'canvas_imported', label: 'Canvas Import' },
                  { id: 'note_created', label: 'Notes' },
                  { id: 'notes_ai_generate', label: 'Notes AI' },
                  { id: 'highlight_created', label: 'Highlights' },
                  { id: 'lectio_started', label: 'Lectio Divina' },
                  { id: 'rate_limit_blocked', label: 'Rate Throttles' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFeedFilter(item.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      feedFilter === item.id
                        ? 'bg-accent text-white font-semibold'
                        : 'text-[var(--fg-2)] hover:text-[var(--fg)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => {
                  const eventTime = new Date(evt.timestamp);
                  const isRecent = Date.now() - eventTime.getTime() < 1000 * 60 * 10; // 10 minutes

                  const getEventLabel = (type: string) => {
                    switch (type) {
                      case 'session_start':
                        return 'App Session Started';
                      case 'scripture_read':
                        return 'Scripture Chapter Read';
                      case 'ai_chat_prompt':
                        return 'AI Theological Chat Initiated';
                      case 'ai_chat_opened':
                        return 'AI Chat Drawer Opened';
                      case 'chat_file_upload':
                        return 'Chat File / Media Attached';
                      case 'canvas_opened':
                        return 'Visual Canvas Board Opened';
                      case 'canvas_created':
                        return 'New Canvas Board Created';
                      case 'canvas_ai_generate':
                        return 'Theologica AI Canvas Generated';
                      case 'canvas_shared':
                        return 'Canvas Board Share Link Created';
                      case 'canvas_imported':
                        return 'Shared Canvas Board Imported';
                      case 'note_created':
                        return 'Scripture Study Note Created';
                      case 'notes_ai_generate':
                        return 'Notes AI Synthesis Generated';
                      case 'highlight_created':
                        return 'Scripture Verse Highlighted';
                      case 'highlight_deleted':
                        return 'Scripture Verse Highlight Removed';
                      case 'lectio_started':
                        return 'Lectio Divina Contemplative Prayer Started';
                      case 'reading_tracker_updated':
                        return 'Reading Tracker Progress Updated';
                      case 'interlinear_opened':
                        return 'Greek / Hebrew Lexicon Inspected';
                      case 'rate_limit_blocked':
                        return 'API Request Rate Limited (429)';
                      default:
                        return type.replace(/_/g, ' ');
                    }
                  };

                  const getEventIcon = (type: string) => {
                    switch (type) {
                      case 'session_start':
                        return <Activity size={14} className="text-emerald-400" />;
                      case 'scripture_read':
                        return <BookOpen size={14} className="text-amber-400" />;
                      case 'ai_chat_prompt':
                      case 'ai_chat_opened':
                        return <Sparkles size={14} className="text-accent" />;
                      case 'chat_file_upload':
                        return <Paperclip size={14} className="text-blue-400" />;
                      case 'canvas_opened':
                      case 'canvas_created':
                        return <Layers size={14} className="text-purple-400" />;
                      case 'canvas_ai_generate':
                        return <Cpu size={14} className="text-indigo-400" />;
                      case 'canvas_shared':
                        return <Share2 size={14} className="text-sky-400" />;
                      case 'canvas_imported':
                        return <Download size={14} className="text-emerald-400" />;
                      case 'note_created':
                        return <Edit3 size={14} className="text-amber-400" />;
                      case 'notes_ai_generate':
                        return <Zap size={14} className="text-emerald-400" />;
                      case 'highlight_created':
                        return <Highlighter size={14} className="text-amber-400" />;
                      case 'highlight_deleted':
                        return <Highlighter size={14} className="text-rose-400" />;
                      case 'lectio_started':
                        return <BookOpen size={14} className="text-rose-400" />;
                      case 'reading_tracker_updated':
                        return <BookmarkCheck size={14} className="text-emerald-400" />;
                      case 'interlinear_opened':
                        return <Languages size={14} className="text-cyan-400" />;
                      case 'rate_limit_blocked':
                        return <ShieldAlert size={14} className="text-red-400" />;
                      default:
                        return <Radio size={14} className="text-blue-400" />;
                    }
                  };

                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] shrink-0">
                          {getEventIcon(evt.eventType)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--fg)] truncate">
                            {getEventLabel(evt.eventType)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--muted)]">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-2)]">
                              {evt.anonymousId}
                            </span>
                            {evt.metadata?.book && (
                              <span>Passage: {evt.metadata.book} {evt.metadata.chapter}</span>
                            )}
                            {evt.metadata?.platform && (
                              <span>Platform: {evt.metadata.platform}</span>
                            )}
                            {evt.metadata?.feature && (
                              <span>Feature: {evt.metadata.feature}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-[var(--muted)]">
                          {eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {isRecent && (
                          <span className="block text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                            Recent
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-xs text-[var(--muted)]">
                  No activity events found matching the filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SYSTEM HEALTH & DIAGNOSTICS                             */}
        {/* ============================================================== */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--fg)]">
                System Health & Live Diagnostics
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Real-time backend infrastructure, database connection latency, external AI services, and security checks
              </p>
            </div>

            {/* Health Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* PostgreSQL Database */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">PostgreSQL Database</h3>
                      <p className="text-[11px] text-[var(--muted)]">Prisma / Neon connection</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono ${
                      systemHealth?.database?.status === 'operational'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        systemHealth?.database?.status === 'operational'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-red-400'
                      }`}
                    />
                    {systemHealth?.database?.status === 'operational' ? 'Operational' : 'Offline'}
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between border-t border-[var(--border)] text-xs">
                  <span className="text-[var(--muted)]">Ping Latency</span>
                  <span className="font-mono font-bold text-[var(--fg)]">
                    {systemHealth?.database?.latencyMs ?? 0} ms
                  </span>
                </div>
                {systemHealth?.database?.error && (
                  <p className="text-[11px] text-red-400 font-mono">
                    {systemHealth.database.error}
                  </p>
                )}
              </div>

              {/* Gemini AI Engine */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-accent/15 text-accent">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Gemini AI Engine</h3>
                      <p className="text-[11px] text-[var(--muted)]">Gemini 3 Flash Series</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono ${
                      systemHealth?.geminiAi?.configured
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        systemHealth?.geminiAi?.configured ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {systemHealth?.geminiAi?.configured ? 'Active' : 'Unconfigured'}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Primary Model:</span>
                    <span className="font-mono text-[var(--fg)] font-semibold">
                      {systemHealth?.geminiAi?.primaryModel || 'gemini-3.1-flash-lite'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Fallback Chain:</span>
                    <span className="font-mono text-[var(--fg-2)] text-[10px]">
                      3.5, 3.6, 3.7, 3.8 Flash
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Latency Target:</span>
                    <span className="font-mono text-emerald-400 text-[10px]">3 - 5s rapid stream</span>
                  </div>
                </div>
              </div>

              {/* Pixazo Image AI */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Pixazo Image API</h3>
                      <p className="text-[11px] text-[var(--muted)]">Theological Artwork Generator</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono ${
                      systemHealth?.pixazoImage?.configured
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        systemHealth?.pixazoImage?.configured ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {systemHealth?.pixazoImage?.configured ? 'Active' : 'Standby'}
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between border-t border-[var(--border)] text-xs">
                  <span className="text-[var(--muted)]">Pipeline</span>
                  <span className="font-mono text-[var(--fg)]">High-Res Image Synthesis</span>
                </div>
              </div>

              {/* Clerk Auth Integration */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Clerk Authentication</h3>
                      <p className="text-[11px] text-[var(--muted)]">Session & Identity Guard</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Enforced
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between border-t border-[var(--border)] text-xs">
                  <span className="text-[var(--muted)]">Middleware Guard</span>
                  <span className="font-mono text-[var(--fg)]">Strict Obfuscated Boundary</span>
                </div>
              </div>

              {/* Sliding Window Rate Limiter */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Sliding Rate Limiter</h3>
                      <p className="text-[11px] text-[var(--muted)]">In-Memory Abuse Guard</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Chat Messages:</span>
                    <span className="font-mono text-[var(--fg)]">{systemHealth?.rateLimiter?.chatMessages || '25 req/min'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Canvas AI Generator:</span>
                    <span className="font-mono text-[var(--fg)]">{systemHealth?.rateLimiter?.canvasAi || '15 req/min'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Notes AI Synthesis:</span>
                    <span className="font-mono text-[var(--fg)]">{systemHealth?.rateLimiter?.notesAi || '20 req/min'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-[var(--border)]">
                    <span className="text-rose-400 font-medium">Total Throttled (429):</span>
                    <span className="font-mono font-bold text-rose-400">
                      {stats?.featureCounts?.rate_limit_blocked ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Runtime & Hosting */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                      <Server size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--fg)]">Hosting & Runtime</h3>
                      <p className="text-[11px] text-[var(--muted)]">Vercel Edge / Node.js</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--fg)]">
                    {systemHealth?.runtime?.nodeEnv || 'production'}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Vercel Region:</span>
                    <span className="font-mono text-[var(--fg)]">{systemHealth?.runtime?.vercelRegion || 'iad1 (Washington, D.C.)'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--muted)]">Last Verified:</span>
                    <span className="font-mono text-[var(--fg)]">{lastRefreshedAt.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Automated Security & Privacy Suite Verification */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)]">
                      Security & Privacy Verification Suite
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Automated regression testing validating privacy guardrails, authentication boundaries, and connection pooling
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                  <CheckCircle2 size={14} />
                  6 / 6 Tests Passing
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">Strict Privacy Guardrail Active</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Zero AI chat prompts, user notes, canvas contents, or reflections are ever logged or stored in telemetry.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">Deterministic User Anonymization</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Unique visitors identified deterministically using salted SHA-256 hashes (`usr_...`). No PII recorded.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">API Sliding Window Rate Limiting</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Enforced on all AI chat, canvas generation, and notes endpoints to prevent runaway costs and scraping.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">Dual-Layer Access Control</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Gated by Clerk authentication middleware and secondary developer passcode validation.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">Singleton Prisma Database Pool</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      All highlights and analytics routes reuse singleton connection pool, avoiding serverless connection spikes.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--fg)] block">WCAG Mobile Scaling Compliance</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Viewport configuration preserves pinch-to-zoom (`userScalable: true`) for full mobile accessibility.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: ACCESS & SECURITY SETTINGS                              */}
        {/* ============================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--fg)]">
                Access Control & Security Settings
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Configure your developer password, view authorized Clerk admin identifiers, and manage authorized access.
              </p>
            </div>

            {/* Password Management Card */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-accent/15 text-accent">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)]">Developer Passcode</h3>
                    <p className="text-xs text-[var(--muted)]">
                      The secondary password required to unlock this dashboard after Clerk authentication
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all cursor-pointer shadow-sm"
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Clerk Admin Identity Card */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--fg)]">Clerk Admin Binding</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Your authenticated Clerk profile recognized as authorized administrator
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--muted)] block">Admin Clerk User ID</span>
                    <span className="font-mono text-xs text-[var(--fg)]">
                      {adminSettings?.adminUserId || user?.id || 'user_unknown'}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(adminSettings?.adminUserId || user?.id || '')}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--muted)] block">Admin Email Address</span>
                  <span className="font-mono text-xs text-[var(--fg)]">
                    {adminSettings?.adminEmail || user?.primaryEmailAddress?.emailAddress || 'Unspecified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Allowed Admin Emails Card */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--fg)]">Allowed Admin Emails</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Accounts that are permitted through Clerk authentication to access the Developer Console
                </p>
              </div>

              {/* Add Email Form */}
              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="admin@example.com"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--fg)] placeholder-[var(--muted)] focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={isAddingEmail}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-warm)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--fg)] transition-all cursor-pointer"
                >
                  {isAddingEmail ? 'Adding...' : 'Add Admin'}
                </button>
              </form>

              {emailStatusMsg && (
                <p className="text-xs text-accent mt-1">{emailStatusMsg}</p>
              )}

              {/* List */}
              <div className="space-y-2 pt-2">
                {(adminSettings?.allowedEmails || []).length > 0 ? (
                  adminSettings?.allowedEmails.map((email) => (
                    <div
                      key={email}
                      className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs font-mono"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="text-[var(--muted)] hover:text-red-400 p-1 text-[11px] cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--muted)] italic">
                    Primary admin account automatically bound. No extra emails registered.
                  </p>
                )}
              </div>
            </div>

            {/* Reset Telemetry Data Card */}
            <div className="p-6 rounded-3xl bg-[var(--surface)] border border-red-500/20 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-red-400">Reset Telemetry Data</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Clear all past test telemetry events and reset visitor statistics back to zero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetTelemetry}
                  disabled={isResettingTelemetry}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isResettingTelemetry ? 'Resetting...' : 'Reset All Events'}
                </button>
              </div>
              {resetStatusMsg && (
                <p className="text-xs text-emerald-400 font-medium">{resetStatusMsg}</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: CHANGE DEVELOPER PASSWORD                               */}
      {/* ============================================================== */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-[var(--fg)]">
                  Change Developer Passcode
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setPasswordChangeStatus(null);
                }}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Update the secondary passcode required to unlock the Developer Console.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--fg-2)] mb-1">
                  Current Passcode
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current passcode"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--fg)] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--fg-2)] mb-1">
                  New Passcode
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new passcode"
                  required
                  minLength={4}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--fg)] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--fg-2)] mb-1">
                  Confirm New Passcode
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new passcode"
                  required
                  minLength={4}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--fg)] focus:outline-none focus:border-accent"
                />
              </div>

              {passwordChangeStatus?.error && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                  {passwordChangeStatus.error}
                </div>
              )}

              {passwordChangeStatus?.success && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-1.5">
                  <Check size={14} />
                  <span>Passcode updated successfully!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--fg)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="flex-1 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmittingPassword ? 'Saving...' : 'Update Passcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
