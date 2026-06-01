/* ════════════════════════════════════════════════════════════════
   WordMode — modül: backup.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function downloadBackup(){
  try{
    const backupData = {
      learnedWords: JSON.parse(localStorage.getItem('learnedWords') || '[]'),
      wordLists: JSON.parse(localStorage.getItem('wordLists') || '[]'),
      spacedRepetition: JSON.parse(localStorage.getItem('spacedRepetition') || '{}'),
      currentListId: localStorage.getItem('currentListId') || 'default',
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    // Dosya adı çakışmasını önlemek için saat-dakika-saniye ekliyoruz
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    a.download = `word-mode-backup-${timestamp}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    const statusEl = document.getElementById('backup-status');
    if(statusEl) statusEl.textContent = `✅ İndirildi: ${backupData.learnedWords.length} kelime`;
    
    showToast('✅ Yedek indirildi', a.download);
  }catch(e){
    console.error('Yedekleme hatası:', e);
    showToast('❌ Hata', 'Yedekleme başarısız: ' + e.message);
  }
}

function uploadBackup(event){
  const file = event.target.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try{
      const backupData = JSON.parse(e.target.result);
      
      // Versiyon kontrolü
      if(!backupData.version){
        if(!confirm('⚠️ Eski format yedek dosyası!\n\nGene de yüklemek ister misin?')){
          event.target.value = ''; // Input reset
          return;
        }
      }
      
      // Veri validasyonu
      if(!backupData.timestamp){
        showToast('❌ Hata', 'Geçersiz yedek dosyası - timestamp eksik');
        event.target.value = '';
        return;
      }
      
      const confirmMsg = `📦 Yedek Bilgileri:\n\n` +
        `📅 Tarih: ${new Date(backupData.timestamp).toLocaleString('tr-TR')}\n` +
        `📝 Kelime: ${backupData.learnedWords?.length || 0}\n` +
        `📚 Liste: ${backupData.wordLists?.length || 0}\n\n` +
        `⚠️ Mevcut veriler SİLİNECEK!\n\nDevam et?`;
      
      if(!confirm(confirmMsg)){
        event.target.value = ''; // Input reset
        return;
      }
      
      // Mevcut verileri yedekle (rollback için)
      const rollbackData = {
        learnedWords: localStorage.getItem('learnedWords'),
        wordLists: localStorage.getItem('wordLists'),
        spacedRepetition: localStorage.getItem('spacedRepetition'),
        currentListId: localStorage.getItem('currentListId')
      };
      
      try{
        // Önce temizle
        const keysToRestore = ['learnedWords', 'wordLists', 'spacedRepetition', 'currentListId'];
        keysToRestore.forEach(key => localStorage.removeItem(key));
        
        // Verileri geri yükle
        if(backupData.learnedWords){
          localStorage.setItem('learnedWords', JSON.stringify(backupData.learnedWords));
          allWords = backupData.learnedWords;
          words = backupData.learnedWords;
        }
        
        if(backupData.wordLists){
          localStorage.setItem('wordLists', JSON.stringify(backupData.wordLists));
        }
        
        if(backupData.spacedRepetition){
          localStorage.setItem('spacedRepetition', JSON.stringify(backupData.spacedRepetition));
        }
        
        if(backupData.currentListId){
          localStorage.setItem('currentListId', backupData.currentListId);
        }
        
        const statusEl = document.getElementById('backup-status');
        if(statusEl) statusEl.textContent = `✅ Geri yüklendi: ${backupData.learnedWords?.length || 0} kelime`;
        
        showToast('✅ Geri yüklendi', 'Sayfa yenileniyor...');
        
        // Sayfayı yenile
        setTimeout(() => location.reload(), 1500);
        
      }catch(restoreErr){
        // Rollback - eski verileri geri yükle
        console.error('Geri yükleme hatası, rollback yapılıyor:', restoreErr);
        Object.entries(rollbackData).forEach(([key, value]) => {
          if(value !== null) localStorage.setItem(key, value);
        });
        showToast('❌ Hata', 'Yükleme başarısız, eski veriler geri yüklendi');
      }
      
    }catch(e){
      console.error('Geri yükleme hatası:', e);
      showToast('❌ Hata', 'Dosya okunamadı: ' + e.message);
    }finally{
      // Input reset - aynı dosya tekrar seçilebilsin
      event.target.value = '';
    }
  };
  
  reader.onerror = function(){
    showToast('❌ Hata', 'Dosya okunamadı');
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

// Google Drive'a kaydet - yeni tab'da aç
function saveToGoogleDrive(){
  try{
    const backupData = {
      learnedWords: JSON.parse(localStorage.getItem('learnedWords') || '[]'),
      wordLists: JSON.parse(localStorage.getItem('wordLists') || '[]'),
      spacedRepetition: JSON.parse(localStorage.getItem('spacedRepetition') || '{}'),
      currentListId: localStorage.getItem('currentListId') || 'default',
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Dosyayı indir
    const a = document.createElement('a');
    a.href = url;
    const fileName = `word-mode-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Google Drive'ı aç
    setTimeout(() => {
      const driveUrl = 'https://drive.google.com/drive/my-drive';
      showToast('📁 Google Drive açılıyor', 'İndirilen dosyayı yükle');
      
      // Kullanım talimatı göster
      if(confirm(`✅ Dosya indirildi: ${fileName}\n\n📁 Şimdi Google Drive açılacak.\n\nYapman gerekenler:\n1. Google Drive'da "Yeni" → "Dosya yükle" tıkla\n2. İndirilen JSON dosyasını seç\n3. Yükleme tamamlansın\n\nDevam et?`)){
        window.open(driveUrl, '_blank');
      }
    }, 500);
    
  }catch(e){
    console.error('Hata:', e);
    showToast('❌ Hata', 'Kaydetme başarısız');
  }
}

// Google Drive'dan yükle - kullanıcı dosyayı indirir, buraya yükler
function loadFromGoogleDrive(){
  const instructions = `📥 Google Drive'dan Geri Yükleme:\n\n` +
    `1. Google Drive'ı aç (drive.google.com)\n` +
    `2. Yedek dosyasını bul (word-mode-backup-...json)\n` +
    `3. Dosyaya sağ tıkla → İndir\n` +
    `4. Bu sayfada "📥 Yükle" butonuna bas\n` +
    `5. İndirilen JSON dosyasını seç\n\n` +
    `Google Drive'ı şimdi açmak ister misin?`;
  
  if(confirm(instructions)){
    window.open('https://drive.google.com/drive/my-drive', '_blank');
  }
  
  showToast('💡 İpucu', 'Drive\'dan indir → sonra 📥 Yükle');
}

// ═══════════════════════════════════════
// GOOGLE DRIVE YEDEKLEME
// ═══════════════════════════════════════

// Kullanıcı kendi key'lerini ayarlarda girecek
let GDRIVE_CLIENT_ID = localStorage.getItem('gdrive_client_id') || '';
let GDRIVE_API_KEY = localStorage.getItem('gdrive_api_key') || '';
const GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
const GDRIVE_FOLDER_NAME = 'Word Mode Backups';

let gdriveToken = null;
let gdriveTokenClient = null;

// Google Drive başlat
function initGoogleDrive(){
  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: GDRIVE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });
    
    gdriveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPES,
      callback: (response) => {
        if (response.access_token) {
          gdriveToken = response.access_token;
          gapi.client.setToken({ access_token: gdriveToken });
          document.getElementById('gdrive-auth').style.display = 'none';
          document.getElementById('gdrive-actions').style.display = 'block';
          getUserEmail();
        }
      }
    });
  });
}

// Google Drive'a bağlan
function connectGoogleDrive(){
  if(!gdriveTokenClient){
    initGoogleDrive();
    setTimeout(()=> gdriveTokenClient.requestAccessToken(), 500);
  }else{
    gdriveTokenClient.requestAccessToken();
  }
}

// Kullanıcı email'ini al
async function getUserEmail(){
  try{
    const response = await gapi.client.drive.about.get({fields: 'user'});
    const email = response.result.user.emailAddress;
    document.getElementById('gdrive-email').textContent = `📧 ${email}`;
  }catch(e){
    console.error('Email alınamadı:', e);
  }
}

// Yedekle
async function backupToGoogleDrive(){
  if(!gdriveToken){
    showToast('⚠️ Önce bağlan','');
    return;
  }
  
  document.getElementById('gdrive-status').textContent = '⏳ Yedekleniyor...';
  
  try{
    // Yedek verilerini topla
    const backupData = {
      learnedWords: JSON.parse(localStorage.getItem('learnedWords') || '[]'),
      wordLists: JSON.parse(localStorage.getItem('wordLists') || '[]'),
      spacedRepetition: JSON.parse(localStorage.getItem('spacedRepetition') || '{}'),
      currentListId: localStorage.getItem('currentListId') || 'default',
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Dosya adı çakışmasını önlemek için timestamp ekle
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `word-mode-backup-${timestamp}.json`;
    
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [await getOrCreateFolder()]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + gdriveToken },
      body: form
    });
    
    if(response.ok){
      document.getElementById('gdrive-status').textContent = `✅ Yedeklendi: ${fileName}`;
      showToast('✅ Yedeklendi','Google Drive');
    }else{
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Yedekleme başarısız');
    }
  }catch(e){
    console.error('Yedekleme hatası:', e);
    document.getElementById('gdrive-status').textContent = '❌ Hata: ' + e.message;
    showToast('❌ Hata', 'Yedekleme başarısız: ' + e.message);
  }
}

// Geri yükle
async function restoreFromGoogleDrive(){
  if(!gdriveToken){
    showToast('⚠️ Önce bağlan','');
    return;
  }
  
  document.getElementById('gdrive-status').textContent = '⏳ Yedekler aranıyor...';
  
  try{
    const folderId = await getOrCreateFolder();
    
    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and name contains 'word-mode-backup' and trashed=false`,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, modifiedTime)'
    });
    
    const files = response.result.files;
    
    if(!files || files.length === 0){
      document.getElementById('gdrive-status').textContent = '⚠️ Yedek bulunamadı';
      showToast('⚠️ Yedek yok','');
      return;
    }
    
    // En son yedek
    const latestBackup = files[0];
    const confirmMsg = `📦 Son yedek: ${latestBackup.name}\n📅 ${new Date(latestBackup.modifiedTime).toLocaleString('tr-TR')}\n\n⚠️ Geri yüklemek istediğine emin misin?\n\n⚠️ Mevcut veriler silinecek!`;
    
    if(!confirm(confirmMsg)){
      document.getElementById('gdrive-status').textContent = 'İptal edildi';
      return;
    }
    
    document.getElementById('gdrive-status').textContent = '⏳ Geri yükleniyor...';
    
    // Dosyayı indir
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${latestBackup.id}?alt=media`, {
      headers: { 'Authorization': 'Bearer ' + gdriveToken }
    });
    
    if(!fileResponse.ok){
      throw new Error('Dosya indirilemedi');
    }
    
    const backupData = await fileResponse.json();
    
    // Validasyon
    if(!backupData.version || !backupData.timestamp){
      throw new Error('Geçersiz yedek dosyası formatı');
    }
    
    // Rollback için mevcut verileri yedekle
    const rollbackData = {
      learnedWords: localStorage.getItem('learnedWords'),
      wordLists: localStorage.getItem('wordLists'),
      spacedRepetition: localStorage.getItem('spacedRepetition'),
      currentListId: localStorage.getItem('currentListId')
    };
    
    try {
      // Önce temizle
      const keysToRestore = ['learnedWords', 'wordLists', 'spacedRepetition', 'currentListId'];
      keysToRestore.forEach(key => localStorage.removeItem(key));
      
      // Verileri geri yükle
      if(backupData.learnedWords){
        localStorage.setItem('learnedWords', JSON.stringify(backupData.learnedWords));
        allWords = backupData.learnedWords;
        words = backupData.learnedWords;
      }
      
      if(backupData.wordLists){
        localStorage.setItem('wordLists', JSON.stringify(backupData.wordLists));
      }
      
      if(backupData.spacedRepetition){
        localStorage.setItem('spacedRepetition', JSON.stringify(backupData.spacedRepetition));
      }
      
      if(backupData.currentListId){
        localStorage.setItem('currentListId', backupData.currentListId);
      }
      
      document.getElementById('gdrive-status').textContent = `✅ Geri yüklendi: ${backupData.learnedWords?.length || 0} kelime`;
      showToast('✅ Geri yüklendi','Sayfa yenileniyor...');
      
      // Sayfayı yenile
      setTimeout(() => location.reload(), 1500);
      
    } catch(restoreErr) {
      // Rollback - eski verileri geri yükle
      console.error('Geri yükleme hatası, rollback yapılıyor:', restoreErr);
      Object.entries(rollbackData).forEach(([key, value]) => {
        if(value !== null) localStorage.setItem(key, value);
      });
      throw new Error('Geri yükleme başarısız, eski veriler geri yüklendi');
    }
    
  }catch(e){
    console.error('Geri yükleme hatası:', e);
    document.getElementById('gdrive-status').textContent = '❌ Hata: ' + e.message;
    showToast('❌ Hata', 'Geri yükleme başarısız: ' + e.message);
  }
}

// Klasör bul veya oluştur
async function getOrCreateFolder(){
  try{
    // Klasör var mı kontrol et
    const response = await gapi.client.drive.files.list({
      q: `name='${GDRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)'
    });
    
    if(response.result.files && response.result.files.length > 0){
      return response.result.files[0].id;
    }
    
    // Klasör oluştur
    const createResponse = await gapi.client.drive.files.create({
      resource: {
        name: GDRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    
    return createResponse.result.id;
  }catch(e){
    console.error('Klasör hatası:', e);
    throw e;
  }
}

// Bağlantıyı kes
function disconnectGoogleDrive(){
  if(gdriveToken){
    google.accounts.oauth2.revoke(gdriveToken);
    gdriveToken = null;
  }
  document.getElementById('gdrive-auth').style.display = 'block';
  document.getElementById('gdrive-actions').style.display = 'none';
  document.getElementById('gdrive-status').textContent = '';
  showToast('✅ Bağlantı kesildi','');
}

// Sayfa yüklendiğinde başlat
window.addEventListener('load', async () => {
  // IndexedDB'yi başlat
  try{
    await initDB();
    await migrateToIndexedDB();
    
    // Kelimeleri yükle
    allWords = await WMStore.getWords();
    words = allWords;
    console.log(`📚 ${allWords.length} kelime IndexedDB'den yüklendi`);
  }catch(e){
    console.error('IndexedDB hatası:', e);
    // Fallback: localStorage kullan
    allWords = JSON.parse(localStorage.getItem('learnedWords') || '[]');
    words = allWords;
  }
  
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});

// ═══════════════════════════════════════

// Kelime sayacını güncelle
function updateWordCounter(){
  const counterEl = document.getElementById('wordCounter');
  if(counterEl){
    const currentIdx = idx + 1;
    const total = allWords.length;
    counterEl.textContent = `${currentIdx} / ${total} kelime`;
  }
}

function goToWord(clickedIndex, sourceList){
  // sourceList parametresi: tıklanan liste (filtrelenmiş veya tam)
  const clickedWord = sourceList[clickedIndex];
  
  if (!clickedWord) return;
  
  // Hangi ekrandan liste açıldıysa ona göre yönlendir
  const returnScreen = localStorage.getItem('listReturnScreen') || 'sc-word';
  
  if (returnScreen === 'sc-sent') {
    // Cümle moduna dön
    // smWords listesinde bu kelimenin index'ini bul
    const sentIndex = smWords.findIndex(w => w.word === clickedWord.word);
    
    if (sentIndex === -1) {
      // Kelime smWords listesinde yok, allWords'den yükle
      smWords = [...allWords];
      smIdx = allWords.findIndex(w => w.word === clickedWord.word);
    } else {
      smIdx = sentIndex;
    }
    
    if (smIdx === -1) smIdx = 0;
    
    showScreen('sc-sent');
    renderSentMode();
    localStorage.removeItem('listReturnScreen');
    return;
  }
  
  // Word Mode'a git (default)
  // words array'inde bu kelimenin index'ini bul
  const targetIndex = words.findIndex(w => w.word === clickedWord.word);
  
  if (targetIndex === -1) {
    // Kelime words listesinde yok, ekle
    words = [...allWords];
    idx = allWords.findIndex(w => w.word === clickedWord.word);
  } else {
    idx = targetIndex;
  }

  phase = "learn";
  showScreen("sc-word");
  renderLearn();
  localStorage.removeItem('listReturnScreen');
}

// ══════════════════════════════════════════════════════════
// TTS
// ══════════════════════════════════════════════════════════
let backupFolderHandle = null;
let backupFolderSelected = false;

// Klasör seç
async function selectBackupFolder() {
  try {
    if (!('showDirectoryPicker' in window)) {
      alert('❌ Tarayıcınız bu özelliği desteklemiyor. Chrome/Edge kullanın.');
      return;
    }
    
    backupFolderHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    
    // IndexedDB'ye kaydet
    await saveBackupHandleToDB(backupFolderHandle);
    
    // Klasör bilgisini sakla (sadece izin için)
    localStorage.setItem('backupFolderName', backupFolderHandle.name);
    localStorage.setItem('backupFolderSelected', 'true');
    backupFolderSelected = true;
    
    showToast('✅ Klasör Seçildi', backupFolderHandle.name);
    document.getElementById('backupFolderStatus').textContent = '✅ ' + backupFolderHandle.name;
    
    // Eğer seçim ekranı gösteriliyorsa, gizle ve uygulamayı başlat
    const selectionScreen = document.getElementById('folder-selection-screen');
    if (selectionScreen) {
      selectionScreen.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.querySelector('.bottom-nav').style.display = 'flex';
    }
    
    // sozluk.json kontrol et: klasörde yoksa GitHub/proje klasöründen indirip klasöre kaydet
    await ensureSozlukJsonInBackupFolder({ force: false, showStatus: true });

    // İlk yedek al
    await saveBackupToFolder();
    
  } catch(e) {
    console.error('Klasör seçim hatası:', e);
    if (e.name !== 'AbortError') {
      showToast('❌ Hata', 'Klasör seçilemedi');
    }
  }
}

// ── Yedek dosyası kaydet (TAM VERİ — buildBackupData kullanır) ──
async function saveBackupToFolder(silent = false) {
  if (!backupFolderHandle) {
    if (!silent) showToast('⚠️ Klasör seçilmedi', 'Önce yedekleme klasörü seçin');
    return false;
  }

  try {
    // İzin hâlâ geçerli mi kontrol et
    const perm = await backupFolderHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await backupFolderHandle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') {
        showToast('⚠️ İzin Gerekli', 'Klasör erişim izni verin');
        backupFolderHandle = null;
        localStorage.removeItem('backupFolderName');
        return false;
      }
    }

    // TAM yedek verisini buildBackupData ile hazırla (async — kitapları klasörden okur)
    const exportData = (typeof buildBackupData === 'function')
      ? await buildBackupData()
      : { version: 1, exportDate: new Date().toISOString(),
          allWords, wordStatus, learnedSet: [...learnedSet], spacedRepetition };

    // ✅ İYİLEŞTİRME: Dosya adı artık saat içeriyor (aynı gün birden fazla yedek için)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // 2026-05-21
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // 14-30-45
    const fileName = `word-mode-backup-${dateStr}_${timeStr}.json`;

    const fileHandle = await backupFolderHandle.getFileHandle(fileName, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(JSON.stringify(exportData, null, 2));
    await writable.close();

    // ✅ İYİLEŞTİRME: Yedek doğrulama
    try {
      const verifyFile = await fileHandle.getFile();
      const verifyText = await verifyFile.text();
      const verifyData = JSON.parse(verifyText);
      if (!verifyData.learnedSet && !verifyData.wordStatus) {
        throw new Error('Geçersiz yedek formatı!');
      }
      console.log('✅ Yedek doğrulandı:', fileName, `(${(verifyFile.size / 1024).toFixed(2)} KB)`);
    } catch (verifyError) {
      console.error('⚠️ Yedek doğrulama hatası:', verifyError);
      showToast('⚠️ Uyarı', 'Yedek kaydedildi ama doğrulanamadı');
    }

    localStorage.setItem('lastAutoBackup', new Date().toISOString());
    if (!silent) showToast('💾 Kaydedildi', fileName);
    updateBackupStatus();
    
    // ✅ İYİLEŞTİRME: Eski yedekleri temizle (10'dan fazla varsa)
    try {
      const files = [];
      for await (const entry of backupFolderHandle.values()) {
        if (entry.kind === 'file' && entry.name.startsWith('word-mode-backup-') && entry.name.endsWith('.json')) {
          files.push(entry);
        }
      }
      
      if (files.length > 10) {
        files.sort((a, b) => a.name.localeCompare(b.name)); // En eski önce
        const toDelete = files.length - 10;
        for (let i = 0; i < toDelete; i++) {
          await backupFolderHandle.removeEntry(files[i].name);
          console.log('🗑️ Eski yedek silindi:', files[i].name);
        }
        if (!silent) console.log(`✅ ${toDelete} eski yedek temizlendi`);
      }
    } catch (cleanupError) {
      console.error('Yedek temizleme hatası:', cleanupError);
      // Temizleme hatası yedeklemeyi iptal etmez
    }
    
    return true;

  } catch(e) {
    console.error('Yedek kaydetme hatası:', e);
    if (e.name === 'NotAllowedError') {
      showToast('⚠️ İzin Gerekli', 'Klasör erişim izni verin');
      backupFolderHandle = null;
      localStorage.removeItem('backupFolderName');
    } else if (!silent) {
      showToast('❌ Hata', 'Yedek kaydedilemedi: ' + e.message);
    }
    return false;
  }
}

// Yedek geri yükle
async function restoreFromFolder() {
  if (!backupFolderHandle) {
    showToast('⚠️ Klasör seçilmedi', 'Önce yedekleme klasörü seçin');
    return;
  }
  
  try {
    // Klasördeki word-mode-backup-*.json dosyalarını listele
    const files = [];
    for await (const entry of backupFolderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('word-mode-backup-') && entry.name.endsWith('.json')) {
        files.push(entry);
      }
    }
    
    if (files.length === 0) {
      showToast('❌ Yedek Bulunamadı', 'Klasörde yedek dosyası yok');
      return;
    }
    
    // En son tarihli yedek dosyasını bul
    files.sort((a, b) => b.name.localeCompare(a.name));
    const latestFile = files[0];
    
    // Dosyayı oku
    const file = await latestFile.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Onayla
    const learnedCount = data.learnedSet?.length || 0;
    const exportDate = data.exportDate?.slice(0,10) || '?';
    
    if (!confirm(`"${latestFile.name}" geri yüklensin mi?\n\n${learnedCount} öğrenilmiş kelime\nTarih: ${exportDate}`)) {
      return;
    }
    
    // Geri yükle
    applyBackupData(data);
    showToast('✅ Geri Yüklendi', latestFile.name);
    
  } catch(e) {
    console.error('Geri yükleme hatası:', e);
    showToast('❌ Hata', 'Geri yükleme başarısız');
  }
}


// Otomatik geri yükleme (sayfa yüklenince sessizce çalışır)
async function autoRestoreFromFolder() {
  const folderHandleName = localStorage.getItem('backupFolderName');
  if (!folderHandleName || !backupFolderHandle) {
    console.log('📁 Yedekleme klasörü yok, localStorage kullanılıyor');
    return;
  }
  try {
    // İzin kontrol
    const perm = await backupFolderHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      console.log('📁 Klasör izni yok, atlanıyor');
      return;
    }

    // word-mode-backup-*.json dosyalarını bul
    const files = [];
    for await (const entry of backupFolderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('word-mode-backup-') && entry.name.endsWith('.json')) {
        files.push(entry);
      }
    }
    if (files.length === 0) {
      console.log('📁 Klasörde yedek yok');
      return;
    }

    // En yeni dosyayı seç (tarih adı yüzünden alfabetik sıra = tarih sırası)
    files.sort((a, b) => b.name.localeCompare(a.name));
    const latest = files[0];
    const file   = await latest.getFile();
    const data   = JSON.parse(await file.text());

    // applyBackupData ile tüm veriyi yükle (merge mantığıyla)
    if (typeof applyBackupData === 'function') {
      // Sessiz mod: confirm sorma, direkt uygula
      _silentRestore = true;
      applyBackupData(data);
      _silentRestore = false;
    }

    console.log(`✅ Klasörden yüklendi: ${latest.name} | ${data.allWords?.length || 0} kelime | ${data.multiLists?.length || 0} liste | ${data.libraryBooks?.length || 0} kitap`);
    showToast('📁 Yüklendi', latest.name.replace('word-mode-backup-','').replace('.json','') + ' yedeği');

  } catch(err) {
    console.log('📁 Otomatik yükleme hatası:', err.message);
  }
}
let _silentRestore = false;
// Otomatik yedekleme (her 5 dakikada bir — arka plan)
setInterval(() => { if (backupFolderHandle) saveBackupToFolder(true); }, 5 * 60 * 1000);

// Sayfa kapatılırken son kez yedekle
window.addEventListener('beforeunload', () => {
  if (backupFolderHandle) {
    clearTimeout(_folderSaveTimer);
    saveBackupToFolder(true);
  }
});

// Durum güncelle
function updateBackupStatus() {
  const lastBackup = localStorage.getItem('lastAutoBackup');
  const statusEl = document.getElementById('lastBackupTime');
  
  if (statusEl && lastBackup) {
    const date = new Date(lastBackup);
    statusEl.textContent = date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
function exportAllData(){
  try {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      learnedWords: learnedWords,
      aiTokenSettings: aiTokenSettings,
      spacedRepetition: spacedRepetition,
      learnedSet: [...learnedSet],
      wordStatus: wordStatus,
      userProfile: userProfile,
      streak: streak,
      correctCount: correctCount,
      allWords: allWords.slice(0, 100), // İlk 100 kelimeyi dahil et (dosya boyutu için)
      
      // EKSİK VERİLER EKLENDİ:
      customPrompts: JSON.parse(localStorage.getItem('customPrompts') || '{}'),
      // 📦 AI cache'leri
      wordExplainCache: JSON.parse(localStorage.getItem('wm_word_explain_cache') || '{}'),
      wordRelationsCache: JSON.parse(localStorage.getItem('wm_word_relations_cache') || '{}'),
      aiCache: JSON.parse(localStorage.getItem('wm_ai_cache') || '{}'),
      apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
      groqApiKeys: JSON.parse(localStorage.getItem('groqApiKeys') || '[]'),
      multiLists: multiLists,
      gameScores: JSON.parse(localStorage.getItem('gameScores') || '{}'),
      toLearnWords: Object.keys(localStorage)
        .filter(k => k.startsWith('toLearn_'))
        .map(k => ({ key: k, word: JSON.parse(localStorage.getItem(k) || '{}') })),
      
      // KÜTÜPHANE VERİLERİ:
      libraryBooks: Object.keys(localStorage)
        .filter(k => k.startsWith('book_meta_'))
        .map(k => {
          const bookId = k.replace('book_meta_', '');
          const meta = JSON.parse(localStorage.getItem(k) || '{}');
          const text = localStorage.getItem('book_text_' + bookId);
          return { id: bookId, meta: meta, text: text };
        }),
      
      settings: {
        enableWordImages: localStorage.getItem('enableWordImages'),
        autoPlayAudio: localStorage.getItem('autoPlayAudio'),
        selectedPersona: selectedPersona,
        selectedGoal: selectedGoal,
        ttsRateEN: ttsRateEN,
        ttsRateTR: ttsRateTR
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `word-mode-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📤 Dışa Aktarıldı!', 'Yedek dosya indirildi');
    console.log('📤 Veri dışa aktarıldı');
    
  } catch(e){
    console.error('❌ Dışa aktarma hatası:', e);
    showToast('⚠️ Hata', 'Dışa aktarma başarısız');
  }
}

function importAllData(event){
  const file = event.target.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const importData = JSON.parse(e.target.result);
      
      // applyBackupData ile yükle (version kontrolü orada)
      applyBackupData(importData);
      
    } catch(error) {
      console.error('Import hatası:', error);
      showToast('❌ Hata', 'Dosya okunamadı: ' + error.message);
    }
  };
  
  reader.onerror = function(){
    showToast('❌ Hata', 'Dosya okunamadı');
  };
  
  reader.readAsText(file);
  
  // Input'u sıfırla
  event.target.value = '';
}

function updateLastSaveTime(){
  const lastSave = localStorage.getItem('lastSaveTime');
  const el = document.getElementById('lastSaveTime');
  if(el && lastSave){
    const date = new Date(lastSave);
    el.textContent = date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if(el) {
    el.textContent = 'Henüz kayıt yok';
  }
  
  // Debug bilgilerini güncelle
  const debugLearnedEl = document.getElementById('debugLearnedCount');
  if(debugLearnedEl) {
    debugLearnedEl.textContent = learnedWords.length;
  }
  
  const debugStorageEl = document.getElementById('debugStorage');
  if(debugStorageEl) {
    try {
      const used = JSON.stringify(localStorage).length;
      const kb = (used / 1024).toFixed(1);
      debugStorageEl.textContent = kb + ' KB';
    } catch(e) {
      debugStorageEl.textContent = 'Okunamadı';
    }
  }
  
  // Backup klasör durumunu güncelle
  const folderName = localStorage.getItem('backupFolderName');
  const folderStatusEl = document.getElementById('backupFolderStatus');
  if(folderStatusEl) {
    folderStatusEl.textContent = folderName ? '✅ ' + folderName : 'Seçilmedi';
  }
  
  // Son yedek zamanını güncelle
  updateBackupStatus();
}

function showDebugInfo(){
  try {
    const info = {
      'Öğrenilen Kelimeler': learnedWords.length,
      'AI Token Ayarları': JSON.stringify(aiTokenSettings),
      'Streak': streak,
      'Correct Count': correctCount,
      'Learned Set Size': learnedSet.size,
      'Word Status Keys': Object.keys(wordStatus).length,
      'SRS Keys': Object.keys(spacedRepetition).length,
      'localStorage Kullanımı': (JSON.stringify(localStorage).length / 1024).toFixed(1) + ' KB',
      'localStorage Item Sayısı': localStorage.length
    };
    
    let msg = '🔍 Debug Bilgisi:\n\n';
    for(let key in info){
      msg += key + ': ' + info[key] + '\n';
    }
    
    alert(msg);
    console.log('DEBUG INFO:', info);
    console.log('learnedWords array:', learnedWords);
    console.log('localStorage.learnedWords:', localStorage.getItem('learnedWords'));
    
  } catch(e) {
    alert('Debug bilgisi alınamadı: ' + e.message);
  }
}

function showLocalStorageKeys(){
  try {
    let msg = '🗂️ LocalStorage İçeriği:\n\n';
    msg += `Toplam: ${localStorage.length} anahtar\n\n`;
    
    const items = [];
    for(let i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = value ? (value.length / 1024).toFixed(2) : '0';
      items.push({key, size});
    }
    
    // Boyuta göre sırala
    items.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
    
    items.forEach(item => {
      msg += `📦 ${item.key}\n   ${item.size} KB\n\n`;
    });
    
    // Modal göster
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    
    modal.innerHTML = `
      <div style="background:var(--card);border-radius:20px;width:90%;max-width:500px;max-height:80vh;overflow:hidden;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <h3 style="font-size:18px;color:var(--text);margin:0">🗂️ localStorage Anahtarları</h3>
          <button onclick="this.closest('.modal-overlay').remove()" 
            style="background:none;border:none;font-size:28px;color:var(--muted);cursor:pointer;padding:0;line-height:1">×</button>
        </div>
        <div style="max-height:60vh;overflow-y:auto;padding:16px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:16px">
            Toplam: <strong>${localStorage.length}</strong> anahtar
          </div>
          ${items.map(item => `
            <div style="padding:10px;background:var(--bg2);border-radius:8px;margin-bottom:8px;border:1px solid var(--border)">
              <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${item.key}</div>
              <div style="font-size:11px;color:var(--muted)">${item.size} KB</div>
            </div>
          `).join('')}
        </div>
        <div style="padding:16px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="navigator.clipboard.writeText('${msg.replace(/'/g, "\\'")}');showToast('📋 Kopyalandı!')" style="flex:1">
            📋 Kopyala
          </button>
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()" style="flex:1">
            Kapat
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e)=>{
      if(e.target === modal) modal.remove();
    });
    
    console.log('localStorage Keys:', items);
    
  } catch(e) {
    alert('localStorage okunamadı: ' + e.message);
  }
}

// Otomatik kayıt sistemi - her 5 dakikada bir
let autoSaveInterval = null;

function startAutoSave(){
  // Önceki interval varsa temizle
  if(autoSaveInterval){
    clearInterval(autoSaveInterval);
  }
  
  // Her 5 dakikada bir otomatik kaydet
  autoSaveInterval = setInterval(() => {
    try {
      saveLearnedWords();
      localStorage.setItem('lastSaveTime', new Date().toISOString());
      console.log('💾 Otomatik kayıt yapıldı');
    } catch(e) {
      console.error('❌ Otomatik kayıt hatası:', e);
    }
  }, 5 * 60 * 1000); // 5 dakika
}

// ══════════════════════════════════════════════════════════
// SAYFA YÜKLENME - YENİ SİSTEMLERİ BAŞLAT
// ══════════════════════════════════════════════════════════

// İlk açılışta öğrenilmiş kelimelerin SRS'ini başlat
async function saveWordListToBackupFolder(originalFileName, wordList){
  if(!backupFolderHandle){
    // Klasör yoksa otomatik seç
    try{
      backupFolderHandle=await window.showDirectoryPicker({mode:'readwrite'});
      await saveBackupHandleToDB(backupFolderHandle);
      localStorage.setItem('backupFolderName',backupFolderHandle.name);
      showToast('✅ Klasör Seçildi',backupFolderHandle.name);
    }catch(e){
      console.log('Klasör seçilmedi, kelime listesi yedeklenmedi');
      throw e; // Hatayı yukarı fırlat
    }
  }
  
  try{
    // TXT formatında kelime listesi oluştur
    let textContent = `═══════════════════════════════════════════════════════════════\n`;
    textContent += `WORD MODE - KELİME LİSTESİ\n`;
    textContent += `Kaynak Dosya: ${originalFileName}\n`;
    textContent += `Yükleme Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
    textContent += `Toplam Kelime: ${wordList.length}\n`;
    textContent += `═══════════════════════════════════════════════════════════════\n\n`;
    
    wordList.forEach((word, index) => {
      textContent += `${index + 1}. ${word.word.toUpperCase()}\n`;
      textContent += `   📝 Türkçe: ${word.tr}\n`;
      if(word.phonetic) textContent += `   🔊 Telaffuz: /${word.phonetic}/\n`;
      if(word.sentence) {
        textContent += `   📖 Örnek Cümle: ${word.sentence}\n`;
        if(word.sentenceTr) textContent += `   🇹🇷 Çeviri: ${word.sentenceTr}\n`;
      }
      textContent += `\n`;
    });
    
    textContent += `═══════════════════════════════════════════════════════════════\n`;
    textContent += `Son Güncelleme: ${new Date().toLocaleString('tr-TR')}\n`;
    textContent += `═══════════════════════════════════════════════════════════════\n`;
    
    // Dosya adı oluştur (orijinal dosya adından)
    const baseName = originalFileName.replace(/\.(xlsx|xls)$/i, '');
    const safeFileName = baseName.replace(/[^a-z0-9_\-]/gi, '_').substring(0, 50);
    const fileName = `wordlist_${safeFileName}_${Date.now()}.txt`;
    
    // Dosyayı yedekleme klasörüne kaydet
    const fileHandle = await backupFolderHandle.getFileHandle(fileName, {create: true});
    const writable = await fileHandle.createWritable();
    await writable.write(textContent);
    await writable.close();
    
    console.log('✅ Kelime listesi yedeklendi:', fileName);
    showToast('💾 Yedeklendi', `${wordList.length} kelime yedekleme klasörüne kaydedildi`);
    
    return fileName;
  }catch(e){
    console.error('Kelime listesi yedekleme hatası:', e);
    showToast('⚠️ Yedekleme Hatası', 'Kelime listesi kaydedilemedi');
    throw e;
  }
}

async function saveBookToBackupFolder(bookId,title,text){
  if(!backupFolderHandle){
    // Klasör yoksa otomatik seç
    try{
      backupFolderHandle=await window.showDirectoryPicker({mode:'readwrite'});
      await saveBackupHandleToDB(backupFolderHandle);
      localStorage.setItem('backupFolderName',backupFolderHandle.name);
      showToast('✅ Klasör Seçildi',backupFolderHandle.name);
    }catch(e){
      console.log('Klasör seçilmedi, kitap yedeklenmedi');
      return;
    }
  }
  
  try{
    const fileName='book_'+bookId+'_'+title.replace(/[^a-z0-9]/gi,'_').substring(0,50)+'.txt';
    const fileHandle=await backupFolderHandle.getFileHandle(fileName,{create:true});
    const writable=await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
    console.log('✅ Kitap yedeklendi:',fileName);
  }catch(e){
    console.error('Kitap yedekleme hatası:',e);
  }
}

// ══════════════════════════════════════════════════════════
// PROMPT YEDEKLEME FONKSİYONU - TÜM PROMPT'LAR
// ══════════════════════════════════════════════════════════
async function savePromptToBackupFolder(promptType, system, user, model, tokenLimit){
  if(!backupFolderHandle){
    console.log('Yedek klasör seçilmedi, prompt yedeklenmedi');
    return;
  }
  
  try{
    // TÜM aktif prompt'ları topla (custom veya default)
    const allPromptData = {};
    
    // Her prompt tipi için
    const promptTypes = ['chat', 'corrector', 'conversation', 'visual', 'library', 'test', 'grammar', 'story', 'podcast', 'context'];
    
    for(const type of promptTypes) {
      const prompt = customPrompts[type] || defaultPrompts[type];
      if(prompt) {
        allPromptData[type] = {
          title: defaultPrompts[type]?.title || type,
          system: prompt.system || '',
          user: prompt.user || '',
          model: aiModelSettings[type] || getAIModel(type),
          tokenLimit: aiTokenLimits[type] || getAITokenLimit(type),
          isCustom: !!customPrompts[type],
          lastModified: type === promptType ? new Date().toISOString() : null
        };
      }
    }
    
    // Yedek yapısı
    const backupData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      lastUpdatedPrompt: promptType,
      prompts: allPromptData,
      metadata: {
        totalPrompts: Object.keys(allPromptData).length,
        customizedPrompts: Object.keys(allPromptData).filter(k => allPromptData[k].isCustom).length,
        description: 'Word Mode - Tüm AI Prompt Yedekleri'
      }
    };
    
    const fileName = 'word-mode-prompts-backup.json';
    const fileHandle = await backupFolderHandle.getFileHandle(fileName, {create: true});
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(backupData, null, 2));
    await writable.close();
    
    console.log('✅ Tüm prompt\'lar yedeklendi:', fileName);
    showToast('💾 Prompt Yedeklendi', `${Object.keys(allPromptData).length} prompt kaydedildi`);
  }catch(e){
    console.error('Prompt yedekleme hatası:', e);
  }
}


// ══════════════════════════════════════════════════════════
// PROMPT GERİ YÜKLEME FONKSİYONU
// ══════════════════════════════════════════════════════════
async function restorePromptsFromBackupFolder() {
  if (!backupFolderHandle) {
    showToast('⚠️ Klasör seçilmedi', 'Önce yedekleme klasörü seçin');
    return;
  }
  
  try {
    // word-mode-prompts-backup.json dosyasını ara
    const fileName = 'word-mode-prompts-backup.json';
    const fileHandle = await backupFolderHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const backupData = JSON.parse(text);
    
    // Onay iste
    const totalPrompts = backupData.metadata?.totalPrompts || 0;
    const customizedPrompts = backupData.metadata?.customizedPrompts || 0;
    const exportDate = backupData.exportDate?.slice(0, 19).replace('T', ' ') || '?';
    
    if (!confirm(`🔄 Prompt Geri Yükleme\n\n📊 ${totalPrompts} prompt\n✏️ ${customizedPrompts} özelleştirilmiş\n📅 ${exportDate}\n\nGeri yüklensin mi?`)) {
      return;
    }
    
    // Prompt'ları geri yükle
    let restoredCount = 0;
    
    if (backupData.prompts) {
      for (const [type, promptData] of Object.entries(backupData.prompts)) {
        if (promptData.isCustom) {
          // Custom prompt'u geri yükle
          customPrompts[type] = {
            system: promptData.system,
            user: promptData.user
          };
          restoredCount++;
        }
        
        // Model ve token ayarlarını geri yükle
        if (promptData.model) {
          aiModelSettings[type] = promptData.model;
        }
        if (promptData.tokenLimit) {
          aiTokenLimits[type] = promptData.tokenLimit;
        }
      }
    }
    
    // localStorage'a kaydet
    localStorage.setItem('customPrompts', JSON.stringify(customPrompts));
    localStorage.setItem('aiModelSettings', JSON.stringify(aiModelSettings));
    localStorage.setItem('aiTokenLimits', JSON.stringify(aiTokenLimits));
    
    showToast('✅ Geri Yüklendi', `${restoredCount} özel prompt + ayarlar`);
    console.log('✅ Prompt\'lar geri yüklendi:', {
      restoredCount,
      totalPrompts: Object.keys(backupData.prompts || {}).length,
      models: Object.keys(aiModelSettings).length,
      tokens: Object.keys(aiTokenLimits).length
    });
    
  } catch(e) {
    if (e.name === 'NotFoundError') {
      showToast('❌ Yedek Bulunamadı', 'word-mode-prompts-backup.json yok');
    } else {
      console.error('Prompt geri yükleme hatası:', e);
      showToast('❌ Hata', 'Geri yükleme başarısız: ' + e.message);
    }
  }
}

async function loadBookFromBackupFolder(bookId,title){
  if(!backupFolderHandle){return null}
  
  // İzin kontrolü
  try{
    const permission=await backupFolderHandle.queryPermission({mode:'readwrite'});
    if(permission!=='granted'){
      const newPermission=await backupFolderHandle.requestPermission({mode:'readwrite'});
      if(newPermission!=='granted'){
        console.log('Yedek klasörü izni reddedildi');
        return null;
      }
    }
  }catch(e){
    console.log('İzin kontrolü hatası:',e);
    return null;
  }
  
  try{
    const fileName='book_'+bookId+'_'+title.replace(/[^a-z0-9]/gi,'_').substring(0,50)+'.txt';
    const fileHandle=await backupFolderHandle.getFileHandle(fileName);
    const file=await fileHandle.getFile();
    const text=await file.text();
    console.log('✅ Kitap yedek klasöründen okundu:',fileName);
    return text;
  }catch(e){
    console.log('Kitap yedek klasöründe yok:',e.message);
    return null;
  }
}

// Global scope'a ekle (diğer script bloklarından erişilebilsin)
window.loadBookFromBackupFolder = loadBookFromBackupFolder;
window.saveBookToBackupFolder = saveBookToBackupFolder;

console.log('✅ Kitap TXT yedekleme yüklendi');


/* ===== extracted script block ===== */


