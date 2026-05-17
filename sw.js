const CACHE_NAME = 'word-mode-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker yükleniyor...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache açıldı');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('❌ Cache hatası:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker aktif');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Network failed, return offline page or error
          return new Response('Offline');
        });
      })
  );
});
