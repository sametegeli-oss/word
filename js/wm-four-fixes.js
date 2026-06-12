/* ============================================================
   WM FOUR FIXES  (index.html)
   1) Açılışta sadece menü ekranı açılsın (kelime ekranı otomatik açılmasın)
   2) Kelime açıklama modalında "Bu kelimenin geçtiği cümleler" bölümü
   3) Ana menüdeki tüm düğmeler yan yana ikişerli (2 sütun) grid
   4) Mobilde kelimeye dokununca açıklama açılsın (scroll guard tap'i engellemesin)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- ORTAK YARDIMCILAR ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============================================================
     ORTAK: CÜMLE HAVUZU + KELİME ARAMA (Issue 2 veri kaynağı düzeltmesi)
     index.html'deki eski wmFindWordExampleSentences yanlış global
     adlarına bakıyordu (tumDataRows vb.) ve otomatik yükleyici
     verileri TUMDATA_ROWS / learningPathRows / currentDataRows
     adlarına yazıyor. Burada DOĞRU globalleri ve alan adlarını
     kullanan bir sürümle değiştiriyoruz.
     ============================================================ */
  (function fixExampleSentenceSource() {
    function normWord(s) {
      return String(s || '').toLowerCase().replace(/[^a-z']/g, ' ').trim();
    }
    function rowEN(r) {
      if (!r) return '';
      return r.SentenceEN || r.sentenceEn || r.Sentence || r.sentence || r.SENTENCE ||
        r.EnglishSentence || r.English || r.english || r.en || r.EN ||
        r.Example || r.example || '';
    }
    function rowTR(r) {
      if (!r) return '';
      return r.SentenceTR || r.sentenceTr || r.SentenceTr || r.SENTENCETR ||
        r.TurkishSentence || r.Turkish || r.turkish || r.tr || r.TR ||
        r.ExampleTR || r.exampleTr || '';
    }
    // Otomatik yükleyicinin GERÇEKTEN doldurduğu havuzlar dahil
    function getPools() {
      var pools = [];
      // Modül ekranının kullandığı asıl veri (öncelikli)
      try { if (Array.isArray(window.__WM_PATH_DATA__) && window.__WM_PATH_DATA__.length) pools.push(window.__WM_PATH_DATA__); } catch (e) {}
      var names = [
        'TUMDATA_ROWS', 'learningPathRows', 'currentDataRows', 'currentLearningRows',
        'allWords', 'tumDataRows', 'TumDataRows', 'tumData', 'TumData',
        'learningRows', 'allSentences', 'sentences', 'allRows', 'rows'
      ];
      names.forEach(function (k) {
        try { if (Array.isArray(window[k]) && window[k].length) pools.push(window[k]); } catch (e) {}
      });
      try { if (window.WMPath && Array.isArray(window.WMPath.rows) && window.WMPath.rows.length) pools.push(window.WMPath.rows); } catch (e) {}
      try { if (window.WMPath && Array.isArray(window.WMPath.data) && window.WMPath.data.length) pools.push(window.WMPath.data); } catch (e) {}
      // TUMDATA_MODULES içindeki rows'ları da ekle
      try {
        if (Array.isArray(window.TUMDATA_MODULES)) {
          window.TUMDATA_MODULES.forEach(function (m) {
            if (m && Array.isArray(m.rows) && m.rows.length) pools.push(m.rows);
          });
        }
      } catch (e) {}
      return pools;
    }
    function wordInSentence(sentence, word) {
      var w = normWord(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!w) return false;
      try {
        return new RegExp('(^|\\s)' + w + '(\\s|$)', 'i').test(normWord(sentence));
      } catch (e) {
        return normWord(sentence).indexOf(normWord(word)) !== -1;
      }
    }

    // yol.html ile aynı mantık: cümle havuzlarını tara, kelimeyi içeren
    // İngilizce cümleleri Türkçesiyle döndür.
    window.wmFindWordExampleSentences = function (word, limit) {
      limit = limit || 6;
      var seen = {}, out = [];
      var pools = getPools();
      for (var p = 0; p < pools.length; p++) {
        var pool = pools[p];
        for (var i = 0; i < pool.length; i++) {
          var en = rowEN(pool[i]);
          if (!en || !wordInSentence(en, word)) continue;
          var key = en.toLowerCase();
          if (seen[key]) continue;
          seen[key] = 1;
          out.push({ en: en, tr: rowTR(pool[i]) });
          if (out.length >= limit) return out;
        }
      }
      return out;
    };
  })();

  /* ============================================================
     (1) AÇILIŞTA SADECE MENÜ
     forceMenu, kullanıcı bir butona basana kadar (boot süresinden
     bağımsız) kelime ekranı açılırsa menüye geri döndürür.
     ============================================================ */
  (function startOnMenu() {
    window.WM_START_ON_MENU = true;
    var userNavigated = false;

    function forceMenu() {
      if (userNavigated) return;
      // Veri yükleme katmanı açıkken menüyü gösterme (gate bitince açar)
      if (document.getElementById('wmDataLoadingOverlay')) return;
      var menu = document.getElementById('sc-menu');
      if (!menu) return;
      var active = document.querySelector('.screen.active');
      // Menü zaten aktifse dokunma
      if (active && active.id === 'sc-menu') return;
      document.querySelectorAll('.screen').forEach(function (s) {
        s.classList.remove('active');
        s.style.display = 'none';
      });
      menu.classList.add('active');
      menu.style.display = 'block';
      try {
        var nav = document.getElementById('bottomNav');
        if (nav) nav.style.display = 'none';
      } catch (e) {}
    }

    // Kullanıcı gerçek bir menü öğesine / butona bastığında serbest bırak
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('button,a,[role="button"],.menu-tile,.menu-cta,.bnav-btn');
      if (!b) return;
      var t = (b.textContent || '').trim();
      if (t && /ana menü|menüye dön/i.test(t)) return; // menüye dönüş tetikleyici sayılmaz
      userNavigated = true;
    }, true);

    // İlk ~6 saniye boyunca otomatik açılmaları menüye çevir
    var ticks = [0, 200, 500, 900, 1500, 2500, 4000, 6000];
    function schedule() { ticks.forEach(function (ms) { setTimeout(forceMenu, ms); }); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', schedule);
    } else {
      schedule();
    }
    window.addEventListener('load', schedule);

    // Boot sırasında bir şey sc-word'ü aktif ederse anında yakala
    try {
      var mo = new MutationObserver(function () {
        if (userNavigated) { mo.disconnect(); return; }
        var w = document.getElementById('sc-word');
        if (w && w.classList.contains('active')) forceMenu();
      });
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
      // güvenlik: 8 sn sonra gözlemciyi kapat
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 8000);
    } catch (e) {}
  })();

  /* ============================================================
     (3) ANA MENÜ — TÜM DÜĞMELER 2 SÜTUN
     Enjekte edilen tam-genişlik butonları da (Modül Yolu, Otomatik
     Modül, Premium Koç, Gerçek Sohbet vb.) ikişerli hizalar.
     ============================================================ */
  (function menuTwoColumns() {
    if (document.getElementById('wm-menu-2col-css')) return;
    var st = document.createElement('style');
    st.id = 'wm-menu-2col-css';
    st.textContent = [
      /* sc-menu'yu tek bir 2 sütunlu grid yap */
      '#sc-menu{display:flex;flex-direction:column;}',
      /* başlık/hero tam genişlik kalsın */
      '#sc-menu .menu-hero{width:100%;}',
      /* menüdeki doğrudan butonları ve grid'i tek bir grid alanına topla */
      '#sc-menu > .menu-grid{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:12px !important;width:100%;}',
      '#wmMenuFreeRow{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:12px !important;width:100%;margin:0 0 14px;}',
      '#wmMenuFreeRow > *{width:100% !important;max-width:none !important;margin:0 !important;}',
      '@media(max-width:380px){',
      '  #sc-menu > .menu-grid,#wmMenuFreeRow{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:10px !important;}',
      '}'
    ].join('\n');
    document.head.appendChild(st);

    // Enjekte edilen tam-genişlik butonlarını tek bir 2 sütunlu satıra taşı
    function groupFreeButtons() {
      var menu = document.getElementById('sc-menu');
      if (!menu) return;
      var grid = menu.querySelector('.menu-grid');
      // Menünün doğrudan çocuğu olan, grid'e ait olmayan butonlar
      var freeButtons = [].slice.call(menu.children).filter(function (el) {
        return el.tagName === 'BUTTON' && !el.classList.contains('menu-cta');
      });
      // menu-cta (Modüllere Git) da serbest satıra dahil edilsin
      var cta = menu.querySelector('.menu-cta');

      if (!freeButtons.length && !cta) return;

      var row = document.getElementById('wmMenuFreeRow');
      if (!row) {
        row = document.createElement('div');
        row.id = 'wmMenuFreeRow';
        // hero'dan hemen sonra yerleştir
        var hero = menu.querySelector('.menu-hero');
        if (hero && hero.nextSibling) menu.insertBefore(row, hero.nextSibling);
        else if (grid) menu.insertBefore(row, grid);
        else menu.appendChild(row);
      }
      if (cta && cta.parentElement !== row) row.appendChild(cta);
      freeButtons.forEach(function (b) { if (b.parentElement !== row) row.appendChild(b); });
    }

    function run() { try { groupFreeButtons(); } catch (e) {} }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
    window.addEventListener('load', function () { run(); setTimeout(run, 700); setTimeout(run, 1800); });
    try {
      var mo = new MutationObserver(function () { run(); });
      mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 9000);
    } catch (e) {}
  })();

  /* ============================================================
     (4) MOBİLDE KELİMEYE DOKUNUNCA AÇIKLAMA AÇILSIN
     Scroll guard, gerçek bir dokunuşu (parmak kaymadıysa) iptal
     etmemeli. Guard'ı yalnızca belirgin kaydırma sırasında aktif et.
     ============================================================ */
  (function fixTapGuard() {
    var startY = 0, startX = 0, moved = false;
    document.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      startY = t.clientY; startX = t.clientX; moved = false;
      // Dokunma başında guard'ı temizle ki tap engellenmesin
      window._scrollGuardActive = false;
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      // 12px üzeri hareket = gerçek kaydırma
      if (Math.abs(t.clientY - startY) > 12 || Math.abs(t.clientX - startX) > 12) {
        moved = true;
      }
    }, { capture: true, passive: true });

    document.addEventListener('touchend', function () {
      // Parmak kaymadıysa: tap → guard kapalı kalsın
      if (!moved) {
        window._scrollGuardActive = false;
        setTimeout(function () { window._scrollGuardActive = false; }, 0);
      }
    }, { capture: true, passive: true });

    // EN SAĞLAM ÇÖZÜM: explainWord, scroll guard yüzünden tap'i iptal
    // ediyordu. explainWord'ü sarıp çağrı anında guard'ı temizliyoruz;
    // böylece kelimeye dokunulduğunda açıklama her zaman açılır.
    function wrapExplain() {
      if (typeof window.explainWord === 'function' && !window.explainWord.__wmTapWrapped) {
        var orig = window.explainWord;
        window.explainWord = function () {
          window._scrollGuardActive = false; // tap'i guard iptal etmesin
          return orig.apply(this, arguments);
        };
        window.explainWord.__wmTapWrapped = true;
        return true;
      }
      return false;
    }
    if (!wrapExplain()) {
      var tries = 0;
      var iv = setInterval(function () {
        if (wrapExplain() || ++tries > 60) clearInterval(iv);
      }, 150);
    }
  })();

  /* ============================================================
     (2) KELİME AÇIKLAMA MODALINA "BU KELİMENİN GEÇTİĞİ CÜMLELER"
     showWordExplanationModal sonrası modal içeriğine örnek cümle
     kutusunu ekler. wmFindWordExampleSentences index.html'de tanımlı.
     ============================================================ */
  (function addExamplesToModal() {
    function findExamples(word, limit) {
      try {
        if (typeof window.wmFindWordExampleSentences === 'function') {
          return window.wmFindWordExampleSentences(word, limit || 6) || [];
        }
      } catch (e) {}
      return [];
    }

    function buildBox(word) {
      var rows = findExamples(word, 6);
      if (!rows.length) return '';
      return '<div class="wm-word-examples-box"><h3>Bu kelimenin geçtiği cümleler</h3>' +
        rows.map(function (r) {
          return '<div class="wm-word-example-item"><b>' + esc(r.en) + '</b><br><span>' + esc(r.tr || '') + '</span></div>';
        }).join('') + '</div>';
    }

    // Modal içeriği bu kaplardan birine render edilir
    function getModalBox() {
      return document.getElementById('modalExplanationContent') ||
        document.querySelector('#wordExplanationModal .modal-content, #wordExplanationModal') ||
        null;
    }

    function inject(word) {
      var box = getModalBox();
      if (!box) return false;
      if (box.querySelector('.wm-word-examples-box')) return true; // zaten eklendi
      var html = buildBox(word);
      if (!html) return false; // veri henüz yoksa daha sonra tekrar denenir
      box.insertAdjacentHTML('beforeend', html);
      return true;
    }

    // Modal açıkken örnek cümleleri eklemeyi birkaç kez dene
    // (veri xlsx'ten async geldiği için ilk denemede boş olabilir).
    function injectWithRetries(word) {
      var delays = [0, 60, 200, 500, 1000, 2000, 3500];
      delays.forEach(function (d) {
        setTimeout(function () {
          // Modal kapandıysa boşuna deneme
          var box = getModalBox();
          if (!box) return;
          if (box.querySelector('.wm-word-examples-box')) return;
          inject(word);
        }, d);
      });
    }

    function hook() {
      if (typeof window.showWordExplanationModal === 'function' && !window.showWordExplanationModal.__wmExHooked) {
        var orig = window.showWordExplanationModal;
        window.showWordExplanationModal = function (word) {
          var r = orig.apply(this, arguments);
          window.__wmLastExplainWord = word;
          injectWithRetries(word);
          return r;
        };
        window.showWordExplanationModal.__wmExHooked = true;
        return true;
      }
      return false;
    }

    // Veri sonradan yüklenince, açık modal varsa örnekleri tazele
    window.addEventListener('tumdata:loaded', function () {
      if (window.__wmLastExplainWord) injectWithRetries(window.__wmLastExplainWord);
    });

    // Fonksiyon legacy-app yüklendikten sonra hazır olur; birkaç kez dene
    if (!hook()) {
      var tries = 0;
      var iv = setInterval(function () {
        if (hook() || ++tries > 40) clearInterval(iv);
      }, 150);
    }

    // CSS zaten index.html'de var; yoksa minimal stil ekle
    if (!document.getElementById('wm-word-examples-css')) {
      var css = document.createElement('style');
      css.id = 'wm-word-examples-css';
      css.textContent = '.wm-word-examples-box{margin-top:14px;padding:12px;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(15,23,42,.62)}.wm-word-examples-box h3{margin:0 0 10px;font-size:14px;font-weight:900;color:#f8fafc}.wm-word-example-item{padding:10px 11px;margin:8px 0;border:1px solid rgba(148,163,184,.16);border-radius:12px;background:rgba(15,23,42,.72);line-height:1.35}.wm-word-example-item b{font-size:13px;color:#f8fafc}.wm-word-example-item span{font-size:12px;color:#94a3b8}';
      document.head.appendChild(css);
    }
  })();

  /* ============================================================
     (1b) AÇILIŞTA VERİ YÜKLENENE KADAR MENÜYÜ BEKLET
     Mobilde TumData_Temiz.xlsx geç/başarısız yüklenebiliyordu ve
     menü boş veriyle açılıyordu. Burada veri yüklenene (veya makul
     bir zaman aşımına) kadar tam ekran bir yükleme katmanı gösterip
     menüyü gizliyoruz. Yükleme bitince katman kalkar, menü görünür.
     Mobilde başarısızlığa karşı yükleyiciyi tekrar tetikleriz.
     ============================================================ */
  (function gateMenuUntilDataLoaded() {
    var DONE = false;
    var HARD_TIMEOUT = 30000; // 30 sn sonra her hâlükârda menüyü aç
    var started = Date.now();
    var triggered = false;

    function makeOverlay() {
      if (document.getElementById('wmDataLoadingOverlay')) return document.getElementById('wmDataLoadingOverlay');
      var ov = document.createElement('div');
      ov.id = 'wmDataLoadingOverlay';
      ov.setAttribute('role', 'status');
      ov.innerHTML =
        '<div class="wm-ldg-card">' +
        '<div class="wm-ldg-spin"></div>' +
        '<div class="wm-ldg-title">Modül verisi yükleniyor…</div>' +
        '<div class="wm-ldg-sub" id="wmDataLoadingSub">TumData_Temiz.xlsx hazırlanıyor</div>' +
        '<button id="wmDataLoadingRetry" class="wm-ldg-retry" style="display:none">Tekrar Dene</button>' +
        '</div>';
      var css = document.createElement('style');
      css.textContent =
        '#wmDataLoadingOverlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;' +
        'background:radial-gradient(1200px 600px at 50% -10%,rgba(30,41,59,.96),rgba(2,6,23,.98));backdrop-filter:blur(2px);' +
        'font-family:system-ui,Arial,sans-serif;padding:24px;}' +
        '.wm-ldg-card{text-align:center;max-width:340px;width:100%;}' +
        '.wm-ldg-spin{width:54px;height:54px;margin:0 auto 18px;border-radius:50%;border:4px solid rgba(148,163,184,.25);' +
        'border-top-color:#38bdf8;animation:wmldgspin 0.9s linear infinite;}' +
        '@keyframes wmldgspin{to{transform:rotate(360deg)}}' +
        '.wm-ldg-title{color:#f8fafc;font-weight:900;font-size:17px;margin-bottom:6px;}' +
        '.wm-ldg-sub{color:#94a3b8;font-size:13px;font-weight:700;line-height:1.4;}' +
        '.wm-ldg-retry{margin-top:16px;border:0;border-radius:12px;padding:10px 18px;font-weight:900;cursor:pointer;' +
        'background:#15803d;color:#fff;font-size:14px;}';
      ov.appendChild(css);
      (document.body || document.documentElement).appendChild(ov);

      var retry = ov.querySelector('#wmDataLoadingRetry');
      if (retry) {
        retry.addEventListener('click', function () {
          retry.style.display = 'none';
          setSub('Yeniden yükleniyor…');
          triggered = false;
          triggerLoad();
        });
      }
      return ov;
    }

    function setSub(txt) {
      var el = document.getElementById('wmDataLoadingSub');
      if (el) el.textContent = txt;
    }

    function removeOverlay() {
      var ov = document.getElementById('wmDataLoadingOverlay');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }

    // GERÇEK kontrol: modül ekranının (WMPath) okuduğu veri dolu mu?
    // Yanlış global'lere (TUMDATA_ROWS) değil, __WM_PATH_DATA__ ve
    // WMPath.data.tree'ye bakıyoruz.
    function dataLooksReady() {
      try {
        if (Array.isArray(window.__WM_PATH_DATA__) && window.__WM_PATH_DATA__.length) return true;
      } catch (e) {}
      try {
        if (window.WMPath && window.WMPath.data && Array.isArray(window.WMPath.data.tree) && window.WMPath.data.tree.length) return true;
      } catch (e) {}
      try {
        if (Array.isArray(window.allWords) && window.allWords.length) return true;
      } catch (e) {}
      return false;
    }

    function rebuildPath() {
      try {
        if (window.WMPath && typeof window.WMPath.build === 'function') window.WMPath.build(true);
      } catch (e) {}
    }

    // DOĞRU yükleyiciyi kullan: WMPath.autoLoadGitHub veriyi
    // __WM_PATH_DATA__ + IndexedDB/localStorage'a yazar (modülün okuduğu yer).
    function triggerLoad() {
      if (triggered) return;
      triggered = true;
      var fired = false;

      function done(ok) {
        if (fired) return;
        fired = true;
        if (ok || dataLooksReady()) { rebuildPath(); finish('loaded'); }
        else showRetry();
      }

      // 1) Asıl yükleyici
      try {
        if (window.WMPath && typeof window.WMPath.autoLoadGitHub === 'function') {
          window.WMPath.autoLoadGitHub(function (ok) { done(ok); });
          return;
        }
      } catch (e) {}

      // 2) WMPath henüz hazır değilse kısa süre bekleyip tekrar dene
      var waited = 0;
      var w = setInterval(function () {
        waited += 250;
        if (window.WMPath && typeof window.WMPath.autoLoadGitHub === 'function') {
          clearInterval(w);
          try { window.WMPath.autoLoadGitHub(function (ok) { done(ok); }); }
          catch (e) { showRetry(); }
        } else if (waited > 6000) {
          clearInterval(w);
          // son çare: eski yükleyici (en azından bir şey denesin)
          try {
            if (typeof window.loadTumDataFromGithub === 'function') {
              var p = window.loadTumDataFromGithub(true);
              if (p && p.then) p.then(function () { done(false); }).catch(function () { showRetry(); });
            } else { showRetry(); }
          } catch (e) { showRetry(); }
        }
      }, 250);
    }

    function showRetry() {
      var r = document.getElementById('wmDataLoadingRetry');
      if (r) r.style.display = 'inline-block';
      setSub('Yükleme gecikti. Bağlantınızı kontrol edip tekrar deneyin.');
    }

    function finish(reason) {
      if (DONE) return;
      DONE = true;
      removeOverlay();
      try {
        var menu = document.getElementById('sc-menu');
        if (menu) {
          document.querySelectorAll('.screen').forEach(function (s) {
            if (s.id !== 'sc-menu') s.classList.remove('active');
          });
          menu.classList.add('active');
          menu.style.display = 'block';
        }
      } catch (e) {}
    }

    function start() {
      if (dataLooksReady()) { finish('already'); return; }
      makeOverlay();
      triggerLoad();

      var iv = setInterval(function () {
        if (DONE) { clearInterval(iv); return; }
        if (dataLooksReady()) { clearInterval(iv); rebuildPath(); finish('poll'); return; }
        if (Date.now() - started > 10000) showRetry();
        if (Date.now() - started > HARD_TIMEOUT) { clearInterval(iv); finish('timeout'); }
      }, 400);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  })();

})();
