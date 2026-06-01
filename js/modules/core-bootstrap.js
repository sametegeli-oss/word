/* ════════════════════════════════════════════════════════════════
   WordMode — modül: core-bootstrap.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */


/* SAFE INSERTBEFORE FIX */
(function(){
  if(window.__SAFE_INSERTBEFORE_FIXED__) return;
  window.__SAFE_INSERTBEFORE_FIXED__ = true;
  const oldInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, refNode){
    try{
      if(refNode && refNode.parentNode !== this){
        return this.appendChild(newNode);
      }
      return oldInsertBefore.call(this, newNode, refNode || null);
    }catch(e){
      console.warn('[Safe insertBefore]', e);
      try{return this.appendChild(newNode);}catch(e2){return newNode;}
    }
  };
})();


/* ===== extracted script block ===== */


/* ════════════════════════════════════════════════════════════════════════════
   STANDALONE PRONUNCIATION ANALYSIS — Mevcut WM_Pronunciation altyapısını
   bağımsız bir ekran üzerinden kullanır. Tüm hesaplama mantığı (IPA fetch,
   ipaToTurkish, _align, _bestAlt, _colorLetters, _colorLettersTR, kayıt &
   transkripsiyon karşılaştırması) WM_Pronunciation'dan çağrılır.
   ════════════════════════════════════════════════════════════════════════════ */

let SP_currentWord = '';
let SP_recState = {
  isRecording: false,
  recorder: null,
  stream: null,
  chunks: [],
  blob: null,
  recognition: null
};

function initStandalonePron() {
  const input = document.getElementById('spWordInput');
  if (input && !input._spBound) {
    input._spBound = true;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); runStandalonePronAnalysis(); }
    });
  }
}

function spQuickFill(word) {
  document.getElementById('spWordInput').value = word;
  runStandalonePronAnalysis();
}

