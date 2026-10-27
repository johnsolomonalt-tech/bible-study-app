// Theologica PWA Service Worker
const CACHE_VERSION = 'theologica-pwa-v2';
const PASSAGE_CACHE = 'theologica-bible-passages-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_ASSETS = [
  '/~offline',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/logo-dark.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: Precache shell and offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Theologica SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Prune stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if ((key.startsWith('theologica-') || key === 'internal-api-cache' || key === 'clerk-api-cache') && key !== STATIC_CACHE && key !== PASSAGE_CACHE) {
            console.log('[Theologica SW] Pruning old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart routing for passages, static assets, and navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations go straight to server)
  if (request.method !== 'GET') {
    return;
  }

  // Account and authentication responses cannot be served from a previous session's cache.
  if ((url.origin === self.location.origin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/bible/')) ||
      /(^|\.)clerk\.(com|accounts\.dev|accounts\.com)$/.test(url.hostname)) {
    return;
  }

  // 1. Bible passages (Stale While Revalidate)
  const isBibleApi = (url.origin === self.location.origin && url.pathname.startsWith('/api/bible/')) || url.hostname === 'bible-api.com';
  if (isBibleApi) {
    event.respondWith(
      caches.open(PASSAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response('Passage unavailable offline', { status: 503 }));

        event.waitUntil(networkFetch.then(() => undefined));
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Never cache or replay private account APIs or third-party authentication.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // 2. Next.js immutable static assets & icons (Cache First)
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            await cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cachedResponse || new Response('Offline asset unavailable', { status: 503 });
        }
      })
    );
    return;
  }

  // 3. Navigation requests (Network First, fallback to cached page or /~offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cachedPage = await cache.match(request);
        if (cachedPage) return cachedPage;
        const offlinePage = await cache.match('/~offline');
        if (offlinePage) return offlinePage;
        return new Response('You are offline. Please reconnect to use Theologica.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // Default: Network only; never replay a prior account's response.
  return;

});

// Support skip waiting message from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