async function restoreBackupFolderHandle(){
  try{
    backupFolderHandle=await loadBackupHandleFromDB();
    if(backupFolderHandle){
      // İzin kontrolü - handle hala geçerli mi
      const permission=await backupFolderHandle.queryPermission({mode:'readwrite'});
      if(permission==='granted'){
        console.log('✅ Yedek klasörü geri yüklendi:',backupFolderHandle.name);
        setTimeout(()=>ensureSozlukJsonInBackupFolder({force:false, showStatus:false}), 300);
        return;
      }
    }
  }catch(e){
    console.log('IndexedDB yükleme hatası:',e);
  }
  
  // İzin yoksa uyarı göster
  const folderName=localStorage.getItem('backupFolderName');
  if(folderName){
    setTimeout(()=>{
      if(!backupFolderHandle){
        showToast('📁 Yedek Klasörü','Ayarlar > Yedekleme Klasörü Seç');
      }
    },2000);
  }
}

// ══════════════════════════════════════════════════════════
// OTOMATİK GERİ YÜKLEME SİSTEMİ
// ══════════════════════════════════════════════════════════
async function autoRestoreFromBackupFolder() {
  if (!backupFolderHandle) {
    console.log('📁 Yedekleme klasörü yok, otomatik yükleme atlanıyor');
    return;
  }
  
  console.log('🔄 Otomatik geri yükleme başlıyor...');
  console.log('📁 Klasör adı:', backupFolderHandle.name);
  
  try {
    const stats = {
      jsonBackup: 0,
      wordLists: 0,
      books: 0
    };
    
    // 1. KLASÖR İÇERİĞİNİ TARA
    const files = {
      jsonBackups: [],
      wordLists: [],
      books: []
    };
    
    console.log('📂 Klasör taranıyor...');
    
    for await (const entry of backupFolderHandle.values()) {
      console.log('  📄 Bulunan dosya:', entry.name, '(kind:', entry.kind + ')');
      
      if (entry.kind === 'file') {
        if (entry.name.startsWith('word-mode-backup-') && entry.name.endsWith('.json')) {
          files.jsonBackups.push(entry);
          console.log('    ✅ JSON yedek olarak işaretlendi');
        } else if (entry.name.startsWith('wordlist_') && entry.name.endsWith('.txt')) {
          files.wordLists.push(entry);
          console.log('    ✅ Kelime listesi olarak işaretlendi');
        } else if (entry.name.startsWith('book_') && entry.name.endsWith('.txt')) {
          files.books.push(entry);
          console.log('    ✅ Kitap olarak işaretlendi');
        } else {
          console.log('    ⏭️ Atlandı (uygun format değil)');
        }
      }
    }
    
    console.log('📊 Bulunan dosyalar:', {
      json: files.jsonBackups.length,
      wordlists: files.wordLists.length,
      books: files.books.length
    });
    
    // 2. JSON YEDEK GERİ YÜKLE (ÖNCELİKLİ)
    if (files.jsonBackups.length > 0) {
      // En son tarihli JSON'u bul
      files.jsonBackups.sort((a, b) => b.name.localeCompare(a.name));
      const latestBackup = files.jsonBackups[0];
      
      try {
        const fileHandle = await backupFolderHandle.getFileHandle(latestBackup.name);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Veriyi geri yükle
        if (data.learnedWords) learnedWords = data.learnedWords;
        if (data.learnedSet) learnedSet = new Set(data.learnedSet);
        if (data.wordStatus) wordStatus = data.wordStatus;
        if (data.spacedRepetition) spacedRepetition = data.spacedRepetition;
        if (data.streak !== undefined) streak = data.streak;
        if (data.correctCount !== undefined) correctCount = data.correctCount;
        if (data.userProfile) userProfile = data.userProfile;
        
        // LocalStorage'a kaydet
        if (data.learnedWords) localStorage.setItem('learnedWords', JSON.stringify(data.learnedWords));
        if (data.learnedSet) localStorage.setItem('learnedSet', JSON.stringify([...data.learnedSet]));
        if (data.wordStatus) localStorage.setItem('wordStatus', JSON.stringify(data.wordStatus));
        if (data.spacedRepetition) localStorage.setItem('spacedRepetition', JSON.stringify(data.spacedRepetition));
        if (data.streak !== undefined) localStorage.setItem('streak', data.streak);
        if (data.correctCount !== undefined) localStorage.setItem('correctCount', data.correctCount);
        if (data.userProfile) localStorage.setItem('userProfile', JSON.stringify(data.userProfile));
        
        // API Keys
        if (data.apiKeys) localStorage.setItem('apiKeys', JSON.stringify(data.apiKeys));
        if (data.groqApiKeys) {
          localStorage.setItem('groqApiKeys', JSON.stringify(data.groqApiKeys));
          GROQ_API_KEYS = data.groqApiKeys;
        }
        
        // Custom Prompts
        if (data.customPrompts) localStorage.setItem('customPrompts', JSON.stringify(data.customPrompts));
        
        // Settings
        if (data.settings) {
          if (data.settings.selectedPersona) selectedPersona = data.settings.selectedPersona;
          if (data.settings.selectedGoal) selectedGoal = data.settings.selectedGoal;
          if (data.settings.ttsRateEN) ttsRateEN = data.settings.ttsRateEN;
          if (data.settings.ttsRateTR) ttsRateTR = data.settings.ttsRateTR;
        }
        
        // Kitapları geri yükle
        if (data.libraryBooks) {
          for (const book of data.libraryBooks) {
            localStorage.setItem('book_meta_' + book.id, JSON.stringify(book.meta));
            WMStore.set('book_meta_' + book.id, JSON.stringify(book.meta)).catch(()=>{});
            if (book.text) WMStore.setBook(book.id, book.meta?.title || '', book.text).catch(()=>{});
          }
          stats.books = data.libraryBooks.length;
        }
        
        stats.jsonBackup = 1;
        console.log('✅ JSON yedek geri yüklendi:', latestBackup.name);
      } catch (e) {
        console.error('❌ JSON yükleme hatası:', e);
      }
    }
    
    // 3. KELİME LİSTELERİNİ YÜKLE (Her zaman yükle - JSON'da olmayabilir)
    if (files.wordLists.length > 0) {
      // En son kelime listesini yükle
      files.wordLists.sort((a, b) => b.name.localeCompare(a.name));
      const latestWordList = files.wordLists[0];
      
      try {
        const fileHandle = await backupFolderHandle.getFileHandle(latestWordList.name);
        const file = await fileHandle.getFile();
        const text = await file.text();
        
        console.log('📄 Kelime listesi okunuyor:', latestWordList.name);
        
        // TXT'den kelimeleri parse et
        const parsedWords = parseWordListFromTXT(text);
        if (parsedWords.length > 0) {
          allWords = parsedWords;
          fileKey = "wm_" + allWords.slice(0, 3).map(w => w.word).join("_");
          
          // LocalStorage'a da kaydet
          localStorage.setItem('lastFileData', JSON.stringify(allWords));
          localStorage.setItem('lastUploadedFile', JSON.stringify({
            name: latestWordList.name,
            wordCount: parsedWords.length,
            uploadDate: new Date().toISOString(),
            fileKey: fileKey
          }));
          
          stats.wordLists = 1;
          console.log('✅ Kelime listesi yüklendi:', parsedWords.length, 'kelime');
          
          // Öğrenme durumunu kontrol et
          const hasProg = loadProgress();
          words = allWords.filter(w => !learnedSet.has(w.word));
          
          console.log('📊 Kelime durumu:', {
            toplam: allWords.length,
            öğrenilmiş: learnedSet.size,
            kalan: words.length
          });
        }
      } catch (e) {
        console.error('❌ Kelime listesi yükleme hatası:', e);
        console.error('Hata detayı:', e.message, e.stack);
      }
    }
    
    // 4. UI GÜNCELLE
    updateUI();
    updateStreakDisplay();
    if (typeof updateBackupStatus === 'function') updateBackupStatus();
    
    // 5. KULLANICIYA BİLDİR
    if (stats.jsonBackup > 0 || stats.wordLists > 0 || stats.books > 0) {
      let message = '🎉 Hoş geldin!\n';
      if (stats.jsonBackup > 0) message += `✅ Yedek geri yüklendi\n`;
      if (stats.wordLists > 0) message += `✅ ${allWords.length} kelime yüklendi\n`;
      if (stats.books > 0) message += `✅ ${stats.books} kitap yüklendi\n`;
      if (streak > 0) message += `🔥 Streak: ${streak} gün | ⭐ XP: ${correctCount}`;
      
      showToast('💾 Otomatik Geri Yükleme', message.trim());
      console.log('✅ Otomatik geri yükleme tamamlandı:', stats);
    } else {
      console.log('ℹ️ Geri yüklenecek veri bulunamadı');
    }
    
  } catch (e) {
    console.error('❌ Otomatik geri yükleme hatası:', e);
    // Hata olsa bile sessizce devam et, kullanıcıyı rahatsız etme
  }
}