async function runStandalonePronAnalysis() {
  const input = document.getElementById('spWordInput');
  const raw = (input.value || '').trim();
  const word = raw.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!word) {
    document.getElementById('spResults').innerHTML =
      '<div class="sp-error">⚠️ Lütfen geçerli bir İngilizce kelime girin.</div>';
    return;
  }
  SP_currentWord = word;

  // Önceki kaydı temizle
  spStopRecording(true);

  const results = document.getElementById('spResults');
  results.innerHTML = '<div class="sp-result-card"><div class="sp-spinner"></div><div style="text-align:center;color:var(--muted);font-size:13px;margin-top:12px">Yükleniyor…</div></div>';

  try {
    // WM_Pronunciation'ın altyapısını yeniden kullan
    const info = await WM_Pronunciation.getDetailedInfo(word);
    const phonetic = info.phonetic || ('/' + word + '/');
    const trPron = WM_Pronunciation.ipaToTurkish(phonetic);

    const syllables = info.syllables || [word];
    const stressIdx = info.stressIndex || 0;
    const syllablesHTML = syllables.map((syl, i) => {
      const cls = (i === stressIdx ? 'sp-syl stressed' : 'sp-syl');
      const safeSyl = syl.replace(/'/g, "\\'");
      return `<span class="${cls}" onclick="WM_Pronunciation.speak('${safeSyl}')">${syl}</span>`;
    }).join('<span class="sp-syl-sep">·</span>');

    const safeWord = word.replace(/'/g, "\\'");
    const speed = WM_Pronunciation.settings.playbackSpeed;

    results.innerHTML = `
      <!-- Word Info Card -->
      <div class="sp-result-card">
        <div class="sp-word-display">
          <h2>${word}</h2>
        </div>

        <!-- IPA + Türkçe -->
        <div class="sp-section">
          <span class="sp-section-label">📢 IPA & Türkçe Yaklaşık Okunuş</span>
          <div class="sp-ipa-box">
            <div class="sp-ipa-text">${phonetic}</div>
            <div class="sp-tr-text">${trPron || '—'}</div>
          </div>
        </div>

        <!-- Heceler -->
        ${syllables.length ? `
        <div class="sp-section">
          <span class="sp-section-label">🔤 Heceler ${syllables.length > 1 ? '(vurgulu: mavi)' : ''}</span>
          <div class="sp-syllables">${syllablesHTML}</div>
        </div>` : ''}

        <!-- Konuş kontrolleri -->
        <div class="sp-section">
          <span class="sp-section-label">🔊 Dinle</span>
          <div class="sp-controls">
            <button class="sp-ctrl-btn play" onclick="WM_Pronunciation.speak('${safeWord}')">🔊 Normal</button>
            <button class="sp-ctrl-btn" onclick="WM_Pronunciation.speak('${safeWord}', {rate: 0.6})">🐌 Yavaş</button>
            <button class="sp-ctrl-btn" onclick="WM_Pronunciation.speak('${safeWord}', {rate: 1.3})">🐇 Hızlı</button>
          </div>
          <div class="sp-speed-row">
            <span style="font-size:12px;color:var(--muted);font-weight:700">⚡ Hız</span>
            <input type="range" min="0.5" max="2" step="0.1" value="${speed}"
                   oninput="spOnSpeedChange(this.value)">
            <span class="sp-speed-val" id="spSpeedVal">${speed}x</span>
          </div>
        </div>
      </div>

      <!-- Recording Card -->
      <div class="sp-rec-card">
        <span class="sp-section-label" style="display:block;margin-bottom:10px">🎤 Telaffuzunu Dene</span>
        <button id="spRecBtn" class="sp-rec-btn" onclick="spToggleRecord()">🎤 Kaydı Başlat</button>
        <button id="spPlayRecBtn" class="sp-play-rec" style="display:none" onclick="spPlayMyRecording()">▶ Kendi Kaydımı Dinle</button>
        <button id="spAddToLearnBtn" class="sp-play-rec" style="display:block;margin-top:8px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#052e16" onclick="spAddCurrentToLearnList()">📌 Ezberleneceklere Ekle</button>
        <div id="spAnalysis" class="sp-analysis"></div>
      </div>
    `;
  } catch (err) {
    console.error('SP analysis error:', err);
    results.innerHTML = '<div class="sp-error">❌ Kelime analiz edilemedi. İnternet bağlantısını kontrol et.</div>';
  }
}

function spOnSpeedChange(val) {
  WM_Pronunciation.setSpeed(val);
  const lbl = document.getElementById('spSpeedVal');
  if (lbl) lbl.textContent = val + 'x';
}

function spToggleRecord() {
  if (SP_recState.isRecording) {
    spStopRecording();
  } else {
    spStartRecording();
  }
}

async function spStartRecording() {
  if (!SP_currentWord) return;

  // Önceki kayıtları zorla temizle (önemli!)
  spForceCleanup();

  SP_recState.isRecording = true;
  SP_recState.chunks = [];
  SP_recState.blob = null;

  const btn = document.getElementById('spRecBtn');
  const playBtn = document.getElementById('spPlayRecBtn');
  const analysis = document.getElementById('spAnalysis');
  if (btn) { btn.textContent = '⏹ Durdur'; btn.classList.add('recording'); }
  if (playBtn) playBtn.style.display = 'none';
  if (analysis) analysis.innerHTML = '<div style="text-align:center;color:var(--muted);padding:14px;font-size:13px">🎤 Dinliyorum… kelimeyi söyle</div>';

  // SpeechRecognition kontrolü
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    spShowRecError('Tarayıcı ses tanımayı desteklemiyor. Chrome veya Edge kullanın.');
    return;
  }

  // === ADIM 1: Önce getUserMedia ile mikrofon stream'i al ===
  // (referans dosyadaki çalışan pattern: sıralı başlatma)
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    SP_recState.stream = stream;
  } catch (e) {
    console.warn('Mikrofon erişimi reddedildi:', e);
    spShowRecError('Mikrofon erişimi reddedildi: ' + e.message);
    return;
  }

  // === ADIM 2: MediaRecorder kur (kaydı dinleyebilmek için) ===
  try {
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    SP_recState.recorder = new MediaRecorder(stream, { mimeType: mime });
    SP_recState.recorder.ondataavailable = e => { if (e.data.size > 0) SP_recState.chunks.push(e.data); };
    SP_recState.recorder.onstop = () => {
      // Recorder durunca stream'i de durdur (mikrofon LED'ini söndürür)
      if (SP_recState.stream) {
        SP_recState.stream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} });
        SP_recState.stream = null;
      }
      if (SP_recState.chunks.length > 0) {
        SP_recState.blob = new Blob(SP_recState.chunks, { type: SP_recState.recorder.mimeType });
        if (playBtn) playBtn.style.display = '';
      }
    };
    SP_recState.recorder.start();
  } catch (e) {
    console.warn('MediaRecorder başlatılamadı:', e);
    // Stream'i temizle, devam etme
    stream.getTracks().forEach(t => { try { t.stop(); } catch(err) {} });
    SP_recState.stream = null;
    spShowRecError('Kayıt başlatılamadı: ' + e.message);
    return;
  }

  // === ADIM 3: SpeechRecognition kur ===
  SP_recState.recognition = new SR();
  SP_recState.recognition.lang = 'en-US';
  SP_recState.recognition.maxAlternatives = 5;
  SP_recState.recognition.interimResults = false;
  SP_recState.recognition.continuous = false;

  SP_recState.recognition.onresult = async (e) => {
    const alts = Array.from(e.results[0]).map(r => r.transcript.toLowerCase().trim());
    await spAnalyzeAndShow(SP_currentWord, alts);
  };

  SP_recState.recognition.onerror = (e) => {
    console.warn('SpeechRecognition error:', e.error);
    // Hata olunca recorder ve stream'i mutlaka temizle
    spForceCleanup();
    const msgs = {
      'no-speech': 'Ses algılanamadı. Tekrar dene.',
      'not-allowed': 'Mikrofon izni gerekli.',
      'network': 'İnternet bağlantısı gerekli.',
      'audio-capture': 'Mikrofona ulaşılamadı. Diğer sekmeleri veya uygulamaları kapatıp tekrar dene.',
      'aborted': null  // iptal — mesaj gösterme
    };
    if (msgs[e.error] !== null) {
      spShowRecError(msgs[e.error] || 'Hata: ' + e.error);
    } else {
      // Sadece butonu sıfırla
      const b = document.getElementById('spRecBtn');
      if (b) { b.textContent = '🎤 Kaydı Başlat'; b.classList.remove('recording'); }
    }
  };

  SP_recState.recognition.onend = () => {
    SP_recState.isRecording = false;
    // MediaRecorder hâlâ aktifse durdur (bu da stream'i kapatır onstop'ta)
    if (SP_recState.recorder && SP_recState.recorder.state !== 'inactive') {
      try { SP_recState.recorder.stop(); } catch(e) {}
    } else if (SP_recState.stream) {
      // Recorder zaten kapanmışsa, stream'i manuel kapat
      SP_recState.stream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} });
      SP_recState.stream = null;
    }
    const b = document.getElementById('spRecBtn');
    if (b) { b.textContent = '🔁 Tekrar Dene'; b.classList.remove('recording'); }
  };

  try {
    SP_recState.recognition.start();
  } catch (e) {
    spForceCleanup();
    spShowRecError('Ses tanıma başlatılamadı: ' + e.message);
  }
}

