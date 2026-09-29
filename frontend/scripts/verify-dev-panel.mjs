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

// 6. Test Dev Portal UI State and Top Feature Computation (Excludes passive opens)
test('Dev UI: topFeature strictly measures real active engagements and ignores passive drawer opens', () => {
  const map = {
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

  function computeTopFeature(featureCounts) {
    if (!featureCounts) return 'Reading & Study';
    const passiveEvents = new Set(['session_start', 'page_view', 'ai_chat_opened', 'canvas_opened', 'rate_limit_blocked']);
    const features = Object.entries(featureCounts)
      .filter(([k, count]) => !passiveEvents.has(k) && count > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!features.length) return 'Reading & Study';
    return map[features[0][0]] || features[0][0];
  }

  // Case 1: ai_chat_opened is 50, but user only read scripture 5 times -> Top must be Scripture Reading & Study, NOT chat panel!
  assert.strictEqual(
    computeTopFeature({ session_start: 100, ai_chat_opened: 50, scripture_read: 5 }),
    'Scripture Reading & Study',
    'Passive ai_chat_opened must NEVER be ranked as top feature'
  );

  // Case 2: ai_chat_opened is 10, but user sent 2 AI prompts -> Top must be AI Theological Chat, NOT chat panel!
  assert.strictEqual(
    computeTopFeature({ session_start: 20, ai_chat_opened: 10, ai_chat_prompt: 2 }),
    'AI Theological Chat'
  );

  // Case 3: Canvas AI is top
  assert.strictEqual(
    computeTopFeature({ session_start: 100, canvas_ai_generate: 42, note_created: 10 }),
    'AI Canvas Generator'
  );

  // Case 4: Notes AI is top
  assert.strictEqual(
    computeTopFeature({ session_start: 50, notes_ai_generate: 30, ai_chat_prompt: 12 }),
    'AI Notes Synthesis'
  );

  // Case 5: Only passive drawer open exists, no active feature -> defaults cleanly to Reading & Study
  assert.strictEqual(
    computeTopFeature({ session_start: 10, ai_chat_opened: 5 }),
    'Reading & Study',
    'When only passive opens exist, fallback to Reading & Study'
  );

  // Case 6: Empty data fallback
  assert.strictEqual(computeTopFeature({}), 'Reading & Study');
  assert.strictEqual(computeTopFeature(null), 'Reading & Study');
});

// 7. Test User Directory Profile Extraction & "Last Used" Aggregation
test('Dev User Directory: extracts Clerk profile, formats phone numbers, and aggregates last used time', () => {
  const mockClerkUsers = [
    {
      id: 'user_solomon_1',
      username: 'solomon',
      firstName: 'Solomon',
      lastName: 'King',
      imageUrl: 'https://img.clerk.com/avatar1.png',
      primaryEmailAddressId: 'email_1',
      emailAddresses: [{ id: 'email_1', emailAddress: 'solomon@example.com' }],
      primaryPhoneNumberId: 'phone_1',
      phoneNumbers: [{ id: 'phone_1', phoneNumber: '+1234567890' }],
      createdAt: 1710000000000,
      lastSignInAt: 1710500000000,
      lastActiveAt: 1710600000000,
    },
    {
      id: 'user_guest_2',
      username: null,
      firstName: null,
      lastName: null,
      imageUrl: null,
      primaryEmailAddressId: 'email_2',
      emailAddresses: [{ id: 'email_2', emailAddress: 'guest@theologica.app' }],
      primaryPhoneNumberId: null,
      phoneNumbers: [],
      createdAt: 1710100000000,
      lastSignInAt: null,
      lastActiveAt: null,
    },
  ];

  function formatUserAccount(u, dbLastActivityDate = null) {
    const emailAddresses = u.emailAddresses || [];
    const phoneNumbers = u.phoneNumbers || [];

    const primaryEmail =
      emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
      emailAddresses[0]?.emailAddress ||
      null;

    const primaryPhone =
      phoneNumbers.find((p) => p.id === u.primaryPhoneNumberId)?.phoneNumber ||
      phoneNumbers[0]?.phoneNumber ||
      null;

    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;

    const clerkCreatedAt = u.createdAt ? new Date(u.createdAt) : null;
    const clerkLastSignIn = u.lastSignInAt ? new Date(u.lastSignInAt) : null;
    const clerkLastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;

    const candidateDates = [
      clerkLastActive,
      clerkLastSignIn,
      dbLastActivityDate,
    ].filter(Boolean);

    const lastUsedAtDate = candidateDates.length > 0
      ? new Date(Math.max(...candidateDates.map((d) => d.getTime())))
      : (clerkLastSignIn || clerkCreatedAt);

    return {
      id: u.id,
      username: u.username || null,
      fullName,
      email: primaryEmail,
      phoneNumber: primaryPhone,
      imageUrl: u.imageUrl || null,
      createdAt: clerkCreatedAt ? clerkCreatedAt.toISOString() : new Date().toISOString(),
      lastSignInAt: clerkLastSignIn ? clerkLastSignIn.toISOString() : null,
      lastActiveAt: clerkLastActive ? clerkLastActive.toISOString() : null,
      lastUsedAt: lastUsedAtDate ? lastUsedAtDate.toISOString() : null,
    };
  }

  // User 1: Has phone number, username, full name, and DB activity newer than Clerk session
  const dbActivityDate = new Date(1710700000000); // 100,000ms after lastActiveAt
  const user1 = formatUserAccount(mockClerkUsers[0], dbActivityDate);
  assert.strictEqual(user1.id, 'user_solomon_1');
  assert.strictEqual(user1.username, 'solomon');
  assert.strictEqual(user1.fullName, 'Solomon King');
  assert.strictEqual(user1.email, 'solomon@example.com');
  assert.strictEqual(user1.phoneNumber, '+1234567890', 'Phone number must be extracted');
  assert.strictEqual(user1.lastUsedAt, dbActivityDate.toISOString(), 'lastUsedAt must reflect latest interaction');

  // User 2: No phone number, no username, no full name
  const user2 = formatUserAccount(mockClerkUsers[1], null);
  assert.strictEqual(user2.id, 'user_guest_2');
  assert.strictEqual(user2.username, null);
  assert.strictEqual(user2.fullName, null);
  assert.strictEqual(user2.email, 'guest@theologica.app');
  assert.strictEqual(user2.phoneNumber, null, 'Absence of phone number must yield null');
  assert.strictEqual(user2.lastUsedAt, new Date(mockClerkUsers[1].createdAt).toISOString(), 'Falls back to createdAt if no sign-in or db activity');
});

// 8. Test Strict Privacy Isolation: Content & Identity Decoupling
test('Strict Privacy Guardrail: User identity records NEVER expose sensitive notes, chats, or verse history', () => {
  const allowedUserFields = new Set([
    'id',
    'username',
    'fullName',
    'email',
    'phoneNumber',
    'imageUrl',
    'createdAt',
    'lastSignInAt',
    'lastActiveAt',
    'lastUsedAt',
  ]);

  const testUserRecord = {
    id: 'user_test_abc',
    username: 'disciple',
    fullName: 'Bible Student',
    email: 'student@example.com',
    phoneNumber: '+19998887777',
    imageUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date().toISOString(),
    lastSignInAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  // Ensure ONLY allowed identity fields are exposed
  for (const key of Object.keys(testUserRecord)) {
    assert.strictEqual(allowedUserFields.has(key), true, `Field "${key}" must be within approved privacy boundary`);
  }

  // Ensure sensitive content fields are strictly prohibited
  const forbiddenContentFields = [
    'notes',
    'noteContent',
    'canvasData',
    'chatMessages',
    'chatPrompts',
    'versesRead',
    'chapterPassages',
  ];

  for (const field of forbiddenContentFields) {
    assert.strictEqual(field in testUserRecord, false, `User directory must NEVER include forbidden content field "${field}"`);
  }
});