// TXT formatından kelime listesi parse et
function parseWordListFromTXT(text) {
  const words = [];
  const lines = text.split('\n');
  
  let currentWord = null;
  
  for (let line of lines) {
    line = line.trim();
    
    // Kelime satırı (numara ile başlar)
    const wordMatch = line.match(/^(\d+)\.\s+([A-Z\s]+)$/);
    if (wordMatch) {
      // Önceki kelimeyi kaydet
      if (currentWord && currentWord.word) {
        words.push(currentWord);
      }
      
      // Yeni kelime başlat
      currentWord = {
        word: wordMatch[2].trim().toLowerCase(),
        tr: '',
        phonetic: '',
        sentence: '',
        sentenceTr: '',
        highlights: []
      };
      continue;
    }
    
    // Türkçe anlamı
    if (line.startsWith('📝 Türkçe:')) {
      if (currentWord) currentWord.tr = line.replace('📝 Türkçe:', '').trim();
      continue;
    }
    
    // Telaffuz
    if (line.startsWith('🔊 Telaffuz:')) {
      if (currentWord) currentWord.phonetic = line.replace('🔊 Telaffuz:', '').replace(/\//g, '').trim();
      continue;
    }
    
    // Örnek cümle
    if (line.startsWith('📖 Örnek Cümle:')) {
      if (currentWord) currentWord.sentence = line.replace('📖 Örnek Cümle:', '').trim();
      continue;
    }
    
    // Cümle çevirisi
    if (line.startsWith('🇹🇷 Çeviri:')) {
      if (currentWord) currentWord.sentenceTr = line.replace('🇹🇷 Çeviri:', '').trim();
      continue;
    }
  }
  
  // Son kelimeyi ekle
  if (currentWord && currentWord.word) {
    words.push(currentWord);
  }
  
  // Highlights ekle
  words.forEach(w => {
    if (!w.highlights || w.highlights.length === 0) {
      w.highlights = [w.word];
    }
    if (!w.en) w.en = w.word; // Quiz için
  });
  
  return words;
}

// UI güncelleme fonksiyonları
function updateUI() {
  // XP ve seviye göster
  if (document.getElementById('xpValue')) {
    document.getElementById('xpValue').textContent = correctCount || 0;
  }
  
  // Öğrenilmiş kelime sayısı
  if (document.getElementById('learnedCount')) {
    document.getElementById('learnedCount').textContent = learnedWords ? learnedWords.length : 0;
  }
  
  // Profil bilgileri
  if (userProfile && document.getElementById('profileName')) {
    document.getElementById('profileName').textContent = userProfile.name || 'Kullanıcı';
  }
}

function updateStreakDisplay() {
  const streakEl = document.getElementById('streakValue');
  if (streakEl) {
    streakEl.textContent = streak || 0;
  }
  
  // Streak badge güncelle
  const streakBadge = document.querySelector('.streak-badge');
  if (streakBadge) {
    streakBadge.textContent = '🔥 ' + (streak || 0);
  }
}




/* ===== extracted script block ===== */


// IndexedDB ile klasör handle sakla
const BACKUP_DB_NAME='WordModeBackup';
const BACKUP_STORE_NAME='folderHandle';

async function saveBackupHandleToDB(handle){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(BACKUP_DB_NAME,1);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(BACKUP_STORE_NAME)){
        db.createObjectStore(BACKUP_STORE_NAME);
      }
    };
    req.onsuccess=e=>{
      const db=e.target.result;
      const tx=db.transaction(BACKUP_STORE_NAME,'readwrite');
      const store=tx.objectStore(BACKUP_STORE_NAME);
      store.put(handle,'handle');
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    };
    req.onerror=()=>reject(req.error);
  });
}

