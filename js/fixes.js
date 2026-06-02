/* ============================================================
   FIXES v1 — 2026-06-02
   3 sorunu çözer, eski işlevleri BOZMADAN üstüne yazar:
   1) Sözcük arama: artık sadece cümlede değil; kelimede,
      Türkçe çeviride ve anlamda da arar.
   2) PDF / dosyadan yükleme olan Mining'i geri getirir
      (free_features.js'in sonundaki "v5 override" bloğu
      bu butonu kaldırıyordu).
   3) Light/Dark tema seçimini sayfa açılışında uygular ve
      butonun çalıştığından emin olur.
   Bu dosya legacy-app.js + free_features.js'ten SONRA yüklenmeli.
   ============================================================ */
(function () {
  'use strict';
  if (window.__WM_FIXES_V1__) return;
  window.__WM_FIXES_V1__ = true;

  function $(id) { return document.getElementById(id); }
  function low(v) { return String(v == null ? '' : v).toLowerCase(); }

  /* ----------------------------------------------------------
     0) EKSİK GLOBAL: escapeHtml
     legacy-app.js içinde escapeHtml (küçük h) çağrılıyor ama
     hiç tanımlı değil -> "escapeHtml is not defined" hatası.
     (Tanımlı olan escapeHTML, büyük H — farklı isim.)
     Telaffuz Koçu'nda kelime ayarlanınca patlamasının nedeni bu.
     Güvenli bir global tanımlıyoruz (varsa dokunmuyoruz).
     ---------------------------------------------------------- */
  if (typeof window.escapeHtml !== 'function') {
    window.escapeHtml = function (s) {
      return String(s == null ? '' : s).replace(/[&<>'"]/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c];
      });
    };
  }
  // Bazı yerlerde büyük harfli kullanılmış olabilir; o da garanti olsun.
  if (typeof window.escapeHTML !== 'function') {
    window.escapeHTML = window.escapeHtml;
  }

  /* ----------------------------------------------------------
     1) ARAMA DÜZELTMESİ
     Eski kod yalnızca item.sentence içinde arıyordu. Burada
     kelime + cümle + Türkçe + anlam alanlarını da kapsıyoruz.
     ---------------------------------------------------------- */
  function matchesQuery(item, q) {
    if (!q) return true;
    if (!item) return false;
    var fields = [
      item.word, item.Kelime, item.targetWord, item.highlight,
      item.sentence, item.Sentence, item.en, item.english,
      item.sentenceTr, item.SentenceTr, item.sentence_tr, item.tr, item.translation,
      item.meaning, item.anlam
    ];
    // meanings dizi olabilir
    if (Array.isArray(item.meanings)) fields = fields.concat(item.meanings);
    for (var i = 0; i < fields.length; i++) {
      if (fields[i] && low(fields[i]).indexOf(q) !== -1) return true;
    }
    return false;
  }
  window.WM_matchesQuery = matchesQuery;

  // renderWordList'i, listeyi geniş aramayla filtreleyecek şekilde sar.
  // Orijinal renderWordList currentSearchQuery'yi sadece sentence'ta arıyordu;
  // biz çağrıdan hemen önce/sonra virtualScrollData.filteredWords'ü düzeltiriz.
  var _origRenderWordList = window.renderWordList;
  if (typeof _origRenderWordList === 'function' && !_origRenderWordList.__wmFix) {
    var patched = function () {
      var el = $('wordListEl');
      // Orijinali çağır (sanal kaydırma altyapısını kurar)
      var r = _origRenderWordList.apply(this, arguments);
      try {
        var q = low(window.currentSearchQuery).trim();
        if (q && window.virtualScrollData) {
          var base = (typeof window.getFilteredWords === 'function')
            ? window.getFilteredWords()
            : (window.allWords || []);
          var filtered = base.filter(function (it) { return matchesQuery(it, q); });
          window.virtualScrollData.filteredWords = filtered;
          // yüksekliği ve görünür öğeleri yeniden hesapla
          var ITEM = (typeof ITEM_HEIGHT !== 'undefined') ? ITEM_HEIGHT : 76;
          var h = filtered.length * ITEM;
          if (el) {
            var content = el.querySelector('.virtual-content');
            if (content) content.style.height = h + 'px';
            el.style.height = Math.min(h, 600) + 'px';
          }
          window.virtualScrollData.visibleStart = -1;
          window.virtualScrollData.visibleEnd = -1;
          if (typeof window.updateVisibleItems === 'function') window.updateVisibleItems();
        }
      } catch (e) { console.warn('[FIX] renderWordList patch', e); }
      return r;
    };
    patched.__wmFix = true;
    window.renderWordList = patched;
  }

  // filterWordsBySentence: sayaç (kaç sonuç) da geniş aramaya göre olsun.
  var _origFilter = window.filterWordsBySentence;
  window.filterWordsBySentence = function (val) {
    window.currentSearchQuery = low(val).trim();
    try { if (typeof window.renderWordList === 'function') window.renderWordList(); } catch (e) {}
    try {
      var base = (typeof window.getFilteredWords === 'function') ? window.getFilteredWords() : (window.allWords || []);
      var q = window.currentSearchQuery;
      var n = q ? base.filter(function (it) { return matchesQuery(it, q); }) : base;
      var stats = $('listStats');
      if (stats && q) {
        stats.innerHTML =
          '<div style="padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:12px;text-align:center">' +
          '<span style="font-size:13px;color:var(--muted)">🔍 <span style="color:var(--text);font-weight:700">' +
          n.length + '</span> sonuç bulundu</span></div>';
      } else if (stats && !q) {
        stats.innerHTML = '';
      }
    } catch (e) { console.warn('[FIX] filterWordsBySentence', e); }
  };

  /* ----------------------------------------------------------
     2) PDF / DOSYADAN YÜKLEME OLAN MINING'İ GERİ GETİR
     free_features.js'in ilk bloğu ffMine/ffPdf'i (PDF mining)
     tanımlıyor; ama sondaki "v5 override" bloğu ffOpen'ı
     yeniden tanımlayıp Mining butonunu kaldırıyor.
     Burada PDF mining içeren mining overlay'ini ve butonunu
     yeniden kuruyoruz. ffPdf/ffMine fonksiyonları zaten
     tanımlı olduğu için onları yeniden kullanıyoruz.
     ---------------------------------------------------------- */
  function ensureMineButtonAndOverlay() {
    // ffMine/ffPdf fonksiyonları free_features.js'in ilk bloğunda
    // tanımlanmış olmalı. Yoksa bu düzeltme uygulanamaz.
    if (typeof window.ffMine !== 'function' || typeof window.ffPdf !== 'function') {
      return false;
    }

    // Mining overlay'i yoksa kur (v5 bloğu ffMine overlay'ini eklemiyor).
    if (!$('ffMine')) {
      var mineHTML =
        '<div class="ff-card"><div class="ff-title">📄 PDF Mining</div>' +
        '<div class="ff-sub">PDF seç; metin çıkarılır ve mining yapılır.</div>' +
        '<input id="ffPdf" class="ff-input" type="file" accept="application/pdf,.txt">' +
        '<div class="ff-row"><button class="ff-btn ff-blue" onclick="ffPdf()">PDF Oku</button></div>' +
        '<div id="ffPdfS" class="ff-sub"></div></div>' +
        '<div class="ff-card"><div class="ff-title">▶️ Transcript / Metin</div>' +
        '<textarea id="ffText" class="ff-text" placeholder="YouTube transcripti veya İngilizce metin..."></textarea>' +
        '<div class="ff-row"><button class="ff-btn ff-green" onclick="ffMine()">Kelimeleri Çıkar</button>' +
        '<button class="ff-btn ff-purple" onclick="ffSample()">Örnek</button>' +
        '<button class="ff-btn ff-ghost" onclick="ffClear()">Temizle</button></div></div>' +
        '<div id="ffMineStats" class="ff-grid" style="display:none"></div>' +
        '<div class="ff-card"><div class="ff-title">Bulunan Kelimeler</div>' +
        '<div id="ffMineOut" class="ff-sub">Henüz analiz yapılmadı.</div></div>';

      var overlay = document.createElement('div');
      overlay.id = 'ffMine';
      overlay.className = 'ff-ov';
      overlay.innerHTML =
        '<div class="ff-wrap"><div class="ff-top">' +
        '<button class="ff-close" onclick="ffClose(\'mine\')">← Kapat</button>' +
        '<h2>⛏️ PDF / Transcript Mining</h2></div>' + mineHTML + '</div>';
      document.body.appendChild(overlay);
    }

    // Mining butonu FAB barında yoksa ekle.
    var fabs = $('ffFabs');
    if (fabs && !fabs.querySelector('[data-wm-mine]')) {
      var btn = document.createElement('button');
      btn.className = 'ff-fab';
      btn.setAttribute('data-wm-mine', '1');
      btn.textContent = '⛏️ Mining';
      btn.onclick = function () { window.ffOpen('mine'); };
      // Panel'den hemen sonra yerleştir
      var first = fabs.querySelector('.ff-fab');
      if (first && first.nextSibling) fabs.insertBefore(btn, first.nextSibling);
      else fabs.appendChild(btn);
    }
    return true;
  }

  // v5 bloğunun ffOpen'ı 'mine'i tanımıyor; ffOpen'ı sarıp 'mine'i ekleyelim.
  function wrapFfOpen() {
    var prev = window.ffOpen;
    if (typeof prev !== 'function' || prev.__wmMineWrap) return;
    var wrapped = function (w) {
      if (w === 'mine') {
        ensureMineButtonAndOverlay();
        // Diğer overlay'leri kapat
        ['ffDash', 'ffRev', 'ffShad', 'voiceCompareOverlay', 'smngOverlay'].forEach(function (id) {
          var el = $(id); if (el) el.classList.remove('active');
        });
        var m = $('ffMine');
        if (m) {
          m.classList.add('active');
          m.scrollTop = 0;
          document.body.style.overflow = 'hidden';
        }
        return;
      }
      return prev.apply(this, arguments);
    };
    wrapped.__wmMineWrap = true;
    window.ffOpen = wrapped;
  }

  // ffClose 'mine' desteklesin
  function wrapFfClose() {
    var prev = window.ffClose;
    if (typeof prev !== 'function' || prev.__wmMineWrap) return;
    var wrapped = function (w) {
      if (w === 'mine') {
        var m = $('ffMine');
        if (m) m.classList.remove('active');
        document.body.style.overflow = '';
        return;
      }
      return prev.apply(this, arguments);
    };
    wrapped.__wmMineWrap = true;
    window.ffClose = wrapped;
  }

  /* ----------------------------------------------------------
     3) TEMA: kayıtlı tercihi açılışta uygula
     toggleDarkMode zaten çalışıyor ama sayfa açılışında
     applyDarkMode çağrılmıyor olabilir; kayıtlı değeri uygula.
     ---------------------------------------------------------- */
  function applySavedTheme() {
    try {
      var saved = localStorage.getItem('darkMode');
      // varsayılan: dark (true)
      var isDark = saved === null ? true : (saved === 'true');
      window.isDarkMode = isDark;
      if (typeof window.applyDarkMode === 'function') {
        window.applyDarkMode();
      } else {
        // applyDarkMode yoksa elle uygula
        if (isDark) {
          document.body.classList.remove('light-mode');
        } else {
          document.body.classList.add('light-mode');
        }
        var b = $('darkModeBtn');
        if (b) b.textContent = isDark ? '🌙' : '☀️';
      }
    } catch (e) { console.warn('[FIX] tema', e); }
  }

  /* ----------------------------------------------------------
     Başlat
     ---------------------------------------------------------- */
  function boot() {
    applySavedTheme();
    // free_features FAB'leri biraz gecikmeli kurulduğu için tekrar dene
    wrapFfOpen();
    wrapFfClose();
    ensureMineButtonAndOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // free_features ensureUI() setTimeout(1000) ile FAB ekliyor; sonrasında tekrar bağla
  setTimeout(boot, 1200);
  setTimeout(function () { wrapFfOpen(); wrapFfClose(); ensureMineButtonAndOverlay(); }, 2000);
})();
