const CACHE_NAME = 'word-mode-v1';
const assets = ['./', './index.html', './style.css', './app-logic.js', './api-logic.js', './manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(assets)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});