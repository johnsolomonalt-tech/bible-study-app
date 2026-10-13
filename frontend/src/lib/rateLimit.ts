import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';

interface RateLimitRecord {
  timestamps: number[];
}

const localStore = new Map<string, RateLimitRecord>();
let callsSinceCleanup = 0;

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

function checkLocalRateLimit(identifier: string, windowMs: number, maxRequests: number): RateLimitResult {
  const now = Date.now();
  const record = localStore.get(identifier) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < windowMs);
  if (record.timestamps.length >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds: Math.max(1, Math.ceil((record.timestamps[0] + windowMs - now) / 1000)),
    };
  }
  record.timestamps.push(now);
  localStore.set(identifier, record);
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

/** Uses an atomic database counter so limits are shared by all running instances. */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 20;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const resetAt = (windowStart + 1) * windowMs;
  const id = createHash('sha256').update(`${identifier}:${windowStart}`).digest('hex');

  if (process.env.DATABASE_URL) {
    try {
      const bucket = await prisma.rateLimitBucket.upsert({
        where: { id },
        create: { id, count: 1, expiresAt: new Date(resetAt) },
        update: { count: { increment: 1 } },
        select: { count: true },
      });

      callsSinceCleanup += 1;
      if (callsSinceCleanup >= 1000) {
        callsSinceCleanup = 0;
        void prisma.rateLimitBucket.deleteMany({
          where: { expiresAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
        }).catch(() => {});
      }

      return {
        success: bucket.count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - bucket.count),
        resetSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    } catch (error) {
      console.error('Shared rate-limit store unavailable; using process-local fallback:', error);
    }
  }

  return checkLocalRateLimit(identifier, windowMs, maxRequests);
}

/** Prefer the address supplied by the hosting proxy; use the right-most forwarded
 * address because trusted proxies append to this header after client input. */
export function getClientIp(req: Request): string {
  const direct = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (direct?.trim()) return direct.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const addresses = forwarded.split(',').map((address) => address.trim()).filter(Boolean);
    if (addresses.length) return addresses[addresses.length - 1];
  }
  return 'unknown-client';
}
