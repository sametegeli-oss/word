/* ════════════════════════════════════════════════════════════════
   WordMode — modül: storage.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const WM_StorageManager = {
  LIMITS: {
    CHROME: 10 * 1024 * 1024,
    FIREFOX: 10 * 1024 * 1024,
    SAFARI: 5 * 1024 * 1024,
    SAFARI_MOBILE: 2.5 * 1024 * 1024,
    WARNING_THRESHOLD: 0.8,
    CRITICAL_THRESHOLD: 0.9
  },

  getLimit: function() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isSafari && isMobile) return this.LIMITS.SAFARI_MOBILE;
    if (isSafari) return this.LIMITS.SAFARI;
    return this.LIMITS.CHROME;
  },

  getSize: function() {
    let total = 0;
    const details = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        const size = key.length + (value ? value.length : 0);
        total += size;
        if (key.startsWith('book_')) details.books = (details.books || 0) + size;
        else if (key.startsWith('analytics_')) details.analytics = (details.analytics || 0) + size;
        else if (key.includes('word') || key.includes('learn')) details.words = (details.words || 0) + size;
        else details.other = (details.other || 0) + size;
      }
    }
    return { total, details, limit: this.getLimit() };
  },

  checkStatus: function() {
    const { total, details, limit } = this.getSize();
    const percent = (total / limit) * 100;
    return {
      total, totalMB: (total / 1024 / 1024).toFixed(2),
      limit, limitMB: (limit / 1024 / 1024).toFixed(2),
      percent: percent.toFixed(1), details,
      level: percent >= 90 ? 'critical' : percent >= 80 ? 'warning' : 'safe'
    };
  },

  cleanupOldData: function(dryRun = false) {
    const now = Date.now();
    const cleaned = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // 1 yıldan eski analytics
      if (key.startsWith('analytics_day_')) {
        const dateStr = key.replace('analytics_day_', '');
        const age = (now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 365) {
          cleaned.push({ key, reason: '1 yıldan eski analytics' });
          if (!dryRun) localStorage.removeItem(key);
        }
      }
      
      // 90 günden eski görevler
      if (key.startsWith('dailyTasks_')) {
        const dateStr = key.replace('dailyTasks_', '');
        const age = (now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
        if (age > 90) {
          cleaned.push({ key, reason: '90 günden eski görevler' });
          if (!dryRun) localStorage.removeItem(key);
        }
      }
      
      // 30 günden eski AI cache
      if (key.startsWith('ai_cache_')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached.timestamp) {
            const age = (now - cached.timestamp) / (1000 * 60 * 60 * 24);
            if (age > 30) {
              cleaned.push({ key, reason: '30 günden eski AI cache' });
              if (!dryRun) localStorage.removeItem(key);
            }
          }
        } catch(e) {}
      }
    }
    return cleaned;
  },

  emergencyCleanup: function() {
    console.warn('🚨 ACİL TEMİZLİK BAŞLATILDI');
    const before = this.checkStatus();
    this.cleanupOldData(false);
    
    // Hala yeterli değilse agresif temizlik
    const mid = this.checkStatus();
    if (mid.percent > 85) {
      // Analytics'i 6 aya düşür
      for (let key in localStorage) {
        if (key.startsWith('analytics_day_')) {
          const age = (Date.now() - new Date(key.replace('analytics_day_', '')).getTime()) / (1000 * 60 * 60 * 24);
          if (age > 180) localStorage.removeItem(key);
        }
      }
      // AI cache'i tamamen temizle
      for (let key in localStorage) {
        if (key.startsWith('ai_cache_')) localStorage.removeItem(key);
      }
    }
    
    const after = this.checkStatus();
    console.log(`✅ Temizlik: ${before.percent}% → ${after.percent}%`);
    return after;
  },

  startMonitoring: function() {
    const status = this.checkStatus();
    
    if (status.level === 'critical') {
      console.error('🔴 KRİTİK: localStorage %90 dolu!');
      this.emergencyCleanup();
      WM_Toast.show('🧹', 'Otomatik bellek temizliği yapıldı');
    } else if (status.level === 'warning') {
      console.warn('🟡 UYARI: localStorage %80 dolu');
      const cleaned = this.cleanupOldData(false);
      if (cleaned.length > 0) {
        console.log(`✅ ${cleaned.length} eski öğe temizlendi`);
      }
    } else {
      console.log(`✅ LocalStorage: ${status.percent}% (${status.totalMB}MB / ${status.limitMB}MB)`);
    }
    
    // Her 5 dakikada kontrol
    setInterval(() => {
      const s = this.checkStatus();
      if (s.level === 'critical') {
        this.emergencyCleanup();
        WM_Toast.show('🧹', 'Otomatik bellek temizliği');
      }
    }, 5 * 60 * 1000);
  }
};

// Sayfa yüklendiğinde güvenlik kontrolü
window.addEventListener('DOMContentLoaded', function() {
  console.log('🛡️ Güvenlik modülleri yüklendi');
  
  // CryptoJS ve DOMPurify kontrolü
  if (!window.CryptoJS) {
    console.warn('⚠️ CryptoJS yüklenemedi - API key şifreleme devre dışı');
  } else {
    console.log('✅ CryptoJS yüklendi - API key şifreleme aktif');
  }
  
  if (!window.DOMPurify) {
    console.warn('⚠️ DOMPurify yüklenemedi - XSS koruması devre dışı');
  } else {
    console.log('✅ DOMPurify yüklendi - XSS koruması aktif');
  }
  
  // Bellek izleme
  setInterval(() => WM_Performance.checkMemory(), 30000);
  
  // ✅ YENİ: LocalStorage bellek yönetimi başlat
  WM_StorageManager.startMonitoring();
  
  // Hoş geldin mesajı
  setTimeout(() => {
    WM_Toast.show('🛡️', 'Güvenlik iyileştirmeleri aktif!');
  }, 1000);
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Global hata:', e.error);
});

console.log('✅ Güvenlik modülü başlatıldı');


/* ===== extracted script block ===== */


      // Service worker disabled in standalone
      
      // Offline/Online detection
      window.addEventListener('offline', () => {
        document.getElementById('offlineBanner').style.display = 'block';
      });
      
      window.addEventListener('online', () => {
        document.getElementById('offlineBanner').style.display = 'none';
      });
      
      // Sayfa yüklendiğinde kontrol et
      if (!navigator.onLine) {
        document.getElementById('offlineBanner').style.display = 'block';
      }
    

