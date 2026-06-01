/* ════════════════════════════════════════════════════════════════
   WordMode — modül: app-init.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function initializeSRSForLearnedWords() {
  console.log('🔄 SRS başlatma kontrolü yapılıyor...');
  
  let initializedCount = 0;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  // learnedSet'teki her kelime için kontrol yap
  learnedSet.forEach(word => {
    // Eğer bu kelime için SRS verisi yoksa, başlat
    if (!spacedRepetition[word]) {
      spacedRepetition[word] = {
        level: 0,              // Başlangıç seviyesi
        correctStreak: 1,      // En az 1 doğru yapılmış
        lastReview: now,
        nextReview: now + ONE_DAY  // 1 gün sonra tekrar
      };
      initializedCount++;
    }
  });
  
  if (initializedCount > 0) {
    console.log(`✅ ${initializedCount} öğrenilmiş kelime için SRS başlatıldı`);
    saveProgress(); // Değişiklikleri kaydet
  } else {
    console.log('✅ Tüm öğrenilmiş kelimeler zaten SRS sisteminde');
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  loadLearnedWords();
  
  // Backup klasörü iznini geri yükle
  restoreBackupFolderHandle();
  
  // words array yüklendikten sonra sync yap (1 saniye gecikme)
  setTimeout(() => {
    syncLearnedWordsWithMainArray();
    // Sync'ten hemen sonra SRS'i başlat
    initializeSRSForLearnedWords();
  }, 1000);
  
  loadAITokenSettings(); // Bu hem token hem model ayarlarını yükleyecek
  updateLastSaveTime();
  startAutoSave(); // Otomatik kayıt sistemini başlat
  initUploadScreen(); // Upload ekranını kontrol et
  console.log('✅ Tüm sistemler yüklendi');
  console.log('🤖 AI Token Ayarları:', aiTokenSettings);
  console.log('🤖 AI Model Ayarları:', aiModelSettings);
});

window.addEventListener('beforeunload', ()=>{
  try {
    saveLearnedWords();
    localStorage.setItem('lastSaveTime', new Date().toISOString());
    console.log('💾 Sayfa kapanırken veriler kaydedildi');
  } catch(e) {
    console.error('❌ Çıkış kaydı hatası:', e);
  }
});

// Ezberlenecekler listesini göster
function showToLearnList() {
  const list = document.getElementById('toLearnList');
  if (!list) return;
  
  const toLearn = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('toLearnWords_')) {
      try {
        const word = JSON.parse(localStorage.getItem(key));
        toLearn.push({ key, word: word.word });
      } catch(e) {}
    }
  }
  
  if (toLearn.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Henüz kelime eklemedin</div>';
    return;
  }
  
  list.innerHTML = toLearn.map(item => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg3);border-radius:8px;cursor:pointer" onclick="explainWord('${item.word.replace(/'/g, "\\'")}', 'chatMessages')">
      <span style="flex:1;font-weight:700;color:var(--text)">${item.word}</span>
      <button onclick="event.stopPropagation();removeToLearnWord('${item.key}')" style="padding:4px 8px;background:var(--red);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px">Sil</button>
    </div>
  `).join('');
}

function removeToLearnWord(key) {
  localStorage.removeItem(key);
  showToLearnList();
  showToast('🗑️ Silindi', 'Kelime listeden kaldırıldı');
}

function exportToLearnWords() {
  const toLearn = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('toLearnWords_')) {
      try {
        const word = JSON.parse(localStorage.getItem(key));
        toLearn.push(word);
      } catch(e) {}
    }
  }
  
  if (toLearn.length === 0) {
    showToast('⚠️ Liste Boş', 'Önce kelime ekle');
    return;
  }
  
  // Excel formatında indir
  const csv = 'word,tr,sentence,sentenceTr,phonetic\n' + 
    toLearn.map(w => `${w.word},,,,,`).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ezberlenecekler.csv';
  a.click();
  
  showToast('✅ İndirildi', 'Excel dosyası indirildi');
}

// Anki Export - Tab-separated format
function exportToAnki() {
  const toLearn = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('toLearnWords_')) {
      try {
        const word = JSON.parse(localStorage.getItem(key));
        toLearn.push(word);
      } catch(e) {}
    }
  }
  
  if (toLearn.length === 0) {
    showToast('⚠️ Liste Boş', 'Önce kelime ekle');
    return;
  }
  
  // Anki formatı: word\ttranslation\tsentence (tab-separated)
  const ankiContent = toLearn.map(w => {
    const word = w.word || '';
    const translation = w.tr || '';
    const sentence = w.sentence || '';
    return `${word}\t${translation}\t${sentence}`;
  }).join('\n');
  
  const blob = new Blob([ankiContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'word-mode-anki.txt';
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('✅ Anki Dosyası İndirildi', `${toLearn.length} kelime • Anki'ye File → Import ile ekle`);
}

function openToLearnModal() {
  // Listeyi topla
  const toLearn = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('toLearnWords_')) {
      try {
        const word = JSON.parse(localStorage.getItem(key));
        toLearn.push({ key, word: word.word });
      } catch(e) {}
    }
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;box-sizing:border-box';
  
  const content = document.createElement('div');
  content.style.cssText = 'background:var(--bg2);border-radius:20px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)';
  
  content.innerHTML = `
    <div style="position:sticky;top:0;background:var(--bg2);padding:20px;border-bottom:2px solid var(--border);display:flex;align-items:center;justify-content:space-between;z-index:1">
      <div>
        <h2 style="margin:0;font-size:22px;color:var(--text)">📌 Ezberlenecekler</h2>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">${toLearn.length} kelime</div>
      </div>
      <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;color:var(--muted);font-size:28px;cursor:pointer;padding:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.2s" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background='none'">×</button>
    </div>
    
    <div style="padding:20px">
      ${toLearn.length === 0 ? `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:56px;margin-bottom:12px">📚</div>
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">Henüz kelime eklemedin</div>
          <div style="font-size:13px;color:var(--muted)">Kelimelerin üzerine tıklayıp "📌 Ezberleneceklere Ekle" butonuna bas</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${toLearn.map(item => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg3);border-radius:12px;transition:all 0.2s;border:2px solid transparent;cursor:pointer" onclick="openContextForWord('${item.word}')" onmouseenter="this.style.borderColor='var(--green)';this.style.transform='translateX(4px)'" onmouseleave="this.style.borderColor='transparent';this.style.transform='translateX(0)'">
              <div style="width:36px;height:36px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📌</div>
              <span style="flex:1;font-weight:800;font-size:16px;color:var(--text)">${item.word}</span>
              <button onclick="event.stopPropagation();removeToLearnWordFromModal('${item.key}')" style="padding:8px 12px;background:var(--red);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">🗑️ Sil</button>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top:20px;padding-top:20px;border-top:2px solid var(--border);display:flex;gap:8px">
          <button onclick="exportToLearnWords()" style="flex:1;padding:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(59,130,246,0.4)'" onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='none'">
            📥 Excel İndir
          </button>
          <button onclick="exportToAnki()" style="flex:1;padding:14px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(139,92,246,0.4)'" onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='none'">
            🎴 Anki Export
          </button>
        </div>
      `}
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Modal dışına tıklama
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function removeToLearnWordFromModal(key) {
  localStorage.removeItem(key);
  // Modal'ı kapat ve yeniden aç
  document.querySelector('.modal-overlay')?.remove();
  openToLearnModal();
  showToast('🗑️ Silindi', 'Kelime listeden kaldırıldı');
}

function openContextForWord(word) {
  // Modal'ı kapat
  document.querySelector('.modal-overlay')?.remove();
  
  // Bağlam analizi ekranını aç
  showScreen("sc-context");
  
  // Input'a kelimeyi yaz
  setTimeout(() => {
    const contextInput = document.getElementById("contextInput");
    if (contextInput) {
      contextInput.value = word;
      // Otomatik analiz başlat
      contextInput.dispatchEvent(new Event('input'));
    }
  }, 100);
}

async function showWordRelations(word, tr, sentence) {
  // Modal oluştur
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;box-sizing:border-box';
  
  const content = document.createElement('div');
  content.style.cssText = 'background:var(--bg2);border-radius:20px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)';
  
  content.innerHTML = `
    <div style="position:sticky;top:0;background:var(--bg2);padding:20px;border-bottom:2px solid var(--border);display:flex;align-items:center;justify-content:space-between;z-index:1">
      <div>
        <h2 style="margin:0;font-size:22px;color:var(--text)">🔗 ${word}</h2>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">${tr}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="showPromptEditor('relations')" style="padding:6px 12px;background:var(--purple);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">📝 Prompt</button>
        <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;color:var(--muted);font-size:28px;cursor:pointer;padding:0">×</button>
      </div>
    </div>
    
    <div style="padding:20px">
      <div style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">🔄</div>
        <div style="font-size:14px;color:var(--muted)">İlişkiler yükleniyor...</div>
      </div>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Render helper: hem cache'ten hem AI'dan gelen içeriği aynı şekilde göster
  function _renderRelations(responseContent, fromCache) {
    const resultDiv = content.querySelector('div[style*="padding:20px"]');
    const fontSize = getAIFontSize();
    const cacheRosette = fromCache
      ? `<div style="margin-bottom:12px"><span style="display:inline-block;padding:4px 10px;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.4);border-radius:12px;font-size:11px;font-weight:700">📁 Önbellekten</span></div>`
      : '';
    resultDiv.innerHTML = `
      ${cacheRosette}
      <div style="font-size:${fontSize}px;line-height:2;color:var(--text);white-space:pre-wrap">${responseContent}</div>

      <div style="margin-top:20px;padding-top:20px;border-top:2px solid var(--border)">
        <div style="font-size:13px;color:var(--muted);text-align:center">
          💡 İlgili kelimelere tıklayarak detaylarını görebilirsin
        </div>
      </div>
    `;
    makeRelatedWordsClickable(resultDiv);
  }

  // 📦 Önce cache'e bak
  try {
    const cachedRel = _wordRelationsCache.get(word);
    if (cachedRel && cachedRel.content) {
      console.log("📦 İlişkiler cache'den gösteriliyor:", word);
      _renderRelations(cachedRel.content, true);
      // Modal dışına tıklama (cache yolu için de bağla)
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
      return;
    }
  } catch(e) {
    console.warn('İlişkiler cache okuma hatası:', e);
  }

  // AI'dan ilişkileri iste
  try {
    // Custom prompt varsa kullan, yoksa default
    const promptTemplate = getPrompt('relations');
    const prompt = fillPromptTemplate(promptTemplate.user, {
      word: word,
      tr: tr
    });

    const response = await callAI(promptTemplate.system, prompt, 'explain');

    // 💾 Cache'e kaydet
    try {
      _wordRelationsCache.set(word, { content: response.content, savedAt: Date.now() });
    } catch(e) {
      console.warn('İlişkiler cache yazma hatası:', e);
    }

    _renderRelations(response.content, false);

  } catch(error) {
    const resultDiv = content.querySelector('div[style*="padding:20px"]');
    resultDiv.innerHTML = `
      <div style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">❌</div>
        <div style="font-size:14px;color:var(--red)">İlişkiler yüklenemedi</div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">${error.message}</div>
      </div>
    `;
  }
  
  // Modal dışına tıklama
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function makeRelatedWordsClickable(container) {
  // Phrase'leri ve kelimeleri bul
  const text = container.innerHTML;
  
  // Önce phrase'leri yakala: "- take a break (türkçe)"
  const phrasePattern = /- ([a-zA-Z\s]+?) \(/g;
  
  container.innerHTML = text.replace(phrasePattern, (match, phrase) => {
    const trimmed = phrase.trim();
    return `- <span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="explainWord('${trimmed}','wordCard');document.querySelector('.modal-overlay')?.remove()">${trimmed}</span> (`;
  });
}

// ══════════════════════════════════════════════════════════
// SAYFA YÜKLENDİĞİNDE API KEY'LERİ YÜK
// ══════════════════════════════════════════════════════════
console.log('📦 API Logic yüklendi');

// Sayfa hazır olduğunda API key'leri yükle
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Sayfa yüklendi, API key\'leri yükleniyor...');
    loadAPIKeys();
    console.log('✅ API key\'leri yüklendi:', GROQ_API_KEYS.length, 'Groq key');
    
    // Yedekleme klasörü seçilmiş mi kontrol et
    const folderSelected = localStorage.getItem('backupFolderSelected') === 'true';
    
    if (!folderSelected) {
      // Klasör seçilmemiş, seçim ekranını göster
      console.log('⚠️ Yedekleme klasörü seçilmemiş, seçim ekranı gösteriliyor...');
      document.getElementById('folder-selection-screen').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
      document.querySelector('.bottom-nav').style.display = 'none';
    } else {
      // Klasör seçilmiş, normal başlat
      console.log('✅ Yedekleme klasörü seçilmiş, uygulama başlatılıyor...');
      backupFolderSelected = true;
      
      // Yedekleme klasörü handle'ını geri yükle ve otomatik yükleme başlat
      restoreBackupFolderHandle().then(() => {
        console.log('📁 Yedekleme klasörü handle geri yüklendi');
        // Otomatik geri yükleme sistemi
        setTimeout(() => autoRestoreFromBackupFolder(), 1000);
      }).catch(e => {
        console.log('📁 Yedekleme klasörü handle yüklenemedi:', e.message);
      });
    }
  });
} else {
  console.log('🔄 DOM hazır, API key\'leri yükleniyor...');
  loadAPIKeys();
  console.log('✅ API key\'leri yüklendi:', GROQ_API_KEYS.length, 'Groq key');
  
  // Yedekleme klasörü seçilmiş mi kontrol et
  const folderSelected = localStorage.getItem('backupFolderSelected') === 'true';
  
  if (!folderSelected) {
    // Klasör seçilmemiş, seçim ekranını göster
    console.log('⚠️ Yedekleme klasörü seçilmemiş, seçim ekranı gösteriliyor...');
    document.getElementById('folder-selection-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.querySelector('.bottom-nav').style.display = 'none';
  } else {
    // Klasör seçilmiş, normal başlat
    console.log('✅ Yedekleme klasörü seçilmiş, uygulama başlatılıyor...');
    backupFolderSelected = true;
    
    // Yedekleme klasörü handle'ını geri yükle ve otomatik yükleme başlat
    restoreBackupFolderHandle().then(() => {
      console.log('📁 Yedekleme klasörü handle geri yüklendi');
      // Otomatik geri yükleme sistemi
      setTimeout(() => autoRestoreFromBackupFolder(), 1000);
    }).catch(e => {
      console.log('📁 Yedekleme klasörü handle yüklenemedi:', e.message);
    });
  }
}



/* ===== extracted script block ===== */


// ═══════════════════════════════════════════════════
// APP LOGIC
// ═══════════════════════════════════════════════════
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

