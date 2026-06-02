/* ============================================================
   WORD MODE / SENTENCE MODE FIXES — TEK TEMİZ SÜRÜM
   2026-06-02
   ============================================================ */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function low(v) { return String(v == null ? '' : v).toLowerCase(); }

  /* GENİŞ ARAMA */
  window.WM_matchesQuery = function (item, q) {
    if (!q) return true;
    if (!item) return false;

    var fields = [
      item.word, item.Kelime, item.targetWord, item.highlight,
      item.sentence, item.Sentence, item.en, item.english,
      item.sentenceTr, item.SentenceTr, item.sentence_tr,
      item.tr, item.translation, item.meaning, item.anlam
    ];

    if (Array.isArray(item.meanings)) fields = fields.concat(item.meanings);

    return fields.some(v => v && low(v).includes(q));
  };

  if (typeof window.renderWordList === 'function' && !window.renderWordList.__wmFixed) {
    const oldRender = window.renderWordList;
    window.renderWordList = function () {
      const r = oldRender.apply(this, arguments);
      try {
        const q = low(window.currentSearchQuery).trim();
        if (q && window.virtualScrollData) {
          const base = typeof window.getFilteredWords === 'function'
            ? window.getFilteredWords()
            : (window.allWords || []);
          window.virtualScrollData.filteredWords = base.filter(x => window.WM_matchesQuery(x, q));
          if (typeof window.updateVisibleItems === 'function') window.updateVisibleItems();
        }
      } catch (e) {}
      return r;
    };
    window.renderWordList.__wmFixed = true;
  }

  window.filterWordsBySentence = function (val) {
    window.currentSearchQuery = low(val).trim();
    try { if (typeof window.renderWordList === 'function') window.renderWordList(); } catch (e) {}
  };

  /* SÖZLÜK POPUP FIX */
  function cleanWord(v) {
    return String(v == null ? '' : v)
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/^[^a-z]+|[^a-z]+$/g, '')
      .trim();
  }

  function candidates(word) {
    const w = cleanWord(word);
    const a = [w];
    if (w.endsWith('ies')) a.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) a.push(w.slice(0, -2));
    if (w.endsWith('s')) a.push(w.slice(0, -1));
    if (w.endsWith('ing')) {
      a.push(w.slice(0, -3));
      a.push(w.slice(0, -3) + 'e');
    }
    if (w.endsWith('ed')) {
      a.push(w.slice(0, -2));
      a.push(w.slice(0, -1));
    }
    return [...new Set(a.filter(Boolean))];
  }

  function normalizeRow(row, fallback) {
    if (!row || typeof row !== 'object') return null;

    const word = cleanWord(
      row.Kelime || row.kelime || row.word || row.Word || row.en || row.english || fallback
    );
    if (!word) return null;

    const meanings = [];
    ['tr', 'translation', 'meaning', 'anlam', 'anlam1', 'anlam2', 'anlam3', 'turkish'].forEach(k => {
      if (row[k]) meanings.push(String(row[k]).trim());
    });

    const pron =
      row.tr_pron || row.pron || row.türkçe_okunuş ||
      row.turkce_okunus || row.turkishPronunciation || row.phonetic || '';

    const level = row.cefr || row.CEFR || row.seviye || row.level || '';

    return Object.assign({}, row, {
      word,
      Kelime: row.Kelime || word,
      meanings: [...new Set(meanings.filter(Boolean))],
      tr_pron: pron,
      pron,
      cefr: String(level || '').toUpperCase(),
      level: String(level || '').toUpperCase()
    });
  }

  function buildMap(data) {
    const map = {};
    if (Array.isArray(data)) {
      data.forEach(row => {
        const n = normalizeRow(row);
        if (n) map[n.word] = n;
      });
    } else if (data && typeof data === 'object') {
      Object.keys(data).forEach(k => {
        const n = normalizeRow(data[k], k);
        if (n) map[n.word] = n;
      });
    }
    return map;
  }

  function installDictionary(data, source) {
    const map = buildMap(data);
    if (!Object.keys(map).length) return false;
    window.WM_Dictionary = map;
    window.WM_SOZLUK_MEANING_MAP = Object.assign({}, window.WM_SOZLUK_MEANING_MAP || {}, map);
    console.log('✅ Sözlük map hazır:', Object.keys(map).length, source || '');
    return true;
  }

  window.WM_lookupDict = function (word) {
    const maps = [window.WM_SOZLUK_MEANING_MAP, window.WM_Dictionary];
    for (const m of maps) {
      if (!m) continue;
      for (const c of candidates(word)) {
        if (m[c]) return normalizeRow(m[c], c) || m[c];
      }
    }
    return null;
  };

  async function loadDict() {
    if (window.WM_lookupDict('organization')) return;

    for (const path of ['data/sozluk.json', 'sozluk.json']) {
      try {
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) continue;
        const j = await r.json();
        if (installDictionary(j, path)) return;
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDict);
  } else {
    setTimeout(loadDict, 0);
  }

  /* NAV / LİSTE TIKLAMA FIX */
  function getData() {
    if (Array.isArray(window.words) && window.words.length) return window.words;
    if (Array.isArray(window.allWords) && window.allWords.length) return window.allWords;
    return [];
  }

  function getIndex() {
    try { if (typeof idx === 'number') return idx; } catch (e) {}
    return Number(window.idx || window.currentIndex || window.wordIndex || 0) || 0;
  }

  function setIndex(n) {
    const data = getData();
    const i = Math.max(0, Math.min(data.length - 1, Number(n) || 0));
    try { idx = i; } catch (e) {}
    window.idx = i;
    window.currentIndex = i;
    window.wordIndex = i;
    return i;
  }

  function refreshWordScreen() {
    try { phase = 'learn'; } catch (e) {}
    try { if (typeof showScreen === 'function') showScreen('sc-word'); } catch (e) {}
    try { if (typeof renderLearn === 'function') renderLearn(); } catch (e) {}
    try { if (typeof updateWordCounter === 'function') updateWordCounter(); } catch (e) {}
  }

  window.WM_forceNextWord = function () {
    setIndex(getIndex() + 1);
    refreshWordScreen();
    return false;
  };

  window.WM_forcePrevWord = function () {
    setIndex(getIndex() - 1);
    refreshWordScreen();
    return false;
  };

  window.nextWord = window.navNextWord = window.WM_forceNextWord;
  window.prevWord = window.navPrevWord = window.WM_forcePrevWord;

  window.goToWord = function (pos, source) {
    const data = getData();
    const src = Array.isArray(source)
      ? source
      : (window.virtualScrollData && window.virtualScrollData.filteredWords) || data;

    const item = src[Number(pos) || 0];
    let real = Number(pos) || 0;

    if (item) {
      real = data.findIndex(x =>
        (x.id && item.id && x.id === item.id) ||
        (x.rowNum && item.rowNum && x.rowNum === item.rowNum) ||
        (x.sentence && item.sentence && x.sentence === item.sentence)
      );
      if (real < 0) real = Number(pos) || 0;
    }

    setIndex(real);
    refreshWordScreen();
    return false;
  };

  document.addEventListener('click', function (ev) {
    const t = ev.target;
    if (!t || !t.closest) return;

    const listItem = t.closest('#wordListEl .wi, #wordListEl [onclick*="goToWord"]');
    if (listItem) {
      const on = listItem.getAttribute('onclick') || '';
      const m = on.match(/goToWord\s*\(\s*(\d+)/);
      if (m) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        window.goToWord(Number(m[1]));
      }
    }
  }, true);

  /* PDF MINING - CÜMLELERİ ÇIKAR */
  function extractSentences(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+(?=[A-Z"“‘])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 8 && /[a-zA-Z]/.test(s));
  }

  window.ffExtractSentences = function () {
    const text = $('ffText') ? $('ffText').value : '';
    const out = $('ffMineOut');
    const stats = $('ffMineStats');
    const sentences = extractSentences(text);
    window.FF_LAST_SENTENCES = sentences;

    if (stats) {
      stats.style.display = 'grid';
      stats.innerHTML = `
        <div class="ff-stat"><b>${sentences.length}</b><span>CÜMLE</span></div>
        <div class="ff-stat"><b>${text.length}</b><span>KARAKTER</span></div>
      `;
    }

    if (out) {
      out.innerHTML = sentences.length
        ? `<div class="ff-list">${sentences.map((s,i)=>`
            <div class="ff-item">
              <div class="ff-w">${i+1}</div>
              <div class="ff-body"><div class="ff-m">${s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}</div></div>
            </div>`).join('')}</div>
            <button class="ff-btn ff-blue" onclick="ffCopySentences()">Cümleleri Kopyala</button>`
        : '<div class="ff-sub">Çıkarılacak cümle bulunamadı.</div>';
    }
  };

  window.ffCopySentences = function () {
    const arr = window.FF_LAST_SENTENCES || [];
    if (!arr.length) return alert('Önce cümleleri çıkar.');
    navigator.clipboard.writeText(arr.join('\n')).then(() => alert(arr.length + ' cümle kopyalandı.'));
  };

  function addSentenceButton() {
    document.querySelectorAll('button').forEach(btn => {
      if ((btn.textContent || '').trim() === 'Kelimeleri Çıkar' && !btn.parentElement.querySelector('.ff-sentence-extract-btn')) {
        const b = document.createElement('button');
        b.className = 'ff-btn ff-orange ff-sentence-extract-btn';
        b.textContent = 'Cümleleri Çıkar';
        b.onclick = window.ffExtractSentences;
        btn.insertAdjacentElement('afterend', b);
      }
    });
  }

  setInterval(addSentenceButton, 1000);

/* ════════════════════════════════════════════════════════════════
   SEKMELİ ARAÇLAR PANELİ — Araçlar + Özellikler (kategoriler)
   "🎯 Özellikler" bölümü kelime ekranından kaldırılır, tüm
   butonları bu yan panelde "Özellikler" sekmesine taşınır.
   ════════════════════════════════════════════════════════════════ */
(function(){
  if (window.__WM_CLEAN_TOOLS_PANEL_V3__) return;
  window.__WM_CLEAN_TOOLS_PANEL_V3__ = true;

  // — güvenli çağırıcı: fonksiyon varsa çalıştır —
  function run(fn){ return function(){ try{ fn(); }catch(e){ console.warn('Araç hatası:', e); } }; }
  function scr(id){ return run(function(){ if(window.showScreen) showScreen(id); }); }
  // switchTab, alt menü sekmelerini doğru başlatır (ekran + init birlikte)
  function tab(name){ return run(function(){ if(window.switchTab) switchTab(name); else if(window.showScreen) showScreen('sc-'+name); }); }

  // "Araçlar" sekmesi (önceki sabit liste)
  const TOOL_ITEMS = [
    ['📘 Kelime Ekranı', scr('sc-word')],
    ['📋 Liste',         scr('sc-list')],
    ['📊 Panel',         run(function(){ if(window.ffOpen) ffOpen('dash'); })],
    ['⛏️ PDF / Transcript Mining', run(function(){ if(window.ffOpen) ffOpen('mine'); })],
    ['🧠 Akıllı Tekrar', run(function(){ if(window.ffOpen) ffOpen('rev'); })],
    ['🎧 Shadow',        run(function(){ if(window.ffOpen) ffOpen('shad'); })],
    ['🗺️ Dil Haritası',  run(function(){ window.open('dil_haritasi_v1.html','_blank'); })],
    ['📊 İstatistik',    tab('stats')],
    ['📷 Kamera',        tab('cameraCoach')],
    ['⚙️ Ayarlar',       tab('settings')],
    ['⚡ Canlı Skor Koçu', tab('pronstandalone')]
  ];

  // "Özellikler" sekmesi — kelime ekranındaki tüm kategoriler ve butonları
  const FEATURE_GROUPS = [
    ['🔊 Ses & Telaffuz', [
      ['🔊 Kelime',   run(function(){ if(window.speakWord) speakWord(); })],
      ['🔊 Cümle',    run(function(){ if(window.speakSentence) speakSentence(); })],
      ['🔊 Türkçe',   run(function(){ if(window.speakTR) speakTR(); })],
      ['🎤 Koç',      run(function(){ if(window.openPronCoach) openPronCoach(); })],
      ['🎤 Telaffuz', run(function(){ var p=document.getElementById('pronunPanel'); if(p) p.style.display=''; })],
      ['🗣️ Aksan',    scr('sc-accent')]
    ]],
    ['💬 Konuşma & Yazma', [
      ['🗣️ Konuşma',   run(function(){ if(window.openConversationSim) openConversationSim(); })],
      ['✍️ Cümle Yaz', run(function(){ if(window.openSentenceCorrector) openSentenceCorrector(); })],
      ['🗨️ Partner',   run(function(){ if(window.openPartnerChat) openPartnerChat(); })]
    ]],
    ['📝 Alıştırmalar', [
      ['🔤 Cümle Modu', scr('sc-sent')],
      ['👥 Shadow',     run(function(){ if(window.openShadowMode) openShadowMode(); })],
      ['📝 AI Test',    scr('sc-quiz')],
      ['📚 Gramer',     scr('sc-grammar')]
    ]],
    ['🤖 AI İçerik', [
      ['📖 Hikaye',  run(function(){ if(window.openStoryScreen) openStoryScreen(); })],
      ['🎧 Podcast', run(function(){ if(window.openPodcastScreen) openPodcastScreen(); })],
      ['🖼️ Görsel',  run(function(){ if(window.openWordVisual) openWordVisual(); })]
    ]],
    ['🛠️ Araçlar', [
      ['📋 Kopyala',      run(function(){ if(window.copyToClipboard) copyToClipboard(); })],
      ['🌐 Çeviri',       run(function(){ if(window.openGT) openGT(); })],
      ['🧠 Bağlam',       run(function(){ if(window.openContextAnalysis) openContextAnalysis(); })],
      ['📺 Video',        scr('sc-videos')],
      ['🎵 Şarkı',        scr('sc-song')],
      ['📚 Kütüphane',    scr('sc-library')],
      ['❓ AI Sor',       run(function(){ if(window.openAskAIScreen) openAskAIScreen(); })],
      ['📘 Sözlük',       run(function(){ if(window.openDictBuilder) openDictBuilder(); })],
      ['📚 Sözlüğüm',     run(function(){ if(window.openMyDictionary) openMyDictionary(); })],
      ['🌍 Geniş Sözlük', run(function(){ if(window.openBroadDictionary) openBroadDictionary(); })],
      ['🧠 Context',      run(function(){ if(window.openContextTeacher) openContextTeacher(); })],
      ['🌳 Kelime Ağacı', run(function(){ if(window.openWordFamilyTree) openWordFamilyTree(); })]
    ]]
  ];

  function hideOnlyFloatingButtons(){
    document.querySelectorAll('#ffFabs,.ff-fabs,.ff-fab').forEach(function(e){ e.style.display='none'; });
  }

  // Kelime ekranındaki "🎯 Özellikler" bölümünü ve butonunu gizle
  function hideFeatureSection(){
    var sec=document.getElementById('actRow');        if(sec) sec.style.display='none';
    var btn=document.getElementById('featuresToggleBtn'); if(btn) btn.style.display='none';
  }

  function styleBtn(b){
    b.style.cssText='display:block;width:100%;margin:8px 0;padding:14px;border-radius:16px;background:#1f2937;color:#fff;border:1px solid #334155;text-align:left;font-weight:900;cursor:pointer';
  }

  function rebuildTools(){
    document.querySelectorAll('#wmToolsBtn,#wmToolsDrawer').forEach(function(e){ e.remove(); });

    const btn=document.createElement('button');
    btn.id='wmToolsBtn';
    btn.textContent='🧰 Araçlar';
    btn.style.cssText='position:fixed;right:14px;top:130px;z-index:999999;background:#2563eb;color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:900;cursor:pointer';

    const drawer=document.createElement('div');
    drawer.id='wmToolsDrawer';
    drawer.style.cssText='position:fixed;top:0;right:-360px;width:340px;max-width:90vw;height:100vh;background:#111827;z-index:1000000;padding:18px;transition:right .25s;overflow-y:auto;border-left:1px solid #334155;box-sizing:border-box';

    drawer.innerHTML=
      '<button id="wmToolsClose" style="float:right;background:transparent;color:#fff;border:0;font-size:28px;cursor:pointer">×</button>'+
      '<h3 style="margin:0 0 14px;font-size:22px;color:#fff">🧰 Araçlar</h3>'+
      '<div id="wmTabBar" style="display:flex;gap:8px;margin-bottom:14px"></div>'+
      '<div id="wmTabFeatures"></div>'+
      '<div id="wmTabTools" style="display:none"></div>';

    document.body.appendChild(btn);
    document.body.appendChild(drawer);

    // — sekme barı —
    const tabBar=drawer.querySelector('#wmTabBar');
    const paneFeatures=drawer.querySelector('#wmTabFeatures');
    const paneTools=drawer.querySelector('#wmTabTools');

    function makeTab(label,target){
      const t=document.createElement('button');
      t.textContent=label;
      t.style.cssText='flex:1;padding:10px;border-radius:12px;border:1px solid #334155;background:#1f2937;color:#fff;font-weight:900;cursor:pointer';
      t.onclick=function(){
        paneFeatures.style.display = (target==='features') ? 'block':'none';
        paneTools.style.display    = (target==='tools')    ? 'block':'none';
        tabBar.querySelectorAll('button').forEach(function(x){ x.style.background='#1f2937'; });
        t.style.background='#2563eb';
      };
      return t;
    }
    const tabF=makeTab('🎯 Özellikler','features');
    const tabT=makeTab('🧰 Araçlar','tools');
    tabF.style.background='#2563eb'; // varsayılan aktif
    tabBar.appendChild(tabF);
    tabBar.appendChild(tabT);

    // — Özellikler sekmesi: kategori başlıkları + butonlar —
    FEATURE_GROUPS.forEach(function(grp){
      const head=document.createElement('div');
      head.textContent=grp[0];
      head.style.cssText='margin:14px 0 6px;font-size:14px;font-weight:900;color:#93c5fd';
      paneFeatures.appendChild(head);
      grp[1].forEach(function(item){
        const b=document.createElement('button');
        b.textContent=item[0]; styleBtn(b);
        b.onclick=function(){ drawer.style.right='-360px'; item[1](); };
        paneFeatures.appendChild(b);
      });
    });

    // — Araçlar sekmesi: düz liste —
    TOOL_ITEMS.forEach(function(item){
      const b=document.createElement('button');
      b.textContent=item[0]; styleBtn(b);
      b.onclick=function(){ drawer.style.right='-360px'; item[1](); };
      paneTools.appendChild(b);
    });

    btn.onclick=function(){ drawer.style.right='0'; };
    drawer.querySelector('#wmToolsClose').onclick=function(){ drawer.style.right='-360px'; };

    hideOnlyFloatingButtons();
    hideFeatureSection();
  }

  window.WM_REBUILD_TOOLS=rebuildTools;

  // ── YERLEŞİM GÜVENCESİ ─────────────────────────────────────────
  // Konuşma Partneri, Persona ve Canlı Skor Koçu kartları bazı
  // durumlarda alt alta diziliyordu; grid'i garantiye alıyoruz.
  function injectLayoutGuard(){
    if(document.getElementById('wm-layout-guard')) return;
    var css = ''
      + '#partnerSelector,.partner-selector{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;}'
      + '#personaGrid,.persona-grid{display:grid !important;grid-template-columns:1fr 1fr !important;gap:10px !important;}'
      + '.partner-card,.persona-card{text-align:center !important;}'
      + '#scenarioGrid{display:flex !important;flex-wrap:wrap !important;gap:7px !important;}'
      + '.pfc-sound-grid{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;}'
      + '.pfc-face-wrap{display:grid !important;grid-template-columns:128px 1fr !important;gap:12px !important;align-items:center !important;}'
      + '@media(max-width:430px){.pfc-sound-grid{grid-template-columns:1fr !important;}.pfc-face-wrap{grid-template-columns:1fr !important;}}';
    var s = document.createElement('style');
    s.id = 'wm-layout-guard';
    s.textContent = css;
    document.head.appendChild(s);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ rebuildTools(); injectLayoutGuard(); });
  }else{
    rebuildTools();
    injectLayoutGuard();
  }

  // kelime ekranı yeniden çizilirse Özellikler bölümünü tekrar gizle
  setInterval(function(){ hideOnlyFloatingButtons(); hideFeatureSection(); },1000);
})();

  console.log('✅ FIXES TEK TEMİZ SÜRÜM AKTİF (v3 sekmeli panel)');
})();
