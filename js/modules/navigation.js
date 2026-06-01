/* ════════════════════════════════════════════════════════════════
   WordMode — modül: navigation.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function showScreen(id){

  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  const el=document.getElementById(id);
  if(el) {
    el.classList.add("active");
    el.style.display = "block";
  }
  
  // Kelime ekranına dönüldüğünde sayacı güncelle
  if(id === 'sc-word'){
    updateWordCounter();
  }
  
  // Reader kontrolleri - sadece reader ekranında göster
  const readerControls = document.getElementById('readerControls');
  if(readerControls) {
    readerControls.style.display = (id === 'sc-reader') ? 'flex' : 'none';
  }
  
  // Yeni ekranlar için init
  if(id==='sc-lists') showToLearnList();
  if(id==='sc-podcast'){
    initPodcastScreen();
    const ml = document.getElementById('podcastModelLabel');
    if(ml) ml.textContent = (GROQ_MODEL||'GROQ API').replace('llama-','Llama ').replace('versatile','70B').replace('instant','8B');
  }
  if(id==='sc-quiz'){ document.getElementById('quizSetupCard').style.display=''; document.getElementById('quizContainer').style.display='none'; }
  if(id==='sc-broad-dictionary' && typeof loadBroadDictionaryPage==='function' && !broadDictionaryRows.length) loadBroadDictionaryPage(false);
  if(id==='sc-offline') initOfflineScreen();
  if(id==='sc-rooms') initRoomsScreen();
  if(id==='sc-accent'){selectAccent(selectedAccent);renderAccentExercises();
    const wordEl=document.getElementById('accentCurrentWord');
    if(wordEl&&words[idx]) wordEl.textContent=words[idx].word;
    const pbRow=document.getElementById('accentPlaybackRow');
    if(pbRow) pbRow.style.display='none';
  }
  if(id==='sc-lists') initMultiLists();
  if(id==='sc-cloud') initCloudScreen();
  if(id==='sc-visual') openWordVisual();
function initDailyDashboard() { /* Bugün ekranı init */ }
  if(id==='sc-daily') initDailyDashboard();
  if(id==='sc-analytics') initAnalytics();
  if(id==='sc-library'){ renderLibraryBooks(); initPDFBooks(); }
  if(id==='sc-conversation') initScenarios();
  if(id==='sc-podcast'){
    initPodcastScreen();
    const ml = document.getElementById('podcastModelLabel');
    if(ml) ml.textContent = (GROQ_MODEL||'GROQ API').replace('llama-','Llama ').replace('versatile','70B').replace('instant','8B');
    
    // Ayarlardan model yükle
    const savedModel = aiModelSettings.podcast || 'groq';
    const podcastModelSelect = document.getElementById('podcastAIModel');
    if(podcastModelSelect) {
      podcastModelSelect.value = savedModel;
    }
  }
  if(id==='sc-quiz'){ 
    document.getElementById('quizSetupCard').style.display=''; 
    document.getElementById('quizContainer').style.display='none'; 
    
    // Ayarlardan model yükle
    const savedModel = aiModelSettings.quiz || 'groq';
    const quizModelSelect = document.getElementById('quizAIModel');
    if(quizModelSelect) {
      quizModelSelect.value = savedModel;
    }
  }
  if(id==='sc-weakness') renderWeaknessScreen();
  if(id==='sc-streak') renderStreakScreen();
  if(id==='sc-my-dictionary') loadMyDictionaryPage(false);
}

