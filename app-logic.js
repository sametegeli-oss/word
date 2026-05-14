// ══════════════════════════════════════════════════════════
// PDF WORKER FALLBACK
// ══════════════════════════════════════════════════════════

if (typeof pdfjsLib !== 'undefined') {
  try {
    // Önce CDN'den dene
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } catch(e) {
    console.warn('PDF worker CDN yüklenemedi, fallback kullanılıyor');
    // Local worker path - eğer dosyayı kopyaladıysanız
    pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
  }
}

// ══════════════════════════════════════════════════════════
// GELİŞMİŞ TTS DURDURMA (iOS için garantili)
// ══════════════════════════════════════════════════════════

function stopSpeechGuaranteed() {
  if (!window.speechSynthesis) return;
  
  // Method 1: Cancel
  window.speechSynthesis.cancel();
  
  // Method 2: Pause + Resume + Cancel (iOS trick)
  window.speechSynthesis.pause();
  window.speechSynthesis.resume();
  window.speechSynthesis.cancel();
  
  // Method 3: Empty utterance to clear queue
  const silence = new SpeechSynthesisUtterance('');
  silence.volume = 0;
  window.speechSynthesis.speak(silence);
  window.speechSynthesis.cancel();
  
  // Method 4: Delayed final cancel
  setTimeout(() => {
    window.speechSynthesis.cancel();
  }, 50);
  
  // Method 5: Force stop by getting all voices and canceling again
  setTimeout(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.cancel();
  }, 100);
  
  console.log('🔇 Ses garantili durduruldu');
}

// Replace old stopSpeech with guaranteed version
const originalStopSpeech = stopSpeech;
stopSpeech = stopSpeechGuaranteed;

// ══════════════════════════════════════════════════════════
// MEMORY USAGE MONITOR
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