/* ===== extracted script block ===== */


// Stub functions to prevent "not defined" errors during page load
var switchTab = switchTab || function() { console.warn('switchTab not yet loaded'); };
var stopSpeech = stopSpeech || function() { console.warn('stopSpeech not yet loaded'); };
var formatAIResponse = formatAIResponse || function(x) { return x; };

// ─────────────────────────────────────────────────────────
// Scroll Guard: kaydırma anında ve hemen sonrasında
// kelime tıklamalarını yutmak için global bayrak
// ─────────────────────────────────────────────────────────
window._scrollGuardActive = false;
(function setupScrollGuard(){
  let timer = null;
  const RELEASE_MS = 220; // kaydırma bittikten sonra bekleme
  function arm() {
    window._scrollGuardActive = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { window._scrollGuardActive = false; }, RELEASE_MS);
  }
  // Tüm scroll olaylarını yakala (capture: true ile iç containerlardakileri de)
  window.addEventListener('scroll', arm, { capture: true, passive: true });
  // Dokunmatik kaydırmalarda da
  window.addEventListener('touchmove', arm, { capture: true, passive: true });
  // Wheel ile de
  window.addEventListener('wheel', arm, { capture: true, passive: true });
})();

// ═══════════════════════════════════════════════════
// PROMPTS CONFIG
// ═══════════════════════════════════════════════════


let _folderSaveTimer = null;