// Tüm kaynakları zorla temizle — hata, çıkış, yeniden başlatma durumlarında
function spForceCleanup() {
  if (SP_recState.recognition) {
    try { SP_recState.recognition.abort(); } catch(e) {}
    try { SP_recState.recognition.stop(); } catch(e) {}
    SP_recState.recognition = null;
  }
  if (SP_recState.recorder && SP_recState.recorder.state !== 'inactive') {
    try { SP_recState.recorder.stop(); } catch(e) {}
  }
  SP_recState.recorder = null;
  if (SP_recState.stream) {
    try { SP_recState.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
    SP_recState.stream = null;
  }
  SP_recState.isRecording = false;
}

function spStopRecording(silent) {
  if (SP_recState.recognition) {
    try { SP_recState.recognition.stop(); } catch(e) {}
  }
  if (SP_recState.recorder && SP_recState.recorder.state !== 'inactive') {
    try { SP_recState.recorder.stop(); } catch(e) {}
  }
  if (SP_recState.stream) {
    try { SP_recState.stream.getTracks().forEach(t => t.stop()); } catch(e) {}
  }
  SP_recState.isRecording = false;
  if (silent) {
    SP_recState.blob = null;
    SP_recState.chunks = [];
    const playBtn = document.getElementById('spPlayRecBtn');
    if (playBtn) playBtn.style.display = 'none';
  }
}

function spPlayMyRecording() {
  if (!SP_recState.blob) return;
  const url = URL.createObjectURL(SP_recState.blob);
  const audio = new Audio(url);
  const btn = document.getElementById('spPlayRecBtn');
  if (btn) btn.textContent = '▶ Oynatılıyor…';
  audio.play();
  audio.onended = () => {
    if (btn) btn.textContent = '▶ Kendi Kaydımı Dinle';
    URL.revokeObjectURL(url);
  };
}

function spShowRecError(msg) {
  spForceCleanup();
  const analysis = document.getElementById('spAnalysis');
  if (analysis) analysis.innerHTML = `<div class="sp-error">❌ ${msg}</div>`;
  const btn = document.getElementById('spRecBtn');
  if (btn) { btn.textContent = '🎤 Kaydı Başlat'; btn.classList.remove('recording'); }
}

function spSafeParseJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ''); } catch(e) { return fallback; }
}

