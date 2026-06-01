/* ════════════════════════════════════════════════════════════════
   WordMode — modül: config.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function setQuizCount(n){
  document.getElementById('quizCount').value = n;
  document.querySelectorAll('.quiz-count-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('qc-'+n)?.classList.add('active');
}

function setQuizType(t){
  document.getElementById('quizType').value = t;
  document.querySelectorAll('.quiz-type-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('qt-'+t)?.classList.add('active');
}

function quizNewTest(){
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizContainer').style.display = 'none';
  document.getElementById('quizSetupCard').style.display = '';
  // Aynı ayarlarla direkt yeni test oluştur
  setTimeout(()=>generateQuiz(), 200);
}

function updateQuizProgress(){
  const total = quizQuestions.length;
  const current = currentQuizIndex;
  const pct = total > 0 ? Math.round(current/total*100) : 0;
  const fill = document.getElementById('quizProgressFill');
  if(fill) fill.style.width = pct+'%';
  const title = document.getElementById('quizTitle');
  if(title) title.textContent = (current+1)+'/'+total;
}

async function generateQuiz() {
  const count = parseInt(document.getElementById('quizCount').value) || 10;
  const quizType = document.getElementById('quizType').value;
  const selectedModel = document.getElementById('quizAIModel').value; // Seçilen model
  
  if (allWords.length < 5) {
    alert('❌ En az 5 kelime yükle!');
    return;
  }
  
  const INVALID_WORDS = ['verb','noun','adj','adjective','adverb','word'];
  const validWords = allWords.filter(w => {
    if(!w || !w.word || w.word === 'undefined' || !w.word.trim()) return false;
    if(INVALID_WORDS.includes(w.word.toLowerCase().trim())) return false;
    const hasTr = w.tr && w.tr !== 'undefined' && w.tr.trim() !== '' && w.tr !== 'çeviri yok';
    const hasSent = w.sentence && w.sentence.trim().length > 5;
    return hasTr || hasSent; // Sentence VEYA çevirisi olanlar
  });
  
  if (validWords.length < 5) {
    const invalidCount = allWords.length - validWords.length;
    const invalidWords = allWords.filter(w => 
      !w || 
      !w.word || 
      w.word === 'undefined' || 
      w.word.trim() === '' ||
      !w.tr || 
      w.tr === 'undefined' || 
      w.tr.trim() === ''
    );
    
    console.log('🔍 GEÇERSİZ KELİMELER:', invalidWords);
    
    alert(`❌ Geçerli kelime sayısı az!

Toplam kelime: ${allWords.length}
Geçerli: ${validWords.length}
Geçersiz: ${invalidCount}

En az 5 geçerli kelime gerekli.

💡 İpucu: Excel'de boş satırları ve "undefined" kelimelerini silin.

📊 Console'u aç (F12) ve geçersiz kelimeleri gör.`);
    return;
  }
  
  const maxPerBatch = Math.min(count, 5); // Rate limit için max 5
  const selectedWords = validWords.sort(() => Math.random() - 0.5).slice(0, Math.min(maxPerBatch, validWords.length));
  
  showToast('⏳ Test Oluşturuluyor...', 'AI sorular üretiyor...');
  
  // UI kilitle
  const genBtn = document.getElementById('quizGenerateBtn');
  if(genBtn){ genBtn.textContent='⏳ Oluşturuluyor...'; genBtn.disabled=true; }
  const loadBar = document.getElementById('quizLoadingBar');
  const loadFill = document.getElementById('quizLoadingFill');
  const loadText = document.getElementById('quizLoadingText');
  if(loadBar) loadBar.style.display='';
  if(loadFill) loadFill.style.width='10%';

  quizQuestions = [];
  currentQuizIndex = 0;
  quizCorrectCount = 0;
  
  // TEK İSTEK - llama-3.1-8b-instant
  if(loadFill) loadFill.style.width = '40%';
  if(loadText) loadText.textContent = '🤖 Sorular hazırlanıyor...';

  const wordList = selectedWords.map((w,i) => {
    const hasSent = w.sentence && w.sentence.trim().length > 5;
    const hasTr2 = w.tr && w.tr !== 'çeviri yok' && w.tr !== 'undefined' && w.tr.trim() !== '';
    if(hasSent) return (i+1)+') '+w.sentence;
    if(hasTr2) return (i+1)+') '+w.word+' = '+w.tr;
    return null;
  }).filter(Boolean).join('\n');

  if(!wordList.trim()){
    showToast('❌ Yeterli kelime yok','Cümle veya çevirisi olan kelime ekle');
    if(loadBar) loadBar.style.display='none';
    const gb=document.getElementById('quizGenerateBtn');
    if(gb){gb.textContent='✨ Test Oluştur';gb.disabled=false;}
    return;
  }

  const prompt = `You are an English teacher. Create ${selectedWords.length} multiple choice questions.

${wordList}

Rules:
- Analyze each sentence for grammar, meaning, usage, collocations, tense
- Questions in Turkish, options in English or Turkish (based on question type)
- 4 options A B C D, only 1 correct
- Brief Turkish explanation

Format (exact, no extra text):
---
SORU: [Turkish question]
A) [option]
B) [option]
C) [option]
D) [option]
DOGRU: [A/B/C/D]
ACIKLAMA: [Turkish explanation]
---`;

  let rawResponse = null;
  try {
    if(loadFill) loadFill.style.width = '65%';
    
    // Dinamik AI çağrısı
    console.log('🎯 Quiz AI Model:', selectedModel);
    const aiResponse = await callAI(
      'English teacher. Reply only in exact format. No extra text.',
      prompt,
      'quiz'
    );
    
    rawResponse = aiResponse.content || aiResponse;
    console.log('✅ Quiz AI yanıt alındı, model:', aiResponse.model);
    
  } catch(e){
    console.error('Quiz err:',e);
    showToast('❌ Bağlantı hatası', e.message || 'İnternet bağlantısını kontrol et');
    if(loadBar) loadBar.style.display='none';
    const gb=document.getElementById('quizGenerateBtn');
    if(gb){gb.textContent='✨ Test Oluştur';gb.disabled=false;}
    return;
  }

  if(loadFill) loadFill.style.width='90%';

  if(rawResponse){
    const blocks = rawResponse.split(/---+/).filter(b=>b.trim());
    for(let bi=0;bi<blocks.length;bi++){
      const lines = blocks[bi].trim().split('\n').filter(l=>l.trim());
      const qL = lines.find(l=>/^SORU[:\s]/i.test(l));
      const aL = lines.find(l=>/^A[).\s]/.test(l));
      const bL = lines.find(l=>/^B[).\s]/.test(l));
      const cL = lines.find(l=>/^C[).\s]/.test(l));
      const dL = lines.find(l=>/^D[).\s]/.test(l));
      const dgL = lines.find(l=>/^(DOGRU|DOĞRU)[:\s]/i.test(l));
      const acL = lines.find(l=>/^(ACIKLAMA|AÇIKLAMA)[:\s]/i.test(l));
      if(!qL||!aL||!bL||!cL||!dL||!dgL) continue;
      const question = qL.replace(/^SORU[:\s]*/i,'').trim();
      const options = [
        aL.replace(/^A[).\s]*/,'').trim(),
        bL.replace(/^B[).\s]*/,'').trim(),
        cL.replace(/^C[).\s]*/,'').trim(),
        dL.replace(/^D[).\s]*/,'').trim(),
      ];
      const letter = dgL.replace(/^(DOGRU|DOĞRU)[:\s]*/i,'').trim().toUpperCase().charAt(0);
      const correct = options[letter.charCodeAt(0)-65];
      const explanation = acL?acL.replace(/^(ACIKLAMA|AÇIKLAMA)[:\s]*/i,'').trim():'';
      const origWord = selectedWords[bi]||null;
      if(question&&correct&&!options.some(o=>!o)){
        quizQuestions.push({question,options,correct,sentence:origWord?.sentence||'',explanation});
      }
    }
  }
  // Loading gizle
  if(loadBar) loadBar.style.display='none';
  if(loadFill) loadFill.style.width='0%';
  const btn2 = document.getElementById('quizGenerateBtn');
  if(btn2){ btn2.textContent='✨ Test Oluştur'; btn2.disabled=false; }

  // Soru üretilemediyse hata göster
  if(quizQuestions.length === 0){
    document.getElementById('quizSetupCard').style.display = '';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizResults').style.display = 'none';
    showToast('❌ Soru üretilemedi', 'API rate limit veya kelime sorunu. Tekrar dene.');
    return;
  }

  // Sorular hazır — quiz başlat
  document.getElementById('quizContainer').style.display = 'block';
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizSetupCard').style.display = 'none';
  const nBtn = document.getElementById('quizNextBtn'); if(nBtn) nBtn.style.display='none';
  updateQuizProgress();
  showQuizQuestion();
}

