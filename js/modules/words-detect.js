/* ════════════════════════════════════════════════════════════════
   WordMode — modül: words-detect.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function isSmWord(el){
  return el && (el.classList.contains('sm-word') || el.closest('.sm-word'));
}

// Tıklanabilir metin mi?
function getWord(el){
  // clickable-word span
  if(el.classList&&el.classList.contains('clickable-word')) return el.textContent.trim();
  // modal-clickable-word (modal içindeki wrap'li kelimeler)
  if(el.classList&&el.classList.contains('modal-clickable-word')) return el.dataset.word||el.textContent.trim();
  // whl-word (podcast)
  if(el.classList&&el.classList.contains('whl-word')) return el.dataset.word||el.textContent.trim();
  // song-word
  if(el.classList&&el.classList.contains('song-word')) return el.textContent.trim();
  // wi-word, wc-word, wc-sent içindeki hl span
  if(el.classList&&(el.classList.contains('wc-word')||el.classList.contains('wi-word')||el.classList.contains('hl'))) return el.textContent.trim();
  // quiz seçenekleri
  if(el.classList&&el.classList.contains('quiz-option')) return el.textContent.trim();
  // en-word (yeşil vurgulu kelimeler)
  if(el.classList&&el.classList.contains('en-word')) return el.dataset.word||el.textContent.trim();
  
  // KISITLAMA KALDIRILDI: HER YERDE HER KELİME TIKLANABİLİR
  // Modal içi dahil tüm text node'ları
  const txt=(el.textContent||'').trim();
  // Sadece 2+ harf içeren kelimeler (noktalama/sayı temizlenecek)
  if(txt&&txt.length>=2) {
    // Kelimedeki harfleri al
    const cleaned = txt.replace(/[^a-zA-Z]/g,'');
    if(cleaned.length>=2) return cleaned;
  }
  return null;
}

// Mouse/Touch pozisyonundan kelimeyi bul (BUTONLAR DAHİL)
function getWordAtPosition(x, y) {
  // document.caretRangeFromPoint (Chrome/Safari)
  // document.caretPositionFromPoint (Firefox)
  let range = null;
  
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.setEnd(position.offsetNode, position.offset);
    }
  }
  
  if (!range || !range.startContainer) return null;
  
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;
  
  const text = textNode.textContent;
  const offset = range.startOffset;
  
  // Offset etrafındaki kelimeyi bul
  let start = offset;
  let end = offset;
  
  // Geriye git (kelime başlangıcı)
  while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) {
    start--;
  }
  
  // İleriye git (kelime sonu)
  while (end < text.length && /[a-zA-Z]/.test(text[end])) {
    end++;
  }
  
  const word = text.substring(start, end).trim();
  
  // 2+ harf kontrolü
  if (word.length >= 2 && /[a-zA-Z]{2,}/.test(word)) {
    return word;
  }
  
  return null;
}

// ══════════════════════════════════════════════════════════
// GLOBAL LONG PRESS — Tüm ekranlarda kelimeye uzun bas → Groq
// ══════════════════════════════════════════════════════════
(function(){
  let _lpTimer=null;
  let _lpFired=false;
  const LONG_MS=600;

  // TOUCH EVENTS (Mobile)
  document.addEventListener('touchstart', function(e){
    if(_lpTimer) clearTimeout(_lpTimer);
    _lpFired=false;
    const target=e.target;
    
    // Modal içindeyse long press yapma (scroll etsin)
    if(target.closest('#wordExplanationModal')) return;
    
    if(isSmWord(target)) return; // sm-word kendi sistemi
    
    // Touch pozisyonuna göre kelimeyi al
    const touch = e.touches[0];
    const wordAtPos = getWordAtPosition(touch.clientX, touch.clientY);
    
    if(!wordAtPos) {
      // Pozisyondan bulamazsa, eski yöntemi dene
      const word=getWord(target);
      if(!word) return;
      const clean=word.replace(/[^a-zA-Z]/g,'').toLowerCase();
      if(!clean||clean.length<2) return;
      _lpTimer=setTimeout(()=>{
        _lpFired=true;
        navigator.vibrate&&navigator.vibrate(50);
        _explainWordImpl(clean,'chatMessages');
      },LONG_MS);
      return;
    }
    
    const clean=wordAtPos.replace(/[^a-zA-Z]/g,'').toLowerCase();
    if(!clean||clean.length<2) return;
    _lpTimer=setTimeout(()=>{
      _lpFired=true;
      navigator.vibrate&&navigator.vibrate(50);
      _explainWordImpl(clean,'chatMessages');
    },LONG_MS);
  },{passive:true});

  document.addEventListener('touchend', function(){
    clearTimeout(_lpTimer);
  },{passive:true});

  document.addEventListener('touchmove', function(){
    clearTimeout(_lpTimer);
  },{passive:true});
  
  // MOUSE EVENTS (Desktop)
  document.addEventListener('mousedown', function(e){
    if(_lpTimer) clearTimeout(_lpTimer);
    _lpFired=false;
    const target=e.target;
    
    // Modal içindeyse long press yapma (scroll etsin)
    if(target.closest('#wordExplanationModal')) return;
    
    if(isSmWord(target)) return;
    
    // Mouse pozisyonuna göre kelimeyi al
    const wordAtPos = getWordAtPosition(e.clientX, e.clientY);
    
    if(!wordAtPos) {
      // Pozisyondan bulamazsa, eski yöntemi dene
      const word=getWord(target);
      if(!word) return;
      const clean=word.replace(/[^a-zA-Z]/g,'').toLowerCase();
      if(!clean||clean.length<2) return;
      _lpTimer=setTimeout(()=>{
        _lpFired=true;
        _explainWordImpl(clean,'chatMessages');
      },LONG_MS);
      return;
    }
    
    const clean=wordAtPos.replace(/[^a-zA-Z]/g,'').toLowerCase();
    if(!clean||clean.length<2) return;
    _lpTimer=setTimeout(()=>{
      _lpFired=true;
      _explainWordImpl(clean,'chatMessages');
    },LONG_MS);
  },{passive:true});

  document.addEventListener('mouseup', function(){
    clearTimeout(_lpTimer);
  },{passive:true});

  document.addEventListener('mousemove', function(){
    clearTimeout(_lpTimer);
  },{passive:true});
})();

// ══════════════════════════════════════════════════════════
// ÖĞRENİLEN KELİMELER SİSTEMİ
// ══════════════════════════════════════════════════════════