function spFindWordData(word) {
  const lower = String(word || '').toLowerCase();
  const pools = [];
  try { if (Array.isArray(window.allWords)) pools.push(window.allWords); } catch(e) {}
  try { if (Array.isArray(window.words)) pools.push(window.words); } catch(e) {}
  try { const saved = spSafeParseJSON('learnedWords', []); if (Array.isArray(saved)) pools.push(saved); } catch(e) {}
  for (const pool of pools) {
    const found = pool.find(w => String(w.word || '').toLowerCase() === lower);
    if (found) return found;
  }
  return { word: word, tr: '', translation: '', sentence: '', sentenceTr: '', phonetic: '' };
}

function spAddCurrentToLearnList() {
  const word = (SP_currentWord || (document.getElementById('spWordInput')?.value || '')).trim().toLowerCase().replace(/[^a-z'-]/g, '');
  if (!word) { try { showToast('⚠️ Kelime yok', 'Önce bir kelime analiz et'); } catch(e) {} return; }
  if (typeof addToLearnList === 'function') {
    addToLearnList(word);
  } else {
    const data = spFindWordData(word);
    const newWord = {
      word,
      tr: data.tr || data.translation || '',
      sentence: data.sentence || '',
      sentenceTr: data.sentenceTr || '',
      phonetic: data.phonetic || '',
      colors: data.colors || ''
    };
    try { localStorage.setItem('toLearnWords_' + Date.now(), JSON.stringify(newWord)); } catch(e) {}
    try { if (Array.isArray(window.allWords) && !window.allWords.some(w => String(w.word || '').toLowerCase() === word)) window.allWords.push(newWord); } catch(e) {}
  }
  const btn = document.getElementById('spAddToLearnBtn');
  if (btn) btn.textContent = '✅ Ezberleneceklere Eklendi';
  try { showToast('✅ Eklendi', word + ' ezberlenecekler listesine eklendi'); } catch(e) {}
}

function spSavePronunciationHistory(target, heard, score) {
  const data = spFindWordData(target);
  const entry = {
    time: Date.now(),
    word: target,
    target: target,
    heard: heard || '',
    score: Math.round(Number(score) || 0),
    mode: 'standalone-word'
  };
  if (typeof wmSavePronunciationHistoryEntry === 'function') {
    wmSavePronunciationHistoryEntry(entry);
  } else {
    const keys = ['wm_pronunciation_history_v2', 'wm_pron_history', 'wmPronHistory'];
    keys.forEach(key => {
      const arr = spSafeParseJSON(key, []);
      if (Array.isArray(arr)) {
        arr.push(entry);
        try { localStorage.setItem(key, JSON.stringify(arr.slice(-300))); } catch(e) {}
      }
    });
  }
  try {
    if (!window.wordStatus) window.wordStatus = {};
    if (!wordStatus[target]) wordStatus[target] = { attempts: 0, correct: 0, pronScore: null };
    wordStatus[target].attempts = (wordStatus[target].attempts || 0) + 1;
    wordStatus[target].pronScore = entry.score;
    if (entry.score >= 70) wordStatus[target].correct = Math.max(wordStatus[target].correct || 0, 1);
    if (typeof saveProgress === 'function') saveProgress();
    if (typeof renderWordList === 'function') renderWordList();
    if (typeof wmRenderProfessionalUpgrade === 'function') setTimeout(wmRenderProfessionalUpgrade, 80);
    if (typeof wmProRenderPronHistory === 'function') setTimeout(wmProRenderPronHistory, 80);
  } catch(e) { console.warn('Telaffuz geçmişi kaydedilemedi:', e); }
}

async function spAnalyzeAndShow(target, alts) {
  const analysis = document.getElementById('spAnalysis');
  if (!analysis) return;
  analysis.innerHTML = '<div style="text-align:center;color:var(--muted);padding:14px;font-size:13px">⏳ Analiz ediliyor…</div>';

  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const tNorm = norm(target);
  const altsNorm = alts.map(norm);

  // En iyi alternatifi WM_Pronunciation üzerinden seç
  const { word: bestSpoken, score: simScore } = WM_Pronunciation._bestAlt(tNorm, altsNorm);

  // Renkli harf analizi (İngilizce)
  const coloredHTML = WM_Pronunciation._colorLetters(tNorm, bestSpoken);

  // Doğru/yanlış sayıları
  const { a1, a2 } = WM_Pronunciation._align(tNorm, bestSpoken);
  let correct = 0, wrong = 0, missing = 0;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] === '-') continue;
    if (a1[i] === a2[i]) correct++;
    else if (a2[i] === '-') missing++;
    else wrong++;
  }

  // IPA Türkçe karşılaştırması
  const targetIPA = WM_Pronunciation.getFromCache('phonetic', target) || '';
  const targetTR = WM_Pronunciation.ipaToTurkish(targetIPA);

  let spokenIPA;
  if (bestSpoken === tNorm || simScore >= 0.95) {
    spokenIPA = targetIPA;
  } else {
    spokenIPA = WM_Pronunciation.getFromCache('phonetic', bestSpoken)
                || WM_Pronunciation.generateApproximatePhonetic(bestSpoken);
  }
  const spokenTR = WM_Pronunciation.ipaToTurkish(spokenIPA);
  const trColoredHTML = WM_Pronunciation._colorLettersTR(targetTR, spokenTR);

  // Skor
  const pct = Math.round(simScore * 100);
  const color = pct >= 90 ? '#4ade80' : pct >= 70 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '✅' : pct >= 50 ? '👍' : '💪';
  const label = pct >= 90 ? 'Mükemmel' : pct >= 70 ? 'İyi' : pct >= 50 ? 'Orta' : 'Gelişmeli';

  // Standalone kelime telaffuz sonuçlarını telaffuz geçmişine kaydet
  spSavePronunciationHistory(target, bestSpoken, pct);

  analysis.innerHTML = `
    <div class="sp-score-hero">
      <div class="sp-score-emoji">${emoji}</div>
      <div class="sp-score-label" style="color:${color}">${label}</div>
      <div class="sp-score-pct" style="color:${color}">${pct}%</div>
    </div>

    ${targetTR ? `
    <div class="sp-compare-block">
      <div class="sp-compare-title">🇹🇷 TÜRKÇE OKUNUŞ KARŞILAŞTIRMASI</div>
      <div class="sp-compare-row">
        <span class="sp-compare-tag">✅ Doğru:</span>
        <span class="sp-compare-text" style="color:#4ade80">${targetTR}</span>
      </div>
      <div class="sp-compare-row">
        <span class="sp-compare-tag">🎤 Sizin:</span>
        <span class="sp-compare-text">${trColoredHTML}</span>
      </div>
      <div class="sp-legend">
        <span><span style="color:#4ade80;font-weight:900">■</span> Doğru</span>
        <span><span style="color:#f87171;font-weight:900">■</span> Yanlış/Eksik</span>
      </div>
    </div>` : ''}

    <div class="sp-compare-block">
      <div class="sp-compare-title">🔤 HARF BAZLI ANALİZ</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
        Hedef: <strong style="color:var(--text)">${target}</strong> →
        Duyulan: <strong style="color:${color}">${bestSpoken}</strong>
      </div>
      <div style="letter-spacing:2px;line-height:2;margin-bottom:8px">${coloredHTML}</div>
      <div class="sp-legend">
        <span><span style="color:#4ade80;font-weight:900">■</span> Doğru (${correct})</span>
        <span><span style="color:#f87171;font-weight:900">■</span> Yanlış/Eksik (${wrong + missing})</span>
      </div>
    </div>

    <div class="sp-counts">
      <div class="sp-count-card" style="background:rgba(74,222,128,.1);border:1px solid #4ade80">
        <div class="sp-count-num" style="color:#4ade80">${correct}</div>
        <div class="sp-count-lbl">Doğru</div>
      </div>
      <div class="sp-count-card" style="background:rgba(248,113,113,.1);border:1px solid #f87171">
        <div class="sp-count-num" style="color:#f87171">${wrong}</div>
        <div class="sp-count-lbl">Yanlış</div>
      </div>
      <div class="sp-count-card" style="background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.5)">
        <div class="sp-count-num" style="color:#f87171">${missing}</div>
        <div class="sp-count-lbl">Eksik</div>
      </div>
    </div>
  `;
}