async function openCameraOCR(){
  showScreen('sc-camera-ocr');
  const video=document.getElementById('cameraPreview');
  const img=document.getElementById('capturedImage');
  const result=document.getElementById('ocrResult');
  video.style.display='block';
  img.style.display='none';
  result.style.display='none';
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode,width:{ideal:1920},height:{ideal:1080}}});
    video.srcObject=cameraStream;
  }catch(e){
    alert('Kamera izni reddedildi');
    showScreen('sc-library');
  }
}
function closeCameraOCR(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  showScreen('sc-library');
}
async function switchCamera(){
  facingMode=facingMode==='user'?'environment':'user';
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  openCameraOCR();
}
async function capturePhoto(){
  const video=document.getElementById('cameraPreview');
  const canvas=document.getElementById('captureCanvas');
  const ctx=canvas.getContext('2d');
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  ctx.drawImage(video,0,0);
  capturedImageData=canvas.toDataURL('image/jpeg',0.8);
  document.getElementById('capturedImage').src=capturedImageData;
  document.getElementById('capturedImage').style.display='block';
  video.style.display='none';
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  await performOCR(capturedImageData);
}
async function performOCR(imageData){
  const result=document.getElementById('ocrResult');
  const textarea=document.getElementById('ocrText');
  result.style.display='block';
  textarea.value='🔄 Hazırlanıyor...';
  
  try{
    // Ayarları al
    const lang = document.getElementById('ocrLanguage')?.value || 'eng';
    const quality = document.getElementById('ocrQuality')?.value || 'normal';
    
    // Kalite ayarlarını belirle
    let tesseractConfig = {
      logger: m => {
        if(m.status === 'recognizing text'){
          textarea.value = '🔄 ' + Math.round(m.progress * 100) + '%';
        }
      }
    };
    
    // Kaliteye göre PSM (Page Segmentation Mode) ayarla
    if(quality === 'best'){
      tesseractConfig.tessedit_pageseg_mode = Tesseract.PSM.AUTO; // En iyi sonuç
      tesseractConfig.tessedit_char_whitelist = ''; // Tüm karakterler
    }else if(quality === 'fast'){
      tesseractConfig.tessedit_pageseg_mode = Tesseract.PSM.SINGLE_BLOCK; // Hızlı
    }
    
    textarea.value = `🔄 Tanınıyor... (${lang.toUpperCase()}, ${quality})`;
    
    const {data:{text}} = await Tesseract.recognize(imageData, lang, tesseractConfig);
    
    textarea.value = text.trim() ? text : 'Metin bulunamadı';
    
    if(text.trim()){
      showToast('✅ Tanındı', text.length + ' karakter');
    }
  }catch(e){
    textarea.value = 'Hata: ' + e.message;
    showToast('❌ OCR Hatası', e.message);
  }
}

