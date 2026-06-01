/* ════════════════════════════════════════════════════════════════
   WordMode — modül: learned-words.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function loadLearnedWords(){
  try {
    console.log('📂 KELİMELER YÜKLENİYOR...');
    
    const stored = localStorage.getItem('learnedWords');
    console.log('📂 localStorage\'dan okunan:', stored ? (stored.length + ' karakter') : 'BOŞ');
    
    if(stored){
      try {
        learnedWords = JSON.parse(stored);
        console.log('✅ YÜKLEME BAŞARILI:', learnedWords.length, 'kelime yüklendi');
        console.log('📚 Yüklenen kelimeler:', learnedWords.map(w => w.word).slice(0, 10).join(', '), '...');
        
        // 🔄 SYNC: learnedWords'teki kelimeleri words array'inde learned=true yap
        syncLearnedWordsWithMainArray();
        
      } catch(parseError){
        console.error('❌ JSON PARSE HATASI:', parseError);
        console.error('Bozuk veri:', stored.substring(0, 100));
        learnedWords = [];
      }
    } else {
      console.log('ℹ️ localStorage\'da learnedWords bulunamadı - YENİ BAŞLANGIÇ');
      learnedWords = [];
    }
    
    // localStorage'daki tüm anahtarları göster
    console.log('🗂️ localStorage anahtarları:', Object.keys(localStorage));
    
  } catch(e) {
    console.error('❌ GENEL YÜKLEME HATASI:', e);
    learnedWords = [];
  }
}

// 🔄 learnedWords ile words array'ini senkronize et
function syncLearnedWordsWithMainArray() {
  if (!Array.isArray(words) || !words.length) {
    return;
  }
  if(typeof words === 'undefined' || !Array.isArray(words)) {
    console.log('ℹ️ words array henüz yüklenmemiş, sync atlanıyor');
    return;
  }
  
  if(!learnedWords || learnedWords.length === 0) {
    console.log('ℹ️ learnedWords boş, sync gerekmiyor');
    return;
  }
  
  console.log('🔄 SYNC BAŞLATILIYOR - learnedWords:', learnedWords.length, 'words:', words.length);
  
  let syncCount = 0;
  
  // learnedSet'i temizle ve yeniden oluştur
  if(typeof learnedSet !== 'undefined') {
    learnedSet.clear();
  }
  
  learnedWords.forEach(learned => {
    // learnedSet'e ekle
    if(typeof learnedSet !== 'undefined') {
      learnedSet.add(learned.word);
    }
    
    // words array'inde bul ve learned=true yap
    const wordIndex = words.findIndex(w => w.word && learned.word && w.word.toLowerCase() === learned.word.toLowerCase());
    if(wordIndex !== -1) {
      if(!words[wordIndex].learned) {
        words[wordIndex].learned = true;
        syncCount++;
      }
    }
  });
  
  if(syncCount > 0) {
    console.log('✅ SYNC TAMAMLANDI:', syncCount, 'kelime güncellendi');
    console.log('✅ learnedSet size:', typeof learnedSet !== 'undefined' ? learnedSet.size : 'tanımsız');
    
    // words array'ini kaydet
    try {
      localStorage.setItem('words', JSON.stringify(words));
      console.log('💾 words array kaydedildi');
    } catch(e) {
      console.warn('⚠️ words array kaydedilemedi:', e.message);
    }
  } else {
    console.log('✅ SYNC: Tüm kelimeler zaten senkron');
    console.log('✅ learnedSet size:', typeof learnedSet !== 'undefined' ? learnedSet.size : 'tanımsız');
  }
}

function saveLearnedWords(){
  try {
    const data = JSON.stringify(learnedWords);
    localStorage.setItem('learnedWords', data);
    console.log('💾 KAYIT YAPILDI - learnedWords:', learnedWords.length, 'kelime');
    console.log('💾 localStorage.learnedWords boyut:', (data.length / 1024).toFixed(2), 'KB');
    
    // Doğrulama - kaydedilen veri gerçekten orada mı?
    const verification = localStorage.getItem('learnedWords');
    if(verification) {
      const parsed = JSON.parse(verification);
      console.log('✅ DOĞRULAMA BAŞARILI:', parsed.length, 'kelime localStorage\'da');
    } else {
      console.error('❌ DOĞRULAMA HATASI: Veri kaydedildi ama okunamadı!');
    }
    
  } catch(e) {
    console.error('❌ KAYIT HATASI:', e);
    console.error('Hata detayı:', e.message);
    
    // Quota hatası kontrolü
    if (e.name === 'QuotaExceededError') {
      alert('⚠️ Depolama alanı doldu! Lütfen eski verileri temizleyin.');
    }
  }
}

function addLearnedWord(word, translation, level = 'learning'){
  console.log('➕ KELİME EKLENİYOR:', word, '(', translation, ') - Seviye:', level);
  
  const existing = learnedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if(existing){
    console.log('🔄 KELİME ZATEN VAR - GÜNCELLENİYOR:', word);
    existing.lastReviewed = new Date().toISOString();
    existing.reviewCount = (existing.reviewCount || 0) + 1;
    existing.level = level;
  } else {
    console.log('✨ YENİ KELİME EKLENİYOR:', word);
    learnedWords.push({
      word: word,
      translation: translation,
      level: level,
      addedDate: new Date().toISOString(),
      lastReviewed: new Date().toISOString(),
      reviewCount: 1
    });
  }
  
  // 🔄 SYNC 1: learnedSet'e ekle (liste istatistikleri için)
  if(typeof learnedSet !== 'undefined') {
    learnedSet.add(word);
    console.log('✅ learnedSet güncellendi, size:', learnedSet.size);
  }
  
  // 🔄 SYNC 2: Ana words array'inde de learned=true yap
  if(typeof words !== 'undefined' && Array.isArray(words)) {
    const wordIndex = words.findIndex(w => w.word && w.word.toLowerCase() === word.toLowerCase());
    if(wordIndex !== -1) {
      words[wordIndex].learned = true;
      console.log('✅ SYNC: words[' + wordIndex + '].learned = true');
      
      // words array'ini localStorage'a kaydet
      try {
        localStorage.setItem('words', JSON.stringify(words));
        console.log('💾 words array güncellendi');
      } catch(e) {
        console.warn('⚠️ words array kaydedilemedi:', e.message);
      }
    } else {
      console.log('ℹ️ Kelime words array\'inde bulunamadı:', word);
    }
  }
  
  console.log('📊 Toplam kelime sayısı:', learnedWords.length);
  saveLearnedWords();
  
  // 🔄 SYNC 3: Eğer liste açıksa hemen güncelle
  if(document.getElementById('sc-list') && document.getElementById('sc-list').style.display !== 'none') {
    showList(); // İstatistikleri güncelle
    renderWordList(); // Kelime kartlarını yeniden render et
    console.log('✅ Liste görünümü güncellendi');
  }
  
  console.log('✅ KELİME EKLEME TAMAMLANDI:', word);
}

function removeLearnedWord(word){
  learnedWords = learnedWords.filter(w => w.word.toLowerCase() !== word.toLowerCase());
  
  // 🔄 SYNC 1: learnedSet'ten çıkar
  if(typeof learnedSet !== 'undefined') {
    learnedSet.delete(word);
    console.log('✅ learnedSet güncellendi, size:', learnedSet.size);
  }
  
  // 🔄 SYNC 2: Ana words array'inde learned=false yap
  if(typeof words !== 'undefined' && Array.isArray(words)) {
    const wordIndex = words.findIndex(w => w.word && w.word.toLowerCase() === word.toLowerCase());
    if(wordIndex !== -1) {
      words[wordIndex].learned = false;
      console.log('✅ SYNC: words[' + wordIndex + '].learned = false');
      
      // words array'ini localStorage'a kaydet
      try {
        localStorage.setItem('words', JSON.stringify(words));
        console.log('💾 words array güncellendi');
      } catch(e) {
        console.warn('⚠️ words array kaydedilemedi:', e.message);
      }
    }
  }
  
  saveLearnedWords();
  renderLearnedWordsScreen();
  
  // 🔄 SYNC 3: Eğer liste açıksa hemen güncelle
  if(document.getElementById('sc-list') && document.getElementById('sc-list').style.display !== 'none') {
    showList(); // İstatistikleri güncelle
    renderWordList(); // Kelime kartlarını yeniden render et
  }
  
  showToast('🗑️ Kelime silindi');
}

function updateWordLevel(word, newLevel){
  const found = learnedWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if(found){
    found.level = newLevel;
    found.lastReviewed = new Date().toISOString();
    saveLearnedWords();
    renderLearnedWordsScreen();
    showToast('✅ Seviye güncellendi');
  }
}

function filterLearnedWords(type, event){
  currentLearnedFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if(event) event.target.classList.add('active');
  renderLearnedWordsScreen();
}

function renderLearnedWordsScreen(){
  const container = document.getElementById('learnedWordsList');
  const countEl = document.getElementById('learnedTotalCount');
  
  let filtered = learnedWords;
  if(currentLearnedFilter === 'mastered'){
    filtered = learnedWords.filter(w => w.level === 'mastered');
  } else if(currentLearnedFilter === 'learning'){
    filtered = learnedWords.filter(w => w.level === 'learning');
  }
  
  countEl.textContent = learnedWords.length;
  
  if(filtered.length === 0){
    container.innerHTML = '<div class="card"><p style="text-align:center;padding:40px;color:var(--muted)">Henüz kelime eklenmemiş</p></div>';
    return;
  }
  
  filtered.sort((a, b) => new Date(b.lastReviewed) - new Date(a.lastReviewed));
  
  container.innerHTML = filtered.map(w => `
    <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="explainWord('${w.word.replace(/'/g, "\\'")}', 'chatMessages')">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:22px;font-weight:900;color:var(--green);margin-bottom:4px">${w.word}</div>
          <div style="font-size:14px;color:var(--sub);font-style:italic">${w.translation || ''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0" onclick="event.stopPropagation()">
          ${w.level === 'learning' ? 
            `<button onclick="updateWordLevel('${w.word}', 'mastered')" style="padding:6px 12px;background:#166534;color:#4ade80;border:none;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">✓ Ustalaştım</button>` :
            `<button onclick="updateWordLevel('${w.word}', 'learning')" style="padding:6px 12px;background:#1e3a5f;color:#93c5fd;border:none;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">↩ Tekrar</button>`
          }
          <button onclick="removeLearnedWord('${w.word}')" style="padding:6px 12px;background:#7f1d1d;color:#fca5a5;border:none;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">🗑️</button>
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--muted)">
        <span>📅 ${new Date(w.addedDate).toLocaleDateString('tr-TR')}</span>
        <span>🔄 ${w.reviewCount || 1}× tekrar</span>
        <span>${w.level === 'mastered' ? '⭐ Ustalaşıldı' : '📖 Öğreniliyor'}</span>
      </div>
    </div>
  `).join('');
}

function showAllLearnedWordsModal(){
  const allWords = [...learnedWords].sort((a, b) => a.word.localeCompare(b.word));
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:20px;width:90%;max-width:450px;max-height:80vh;overflow:hidden;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,.6)">
      <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:20px;color:var(--purple);margin:0">📋 Tüm Kelimeler (${allWords.length})</h3>
        <button onclick="this.closest('.modal-overlay').remove()" 
          style="background:none;border:none;font-size:28px;color:var(--muted);cursor:pointer;padding:0;line-height:1">×</button>
      </div>
      <div style="max-height:60vh;overflow-y:auto;padding:16px">
        ${allWords.length === 0 ? 
          '<div style="text-align:center;padding:40px;color:var(--muted)">Henüz kelime eklenmemiş</div>' :
          allWords.map(w => `
            <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg2); border-radius:10px;margin-bottom:8px;border:1px solid var(--border);cursor:pointer"
              onclick="modal.remove();explainWord('${w.word.replace(/'/g, "\\'")}', 'chatMessages')">
              <div style="flex:1">
                <div style="font-size:16px;font-weight:800;color:var(--text)">${w.word}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:2px">${w.translation || ''}</div>
              </div>
              <div style="display:flex;align-items:center">
                <span style="font-size:11px;padding:4px 10px;background:${w.level === 'mastered' ? '#166534' : '#1e3a5f'}; color:${w.level === 'mastered' ? '#4ade80' : '#93c5fd'};border-radius:6px;font-weight:700">
                  ${w.level === 'mastered' ? '⭐' : '📖'}
                </span>
              </div>
            </div>
          `).join('')
        }
      </div>
      <div style="padding:16px;border-top:1px solid var(--border)">
        <button class="btn btn-blue" onclick="exportLearnedWordsToExcel()" style="width:100%">
          📥 Excel Olarak İndir
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', (e)=>{
    if(e.target === modal) modal.remove();
  });
}

function exportLearnedWordsToExcel(){
  if(learnedWords.length === 0){
    showToast('⚠️ Henüz kelime yok');
    return;
  }
  
  const data = learnedWords.map(w => ({
    'Kelime': w.word,
    'Çeviri': w.translation || '',
    'Seviye': w.level === 'mastered' ? 'Ustalaşıldı' : 'Öğreniliyor',
    'Eklenme Tarihi': new Date(w.addedDate).toLocaleDateString('tr-TR'),
    'Tekrar Sayısı': w.reviewCount || 1
  }));
  
  if(typeof XLSX !== 'undefined'){
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kelimeler");
    XLSX.writeFile(wb, `kelimelerim_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
    showToast('✅ İndirildi!', 'Excel dosyası hazırlandı');
  } else {
    showToast('⚠️ Excel kütüphanesi yüklenemedi');
  }
}

// ══════════════════════════════════════════════════════════
// AI TOKEN AYARLARI
// ══════════════════════════════════════════════════════════