/* ===== extracted script block ===== */


/* ════════════════════════════════════════════════════════════════════════════
   SECURITY & PERFORMANCE IMPROVEMENTS
   Applied: API Key Encryption, XSS Protection, Rate Limiting
   ════════════════════════════════════════════════════════════════════════════ */

// Güvenlik Modülü
const WM_Security = {
  ENCRYPTION_KEY: 'WM_SECURE_2024_' + btoa(window.location.hostname),
  
  // API Key'leri şifrele
  encryptAPIKey: function(key) {
    if (!window.CryptoJS) {
      console.warn('CryptoJS yüklenmedi, şifreleme atlanıyor');
      return key;
    }
    try {
      return CryptoJS.AES.encrypt(key, this.ENCRYPTION_KEY).toString();
    } catch (e) {
      console.error('Şifreleme hatası:', e);
      return key;
    }
  },
  
  // API Key'leri çöz
  decryptAPIKey: function(encrypted) {
    if (!window.CryptoJS || !encrypted) return encrypted;
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, this.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error('Çözme hatası:', e);
      return encrypted;
    }
  },
  
  // XSS koruması
  sanitizeHTML: function(html) {
    if (!window.DOMPurify) {
      console.warn('DOMPurify yüklenmedi, sanitize atlanıyor');
      return html;
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p', 'br', 'div', 'code', 'pre'],
      ALLOWED_ATTR: ['class', 'style']
    });
  },
  
  // API key formatını doğrula
  validateAPIKey: function(key, provider) {
    const patterns = {
      groq: /^gsk_[a-zA-Z0-9]{32,}$/,
      openai: /^sk-[a-zA-Z0-9]{32,}$/,
      claude: /^sk-ant-[a-zA-Z0-9\-]{32,}$/,
      gemini: /^AIza[a-zA-Z0-9\-_]{35}$/
    };
    return patterns[provider] ? patterns[provider].test(key) : true;
  }
};

