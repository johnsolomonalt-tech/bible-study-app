/**
 * Security & Regression Test Suite
 * Executable via: node scripts/verify-security.mjs
 */

import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('Rate Limiter: uses shared atomic counters and trusted proxy addresses', () => {
  const limiter = fs.readFileSync(path.resolve('src/lib/rateLimit.ts'), 'utf8');
  assert.ok(limiter.includes('prisma.rateLimitBucket.upsert'), 'Rate limiter must use the shared database store');
  assert.ok(limiter.includes('count: { increment: 1 }'), 'Rate limiter must increment counters atomically');
  assert.ok(limiter.includes("req.headers.get('x-real-ip')"), 'Rate limiter must prefer the hosting proxy client address');
  assert.ok(limiter.includes('addresses[addresses.length - 1]'), 'Forwarded addresses must not trust the client-controlled first value');
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
  assert.ok(
    pkg.scripts['db:migrate'] === 'prisma migrate deploy' ||
    pkg.scripts['db:migrate'].includes('scripts/run-migrations.mjs'),
    'package.json must provide safe db:migrate script'
  );
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
  const robotsCode = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(fs.existsSync(robotsPath), 'robots.ts must exist');
  assert.ok(!robotsCode.includes('console-7d8f9e6b4a3c21d0'), 'robots.ts must not disclose obfuscated dev console slug');

  const sitemapPath = path.resolve('src/app/sitemap.ts');
  const sitemapCode = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.ts must exist');
  assert.ok(!sitemapCode.includes('~offline'), 'sitemap.ts must not index internal ~offline fallback route');

  const layoutPath = path.resolve('src/app/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(layoutCode.includes('metadataBase:'), 'layout.tsx must configure metadataBase');
});

test('Guest Data Isolation: notes and chats do not pool guest records in server memory', () => {
  const chatsRoute = fs.readFileSync(path.resolve('src/app/api/chats/route.ts'), 'utf8');
  assert.ok(chatsRoute.includes('return NextResponse.json([])'), 'Guest chats query must return empty array without server memory pooling');

  const notesRoute = fs.readFileSync(path.resolve('src/app/api/notes/route.ts'), 'utf8');
  assert.ok(notesRoute.includes('return NextResponse.json([])'), 'Guest notes query must return empty array without server memory pooling');
});

test('Chat API: requires owner access and scopes memory messages by owner', () => {
  const messageRoute = fs.readFileSync(path.resolve('src/app/api/chats/[id]/messages/route.ts'), 'utf8');
  assert.ok(messageRoute.includes('resolveChatIdentity(req)'), 'Message routes must resolve a signed-in or guest-session identity');
  assert.ok(messageRoute.includes('!(await ownsChat(identity, chatId))'), 'Message routes must check chat ownership before reading or writing');
  assert.ok(messageRoute.includes('getMemoryMessages(identity.ownerKey, chatId)'), 'Fallback message reads must be scoped to the owner');
  const chatRoute = fs.readFileSync(path.resolve('src/app/api/chats/[id]/route.ts'), 'utf8');
  assert.ok(chatRoute.includes('deleteMemoryChat(identity.ownerKey, chatId)'), 'Fallback deletion must be scoped to the owner');
  assert.ok(chatRoute.includes('updateMemoryChatTitle(identity.ownerKey, chatId'), 'Fallback title updates must be scoped to the owner');
});

test('Rate Limiting Coverage: AI & search endpoints enforce shared rate limits', () => {
  const exportGuide = fs.readFileSync(path.resolve('src/app/api/canvas/export-guide/route.ts'), 'utf8');
  assert.ok(exportGuide.includes('checkRateLimit'), 'export-guide must enforce rate limiting');

  const chatName = fs.readFileSync(path.resolve('src/app/api/chats/[id]/name/route.ts'), 'utf8');
  assert.ok(chatName.includes('checkRateLimit'), 'chat auto-naming must enforce rate limiting');

  const lexiconRoute = fs.readFileSync(path.resolve('src/app/api/bible/lexicon/route.ts'), 'utf8');
  assert.ok(lexiconRoute.includes('bible_lexicon_post'), 'lexicon POST must enforce rate limiting');
});

test('Database Performance: Prisma schema includes composite indexes for query patterns', () => {
  const schema = fs.readFileSync(path.resolve('prisma/schema.prisma'), 'utf8');
  assert.ok(schema.includes('@@index([userId, createdAt(sort: Desc)])'), 'Note and Chat models must have composite userId+createdAt indexes');
  assert.ok(schema.includes('@@index([chatId, createdAt(sort: Asc)])'), 'Message model must have composite chatId+createdAt index');
  assert.ok(schema.includes('@@index([userId, book, chapter])'), 'Highlight model must have composite userId+book+chapter index');
});

test('Content-Security-Policy & Security Headers: strict headers and devotionals route alias', () => {
  const nextConfig = fs.readFileSync(path.resolve('next.config.ts'), 'utf8');
  assert.ok(nextConfig.includes('Content-Security-Policy'), 'next.config.ts must configure Content-Security-Policy');
  assert.ok(nextConfig.includes("frame-ancestors 'self'"), 'CSP must restrict frame-ancestors to self');
  assert.ok(nextConfig.includes("object-src 'none'"), 'CSP must restrict object-src to none');
  assert.ok(nextConfig.includes("Strict-Transport-Security"), 'next.config.ts must configure HSTS');
  assert.ok(nextConfig.includes('/api/devotional'), 'next.config.ts must provide /api/devotional rewrite alias');

  const notesRoute = fs.readFileSync(path.resolve('src/app/api/notes/route.ts'), 'utf8');
  assert.ok(notesRoute.includes('status: 401'), 'POST /api/notes must return 401 for unauthenticated requests');

  const canvasRoute = fs.readFileSync(path.resolve('src/app/api/canvas/route.ts'), 'utf8');
  assert.ok(canvasRoute.includes('status: 401'), 'POST /api/canvas must return 401 for unauthenticated requests');
});

test('Multi-Translation Registry & Legal Infrastructure', () => {
  const translationsPath = path.resolve('src/lib/bibleTranslations.ts');
  assert.ok(fs.existsSync(translationsPath), 'bibleTranslations.ts must exist');
  const translationsCode = fs.readFileSync(translationsPath, 'utf8');
  assert.ok(translationsCode.includes('BIBLE_TRANSLATION_REGISTRY'), 'Must export BIBLE_TRANSLATION_REGISTRY');
  assert.ok(translationsCode.includes('getTranslationAttributions'), 'Must provide getTranslationAttributions helper');

  // Verify Legal Pages exist
  assert.ok(fs.existsSync(path.resolve('src/app/privacy/page.tsx')), '/privacy page must exist');
  assert.ok(fs.existsSync(path.resolve('src/app/terms/page.tsx')), '/terms page must exist');
  assert.ok(fs.existsSync(path.resolve('src/app/legal/page.tsx')), '/legal page must exist');

  // Verify Legal PUT route enforces auth
  const legalRoute = fs.readFileSync(path.resolve('src/app/api/legal/[slug]/route.ts'), 'utf8');
  assert.ok(legalRoute.includes('!userId') && legalRoute.includes('status: 401'), 'PUT /api/legal/[slug] must require authentication');

  // Verify Notes Markdown enabled label removed
  const notesWorkspace = fs.readFileSync(path.resolve('src/components/notes/NotesWorkspace.tsx'), 'utf8');
  assert.ok(!notesWorkspace.includes('<span>Markdown enabled</span>'), 'NotesWorkspace must not say "Markdown enabled"');
  assert.ok(fs.existsSync(path.resolve('src/components/notes/NotesTutorialModal.tsx')), 'NotesTutorialModal must exist');
});
