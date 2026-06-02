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

  function wmLookupImpl(word){
    var maps = [window.WM_SOZLUK_MEANING_MAP, window.WM_Dictionary];
    for (var i=0;i<maps.length;i++){
      var m = maps[i];
      if (!m || Array.isArray(m)) continue;
      var cs = candidates(word);
      for (var j=0;j<cs.length;j++){
        var hit = m[cs[j]];
        if (!hit) continue;
        var norm = normalizeRow(hit, cs[j]) || hit;
        // meanings boşsa diğer kaynaktan tamamla
        if (!norm.meanings || !norm.meanings.length){
          var other = (window.WM_SOZLUK_MEANING_MAP||{})[cs[j]] || (window.WM_Dictionary||{})[cs[j]];
          if (other){
            var n2 = normalizeRow(other, cs[j]);
            if (n2 && n2.meanings && n2.meanings.length) norm.meanings = n2.meanings;
            else if (other.meanings && other.meanings.length) norm.meanings = other.meanings;
          }
        }
        if (norm.meanings && norm.meanings.length) return norm;
        // bu kaynakta boş — sıradaki kaynağa devam
      }
    }
    return null;
  }
  try {
    Object.defineProperty(window, 'WM_lookupDict', {
      configurable: false, enumerable: true,
      get: function(){ return wmLookupImpl; },
      set: function(){ /* legacy ezmesini yok say */ }
    });
  } catch(e){ window.WM_lookupDict = wmLookupImpl; }

  async function loadDict() {
    // sozluk.json'u her açılışta yükle; hem WM_Dictionary hem WM_SOZLUK_MEANING_MAP'i doldur.
    for (const path of ['data/sozluk.json', 'sozluk.json']) {
      try {
        const r = await fetch(path, { cache: 'force-cache' });
        if (!r.ok) continue;
        const j = await r.json();
        const map = buildMap(j);
        if (!Object.keys(map).length) continue;
        // WM_Dictionary array olarak gelmişse (legacy ham liste atıyor) onu YOK SAY;
        // lookup string anahtar ister. Var olan map'i koru, eksikleri map ile tamamla.
        var prev = window.WM_Dictionary;
        var prevMap = (prev && !Array.isArray(prev) && typeof prev === 'object') ? prev : {};
        window.WM_Dictionary = Object.assign({}, map, prevMap);
        window.WM_SOZLUK_MEANING_MAP = Object.assign({}, map, window.WM_SOZLUK_MEANING_MAP || {});
        console.log('✅ Sözlük map hazır:', Object.keys(map).length, path, '| took:', !!window.WM_Dictionary['took']);
        return;
      } catch (e) {}
    }
  }

  function bootDict(){ loadDict(); setTimeout(loadDict, 1500); setTimeout(loadDict, 4000); }

  /* ════════ GÖRSEL ARAMA v2: hedef kelime + cümledeki isim, 3 kaynak, IndexedDB cache ════════ */
  (function(){
    var STOP = new Set('the a an is are was were be been being have has had do does did will would shall should can could may might must to of in on at by for with and or but not it this that these those they we he she i you your my our their as so very from into about after before all lot much many one two there here'.split(' '));

    // sözlük etiketinden isim mi? ("[i.]" = isim)
    function isNoun(w){
      try{
        var rec = window.WM_lookupDict ? window.WM_lookupDict(w) : null;
        if(rec && rec.meanings) return rec.meanings.some(function(m){ return /\[i\.\]/.test(m); });
      }catch(e){}
      return false;
    }
    // cümleden en iyi ismi seç: sözlükte [i.] etiketli ilk uzun kelime; yoksa en uzun içerik kelimesi
    function pickNoun(sentence, target){
      var words = String(sentence||'').replace(/[^a-zA-Z ]/g,' ').split(/\s+/)
        .map(function(x){ return x.toLowerCase(); })
        .filter(function(x){ return x.length>2 && !STOP.has(x) && x!==String(target||'').toLowerCase(); });
      for(var i=0;i<words.length;i++){ if(isNoun(words[i])) return words[i]; }
      // yedek: en uzun içerik kelimesi
      words.sort(function(a,b){ return b.length-a.length; });
      return words[0] || '';
    }

    function buildTerms(sentence, target){
      var t = cleanWord(target);
      var noun = pickNoun(sentence, t);
      var terms = [];
      if(t && noun && noun!==t) terms.push(t+' '+noun); // hedef + isim
      if(noun) terms.push(noun);                         // sadece isim
      if(t) terms.push(t);                               // hedef kelime
      return terms.filter(Boolean).filter(function(v,i,a){ return a.indexOf(v)===i; });
    }

    // ---- kaynaklar ----
    async function wikiSearch(q){
      try{
        var s=await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch='+encodeURIComponent(q)+'&srlimit=3');
        var sj=await s.json(); var hits=(sj.query&&sj.query.search)||[];
        for(var k=0;k<hits.length;k++){
          var r=await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilimit=1&pageids='+hits[k].pageid);
          var rj=await r.json(); var pages=(rj.query&&rj.query.pages)||{};
          for(var p in pages){ if(pages[p].thumbnail) return pages[p].thumbnail.source; }
        }
      }catch(e){} return null;
    }
    async function openverse(q){
      try{
        var r=await fetch('https://api.openverse.org/v1/images/?q='+encodeURIComponent(q)+'&page_size=3',{headers:{'Accept':'application/json'}});
        if(!r.ok) return null; var j=await r.json(); var f=j.results&&j.results[0];
        return f ? (f.thumbnail||f.url) : null;
      }catch(e){} return null;
    }
    async function commons(q){
      try{
        var r=await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch='+encodeURIComponent('filetype:bitmap '+q)+'&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=400');
        var j=await r.json(); var pages=(j.query&&j.query.pages)||{};
        for(var p in pages){ var ii=pages[p].imageinfo&&pages[p].imageinfo[0]; if(ii&&ii.thumburl) return ii.thumburl; }
      }catch(e){} return null;
    }
    var SOURCES=[wikiSearch, openverse, commons];

    async function searchImage(terms){
      for(var i=0;i<terms.length;i++){
        for(var s=0;s<SOURCES.length;s++){
          var url=await SOURCES[s](terms[i]);
          if(url) return url;
        }
      }
      return null;
    }

    // IndexedDB cache (WMStore) + bellek cache
    var mem={};
    function ckey(word, sentence){ return 'wm_img:'+String(word||'')+'|'+String(sentence||'').slice(0,80); }
    async function cacheGet(key){
      if(mem[key]!==undefined) return mem[key];
      try{ if(window.WMStore && WMStore.get){ var v=await WMStore.get(key); if(v!=null){ mem[key]=v; return v; } } }catch(e){}
      return undefined;
    }
    function cacheSet(key, val){
      mem[key]=val;
      try{ if(window.WMStore && WMStore.set) WMStore.set(key, val); }catch(e){}
    }

    function showImg(img, wrap, credit, url, label){
      function reveal(){ wrap.style.display='block'; if(credit) credit.innerHTML=label; }
      img.onload=reveal;
      img.onerror=function(){ wrap.style.display='none'; };
      // Aynı URL ise src ataması onload tetiklemez; ayrıca tarayıcı cache'inden
      // gelen görselde complete=true olabilir → elle göster.
      if(img.getAttribute('src')===url){
        if(img.complete && img.naturalWidth>0) reveal();
        else wrap.style.display='block';
        return;
      }
      img.src=url;
      if(img.complete && img.naturalWidth>0) reveal(); // senkron cache hit
    }

    var _wmLSI = async function(sentence, word){
      var wrap=document.getElementById('sentImgWrap');
      var img=document.getElementById('sentImg');
      var credit=document.getElementById('imgCredit');
      if(!wrap || !img) return;

      // 1) satır verisinde gömülü görsel
      try{
        var row=(Array.isArray(window.words)&&window.words[window.idx])||(Array.isArray(words)&&words[idx])||{};
        var embed=row.imageUrl||row.image||row.imgUrl||row.photo||row.picture||row.visual;
        if(embed && /^https?:\/\//i.test(String(embed))){
          showImg(img, wrap, credit, embed, '📷 Kaynak dosya'); return;
        }
      }catch(e){}

      var key=ckey(word, sentence);
      if(credit) credit.innerHTML='';

      // 2) cache
      var cached=await cacheGet(key);
      if(cached!==undefined){
        if(cached==='__NONE__'){ wrap.style.display='none'; return; }
        showImg(img, wrap, credit, cached, '📷 Önbellek'); return;
      }

      // henüz bilinmiyor: arama bitene kadar gizle
      wrap.style.display='none';

      // 3) ara
      var terms=buildTerms(sentence, word);
      var url=await searchImage(terms);
      if(url){
        showImg(img, wrap, credit, url, '📷 Wikipedia / Openverse / Commons');
        cacheSet(key, url);
      }else{
        wrap.style.display='none'; cacheSet(key, '__NONE__');
      }
    };
    try{
      Object.defineProperty(window, 'loadSentenceImage', {
        configurable:false, enumerable:true,
        get:function(){ return _wmLSI; },
        set:function(){ /* legacy ezmesini yok say */ }
      });
    }catch(e){ window.loadSentenceImage=_wmLSI; }
  })();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootDict);
  } else {
    setTimeout(bootDict, 0);
  }

  // Legacy WM_Dictionary'yi ham array ile ezerse (lookup string anahtar ister) tekrar map'e çevir
  setInterval(function(){
    var d = window.WM_Dictionary;
    if (Array.isArray(d)) loadDict();
  }, 2000);

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
    // Render sonrası görseli yeniden bas (cache'ten anında gelir, sorgu yapmaz)
    try {
      var row = getData()[getIndex()] || {};
      var sent = row.sentence || row.cumle || row.example || row.Sentence || '';
      var w = row.word || row.Kelime || row.english || '';
      if (window.loadSentenceImage && (sent || w)) {
        setTimeout(function(){ try{ window.loadSentenceImage(sent, w); }catch(e){} }, 60);
      }
    } catch (e) {}
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

  // addSentenceButton: her saniye yerine DOM değişince debounce'lu çalış
  addSentenceButton();
  (function(){
    var t=null;
    try{
      new MutationObserver(function(){
        if(t) return;
        t=setTimeout(function(){ t=null; addSentenceButton(); },300);
      }).observe(document.body,{childList:true,subtree:true});
    }catch(e){ setInterval(addSentenceButton,1000); }
    setInterval(addSentenceButton,5000);
  })();

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
  // ffOpen çağrısı + overlay'in gerçekten açıldığını garanti et
  function ff(w){
    return run(function(){
      if(!window.ffOpen){ console.warn('ffOpen tanımlı değil (free_features.js yüklendi mi?)'); return; }
      ffOpen(w);
      // overlay açılmadıysa zorla aç (z-index/active güvencesi)
      var id={dash:'ffDash',mine:'ffMine',rev:'ffRev',shad:'ffShad'}[w];
      var el=document.getElementById(id);
      if(el){ el.classList.add('active'); el.style.display='block'; el.style.zIndex='1000001'; el.scrollTop=0; }
      else { console.warn('Overlay bulunamadı:', id); }
    });
  }

  // "Araçlar" sekmesi (önceki sabit liste)
  const TOOL_ITEMS = [
    ['📘 Kelime Ekranı', scr('sc-word')],
    ['📋 Liste',         scr('sc-list')],
    ['📊 Panel',         ff('dash')],
    ['⛏️ PDF / Transcript Mining', ff('mine')],
    ['🧠 Akıllı Tekrar', ff('rev')],
    ['🎧 Shadow',        ff('shad')],
    ['🗺️ Dil Haritası',  run(function(){ window.open('dil_haritasi_v1.html','_blank'); })],
    ['📊 İstatistik',    tab('stats')],
    ['📷 Kamera',        tab('cameraCoach')],
    ['⚙️ Ayarlar',       tab('settings')],
    ['⚡ Canlı Skor Koçu', run(function(){
      if(window.openLiveCoachFromSettings) openLiveCoachFromSettings();
      else if(window.showScreen) showScreen('sc-live-coach');
    })]
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
      ['🎴 Flashcard',  run(function(){ if(window.openFlashcardMode) openFlashcardMode(); })],
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
    // Kart altındaki buton bloğu (📋 Kelime Listesi / 📌 Ezberlenecekler / 🎯 Özellikler)
    // featuresToggleBtn'in sarmalayan grid'ini gizle — tüm blok yan panele taşındı.
    if(btn && btn.parentElement && btn.parentElement.dataset.wmHidden!=='1'){
      btn.parentElement.style.display='none';
      btn.parentElement.dataset.wmHidden='1';
    }
    // Kart içindeki ekstra: telaffuz sıfırla butonunu gizle — sadece ◀ 🔊 🔊 ▶ kalsın
    var wc=document.getElementById('wordCard');
    if(wc){
      wc.querySelectorAll('button[onclick*="resetPronun"]').forEach(function(b){ b.style.display='none'; });
    }
    // Flashcard / Akıllı Tekrar / Yapay Zekaya Sor → panele taşındı, kelime ekranında gizle
    var wordScreen=document.getElementById('sc-word');
    if(wordScreen){
      var sels=['button[onclick*="openFlashcardMode"]','button[onclick*="openAskAIScreen"]'];
      // startReviewMode birden çok yerde; sadece kart altındaki görünür olanı + grid'i gizle
      wordScreen.querySelectorAll('button[onclick*="openFlashcardMode"],button[onclick*="startReviewMode"],button[onclick*="openAskAIScreen"]').forEach(function(b){
        if(b.id==='btnReview') return; // tekrar sayacı butonu kalsın
        b.style.display='none';
        // Flashcard/Akıllı Tekrar aynı grid'de — sarmalayıcıyı da gizle
        var p=b.parentElement;
        if(p && p.style && p.style.display!=='none' && p.querySelectorAll('button').length<=2 && p.id!=='sc-word'){
          p.style.display='none';
        }
      });
    }
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
      // Konuşma Simülasyonu kişilik kartları (Emma/Mike/Sophia/Jack) — 2 sütun
      + '.wm-character-grid{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;}'
      + '.wm-character{text-align:center !important;padding:10px 8px !important;border:1px solid #334155 !important;border-radius:12px !important;cursor:pointer !important;}'
      + '.wm-char-emoji{font-size:24px !important;line-height:1 !important;}'
      + '.wm-char-name{font-weight:900 !important;margin-top:4px !important;}'
      + '.wm-char-meta{font-size:12px !important;color:var(--muted,#7c85b0) !important;}'
      // Kelime Ağacı — kelimeler yeşil+bold, anlam soluk; aynı formatta görünme sorunu
      + '.tree-word-item{padding:6px 0 !important;border-bottom:1px solid rgba(255,255,255,.06) !important;}'
      + '.tree-word-main{font-size:15px !important;font-weight:900 !important;color:var(--green,#22c55e) !important;}'
      + '.tree-word-meaning{font-size:12px !important;font-weight:400 !important;color:var(--muted,#7c85b0) !important;line-height:1.45 !important;margin-top:2px !important;}'
      + '#scenarioGrid{display:flex !important;flex-wrap:wrap !important;gap:7px !important;}'
      + '.pfc-sound-grid{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;}'
      + '.pfc-sound-card{font-size:12px !important;padding:8px !important;}'
      + '.pfc-card-actions{display:flex !important;gap:4px !important;flex-wrap:wrap !important;margin-top:6px !important;}'
      + '.pfc-card-actions .pfc-mini-action{flex:1 !important;min-width:0 !important;font-size:11px !important;padding:6px 4px !important;}'
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

  // Kelime ekranı yeniden çizilince temizliği uygula.
  // Her saniye yoklama yerine: DOM değişince debounce'lu çalış (kullanım daha akıcı),
  // ek olarak seyrek bir güvenlik fallback'i bırak.
  function wmCleanupTick(){ hideOnlyFloatingButtons(); hideFeatureSection(); }
  wmCleanupTick();
  var _wmCleanT=null;
  try{
    new MutationObserver(function(){
      if(_wmCleanT) return;
      _wmCleanT=setTimeout(function(){ _wmCleanT=null; wmCleanupTick(); },250);
    }).observe(document.body,{childList:true,subtree:true});
  }catch(e){
    setInterval(wmCleanupTick,1000); // observer yoksa eski yönteme dön
  }
  setInterval(wmCleanupTick,5000); // seyrek güvenlik ağı
})();

  console.log('✅ FIXES TEK TEMİZ SÜRÜM AKTİF (v3 sekmeli panel)');

  /* ════════ AÇILIŞ KAPISI: sözlük + yedekleme klasörü hazır olmadan kullanılamaz ════════ */
  (function(){
    function folderReady(){ try{ return localStorage.getItem('backupFolderSelected')==='true'; }catch(e){ return false; } }
    function dictReady(){
      var d=window.WM_Dictionary;
      return d && Object.keys(d).length>500;
    }

    var gate=document.createElement('div');
    gate.id='wmStartupGate';
    gate.style.cssText='position:fixed;inset:0;z-index:999999;background:#0a0d14;color:#e8eaf6;display:flex;align-items:center;justify-content:center;font-family:Nunito,system-ui,sans-serif;padding:24px';
    gate.innerHTML=''
      +'<div style="max-width:420px;width:100%;text-align:center">'
      +'<div style="font-size:42px;margin-bottom:8px">📘</div>'
      +'<div style="font-size:20px;font-weight:900;margin-bottom:18px">WordMode hazırlanıyor</div>'
      +'<div id="wmGateFolder" style="background:#161b28;border:1px solid #252d42;border-radius:14px;padding:14px;margin-bottom:10px;text-align:left">⏳ Yedekleme klasörü kontrol ediliyor…</div>'
      +'<button id="wmGateFolderBtn" style="display:none;width:100%;margin:0 0 10px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:900;font-size:15px;cursor:pointer">📁 Yedekleme Klasörü Seç</button>'
      +'<div id="wmGateDict" style="background:#161b28;border:1px solid #252d42;border-radius:14px;padding:14px;text-align:left">⏳ Sözlük yükleniyor…</div>'
      +'</div>';

    function showGate(){ if(!document.getElementById('wmStartupGate')) document.body.appendChild(gate); }
    function hideGate(){ var g=document.getElementById('wmStartupGate'); if(g) g.remove(); }

    // Sözlüğü yedekleme klasörü üzerinden (yoksa GitHub'dan kopyalayarak) hazırla
    async function ensureDict(){
      try{
        if(typeof window.ensureSozlukJsonInBackupFolder==='function'){
          await window.ensureSozlukJsonInBackupFolder({force:false, showStatus:false});
        }
      }catch(e){}
      if(!dictReady()){ try{ await loadDict(); }catch(e){} } // fixes.js fallback (GitHub raw)
    }

    var tries=0;
    function tick(){
      var fEl=document.getElementById('wmGateFolder');
      var dEl=document.getElementById('wmGateDict');
      var fBtn=document.getElementById('wmGateFolderBtn');

      var fReady=folderReady();
      var dReadyNow=dictReady();

      if(fEl) fEl.innerHTML = fReady ? '✅ Yedekleme klasörü aktif' : '⚠️ Yedekleme klasörü seçilmedi';
      if(fBtn) fBtn.style.display = fReady ? 'none' : 'block';
      if(dEl) dEl.innerHTML = dReadyNow ? ('✅ Sözlük hazır ('+Object.keys(window.WM_Dictionary).length+' kelime)') : '⏳ Sözlük yükleniyor…';

      if(fReady && dReadyNow){ hideGate(); return; }

      // klasör hazırsa ve sözlük değilse, hazırlamayı tetikle (en fazla birkaç kez)
      if(fReady && !dReadyNow && tries<6){ tries++; ensureDict(); }

      setTimeout(tick, 700);
    }

    function start(){
      showGate();
      var btn=document.getElementById('wmGateFolderBtn');
      if(btn) btn.onclick=function(){
        try{
          if(typeof window.selectBackupFolder==='function'){
            Promise.resolve(window.selectBackupFolder()).then(function(){ tries=0; ensureDict(); });
          }
        }catch(e){}
      };
      tick();
    }

    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(start, 300); });
    }else{
      setTimeout(start, 300);
    }
  })();
})();
