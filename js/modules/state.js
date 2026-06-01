/* ════════════════════════════════════════════════════════════════
   WordMode — modül: state.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const WMStore = (() => {
  const IDB_NAME    = 'WordModeStore';
  const IDB_VERSION = 2;
  const STORE_KV    = 'kv';        // Genel anahtar-değer
  const STORE_BOOKS = 'books';     // Kitap metinleri (büyük veri)
  const STORE_WORDS = 'words';     // Kelime nesneleri

  let _db = null;
  let _ready = false;
  let _queue = [];          // DB hazır olmadan gelen yazma istekleri

  // ── Başlat ──
  async function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);

      req.onerror = () => {
        console.warn('[WMStore] IndexedDB açılamadı, localStorage fallback aktif');
        _ready = true; // fallback modda devam et
        resolve();
      };

      req.onsuccess = () => {
        _db = req.result;
        _ready = true;
        console.log('[WMStore] ✅ IndexedDB hazır');
        _flushQueue();
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_KV))    db.createObjectStore(STORE_KV);
        if (!db.objectStoreNames.contains(STORE_BOOKS)) db.createObjectStore(STORE_BOOKS);
        if (!db.objectStoreNames.contains(STORE_WORDS)) {
          const ws = db.createObjectStore(STORE_WORDS, { keyPath: 'word' });
          ws.createIndex('topic',   'topic',   { unique: false });
          ws.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };
    });
  }

  // ── IDB yardımcıları ──
  function _tx(store, mode = 'readonly') {
    return _db.transaction([store], mode).objectStore(store);
  }

  function _idbGet(store, key) {
    return new Promise((res, rej) => {
      const r = _tx(store).get(key);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror   = () => rej(r.error);
    });
  }

  function _idbPut(store, key, value) {
    return new Promise((res, rej) => {
      const s = _tx(store, 'readwrite');
      // 'words' store keyPath kullanır (put(value)), diğerleri explicit key ister (put(value, key))
      const r = (store === 'words') ? s.put(value) : s.put(value, key);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  function _idbDelete(store, key) {
    return new Promise((res, rej) => {
      const r = _tx(store, 'readwrite').delete(key);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  function _idbGetAll(store) {
    return new Promise((res, rej) => {
      const r = _tx(store).getAll();
      r.onsuccess = () => res(r.result ?? []);
      r.onerror   = () => rej(r.error);
    });
  }

  function _idbKeys(store) {
    return new Promise((res, rej) => {
      const r = _tx(store).getAllKeys();
      r.onsuccess = () => res(r.result ?? []);
      r.onerror   = () => rej(r.error);
    });
  }

  // ── Yazma kuyruğu (DB hazır olmadan çağrılar için) ──
  function _flushQueue() {
    while (_queue.length > 0) {
      const fn = _queue.shift();
      try { fn(); } catch(e) {}
    }
  }

  // ── Genel KV ──
  async function get(key) {
    try {
      if (_db) {
        const val = await _idbGet(STORE_KV, key);
        if (val !== null) return val;
      }
    } catch(e) {}
    // localStorage fallback
    return localStorage.getItem(key);
  }

  async function set(key, value) {
    // Büyük cümle listeleri localStorage kotasını aşar; bunları yalnızca IndexedDB'ye yaz.
    const _bigKey = /^(multiList_words_|lastFileData$|wm_big_)/.test(String(key||''));
    const _tooBig = typeof value === 'string' && value.length > 900000;
    if (!_bigKey && !_tooBig) {
      // Override'ı bypass et: Storage.prototype üzerinden doğrudan yaz
      try { Storage.prototype.setItem.call(localStorage, key, value); } catch(e) {}
    } else {
      try { Storage.prototype.removeItem.call(localStorage, key); } catch(e) {}
    }
    if (_db) {
      try { await _idbPut(STORE_KV, key, value); } catch(e) {}
    }
  }

  async function remove(key) {
    // Override'ı bypass et: Storage prototype'ından doğrudan çağır
    try {
      Object.getPrototypeOf(localStorage).__defineGetter__; // noop
      const origDel = Storage.prototype.removeItem;
      if (origDel) origDel.call(localStorage, key);
      else localStorage.removeItem(key);
    } catch(e) {}
    if (_db) {
      try { await _idbDelete(STORE_KV, key); } catch(e) {}
    }
  }

  // JSON yardımcıları
  async function getJSON(key, fallback = null) {
    const raw = await get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch(e) { return fallback; }
  }

  async function setJSON(key, value) {
    await set(key, JSON.stringify(value));
  }

  // Prefix ile tüm anahtarları getir
  async function getByPrefix(prefix) {
    const result = {};
    if (_db) {
      try {
        const keys = await _idbKeys(STORE_KV);
        for (const k of keys) {
          if (k.startsWith(prefix)) {
            result[k] = await _idbGet(STORE_KV, k);
          }
        }
        return result;
      } catch(e) {}
    }
    // localStorage fallback
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) result[k] = localStorage.getItem(k);
    }
    return result;
  }

  // Tüm verileri al (yedekleme için)
  async function getAll() {
    if (_db) {
      try {
        const keys = await _idbKeys(STORE_KV);
        const result = {};
        for (const k of keys) result[k] = await _idbGet(STORE_KV, k);
        return result;
      } catch(e) {}
    }
    // localStorage fallback
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) result[k] = localStorage.getItem(k);
    }
    return result;
  }

  // ── Kitap metinleri (büyük veri, ayrı store) ──
  async function getBook(bookId) {
    // 1. IDB'den oku (birincil, en hızlı)
    if (_db) {
      try {
        const val = await _idbGet(STORE_BOOKS, bookId);
        if (val && val.length > 0) return val;
      } catch(e) {}
    }
    // 2. Klasörden dene (ikincil)
    if (window.backupFolderHandle && window.loadBookFromBackupFolder) {
      try {
        const text = await window.loadBookFromBackupFolder(bookId, '');
        if (text && text.length > 0) {
          // IDB'ye de kaydet (bir daha klasöre gitmesin)
          if (_db) { try { await _idbPut(STORE_BOOKS, bookId, text); } catch(e) {} }
          return text;
        }
      } catch(e) {}
    }
    // 3. localStorage fallback
    return localStorage.getItem('book_text_' + bookId);
  }

  async function setBook(bookId, title, text) {
    if (!text || text.length === 0) { console.warn('[WMStore] setBook: boş metin, atlandı'); return; }
    // 1. IDB'ye yaz (birincil)
    if (_db) {
      try {
        await _idbPut(STORE_BOOKS, bookId, text);
        console.log('[WMStore] ✅ Kitap IDB kaydedildi:', bookId, text.length + ' karakter');
      } catch(e) {
        console.error('[WMStore] ❌ Kitap IDB yazma hatası:', e);
      }
    } else {
      console.warn('[WMStore] ⚠️ IDB hazır değil, kitap localStorage\'a yazılıyor');
      try { localStorage.setItem('book_text_' + bookId, text.substring(0, 200000)); } catch(e) {}
    }
    // 2. Klasöre yaz (varsa, ikincil yedek)
    if (window.backupFolderHandle && window.saveBookToBackupFolder) {
      try { await window.saveBookToBackupFolder(bookId, title, text); } catch(e) {}
    }
    // 3. localStorage'dan kaldır (alan boşalt — IDB'de var)
    if (_db) Storage.prototype.removeItem.call(localStorage, 'book_text_' + bookId);
  }

  async function deleteBook(bookId) {
    if (_db) {
      try { await _idbDelete(STORE_BOOKS, bookId); } catch(e) {}
    }
    localStorage.removeItem('book_text_' + bookId);
    // Klasörden silme yok (güvenli kalsın)
  }

  async function getAllBookIds() {
    if (_db) {
      try { return await _idbKeys(STORE_BOOKS); } catch(e) {}
    }
    const ids = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('book_text_')) ids.push(k.replace('book_text_', ''));
    }
    return ids;
  }

  // ── Kelime nesneleri (allWords) ──
  async function getWords() {
    if (_db) {
      try {
        const words = await _idbGetAll(STORE_WORDS);
        if (words.length > 0) return words;
      } catch(e) {}
    }
    return JSON.parse(localStorage.getItem('learnedWords') || '[]');
  }

  async function saveWord(wordObj) {
    if (_db) {
      try { await _idbPut(STORE_WORDS, null, wordObj); } catch(e) {}
    }
    // localStorage mirror
    const words = JSON.parse(localStorage.getItem('learnedWords') || '[]');
    const idx = words.findIndex(w => w.word === wordObj.word);
    if (idx >= 0) words[idx] = wordObj; else words.push(wordObj);
    try { localStorage.setItem('learnedWords', JSON.stringify(words)); } catch(e) {}
  }

  async function saveAllWords(wordsArr) {
    if (_db) {
      try {
        const store = _tx(STORE_WORDS, 'readwrite');
        // Clear and refill
        await new Promise((res, rej) => {
          const r = store.clear();
          r.onsuccess = res; r.onerror = rej;
        });
        for (const w of wordsArr) {
          await new Promise((res, rej) => {
            const r = _tx(STORE_WORDS, 'readwrite').put(w);
            r.onsuccess = res; r.onerror = rej;
          });
        }
      } catch(e) {}
    }
    try { localStorage.setItem('learnedWords', JSON.stringify(wordsArr)); } catch(e) {}
  }

  async function deleteWord(wordStr) {
    if (_db) {
      try { await _idbDelete(STORE_WORDS, wordStr); } catch(e) {}
    }
  }

  // ── localStorage'dan IDB'ye toplu geçiş (ilk açılış) ──
  async function migrateFromLocalStorage() {
    if (!_db) return;
    const migrated = localStorage.getItem('_wm_idb_migrated');
    if (migrated === '2') return; // Zaten taşındı

    console.log('[WMStore] localStorage → IndexedDB geçişi başlıyor...');
    let count = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.startsWith('_wm_')) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      try {
        if (key.startsWith('book_text_')) {
          // Kitap metinlerini books store'a taşı
          const bookId = key.replace('book_text_', '');
          await _idbPut(STORE_BOOKS, bookId, value);
          localStorage.removeItem(key);
        } else {
          // Diğer her şeyi kv store'a taşı
          await _idbPut(STORE_KV, key, value);
        }
        count++;
      } catch(e) {}
    }

    // Kelimeleri words store'a taşı
    try {
      const words = JSON.parse(localStorage.getItem('learnedWords') || '[]');
      for (const w of words) {
        if (w?.word) await _idbPut(STORE_WORDS, null, w);
      }
    } catch(e) {}

    localStorage.setItem('_wm_idb_migrated', '2');
    console.log(`[WMStore] ✅ Geçiş tamamlandı: ${count} kayıt`);
  }

  // Lightweight sync-safe IDB helpers for override (no Storage.prototype calls)
  function _idbSetKV(key, value) {
    if (!_db) return;
    try {
      const tx = _db.transaction([STORE_KV], 'readwrite');
      tx.objectStore(STORE_KV).put(value, key);
    } catch(e) {}
  }
  function _idbDelKV(key) {
    if (!_db) return;
    try {
      const tx = _db.transaction([STORE_KV], 'readwrite');
      tx.objectStore(STORE_KV).delete(key);
    } catch(e) {}
  }

  function isReady() { return _ready && _db !== null; }

  return { init, get, set, remove, getJSON, setJSON, getByPrefix, getAll,
           getBook, setBook, deleteBook, getAllBookIds,
           getWords, saveWord, saveAllWords, deleteWord,
           migrateFromLocalStorage, _idbSetKV, _idbDelKV, isReady };
})();

// ── Başlat ve geçiş yap ──
WMStore.init().then(() => WMStore.migrateFromLocalStorage());

// localStorage'ı WMStore üzerinden override et (mevcut kod değişmeden çalışsın)
// SADECE okuma intercept — yazma zaten WMStore.set ile yapılıyor
const _origLSSet = localStorage.setItem.bind(localStorage);
const _origLSGet = localStorage.getItem.bind(localStorage);
const _origLSDel = localStorage.removeItem.bind(localStorage);

// Yazmaları intercept edip IDB'ye de yaz
if (!localStorage._wmPatched) {
  localStorage._wmPatched = true;
  const _proto = Object.getPrototypeOf(localStorage);

  const _origSet = _proto.setItem;
  _proto.setItem = function(key, value) {
    _origSet.call(this, key, value);
    if (WMStore && WMStore.isReady() && key !== '_wm_idb_migrated') {
      WMStore._idbSetKV(key, value);
    }
  };

  const _origDel = _proto.removeItem;
  _proto.removeItem = function(key) {
    _origDel.call(this, key);
    if (WMStore && WMStore.isReady()) {
      WMStore._idbDelKV(key);
    }
  };
}

// ── Sayfa kapanınca IDB'ye son kez yaz ──
window.addEventListener('pagehide', async () => {
  if (typeof saveProgress === 'function') {
    try { saveProgress(); } catch(e) {}
  }
});

let db = null;
// Eski WordModeDB sistemi → WMStore'a yönlendirildi
const DB_NAME = 'WordModeDB';
const DB_VERSION = 1;
// NOT: STORE_WORDS artık tanımlanmıyor — WMStore içinde 'words' string kullanılıyor
const STORE_LISTS = 'wordLists';

async function initDB(){
  // WMStore zaten başlatıldı, eski DB'ye gerek yok
  console.log('✅ IndexedDB: WMStore kullanılıyor');
  return Promise.resolve();
}

// WMStore'a yönlendirilen eski fonksiyonlar
async function saveWordToDB(word){ return WMStore.saveWord(word); }
async function loadWordsFromDB(){ return WMStore.getWords(); }
async function deleteWordFromDB(word){ return WMStore.deleteWord(word); }

// localStorage'dan IndexedDB'ye taşı (bir kez)
async function migrateToIndexedDB(){
  const oldWords = localStorage.getItem('learnedWords');
  if(oldWords && oldWords !== '[]'){
    try{
      const words = JSON.parse(oldWords);
      console.log(`🔄 ${words.length} kelime IndexedDB'ye taşınıyor...`);
      
      for(const word of words){
        await saveWordToDB(word);
      }
      
      // Eski veriyi yedekle ve temizle
      localStorage.setItem('learnedWords_backup', oldWords);
      localStorage.removeItem('learnedWords');
      
      console.log('✅ Taşıma tamamlandı! localStorage temizlendi.');
      showToast('✅ Veri tabanı güncellendi', words.length + ' kelime');
    }catch(e){
      console.error('Taşıma hatası:', e);
    }
  }
}

// ═══════════════════════════════════════

let allWords=[], words=[], idx=0, score=100, streak=0, correctCount=0;
let phase="learn", currentOptions=[];
let recognition=null, isListening=false;
let lastAudioBlob=null, lastAudioURL=null, audioPlayer=null;
let mediaRecorder=null, audioChunks=[];
let learnedSet=new Set(), wordStatus={};
let fileKey="", currentTab="word";

// OCR Kamera
let cameraStream=null, facingMode='environment', capturedImageData=null;

// Filtrelenmiş çalışma listesi
let filteredWorkList = [];
let isFilteredMode = false;
let originalAllWords = []; // Orijinal listeyi sakla

// Kelime açıklama geçmişi
let explanationHistory = [];
let explanationHistoryIndex = -1;

// ÖĞRENİLEN KELİMELER SİSTEMİ
let learnedWords = [];
let currentLearnedFilter = 'all';

// AI TOKEN AYARLARI VE MODEL SEÇİMİ
let aiTokenSettings = {
  explain: 1500,      // Kelime açıklama (500 → 1500)
  quiz: 800,          // Quiz feedback (300 → 800)
  pronun: 1000,       // Telaffuz analizi (400 → 1000)
  writing: 2000,      // Yazma değerlendirme (600 → 2000)
  chat: 8000,         // Konuşma coach (2500 → 8000, Groq limit: 12000)
  visual: 1500,       // Görsel analiz (700 → 1500)
  context: 1500,      // Bağlam analizi
  conversation: 2000, // Konuşma simülasyonu
  story: 1500,        // AI hikaye
  podcast: 1500       // Podcast üretici
};

let aiModelSettings = {
  explain: 'groq',
  quiz: 'groq',
  pronun: 'groq',
  writing: 'claude',
  chat: 'openai',
  visual: 'openai',
  context: 'groq',
  conversation: 'groq',
  story: 'groq',
  podcast: 'groq'
};

// Spaced Repetition System
let spacedRepetition = {}; // { word: { level, nextReview, lastReview, correctStreak } }
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60, 90]; // Günler

// TTS Timing Constants
const TTS_AUTO_READ_DELAY_MS = 500;  // Otomatik okuma gecikmesi
const TTS_CANCEL_DELAY_MS = 100;      // Cancel sonrası bekleme süresi
const TTS_STOP_RETRY_DELAY_MS = 50;   // Stop retry gecikmesi

// ══════════════════════════════════════════════════════════
// USER PROFILE & AI PERSONALIZATION
// ══════════════════════════════════════════════════════════
