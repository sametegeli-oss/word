/* ════════════════════════════════════════════════════════════════
   WordMode — modül: screens-init.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function toggleAutoAudio(){
  autoPlayAudio=document.getElementById("toggleAutoAudio").checked;
  const slider=document.getElementById("audioToggleSlider");
  const knob=document.getElementById("audioToggleKnob");
  if(autoPlayAudio){
    slider.style.background="var(--green)";
    knob.style.transform="translateX(24px)";
  }else{
    slider.style.background="var(--bg3)";
    knob.style.transform="translateX(0)";
  }
  localStorage.setItem("autoPlayAudio",autoPlayAudio?"1":"0");
}

// 13. PWA Service Worker
if(false && 'OLD_SW' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/kelime_oyunu/sw.js')
      .then(reg=>{ console.log('✅ Service Worker güncellendi', reg.scope); })
      .catch(err=>{ console.log('❌ SW hatası:', err); });
  });
}

// ══════════════════════════════════════════════════════════
// DARK MODE
// ══════════════════════════════════════════════════════════

let isDarkMode = localStorage.getItem('darkMode') !== 'false'; // varsayılan dark

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  applyDarkMode();
  localStorage.setItem('darkMode', isDarkMode);
  
  // Toast
  showToast(isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode', 'Tema değiştirildi');
}

function applyDarkMode() {
  if (isDarkMode) {
    document.body.classList.remove('light-mode');
    document.getElementById('darkModeBtn').textContent = '🌙';
  } else {
    document.body.classList.add('light-mode');
    document.getElementById('darkModeBtn').textContent = '☀️';
  }
}

// Otomatik dark mode (saat bazlı) - isteğe bağlı
function autoDetectDarkMode() {
  const hour = new Date().getHours();
  const shouldBeDark = hour < 6 || hour >= 20; // 20:00-06:00 arası dark
  
  // Sadece kullanıcı hiç ayar yapmamışsa otomatik belirle
  if (localStorage.getItem('darkMode') === null) {
    isDarkMode = shouldBeDark;
    applyDarkMode();
  }
}

// ══════════════════════════════════════════════════════════
// CHALLENGE MODE
// ══════════════════════════════════════════════════════════

let challengeLevel = 'easy';
let challengeTimer = null;
let challengeTime = 60;
let challengeQuestions = [];
let challengeIdx = 0;
let challengeScore = 0;
let challengeCorrect = 0;

function setChallengeLevel(level) {
  challengeLevel = level;
  document.querySelectorAll('#challengeStart .level-chip').forEach(b => b.classList.remove('active'));
  document.getElementById('ch-' + level).classList.add('active');
}

function startChallenge() {
  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('challengeMode').style.display = 'block';
  document.getElementById('challengeStart').style.display = 'block';
  document.getElementById('challengeGame').style.display = 'none';
  document.getElementById('challengeResult').style.display = 'none';
  
  // En iyi skoru göster
  const bestScore = localStorage.getItem('challengeBest_' + challengeLevel) || 0;
  document.getElementById('chBestScore').textContent = bestScore;
}

function startChallengeGame() {
  const learned = Array.from(learnedSet);
  if (learned.length < 10) {
    showToast('⚠️ Yetersiz Kelime', 'En az 10 kelime öğrenmelisin!');
    return;
  }
  
  // Zorluk seviyesine göre soru sayısı
  const questionCount = challengeLevel === 'easy' ? 10 : challengeLevel === 'medium' ? 15 : 20;
  
  // Rastgele kelimeler seç
  const shuffled = learned.sort(() => Math.random() - 0.5);
  challengeQuestions = shuffled.slice(0, questionCount).map(word => {
    const item = allWords.find(w => w.word === word);
    return item || { word, translation: '' };
  });
  
  challengeIdx = 0;
  challengeScore = 0;
  challengeCorrect = 0;
  challengeTime = 60;
  
  // Ekranları değiştir
  document.getElementById('challengeStart').style.display = 'none';
  document.getElementById('challengeGame').style.display = 'block';
  document.getElementById('chTotal').textContent = questionCount;
  
  // Timer başlat
  challengeTimer = setInterval(() => {
    challengeTime--;
    document.getElementById('chTimer').textContent = challengeTime;
    
    if (challengeTime <= 0) {
      endChallenge();
    }
  }, 1000);
  
  renderChallengeQuestion();
}

function renderChallengeQuestion() {
  if (challengeIdx >= challengeQuestions.length) {
    endChallenge();
    return;
  }
  
  const item = challengeQuestions[challengeIdx];
  document.getElementById('chQuestion').textContent = challengeIdx + 1;
  document.getElementById('chWord').textContent = item.word;
  
  // Progress bar
  const progress = ((challengeIdx + 1) / challengeQuestions.length) * 100;
  document.getElementById('chProgress').style.width = progress + '%';
  
  // 4 seçenek oluştur (1 doğru + 3 yanlış)
  const options = [item.translation];
  const allTranslations = allWords.map(w => w.translation).filter(t => t !== item.translation);
  
  while (options.length < 4 && allTranslations.length > 0) {
    const randomIdx = Math.floor(Math.random() * allTranslations.length);
    const randomTrans = allTranslations[randomIdx];
    if (!options.includes(randomTrans)) {
      options.push(randomTrans);
    }
    allTranslations.splice(randomIdx, 1);
  }
  
  // Karıştır
  options.sort(() => Math.random() - 0.5);
  
  // Seçenekleri render et
  const container = document.getElementById('chOptions');
  container.innerHTML = options.map((opt, idx) => `
    <button onclick="answerChallenge('${opt.replace(/'/g, "\\'")}', '${item.translation.replace(/'/g, "\\'")}')" 
      class="btn" 
      style="padding:16px;font-size:15px;font-weight:700;background:var(--bg2);color:var(--text);border:2px solid var(--border);text-align:left">
      ${String.fromCharCode(65 + idx)}. ${opt}
    </button>
  `).join('');
  
  document.getElementById('chFeedback').textContent = '';
}

function answerChallenge(selected, correct) {
  const isCorrect = selected === correct;
  
  if (isCorrect) {
    challengeScore += 10;
    challengeCorrect++;
    document.getElementById('chFeedback').innerHTML = '<span style="color:var(--green)">✅ Doğru! +10</span>';
  } else {
    document.getElementById('chFeedback').innerHTML = `<span style="color:var(--red)">❌ Yanlış! Doğrusu: ${correct}</span>`;
  }
  
  setTimeout(() => {
    challengeIdx++;
    renderChallengeQuestion();
  }, 1000);
}

function endChallenge() {
  if (challengeTimer) {
    clearInterval(challengeTimer);
    challengeTimer = null;
  }
  
  document.getElementById('challengeGame').style.display = 'none';
  document.getElementById('challengeResult').style.display = 'block';
  
  // Skor hesapla
  const timeBonus = challengeTime > 0 ? Math.floor(challengeTime / 2) : 0;
  const totalScore = challengeScore + timeBonus;
  const accuracy = Math.round((challengeCorrect / challengeQuestions.length) * 100);
  
  document.getElementById('chFinalScore').textContent = totalScore;
  document.getElementById('chAccuracy').textContent = accuracy + '%';
  
  // Emoji ve mesaj
  let emoji = '🎉';
  let title = 'Tebrikler!';
  let text = `${challengeCorrect}/${challengeQuestions.length} doğru cevap!`;
  
  if (accuracy >= 90) {
    emoji = '🏆';
    title = 'Mükemmel!';
    text = 'Harika bir performans!';
  } else if (accuracy >= 70) {
    emoji = '⭐';
    title = 'Çok İyi!';
    text = 'Başarılı bir sonuç!';
  } else if (accuracy >= 50) {
    emoji = '👍';
    title = 'İyi!';
    text = 'Pratikle daha da iyi olacaksın!';
  } else {
    emoji = '💪';
    title = 'Devam Et!';
    text = 'Her deneme seni ileriye taşıyor!';
  }
  
  document.getElementById('chResultEmoji').textContent = emoji;
  document.getElementById('chResultTitle').textContent = title;
  document.getElementById('chResultText').textContent = text;
  
  // En iyi skoru güncelle
  const bestKey = 'challengeBest_' + challengeLevel;
  const currentBest = parseInt(localStorage.getItem(bestKey) || '0');
  if (totalScore > currentBest) {
    localStorage.setItem(bestKey, totalScore);
    showToast('🏆 Yeni Rekor!', `${totalScore} puan`);
  }
  
  // XP ekle
  addXP(totalScore);
}

// ══════════════════════════════════════════════════════════
// MOTİVASYON SİSTEMİ
// ══════════════════════════════════════════════════════════

function checkDailyGoal() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem('lastGoalCheck');
  
  // Yeni gün başladıysa sıfırla
  if (savedDate !== today) {
    todayLearned = 0;
    localStorage.setItem('lastGoalCheck', today);
  } else {
    todayLearned = parseInt(localStorage.getItem('todayLearned')) || 0;
  }
}

function incrementTodayLearned() {
  todayLearned++;
  localStorage.setItem('todayLearned', todayLearned);
  
  // Hedef kontrolü
  if (todayLearned === dailyGoal) {
    showToast('🎉 Tebrikler!', `Günlük hedefe ulaştın! ${dailyGoal} kelime`);
  }
  
  // Rozet kontrolü
  checkBadges();
  addXP(10); // Her kelime 10 XP
}

function updateStreak() {
  const today = new Date().toDateString();
  
  if (lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastActiveDate === yesterday) {
      // Streak devam ediyor
      currentStreak++;
    } else {
      // Streak kırıldı
      currentStreak = 1;
    }
    
    lastActiveDate = today;
    localStorage.setItem('lastActiveDate', today);
    localStorage.setItem('currentStreak', currentStreak);
    
    // En uzun streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      localStorage.setItem('longestStreak', longestStreak);
    }
    
    // Streak rozetleri
    checkStreakBadges();
    checkSpecialBadges();
    recordStudyDay();
  }
}

function checkBadges() {
  const totalLearned = learnedSet.size;
  
  // Kelime rozetleri
  const wordBadges = ['first_word', 'ten_words', 'fifty_words', 'hundred_words'];
  wordBadges.forEach(badgeId => {
    const badge = BADGES[badgeId];
    if (totalLearned >= badge.requirement && !badges.includes(badgeId)) {
      unlockBadge(badgeId);
    }
  });
  
  // Mükemmel skor rozeti
  if (score === 100 && !badges.includes('perfect_score')) {
    unlockBadge('perfect_score');
  }
}

function checkStreakBadges() {
  const streakBadges = ['streak_3', 'streak_7', 'streak_30'];
  streakBadges.forEach(badgeId => {
    const badge = BADGES[badgeId];
    if (currentStreak >= badge.requirement && !badges.includes(badgeId)) {
      unlockBadge(badgeId);
    }
  });
}

function unlockBadge(badgeId) {
  if (!badges.includes(badgeId)) {
    badges.push(badgeId);
    localStorage.setItem('badges', JSON.stringify(badges));
    
    const badge = BADGES[badgeId];
    showToast(`${badge.icon} Rozet Kazanıldı!`, badge.name);
    addXP(50); // Rozet başına 50 XP
  }
}

function addXP(amount) {
  totalXP += amount;
  localStorage.setItem('totalXP', totalXP);
  
  // Seviye kontrolü (her 100 XP = 1 seviye)
  const newLevel = Math.floor(totalXP / 100) + 1;
  if (newLevel > userLevel) {
    userLevel = newLevel;
    localStorage.setItem('userLevel', userLevel);
    showToast('⬆️ Seviye Atladın!', `Seviye ${userLevel}`);
  }
}

function renderMotivationWidget() {
  const container = document.getElementById('motivationWidget');
  if (!container) return;
  
  checkDailyGoal();
  
  const goalProgress = Math.min(100, (todayLearned / dailyGoal) * 100);
  const nextLevel = userLevel + 1;
  const xpForNext = nextLevel * 100;
  const xpProgress = ((totalXP % 100) / 100) * 100;
  
  container.innerHTML = `
    <!-- Günlük Hedef -->
    <div class="card" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">🎯 Günlük Hedef</div>
      <div style="font-size:28px;font-weight:900;margin-bottom:8px">${todayLearned}/${dailyGoal}</div>
      <div style="height:8px;background:rgba(255,255,255,0.3);border-radius:4px;overflow:hidden">
        <div style="height:100%;background:white;width:${goalProgress}%;transition:width 0.5s"></div>
      </div>
      <div style="font-size:11px;opacity:0.9;margin-top:6px">
        ${dailyGoal - todayLearned > 0 ? `${dailyGoal - todayLearned} kelime kaldı` : 'Hedef tamamlandı! 🎉'}
      </div>
    </div>
    
    <!-- Streak -->
    <div class="card" style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);color:white">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">🔥 Streak</div>
      <div style="font-size:28px;font-weight:900;margin-bottom:4px">${currentStreak} Gün</div>
      <div style="font-size:11px;opacity:0.9">En uzun: ${longestStreak} gün</div>
    </div>
    
    <!-- Seviye -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:14px;font-weight:800;color:var(--text)">⚡ Seviye ${userLevel}</div>
        <div style="font-size:11px;color:var(--muted)">${totalXP} XP</div>
      </div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;background:var(--blue);width:${xpProgress}%;transition:width 0.3s"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">
        Sonraki seviye: ${xpForNext} XP
      </div>
    </div>
    
    <!-- Rozetler -->
    <div class="card">
      <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:10px">🏆 Rozetler (${badges.length}/${Object.keys(BADGES).length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${Object.values(BADGES).map(badge => {
          const unlocked = badges.includes(badge.id);
          return `
            <div style="
              width:60px;
              padding:8px;
              background:${unlocked ? 'var(--bg2)' : 'var(--bg3)'};
              border:2px solid ${unlocked ? 'var(--green)' : 'var(--border)'};
              border-radius:12px;
              text-align:center;
              opacity:${unlocked ? '1' : '0.4'}; ">
              <div style="font-size:24px;margin-bottom:4px">${badge.icon}</div>
              <div style="font-size:9px;color:var(--text);font-weight:700">${badge.name.split(' ')[0]}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// KÜTÜPHANE SİSTEMİ - GEÇİCİ OLARAK DEVRE DIŞI
// ══════════════════════════════════════════════════════════
/*
Kütüphane özelliği syntax sorunları nedeniyle geçici olarak devre dışı.
Gelecek sürümlerde eklenecek.
*/