function showQuizQuestion() {
  if (currentQuizIndex >= quizQuestions.length) {
    showQuizResults();
    return;
  }
  
  const q = quizQuestions[currentQuizIndex];
  
  document.getElementById('quizTitle').textContent = `Soru ${currentQuizIndex + 1}/${quizQuestions.length}`;
  document.getElementById('quizScore').textContent = `${quizCorrectCount} / ${currentQuizIndex}`;
  
  // Cümleyi göster - sadece "soru cümlesinde" ile başlıyorsa
  const sentEl = document.getElementById('quizSentence');
  if(sentEl) {
    const shouldShowSentence = q.question && (
      q.question.toLowerCase().startsWith('soru cümlesinde') || 
      q.question.toLowerCase().startsWith('aşağıdaki cümle')
    );
    
    if(shouldShowSentence && q.sentence) {
      sentEl.textContent = q.sentence;
      sentEl.style.display = 'block';
    } else {
      sentEl.style.display = 'none';
    }
  }
  
  document.getElementById('quizQuestion').textContent = q.question;
  document.getElementById('quizFeedback').style.display = 'none';
  document.getElementById('quizNextBtn').style.display = 'none';
  
  // INDEX-BASED BUTONLAR (tırnak sorunu yok)
  const optionsHtml = q.options.map((opt, index) => 
    `<button 
      class="quiz-option" 
      data-index="${index}"
      style="padding:11px 14px;border:2px solid var(--bg3);border-radius:12px;background:var(--bg2);color:var(--text);cursor:pointer;font-size:14px;font-weight:700;transition:all 0.2s;text-align:left;word-wrap:break-word;white-space:normal;line-height:1.3"
    >${opt}</button>`
  ).join('');
  
  document.getElementById('quizOptions').innerHTML = optionsHtml;
  
  // Event listener ekle (onclick yerine)
  document.querySelectorAll('.quiz-option').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      checkQuizAnswer(index, q.options[index], q.correct, btn);
    });
  });
}

