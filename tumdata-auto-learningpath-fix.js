/* TumData_Temiz.xlsx otomatik yükleme + Öğrenme Yolu entegrasyonu
   GitHub'a index.html ile birlikte yükleyin. */
(function () {
  'use strict';

  const FILE_NAME = 'TumData_Temiz.xlsx';
  const FILE_URL = 'data/TumData_Temiz.xlsx';
  const RAW_URL = 'https://raw.githubusercontent.com/sametegeli-oss/word/main/data/TumData_Temiz.xlsx';
  const DB_NAME = 'WordAppDB';
  const STORE = 'systemFiles';
  const KEY = 'data/TumData_Temiz.xlsx';

  const ALIAS = {
    level: ['seviye', 'level', 'cefr', 'sentencelevel', 'sentence level'],
    module: ['modül', 'modul', 'module', 'modulename', 'module name', 'ders', 'lesson'],
    part: ['parça', 'parca', 'part', 'p', 'bolum', 'bölüm'],
    stage: ['learningstage', 'learning stage', 'stage', 'aşama', 'asama'],
    en: ['sentence', 'english', 'englishsentence', 'sentenceen', 'en', 'ingilizce', 'ingilizce cümle'],
    tr: ['sentencetr', 'sentence tr', 'turkish', 'turkishsentence', 'tr', 'türkçe', 'turkce', 'türkçe cümle'],
    image: ['image', 'imageurl', 'img', 'photo', 'picture', 'resim', 'görsel', 'gorsel']
  };

  function norm(s) {
    return String(s || '')
      .toLowerCase().trim()
      .replace(/[ıİ]/g, 'i').replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '');
  }

  function get(row, list) {
    const keys = Object.keys(row || {});
    for (const wanted of list) {
      const k = keys.find(x => norm(x) === norm(wanted));
      if (k && row[k] != null && String(row[k]).trim() !== '') return row[k];
    }
    return '';
  }

  function safeText(v) { return String(v == null ? '' : v).trim(); }

  function toast(msg) {
    let el = document.getElementById('tumDataGithubToast');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'tumDataGithubToast';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:999999;background:#020617;color:#fff;border:1px solid rgba(56,189,248,.45);box-shadow:0 10px 30px rgba(0,0,0,.35);border-radius:16px;padding:11px 14px;font-weight:850;max-width:92vw;font-family:system-ui,Arial,sans-serif';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function waitForXLSX() {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.XLSX) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > 12000) {
          clearInterval(timer);
          reject(new Error('XLSX kütüphanesi yüklenmedi.'));
        }
      }, 100);
    });
  }

  function idbPut(buffer) {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(false);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(buffer, KEY);
        store.put(buffer, FILE_NAME);
        store.put(buffer, FILE_NAME.toLowerCase());
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function readWorkbookRows(buffer) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }

  function normalizeRows(rows) {
    return rows.map((r, i) => {
      const level = safeText(get(r, ALIAS.level)) || 'A';
      const module = safeText(get(r, ALIAS.module)) || 'Genel Modül';
      const part = safeText(get(r, ALIAS.part));
      const stage = safeText(get(r, ALIAS.stage));
      const en = safeText(get(r, ALIAS.en));
      const tr = safeText(get(r, ALIAS.tr));
      return Object.assign({}, r, {
        __id: i + 1,
        level, seviye: level, Seviye: level,
        module, modul: module, 'Modül': module, Modul: module,
        part, parca: part, 'Parça': part,
        learningStage: stage, LearningStage: stage,
        sentence: en, Sentence: en, English: en,
        sentenceTr: tr, SentenceTR: tr, Turkish: tr,
        imageUrl: safeText(get(r, ALIAS.image))
      });
    }).filter(x => x.sentence || x.Sentence || x.English);
  }

  function buildModules(rows) {
    const map = new Map();
    rows.forEach(r => {
      const key = [r.level, r.module, r.part, r.learningStage].filter(Boolean).join(' · ') || 'Genel Modül';
      if (!map.has(key)) map.set(key, { id: key, title: key, level: r.level, module: r.module, part: r.part, stage: r.learningStage, rows: [], count: 0 });
      const m = map.get(key);
      m.rows.push(r);
      m.count++;
    });
    return Array.from(map.values()).sort((a, b) => String(a.id).localeCompare(String(b.id), 'tr', { numeric: true }));
  }

  function ensureActiveFileUI() {
    let el = document.getElementById('activeDataFileName');
    if (!el) {
      el = document.createElement('div');
      el.id = 'activeDataFileName';
      el.className = 'active-file-name';
      el.style.cssText = 'margin:8px 0 0;font-size:13px;color:#7dd3fc;font-weight:900;letter-spacing:.2px;';
      const anchor = document.querySelector('[id*="path" i] h1, [class*="path" i] h1, .menu-hero h1, h1') || document.body;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else document.body.prepend(el);
    }
    return el;
  }

  function setActiveFileName(name, count, modCount) {
    const txt = 'Aktif veri: ' + name + (count ? ' • ' + count + ' cümle' : '') + (modCount ? ' • ' + modCount + ' modül' : '');
    ensureActiveFileUI().textContent = txt;
    localStorage.setItem('activeDataFileName', name);
    localStorage.setItem('activeDataFileInfo', txt);
  }

  function callRenderHooks(rows, modules, fileName) {
    window.TUMDATA_ROWS = rows;
    window.TUMDATA_MODULES = modules;
    window.learningPathRows = rows;
    window.learningPathModules = modules;
    window.currentDataRows = rows;
    window.currentLearningModules = modules;

    try { localStorage.setItem('tumdata_module_count', String(modules.length)); } catch (_) {}

    ['renderLearningPath', 'renderLearningModules', 'buildLearningPath', 'initLearningPath', 'refreshLearningPath', 'loadLearningPath'].forEach(fn => {
      try {
        if (typeof window[fn] === 'function') window[fn](modules, rows);
      } catch (e) {
        console.warn(fn + ' çalışmadı:', e);
      }
    });

    window.dispatchEvent(new CustomEvent('tumdata:loaded', { detail: { rows, modules, fileName } }));
  }

  async function importTumDataWorkbook(buffer, fileName) {
    await waitForXLSX();
    await idbPut(buffer);
    const rows = normalizeRows(readWorkbookRows(buffer));
    const modules = buildModules(rows);
    setActiveFileName(fileName || FILE_NAME, rows.length, modules.length);
    callRenderHooks(rows, modules, fileName || FILE_NAME);
    console.log('✅ TumData_Temiz.xlsx yüklendi:', rows.length, 'cümle /', modules.length, 'modül');
    return { rows, modules };
  }

  async function fetchArrayBuffer() {
    let res;
    try {
      res = await fetch(FILE_URL + '?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('local path HTTP ' + res.status);
    } catch (_) {
      res = await fetch(RAW_URL + '?v=' + Date.now(), { cache: 'no-store' });
    }
    if (!res.ok) throw new Error('Dosya indirilemedi: HTTP ' + res.status);
    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength < 1000) throw new Error('İndirilen Excel boş veya hatalı.');
    return buffer;
  }

  async function loadTumDataFromGithub(force) {
    if (window.__tumDataAutoLoading) return window.__tumDataAutoLoading;
    if (!force && window.__tumDataLoadedOnce) return { rows: window.TUMDATA_ROWS || [], modules: window.TUMDATA_MODULES || [] };

    const btn = document.getElementById('loadTumDataBtn') || document.getElementById('tumDataAutoBtn') || document.getElementById('btnLoadTumDataFromGithub');
    const oldText = btn ? btn.textContent : '';

    window.__tumDataAutoLoading = (async () => {
      try {
        if (btn) { btn.disabled = true; btn.textContent = '⏳ TumData yükleniyor...'; }
        toast('TumData_Temiz.xlsx otomatik yükleniyor...');
        const buffer = await fetchArrayBuffer();
        const out = await importTumDataWorkbook(buffer, FILE_NAME);
        window.__tumDataLoadedOnce = true;
        toast('✅ TumData aktif: ' + out.rows.length + ' cümle / ' + out.modules.length + ' modül');
        if (btn) btn.textContent = '✅ TumData aktif';
        return out;
      } catch (err) {
        console.error('TumData otomatik yükleme hatası:', err);
        toast('❌ TumData yüklenemedi: ' + (err && err.message ? err.message : err));
        if (btn) btn.textContent = '❌ Tekrar dene';
        throw err;
      } finally {
        window.__tumDataAutoLoading = null;
        if (btn) setTimeout(() => { btn.disabled = false; btn.textContent = oldText || 'Sistemden TumData Yükle'; }, 1800);
      }
    })();

    return window.__tumDataAutoLoading;
  }

  function ensureButton() {
    let btn = document.getElementById('loadTumDataBtn') || document.getElementById('tumDataAutoBtn') || document.getElementById('btnLoadTumDataFromGithub');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'loadTumDataBtn';
      btn.textContent = 'Sistemden TumData Yükle';
      btn.style.cssText = 'border:0;border-radius:14px;padding:10px 14px;font-weight:900;background:#15803d;color:white;cursor:pointer;margin:4px;';
      const target = document.querySelector('.topbar,.toolbar,header,nav') || document.body;
      target.appendChild(btn);
    }
    btn.onclick = () => loadTumDataFromGithub(true);
  }

  function patchWMPathOpen() {
    const tryPatch = () => {
      if (!window.WMPath || typeof window.WMPath.open !== 'function' || window.WMPath.__tumDataPatched) return false;
      const originalOpen = window.WMPath.open.bind(window.WMPath);
      window.WMPath.open = function () {
        const result = originalOpen.apply(this, arguments);
        loadTumDataFromGithub(false).catch(() => {});
        return result;
      };
      window.WMPath.__tumDataPatched = true;
      return true;
    };
    if (tryPatch()) return;
    const timer = setInterval(() => { if (tryPatch()) clearInterval(timer); }, 250);
    setTimeout(() => clearInterval(timer), 10000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    patchWMPathOpen();
    const saved = localStorage.getItem('activeDataFileInfo') || localStorage.getItem('activeDataFileName');
    if (saved) ensureActiveFileUI().textContent = saved.startsWith('Aktif') ? saved : ('Aktif veri: ' + saved);

    // İstenen davranış: sayfa açılır açılmaz GitHub/proje klasöründeki Excel otomatik yüklensin.
    loadTumDataFromGithub(false).catch(() => {});
  });

  window.loadTumDataFromGithub = loadTumDataFromGithub;
  window.importTumDataWorkbook = importTumDataWorkbook;
})();
