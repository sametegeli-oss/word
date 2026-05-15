const CACHE_NAME = 'word-mode-v3';
const DYNAMIC_CACHE = 'wm-dynamic-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app-logic.js',
  './api-logic.js',
  './manifest.json'
];

// Install event
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch event with stale-while-revalidate strategy
self.addEventListener('fetch', e => {
  const url = e.request.url;
  
  // API istekleri için (Groq, OpenAI, vb.)
  if (url.includes('api.groq.com') || url.includes('api.openai.com') || 
      url.includes('api.anthropic.com') || url.includes('generativelanguage.googleapis.com') ||
      url.includes('openrouter.ai')) {
    
    e.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return fetch(e.request).then(response => {
          // Sadece başarılı yanıtları cache'le
          if (response.ok && response.status === 200) {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(() => cache.match(e.request));
      })
    );
    return;
  }
  
  // Wikipedia görselleri
  if (url.includes('wikipedia.org') || url.includes('wikimedia.org')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Statik dosyalar
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response.ok && !url.includes('chrome-extension')) {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Offline fallback - ana sayfayı göster
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline - Bağlantınızı kontrol edin', { status: 503 });
      });
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
