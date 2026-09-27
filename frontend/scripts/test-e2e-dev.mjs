/**
 * End-to-End Functional Test for Dev Panel Endpoints
 * Run via: node scripts/test-e2e-dev.mjs
 */

import assert from 'node:assert';
import test from 'node:test';

test('Dev Panel End-to-end Logic & Health Diagnostic Integration', async () => {
  // Test imports
  const analytics = await import('../src/lib/analyticsService.ts');
  const devAuth = await import('../src/lib/devAuth.ts');

  // 1. Verify Dev Auth Defaults & Token creation
  assert.strictEqual(typeof devAuth.createDevSessionToken, 'function');
  assert.strictEqual(typeof devAuth.verifyDevSessionToken, 'function');

  const testToken = devAuth.createDevSessionToken('usr_test_solomon');
  const tokenCheck = devAuth.verifyDevSessionToken(testToken, 'usr_test_solomon');
  assert.strictEqual(tokenCheck.valid, true, 'Created token must be valid');
  assert.strictEqual(tokenCheck.userId, 'usr_test_solomon', 'Token userId must match');

  // Mismatched token test
  const wrongUserCheck = devAuth.verifyDevSessionToken(testToken, 'usr_wrong_user');
  assert.strictEqual(wrongUserCheck.valid, false, 'Mismatched userId must be invalid');

  // 2. Test Anonymizer
  const anonId1 = analytics.anonymizeIdentifier('solomon_user_id');
  const anonId2 = analytics.anonymizeIdentifier('solomon_user_id');
  assert.strictEqual(anonId1, anonId2, 'Same user ID must produce exact same anonymous ID');
  assert.strictEqual(anonId1.startsWith('usr_'), true);

  // 3. Test Analytics Stats Range Computation (In-memory fallback)
  const stats7d = await analytics.getAnalyticsDashboardStats(7);
  assert.ok(stats7d, 'Stats object must be returned');
  assert.strictEqual(stats7d.periodDays, 7);
  assert.strictEqual(typeof stats7d.totalEvents, 'number');
  assert.strictEqual(typeof stats7d.totalSessionsToday, 'number');
  assert.strictEqual(typeof stats7d.dauToday, 'number');
  assert.strictEqual(Array.isArray(stats7d.hourlyDistribution), true);
  assert.strictEqual(stats7d.hourlyDistribution.length, 24);
  assert.strictEqual(Array.isArray(stats7d.dailyTrends), true);

  // 4. Verify all new feature counts exist and default to 0
  const expectedFeatures = [
    'session_start',
    'page_view',
    'ai_chat_prompt',
    'ai_chat_opened',
    'chat_file_upload',
    'canvas_opened',
    'canvas_created',
    'canvas_ai_generate',
    'canvas_shared',
    'canvas_imported',
    'note_created',
    'notes_ai_generate',
    'highlight_created',
    'highlight_deleted',
    'lectio_started',
    'reading_tracker_updated',
    'interlinear_opened',
    'rate_limit_blocked',
  ];

  for (const feature of expectedFeatures) {
    assert.strictEqual(
      typeof stats7d.featureCounts[feature],
      'number',
      `Feature count for ${feature} must be a number`
    );
  }

  // 5. Test Event Recording & Querying
  await analytics.recordAnalyticsEvent('canvas_ai_generate', 'solomon_user_id', {
    feature: 'canvas',
    action: 'generate',
  });
  await analytics.recordAnalyticsEvent('chat_file_upload', 'solomon_user_id', {
    feature: 'chat',
    action: 'upload',
  });
  await analytics.recordAnalyticsEvent('highlight_created', 'solomon_user_id', {
    feature: 'highlights',
    action: 'create',
  });

  const recent = await analytics.getRecentAnonymousEvents(10);
  assert.ok(recent.length >= 3, 'Recorded events must be present in recent stream');
  const eventTypes = recent.map(e => e.eventType);
  assert.ok(eventTypes.includes('canvas_ai_generate'));
  assert.ok(eventTypes.includes('chat_file_upload'));
  assert.ok(eventTypes.includes('highlight_created'));
});
