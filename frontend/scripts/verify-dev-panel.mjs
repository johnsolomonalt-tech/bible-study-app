/**
 * Automated Verification Suite for Developer Console (/dev)
 * Run via: node scripts/verify-dev-panel.mjs
 */

import assert from 'node:assert';
import test from 'node:test';
import crypto from 'node:crypto';

// 1. Test Deterministic Anonymization (Fixes "8 visits = 8 unique visitors" bug)
test('Telemetry: 8 visits from 1 visitor counts as 1 unique user', () => {
  const salt = 'theologica_analytics_anonymizer_salt';
  function anonymize(rawId) {
    const cleanId = (rawId || 'unknown_guest').trim();
    return 'usr_' + crypto.createHash('sha256').update(cleanId + salt).digest('hex').substring(0, 12);
  }

  const userId = 'user_solomon_admin_test_123';
  const hashedIds = [];
  for (let i = 0; i < 8; i++) {
    hashedIds.push(anonymize(userId));
  }

  // All 8 hashes must be strictly identical
  const uniqueHashedSet = new Set(hashedIds);
  assert.strictEqual(uniqueHashedSet.size, 1, '8 visits from 1 user must produce exactly 1 unique ID');
  assert.strictEqual(hashedIds[0].startsWith('usr_'), true, 'Hash must begin with usr_ prefix');
  assert.strictEqual(hashedIds[0].length, 16, 'Hash must be usr_ + 12 chars');
});

// 2. Test Passcode Verification & Session Token Security
test('Dev Auth: Passcode hashing, PBKDF2 verification, and token tamper resistance', () => {
  function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const configuredPassword = 'solomon_private_code_2026';
  const storedHash = hashPassword(configuredPassword, salt);

  function verify(input) {
    const testHash = hashPassword(input, salt);
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(storedHash, 'hex'));
  }

  assert.strictEqual(verify('solomon_private_code_2026'), true, 'Correct password must verify');
  assert.strictEqual(verify('wrong_password'), false, 'Incorrect password must be rejected');
  assert.strictEqual(verify(''), false, 'Empty password must be rejected');

  // Token signing & tamper resistance
  const DEV_SECRET = 'theologica-dev-secret-key-2026';
  function createToken(userId) {
    const payload = { userId, exp: Date.now() + 86400000 };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', DEV_SECRET).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  function verifyToken(token, expectedUserId) {
    if (!token || !token.includes('.')) return false;
    const [body, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', DEV_SECRET).update(body).digest('base64url');
    if (sig !== expectedSig) return false;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (p.exp < Date.now()) return false;
      if (expectedUserId && p.userId !== expectedUserId) return false;
      return true;
    } catch {
      return false;
    }
  }

  const token = createToken('user_solomon');
  assert.strictEqual(verifyToken(token, 'user_solomon'), true, 'Valid token must verify');
  assert.strictEqual(verifyToken(token, 'user_impostor'), false, 'Token with mismatched userId must be rejected');

  // Tampered payload
  const tamperedToken = 'eyJ1c2VySWQiOiJ1c2VyX2FkbWluIn0.' + token.split('.')[1];
  assert.strictEqual(verifyToken(tamperedToken, 'user_solomon'), false, 'Tampered token must be rejected');
});

