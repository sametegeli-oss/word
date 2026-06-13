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
     (1) AÇILIŞTA SADECE MENÜ  (kalıcı koruma)
     showScreen'i kalıcı olarak sarıyoruz: kullanıcı gerçek bir
     gezinme yapana kadar menü DIŞINDA bir ekran açılmak istenirse
     sc-menu'ye çeviriyoruz. ZAMAN SINIRI YOK — mobilde veri geç
     yüklenip startSession gecikse bile kelime ekranı açılmaz.
     ============================================================ */
  (function startOnMenu() {
    window.WM_START_ON_MENU = true;
    // Kullanıcı henüz bir şey seçmedi
    if (typeof window.__WM_USER_NAV__ === 'undefined') window.__WM_USER_NAV__ = false;

    function userHasNavigated() { return !!window.__WM_USER_NAV__; }

    function forceMenu() {
      if (userHasNavigated()) return;
      if (document.getElementById('wmDataLoadingOverlay')) return; // gate açıkken bekle
      var menu = document.getElementById('sc-menu');
      if (!menu) return;
      var active = document.querySelector('.screen.active');
      if (active && active.id === 'sc-menu') return;
      document.querySelectorAll('.screen').forEach(function (s) {
        s.classList.remove('active');
        s.style.display = 'none';
      });
      menu.classList.add('active');
      menu.style.display = 'block';
    }

    // showScreen'i KALICI olarak sar: kullanıcı gezinmeden menü dışına çıkma
    function wrapShowScreen() {
      var orig = window.showScreen;
      if (typeof orig !== 'function') return false;
      if (orig.__wmPermMenuGuard) return true;
      var wrapped = function (id) {
        // Kullanıcı henüz gezinmediyse ve menü dışına çıkılmak isteniyorsa engelle
        if (!userHasNavigated() && id && id !== 'sc-menu') {
          return orig.call(this, 'sc-menu');
        }
        return orig.apply(this, arguments);
      };
      wrapped.__wmPermMenuGuard = true;
      // önceki guard bayraklarını da koru
      wrapped.__wmMenuGuard = true;
      try { window.showScreen = wrapped; } catch (e) { return false; }
      return true;
    }

    // showScreen sonradan tanımlanır/yeniden atanırsa tekrar sar (kalıcı izleme)
    if (!wrapShowScreen()) {
      var tries = 0;
      var iv = setInterval(function () {
        if (wrapShowScreen() || ++tries > 120) clearInterval(iv);
      }, 150);
    }
    // başka kod showScreen'i tekrar override ederse yeniden sarmak için periyodik kontrol
    setInterval(function () {
      if (userHasNavigated()) return;
      if (window.showScreen && !window.showScreen.__wmPermMenuGuard) wrapShowScreen();
    }, 500);

    // Kullanıcı gerçek bir gezinme yaptığında koruma serbest
    function markNav(reason) { window.__WM_USER_NAV__ = true; }
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('button,a,[role="button"],.menu-tile,.menu-cta,.bnav-btn,.wp-card');
      if (!b) return;
      var t = (b.textContent || '').trim();
      // "ana menü / menüye dön" tıklaması gezinme sayılmaz (zaten menüye gidiyor)
      if (t && /ana menü|menüye dön/i.test(t)) return;
      markNav('click');
    }, true);

    // Güvenlik ağı: kullanıcı gezinmeden menü dışı aktif olduysa menüye çek
    var ticks = [0, 150, 350, 600, 1000, 1600, 2500, 4000, 6000, 9000];
    function schedule() { ticks.forEach(function (ms) { setTimeout(forceMenu, ms); }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
    else schedule();
    window.addEventListener('load', schedule);

    try {
      var mo = new MutationObserver(function () {
        if (userHasNavigated()) return;
        var active = document.querySelector('.screen.active');
        if (active && active.id !== 'sc-menu' && !document.getElementById('wmDataLoadingOverlay')) {
          forceMenu();
        }
      });
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
      // kullanıcı gezinince gözlemciyi bırak
      var stopIv = setInterval(function () {
        if (userHasNavigated()) { try { mo.disconnect(); } catch (e) {} clearInterval(stopIv); }
      }, 500);
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

    function buildBoxHtml(word) {
      var rows = findExamples(word, 6);
      if (!rows.length) return '';
      return '<div class="wm-word-examples-box"><h3>Bu kelimenin geçtiği cümleler</h3>' +
        rows.map(function (r) {
          return '<div class="wm-word-example-item"><b>' + esc(r.en) + '</b>' +
            (r.tr ? '<br><span>' + esc(r.tr) + '</span>' : '') + '</div>';
        }).join('') + '</div>';
    }

    // Modalın gösterdiği kelimeyi bul: önce legacy geçmişinden, sonra
    // hook ile yakalanan değer, sonra modaldeki başlık/büyük yazı.
    function currentWord() {
      try {
        var h = window.explanationHistory, i = window.explanationHistoryIndex;
        if (Array.isArray(h) && i >= 0 && i < h.length && h[i] && h[i].word) return String(h[i].word);
      } catch (e) {}
      if (window.__wmLastExplainWord) return String(window.__wmLastExplainWord);
      // modaldeki en büyük başlık (kelime)
      try {
        var modal = document.getElementById('wordExplanationModal');
        if (modal) {
          var h2 = modal.querySelector('h1,h2,.dict-word,.word-title,[data-word]');
          if (h2) {
            var w = h2.getAttribute && h2.getAttribute('data-word');
            return String(w || h2.textContent || '').trim().split(/\s+/)[0];
          }
        }
      } catch (e) {}
      return '';
    }

    function getBox() {
      return document.getElementById('modalExplanationContent');
    }

    function injectInto(box) {
      if (!box) return;
      if (box.querySelector('.wm-word-examples-box')) return; // zaten var
      var word = currentWord();
      if (!word) return;
      var html = buildBoxHtml(word);
      if (!html) return; // veri yok → sonra tekrar denenir
      box.insertAdjacentHTML('beforeend', html);
    }

    // Modal içeriği her render edildiğinde örnek kutusunu (yeniden) ekle.
    // showWordExplanationModal'i hook etmeye GEREK kalmadan çalışır;
    // geçmişte ileri/geri gidip içerik yeniden çizilse de tekrar ekler.
    var pending = false;
    function scheduleInject() {
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        injectInto(getBox());
      }, 30);
    }

    function startObserver() {
      try {
        var mo = new MutationObserver(function (muts) {
          var box = getBox();
          if (!box) return;
          // İçerik değişti ve bizim kutu yoksa ekle
          if (!box.querySelector('.wm-word-examples-box')) scheduleInject();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) {}
      // Ek güvenlik: periyodik kontrol (gözlemci kaçırırsa)
      setInterval(function () {
        var box = getBox();
        if (box && !box.querySelector('.wm-word-examples-box')) injectInto(box);
      }, 700);
    }

    // Yine de showWordExplanationModal'i hook etmeyi dene (kelimeyi
    // doğrudan yakalamak için — başlık parse'ına güvenmeden).
    function hook() {
      if (typeof window.showWordExplanationModal === 'function' && !window.showWordExplanationModal.__wmExHooked) {
        var orig = window.showWordExplanationModal;
        window.showWordExplanationModal = function (word) {
          if (word) window.__wmLastExplainWord = word;
          var r = orig.apply(this, arguments);
          scheduleInject();
          return r;
        };
        window.showWordExplanationModal.__wmExHooked = true;
      }
    }
    hook();
    var t = 0, hi = setInterval(function () { hook(); if (++t > 40) clearInterval(hi); }, 150);

    // Veri sonradan yüklenince açık modali tazele
    window.addEventListener('tumdata:loaded', function () { injectInto(getBox()); });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver);
    } else {
      startObserver();
    }

    // CSS
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

  /* ============================================================
     (5) AÇILIŞTA YEDEK KLASÖRÜNDEKİ DOSYALARI TEKRAR YAZMA
     Açılışta `autoRestoreFromBackupFolder` klasördeki kitapları
     IndexedDB'ye yüklüyor; ama her yükleme, kitabı AYNI klasöre
     tekrar yazıyordu (gereksiz disk I/O + açılış yavaşlaması +
     zamanla aynı içeriğin farklı adlarla çoğalması).
     Çözüm: geri yükleme sürerken klasöre yazmayı atla — çünkü
     veri zaten o klasörden geliyor.
     ============================================================ */
  (function skipRedundantBookBackup() {
    // Klasöre-yazma fonksiyonu (saveBookToBackupFolder) içerik
    // karşılaştırması yapmıyordu: her çağrıda dosyayı koşulsuz üzerine
    // yazıyordu. Açılışta geri yükleme bu fonksiyonu her kitap için
    // çağırınca, veri zaten o klasörden gelmesine rağmen tüm kitaplar
    // tekrar yazılıyordu. Çözüm: yazmadan önce klasördeki dosyanın
    // içeriği zaten aynıysa ATLA. Bu, zamanlama/bayrak gerektirmez ve
    // hem açılışta hem normal kullanımda gereksiz yazımı/çoğalmayı önler.

    function wrap() {
      var fn = window.saveBookToBackupFolder;
      if (typeof fn !== 'function' || fn.__wmContentGuard) return false;

      // İçerik karşılaştırmasını dayanıklı kıl: BOM, satır sonu (CRLF/CR),
      // ve baştaki/sondaki boşluk farkları "aynı" sayılsın. Klasördeki eski
      // dosyalar (guard'dan önce yazılanlar) ile IDB metni arasında görünmez
      // bayt farkları (özellikle Türkçe karakterli/uzun PDF'lerde) yüzünden
      // tam eşitlik tutmuyordu; bu yüzden normalize ediyoruz.
      function norm(s) {
        return String(s)
          .replace(/^\uFEFF/, '')      // baştaki BOM
          .replace(/\r\n?/g, '\n')      // CRLF / CR -> LF
          .replace(/[ \t]+\n/g, '\n')  // satır sonu boşlukları
          .replace(/\s+$/, '');         // sondaki boşluk/yeni satırlar
      }

      var wrapped = async function (e, t, n) {
        try {
          var handle = window.backupFolderHandle;
          // Klasör seçili ve yeni içerik (n) verilmişse, mevcut dosyayı
          // okuyup aynıysa yazmayı atla.
          if (handle && typeof n === 'string') {
            var fname = 'book_' + e + '_' +
              String(t || '').replace(/[^a-z0-9]/gi, '_').substring(0, 50) + '.txt';
            // Klasörü tarayıp gerçek dosya adını bul. getFileHandle ile
            // doğrudan isimden aramak, Türkçe/özel karakterlerden doğan
            // isim üretimi farkları yüzünden tutmuyordu. Aynı kitap kimliği
            // ('book_' + e + '_') ön ekiyle başlayan gerçek dosyayı buluruz.
            var prefix = 'book_' + e + '_';
            var realName = null;
            try {
              for await (var entry of handle.values()) {
                if (entry.kind === 'file' &&
                    entry.name.indexOf(prefix) === 0 &&
                    /\.txt$/i.test(entry.name)) {
                  realName = entry.name;
                  break;
                }
              }
            } catch (scanErr) {
              console.warn('🔎 [wm-fix] Klasör taranamadı:', prefix, scanErr && scanErr.message);
            }
            if (realName) {
              try {
                var fh = await handle.getFileHandle(realName, { create: false });
                var file = await fh.getFile();
                var existing = await file.text();
                if (existing === n || norm(existing) === norm(n)) {
                  console.log('⏭️ [wm-fix] Kitap zaten güncel, yazma atlandı:', realName);
                  return false;
                }
                var a = norm(existing), b = norm(n), i = 0;
                while (i < a.length && i < b.length && a[i] === b[i]) i++;
                console.warn('🔎 [wm-fix] İçerik farklı, yazılacak:', realName,
                  '| klasör uzunluk:', a.length, 'IDB uzunluk:', b.length,
                  '| ilk fark @', i,
                  '| klasör:', JSON.stringify(a.slice(i, i + 40)),
                  '| IDB:', JSON.stringify(b.slice(i, i + 40)));
              } catch (readErr) {
                console.warn('🔎 [wm-fix] Dosya okunamadı:', realName, readErr && readErr.message);
              }
            } else {
              console.warn('🔎 [wm-fix] Klasörde eşleşen dosya yok, yazılacak:', prefix);
            }
          }
        } catch (e2) { /* sorun olursa orijinale düş */ }
        return fn.apply(this, arguments);
      };
      wrapped.__wmContentGuard = true;
      try { window.saveBookToBackupFolder = wrapped; } catch (e) { return false; }
      console.log('🛡️ [wm-fix] Kitap yedek içerik-guard bağlandı (saveBookToBackupFolder sarıldı)');
      return true;
    }

    console.log('🟢 [wm-fix] skipRedundantBookBackup yüklendi (v20260613-6)');
    // legacy-app v34 sarmalayıcısı window.saveBookToBackupFolder'ı
    // sonradan atayabilir; hazır olunca ve yeniden atanırsa tekrar sar.
    wrap();
    var tries = 0;
    var iv = setInterval(function () {
      if (window.saveBookToBackupFolder && !window.saveBookToBackupFolder.__wmContentGuard) wrap();
      if (++tries > 150) clearInterval(iv);
    }, 100);
  })();

})();
