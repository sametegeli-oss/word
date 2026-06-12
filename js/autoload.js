// js/autoload.js — Açılışta TumData_Temiz.xlsx otomatik yükleme
// Sadece localStorage boşsa (ilk açılış / temizlenmiş oturum) çalışır.
(function () {
  'use strict';

  var FILE_PATH = 'data/TumData_Temiz.xlsx';
  var FILE_NAME = 'TumData_Temiz.xlsx';

  function parseRows(sheet) {
    var range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    var headers = {};
    for (var c = range.s.c; c <= range.e.c; c++) {
      var hCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: c })];
      if (hCell && hCell.v) headers[String(hCell.v).trim().toLowerCase()] = c;
    }

    function cellVal(r, col) {
      if (col == null) return '';
      var cell = sheet[XLSX.utils.encode_cell({ r: r, c: col })];
      return cell ? String(cell.v != null ? cell.v : '') : '';
    }

    // TumData_Temiz sütun haritası
    var cSentenceEN    = headers['sentenceen']        != null ? headers['sentenceen']        : null;
    var cSentenceTR    = headers['sentencetr']        != null ? headers['sentencetr']        : null;
    var cPattern       = headers['pattern']           != null ? headers['pattern']           : null;
    var cIPA           = headers['ipa']               != null ? headers['ipa']               : null;
    var cSentLevel     = headers['sentencelevel']     != null ? headers['sentencelevel']     : null;
    var cGrammar       = headers['grammarstructure']  != null ? headers['grammarstructure']  : null;
    var cHighlights    = headers['highlights']        != null ? headers['highlights']        : null;
    var cAIExplain     = headers['aiexplanation']     != null ? headers['aiexplanation']     : null;
    var cLevel         = headers['level']             != null ? headers['level']             : null;

    var rows = [];
    for (var r = range.s.r + 1; r <= range.e.r; r++) {
      var sentence = cSentenceEN != null ? cellVal(r, cSentenceEN).trim() : '';
      if (!sentence) continue;

      var pattern  = cPattern  != null ? cellVal(r, cPattern).trim()  : '';
      var word     = pattern || sentence.split(' ')[0]; // pattern yoksa ilk kelime

      var trExpl   = cAIExplain != null ? cellVal(r, cAIExplain).trim() : '';
      var sentTR   = cSentenceTR != null ? cellVal(r, cSentenceTR).trim() : '';
      var tr       = trExpl || sentTR; // Türkçe açıklama öncelikli

      var ipa      = cIPA       != null ? cellVal(r, cIPA).trim()      : '';
      var level    = cSentLevel != null ? cellVal(r, cSentLevel).trim() :
                     cLevel     != null ? cellVal(r, cLevel).trim()    : '';
      var grammar  = cGrammar   != null ? cellVal(r, cGrammar).trim()  : '';

      // Highlights: "I am [name]" gibi şablondan köşeli parantez dışındaki kelimeleri al
      var hlRaw   = cHighlights != null ? cellVal(r, cHighlights).trim() : '';
      var hlWords = hlRaw
        ? hlRaw.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).filter(function(w){ return w.length > 1; })
        : [word];

      rows.push({
        rowNum:          r + 1,
        word:            word,
        en:              word,
        tr:              tr,
        phonetic:        ipa,
        sentence:        sentence,
        sentenceTr:      sentTR,
        sentenceLevel:   level,
        level:           level,
        grammarStructure:grammar,
        grammar:         grammar,
        highlights:      hlWords.length ? hlWords : [word],
        colors:          []
      });
    }
    return rows;
  }

  function doAutoLoad() {
    try {
      if (localStorage.getItem('lastFileData') || localStorage.getItem('lastUploadedFile')) {
        return; // Önceki oturum verisi var, otomatik yükleme gerekmez
      }
    } catch (e) {}

    if (typeof XLSX === 'undefined') {
      console.warn('[autoload] XLSX yüklenmedi, atlandı.');
      return;
    }

    console.log('[autoload] ' + FILE_NAME + ' yükleniyor…');

    fetch(FILE_PATH)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = parseRows(ws);

        if (rows.length < 2) {
          console.warn('[autoload] Yeterli satır bulunamadı: ' + rows.length);
          return;
        }

        console.log('[autoload] ' + rows.length + ' kayıt parse edildi.');

        // Genel değişkenlere ata
        if (typeof allWords !== 'undefined') window.allWords = rows;
        window.allWords = rows;
        if (typeof fileKey !== 'undefined') window.fileKey = 'wm_tumdata_temiz';
        window.fileKey = 'wm_tumdata_temiz';

        // localStorage'a kaydet (mevcut app mekanizmasıyla uyumlu)
        try {
          localStorage.setItem('lastFileData', JSON.stringify(rows));
          localStorage.setItem('lastUploadedFile', JSON.stringify({
            name: FILE_NAME,
            size: buf.byteLength,
            wordCount: rows.length,
            uploadDate: new Date().toISOString(),
            fileKey: 'wm_tumdata_temiz',
            auto: true
          }));
        } catch (e) {
          console.warn('[autoload] localStorage kaydı başarısız:', e.message);
        }

        // Oturumu başlat
        if (typeof startSession === 'function') {
          var ls = typeof learnedSet !== 'undefined' ? learnedSet : new Set();
          window.words = rows.filter(function (w) { return !ls.has(w.word); });
          if (!window.words.length) window.words = rows.slice();
          startSession();
        }
      })
      .catch(function (err) {
        console.warn('[autoload] Yüklenemedi:', err.message);
      });
  }

  // DOMContentLoaded sonrası çalış (XLSX defer ile yükleniyor)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doAutoLoad);
  } else {
    doAutoLoad();
  }
})();