// Rate Limiting Modülü
const WM_RateLimit = {
  requests: new Map(),
  MAX_REQUESTS: 20,
  WINDOW_MS: 60000,
  
  check: function(endpoint) {
    const now = Date.now();
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }
    
    const times = this.requests.get(endpoint);
    const recent = times.filter(t => now - t < this.WINDOW_MS);
    
    if (recent.length >= this.MAX_REQUESTS) {
      console.warn('Rate limit aşıldı:', endpoint);
      return false;
    }
    
    recent.push(now);
    this.requests.set(endpoint, recent);
    return true;
  }
};

// Performance Monitor
const WM_Performance = {
  checkMemory: function() {
    if (window.performance && window.performance.memory) {
      const used = window.performance.memory.usedJSHeapSize / (1024 * 1024);
      const total = window.performance.memory.jsHeapSizeLimit / (1024 * 1024);
      const percent = (used / total * 100).toFixed(1);
      
      if (percent > 85) {
        console.warn(`⚠️ Yüksek bellek kullanımı: ${percent}% (${used.toFixed(1)}MB/${total.toFixed(1)}MB)`);
      }
      return { used, total, percent: parseFloat(percent) };
    }
    return null;
  }
};

// Toast notification sistemi
const WM_Toast = {
  show: function(icon, message, duration = 3000) {
    const existingToast = document.getElementById('wm-security-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.id = 'wm-security-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card, #1a1f2e);
      color: var(--text, #fff);
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border: 1px solid var(--border, #2a3348);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideDown 0.3s ease;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 600;
    `;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* ════════════════════════════════════════════════════════════════════════════
   LOCALSTORAGE MEMORY MANAGEMENT - Bellek Aşımı Önleme Sistemi
   ════════════════════════════════════════════════════════════════════════════ */