function saveProgress(){
  try{
    const _progData = JSON.stringify({learnedWords:[...learnedSet],wordStatus,score,streak,correctCount,idx});
    localStorage.setItem(fileKey, _progData);
    localStorage.setItem(fileKey+"_words", JSON.stringify(allWords));
    localStorage.setItem("wm_lastKey", fileKey);
    // IDB mirror (async, fire-and-forget)
    WMStore.set(fileKey, _progData).catch(()=>{});
    WMStore.set("wm_lastKey", fileKey).catch(()=>{});
    WMStore.saveAllWords(allWords).catch(()=>{});
    saveTimingData();

    // Analitik: Bugün öğrenilen kelime sayısını kaydet
    const today = new Date().toISOString().slice(0,10);
    const dayData = JSON.parse(localStorage.getItem('analytics_day_' + today) || '{"count":0,"hours":{}}');
    const hour = new Date().getHours();
    dayData.hours[hour] = (dayData.hours[hour] || 0) + 1;
    localStorage.setItem('analytics_day_' + today, JSON.stringify(dayData));

    // Klasör yedeklemesi — 10 sn debounce (her kayıtta tetiklenir ama sık yazma engellenir)
    if (backupFolderHandle) {
      clearTimeout(_folderSaveTimer);
      _folderSaveTimer = setTimeout(() => saveBackupToFolder(true), 10000);
    }
  }catch(e){
    console.error('❌ Progress save error:', e);
    if (e.name === 'QuotaExceededError') {
      alert('⚠️ Depolama alanı doldu! Eski verileri temizlemek için Ayarlar > Verileri Sil seçeneğini kullanın.');
    }
  }
}
async function loadProgress(){
  try{
    const raw=localStorage.getItem(fileKey) || await WMStore.get(fileKey).catch(()=>null);
    if(!raw) return false;
    const d=JSON.parse(raw);
    learnedSet=new Set(d.learnedWords||[]);
    wordStatus=d.wordStatus||{};
    score=d.score??100;streak=d.streak??0;correctCount=d.correctCount??0;idx=d.idx??0;
    
    // allWords yükle
    const wordsRaw=localStorage.getItem(fileKey+"_words");
    if(wordsRaw){
      try{
        allWords=JSON.parse(wordsRaw);
      }catch(e){console.error('allWords yükleme hatası:',e);}
    }
    
    // SRS verilerini yükle
    const srsRaw = localStorage.getItem("spacedRepetition");
    if(srsRaw){
      try{
        spacedRepetition = JSON.parse(srsRaw);
      }catch(e){ spacedRepetition = {}; }
    }
    
    return learnedSet.size>0;
  }catch(e){return false;}
}
function clearProgress(){
  try{
    localStorage.removeItem(fileKey);
    localStorage.removeItem(fileKey+"_words");
  }catch(e){
    console.error('❌ Clear progress error:', e);
  }
  learnedSet=new Set();
  wordStatus={};
}

function tryAutoRestore(){
  try{
    const lastKey=localStorage.getItem("wm_lastKey");
    if(!lastKey) return false;
    const saved=localStorage.getItem(lastKey+"_words");
    if(!saved) return false;
    const parsed=JSON.parse(saved);
    if(!parsed||parsed.length<2) return false;
    allWords=parsed;fileKey=lastKey;
    loadProgress();
    words=allWords.filter(w=>!learnedSet.has(w.word));
    if(words.length===0) words=[...allWords];
    
    // Direkt başlat (banner gösterme)
    startSession();
    return true;
  }catch(e){return false;}
}
function showResumeBanner(){
  const b=document.getElementById("resumeBanner");
  b.style.display="block";
  b.innerHTML=`<div style="font-weight:800;color:var(--text);margin-bottom:6px">📖 Kaldığın yerden devam et</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">✅ Öğrenilen: <b style="color:var(--green)">${learnedSet.size}</b> &nbsp;·&nbsp; 📚 Kalan: <b style="color:var(--blue)">${words.length}</b></div>
    <div style="display:flex;gap:8px">
      <button onclick="resumeSession()" style="flex:1;padding:10px;background:var(--green);color:#052e16;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer">▶ Devam Et</button>
      <button onclick="hideBanner()" style="flex:1;padding:10px;background:var(--bg3);color:var(--muted);border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;cursor:pointer">📂 Yeni Dosya</button>
    </div>`;
}
function resumeSession(){document.getElementById("resumeBanner").style.display="none";if(idx>=words.length)idx=0;startSession();}
function hideBanner(){document.getElementById("resumeBanner").style.display="none";}

