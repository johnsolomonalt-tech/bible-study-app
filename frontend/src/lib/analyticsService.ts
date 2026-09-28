import crypto from 'crypto';
import prisma from '@/lib/prisma';

export interface RawAnalyticsEvent {
  id: string;
  eventType: string;
  anonymousId: string;
  metadata?: any;
  timestamp: Date;
}

// In-memory ring buffer for fallback when DB is unreachable or during development
const MAX_MEMORY_EVENTS = 2000;
const memoryEvents: RawAnalyticsEvent[] = [];

/**
 * Anonymize user identifier deterministically to ensure zero PII is stored
 * while preserving consistent unique-visitor counting (1 visitor across multiple sessions).
 */
export function anonymizeIdentifier(rawId: string): string {
  const cleanId = (rawId || 'unknown_guest').trim();
  const salt = process.env.ANALYTICS_SALT || 'theologica_analytics_anonymizer_salt';
  return 'usr_' + crypto.createHash('sha256').update(cleanId + salt).digest('hex').substring(0, 12);
}

/**
 * Record an anonymized operational event.
 * Strictly strips any potential user text/content.
 */
export async function recordAnalyticsEvent(
  eventType: string,
  rawAnonymousId: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Privacy Guardrail: Ensure no personal content keys exist
  const safeMetadata: Record<string, any> = {};
  if (metadata && typeof metadata === 'object') {
    // Only allow specific approved operational flags
    const allowedKeys = ['feature', 'screen', 'action', 'mode', 'translation', 'platform', 'path', 'book', 'chapter'];
    for (const key of allowedKeys) {
      if (metadata[key] !== undefined && typeof metadata[key] !== 'object') {
        safeMetadata[key] = String(metadata[key]).substring(0, 50); // limit string length
      }
    }
  }

  const anonymousId = anonymizeIdentifier(rawAnonymousId);
  const now = new Date();

  const eventRecord: RawAnalyticsEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    eventType,
    anonymousId,
    metadata: safeMetadata,
    timestamp: now,
  };

  // Add to memory ring buffer
  memoryEvents.unshift(eventRecord);
  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.pop();
  }

  // Persist to Postgres via Prisma
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        anonymousId,
        metadata: safeMetadata,
        timestamp: now,
      },
    });
  } catch (err) {
    // Fail silently to in-memory store so app never errors on telemetry
    console.warn('Analytics event db save skipped/failed:', (err as any)?.message || err);
  }
}

/**
 * Fetch aggregated statistics for the developer dashboard.
 */
