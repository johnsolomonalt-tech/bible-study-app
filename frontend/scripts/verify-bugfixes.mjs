/** Behavioral audit regressions. No real database, auth service, or AI calls. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const quiet = { log() {}, warn() {}, error() {} };
function loader(stubs = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const compiledModule = { exports: {} };
    cache.set(file, compiledModule);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const localRequire = id => {
      if (Object.hasOwn(stubs, id)) return stubs[id];
      if (id.startsWith('@/')) return load('src/' + id.slice(2));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      return require(id);
    };
    vm.runInNewContext(source, { module: compiledModule, exports: compiledModule.exports, require: localRequire, process: { cwd: () => process.cwd(), env: { DATABASE_URL: 'mock-db', GUEST_CHAT_SECRET: 'test-secret-at-least-32-characters-long' } }, Buffer, console: quiet, Request, Response, URL, crypto: globalThis.crypto, ...globals }, { filename: file });
    return compiledModule.exports;
  }
  return load;
}
const req = (url = '/', body, headers = {}) => new Request('https://example.test' + url, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

test('Chat authorization denies foreign/missing IDs without creating records', async () => {
  let writes = 0;
  const load = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: 'attacker' }) }, '@/lib/prisma': { chat: { findUnique: async ({ where }) => where.id === 12 ? { userId: 'victim' } : null, create: () => { writes++; } } } });
  const identity = load('src/lib/chatIdentity.ts');
  const memory = load('src/lib/memoryChatStore.ts');
  const actor = await identity.resolveChatIdentity(req());
  assert.equal(await identity.ownsChat(actor, 12), false);
  assert.equal(await identity.ownsChat(actor, 13), false);
  assert.equal(await identity.ownsChat(actor, 1.5), false);
  memory.addMemoryChat(actor.ownerKey, { id: 12 });
  assert.equal(await identity.ownsChat(actor, 12), false, 'memory collision cannot override DB ownership');
  memory.addMemoryChat(actor.ownerKey, { id: 14 });
  assert.equal(await identity.ownsChat(actor, 14), true);
  assert.equal(writes, 0);
});

test('Guests on the same IP receive distinct signed cookies and cannot share chats', async () => {
  const load = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: null }) }, '@/lib/prisma': {} });
  const chats = load('src/app/api/chats/route.ts');
  const identity = load('src/lib/chatIdentity.ts');
  const a = await chats.POST(req('/api/chats', {}, { 'x-forwarded-for': '10.0.0.1' }));
  const b = await chats.POST(req('/api/chats', {}, { 'x-forwarded-for': '10.0.0.1' }));
  const cookieA = a.headers.get('set-cookie').split(';')[0];
  const cookieB = b.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookieA, cookieB);
  assert.match(a.headers.get('set-cookie'), /HttpOnly/);
  const actorA = await identity.resolveChatIdentity(req('/', undefined, { cookie: cookieA }));
  const actorB = await identity.resolveChatIdentity(req('/', undefined, { cookie: cookieB }));
  const chatA = await a.json();
  assert.equal(await identity.ownsChat(actorA, chatA.id), true);
  assert.equal(await identity.ownsChat(actorB, chatA.id), false);
  const bad = await identity.resolveChatIdentity(req('/', undefined, { cookie: 'theologica_guest_chat=%E0%A4%A' }));
  assert.equal(bad.ownerKey, '');
});

test('Guest chat fails closed when signing secrets are not configured', async () => {
  const load = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: null }) }, '@/lib/prisma': {} }, { process: { env: {} } });
  assert.equal(load('src/lib/chatIdentity.ts').createGuestChatSession(), null);
  assert.equal((await load('src/app/api/chats/route.ts').POST(req('/api/chats', {}))).status, 503);
});

test('Public canvas access is revoked for guest and signed-in non-owner', async () => {
  for (const userId of [null, 'reader']) {
    let published = true;
    const record = { userId: 'owner', boardId: 'board-1', nodes: [], edges: [], title: 'Secret', updatedAt: new Date() };
    const load = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId }) }, '@/lib/prisma': { canvas: { findUnique: async () => null, findFirst: async () => published ? record : null } } });
    const route = load('src/app/api/canvas/route.ts');
    assert.equal((await route.GET(req('/api/canvas?id=board-1'))).status, 200);
    published = false;
    assert.equal((await route.GET(req('/api/canvas?id=board-1'))).status, 404);
  }
});

test('Canvas sharing rejects truthy strings instead of publishing a private board', async () => {
  let writes = 0;
  const route = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: 'owner' }) }, '@/lib/prisma': { canvas: { updateMany: async () => { writes++; return { count: 1 }; } } } })('src/app/api/canvas/route.ts');
  assert.equal((await route.PATCH(req('/api/canvas', { id: 'board-1', isPublic: 'false' }))).status, 400);
  assert.equal(writes, 0);
});

test('Legal edits require the developer guard, even for signed-in users', async () => {
  let writes = 0;
  const load = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: 'ordinary-user' }) }, '@/lib/devGuard': { checkDevAuthorization: async () => ({ authorized: false, response: new Response(null, { status: 403 }) }) }, '@/lib/legalContentStore': { saveLegalDocument: () => { writes++; } } });
  assert.equal((await load('src/app/api/legal/[slug]/route.ts').PUT(req('/api/legal/terms', { content: 'changed' }), { params: Promise.resolve({ slug: 'terms' }) })).status, 403);
  assert.equal(writes, 0);
});

test('Legal editor source does not accumulate generated attribution sections', () => {
  const store = loader()('src/lib/legalContentStore.ts');
  const raw = store.getLegalDocument('legal', false);
  const rendered = store.getLegalDocument('legal');
  assert.ok(rendered.content.length > raw.content.length);
  assert.ok(!raw.content.includes('### Open Source Software Notices'));
});

test('Failed legal persistence throws and does not mutate the published cache', () => {
  const load = loader({ fs: { existsSync: () => false, writeFileSync: () => { throw new Error('Read-only filesystem'); } } });
  const store = load('src/lib/legalContentStore.ts');
  const original = store.getLegalDocument('terms').content;
  assert.throws(() => store.saveLegalDocument('terms', 'replacement'), /Read-only/);
  assert.equal(store.getLegalDocument('terms').content, original);
});

test('Missing memory notes return 404 and partial numeric IDs are rejected', async () => {
  const route = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: 'owner' }) }, '@/lib/prisma': {} }, { process: { env: {} } })('src/app/api/notes/[id]/route.ts');
  const update = id => route.PUT(req('/api/notes/' + id, { title: 'a', content: 'b' }), { params: Promise.resolve({ id }) });
  assert.equal((await update('999')).status, 404);
  assert.equal((await update('999oops')).status, 400);
  assert.equal((await update('-1')).status, 400);
});

test('Bible provider validates bounds and discovers local sources from registry', async () => {
  const load = loader({}, { fetch: async url => { assert.equal(url, '/bibles/bsb/GEN.json'); return Response.json({ chapters: { 1: [{ verse: 1, text: 'In the beginning' }] } }); } });
  const provider = load('src/lib/bibleProvider.ts');
  await assert.rejects(provider.getPassage('bsb', 'Genesis', 0), /Invalid chapter/);
  await assert.rejects(provider.getPassage('bsb', 'Genesis', 51), /Invalid chapter/);
  const result = await provider.getPassage('bsb', 'Genesis', 1, 1);
  assert.equal(result.verse.text, 'In the beginning');
  assert.match(result.chapter.copyright, /Berean/);
});

test('Bible API keeps legitimate three-digit scripture numbers', async () => {
  const load = loader({ '@/lib/rateLimit': { checkRateLimit: async () => ({ success: true }), getClientIp: () => 'test' } }, { fetch: async () => Response.json([{ verse: 1, text: '<p>He lived 969 years.<S>1234</S></p>' }]) });
  const response = await load('src/app/api/bible/[version]/[book]/[chapter]/route.ts').GET(req('/api/bible/asv/GEN/5'), { params: Promise.resolve({ version: 'asv', book: 'GEN', chapter: '5' }) });
  assert.equal((await response.json()).verses[0].text, 'He lived 969 years.');
});

function pageFunction(start, end, context) {
  const page = fs.readFileSync('src/app/(main)/page.tsx', 'utf8');
  const source = page.slice(page.indexOf(start), page.indexOf(end, page.indexOf(start)));
  const name = start.match(/const (\w+)/)[1];
  const compiled = ts.transpileModule(source + `\nexports.fn = ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, console: quiet, Date, ...context });
  return exports.fn;
}

test('Editing two notes retains both pending cloud saves', async () => {
  const timers = new Map(); let seq = 0; const sent = [];
  let notes = [{ id: 1 }, { id: 2 }];
  const update = pageFunction('  const updateNote =', '\n  const handleNewChat', {
    setNotes: fn => { notes = fn(notes); }, saveLocalNotes() {}, noteSaveTimersRef: { current: new Map() },
    setTimeout: fn => { timers.set(++seq, fn); return seq; }, clearTimeout: id => timers.delete(id),
    fetchWithAuth: async (url, options) => { sent.push({ url, body: JSON.parse(options.body) }); }, API_URL: '',
  });
  await update(1, 'First', 'first edit');
  await update(2, 'Second', 'second edit');
  assert.equal(timers.size, 2);
  for (const fn of timers.values()) await fn();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].body.content, 'first edit');
});

test('Guest quick notes remain valid local drafts without a cloud request', async () => {
  let notes = []; let requests = 0;
  const update = pageFunction('  const handleQuickNoteChange =', '\n  const isCompleted =', {
    chapterNote: undefined, chapterTitle: 'Genesis 1', userId: null,
    setNotes: fn => { notes = fn(notes); }, saveLocalNotes() {}, fetchWithAuth: async () => { requests++; },
  });
  await update({ target: { value: 'My study draft' } });
  assert.equal(notes[0].content, 'My study draft');
  assert.ok(Number.isSafeInteger(notes[0].id));
  assert.equal(requests, 0);
});

test('Private API requests bypass the service-worker cache and uncached offline Bible yields 503', async () => {
  const handlers = {};
  const context = { self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { handlers[name] = fn; } }, URL, Response, console: quiet, caches: { open: async () => ({ match: async () => undefined }) }, fetch: async () => { throw new Error('offline'); } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  let result;
  handlers.fetch({ request: req('/api/notes'), respondWith: promise => { result = promise; } });
  assert.equal(result, undefined);
  handlers.fetch({ request: req('/api/bible/asv/GEN/1'), waitUntil() {}, respondWith: promise => { result = promise; } });
  assert.equal((await result).status, 503);
});

test('Chat message endpoints reject malformed payloads and never remap oversized IDs', async () => {
  let ownershipChecks = 0;
  const load = loader({
    '@google/genai': { GoogleGenAI: class {} },
    '@/lib/prisma': {},
    '@/lib/bibleReferences': { BIBLE_VERSE_REGEX: /(Genesis) (\d+):(\d+)/ },
    '@/lib/chatSources': {},
    '@/lib/chatIdentity': { resolveChatIdentity: async () => ({ kind: 'user', userId: 'owner', ownerKey: 'user:owner' }), ownsChat: async () => { ownershipChecks++; return true; } },
    '@/lib/rateLimit': { checkRateLimit: async () => ({ success: true }), getClientIp: () => 'test' },
    '@/lib/analyticsService': {},
  }, { process: { env: { GEMINI_API_KEY: 'fake-key' } } });
  const route = load('src/app/api/chats/[id]/messages/route.ts');
  const context = id => ({ params: Promise.resolve({ id }) });
  assert.equal((await route.GET(req('/api/chats/2147483648/messages'), context('2147483648'))).status, 404);
  assert.equal(ownershipChecks, 0);
  assert.equal((await route.POST(req('/api/chats/1/messages', { content: ['unexpected'] }), context('1'))).status, 400);
  const malformed = new Request('https://example.test/api/chats/1/messages', { method: 'POST', body: '{bad json' });
  assert.equal((await route.POST(malformed, context('1'))).status, 400);
});

test('Failed signed-in quick note creation preserves the original local draft', async () => {
  let notes = [];
  const update = pageFunction('  const handleQuickNoteChange =', '\n  const isCompleted =', {
    chapterNote: undefined, chapterTitle: 'Genesis 1', userId: 'owner', API_URL: '',
    setNotes: fn => { notes = fn(notes); }, saveLocalNotes() {}, fetchWithAuth: async () => Response.json({ error: 'Unavailable' }, { status: 503 }),
  });
  await update({ target: { value: 'Do not lose this' } });
  assert.equal(notes[0].content, 'Do not lose this');
  assert.equal(notes[0].title, 'Genesis 1');
  assert.ok(notes[0].id);
});

test('PDF export escapes note titles rather than injecting HTML', () => {
  const source = fs.readFileSync('src/components/notes/NotesWorkspace.tsx', 'utf8');
  const start = source.indexOf('  const handleExport =');
  const snippet = source.slice(start, source.indexOf('\n  const handleCopyNote', start));
  const compiled = ts.transpileModule(snippet + '\nexports.fn = handleExport;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let html = '';
  const exports = {};
  vm.runInNewContext(compiled, { exports, activeNote: { id: 1 }, draftTitle: '</title><script>bad()</script>', draftContent: '<private note>', setIsActionsMenuOpen() {}, setTimeout() {}, window: { open: () => ({ document: { write: text => { html = text; }, close() {} }, focus() {} }) } });
  exports.fn('pdf');
  assert.ok(!html.includes('<script>bad()'));
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(html.includes('&lt;private note&gt;'));
});

test('Devotional navigation skips the leap-day dataset entry in ordinary years', () => {
  const { toDevotionalDatasetDay } = loader()('src/lib/devotionals.ts');
  assert.equal(toDevotionalDatasetDay(59, 2026), 59);
  assert.equal(toDevotionalDatasetDay(60, 2026), 61);
  assert.equal(toDevotionalDatasetDay(365, 2026), 366);
  assert.equal(toDevotionalDatasetDay(60, 2028), 60);
});

test('Tab synchronization leaves the original deep link intact until restoration', () => {
  const source = fs.readFileSync('src/app/(main)/page.tsx', 'utf8');
  const start = source.indexOf('  // Synchronize activeTab only');
  const callbackStart = source.indexOf('() => {', start);
  const end = source.indexOf('}, [activeTab, hasRestoredPreferences]', callbackStart);
  const callback = source.slice(callbackStart, end + 1);
  let writes = 0;
  const fn = vm.runInNewContext('(' + callback + ')', { hasRestoredPreferences: false, setPreference: () => { writes++; }, window: { location: { href: 'https://example.test/?tab=canvas' } } });
  fn();
  assert.equal(writes, 0);
});

test('Streak sync reports account read and write failures instead of false success', async () => {
  for (const failure of ['read', 'write']) {
    const route = loader({
      '@clerk/nextjs/server': { auth: async () => ({ userId: 'owner' }), clerkClient: async () => ({ users: { getUser: async () => { if (failure === 'read') throw new Error('offline'); return { unsafeMetadata: {} }; }, updateUserMetadata: async () => { throw new Error('save failed'); } } }) },
      '@/lib/prisma': { tracker: { findMany: async () => [] } }, '@/lib/analyticsService': {},
    })('src/app/api/streak/route.ts');
    assert.equal((await route.POST(req('/api/streak', { activeDates: [] }))).status, 503);
    if (failure === 'read') assert.equal((await route.GET()).status, 503);
  }
});

test('Malformed note creates do not persist blank or non-string records', async () => {
  let writes = 0;
  const route = loader({ '@clerk/nextjs/server': { auth: async () => ({ userId: 'owner' }) }, '@/lib/prisma': { note: { create: async () => { writes++; } } } })('src/app/api/notes/route.ts');
  assert.equal((await route.POST(req('/api/notes', { title: { invalid: true } }))).status, 400);
  assert.equal((await route.POST(new Request('https://example.test/api/notes', { method: 'POST', body: '{invalid' }))).status, 400);
  assert.equal(writes, 0);
});

test('Database message writes connect through the authenticated owner filter', async () => {
  const source = fs.readFileSync('src/app/api/chats/[id]/messages/route.ts', 'utf8');
  const start = source.indexOf('async function saveOrMockMessage');
  const snippet = source.slice(start, source.indexOf('\nexport async function GET', start));
  const compiled = ts.transpileModule(snippet + '\nexports.fn = saveOrMockMessage;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let write;
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env: { DATABASE_URL: 'mock' } }, isValidDbId: () => true, prisma: { message: { create: async input => { write = input; return { id: 1 }; } } } });
  await exports.fn({ content: 'A message', role: 'user', chatId: 12, identity: { kind: 'user', userId: 'owner' } });
  assert.equal(write.data.chat.connect.id, 12);
  assert.equal(write.data.chat.connect.userId, 'owner');
  assert.equal(write.data.chatId, undefined);
});


test('Chat starters are deterministic, bounded, and follow the current passage', () => {
  const { buildChatSuggestions } = loader()('src/lib/chatSuggestions.ts');
  const context = { book: 'Genesis', chapter: 1 };
  const result = buildChatSuggestions(context);
  assert.equal(result.questions.length, 2);
  assert.equal(new Set(result.questions).size, 2);
  assert.deepEqual(result, buildChatSuggestions(context));
  const changed = buildChatSuggestions({ book: 'John', chapter: 3 });
  assert.ok(changed.questions.every(q => q.includes('John 3')));
  const quote = buildChatSuggestions({ ...context, quotedReference: 'Romans 8:28–30' });
  assert.ok(quote.questions.every(q => q.includes('Romans 8:28–30')));
});

test('Chat starters use recent interests without carrying an old passage or language assumption', () => {
  const { buildChatSuggestions } = loader()('src/lib/chatSuggestions.ts');
  const result = buildChatSuggestions({ book: 'John', chapter: 1, recentMessages: ['Hebrew words in Genesis 1'] });
  assert.match(result.questions[1], /original-language.*John 1/);
  assert.doesNotMatch(result.questions[1], /Hebrew|Genesis/);
  assert.match(result.source, /recent study interests/);
  const prayer = buildChatSuggestions({ book: 'Psalms', chapter: 23, recentMessages: ['Help me pray', 'Greek words'] });
  assert.match(prayer.questions[1], /pray through Psalms 23/);
});

test('Chat starters fall back safely for unknown interests and empty quoted references', () => {
  const { buildChatSuggestions } = loader()('src/lib/chatSuggestions.ts');
  const result = buildChatSuggestions({ book: 'Romans', chapter: 8, quotedReference: ' ', recentMessages: ['unrelated topic'], lens: 'patristic' });
  assert.equal(result.reference, 'Romans 8');
  assert.match(result.questions[1], /early Christians/);
  assert.equal(result.questions.length, 2);
});


test('Tracker touch taps toggle once, suppress duplicate clicks, and ignore scrolling', async () => {
  const source = fs.readFileSync('src/app/(main)/page.tsx', 'utf8');
  const toggle = source.slice(source.indexOf('  const toggleAnyChapter ='), source.indexOf('  const toggleBookAllChapters ='));
  const touch = source.slice(source.indexOf('  const handleChapterGridTouchStart ='), source.indexOf('  // Active reading dwell timer:'));
  let completed = [], writes = 0, habits = 0;
  const lastTap = { current: null }, touchStart = { current: null };
  const globals = {
    lastMobileChapterTapRef: lastTap, chapterGridTouchStartRef: touchStart,
    completedChapters: completed,
    setCompletedChapters(fn) { completed = fn(completed); globals.completedChapters = completed; },
    localStorage: { setItem() {} }, recordHabitActivity() { habits++; }, unmarkChapterActivity() {},
    fetchWithAuth: async () => { writes++; }, API_URL: '', trackClientEvent() {}, queueStreakPush() {}, dailyChapterGoalRef: { current: 3 },
    Date, Math, JSON,
  };
  vm.runInNewContext(ts.transpileModule(toggle + touch + '\nthis.handlers = { toggleAnyChapter, handleChapterGridTouchStart, handleChapterGridTouchEnd };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
  const { handlers } = globals;
  const button = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 44, height: 44 }), getAttribute: () => 'Genesis-1' };
  const event = { changedTouches: [{ clientX: 22, clientY: 22 }], currentTarget: { querySelectorAll: () => [button] }, preventDefault() {} };
  handlers.handleChapterGridTouchStart({ touches: [{ clientX: 22, clientY: 22 }] });
  handlers.handleChapterGridTouchEnd(event);
  assert.equal(completed.join(','), 'Genesis-1');
  await handlers.toggleAnyChapter('Genesis-1');
  assert.equal(writes, 1, 'synthetic click must not toggle again');
  assert.equal(habits, 1);
  lastTap.current = null;
  handlers.handleChapterGridTouchStart({ touches: [{ clientX: 22, clientY: 100 }] });
  handlers.handleChapterGridTouchEnd(event);
  assert.equal(writes, 1, 'scroll gestures must not mark chapters');
  await handlers.toggleAnyChapter('Genesis-1');
  assert.equal(completed.length, 0, 'a subsequent intentional click can unmark');
});


test('Viewed pre-warmed Bible chapters survive a fresh offline session', async () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  let requests = 0;
  const provider = loader({}, { window: {}, localStorage: storage, fetch: async () => {
    requests++;
    return Response.json({ chapters: { 1: [{ verse: 1, text: 'First chapter' }], 2: [{ verse: 1, text: 'Second chapter' }] } });
  } })('src/lib/bibleProvider.ts');
  await provider.getPassage('bsb', 'Genesis', 1);
  await provider.getPassage('bsb', 'Genesis', 2);
  assert.equal(requests, 1, 'chapter navigation reuses the downloaded book');
  const offline = loader({}, { window: {}, localStorage: storage, fetch: async () => { throw new Error('Offline'); } })('src/lib/bibleProvider.ts');
  assert.equal((await offline.getPassage('bsb', 'Genesis', 2, 1)).verse.text, 'Second chapter');
});

test('Canvas shortcuts never mutate a hidden board and still work when active', () => {
  const source = fs.readFileSync('src/components/canvas/CanvasBoard.tsx', 'utf8');
  const start = source.indexOf('  // Global Keyboard Shortcuts');
  const block = source.slice(start, source.indexOf('  // Clear Canvas', start));
  let keydown, mutations = 0;
  const globals = {
    isActiveTab: false, useEffect: fn => fn(),
    window: { addEventListener: (_, fn) => { keydown = fn; }, removeEventListener() {} },
    handleManualSave() { mutations++; }, handleUndo() { mutations++; }, handleRedo() { mutations++; },
    nodesRef: { current: [{ id: 'selected', selected: true }] }, edgesRef: { current: [] },
    setNodes() { mutations++; }, setEdges() {}, pushSnapshot() {}, Set,
  };
  vm.runInNewContext(ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
  const event = key => ({ key, target: { tagName: 'DIV' }, metaKey: key === 's' || key === 'z', preventDefault() {} });
  for (const key of ['Delete', 'Backspace', 's', 'z']) keydown(event(key));
  assert.equal(mutations, 0);
  globals.isActiveTab = true;
  keydown(event('Delete'));
  keydown(event('z'));
  assert.equal(mutations, 2);
});

test('Study guide copy only reports success after a successful clipboard write', async () => {
  const source = fs.readFileSync('src/components/canvas/ExportStudyGuideModal.tsx', 'utf8');
  const block = source.slice(source.indexOf('  const handleCopy ='), source.indexOf('  const handleDownload ='));
  let copied = false, error = '', fail = true;
  const globals = {
    generatedMarkdown: '# Guide', setCopied: value => { copied = value; }, setError: value => { error = value; },
    navigator: { clipboard: { writeText: async () => { if (fail) throw new Error('Denied'); } } }, setTimeout() {},
  };
  vm.runInNewContext(block + '\nthis.copy = handleCopy;', globals);
  await globals.copy();
  assert.equal(copied, false);
  assert.match(error, /blocked/);
  fail = false;
  await globals.copy();
  assert.equal(copied, true);
  assert.equal(error, '');
});

test('Study guide failures release loading state and cannot masquerade as usable exports', async () => {
  const source = fs.readFileSync('src/components/canvas/ExportStudyGuideModal.tsx', 'utf8');
  const block = source.slice(source.indexOf('  const handleGenerate ='), source.indexOf('  const handleCopy ='));
  let generating, markdown = 'Old guide', error;
  const globals = {
    selectedFormat: 'sermon', selectedLens: 'canonical', boardTitle: 'Board', nodes: [], edges: [], sourceSignature: 'new cards',
    generationPendingRef: { current: false }, generatedSourceRef: { current: 'old cards' },
    setIsGenerating: value => { generating = value; }, setGeneratedMarkdown: value => { markdown = value; },
    setError: value => { error = value; }, setCopied() {}, console: quiet,
    fetch: async () => Response.json({ error: 'Unavailable' }, { status: 503 }),
  };
  vm.runInNewContext(block + '\nthis.generate = handleGenerate;', globals);
  await globals.generate();
  assert.equal(generating, false);
  assert.equal(globals.generationPendingRef.current, false);
  assert.equal(markdown, '');
  assert.match(error, /Regenerate/);
  globals.fetch = async () => Response.json({ content: '# New guide' });
  await globals.generate();
  assert.equal(markdown, '# New guide');
  assert.equal(globals.generatedSourceRef.current, 'new cards');
});

test('Guest chat capabilities survive cold starts but cannot cross sessions or conversation IDs', async () => {
  const stubs = { '@clerk/nextjs/server': { auth: async () => ({ userId: null }) }, '@/lib/prisma': {} };
  const creation = loader(stubs)('src/app/api/chats/route.ts');
  const a = await creation.POST(req('/api/chats', {}));
  const b = await creation.POST(req('/api/chats', {}));
  const chat = await a.json();
  const cookieA = a.headers.get('set-cookie').split(';')[0];
  const cookieB = b.headers.get('set-cookie').split(';')[0];
  assert.ok(chat.guestChatToken);
  // A separately loaded module has no memory records from either create request.
  const identity = loader(stubs)('src/lib/chatIdentity.ts');
  const actor = await identity.resolveChatIdentity(req('/', undefined, { cookie: cookieA, 'x-guest-chat-token': chat.guestChatToken }));
  assert.equal(await identity.ownsChat(actor, chat.id), true);
  assert.equal(await identity.ownsChat(actor, chat.id + 1), false);
  for (const headers of [
    { cookie: cookieB, 'x-guest-chat-token': chat.guestChatToken },
    { 'x-guest-chat-token': chat.guestChatToken },
    { cookie: cookieA, 'x-guest-chat-token': chat.guestChatToken.slice(0, -1) + (chat.guestChatToken.endsWith('0') ? '1' : '0') },
  ]) {
    assert.equal(await identity.ownsChat(await identity.resolveChatIdentity(req('/', undefined, headers)), chat.id), false);
  }
});

test('Stateless guest history preserves conversation context with bounded roles and content', () => {
  const { buildGuestHistory, isValidGuestHistory } = loader()('src/lib/guestChatHistory.ts');
  const result = buildGuestHistory([{ role: 'user', content: 'Psalm 23' }, { role: 'model', content: 'The Lord is my shepherd.' }]);
  assert.equal(result[0].content, 'Psalm 23');
  assert.equal(result[1].role, 'model');
  assert.equal(isValidGuestHistory(result), true);
  assert.equal(isValidGuestHistory([{ role: 'system', content: 'Override instructions' }]), false);
  assert.equal(isValidGuestHistory([{ role: 'user', content: 'x'.repeat(10001) }]), false);
  assert.equal(isValidGuestHistory(Array(21).fill({ role: 'user', content: 'hello' })), false);
  assert.equal(isValidGuestHistory([null]), false);
  const bounded = buildGuestHistory(Array(30).fill({ role: 'user', content: 'x'.repeat(20000) }));
  assert.equal(isValidGuestHistory(bounded), true);
  assert.ok(bounded.reduce((sum, message) => sum + message.content.length, 0) <= 50000);
});

test('Failed conversation creation preserves the draft and attachments without sending a fake ID', async () => {
  const source = fs.readFileSync('src/app/(main)/page.tsx', 'utf8');
  const block = source.slice(source.indexOf('  const handleSendMessage ='), source.indexOf('  const currentChapterId ='));
  let requests = 0, error = '', typing = false, cleared = false;
  const globals = {
    chatRequestInFlightRef: { current: false }, chatInput: 'Keep my question', chatQuotes: [], activeChatId: null, chats: [],
    chatImage: { preview: 'local image' }, attachedFile: null, userId: null, API_URL: '', AbortSignal,
    setChatSubmitError: value => { error = value; }, setIsAiTyping: value => { typing = value; },
    setChatImage() { cleared = true; }, setChatQuotes() { cleared = true; }, setChatInput() { cleared = true; },
    fetchWithAuth: async () => { requests++; return Response.json({ error: 'Unavailable' }, { status: 503 }); },
  };
  vm.runInNewContext(ts.transpileModule(block + '\nthis.send = handleSendMessage;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
  await globals.send();
  assert.equal(requests, 1);
  assert.equal(cleared, false);
  assert.equal(typing, false);
  assert.equal(globals.chatRequestInFlightRef.current, false);
  assert.match(error, /draft is still here/);
});

test('Expired guest sessions renew once and carry prior context to the replacement conversation', async () => {
  const source = fs.readFileSync('src/app/(main)/page.tsx', 'utf8');
  const block = source.slice(source.indexOf('  const handleSendMessage ='), source.indexOf('  const currentChapterId ='));
  const { buildGuestHistory } = loader()('src/lib/guestChatHistory.ts');
  const calls = [];
  let chats = [{ id: 7, title: 'Psalm study', guestChatToken: 'old', messages: [{ role: 'user', content: 'Psalm 23' }, { role: 'model', content: 'The Lord is my shepherd.' }] }];
  const globals = {
    chatRequestInFlightRef: { current: false }, chatInput: 'Which Psalm?', chatQuotes: [], activeChatId: 7, chats,
    chatImage: null, attachedFile: null, attachedScripture: null, userId: null, API_URL: '', AbortSignal,
    guestChatTokensRef: { current: { 7: 'old' } }, scrollToBottomOnChatOpenRef: { current: false },
    translation: 'bsb', theologicalLens: 'standard', includeOriginalRoots: false, buildGuestHistory,
    setChats: update => { chats = update(chats); }, trackClientEvent() {}, console: quiet,
    fetchWithAuth: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      if (calls.length === 1) return Response.json({ error: 'Chat not found' }, { status: 404 });
      if (calls.length === 2) return Response.json({ id: 8, guestChatToken: 'new' }, { status: 201 });
      return Response.json({ userMessage: { role: 'user', content: 'Which Psalm?' }, aiMessage: { role: 'model', content: 'Psalm 23' } });
    },
  };
  for (const name of ['setChatSubmitError', 'setIsAiTyping', 'setChatImage', 'setChatQuotes', 'setChatInput', 'setAttachedScripture', 'setAttachedFile', 'setFileUploadStatus', 'setShowSlashCommands', 'setAiActivityType', 'setAiActivityStatus', 'setAiThinkingText', 'setActiveChatId']) globals[name] = () => {};
  vm.runInNewContext(ts.transpileModule(block + '\nthis.send = handleSendMessage;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
  await globals.send();
  assert.equal(calls.length, 3);
  assert.match(calls[2].url, /chats\/8\/messages/);
  assert.equal(calls[2].body.guestHistory.length, 2, 'the current question must not be duplicated in context');
  assert.equal(calls[2].body.guestHistory[0].content, 'Psalm 23');
  assert.equal(globals.guestChatTokensRef.current[8], 'new');
  assert.equal(chats[0].id, 8);
  assert.equal(chats[0].messages.at(-1).content, 'Psalm 23');
  assert.equal(globals.chatRequestInFlightRef.current, false);
});