function checkQuizAnswer(index, selected, correct, btn) {
  const isCorrect = selected === correct;
  const feedback = document.getElementById('quizFeedback');
  
  // Tüm butonları disable et
  document.querySelectorAll('.quiz-option').forEach(b => {
    b.disabled = true;
    b.style.cursor = 'not-allowed';
  });
  
  if (isCorrect) {
    btn.style.background = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    btn.style.color = '#fff';
    quizCorrectCount++;
    if(quizQuestions[currentQuizIndex]) quizQuestions[currentQuizIndex].answeredCorrectly = true;
  } else {
    btn.style.background = 'var(--red)';
    btn.style.borderColor = 'var(--red)';
    btn.style.color = '#fff';
    document.querySelectorAll('.quiz-option').forEach(b => {
      if (b.textContent.trim() === correct.trim()) {
        b.style.background = 'var(--green)';
        b.style.borderColor = 'var(--green)';
        b.style.color = '#fff';
      }
    });
  }
  // Açıklama göster
  const q = quizQuestions[currentQuizIndex];
  if(q && q.explanation){
    feedback.innerHTML = '<div style="font-size:13px;color:var(--sub);line-height:1.6;margin-top:10px;padding:10px;background:var(--bg3);border-radius:10px;border-left:3px solid '+(isCorrect?'var(--green)':'var(--orange)')+'">💡 '+q.explanation+'</div>';
    feedback.style.display = 'block';
    feedback.style.cssText = 'display:block';
  } else if(!isCorrect){
    feedback.textContent = '✅ ' + correct;
    feedback.style.cssText = 'display:block;font-size:13px;font-weight:700;color:var(--muted);margin-top:8px;text-align:center';
  }
  const nxtBtn=document.getElementById('quizNextBtn'); if(nxtBtn) nxtBtn.style.display='block';
}

