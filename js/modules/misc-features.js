/* ════════════════════════════════════════════════════════════════
   WordMode — modül: misc-features.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

window.addEventListener("DOMContentLoaded",()=>{
  // Otomatik yedekten geri yükleme (localStorage limiti için)
  autoRestoreFromFolder();
  
  // Dark mode başlat
  applyDarkMode();
  
  // URL'den kelime kontrolü (Bookmarklet için)
  const urlParams = new URLSearchParams(window.location.search);
  const wordFromURL = urlParams.get('word');
  if (wordFromURL && wordFromURL.length > 2) {
    console.log('📖 URL\'den kelime alındı:', wordFromURL);
    setTimeout(() => {
      _explainWordImpl(wordFromURL, 'chatMessages');
      showToast('📖 Web\'den Kelime', `"${wordFromURL}" açılıyor...`);
    }, 1000);
  }
  
  if(window.speechSynthesis){speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();speechSynthesis.getVoices();}
  
  // ══════════════════════════════════════════════════════════
  // SWIPE GESTURE (Parmakla kaydırma)
  // ══════════════════════════════════════════════════════════
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const SWIPE_THRESHOLD = 50; // Minimum kaydırma mesafesi (px)
  const VERTICAL_THRESHOLD = 30; // Dikey kaydırma toleransı
  
  const mainCard = document.getElementById("mainCard");
  if(mainCard){
    let isDragging = false;
    
    mainCard.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      isDragging = true;
      mainCard.style.transition = 'none';
    }, {passive: true});
    
    mainCard.addEventListener('touchmove', (e) => {
      if(!isDragging) return;
      const currentX = e.changedTouches[0].screenX;
      const currentY = e.changedTouches[0].screenY;
      const diffX = currentX - touchStartX;
      const diffY = Math.abs(currentY - touchStartY);
      
      // Yatay kaydırma, dikey değil
      if(diffY < VERTICAL_THRESHOLD && Math.abs(diffX) > 10){
        mainCard.style.transform = `translateX(${diffX * 0.3}px)`;
        mainCard.style.opacity = 1 - Math.abs(diffX) / 1000;
      }
    }, {passive: true});
    
    mainCard.addEventListener('touchend', (e) => {
      if(!isDragging) return;
      isDragging = false;
      
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      const horizontalDiff = touchEndX - touchStartX;
      const verticalDiff = Math.abs(touchEndY - touchStartY);
      
      // Animasyon ile geri getir
      mainCard.style.transition = 'all 0.3s ease';
      mainCard.style.transform = 'translateX(0)';
      mainCard.style.opacity = '1';
      
      // Dikey kaydırma değilse (scroll değil)
      if(verticalDiff < VERTICAL_THRESHOLD){
        // Sağa kaydır → Önceki kelime
        if(horizontalDiff > SWIPE_THRESHOLD){
          setTimeout(() => prevWord(), 150);
        }
        // Sola kaydır → Sonraki kelime
        else if(horizontalDiff < -SWIPE_THRESHOLD){
          setTimeout(() => navNextWord(), 150);
        }
      }
    }, {passive: true});
  }
  
  // ══════════════════════════════════════════════════════════
  
  // Otomatik ses ayarını yükle
  const savedAudio=localStorage.getItem("autoPlayAudio");
  if(savedAudio!==null) autoPlayAudio=savedAudio==="1";
  if(document.getElementById("toggleAutoAudio")){
    document.getElementById("toggleAutoAudio").checked=autoPlayAudio;
    toggleAutoAudio();
  }
  
  // AI metin boyutunu yükle
  const savedSize=localStorage.getItem("aiTextSize");
  if(savedSize){
    aiTextSize=parseInt(savedSize);
    document.documentElement.style.setProperty('--ai-text-size',aiTextSize+'px');
    if(document.getElementById("aiTextSizeSlider")){
      document.getElementById("aiTextSizeSlider").value=aiTextSize;
      document.getElementById("aiSizeValue").textContent=aiTextSize+"px";
    }
  }
  
  // GROQ API Key'i input'a yükle
  if(document.getElementById("groqApiKeyInput")){
    const savedKey=localStorage.getItem("groq_api_key");
    if(savedKey){
      document.getElementById("groqApiKeyInput").value=savedKey;
    }
  }
  
  // Highlight ayarlarını yükle
  loadHighlightSettings();
  loadTTSRateSettings();
  
  // Kelime resimleri ayarını yükle
  loadWordImagesSetting();
  loadWordClickSetting();
  loadAutoReadSetting();
  
  // Mobil için kelime seçimi listener'ı ekle
  if (enableWordClick) {
    document.addEventListener('selectionchange', handleWordSelection);
  }
  
  // Çoklu liste sistemi: Aktif listeyi otomatik yükle
  const savedActiveListId = localStorage.getItem('activeListId');
  if (savedActiveListId && multiLists && multiLists.length > 0) {
    const activeList = multiLists.find(l => l.id === savedActiveListId);
    if (activeList) {
      console.log('🔄 Aktif liste otomatik yükleniyor:', activeList.name);
      switchToList(savedActiveListId);
      return; // tryAutoRestore'u atla
    }
  }
  
  tryAutoRestore();
  
  // Yeni özellikleri initialize et
  setTimeout(() => {
    if (document.getElementById("sc-grammar")) initGrammar();
    if (document.getElementById("sc-videos")) loadVideos("beginner");
  }, 500);
  // session timer — save every 60s
  setInterval(()=>{if(allWords.length>0) saveTimingData();},60000);
  // Hatırlatma sistemi başlat
  setTimeout(initReminder, 1000);
  // Model UI güncelle
  setTimeout(updateModelUI, 300);
  // PDF kitap listesini yükle
  setTimeout(renderPDFBookList, 500);
});


// ══════════════════════════════════════════════════════════
// 🏆 STREAK & ROZETLER
// ══════════════════════════════════════════════════════════
let badgeCatFilter = 'all';

const LEVEL_EMOJIS = ['🌱','📗','📘','⭐','🏅','🥇','💎','🦁','👑','🌟'];
const LEVEL_NAMES  = ['Başlangıç','Acemi','Öğrenci','Orta','İleri','Uzman','Usta','Efsane','Şampiyon','Efsanevi'];

function openStreakScreen(){
  showScreen('sc-streak');
  renderStreakScreen();
}

function renderStreakScreen(){
  // Streak
  document.getElementById('streakBigNum').textContent = currentStreak;
  document.getElementById('streakRecord').textContent = 'En uzun: ' + longestStreak + ' gün';
  document.getElementById('streakFireEmoji').textContent = currentStreak >= 30 ? '🦁' : currentStreak >= 14 ? '💎' : currentStreak >= 7 ? '⚡' : currentStreak >= 3 ? '🔥' : '💤';

  // Haftalık takvim
  renderWeekCalendar();

  // XP & Seviye
  const lvlIdx = Math.min(userLevel-1, LEVEL_EMOJIS.length-1);
  const xpForNext = userLevel * 100;
  const xpPct = Math.round((totalXP % 100));
  document.getElementById('levelDisplay').textContent = 'Seviye ' + userLevel + ' — ' + (LEVEL_NAMES[lvlIdx]||'Efsanevi');
  document.getElementById('levelEmoji').textContent = LEVEL_EMOJIS[lvlIdx]||'👑';
  document.getElementById('xpDisplay').textContent = totalXP + ' toplam XP';
  document.getElementById('xpBar').style.width = xpPct + '%';
  document.getElementById('xpCurrent').textContent = (totalXP % 100) + ' XP';
  document.getElementById('xpNext').textContent = (100 - (totalXP%100)) + " XP'e sonraki seviye";

  // Rozetler
  renderBadgesGrid();
}

function renderWeekCalendar(){
  const el = document.getElementById('weekCalendar');
  if(!el) return;
  const today = new Date();
  const days = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  const studyDays = JSON.parse(localStorage.getItem('studyDays')||'[]');
  el.innerHTML = Array.from({length:7}, (_,i)=>{
    const d = new Date(today);
    d.setDate(today.getDate() - (6-i));
    const dateStr = d.toDateString();
    const isToday = i === 6;
    const studied = studyDays.includes(dateStr);
    const dayName = days[d.getDay()];
    return '<div style="text-align:center">' +
      '<div style="font-size:9px;color:#fb923c;margin-bottom:4px">' + dayName + '</div>' +
      '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid ' + (isToday?'#f97316':'transparent') + ';background:' + (studied?'#f97316':'rgba(255,255,255,0.1)') + '">' +
      (studied ? '🔥' : '○') +
      '</div></div>';
  }).join('');
}

function setBadgeCat(cat){
  badgeCatFilter = cat;
  document.querySelectorAll('[id^="bc-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById('bc-'+cat)?.classList.add('active');
  renderBadgesGrid();
}

function renderBadgesGrid(){
  const el = document.getElementById('badgesGrid');
  if(!el) return;
  const allBadges = Object.values(BADGES);
  const filtered = badgeCatFilter === 'all' ? allBadges : allBadges.filter(b=>(b.cat||'ozel')===badgeCatFilter);
  const earned = badges.length;
  document.getElementById('badgeCountLabel').textContent = earned + '/' + allBadges.length;

  el.innerHTML = filtered.map(b=>{
    const has = badges.includes(b.id);
    return '<div style="text-align:center;padding:12px 6px;background:' + (has?'rgba(99,102,241,.15)':'var(--bg2)') + ';border-radius:14px;border:1.5px solid ' + (has?'var(--purple)':'var(--border)') + ';opacity:' + (has?'1':'0.45') + '">' +
      '<div style="font-size:28px;margin-bottom:6px">' + b.icon + '</div>' +
      '<div style="font-size:11px;font-weight:800;color:' + (has?'var(--text)':'var(--muted)') + ';line-height:1.3;margin-bottom:4px">' + b.name + '</div>' +
      '<div style="font-size:9px;color:var(--muted);line-height:1.3">' + b.desc + '</div>' +
      (has ? '<div style="font-size:9px;color:var(--purple);font-weight:700;margin-top:4px">✅ Kazanıldı</div>' : '') +
      '</div>';
  }).join('');
}

// Özel rozet kontrolleri
function checkSpecialBadges(){
  const h = new Date().getHours();
  if(h < 7) unlockBadge('early_bird');
  if(h >= 23) unlockBadge('night_owl');

  // Kitap kurdu
  const bookOpened = localStorage.getItem('bookOpenedCount');
  if(parseInt(bookOpened||0) >= 1) unlockBadge('first_book');

  // SRS ustası — 10 kelime uzman seviye
  const expertCount = allWords.filter(w=>{ const s=spacedRepetition[w.word]; return s&&s.level>=6; }).length;
  if(expertCount >= 10) unlockBadge('srs_master');

  // Kelime rozetleri
  const learnedCount = allWords.filter(w=>learnedSet.has(w.word)).length;
  if(learnedCount>=500) unlockBadge('five_hundred');
  if(learnedCount>=1000) unlockBadge('thousand');

  // Streak rozetleri
  if(currentStreak>=14) unlockBadge('streak_14');
  if(currentStreak>=100) unlockBadge('streak_100');
}

// Çalışma günü kaydet
function recordStudyDay(){
  const today = new Date().toDateString();
  const studyDays = JSON.parse(localStorage.getItem('studyDays')||'[]');
  if(!studyDays.includes(today)){
    studyDays.push(today);
    // Son 60 günü tut
    if(studyDays.length > 60) studyDays.shift();
    localStorage.setItem('studyDays', JSON.stringify(studyDays));
  }
}

// ══════════════════════════════════════════════════════════
// 🔊 DİNLEME TESTİ
// ══════════════════════════════════════════════════════════
let ltWords = [], ltIdx = 0, ltCorrect = 0, ltWrong = 0;
let ltCurrentWord = null, ltAutoPlay = null, ltAnswered = false;
const LT_TOTAL = 10;

function startListeningTest(){
  // Cümlesi olan kelimeleri filtrele
  const pool = allWords.filter(w => w.word && w.tr && w.sentence && w.sentence.trim().length > 5);
  if(pool.length < 4){ showToast('⚠️ Yetersiz kelime','En az 4 cümleli kelime gerekli'); return; }

  ltWords = [...pool].sort(()=>Math.random()-.5).slice(0, Math.min(LT_TOTAL, pool.length));
  ltIdx = 0; ltCorrect = 0; ltWrong = 0; ltAnswered = false;

  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('listeningResult').style.display = 'none';
  document.getElementById('listeningTest').style.display = '';
  renderListeningQuestion();
}

function renderListeningQuestion(){
  if(ltIdx >= ltWords.length){ finishListeningTest(); return; }

  ltCurrentWord = ltWords[ltIdx];
  ltAnswered = false;

  // İlerleme
  const pct = Math.round(ltIdx / ltWords.length * 100);
  document.getElementById('ltBar').style.width = pct + '%';
  document.getElementById('ltScore').textContent = ltCorrect + '/' + ltWords.length;
  document.getElementById('ltQuestionNum').textContent = (ltIdx+1) + ' / ' + ltWords.length + ' soru';
  document.getElementById('ltFeedback').textContent = '';
  document.getElementById('ltPlayHint').textContent = 'Cümleyi dinle, hangi kelime?';

  // Cümledeki hedef kelimeyi gizle (*** ile)
  const hiddenSent = ltCurrentWord.sentence.replace(
    new RegExp('\\b' + ltCurrentWord.word + '\\b', 'gi'), '***'
  );
  document.getElementById('ltPlayHint').textContent = '"' + hiddenSent + '"';

  // 4 seçenek — İngilizce kelimeler
  const pool = allWords.filter(w => w.word && w.word !== ltCurrentWord.word);
  const wrong = [...pool].sort(()=>Math.random()-.5).slice(0,3);
  const options = [...wrong, ltCurrentWord].sort(()=>Math.random()-.5);

  document.getElementById('ltOptions').innerHTML = options.map(w => `
    <button onclick="checkListeningAnswer('${w.word.replace(/'/g,"\\'")}', this)"
      style="padding:14px 8px;background:var(--bg2);border:2px solid var(--border);border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;color:var(--text);font-family:'Nunito',sans-serif;transition:all .2s;text-align:center;line-height:1.3">
      ${w.word}<br><span style="font-size:11px;color:var(--muted);font-weight:400">${w.tr}</span>
    </button>`).join('');

  // Otomatik seslendir
  clearTimeout(ltAutoPlay);
  ltAutoPlay = setTimeout(()=> playListeningWord(), 500);
}

function playListeningWord(){
  if(!ltCurrentWord || !ltCurrentWord.sentence) return;
  stopSpeech();
  setTimeout(()=> speak(ltCurrentWord.sentence, 'en-US'), 100);
}

function checkListeningAnswer(selectedWord, btn){
  if(ltAnswered) return;
  ltAnswered = true;

  const isCorrect = selectedWord === ltCurrentWord.word;
  const feedback = document.getElementById('ltFeedback');

  // Tüm butonları renklendir
  document.querySelectorAll('#ltOptions button').forEach(b => {
    const bWord = b.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    if(bWord === ltCurrentWord.word){
      b.style.background = '#10b981';
      b.style.borderColor = '#10b981';
      b.style.color = '#fff';
    } else if(b === btn && !isCorrect){
      b.style.background = '#ef4444';
      b.style.borderColor = '#ef4444';
      b.style.color = '#fff';
    }
    b.disabled = true;
  });

  if(isCorrect){
    ltCorrect++;
    feedback.innerHTML = '<span style="color:var(--green)">✅ Doğru! — ' + ltCurrentWord.word + '</span>';
    // SRS güncelle
    updateSRS(ltCurrentWord.word, true);
  } else {
    ltWrong++;
    feedback.innerHTML = '<span style="color:var(--red)">❌ Yanlış! — ' + ltCurrentWord.word + ' → ' + ltCurrentWord.tr + '</span>';
    updateSRS(ltCurrentWord.word, false);
    // Cümleyi tekrar seslendir
    setTimeout(()=> speak(ltCurrentWord.sentence, 'en-US'), 600);
  }

  document.getElementById('ltScore').textContent = ltCorrect + '/' + ltWords.length;

  // Sonraki soruya geç
  ltIdx++;
  setTimeout(()=> renderListeningQuestion(), isCorrect ? 1200 : 2000);
}

function finishListeningTest(){
  clearTimeout(ltAutoPlay);
  stopSpeech();
  document.getElementById('listeningTest').style.display = 'none';
  document.getElementById('listeningResult').style.display = '';

  const total = ltCorrect + ltWrong;
  const pct = total > 0 ? Math.round(ltCorrect/total*100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : pct >= 40 ? '📚' : '💪';

  document.getElementById('ltFinalStats').innerHTML =
    emoji + ' Başarı: <b style="color:var(--purple);font-size:18px">' + pct + '%</b><br>' +
    '✅ Doğru: <b style="color:var(--green)">' + ltCorrect + '</b> &nbsp; ' +
    '❌ Yanlış: <b style="color:var(--red)">' + ltWrong + '</b><br>' +
    '🔊 Toplam: <b>' + total + '</b> soru';

  // Skoru kaydet
  if(!gameScores.listening || pct > gameScores.listening){
    gameScores.listening = pct;
    localStorage.setItem('gameScores', JSON.stringify(gameScores));
  }
  saveProgress();
}

// ══════════════════════════════════════════════════════════
// 🎯 ZAYIF NOKTA ANALİZİ
// ══════════════════════════════════════════════════════════
let weaknessFilter = 'all';

function openWeaknessScreen(){
  showScreen('sc-weakness');
  renderWeaknessScreen();
}

function setWeaknessFilter(f){
  weaknessFilter = f;
  document.querySelectorAll('[id^="wf-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById('wf-'+f)?.classList.add('active');
  renderWeaknessScreen();
}

function getWeakWords(){
  return allWords.filter(w => {
    const st = wordStatus[w.word];
    if(!st || st.attempts === 0) return false;
    const pct = st.attempts > 0 ? (st.correct||0)/st.attempts : 0;
    switch(weaknessFilter){
      case 'never': return (st.correct||0) === 0;
      case 'low': return pct < 0.5 && st.attempts >= 2;
      case 'forgotten': {
        // Öğrenilmiş ama SRS'de düşük seviye
        const srs = spacedRepetition[w.word];
        return srs && srs.level > 0 && srs.level < 3 && (st.correct||0) > 0;
      }
      default: return pct < 0.6 && st.attempts >= 1;
    }
  }).sort((a,b)=>{
    const stA = wordStatus[a.word], stB = wordStatus[b.word];
    const pA = stA.attempts ? (stA.correct||0)/stA.attempts : 0;
    const pB = stB.attempts ? (stB.correct||0)/stB.attempts : 0;
    return pA - pB; // En kötü önce
  });
}

function renderWeaknessScreen(){
  const weak = getWeakWords();
  const all = allWords.filter(w=>{ const st=wordStatus[w.word]; return st&&st.attempts>0; });
  const improved = allWords.filter(w=>{ const srs=spacedRepetition[w.word]; return srs&&srs.level>=3; }).length;
  const avgAttempts = weak.length > 0 ? Math.round(weak.reduce((s,w)=>(s+(wordStatus[w.word]?.attempts||0)),0)/weak.length) : 0;

  // Özet
  document.getElementById('wk-total').textContent = weak.length;
  document.getElementById('wk-avg-attempts').textContent = avgAttempts;
  document.getElementById('wk-improved').textContent = improved;
  document.getElementById('wk-count-label').textContent = weak.length + ' kelime';

  // Liste
  const listEl = document.getElementById('weakWordsList');
  if(weak.length === 0){
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted)"><div style="font-size:32px">🎉</div><div style="margin-top:8px">Zayıf noktanız yok!</div></div>';
    return;
  }

  listEl.innerHTML = weak.slice(0,20).map(w=>{
    const st = wordStatus[w.word];
    const pct = st.attempts > 0 ? Math.round((st.correct||0)/st.attempts*100) : 0;
    const srs = spacedRepetition[w.word];
    const srsLabels = ['🌱','📘','📗','📙','⭐','🌟','🏆'];
    const lvl = srs?.level||0;
    const barColor = pct < 30 ? 'var(--red)' : pct < 60 ? 'var(--orange)' : 'var(--green)';
    return `<div style="background:var(--bg2);border-radius:12px;padding:12px;border-left:3px solid ${barColor}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <span style="font-weight:800;font-size:15px;color:var(--text)">${w.word}</span>
          <span style="font-size:12px;color:var(--muted);margin-left:6px">${w.tr}</span>
        </div>
        <span style="font-size:18px">${srsLabels[lvl]||'🌱'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${barColor};min-width:32px">${pct}%</span>
        <span style="font-size:10px;color:var(--muted)">${st.attempts} deneme</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="_explainWordImpl('${w.word}','weaknessAIResult')" style="flex:1;padding:6px;background:var(--bg3);border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text)">🤖 Açıkla</button>
        <button onclick="addToSRSQueue('${w.word}')" style="flex:1;padding:6px;background:var(--bg3);border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text)">🔄 Tekrar</button>
      </div>
    </div>`;
  }).join('');
}

async function generateWeaknessAnalysis(){
  const weak = getWeakWords().slice(0,10);
  if(weak.length === 0){ showToast('🎉 Zayıf nokta yok!',''); return; }
  
  const resultEl = document.getElementById('weaknessAIResult');
  resultEl.innerHTML = '<div style="color:var(--muted)">🤖 Analiz yapılıyor...</div>';

  const wordList = weak.map(w=>{
    const st = wordStatus[w.word];
    const pct = st.attempts > 0 ? Math.round((st.correct||0)/st.attempts*100) : 0;
    return w.word + ' (' + pct + '% başarı, ' + st.attempts + ' deneme)';
  }).join(', ');

  const result = await callGroqAPI(
    'Sen bir İngilizce öğretmenisin. Türkçe yanıt ver.',
    'Öğrencinin zayıf olduğu kelimeler: ' + wordList + '\n\n' +
    'Bu kelimeleri analiz et ve şunları yap:\n' +
    '1. Bu kelimelerde ortak bir pattern var mı? (kelime türü, zorluk nedeni)\n' +
    '2. Her kelime için 1 cümlelik hafıza ipucu (mnemonic) öner\n' +
    '3. Bu kelimeleri öğrenmek için 3 pratik öneri\n' +
    'Kısa ve net tut, maksimum 200 kelime.'
  );

  if(result && result !== '__RATE_LIMIT__'){
    resultEl.innerHTML = result.replace(/\n/g,'<br>');
  } else {
    resultEl.innerHTML = '<div style="color:var(--muted)">Analiz alınamadı, tekrar dene.</div>';
  }
}

function addToSRSQueue(word){
  if(!spacedRepetition[word]){
    spacedRepetition[word] = { level:0, nextReview: Date.now(), correctStreak:0 };
  } else {
    spacedRepetition[word].nextReview = Date.now(); // Hemen tekrar
  }
  saveProgress();
  showToast('🔄 Tekrar listesine eklendi', word);
  updateReviewCount();
}

function practiceWeakWordsQuiz(){
  const weak = getWeakWords().slice(0,15);
  if(weak.length < 2){ showToast('⚠️ Yeterli zayıf kelime yok','En az 2 kelime gerekli'); return; }
  // Quiz ekranını bu kelimelerle başlat
  words = weak;
  idx = 0;
  showScreen('sc-quiz');
  showToast('🎯 Zayıf kelime quizi başladı!', weak.length + ' kelime');
}

function practiceWeakWordsFlip(){
  const weak = getWeakWords().slice(0,20);
  if(weak.length === 0){ showToast('🎉 Zayıf nokta yok!',''); return; }
  // SRS ekranını bu kelimelerle başlat
  srsQueue = [...weak].sort(()=>Math.random()-.5);
  srsQueueIdx = 0; srsCorrect = 0; srsWrong = 0;
  showScreen('sc-srs');
  document.getElementById('srsSummaryCard').style.display='none';
  document.getElementById('srsFinishCard').style.display='none';
  document.getElementById('srsSessionCard').style.display='';
  renderSRSCard();
  showToast('🔄 Zayıf kelime pratiği','');
}

// ══════════════════════════════════════════════════════════
// 📄 PDF / TXT YÜKLEME SİSTEMİ
// ══════════════════════════════════════════════════════════