// Galeriden fotoğraf yükle
function loadFromGallery(event){
  const file = event.target.files[0];
  if(!file) return;
  
  if(!file.type.startsWith('image/')){
    showToast('❌ Hata', 'Sadece resim dosyası seçin');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    const imageData = e.target.result;
    
    // Kamerayı kapat
    const video = document.getElementById('cameraPreview');
    if(cameraStream){
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    video.style.display = 'none';
    
    // Resmi göster
    capturedImageData = imageData;
    const img = document.getElementById('capturedImage');
    img.src = imageData;
    img.style.display = 'block';
    
    // OCR başlat
    await performOCR(imageData);
    
    showToast('📁 Yüklendi', 'OCR başlatılıyor...');
  };
  
  reader.readAsDataURL(file);
}
function resetOCR(){
  document.getElementById('ocrResult').style.display='none';
  openCameraOCR();
}
async function sendOCRToAI(btn){
  const text=document.getElementById('ocrText').value;
  if(!text||text.includes('Hata')||text.includes('🔄'))return showToast('⚠️ Önce OCR','');
  if(!btn)btn=event?.target;
  if(!btn)return;
  btn.disabled=true;
  btn.textContent='🤖 Çalışıyor...';
  try{
    const aiPrompt = `Metindeki EN ÖNEMLİ 50 İngilizce kelimeyi çıkar (tekrar edenlere öncelik ver).
Her kelimenin kaç kez geçtiğini say, en çok tekrar edenler önce gelsin.

Metin:
${text}

Sadece JSON döndür (maksimum 50 kelime):
[{"word":"","tr":"","sentence":"","pronunciation":"","frequency":1}]`;

    // OCR için yüksek token limiti kullan
    const r = await callGroqAPI('Sen öğretmensin.', aiPrompt, 4000);
    let responseText = (r.content||r).replace(/```json|```/g,'').trim();
    
    console.log('AI YANIT (ham):',responseText);
    
    // JSON array'i bul - [ ile başlayan ilk kısım
    const jsonStart = responseText.indexOf('[');
    const jsonEnd = responseText.lastIndexOf(']');
    
    console.log('JSON pozisyonlar:',jsonStart,jsonEnd);
    
    if(jsonStart===-1||jsonEnd===-1){
      console.error('JSON bulunamadı! Yanıt:',responseText);
      throw new Error('JSON bulunamadı. AI farklı format döndürdü.');
    }
    
    responseText = responseText.substring(jsonStart, jsonEnd+1);
    console.log('Temizlenmiş JSON:',responseText);
    
    const w=JSON.parse(responseText);
    if(!Array.isArray(w)||!w.length)throw new Error('Boş liste');
    
    // Listeyi HTML'de göster - frequency badge ekle
    window.aiWords = w;
    const listDiv = document.getElementById('aiWordList');
    const contentDiv = document.getElementById('aiWordListContent');
    const html = w.map((item,i)=>{
      const freq = item.frequency || 1;
      const freqBadge = freq > 1 ? `<span style="background:var(--orange);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px">${freq}x</span>` : '';
      return `<div style="padding:6px;background:var(--bg2);border-radius:6px;margin-bottom:4px"><b>${i+1}. ${item.word}</b>${freqBadge} - ${item.tr}<br><span style="font-size:11px;color:var(--muted)">${item.sentence}</span></div>`;
    }).join('');
    contentDiv.innerHTML = html;
    listDiv.style.display = 'block';
    
    const totalUsage = w.reduce((sum, item) => sum + (item.frequency || 1), 0);
    showToast('✅ '+w.length+' benzersiz kelime', totalUsage+' toplam kullanım');
  }catch(e){
    showToast('❌ Hata: '+e.message,'');
    console.error('sendOCRToAI error:',e);
  }finally{
    btn.disabled=false;
    btn.textContent='🤖 AI Liste';
  }
}
async function confirmAddWords(){
  if(!window.aiWords)return;
  let added=0;
  
  for(const i of window.aiWords){
    if(allWords.find(x=>x.word.toLowerCase()===i.word.toLowerCase()))continue;
    
    const newWord = {
      word: i.word,
      translation: i.tr || i.word,
      phonetic: i.pronunciation || '',
      sentence: i.sentence || 'Example with ' + i.word,
      sentenceTr: '',
      highlights: '',
      level: 'intermediate',
      topic: '🤖 AI OCR',
      img: '📄',
      addedAt: Date.now()
    };
    
    // IndexedDB'ye kaydet
    await saveWordToDB(newWord);
    allWords.push(newWord);
    added++;
  }
  
  if(added>0){
    words = allWords;
    showToast('✅ '+added+' eklendi','IndexedDB');
    document.getElementById('aiWordList').style.display='none';
    updateWordCounter();
    setTimeout(()=>closeCameraOCR(),1500);
  }else{
    showToast('ℹ️ Yeni kelime yok','');
  }
}
function cancelAddWords(){
  document.getElementById('aiWordList').style.display='none';
  window.aiWords=null;
}

async function addOCRWordsToLibrary(){
  const text=document.getElementById('ocrText').value;
  if(!text||text.includes('Hata'))return;
  const words=text.match(/\b[a-zA-Z]{3,}\b/g);
  if(!words||!words.length)return showToast('⚠️ Kelime yok');
  const unique=[...new Set(words.map(w=>w.toLowerCase()))];
  const newWords=unique.filter(w=>!allWords.find(x=>x.word.toLowerCase()===w));
  if(!newWords.length)return showToast('✅ Zaten var');
  if(!confirm('📚 '+newWords.length+' kelime!\n\n'+newWords.slice(0,10).join(', ')+'\n\nEkle?'))return;
  showToast('🔄 Ekleniyor...');
  let added=0;
  let fromCacheCount=0, fromAICount=0;
  for(let i=0;i<Math.min(newWords.length,20);i++){
    try{
      const word=newWords[i];
      // 📦 Cache kontrolü
      let data;
      const cached = _aiCache.get('ocr', word);
      if (cached && cached.data) {
        data = cached.data;
        fromCacheCount++;
        console.log("📦 OCR cache'den:", word);
      } else {
        const r=await callAI('Sen öğretmensin.','Word: "'+word+'"\nJSON:\n{"tr":"","sentence":"","pronunciation":""}','library');
        data=JSON.parse((r.content||r).replace(/```json|```/g,'').trim());
        _aiCache.set('ocr', word, data);
        fromAICount++;
      }
      allWords.push({word,tr:data.tr||word,sentence:data.sentence||'Example',pronunciation:data.pronunciation||'',level:'intermediate',topic:'📸 OCR',img:'📄',addedAt:Date.now()});
      added++;
    }catch(e){}
  }
  if(added>0){
    saveLibrary();
    const summary = (fromCacheCount && fromAICount)
      ? `📦 ${fromCacheCount} önbellek + 🤖 ${fromAICount} AI`
      : (fromCacheCount ? `📦 ${fromCacheCount} önbellek` : `🤖 ${fromAICount} AI`);
    showToast('✅ '+added+' eklendi', summary);
    setTimeout(()=>closeCameraOCR(),1500);
  }
}
function animCard(type){
  const el=document.getElementById("mainCard");
  if(!el) return;
  el.classList.remove("do-shake","do-bounce");void el.offsetWidth;
  el.classList.add(type==="shake"?"do-shake":"do-bounce");
  setTimeout(()=>el.classList.remove("do-shake","do-bounce"),500);
}

// ══════════════════════════════════════════════════════════
// FILE UPLOAD & PARSING
// ══════════════════════════════════════════════════════════
function prevWord(){if(idx>0){idx--;phase="learn";renderLearn();updateWordCounter();}}
function navNextWord(){if(idx+1<words.length){idx++;phase="learn";renderLearn();}}
function nextWord(){
  idx++;
  while(idx<words.length&&learnedSet.has(words[idx]?.word))idx++;
  if(idx>=words.length)showDone();
  else{phase="learn";renderLearn();}
  updateWordCounter();
}

// Klavye okları: yalnızca kelime ekranı açıkken ve bir input/textarea odakta değilken çalışır
document.addEventListener('keydown', function(e){
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const sc = document.getElementById('sc-word');
  if (!sc || !sc.classList.contains('active')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  // Modal/overlay açıksa devre dışı
  if (document.querySelector('.modal-overlay')) return;
  if (e.key === 'ArrowLeft')  { e.preventDefault(); prevWord(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); navNextWord(); }
});
function showList(){
  // Hangi ekrandan geldiğini kaydet
  const currentScreen = document.querySelector('.screen.active')?.id || 'sc-word';
  localStorage.setItem('listReturnScreen', currentScreen);
  
  showScreen("sc-list");
  const total=allWords.length,learned=learnedSet.size;
  const failed=Object.values(wordStatus).filter(s=>s.attempts>0&&s.correct===0).length;
  const unseen=total-Object.keys(wordStatus).length;
  document.getElementById("listStats").innerHTML=`
    <div class="list-stat"><div class="sn" style="color:var(--green)">${learned}</div><div class="sl">✅ Öğrenildi</div></div>
    <div class="list-stat"><div class="sn" style="color:var(--orange)">${failed}</div><div class="sl">❌ Yanlış</div></div>
    <div class="list-stat"><div class="sn" style="color:var(--muted)">${unseen}</div><div class="sl">⬜ Görülmedi</div></div>`;
  renderWordList();
}

// Virtual Scrolling Değişkenleri
const ITEM_HEIGHT = 112; // v15: seviye/gramer rozetleri için daha yüksek liste kartı
const BUFFER_SIZE = 5; // Ekstra yüklenecek item sayısı
let virtualScrollData = {
  scrollTop: 0,
  containerHeight: 600,
  visibleStart: 0,
  visibleEnd: 50
};

function renderWordList(){
  const listEl=document.getElementById("wordListEl");
  if(!listEl) return;
  
  // Filtrelenmiş kelimeleri al
  let filteredWords = getFilteredWords();
  
  // Arama query varsa ek filtre uygula
  if (currentSearchQuery) {
    filteredWords = filteredWords.filter(w => {
      const sentence = w.sentence || '';
      return sentence.toLowerCase().includes(currentSearchQuery);
    });
  }
  
  // Virtual scroll container setup
  const totalHeight = filteredWords.length * ITEM_HEIGHT;
  listEl.style.position = "relative";
  listEl.style.height = `${Math.min(totalHeight, 600)}px`;
  listEl.style.overflowY = "auto";
  
  // Virtual content wrapper
  let contentWrapper = listEl.querySelector('.virtual-content');
  if(!contentWrapper){
    contentWrapper = document.createElement('div');
    contentWrapper.className = 'virtual-content';
    contentWrapper.style.position = 'relative';
    contentWrapper.style.height = `${totalHeight}px`;
    listEl.innerHTML = '';
    listEl.appendChild(contentWrapper);
    
    // Scroll event
    listEl.addEventListener('scroll', ()=>{
      virtualScrollData.scrollTop = listEl.scrollTop;
      updateVisibleItems();
    });
  }else{
    // Wrapper yüksekliğini güncelle
    contentWrapper.style.height = `${totalHeight}px`;
  }
  
  // Filtrelenmiş kelimeleri kaydet (updateVisibleItems için)
  virtualScrollData.filteredWords = filteredWords;
  
  updateVisibleItems();
}

function updateVisibleItems(){
  try{wmEnsureSentenceMetaCss();}catch(e){}
  const listEl = document.getElementById("wordListEl");
  const contentWrapper = listEl?.querySelector('.virtual-content');
  if(!contentWrapper) return;
  
  // Filtrelenmiş kelime listesini kullan
  const wordList = virtualScrollData.filteredWords || allWords;
  
  // Hangi itemler görünecek hesapla
  const scrollTop = virtualScrollData.scrollTop;
  const containerHeight = listEl.clientHeight;
  
  const start = Math.floor(scrollTop / ITEM_HEIGHT);
  const end = Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE;
  
  const visibleStart = Math.max(0, start - BUFFER_SIZE);
  const visibleEnd = Math.min(wordList.length, end);
  
  // Aynı range'deyse tekrar render etme
  if(visibleStart === virtualScrollData.visibleStart && visibleEnd === virtualScrollData.visibleEnd){
    return;
  }
  
  virtualScrollData.visibleStart = visibleStart;
  virtualScrollData.visibleEnd = visibleEnd;
  
  // Sadece görünen itemleri render et
  const fragment = document.createDocumentFragment();
  
  for(let i = visibleStart; i < visibleEnd; i++){
    const w = wordList[i];
    if(!w || !w.word) continue;
    
    const st = wordStatus[w.word];
    const isL = learnedSet.has(w.word);
    const isF = st && st.attempts > 0 && st.correct === 0;
    const cls = isL ? "learned" : isF ? "failed" : "unseen";
    const ico = isL ? "✅" : isF ? "❌" : "⬜";
    
    // SRS seviyesini öğrenildi rozetine ekle
    let mb;
    if (isL) {
      const srsData = spacedRepetition[w.word];
      const srsLevel = srsData ? srsData.level : 0;
      const srsLabels = ['🌱 Başlangıç','📗 Orta','📙 İyi','⭐ Güçlü','🌟 Çok Güçlü','🏆 Uzman'];
      const srsLabel = srsLabels[srsLevel] || '🏆 Uzman';
      mb = `<span class="badge bl">${srsLabel}</span>`;
    } else if (isF) {
      mb = `<span class="badge bf">${st.attempts} deneme</span>`;
    } else {
      mb = `<span class="badge bu">Görülmedi</span>`;
    }
    
    const pb = st && st.pronScore != null ? `<span class="badge bp">🎤${st.pronScore}</span>` : "";
    const rowBadge = w.rowNum ? `<span style="opacity:0.5;font-size:11px;margin-left:4px">#${w.rowNum}</span>` : "";
    
    // ✅ GÖREV #6: Pronunciation ekle
    const pronHTML = w.pronunciation ? `<div style="font-size:11px;color:var(--purple);margin-top:2px">🔊 /${w.pronunciation}/</div>` : "";
    
    // Cümle formatı: İngilizce (bold) üstte, Türkçe altta
    const sentenceHTML = w.sentence ? `<div style="font-size:14px;font-weight:700;color:var(--text);margin-top:4px;line-height:1.4">${w.sentence.length > 80 ? w.sentence.substring(0, 80) + '...' : w.sentence}</div>` : "";
    const sentenceTrHTML = w.sentenceTr ? `<div style="font-size:13px;color:var(--muted);margin-top:2px;line-height:1.4">${w.sentenceTr.length > 80 ? w.sentenceTr.substring(0, 80) + '...' : w.sentenceTr}</div>` : "";
    const wmDirectListMetaHTML = wmSentenceMetaBlock(w, "list");
    
    const itemDiv = document.createElement("div");
    itemDiv.className = `wi ${cls}`;
    itemDiv.style.position = "absolute";
    itemDiv.style.top = `${i * ITEM_HEIGHT}px`;
    itemDiv.style.width = "100%";
    itemDiv.style.height = `${ITEM_HEIGHT}px`;
    itemDiv.innerHTML = `
      <div class="wi-ico">${ico}</div>
      <div class="wi-body" onclick="goToWord(${i}, virtualScrollData.filteredWords || allWords)" style="flex:1;cursor:pointer">
        <div class="wi-word">${w.word}${rowBadge}</div>
        ${pronHTML}
        ${sentenceHTML}
        ${sentenceTrHTML}
        ${wmDirectListMetaHTML}
      </div>
      <div class="wi-badges">${mb}${pb}</div>
      <button onclick="deleteWord('${w.word.replace(/'/g,"\\'")}', event)" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:18px;cursor:pointer;margin-left:8px">🗑️</button>`;
    fragment.appendChild(itemDiv);
  }
  
  contentWrapper.innerHTML = "";
  contentWrapper.appendChild(fragment);
}
// Kelime sil
function deleteWord(word, event){
  if(event) event.stopPropagation(); // Kelimeye tıklama olayını engelle
  
  if(!confirm(`"${word}" kelimesini silmek istediğine emin misin?`)) return;
  
  const currentListId = localStorage.getItem('currentListId') || 'default';
  
  if(currentListId === 'default'){
    // Ana listeden sil
    allWords = allWords.filter(w => w.word !== word);
    localStorage.setItem('learnedWords', JSON.stringify(allWords));
  }else{
    // Özel listeden sil
    const lists = JSON.parse(localStorage.getItem('wordLists') || '[]');
    const list = lists.find(l => l.id === currentListId);
    if(list){
      list.words = list.words.filter(w => w.word !== word);
      allWords = list.words;
      localStorage.setItem('wordLists', JSON.stringify(lists));
    }
  }
  
  // SRS ve wordStatus'tan da sil
  delete spacedRepetition[word];
  delete wordStatus[word];
  learnedSet.delete(word);
  
  // words array'ini de güncelle
  words = allWords;
  
  // localStorage'ı güncelle
  if(currentListId === 'default'){
    const fileKey = localStorage.getItem('currentFileKey') || 'default';
    localStorage.setItem(fileKey, JSON.stringify({
      learnedWords: [...learnedSet],
      wordStatus,
      score,
      streak,
      correctCount,
      idx
    }));
  }
  
  showToast('🗑️ Silindi', word);
  
  // Liste istatistiklerini güncelle
  showList();
}

// ═══════════════════════════════════════
// MANUEL YEDEKLEME (JSON İndirme/Yükleme)
// ═══════════════════════════════════════