function nextQuizQuestion() {
  currentQuizIndex++;
  const nBtn=document.getElementById('quizNextBtn'); if(nBtn) nBtn.style.display='none';
  updateQuizProgress();
  showQuizQuestion();
}

function showQuizResults() {
  document.getElementById('quizContainer').style.display = 'none';
  document.getElementById('quizSetupCard').style.display = '';
  document.getElementById('quizResults').style.display = 'block';
  
  const percentage = (quizCorrectCount / quizQuestions.length) * 100;
  
  let emoji, title, msg;
  if (percentage >= 90) {
    emoji = '🏆';
    title = 'Mükemmel!';
    msg = 'Harika bir performans gösterdin!';
  } else if (percentage >= 70) {
    emoji = '🎉';
    title = 'Çok İyi!';
    msg = 'Başarılı bir test!';
  } else if (percentage >= 50) {
    emoji = '👍';
    title = 'İyi!';
    msg = 'Daha fazla çalışman gerekiyor.';
  } else {
    emoji = '💪';
    title = 'Daha Fazla Çalış!';
    msg = 'Bu kelimeleri tekrar et.';
  }
  
  document.getElementById('quizResultEmoji').textContent = emoji;
  document.getElementById('quizResultTitle').textContent = title;
  document.getElementById('quizFinalScore').textContent = `${quizCorrectCount}/${quizQuestions.length}`;
  document.getElementById('quizResultMsg').textContent = msg;
}

// ══════════════════════════════════════════════════════════
// GRAMMAR GUIDE
// ══════════════════════════════════════════════════════════
window.DEBUG_MODE = false; // Production'da false

// ══════════════════════════════════════════════════════════
// GROQ CONFIG
// ══════════════════════════════════════════════════════════
let GROQ_MODEL = localStorage.getItem("groq_model") || "llama-3.3-70b-versatile";
let GROQ_API_KEY = "";  // Backward compatibility
let dailyTasksDone = { game: false, shadow: false, story: false, sleep: false };

function saveGroqModel(){
  const selected = document.querySelector('input[name="groqModel"]:checked');
  if(!selected) return;
  GROQ_MODEL = selected.value;
  localStorage.setItem("groq_model", GROQ_MODEL);
  updateModelUI();
  showToast('✅ Model değiştirildi', GROQ_MODEL.split('-').slice(0,3).join(' '));
}

function updateModelUI(){
  // Radio seç
  const radios = document.querySelectorAll('input[name="groqModel"]');
  radios.forEach(r => {
    r.checked = r.value === GROQ_MODEL;
    const label = r.closest('label');
    if(label) label.style.borderColor = r.checked ? 'var(--blue)' : 'transparent';
  });
}