async function loadBackupHandleFromDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(BACKUP_DB_NAME,1);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(BACKUP_STORE_NAME)){
        db.createObjectStore(BACKUP_STORE_NAME);
      }
    };
    req.onsuccess=e=>{
      const db=e.target.result;
      const tx=db.transaction(BACKUP_STORE_NAME,'readonly');
      const store=tx.objectStore(BACKUP_STORE_NAME);
      const getReq=store.get('handle');
      getReq.onsuccess=()=>resolve(getReq.result);
      getReq.onerror=()=>reject(getReq.error);
    };
    req.onerror=()=>reject(req.error);
  });
}

console.log('✅ IndexedDB backup system loaded');


/* ===== extracted script block ===== */


function showWordModal(word){
  const w=allWords.find(x=>x.word.toLowerCase()===word.toLowerCase());
  if(!w){showToast('❌','Kelime bulunamadı');return;}
  const html=`
<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="this.remove()">
  <div style="background:var(--card);border-radius:16px;padding:20px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto" onclick="event.stopPropagation()">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 style="margin:0;font-size:24px;color:var(--text)">${w.word}</h2>
      <button onclick="speakWord('${w.word.replace(/'/g,"\\'")}')" style="padding:8px 12px;background:var(--blue);color:#fff;border:none;border-radius:8px;font-size:20px;cursor:pointer;line-height:1">🔊</button>
    </div>
    <div style="font-size:14px;color:var(--sub);margin-bottom:8px">🇹🇷 ${w.tr||''}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">/${w.phonetic||''}/</div>
    <div style="font-size:14px;color:var(--text);line-height:1.6;margin-bottom:8px">${w.sentence||''}</div>
    ${w.sentenceTr?`<div style="font-size:13px;color:var(--sub);line-height:1.6;margin-bottom:16px">🇹🇷 ${w.sentenceTr}</div>`:''}
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:12px;background:var(--bg3);color:var(--text);border:none;border-radius:10px;font-weight:700;cursor:pointer">Kapat</button>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

// ══════════════════════════════════════════════════════════
// KAMERA OCR FONKSİYONLARI
// ══════════════════════════════════════════════════════════
