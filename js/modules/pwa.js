/* ════════════════════════════════════════════════════════════════
   WordMode — modül: pwa.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const manifestData = {
  "name": "Word Mode - İngilizce Öğrenme",
  "short_name": "Word Mode",
  "description": "AI destekli İngilizce kelime öğrenme uygulaması",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#0f1117",
  "theme_color": "#0ea5e9",
  "orientation": "portrait",
  "scope": "./",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='40' fill='%230ea5e9'/><text x='96' y='135' font-size='120' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='bold'>W</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='110' fill='%230ea5e9'/><text x='256' y='370' font-size='320' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='bold'>W</text></svg>",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
};

// Create manifest blob and inject
const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
const manifestURL = URL.createObjectURL(manifestBlob);
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = manifestURL;
document.head.appendChild(manifestLink);

// Simple Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swCode = `
      const CACHE_NAME = 'word-mode-v1';
      
      self.addEventListener('install', (event) => {
        console.log('SW: Installing...');
        self.skipWaiting();
      });
      
      self.addEventListener('activate', (event) => {
        console.log('SW: Activating...');
        event.waitUntil(self.clients.claim());
      });
      
      self.addEventListener('fetch', (event) => {
        // Let all requests go through - we rely on localStorage
        event.respondWith(fetch(event.request));
      });
    `;
    
    const swBlob = new Blob([swCode], { type: 'application/javascript' });
    const swURL = URL.createObjectURL(swBlob);
    
    navigator.serviceWorker.register(swURL)
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.log('❌ SW registration failed:', err));
  });
}

// Add bounce animation
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);



/* ===== extracted script block ===== */


/* ════════════════════════════════════════════════════════════════════════════
   WORD MODE NEXT-GEN MODULES — SAFE EXTENSION
   Bu modül mevcut kodu bozmadan ek özellikleri sisteme bağlar.
   ════════════════════════════════════════════════════════════════════════════ */
