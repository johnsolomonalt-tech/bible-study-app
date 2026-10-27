import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

function worker() {
  const handlers = {};
  const context = {
    self: { location: { origin: 'https://theologica.test' }, addEventListener: (name, callback) => { handlers[name] = callback; } },
    URL, Response, console,
    fetch: async () => { throw new Error('Offline'); },
    caches: { open: async () => ({ match: async () => undefined }) },
  };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  return handlers;
}

test('private APIs and third-party auth bypass all offline caches', () => {
  for (const url of ['https://theologica.test/api/notes', 'https://theologica.test/api/chats', 'https://accounts.clerk.com/session']) {
    let intercepted = false;
    worker().fetch({ request: { url, method: 'GET' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});

test('uncached offline passages return a valid failure response', async () => {
  let result;
  const background = [];
  worker().fetch({
    request: { url: 'https://theologica.test/api/bible/web/Genesis/1', method: 'GET' },
    respondWith: promise => { result = promise; },
    waitUntil: promise => background.push(promise),
  });
  assert.equal((await result).status, 503);
  await Promise.all(background);
});

test('mutations are never intercepted', () => {
  worker().fetch({ request: { url: 'https://theologica.test/api/notes', method: 'POST' }, respondWith: () => assert.fail('Intercepted a mutation') });
});
