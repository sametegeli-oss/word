/* ============================================================
   WORD MODE / SENTENCE MODE FIXES — TEK TEMİZ SÜRÜM
   2026-06-02
   ============================================================ */

(function () {
  'use strict';

  // Legacy'nin zararsız "Cannot set properties of null (setting 'onclick')" hatasını sustur.
  // Bu hata bir aksiyonu engellemiyor; yalnızca konsol gürültüsü yaratıyor.
  window.addEventListener('error', function(ev){
    var msg = ev && ev.message ? String(ev.message) : '';
    if (/setting 'onclick'/.test(msg) && /null/.test(msg)) {
      ev.preventDefault();
      ev.stopImmediatePropagation && ev.stopImmediatePropagation();
      return true;
    }
  }, true);

  // ─── KÖK ÇÖZÜM: Konuşma ekranı binding zinciri kesilmesi ───
  // legacy d() render'ında binding zinciri tek ifadede:
  //   t.querySelector("[data-scenario-select]").onchange=...,
  //   ...,t.querySelector("[data-global-suggest]").onclick=...,
  //   t.querySelector("[data-start-roleplay]").onclick=...
  // [data-global-suggest] template HTML'inde HİÇ render edilmiyor → querySelector null
  // → ".onclick=" TypeError → zincir kopuyor → "Bu Ayarlarla Başlat" (data-start-roleplay)
  // ve sonrası BAĞLANMIYOR (ekran çalışmıyor).
  // Çözüm: panel (.wm-phase-panel) DOM'a binding'den ÖNCE (insertBefore ile) eklendiği için,
  // ekleme anında panel içine gizli bir [data-global-suggest] düğümü enjekte ediyoruz.
  // Böylece bir sonraki satırdaki querySelector null dönmez, legacy'nin KENDİ orijinal
  // handler zinciri (data-start-roleplay dahil) eksiksiz kurulur.
  (function(){
    try{
      function ensureGlobalSuggest(panel){
        try{
          if(!panel || panel.nodeType!==1) return;
          if(!panel.classList || !panel.classList.contains('wm-phase-panel')) return;
          if(panel.querySelector('[data-global-suggest]')) return;
          var ph=document.createElement('span');
          ph.setAttribute('data-global-suggest','');
          ph.setAttribute('aria-hidden','true');
          ph.style.display='none';
          panel.appendChild(ph);
        }catch(e){}
      }
      var proto=Node.prototype;
      if(proto.__wmGlobalSuggestPatched) return;
      proto.__wmGlobalSuggestPatched=true;
      var _insertBefore=proto.insertBefore;
      proto.insertBefore=function(newNode, refNode){
        // önce düğümü yakala (binding henüz çalışmadı), sonra normal ekle
        ensureGlobalSuggest(newNode);
        return _insertBefore.call(this, newNode, refNode);
      };
      var _appendChild=proto.appendChild;
      proto.appendChild=function(newNode){
        ensureGlobalSuggest(newNode);
        return _appendChild.call(this, newNode);
      };
    }catch(e){}
  })();

  // ─── KÖK ÇÖZÜM: Gerçek Hayat Koçu paneli (.wm-phase-panel) yanlış ekran sızıntısı ───
  // legacy d() render'ı paneli, innerText'inde "senaryo"/"scenario"/"gerçek hayat" GEÇEN
  // her .screen/.card/section/div'e basıyor. "senaryo" kelimesi Kelimeler/Cümleler ekranı
  // ve alt menüde de geçtiği için panel YANLIŞ ekranlara sızıyor; ayrıca aynı ekrana
  // birden çok kez basılıp üst üste biniyor (dizayn bozuluyor).
  // Panelin meşru evi yalnızca şu ekranlar: sc-realnew, sc-conversation, sc-partner.
  // Bu guard: yanlış ekrandaki panelleri kaldırır, doğru ekranda fazlalık (>1) panelleri temizler.
  (function(){
    var ALLOWED = { 'sc-realnew':1, 'sc-conversation':1, 'sc-partner':1 };
    function cleanup(){
      try{
        var panels = document.querySelectorAll('.wm-phase-panel');
        if(!panels.length) return;
        var seenScreens = {};
        for(var i=0;i<panels.length;i++){
          var p = panels[i];
          var screen = p.closest ? p.closest('.screen') : null;
          var sid = screen ? screen.id : '';
          if(!sid || !ALLOWED[sid]){
            // yanlış ekrana (ya da ekransız body'ye) sızmış panel → kaldır
            if(p.parentNode) p.parentNode.removeChild(p);
            continue;
          }
          // doğru ekran: ilk panel kalsın, sonrakiler (çift basım) silinsin
          if(seenScreens[sid]){
            if(p.parentNode) p.parentNode.removeChild(p);
          } else {
            seenScreens[sid] = 1;
          }
        }
      }catch(e){}
    }
    function schedule(){ clearTimeout(window.__wmPanelTimer); window.__wmPanelTimer=setTimeout(cleanup, 80); }
    if(document.readyState!=='loading'){ schedule(); }
    document.addEventListener('DOMContentLoaded', schedule);
    try{
      new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
    }catch(e){}
  })();

  // ─── PERFORMANS: legacy body-subtree observer'larını debounce'la ───
  // 14 kadar observer her DOM değişiminde birden tetikleniyordu; kullanım takılıyordu.
  // body/documentElement'i geniş (subtree) gözleyenlerin callback'ini 60ms grupla.
  (function(){
    try{
      var Native = window.MutationObserver || window.WebKitMutationObserver;
      if(!Native || Native.__wmWrapped) return;
      function Wrapped(cb){
        var timer=null, pending=[], broad=false, self;
        function run(obs){ var b=pending; pending=[]; try{ cb(b, obs); }catch(e){} }
        self=new Native(function(records, obs){
          if(!broad){ try{ cb(records, obs); }catch(e){} return; }
          pending=pending.concat(records);
          if(timer) return;
          timer=setTimeout(function(){ timer=null; run(obs); }, 60);
        });
        var origObserve=self.observe.bind(self);
        self.observe=function(target, opts){
          if(opts && opts.subtree && (target===document.body || target===document.documentElement || target===document)) broad=true;
          return origObserve(target, opts);
        };
        return self;
      }
      Wrapped.__wmWrapped=true;
      Wrapped.prototype=Native.prototype;
      window.MutationObserver=Wrapped;
    }catch(e){}
  })();

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

  var _lookupCache = {};
  function wmLookupImpl(word){
    var ck = String(word||'').toLowerCase();
    if (_lookupCache[ck] !== undefined) return _lookupCache[ck];
    var result = null;
    var maps = [window.WM_SOZLUK_MEANING_MAP, window.WM_Dictionary];
    for (var i=0;i<maps.length && !result;i++){
      var m = maps[i];
      if (!m || Array.isArray(m)) continue;
      var cs = candidates(word);
      for (var j=0;j<cs.length;j++){
        var hit = m[cs[j]];
        if (!hit) continue;
        var norm = normalizeRow(hit, cs[j]) || hit;
        if (!norm.meanings || !norm.meanings.length){
          var other = (window.WM_SOZLUK_MEANING_MAP||{})[cs[j]] || (window.WM_Dictionary||{})[cs[j]];
          if (other){
            var n2 = normalizeRow(other, cs[j]);
            if (n2 && n2.meanings && n2.meanings.length) norm.meanings = n2.meanings;
            else if (other.meanings && other.meanings.length) norm.meanings = other.meanings;
          }
        }
        if (norm.meanings && norm.meanings.length){ result = norm; break; }
      }
    }
    // sözlük henüz yüklenmediyse cache'leme (sonra dolacak)
    if (result || (window.WM_Dictionary && Object.keys(window.WM_Dictionary).length>500)) _lookupCache[ck] = result;
    return result;
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
    var SOURCES=[openverse, commons, wikiSearch];

    // ---- ÇOK ADAY döndüren kaynak varyantları (alternatif seçici için) ----
    async function wikiSearchMany(q){
      var out=[];
      try{
        var s=await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch='+encodeURIComponent(q)+'&srlimit=5');
        var sj=await s.json(); var hits=(sj.query&&sj.query.search)||[];
        for(var k=0;k<hits.length;k++){
          var r=await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilimit=1&pageids='+hits[k].pageid);
          var rj=await r.json(); var pages=(rj.query&&rj.query.pages)||{};
          for(var p in pages){ if(pages[p].thumbnail) out.push(pages[p].thumbnail.source); }
        }
      }catch(e){} return out;
    }
    async function openverseMany(q){
      var out=[];
      try{
        var r=await fetch('https://api.openverse.org/v1/images/?q='+encodeURIComponent(q)+'&page_size=6',{headers:{'Accept':'application/json'}});
        if(r.ok){ var j=await r.json(); (j.results||[]).forEach(function(f){ var u=f.thumbnail||f.url; if(u) out.push(u); }); }
      }catch(e){} return out;
    }
    async function commonsMany(q){
      var out=[];
      try{
        var r=await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch='+encodeURIComponent('filetype:bitmap '+q)+'&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=400');
        var j=await r.json(); var pages=(j.query&&j.query.pages)||{};
        for(var p in pages){ var ii=pages[p].imageinfo&&pages[p].imageinfo[0]; if(ii&&ii.thumburl) out.push(ii.thumburl); }
      }catch(e){} return out;
    }
    var SOURCES_MANY=[openverseMany, commonsMany, wikiSearchMany];

    // Birden çok aday topla (dedupe, en fazla limit). terms: arama terimleri dizisi.
    async function searchImageMulti(terms, limit){
      limit = limit || 12;
      var seen={}, out=[];
      for(var i=0;i<terms.length && out.length<limit;i++){
        for(var s=0;s<SOURCES_MANY.length && out.length<limit;s++){
          var arr=[]; try{ arr=await SOURCES_MANY[s](terms[i]); }catch(e){}
          for(var k=0;k<arr.length;k++){
            var u=arr[k];
            if(u && !seen[u]){ seen[u]=1; out.push(u); if(out.length>=limit) break; }
          }
        }
      }
      return out;
    }

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
      function reveal(){ wrap.style.display='block'; wrap.setAttribute('data-loaded','1'); if(credit) credit.innerHTML=label; }
      img.onload=reveal;
      img.onerror=function(){ wrap.style.display='none'; wrap.removeAttribute('data-loaded'); };
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

    // ═══════════ ALTERNATİF GÖRSEL SEÇİCİ + AI KEYWORD ═══════════
    // Resmin altına bir kez "Alternatif Seç" butonu kurar.
    function ensureAltUI(wrap){
      if(!wrap || document.getElementById('wmAltBar')) return;
      var bar=document.createElement('div');
      bar.id='wmAltBar';
      bar.innerHTML=''
        + '<button type="button" id="wmAltBtn" class="wm-alt-btn">🔄 Alternatif Seç</button>';
      wrap.appendChild(bar);
      var panel=document.createElement('div');
      panel.id='wmAltPanel'; panel.style.display='none';
      panel.innerHTML=''
        + '<div id="wmAltStatus" class="wm-alt-status"></div>'
        + '<div id="wmAltGrid" class="wm-alt-grid"></div>'
        + '<button type="button" id="wmAltAiBtn" class="wm-alt-ai">🤖 AI ile mantıklı resim üret</button>';
      wrap.appendChild(panel);

      document.getElementById('wmAltBtn').onclick=function(){
        var p=document.getElementById('wmAltPanel');
        if(p.style.display==='none'){ p.style.display='block'; loadAlternatives(); }
        else{ p.style.display='none'; }
      };
      document.getElementById('wmAltAiBtn').onclick=function(){ aiAltSearch(); };
    }

    function altStatus(msg){ var s=document.getElementById('wmAltStatus'); if(s) s.textContent=msg||''; }

    // Grid'e aday thumbnail'ları bas. Tıklayınca o resmi seçer + kalıcı kaydeder.
    function renderAltGrid(urls){
      var grid=document.getElementById('wmAltGrid'); if(!grid) return;
      grid.innerHTML='';
      if(!urls || !urls.length){ altStatus('Aday bulunamadı. AI ile deneyebilirsin.'); return; }
      altStatus(urls.length+' aday — birine dokun, kaydedilir.');
      urls.forEach(function(u){
        var t=document.createElement('img');
        t.className='wm-alt-thumb'; t.src=u; t.loading='lazy'; t.alt='';
        t.onerror=function(){ t.remove(); };
        t.onclick=function(){ pickAlternative(u); };
        grid.appendChild(t);
      });
    }

    // Kullanıcının seçtiği resmi ana görsele uygula + cache'e yaz (kalıcı).
    function pickAlternative(url){
      var wrap=document.getElementById('sentImgWrap');
      var img=document.getElementById('sentImg');
      var credit=document.getElementById('imgCredit');
      if(!wrap || !img) return;
      showImg(img, wrap, credit, url, '📷 Seçtiğin resim');
      img.style.display='';
      if(_wmCurKey) cacheSet(_wmCurKey, url); // kalıcı: ileri/geri + sonraki açılış
      var p=document.getElementById('wmAltPanel'); if(p) p.style.display='none';
    }

    async function loadAlternatives(){
      altStatus('Alternatifler aranıyor…');
      renderAltGrid([]);
      var terms=buildTerms(_wmCurSent, _wmCurWord);
      var urls=await searchImageMulti(terms, 12);
      renderAltGrid(urls);
    }

    // Cümleyi AI'ya verip arama kriteri (kısa İngilizce) al, onunla yeniden ara.
    async function aiAltSearch(){
      if(typeof window.callAI!=='function'){ altStatus('AI bağlı değil. Ayarlardan API anahtarını gir.'); return; }
      altStatus('🤖 AI arama kriteri üretiyor…');
      var sys='You generate concise English image-search keywords. Output ONLY 2-4 search queries, comma-separated, no explanation. Each query should describe a concrete, depictable scene matching the sentence meaning.';
      var usr='Sentence: "'+(_wmCurSent||'')+'"\nTarget word: "'+(_wmCurWord||'')+'"\nGive image-search keywords.';
      var raw='';
      try{
        var res=await window.callAI({systemPrompt:sys, userPrompt:usr, aiType:'chat'});
        raw = (typeof res==='string') ? res : (res && (res.text||res.content||res.message||res.output)) || '';
      }catch(e){ altStatus('AI çağrısı başarısız: '+(e&&e.message||e)); return; }
      var kw=String(raw).replace(/["\n]/g,' ').split(/[,;]+/).map(function(s){return s.trim();}).filter(Boolean).slice(0,4);
      if(!kw.length){ altStatus('AI kriter üretemedi.'); return; }
      altStatus('🤖 Kriter: '+kw.join(' · ')+' — aranıyor…');
      var urls=await searchImageMulti(kw, 12);
      renderAltGrid(urls);
    }

    // Aktif kelime/cümle (alternatif seçici bunları kullanır)
    var _wmCurWord='', _wmCurSent='', _wmCurKey='';

    var _wmLSI = async function(sentence, word){
      var wrap=document.getElementById('sentImgWrap');
      var img=document.getElementById('sentImg');
      var credit=document.getElementById('imgCredit');
      if(!wrap || !img) return;

      _wmCurWord=word||''; _wmCurSent=sentence||'';
      var key=ckey(word, sentence); _wmCurKey=key;
      ensureAltUI(wrap); // resmin altına "Alternatif Seç" butonunu garanti et

      // 1) satır verisinde gömülü görsel
      try{
        var row=(Array.isArray(window.words)&&window.words[window.idx])||(Array.isArray(words)&&words[idx])||{};
        var embed=row.imageUrl||row.image||row.imgUrl||row.photo||row.picture||row.visual;
        if(embed && /^https?:\/\//i.test(String(embed))){
          showImg(img, wrap, credit, embed, '📷 Kaynak dosya'); return;
        }
      }catch(e){}

      if(credit) credit.innerHTML='';

      // 2) cache (kullanıcının seçtiği resim de burada saklanır)
      var cached=await cacheGet(key);
      if(cached!==undefined){
        if(cached==='__NONE__'){ wrap.style.display='block'; img.removeAttribute('src'); img.style.display='none'; return; }
        showImg(img, wrap, credit, cached, '📷 Önbellek'); return;
      }

      // 3) ara
      var terms=buildTerms(sentence, word);
      var url=await searchImage(terms);
      if(url){
        showImg(img, wrap, credit, url, '📷 Openverse / Commons / Wikipedia');
        cacheSet(key, url);
      }else{
        // sonuç yok: sarmalayıcı görünür kalsın ki kullanıcı Alternatif/AI deneyebilsin
        wrap.style.display='block'; img.removeAttribute('src'); img.style.display='none';
        cacheSet(key, '__NONE__');
      }
    };
    try{
      Object.defineProperty(window, 'loadSentenceImage', {
        configurable:false, enumerable:true,
        get:function(){ return _wmLSI; },
        set:function(){ /* legacy ezmesini yok say */ }
      });
    }catch(e){ window.loadSentenceImage=_wmLSI; }

    // Arka planda görsel ön-yükleme: cache'te yoksa arayıp kaydeder (DOM'a basmaz)
    window.WM_prefetchImage = async function(sentence, word){
      try{
        var key=ckey(word, sentence);
        var c=await cacheGet(key);
        if(c!==undefined) return;            // zaten biliniyor
        var url=await searchImage(buildTerms(sentence, word));
        cacheSet(key, url || '__NONE__');
      }catch(e){}
    };
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
  }, 5000);

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
      // Sıradaki 2 cümlenin görselini boştayken arka planda ön-yükle (anında geçiş için)
      if (window.WM_prefetchImage) {
        var data = getData(), cur = getIndex();
        var doPrefetch = function(){
          for (var k=1; k<=2; k++){
            var nx = data[cur+k];
            if (nx) { try{ window.WM_prefetchImage(nx.sentence||nx.cumle||'', nx.word||nx.Kelime||''); }catch(e){} }
          }
        };
        if (window.requestIdleCallback) requestIdleCallback(doPrefetch, {timeout:1500});
        else setTimeout(doPrefetch, 500);
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
      + '.pfc-card-actions{display:grid !important;grid-template-columns:1fr 1fr 1fr !important;gap:6px !important;margin-top:6px !important;}'
      + '.pfc-card-actions .pfc-mini-action{min-width:0 !important;font-size:11px !important;padding:7px 4px !important;}'
      + '.pfc-face-wrap{display:grid !important;grid-template-columns:128px 1fr !important;gap:12px !important;align-items:center !important;}'
      + '@media(max-width:430px){.pfc-sound-grid{grid-template-columns:1fr !important;}.pfc-face-wrap{grid-template-columns:1fr !important;}}'
      // ─── GÖRSELLİK İYİLEŞTİRMELERİ ───
      // Kelime kartı yumuşak giriş
      + '#wordCard{animation:wmFade .28s ease both;}'
      + '@keyframes wmFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
      // Cümle görseli: yumuşak fade + yüklenirken iskelet
      + '#sentImgWrap{transition:opacity .3s ease;}'
      + '#sentImg{transition:opacity .35s ease;border-radius:12px;}'
      + '#sentImgWrap:not([data-loaded]) #sentImg{opacity:0;}'
      + '#sentImgWrap[data-loaded] #sentImg{opacity:1;}'
      + '.wm-img-skeleton{background:linear-gradient(100deg,#1b2230 30%,#243049 50%,#1b2230 70%);background-size:200% 100%;animation:wmShimmer 1.2s infinite;border-radius:12px;min-height:120px;}'
      + '@keyframes wmShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'
      // Buton dokunma geri bildirimi (genel)
      + '.btn,.act-btn,#wmToolsDrawer button,.wm-character{transition:transform .12s ease,box-shadow .15s ease,filter .15s ease;}'
      + '.btn:active,.act-btn:active,#wmToolsDrawer button:active{transform:scale(.96);}'
      + '#wmToolsDrawer button:hover{filter:brightness(1.12);}'
      // Araçlar paneli: daha yumuşak gölge + kaydırma
      + '#wmToolsDrawer{box-shadow:-12px 0 40px rgba(0,0,0,.5) !important;scroll-behavior:smooth;}'
      + '#wmToolsBtn{box-shadow:0 6px 20px rgba(37,99,235,.45) !important;transition:transform .12s ease;}'
      + '#wmToolsBtn:active{transform:scale(.94);}'
      // Kelime Ağacı satır vurgusu
      + '.tree-word-item{transition:background .15s ease;border-radius:8px;}'
      + '.tree-word-item:hover{background:rgba(34,197,94,.08) !important;}'
      // Tipografi: anlam hiyerarşisi
      + '.wc-word{letter-spacing:.2px;}'
      + '.meanings-section ol li{margin:2px 0;}'
      // ═══════════ KAPSAMLI GÖRSEL REVİZYON ═══════════
      // — Canlı Skor Koçu: fonem kartları —
      + '.pfc-sound-card{background:linear-gradient(160deg,#161d2e,#10151f) !important;border:1px solid #283349 !important;border-radius:16px !important;padding:14px !important;margin-bottom:12px !important;box-shadow:0 4px 18px rgba(0,0,0,.28) !important;transition:transform .15s ease,border-color .2s ease !important;}'
      + '.pfc-sound-card:hover{transform:translateY(-2px) !important;border-color:#3b82f6 !important;}'
      + '.pfc-sound-card.same-tr{border-left:4px solid #22c55e !important;}'
      + '.pfc-sound-card.diff-tr{border-left:4px solid #ef4444 !important;}'
      + '.pfc-card-head{display:flex !important;align-items:flex-start !important;justify-content:space-between !important;gap:10px !important;margin-bottom:10px !important;}'
      + '.pfc-card-num{font-size:20px !important;font-weight:900 !important;color:#e8eaf6 !important;letter-spacing:.3px !important;}'
      + '.pfc-card-name{font-size:12px !important;color:#94a3b8 !important;margin-top:2px !important;}'
      + '.pfc-mini-tag{font-size:10px !important;font-weight:800 !important;padding:4px 9px !important;border-radius:999px !important;white-space:nowrap !important;}'
      + '.pfc-mini-tag.same{background:rgba(34,197,94,.15) !important;color:#4ade80 !important;}'
      + '.pfc-mini-tag.diff{background:rgba(239,68,68,.15) !important;color:#f87171 !important;}'
      + '#lcPfcProblemCards,#lcPfcProblemCards.pfc-sound-grid{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;flex-direction:row !important;gap:12px !important;margin-top:10px !important;width:100% !important;}'
      + '#lcPfcProblemCards>.pfc-sound-card{min-width:0 !important;}'
      + '@media(max-width:560px){#lcPfcProblemCards,#lcPfcProblemCards.pfc-sound-grid{grid-template-columns:1fr !important;}}'
      + '.pfc-art-row,#lcPfcProblemCards .pfc-art-row{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;align-items:stretch !important;margin:10px 0 !important;}'
      + '.pfc-art{height:74px !important;background:#0c1019 !important;border:1px solid #283349 !important;border-radius:12px !important;padding:6px !important;display:flex !important;align-items:center !important;justify-content:center !important;overflow:hidden !important;}'
      + '.pfc-art svg{width:100% !important;height:100% !important;display:block !important;object-fit:contain !important;}'
      + '.pfc-card-text{font-size:13px !important;line-height:1.55 !important;color:#cbd5e1 !important;background:rgba(255,255,255,.02) !important;border-radius:10px !important;padding:10px 12px !important;margin-bottom:10px !important;}'
      + '.pfc-card-text b{color:#e8eaf6 !important;}'
      + '.pfc-card-actions{display:grid !important;grid-template-columns:1fr 1fr 1fr !important;gap:8px !important;}'
      + '.pfc-card-actions .pfc-mini-action{font-size:12px !important;font-weight:800 !important;padding:9px 6px !important;border-radius:11px !important;border:1px solid #2f3b54 !important;background:#1a2233 !important;color:#dbe3f4 !important;cursor:pointer !important;transition:all .14s ease !important;display:flex !important;align-items:center !important;justify-content:center !important;gap:4px !important;}'
      + '.pfc-card-actions .pfc-mini-action:hover{background:#22304a !important;border-color:#3b82f6 !important;}'
      + '.pfc-card-actions .pfc-mini-action:active{transform:scale(.95) !important;}'
      // mod/etiket bulutu (Sesleri Sırala, Seçili Sesi Çalış...)
      + '.pfc-mode-row{gap:7px !important;}'
      + '.pfc-mode,.pfc-mode-row>*{font-size:12px !important;font-weight:800 !important;padding:7px 12px !important;border-radius:999px !important;border:1px solid #2f3b54 !important;background:#161d2e !important;color:#cbd5e1 !important;cursor:pointer !important;transition:all .14s ease !important;}'
      + '.pfc-mode:hover,.pfc-mode-row>*:hover{border-color:#3b82f6 !important;background:#1c2740 !important;}'
      + '.pfc-mode.active{background:linear-gradient(135deg,#3b82f6,#2563eb) !important;color:#fff !important;border-color:transparent !important;}'
      + '.pfc-tip{background:rgba(59,130,246,.07) !important;border:1px solid rgba(59,130,246,.2) !important;border-radius:12px !important;padding:11px 13px !important;font-size:12px !important;line-height:1.6 !important;color:#cbd5e1 !important;margin-top:10px !important;}'
      + '.pfc-panel,.pfc-stats{border-radius:16px !important;}'
      // — Konuşma Koçu / Partner / Simülasyon kartları —
      + '.wm-character{background:linear-gradient(160deg,#161d2e,#10151f) !important;border:1px solid #283349 !important;border-radius:14px !important;padding:12px 8px !important;transition:transform .15s ease,border-color .2s ease,box-shadow .2s ease !important;box-shadow:0 3px 14px rgba(0,0,0,.25) !important;}'
      + '.wm-character:hover{transform:translateY(-2px) !important;border-color:#3b82f6 !important;}'
      + '.wm-character.active{border-color:#22c55e !important;background:linear-gradient(160deg,#16241c,#101a14) !important;box-shadow:0 0 0 1px #22c55e,0 6px 18px rgba(34,197,94,.18) !important;}'
      + '.wm-char-emoji{font-size:30px !important;line-height:1 !important;margin-bottom:4px !important;}'
      + '.wm-char-name{font-weight:900 !important;font-size:14px !important;color:#e8eaf6 !important;}'
      + '.wm-char-meta{font-size:11px !important;color:#94a3b8 !important;margin-top:2px !important;}'
      // partner/persona kartları (eski sınıflar)
      + '.partner-card,.persona-card{background:linear-gradient(160deg,#161d2e,#10151f) !important;border:1px solid #283349 !important;border-radius:14px !important;padding:12px !important;transition:transform .15s ease,border-color .2s ease !important;}'
      + '.partner-card:hover,.persona-card:hover{transform:translateY(-2px) !important;border-color:#3b82f6 !important;}'
      // senaryo/aksan dropdownları (Konuşma Simülasyonu)
      + '#sc-conversation select,#sc-partner select{background:#161d2e !important;border:1px solid #2f3b54 !important;border-radius:12px !important;color:#e8eaf6 !important;padding:11px 12px !important;font-weight:700 !important;}'
      // — Konuşma Simülasyonu / Gerçek Hayat Koçu: eksik (yüklenmeyen style.css) sınıfları —
      + '.wm-pro-title{font-size:20px !important;font-weight:900 !important;margin-bottom:6px !important;color:#e8eaf6 !important;}'
      + '.wm-pro-sub{font-size:13px !important;color:#94a3b8 !important;line-height:1.55 !important;margin-bottom:14px !important;}'
      + '.wm-hero{border-radius:18px !important;overflow:hidden !important;min-height:150px !important;background:#1c2130 !important;position:relative !important;margin-bottom:12px !important;border:1px solid #252d42 !important;}'
      + '.wm-hero svg{width:100% !important;height:170px !important;display:block !important;}'
      + '.wm-hero-caption{position:absolute !important;bottom:0 !important;left:0 !important;right:0 !important;padding:12px !important;background:linear-gradient(transparent,rgba(0,0,0,.75)) !important;color:#fff !important;}'
      + '.wm-hero-caption b{font-size:16px !important;}'
      + '.wm-hero-caption span{font-size:12px !important;opacity:.85 !important;display:block !important;margin-top:2px !important;}'
      + '.wm-character-grid{display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;margin-top:8px !important;}'
      + '.wm-btn-row{display:flex !important;gap:8px !important;flex-wrap:wrap !important;margin-top:10px !important;}'
      + '.wm-btn{flex:1 1 130px !important;border:none !important;border-radius:12px !important;padding:10px 12px !important;font-weight:900 !important;cursor:pointer !important;font-family:inherit !important;font-size:13px !important;}'
      + '.wm-btn-blue{background:linear-gradient(135deg,#3b82f6,#2563eb) !important;color:#fff !important;}'
      + '.wm-btn-green{background:linear-gradient(135deg,#22c55e,#16a34a) !important;color:#052e16 !important;}'
      + '.wm-btn-purple{background:linear-gradient(135deg,#7c3aed,#6d28d9) !important;color:#fff !important;}'
      + '.wm-btn-ghost{background:#1c2130 !important;color:#a0a8c8 !important;border:1px solid #252d42 !important;}'
      + '.wm-suggestion-box{margin-top:10px !important;background:#131720 !important;border:1px solid #252d42 !important;border-radius:14px !important;padding:10px !important;}'
      + '.wm-suggestion-title{font-size:12px !important;font-weight:900 !important;color:#a78bfa !important;margin-bottom:8px !important;}'
      + '.wm-suggestion-card{background:#1c2130 !important;border:1px solid #252d42 !important;border-radius:12px !important;padding:10px !important;margin-bottom:8px !important;}'
      + '.wm-suggestion-label{font-size:10px !important;font-weight:900 !important;color:#7c85b0 !important;text-transform:uppercase !important;letter-spacing:.8px !important;}'
      + '.wm-suggestion-text{font-size:14px !important;color:#e8eaf6 !important;font-weight:800 !important;line-height:1.45 !important;margin:4px 0 8px !important;}'
      + '.wm-suggestion-actions{display:flex !important;gap:6px !important;}'
      + '.wm-mini-btn{flex:1 !important;border:none !important;border-radius:9px !important;padding:7px 6px !important;font-weight:800 !important;font-size:11px !important;cursor:pointer !important;}'
      + '.wm-stat-grid{display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;margin-top:8px !important;}'
      + '.wm-score-line{display:grid !important;grid-template-columns:90px 1fr 36px !important;gap:8px !important;align-items:center !important;font-size:12px !important;font-weight:800 !important;color:#a0a8c8 !important;}'
      + '.wm-score-track{height:8px !important;background:#1c2130 !important;border-radius:8px !important;overflow:hidden !important;}'
      + '.wm-score-fill{height:100% !important;background:linear-gradient(90deg,#3b82f6,#22c55e) !important;border-radius:8px !important;}'
      // — Gerçek Hayat Koçu paneli: kök style.css'ten (yüklenmiyor) birebir eksik kurallar —
      + '.wm-pro-panel{background:linear-gradient(145deg,#161b28,#131720) !important;border:1px solid #252d42 !important;border-radius:18px !important;padding:14px !important;margin:12px 0 !important;box-shadow:0 8px 32px rgba(0,0,0,.4) !important;}'
      + '.wm-pro-title{font-size:16px !important;font-weight:900 !important;color:#e8eaf6 !important;display:flex !important;gap:8px !important;align-items:center !important;margin-bottom:8px !important;}'
      + '.wm-pro-sub{color:#7c85b0 !important;font-size:12px !important;line-height:1.5 !important;margin-bottom:10px !important;}'
      + '.wm-chip-row{display:flex !important;gap:7px !important;flex-wrap:wrap !important;margin:8px 0 !important;}'
      + '.wm-chip{border:1.5px solid #252d42 !important;background:#131720 !important;color:#a0a8c8 !important;border-radius:999px !important;padding:7px 10px !important;font-size:12px !important;font-weight:800 !important;cursor:pointer !important;user-select:none !important;transition:.15s !important;}'
      + '.wm-chip.active{background:#3b82f6 !important;border-color:#3b82f6 !important;color:#fff !important;}'
      + '.wm-grid-2{display:grid !important;grid-template-columns:1fr 1fr !important;gap:8px !important;}'
      + '.wm-select,.wm-input,.wm-textarea{width:100% !important;background:#131720 !important;color:#e8eaf6 !important;border:1.5px solid #252d42 !important;border-radius:12px !important;padding:10px 12px !important;font-family:inherit !important;font-size:14px !important;outline:none !important;}'
      + '.wm-textarea{min-height:78px !important;resize:vertical !important;}'
      + '.wm-select:focus,.wm-input:focus,.wm-textarea:focus{border-color:#3b82f6 !important;}'
      + '.wm-hero{border-radius:18px !important;overflow:hidden !important;min-height:150px !important;background:#1c2130 !important;position:relative !important;margin-bottom:12px !important;border:1px solid #252d42 !important;}'
      + '.wm-hero svg{width:100% !important;height:170px !important;display:block !important;}'
      + '.wm-hero-caption{position:absolute !important;bottom:0 !important;left:0 !important;right:0 !important;padding:12px !important;background:linear-gradient(transparent,rgba(0,0,0,.75)) !important;color:#fff !important;}'
      + '.wm-hero-caption b{font-size:16px !important;}'
      + '.wm-hero-caption span{font-size:12px !important;opacity:.85 !important;display:block !important;margin-top:2px !important;}'
      + '.wm-character{background:#131720 !important;border:1.5px solid #252d42 !important;border-radius:14px !important;padding:10px !important;cursor:pointer !important;transition:.15s !important;}'
      + '.wm-character.active{border-color:#22c55e !important;background:rgba(34,197,94,.08) !important;}'
      + '.wm-char-emoji{font-size:26px !important;}'
      + '.wm-char-name{font-weight:900 !important;font-size:13px !important;color:#e8eaf6 !important;}'
      + '.wm-char-meta{font-size:11px !important;color:#7c85b0 !important;line-height:1.35 !important;margin-top:2px !important;}'
      + '.wm-stat{background:#131720 !important;border:1px solid #252d42 !important;border-radius:12px !important;padding:10px !important;}'
      + '.wm-stat-val{font-size:22px !important;font-weight:900 !important;color:#22c55e !important;}'
      + '.wm-stat-lbl{font-size:11px !important;color:#7c85b0 !important;font-weight:800 !important;}'
      + '.wm-score-bars{display:flex !important;flex-direction:column !important;gap:8px !important;margin-top:8px !important;}'
      + '.ai-extra-btn,.ai-suggest-btn,.ai-translate-btn{display:none !important;}'
      + 'body > #wmPronForcePanel{display:none !important;}'
      // Gerçek Hayat Koçu paneli: varsayılan gizli; yalnız aktif + meşru ekranda görünür.
      // Legacy d() paneli "senaryo" metni geçen yanlış ekranlara (sc-word vb.) bassa bile
      // CSS ile gizli kalır (DOM guard'ın temizleme yarışından bağımsız anlık garanti).
      + '.wm-phase-panel{display:none !important;}'
      + '#sc-realnew.active .wm-phase-panel,#sc-conversation.active .wm-phase-panel,#sc-partner.active .wm-phase-panel{display:block !important;}'
      + '.conv-messages,.partner-chat,.chat-messages{display:flex !important;flex-direction:column !important;gap:14px !important;margin-bottom:12px !important;max-height:380px !important;overflow-y:auto !important;min-height:120px !important;padding:8px !important;}'
      + '.wm-mobile-word{cursor:pointer !important;-webkit-tap-highlight-color:rgba(34,197,94,.25) !important;}'
      + '.wm-mobile-word:active{background:rgba(34,197,94,.14) !important;border-radius:4px !important;}'
      // — Genel tasarım dili: kartlar, butonlar, başlıklar —
      + '.card{border-radius:16px !important;}'
      + '.top-bar h2{letter-spacing:.2px !important;}'
      // seçili/aktif çipler genel yumuşatma
      + '.chip,.pill,.tag{transition:all .14s ease !important;}'
      // — Alternatif görsel seçici —
      + '#wmAltBar{margin-top:8px !important;text-align:center !important;}'
      + '.wm-alt-btn{font-size:12px !important;font-weight:800 !important;padding:8px 14px !important;border-radius:999px !important;border:1px solid #2f3b54 !important;background:#161d2e !important;color:#cbd5e1 !important;cursor:pointer !important;transition:all .14s ease !important;}'
      + '.wm-alt-btn:hover{border-color:#3b82f6 !important;background:#1c2740 !important;}'
      + '#wmAltPanel{margin-top:10px !important;background:#0f1420 !important;border:1px solid #283349 !important;border-radius:14px !important;padding:10px !important;}'
      + '.wm-alt-status{font-size:12px !important;color:#94a3b8 !important;margin-bottom:8px !important;text-align:center !important;}'
      + '.wm-alt-grid{display:grid !important;grid-template-columns:repeat(3,1fr) !important;gap:8px !important;}'
      + '.wm-alt-thumb{width:100% !important;height:80px !important;object-fit:cover !important;border-radius:10px !important;border:2px solid #283349 !important;cursor:pointer !important;transition:all .12s ease !important;background:#0c1019 !important;}'
      + '.wm-alt-thumb:hover{border-color:#22c55e !important;transform:scale(1.04) !important;}'
      + '.wm-alt-ai{display:block !important;width:100% !important;margin-top:10px !important;font-size:12px !important;font-weight:800 !important;padding:10px !important;border-radius:11px !important;border:none !important;background:linear-gradient(135deg,#7c3aed,#6d28d9) !important;color:#fff !important;cursor:pointer !important;}'
      + '.wm-alt-ai:hover{filter:brightness(1.08) !important;}';
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