async function checkGroqUsage(){
  const el = document.getElementById('groqUsageDisplay');
  if(!el) return;
  if(!GROQ_API_KEYS || GROQ_API_KEYS.length === 0){ el.innerHTML = '<span style="color:var(--red)">❌ API key girilmemiş</span>'; return; }
  GROQ_API_KEY = GROQ_API_KEYS[0]; // İlk key'i kullan
  // Önce cache'den göster
  const cached = localStorage.getItem('groq_rate_info');
  if(cached) renderGroqUsage(JSON.parse(cached));
  el.innerHTML = (el.innerHTML||'') + '<div style="font-size:11px;color:var(--muted);margin-top:6px">⏳ Güncelleniyor...</div>';
  try {
    // Küçük bir test isteği yap — response header'larından limit bilgisi al
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1,
        messages: [{role:'user', content:'hi'}]
      })
    });

    const h = res.headers;
    const reqLimit   = h.get('x-ratelimit-limit-requests');
    const reqRemain  = h.get('x-ratelimit-remaining-requests');
    const reqReset   = h.get('x-ratelimit-reset-requests');
    const tokLimit   = h.get('x-ratelimit-limit-tokens');
    const tokRemain  = h.get('x-ratelimit-remaining-tokens');
    const tokReset   = h.get('x-ratelimit-reset-tokens');

    if(res.ok || res.status === 429){
      const reqPct = reqLimit && reqRemain ? Math.round((reqRemain/reqLimit)*100) : null;
      const tokPct = tokLimit && tokRemain ? Math.round((tokRemain/tokLimit)*100) : null;
      const reqColor = reqPct !== null ? (reqPct > 50 ? 'var(--green)' : reqPct > 20 ? 'var(--orange)' : 'var(--red)') : 'var(--muted)';
      const tokColor = tokPct !== null ? (tokPct > 50 ? 'var(--green)' : tokPct > 20 ? 'var(--orange)' : 'var(--red)') : 'var(--muted)';

      el.innerHTML = '<div style="background:var(--bg3);border-radius:10px;padding:12px;line-height:2">' +
        (res.status===429
          ? '⚠️ <b style="color:var(--red)">Rate limit doldu!</b><br>'
          : '✅ <b style="color:var(--green)">API Aktif</b> — ' + GROQ_MODEL.split('-').slice(0,4).join(' ') + '<br>') +
        (reqLimit
          ? '📨 İstek: <b style="color:'+reqColor+'">' + reqRemain + ' / ' + reqLimit + '</b>' +
            (reqPct!==null ? ' (%'+reqPct+')' : '') +
            (reqReset ? ' · ↺ '+reqReset : '') + '<br>'
          : '') +
        (tokLimit
          ? '🔤 Token: <b style="color:'+tokColor+'">' + Number(tokRemain).toLocaleString() + ' / ' + Number(tokLimit).toLocaleString() + '</b>' +
            (tokPct!==null ? ' (%'+tokPct+')' : '') +
            (tokReset ? ' · ↺ '+tokReset : '') + '<br>'
          : '') +
        '</div>';
    } else if(res.status === 401){
      el.innerHTML = '<span style="color:var(--red)">❌ Geçersiz API key</span>';
    } else {
      el.innerHTML = '<span style="color:var(--muted)">Durum alınamadı ('+res.status+')</span>';
    }
  } catch(e){
    el.innerHTML = '<span style="color:var(--red)">❌ Bağlantı hatası: '+e.message+'</span>';
  }
}

// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
// ═══════════════════════════════════════
// INDEXEDDB - SINIRSIZ VERİ SAKLAMA
// ═══════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// WMStore — Evrensel Veri Katmanı
// IndexedDB (birincil) + localStorage (fallback) + Klasör (yedek)
// Tüm uygulama bu API üzerinden veri okur/yazar
// ══════════════════════════════════════════════════════════════