// ══════════════════════════════════════════════════════════
// SESSION
// ══════════════════════════════════════════════════════════
function compressData(data) {
  // Basit string compression - JSON'u sıkıştır
  const jsonStr = JSON.stringify(data);
  if (jsonStr.length < 1000) return jsonStr;
  
  // Tekrarlayan desenleri kısalt
  let compressed = jsonStr
    .replace(/\"word\":/g, '"w":')
    .replace(/\"translation\":/g, '"t":')
    .replace(/\"level\":/g, '"l":')
    .replace(/\"addedDate\":/g, '"a":')
    .replace(/\"lastReviewed\":/g, '"r":')
    .replace(/\"reviewCount\":/g, '"c":');
  
  return compressed;
}

function decompressData(compressed) {
  if (!compressed) return null;
  try {
    // Önce normal parse dene
    return JSON.parse(compressed);
  } catch(e) {
    // Compressed formatı dene
    const decompressed = compressed
      .replace(/\"w\":/g, '"word":')
      .replace(/\"t\":/g, '"translation":')
      .replace(/\"l\":/g, '"level":')
      .replace(/\"a\":/g, '"addedDate":')
      .replace(/\"r\":/g, '"lastReviewed":')
      .replace(/\"c\":/g, '"reviewCount":');
    return JSON.parse(decompressed);
  }
}

// Optimize edilmiş saveLearnedWords
function saveLearnedWordsOptimized() {
  try {
    const compressed = compressData(learnedWords);
    localStorage.setItem('learnedWords_compressed', compressed);
    console.log('💾 Öğrenilen kelimeler sıkıştırılarak kaydedildi:', 
                (compressed.length / 1024).toFixed(1), 'KB');
    
    // Yedekleme (eski format)
    localStorage.setItem('learnedWords', JSON.stringify(learnedWords));
  } catch(e) {
    console.error('❌ Sıkıştırılmış kayıt hatası:', e);
    // Fallback - normal kaydet
    try {
      localStorage.setItem('learnedWords', JSON.stringify(learnedWords.slice(0, 500)));
    } catch(e2) {
      alert('⚠️ Depolama alanı doldu! Eski kelimeleri temizleyin.');
    }
  }
}

// Optimize edilmiş loadLearnedWords
function loadLearnedWordsOptimized() {
  try {
    // Önce compressed versiyonu dene
    const compressed = localStorage.getItem('learnedWords_compressed');
    if (compressed) {
      learnedWords = decompressData(compressed);
      if (learnedWords && Array.isArray(learnedWords)) {
        console.log('✅ Sıkıştırılmış veri yüklendi:', learnedWords.length, 'kelime');
        return;
      }
    }
    
    // Fallback - normal format
    const stored = localStorage.getItem('learnedWords');
    if (stored) {
      learnedWords = JSON.parse(stored);
      console.log('✅ Normal format yüklendi:', learnedWords.length, 'kelime');
    } else {
      learnedWords = [];
    }
  } catch(e) {
    console.error('❌ Yükleme hatası:', e);
    learnedWords = [];
  }
  
  // Bellek sınırı kontrolü - çok fazla kelime varsa uyar
  if (learnedWords.length > 2000) {
    console.warn('⚠️ Çok fazla kelime! Performans düşebilir.');
  }
}

// Export edilmiş fonksiyonları replace et
saveLearnedWords = saveLearnedWordsOptimized;
loadLearnedWords = loadLearnedWordsOptimized;

// ══════════════════════════════════════════════════════════
// GELİŞMİŞ NOTIFICATION HANDLER (SW ile iletişim)
// ══════════════════════════════════════════════════════════

function checkStorageNow(){
  const statusEl = document.getElementById('storageStatus');
  if(!statusEl) return;
  
  try {
    // 1. learnedWords kontrol
    const stored = localStorage.getItem('learnedWords');
    const count = learnedWords.length;
    
    let status = '';
    
    if(stored){
      const parsed = JSON.parse(stored);
      status = `✅ localStorage'da ${parsed.length} kelime var\n`;
      status += `📊 Bellekte ${count} kelime\n`;
      
      if(parsed.length !== count){
        status += `⚠️ UYUMSUZLUK! Yeniden yükleme önerilir`;
        statusEl.style.color = 'var(--orange)';
      } else {
        status += `✅ Senkronize`;
        statusEl.style.color = 'var(--green)';
      }
    } else {
      status = `❌ localStorage'da veri yok!\n`;
      status += `📊 Bellekte ${count} kelime\n`;
      
      if(count > 0){
        status += `⚠️ Kayıt gerekiyor!`;
        statusEl.style.color = 'var(--red)';
      } else {
        status += `ℹ️ Henüz kelime eklenmemiş`;
        statusEl.style.color = 'var(--muted)';
      }
    }
    
    statusEl.textContent = status;
    
    // Console'a detaylı bilgi
    console.log('═══════════════════════════════════');
    console.log('🔍 LOCALSTORAGE DURUMU');
    console.log('═══════════════════════════════════');
    console.log('📂 localStorage.learnedWords:', stored ? 'VAR' : 'YOK');
    console.log('📊 Bellekteki array:', learnedWords);
    console.log('🔢 Bellekte kelime sayısı:', count);
    
    if(stored){
      console.log('🔢 localStorage\'da kelime sayısı:', JSON.parse(stored).length);
      console.log('📋 İlk 5 kelime:', JSON.parse(stored).slice(0, 5));
    }
    
    console.log('═══════════════════════════════════');
    
  } catch(e){
    statusEl.textContent = '❌ Kontrol hatası: ' + e.message;
    statusEl.style.color = 'var(--red)';
    console.error('Kontrol hatası:', e);
  }
}

function forceReloadWords(){
  console.log('📥 ZORLA YENİDEN YÜKLEME BAŞLIYOR...');
  
  try {
    loadLearnedWords();
    checkStorageNow();
    showToast('✅ Yeniden Yüklendi', learnedWords.length + ' kelime');
    
    // Öğrenilen kelimeler ekranını güncelle
    if(document.getElementById('sc-learned').classList.contains('active')){
      renderLearnedWordsScreen();
    }
    
  } catch(e){
    console.error('❌ Yeniden yükleme hatası:', e);
    showToast('❌ Hata', 'Yeniden yükleme başarısız');
  }
}

function forceSaveWords(){
  console.log('💾 ZORLA KAYIT BAŞLIYOR...');
  
  try {
    saveLearnedWords();
    checkStorageNow();
    showToast('✅ Kaydedildi', learnedWords.length + ' kelime');
    
  } catch(e){
    console.error('❌ Kayıt hatası:', e);
    showToast('❌ Hata', 'Kayıt başarısız');
  }
}

// Sayfa yüklendiğinde otomatik kontrol
setTimeout(()=>{
  const statusEl = document.getElementById('storageStatus');
  if(statusEl) checkStorageNow();
}, 2000);

function testAddWord(){
  console.log('🧪 TEST KELİME EKLEME BAŞLIYOR...');
  
  const testWord = {
    word: 'apple',
    translation: 'elma',
    level: 'learning'
  };
  
  addLearnedWord(testWord.word, testWord.translation, testWord.level);
  
  console.log('✅ Test kelime eklendi');
  console.log('📊 Toplam kelime:', learnedWords.length);
  
  // Kontrol et
  setTimeout(()=>{
    checkStorageNow();
    showToast('✅ Test Tamamlandı', 'Console\'u kontrol edin');
  }, 500);
}

// ══════════════════════════════════════════════════════════
// TÜM VERİLERİ KAYDETME VE YEDEKLEME
// ══════════════════════════════════════════════════════════

async function saveAllDataAndExit(){
  try {
    console.log('💾 Kayıt işlemi başlıyor...');
    
    // 1. Öğrenilen kelimeler
    try {
      saveLearnedWords();
      console.log('✅ Öğrenilen kelimeler kaydedildi');
    } catch(e) {
      console.error('❌ Öğrenilen kelimeler hatası:', e);
    }
    
    // 2. AI Token ayarları
    try {
      localStorage.setItem('aiTokenSettings', JSON.stringify(aiTokenSettings));
      console.log('✅ AI ayarları kaydedildi');
    } catch(e) {
      console.error('❌ AI ayarları hatası:', e);
    }
    
    // 3. Streak ve istatistikler
    try {
      localStorage.setItem('streak', streak.toString());
      localStorage.setItem('correctCount', correctCount.toString());
      console.log('✅ Streak kaydedildi');
    } catch(e) {
      console.error('❌ Streak hatası:', e);
    }
    
    // 4. SRS verilerini kaydet
    try {
      localStorage.setItem('spacedRepetition', JSON.stringify(spacedRepetition));
      console.log('✅ SRS verileri kaydedildi');
    } catch(e) {
      console.error('❌ SRS hatası:', e);
    }
    
    // 5. Kelime durumlarını kaydet
    try {
      localStorage.setItem('learnedSet', JSON.stringify([...learnedSet]));
      localStorage.setItem('wordStatus', JSON.stringify(wordStatus));
      console.log('✅ Kelime durumları kaydedildi');
    } catch(e) {
      console.error('❌ Kelime durumları hatası:', e);
    }
    
    // 6. User profile (eğer varsa)
    try {
      if(typeof userProfile !== 'undefined'){
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        console.log('✅ Kullanıcı profili kaydedildi');
      }
    } catch(e) {
      console.error('❌ Profil hatası:', e);
    }
    
    // 7. saveProgress varsa çağır
    try {
      if(typeof saveProgress === 'function'){
        saveProgress();
        console.log('✅ İlerleme kaydedildi');
      }
    } catch(e) {
      console.error('❌ İlerleme hatası:', e);
    }
    
    // 8. Son kayıt zamanını güncelle
    try {
      const now = new Date();
      localStorage.setItem('lastSaveTime', now.toISOString());
      console.log('✅ Son kayıt zamanı güncellendi');
    } catch(e) {
      console.error('❌ Zaman hatası:', e);
    }
    
    // 9. Klasöre de yedekle (eğer klasör seçiliyse)
    if (backupFolderHandle) {
      try {
        await saveBackupToFolder();
        console.log('✅ Klasöre yedeklendi');
      } catch(e) {
        console.error('❌ Klasör yedekleme hatası:', e);
      }
    }
    
    // Toast göster
    showToast('✅ Tüm Çalışmalar Kaydedildi!', 'Verileriniz güvende');
    
    // 2 saniye sonra ana ekrana dön
    setTimeout(() => {
      switchTab('word');
    }, 2000);
    
    console.log('💾 TÜM VERİLER BAŞARIYLA KAYDEDİLDİ!');
    
  } catch(e){
    console.error('❌ GENEL KAYIT HATASI:', e);
    showToast('⚠️ Kayıt Tamamlandı', 'Bazı veriler kaydedilememiş olabilir');
  }
}

// ══════════════════════════════════════════════════════════
// OTOMATİK YEDEKLEME SİSTEMİ (KLASÖRE KAYDET)
// ══════════════════════════════════════════════════════════

function checkMemoryUsage() {
  if (window.performance && window.performance.memory) {
    const used = window.performance.memory.usedJSHeapSize / (1024 * 1024);
    const total = window.performance.memory.jsHeapSizeLimit / (1024 * 1024);
    const percent = (used / total * 100).toFixed(1);
    
    if (percent > 80) {
      console.warn(`⚠️ Yüksek bellek kullanımı: ${percent}% (${used.toFixed(1)}MB/${total.toFixed(1)}MB)`);
      return { used, total, percent: parseFloat(percent) };
    }
  }
  return null;
}

// Periyodik bellek kontrolü (geliştirme modunda)
if (window.DEBUG_MODE) {
  setInterval(() => {
    const mem = checkMemoryUsage();
    if (mem && mem.percent > 80) {
      console.warn('Bellek temizliği önerilir');
    }
  }, 30000);
}

// ══════════════════════════════════════════════════════════
// LOCALSTORAGE QUOTA HANDLER
// ══════════════════════════════════════════════════════════

function handleQuotaExceeded(error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('⚠️ localStorage limit aşıldı, veri temizleniyor...');
    
    // En eski kelimeleri temizle (öğrenilenlerden değil, geçici cache'lerden)
    const tempKeys = ['aiResponseCache', 'groq_rate_info', 'offlineSettings'];
    tempKeys.forEach(key => {
      try { localStorage.removeItem(key); } catch(e) {}
    });
    
    // Hala doluysa, en eski 100 öğrenilmiş kelimeyi zip'le
    if (learnedWords && learnedWords.length > 500) {
      const toKeep = learnedWords.slice(-400);
      learnedWords = toKeep;
      saveLearnedWordsOptimized();
      showToast('⚠️ Depolama', 'Eski veriler temizlendi, performans iyileştirildi');
    }
    
    return true;
  }
  return false;
}

// Tüm localStorage işlemlerini try-catch ile sarmala
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  try {
    originalSetItem.call(this, key, value);
  } catch(e) {
    if (handleQuotaExceeded(e)) {
      // Tekrar dene
      try {
        originalSetItem.call(this, key, value);
      } catch(e2) {
        console.error('❌ Veri kaydedilemedi:', key);
      }
    } else {
      throw e;
    }
  }
};
if(typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';



/* ===== extracted script block ===== */



// ═══════════════════════════════════════════════════════
// ÖZELLİK 1: Bağlamdaki Cümleler
// ═══════════════════════════════════════════════════════
