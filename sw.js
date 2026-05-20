// ════════════════════════════════════════════════════════
// Word Mode - Service Worker  v2.0
// Cache-first for app shell, network-first for API calls
// ════════════════════════════════════════════════════════

const CACHE_NAME = 'word-mode-v2';
const OFFLINE_URL = './index.html';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
];

const API_DOMAINS = [
  'api.groq.com',
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.anthropic.com',
  'apis.google.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(e => console.warn('[SW] Cache miss:', url)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (API_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', {status: 503})));
    return;
  }

  if (url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  if (url.hostname.includes('googleapis.com') || url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('jsdelivr.net') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => new Response('', {status: 408}));
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL)))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: '📚 Word Mode', body: 'Kelime çalışma zamanı!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: 'word-mode',
      vibrate: [200, 100, 200],
      data: { url: self.registration.scope }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