export async function getAnalyticsDashboardStats(rangeDays: number = 7) {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);
  startDate.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  let events: RawAnalyticsEvent[] = [];

  try {
    const dbEvents = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });
    if (dbEvents && dbEvents.length > 0) {
      events = dbEvents.map(e => ({
        id: e.id,
        eventType: e.eventType,
        anonymousId: e.anonymousId,
        metadata: e.metadata,
        timestamp: e.timestamp,
      }));
    }
  } catch (err) {
    console.warn('Prisma analytics query failed, using memory store:', (err as any)?.message || err);
  }

  // If DB returned nothing or failed, use in-memory events filtered by date
  if (events.length === 0 && memoryEvents.length > 0) {
    events = memoryEvents.filter(e => e.timestamp >= startDate);
    events.reverse(); // put into ascending order
  }

  // Feature engagement counts
  const featureCounts: Record<string, number> = {
    session_start: 0,
    page_view: 0,
    scripture_read: 0,
    ai_chat_prompt: 0,
    ai_chat_opened: 0,
    chat_file_upload: 0,
    canvas_opened: 0,
    canvas_created: 0,
    canvas_ai_generate: 0,
    canvas_shared: 0,
    canvas_imported: 0,
    note_created: 0,
    notes_ai_generate: 0,
    highlight_created: 0,
    highlight_deleted: 0,
    lectio_started: 0,
    reading_tracker_updated: 0,
    interlinear_opened: 0,
    rate_limit_blocked: 0,
  };

  // Daily map initialization
  const dailyMap: Record<string, { sessions: number; activeUsers: Set<string>; events: number }> = {};
  for (let d = 0; d <= rangeDays; d++) {
    const dateObj = new Date(startDate);
    dateObj.setDate(dateObj.getDate() + d);
    const key = dateObj.toISOString().split('T')[0];
    dailyMap[key] = { sessions: 0, activeUsers: new Set(), events: 0 };
  }

  // Hourly distribution: 24 buckets
  const hourlyDistribution = new Array(24).fill(0);

  // Today & Yesterday counters
  let totalSessionsToday = 0;
  let totalSessionsYesterday = 0;
  const dauTodaySet = new Set<string>();
  const dauYesterdaySet = new Set<string>();
  const activeUsersTotalSet = new Set<string>();

  for (const event of events) {
    const time = new Date(event.timestamp);
    const dateKey = time.toISOString().split('T')[0];
    const hour = time.getHours();

    hourlyDistribution[hour]++;
    activeUsersTotalSet.add(event.anonymousId);

    if (featureCounts[event.eventType] !== undefined) {
      featureCounts[event.eventType]++;
    } else {
      featureCounts[event.eventType] = (featureCounts[event.eventType] || 0) + 1;
    }

    if (dailyMap[dateKey]) {
      dailyMap[dateKey].events++;
      dailyMap[dateKey].activeUsers.add(event.anonymousId);
      if (event.eventType === 'session_start') {
        dailyMap[dateKey].sessions++;
      }
    }

    if (time >= todayStart) {
      dauTodaySet.add(event.anonymousId);
      if (event.eventType === 'session_start') totalSessionsToday++;
    } else if (time >= yesterdayStart && time < todayStart) {
      dauYesterdaySet.add(event.anonymousId);
      if (event.eventType === 'session_start') totalSessionsYesterday++;
    }
  }

  // Format daily trends
  const dailyTrends = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    dayLabel: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    sessions: data.sessions,
    activeUsers: data.activeUsers.size,
    totalEvents: data.events,
  }));

  // Identify busiest and quietest days
  let busiestDay = dailyTrends[0] || null;
  let quietestDay = dailyTrends[0] || null;

  for (const day of dailyTrends) {
    if (day.totalEvents > (busiestDay?.totalEvents || 0)) {
      busiestDay = day;
    }
    if (day.totalEvents < (quietestDay?.totalEvents ?? Infinity)) {
      quietestDay = day;
    }
  }

  return {
    periodDays: rangeDays,
    totalEvents: events.length,
    totalSessionsToday,
    sessionsYesterday: totalSessionsYesterday,
    dauToday: dauTodaySet.size,
    dauYesterday: dauYesterdaySet.size,
    activeUsersPeriod: activeUsersTotalSet.size,
    featureCounts,
    dailyTrends,
    hourlyDistribution,
    busiestDay: busiestDay ? { date: busiestDay.date, events: busiestDay.totalEvents } : null,
    quietestDay: quietestDay ? { date: quietestDay.date, events: quietestDay.totalEvents } : null,
  };
}

/**
 * Fetch the recent chronological stream of anonymous events.
 */
export async function getRecentAnonymousEvents(limit: number = 50): Promise<RawAnalyticsEvent[]> {
  try {
    const dbEvents = await prisma.analyticsEvent.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
    if (dbEvents && dbEvents.length > 0) {
      return dbEvents.map(e => ({
        id: e.id,
        eventType: e.eventType,
        anonymousId: e.anonymousId,
        metadata: e.metadata,
        timestamp: e.timestamp,
      }));
    }
  } catch (err) {
    console.warn('Prisma recent events query failed, using memory store:', err);
  }

  return memoryEvents.slice(0, limit);
}

/**
 * Clear all recorded telemetry events (admin maintenance / reset).
 */
export async function clearAllAnalyticsEvents(): Promise<void> {
  memoryEvents.length = 0;
  try {
    await prisma.analyticsEvent.deleteMany({});
  } catch (err) {
    console.warn('Prisma clear events error:', err);
  }
}
