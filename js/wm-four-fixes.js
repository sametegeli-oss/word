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
     (1) AÇILIŞTA SADECE MENÜ
     forceMenu, kullanıcı bir butona basana kadar (boot süresinden
     bağımsız) kelime ekranı açılırsa menüye geri döndürür.
     ============================================================ */
  (function startOnMenu() {
    window.WM_START_ON_MENU = true;
    var userNavigated = false;

    function forceMenu() {
      if (userNavigated) return;
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

    function inject(word) {
      var box = document.getElementById('modalExplanationContent');
      if (!box) return;
      if (box.querySelector('.wm-word-examples-box')) return; // zaten eklendi
      var html = buildBox(word);
      if (!html) return;
      box.insertAdjacentHTML('beforeend', html);
    }

    function hook() {
      if (typeof window.showWordExplanationModal === 'function' && !window.showWordExplanationModal.__wmExHooked) {
        var orig = window.showWordExplanationModal;
        window.showWordExplanationModal = function (word) {
          var r = orig.apply(this, arguments);
          var w = word;
          // modal render'i tamamlandıktan sonra ekle
          setTimeout(function () { inject(w); }, 0);
          setTimeout(function () { inject(w); }, 60);
          return r;
        };
        window.showWordExplanationModal.__wmExHooked = true;
        return true;
      }
      return false;
    }

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

})();