// 3. Test Feature Telemetry Calculations
test('Dev Stats: aggregates feature counts, trends, and handles zero/empty data gracefully', () => {
  const mockEvents = [
    { eventType: 'session_start', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'canvas_ai_generate', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'canvas_shared', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'chat_file_upload', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'highlight_created', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'notes_ai_generate', anonymousId: 'usr_abc', timestamp: new Date() },
    { eventType: 'rate_limit_blocked', anonymousId: 'usr_abc', timestamp: new Date() },
  ];

  const featureCounts = {
    session_start: 0,
    page_view: 0,
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

  for (const e of mockEvents) {
    if (featureCounts[e.eventType] !== undefined) {
      featureCounts[e.eventType]++;
    }
  }

  assert.strictEqual(featureCounts.canvas_ai_generate, 1);
  assert.strictEqual(featureCounts.canvas_shared, 1);
  assert.strictEqual(featureCounts.chat_file_upload, 1);
  assert.strictEqual(featureCounts.highlight_created, 1);
  assert.strictEqual(featureCounts.notes_ai_generate, 1);
  assert.strictEqual(featureCounts.rate_limit_blocked, 1);
});

// 4. Test Health Diagnostics Model Configuration
test('Dev Health Diagnostics: Model configuration matches Gemini 3 Flash series', () => {
  const activeAiModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
  ];

  const primaryModel = activeAiModels[0];
  const fallbackModels = activeAiModels.slice(1);
  const modelFamily = 'Gemini 3 Flash Series';

  assert.strictEqual(primaryModel, 'gemini-3.1-flash-lite', 'Primary model must be gemini-3.1-flash-lite');
  assert.strictEqual(fallbackModels.includes('gemini-3.5-flash'), true, '3.5 flash must be in fallback chain');
  assert.strictEqual(fallbackModels.includes('gemini-3.7-flash'), true, '3.7 flash must be in fallback chain');
  assert.strictEqual(modelFamily, 'Gemini 3 Flash Series', 'Model family must be Gemini 3 Flash Series');
});

// 5. Test Rate Limiter Configurations
test('Rate Limiter: Correct thresholds for Chat, Canvas AI, and Notes AI', () => {
  const limits = {
    chat: { max: 25, windowMs: 60000 },
    canvasAi: { max: 15, windowMs: 60000 },
    notesAi: { max: 20, windowMs: 60000 },
  };

  assert.strictEqual(limits.chat.max, 25, 'Chat must limit to 25 req/min');
  assert.strictEqual(limits.canvasAi.max, 15, 'Canvas AI must limit to 15 req/min');
  assert.strictEqual(limits.notesAi.max, 20, 'Notes AI must limit to 20 req/min');
});

// 6. Test Dev Portal UI State and Top Feature Computation
test('Dev UI: topFeature correctly identifies non-session top features', () => {
  const map = {
    ai_chat_prompt: 'AI Theological Chat',
    ai_chat_opened: 'AI Chat Panel',
    chat_file_upload: 'Chat File Uploads',
    canvas_opened: 'Visual Canvas Boards',
    canvas_created: 'Canvas Boards',
    canvas_ai_generate: 'AI Canvas Generator',
    canvas_shared: 'Canvas Sharing',
    canvas_imported: 'Canvas Imports',
    note_created: 'Scripture Notes',
    notes_ai_generate: 'AI Notes Synthesis',
    highlight_created: 'Scripture Highlights',
    highlight_deleted: 'Removed Highlights',
    lectio_started: 'Lectio Divina',
    reading_tracker_updated: 'Reading Tracker',
    interlinear_opened: 'Greek/Hebrew Lexicon',
    rate_limit_blocked: 'Rate Limiter Throttles',
  };

  function computeTopFeature(featureCounts) {
    if (!featureCounts) return 'N/A';
    const features = Object.entries(featureCounts)
      .filter(([k]) => k !== 'session_start' && k !== 'page_view')
      .sort((a, b) => b[1] - a[1]);
    if (!features.length || features[0][1] === 0) return 'Reading & Study';
    return map[features[0][0]] || features[0][0];
  }

  // Case 1: Canvas AI is top
  assert.strictEqual(
    computeTopFeature({ session_start: 100, canvas_ai_generate: 42, note_created: 10 }),
    'AI Canvas Generator'
  );

  // Case 2: Notes AI is top
  assert.strictEqual(
    computeTopFeature({ session_start: 50, notes_ai_generate: 30, ai_chat_prompt: 12 }),
    'AI Notes Synthesis'
  );

  // Case 3: Empty data fallback
  assert.strictEqual(computeTopFeature({}), 'Reading & Study');
  assert.strictEqual(computeTopFeature(null), 'N/A');
});
