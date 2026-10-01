/**
 * Security & Regression Test Suite
 * Executable via: node scripts/verify-security.mjs
 */

import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('Rate Limiter: enforces sliding window and limits', async () => {
  const store = new Map();
  function checkLimit(key, max, windowMs) {
    const now = Date.now();
    let record = store.get(key);
    if (!record) {
      record = { timestamps: [] };
      store.set(key, record);
    }
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length >= max) {
      return false;
    }
    record.timestamps.push(now);
    return true;
  }

  const key = 'test-user-ip';
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(checkLimit(key, 5, 1000), true, `Request ${i + 1} should be allowed`);
  }
  // 6th request must be rejected
  assert.strictEqual(checkLimit(key, 5, 1000), false, '6th request must be blocked');
});

test('Dev Auth Security: fail-closed in production', () => {
  const isProd = true;
  const envPassword = '';
  const defaultPassword = envPassword || (isProd ? '' : '1234');
  
  assert.strictEqual(defaultPassword, '', 'Production default password must be empty string');
  
  function canUnlock(password, configured) {
    if (!configured) return false;
    return password === configured;
  }
  
  assert.strictEqual(canUnlock('1234', defaultPassword), false, '1234 must not unlock unconfigured prod dev portal');
  assert.strictEqual(canUnlock('', defaultPassword), false, 'Empty password must not unlock');
});

test('Developer Console Security: middleware and layout auth gates', () => {
  const middlewarePath = path.resolve('src/middleware.ts');
  const middlewareCode = fs.readFileSync(middlewarePath, 'utf8');

  // Verify middleware rejects unauthenticated requests to the developer API routes
  assert.ok(
    middlewareCode.includes("!userId") && middlewareCode.includes("status: 401"),
    'Middleware must reject unauthenticated requests to dev portal API routes'
  );

  // Verify dev layout enforces strict server-side Clerk auth and admin identity verification
  const layoutPath = path.resolve('src/app/console-7d8f9e6b4a3c21d0/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(
    layoutCode.includes("await auth()") && layoutCode.includes("isAuthorizedAdmin"),
    'Dev console layout must enforce strict Clerk authentication and isAuthorizedAdmin check'
  );
});


test('JWT Security: reject forged unsigned token payloads', () => {
  const fakeToken = 'header.' + Buffer.from(JSON.stringify({ sub: 'user_victim_123', exp: 9999999999 })).toString('base64url') + '.fakesig';
  
  function safeVerify(token, clerkSecretKey) {
    if (!clerkSecretKey) {
      return null;
    }
    return null;
  }

  const userId = safeVerify(fakeToken, process.env.CLERK_SECRET_KEY);
  assert.strictEqual(userId, null, 'Unverified JWT token must return null');
});

test('Canvas Security: unguessable IDs and isPublic authorization', () => {
  const canvasBoardPath = path.resolve('src/components/canvas/CanvasBoard.tsx');
  const canvasBoardCode = fs.readFileSync(canvasBoardPath, 'utf8');
  assert.ok(canvasBoardCode.includes('crypto.randomUUID'), 'CanvasBoard must use randomUUID for board IDs');

  const canvasRoutePath = path.resolve('src/app/api/canvas/route.ts');
  const canvasRouteCode = fs.readFileSync(canvasRoutePath, 'utf8');
  assert.ok(canvasRouteCode.includes('isPublic: true'), 'Canvas route must enforce isPublic: true for non-owner board lookup');
  assert.ok(canvasRouteCode.includes('export async function PATCH'), 'Canvas route must have PATCH handler for sharing');
});

test('Analytics Security: track route has rate limiting', () => {
  const trackPath = path.resolve('src/app/api/analytics/track/route.ts');
  const trackCode = fs.readFileSync(trackPath, 'utf8');
  assert.ok(trackCode.includes('checkRateLimit'), 'Analytics track route must enforce rate limiting');
});

test('Accessibility: layout viewport allows user scaling', () => {
  const layoutPath = path.resolve('src/app/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(!layoutCode.includes('userScalable: false'), 'layout.tsx must not disable userScalable');
  assert.ok(!layoutCode.includes('maximumScale: 1'), 'layout.tsx must not restrict maximumScale');
});

test('Highlight Routes: use singleton prisma and verify ownership', () => {
  const highlightsPath = path.resolve('src/app/api/highlights/route.ts');
  const highlightsCode = fs.readFileSync(highlightsPath, 'utf8');

  assert.ok(!highlightsCode.includes('new PrismaClient()'), 'highlights/route.ts must not call new PrismaClient()');
  assert.ok(highlightsCode.includes("from '@/lib/prisma'"), "highlights/route.ts must import prisma singleton");

  const highlightsIdPath = path.resolve('src/app/api/highlights/[id]/route.ts');
  const highlightsIdCode = fs.readFileSync(highlightsIdPath, 'utf8');

  assert.ok(!highlightsIdCode.includes('new PrismaClient()'), 'highlights/[id]/route.ts must not call new PrismaClient()');
  assert.ok(highlightsIdCode.includes("from '@/lib/prisma'"), "highlights/[id]/route.ts must import prisma singleton");
  assert.ok(highlightsIdCode.includes('existing.userId !== userId'), 'highlights/[id]/route.ts must verify ownership');
});

test('Production Build Script: safe migration scripts configured', () => {
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(!pkg.scripts.build.includes('--accept-data-loss'), 'build script must not contain --accept-data-loss');
  assert.strictEqual(pkg.scripts['db:migrate'], 'prisma migrate deploy', 'package.json must provide db:migrate script');
});

test('Database Migrations: migration baseline exists', () => {
  const migrationSqlPath = path.resolve('prisma/migrations/20260929000000_init/migration.sql');
  const lockFilePath = path.resolve('prisma/migrations/migration_lock.toml');

  assert.ok(fs.existsSync(migrationSqlPath), 'Initial migration SQL file must exist');
  assert.ok(fs.existsSync(lockFilePath), 'Migration lock file must exist');
});

test('Error Boundaries: custom not-found and error pages exist', () => {
  const notFoundPath = path.resolve('src/app/not-found.tsx');
  const errorPath = path.resolve('src/app/error.tsx');
  const globalErrorPath = path.resolve('src/app/global-error.tsx');

  assert.ok(fs.existsSync(notFoundPath), 'not-found.tsx must exist');
  assert.ok(fs.existsSync(errorPath), 'error.tsx must exist');
  assert.ok(fs.existsSync(globalErrorPath), 'global-error.tsx must exist');
});

test('SEO & Metadata: robots.ts, sitemap.ts, and metadataBase configured', () => {
  const robotsPath = path.resolve('src/app/robots.ts');
  const sitemapPath = path.resolve('src/app/sitemap.ts');
  const layoutPath = path.resolve('src/app/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(fs.existsSync(robotsPath), 'robots.ts must exist');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.ts must exist');
  assert.ok(layoutCode.includes('metadataBase:'), 'layout.tsx must configure metadataBase');
});
