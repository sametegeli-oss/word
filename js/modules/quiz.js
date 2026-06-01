/* ════════════════════════════════════════════════════════════════
   WordMode — modül: quiz.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function openFlashcardMode(){
  showScreen("sc-flashcard");
  fcIdx=idx;
  fcWords=[...words];
  updateFcCounter();
  renderFlashcard();
}

function startQuiz(){
  phase="quiz";stopSpeech();
  const item=words[idx];
  const allTr=words.map(w=>w.tr);
  const pool=allTr.filter(t=>t!==item.tr).sort(()=>Math.random()-.5).slice(0,3);
  currentOptions=[...pool,item.tr].sort(()=>Math.random()-.5);
  let sentHTML=item.sentence?`<div class="wc-sent">${mkSentColored(item.sentence,item.highlights,item.colors)}</div>`:
    `<div style="font-size:18px;font-weight:800">"${item.word}" ne anlama gelir?</div>`;
  if(item.sentence&&item.sentenceTr) sentHTML+=`<div class="wc-sent-tr">${item.sentenceTr}</div>`;
  document.getElementById("wordCard").innerHTML=`<div class="wc-label">CÜMLE</div>${sentHTML}`;
  document.getElementById("quizQ").textContent=`"${item.word}" Türkçede ne demek?`;
  document.getElementById("optList").innerHTML=currentOptions.map((opt,i)=>
    `<button class="opt-btn" id="opt${i}" onclick="handleAnswer(${i})">${opt}</button>`).join("");
  document.getElementById("sentImgWrap").style.display="none";
  document.getElementById("pronunPanel").style.display="none";
  document.getElementById("quizArea").style.display="";
  document.getElementById("aiFeedback").style.display="none";
  document.getElementById("btnQuiz").style.display="none";
  document.getElementById("btnNext").style.display="none";
}
function handleAnswer(i){
  if(phase!=="quiz") return;
  phase="feedback";
  const opt=currentOptions[i];
  const item=words[idx];
  const ok=opt===item.tr;
  if(!wordStatus[item.word]) wordStatus[item.word]={attempts:0,correct:0,pronScore:null};
  wordStatus[item.word].attempts++;
  if(ok){
    streak++;
    correctCount++;
    wordStatus[item.word].correct++;
    learnedSet.add(item.word);
    // 10. Doğru yapınca yanlış listesinden çıkar
    wrongWords.delete(item.word);
    saveProgress();
    animCard("bounce");
  }
  else{
    score=Math.max(0,score-Math.ceil(100/words.length));
    streak=0;
    // 10. Yanlış kelimeyi kaydet
    wrongWords.add(item.word);
    wordAttempts[item.word] = (wordAttempts[item.word] || 0) + 1;
    saveProgress();
    animCard("shake");
  }
  updateScoreBar();
  currentOptions.forEach((o,j)=>{
    const btn=document.getElementById("opt"+j);if(!btn) return;
    if(o===item.tr) btn.classList.add("correct");
    else if(o===opt) btn.classList.add("wrong");
    else btn.classList.add("faded");
    btn.onclick=null;
  });
  const sb=document.getElementById("streakBadge");
  if(streak>=2){sb.style.display="";sb.textContent="🔥 "+streak;}else sb.style.display="none";
  const fb=document.getElementById("aiFeedback");
  fb.className="ai-box "+(ok?"ok":"fail");fb.style.display="";
  fb.innerHTML=ok?`<div class="ai-lbl ok">✅ Doğru!</div>${positiveFB(item.word)}`
    :`<div class="ai-lbl fail">❌ Yanlış</div>Doğru: <strong style="color:#4ade80">${item.tr}</strong>. ${correctiveFB(item.word)}`;
  const bn=document.getElementById("btnNext");
  bn.style.display="";bn.textContent=idx+1>=words.length?"Sonuçları Gör 🎉":"Sonraki →";
}
function positiveFB(w){return["Aferin! Devam et 💪","Harika! Bu kelimeyi iyi biliyorsun.",`"${w}" — mükemmel!`][Math.floor(Math.random()*3)];}
function correctiveFB(w){return["Tekrar karşına geldiğinde hatırlarsın!","Pratik mükemmelleştirir, devam et!","Bir dahaki sefere bileceksin!"][Math.floor(Math.random()*3)];}

// ══════════════════════════════════════════════════════════
// DONE
// ══════════════════════════════════════════════════════════
function showDone(){
  saveProgress();showScreen("sc-done");
  document.getElementById("doneMsg").innerHTML=`${words.length} kelimeden <strong style="color:var(--green)">${correctCount}</strong> tanesini doğru bildin.`;
  document.getElementById("doneScore").textContent=score;
  document.getElementById("doneScoreSub").textContent=score>=85?"Mükemmel! 🌟":score>=70?"İyi iş 👍":score>=50?"Pratik yap 💪":"Tekrar dene 🔄";
}

// ══════════════════════════════════════════════════════════
// SPEECH RECOGNITION (Word Mode)
// ══════════════════════════════════════════════════════════
function resetPronun(){
  stopSpeech();lastAudioBlob=null;
  if(lastAudioURL){URL.revokeObjectURL(lastAudioURL);lastAudioURL=null;}
  document.getElementById("pronunResult").style.display="none";
  document.getElementById("pronunResult").innerHTML="";
  document.getElementById("playbackRow").style.display="none";
  document.getElementById("liveTx").className="live-tx";
  document.getElementById("liveTx").innerHTML="";
  setMicState("idle");
}


// ══════════════════════════════════════════════════════════
// STABIL MIKROFON TEMIZLEME KATMANI
// - Native SpeechRecognition korunur.
// - getUserMedia ile açılan tüm stream track'leri takip edilir.
// - Stop/abort sonrası mikrofon fiziksel olarak kapanır.
// ══════════════════════════════════════════════════════════
(function(){
  if(window.__wmStableMicInstalled) return;
  window.__wmStableMicInstalled = true;
  window.__wmOpenMicStreams = window.__wmOpenMicStreams || new Set();

  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !navigator.mediaDevices.__wmTracked){
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function(constraints){
      const stream = await originalGetUserMedia(constraints);
      try{
        if(constraints && constraints.audio){
          window.__wmOpenMicStreams.add(stream);
          stream.getTracks().forEach(track=>{
            track.addEventListener && track.addEventListener('ended',()=>window.__wmOpenMicStreams.delete(stream));
          });
        }
      }catch(e){}
      return stream;
    };
    navigator.mediaDevices.__wmTracked = true;
  }

  window.wmStopOpenMicStreams = function(){
    try{
      window.__wmOpenMicStreams.forEach(stream=>{
        try{ stream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} }); }catch(e){}
      });
      window.__wmOpenMicStreams.clear();
    }catch(e){}
  };

  window.wmResetMicButtons = function(){
    try{
      document.querySelectorAll('.mic-btn').forEach(btn=>{
        btn.classList.remove('rec','loading','listening');
        btn.classList.add('idle');
        if(btn.textContent && /⏹|🔴|Dinleniyor/.test(btn.textContent)) btn.textContent='🎤';
      });
      document.querySelectorAll('.chat-mic').forEach(btn=>{
        btn.classList.remove('listening');
        btn.textContent='🎤';
      });
    }catch(e){}
  };

  window.wmHardStopMic = function(){
    ['recognition','smRec','chatRecognition','contextRecognition','partnerRecognition','teacherRecognition','correctorRecognition','shadowRecognition','accentRecognition'].forEach(name=>{
      try{
        const r = window[name];
        if(r){
          try{ r.stop(); }catch(e){}
          try{ r.abort && r.abort(); }catch(e){}
        }
      }catch(e){}
    });
    ['mediaRecorder','correctorMediaRecorder','shadowMediaRecorder','accentMediaRecorder','selfMediaRecorder'].forEach(name=>{
      try{
        const r = window[name];
        if(r && r.state && r.state !== 'inactive') r.stop();
      }catch(e){}
    });
    window.wmStopOpenMicStreams();
    window.wmResetMicButtons();
    window.isListening=false;
    window.smIsListening=false;
    window.isChatListening=false;
    window.isContextListening=false;
    window.partnerListening=false;
    window.isTeacherListening=false;
  };

  document.addEventListener('visibilitychange',()=>{ if(document.hidden) window.wmHardStopMic(); });
  window.addEventListener('pagehide',()=>window.wmHardStopMic());
})();
function setMicState(state,btnId="micBtn",lblId="micLbl"){
  const btn=document.getElementById(btnId);
  const lbl=document.getElementById(lblId);
  if(!btn) return;
  btn.className="mic-btn "+state;
  if(state==="idle"){btn.textContent="🎤";if(lbl){lbl.textContent="Bas ve oku";lbl.className="mic-lbl";}}
  if(state==="rec"){btn.textContent="⏹";if(lbl){lbl.textContent="Dinleniyor…";lbl.className="mic-lbl rec";}}
  if(state==="loading"){btn.textContent="⏳";if(lbl){lbl.textContent="Değerlendiriliyor…";lbl.className="mic-lbl";}}
}
function toggleSpeech(){if(isListening)stopSpeech();else startSpeech();}
function startSpeech(){
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert("Chrome gerekli.");return;}
  startAudioRec();
  recognition=new SR();
  recognition.lang="en-US";
  recognition.continuous=false;
  recognition.interimResults=false; // mobile'da daha güvenilir
  recognition.maxAlternatives=3;
  const lt=document.getElementById("liveTx");
  lt.className="live-tx show";
  lt.innerHTML="<em>Dinleniyor…</em>";
  
  let collectedFinal="";
  let collectedAlts=[];

  recognition.onstart=()=>{isListening=true;setMicState("rec");};
  
  recognition.onresult=e=>{
    collectedFinal="";
    collectedAlts=[];
    for(let i=0;i<e.results.length;i++){
      if(e.results[i].isFinal||!recognition.interimResults){
        collectedFinal+=e.results[i][0].transcript;
        for(let j=0;j<e.results[i].length;j++){
          collectedAlts.push(e.results[i][j].transcript.trim().toLowerCase());
        }
      }
    }
    if(collectedFinal){
      lt.innerHTML=`<span class="heard">${collectedFinal}</span>`;
    }
  };

  recognition.onerror=e=>{
    isListening=false;stopAudioRec();setMicState("idle");
    lt.innerHTML=`<em style="color:var(--red)">${e.error==="no-speech"?"Ses algılanamadı — tekrar dene":e.error}</em>`;
  };

  recognition.onend=()=>{
    isListening=false;
    stopAudioRec();
    if(collectedFinal){
      setMicState("idle");
      scorePronun(collectedFinal.trim(), collectedAlts, "pronunResult", "playbackRow");
    } else {
      setMicState("idle");
      if(lt.innerHTML.includes("Dinleniyor")){
        lt.innerHTML=`<em style="color:var(--muted)">Ses algılanamadı — tekrar dene</em>`;
      }
    }
  };

  recognition.start();
}
function stopSpeech(){
  // Speech Recognition'ı durdur
  if(recognition){try{recognition.stop();}catch(e){}}
  isListening=false;
  
  // TTS'i TAMAMEN durdur - çoklu metod
  if(window.speechSynthesis){
    // 1. Önce cancel
    window.speechSynthesis.cancel();
    
    // 2. Pause + Resume + Cancel (iOS/Safari için)
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    
    // 3. Boş utterance ile kuyruk temizle
    const silence = new SpeechSynthesisUtterance('');
    silence.volume = 0;
    silence.text = '';
    window.speechSynthesis.speak(silence);
    window.speechSynthesis.cancel();
    
    // 4. Son kez cancel - garantili durdurma
    setTimeout(() => {
      window.speechSynthesis.cancel();
    }, 50);
  }
  
  console.log('🔇 Ses durduruldu');

  try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
}
function startAudioRec(){
  audioChunks=[];
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":
      MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":"";
    mediaRecorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});
    mediaRecorder.ondataavailable=e=>{if(e.data.size>0)audioChunks.push(e.data);};
    mediaRecorder.onstop=()=>{
      try{ mediaRecorder.stream && mediaRecorder.stream.getTracks().forEach(t=>t.stop()); }catch(e){}
      stream.getTracks().forEach(t=>t.stop());
      if(audioChunks.length>0){
        lastAudioBlob=new Blob(audioChunks,{type:mime||"audio/webm"});
        if(lastAudioURL) URL.revokeObjectURL(lastAudioURL);
        lastAudioURL=URL.createObjectURL(lastAudioBlob);
      }
    };
    mediaRecorder.start();
  }).catch(()=>{});
}
function stopAudioRec(){if(mediaRecorder&&mediaRecorder.state!=="inactive")try{mediaRecorder.stop();}catch(e){}}
function playRec(){
  if(!lastAudioURL){return;}
  if(audioPlayer){audioPlayer.pause();audioPlayer=null;}
  audioPlayer=new Audio(lastAudioURL);
  const btn=document.querySelector(".play-btn.play");
  if(btn) btn.textContent="▶ Oynatılıyor…";
  audioPlayer.play();
  audioPlayer.onended=()=>{if(btn) btn.textContent="▶ Kaydı Konuş";};
}

// ── Harf bazlı renkli karşılaştırma (Needleman-Wunsch Alignment) ──
function alignStringsNW(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m+1}, (_, i) =>
    Array.from({length: n+1}, (_, j) => i===0 ? -j : j===0 ? -i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.max(
        dp[i-1][j-1] + (s1[i-1] === s2[j-1] ? 2 : -1),
        dp[i-1][j] - 1,
        dp[i][j-1] - 1
      );
  let a1 = '', a2 = '', i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i-1][j-1] + (s1[i-1]===s2[j-1] ? 2 : -1)) {
      a1 = s1[i-1] + a1; a2 = s2[j-1] + a2; i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i-1][j] - 1) {
      a1 = s1[i-1] + a1; a2 = '-' + a2; i--;
    } else {
      a1 = '-' + a1; a2 = s2[j-1] + a2; j--;
    }
  }
  return { a1, a2 };
}

function colorLetters(target, heard) {
  const tWords = target.split(/\s+/);
  const hWords = heard.split(/\s+/);

  return tWords.map((tw, wi) => {
    const hw = hWords[wi] || '';

    if (tw === hw) {
      return `<span style="display:inline-flex;gap:1px;margin:2px">${
        tw.split('').map(l =>
          `<span style="color:#4ade80;font-weight:800;font-size:17px">${l}</span>`
        ).join('')
      }</span>`;
    }

    const { a1, a2 } = alignStringsNW(tw, hw);
    let html = `<span style="display:inline-flex;gap:1px;margin:2px">`;

    for (let i = 0; i < a1.length; i++) {
      const tl = a1[i];
      const hl = a2[i];
      if (tl === '-') continue;
      if (tl === hl) {
        html += `<span style="color:#4ade80;font-weight:800;font-size:17px">${tl}</span>`;
      } else if (hl === '-') {
        html += `<span style="color:#f87171;opacity:.4;font-weight:800;font-size:17px;text-decoration:line-through" title="'${tl}' sesi eksik">${tl}</span>`;
      } else {
        html += `<span style="color:#f87171;font-weight:800;font-size:17px;text-decoration:underline wavy" title="'${tl}' yerine '${hl}' söylendi">${tl}</span>`;
      }
    }

    html += `</span>`;
    return html;
  }).join(' ');
}

// Türkçe sesli okuma
function speakTurkish(text) {
  if (!text) return;
  stopSpeech();
  const utt = new SpeechSynthesisUtterance(text);
  // Türkçe ses ara
  const voices = speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr')) || null;
  if (trVoice) utt.voice = trVoice;
  utt.lang = 'tr-TR';
  utt.rate = ttsRateTR;  speechSynthesis.speak(utt);
}

// ── Pronunciation Scoring ──
function scorePronun(heard,alts,resultId,playbackId){
  try{
    const item=words[idx];
    if(!item){document.getElementById("liveTx").innerHTML="<em style='color:var(--red)'>Kelime bulunamadı</em>";return;}
    const target=item.sentence||item.word;
    const norm=s=>s.toLowerCase().replace(/[^a-z\s']/g,"").trim();
    const tNorm=norm(target);
    let bestScore=0,bestHeard=norm(heard);
    for(const alt of[norm(heard),...alts.map(norm)]){
      const s=calcPronScore(tNorm,alt);
      if(s>bestScore){bestScore=s;bestHeard=alt;}
    }
    const tWords=tNorm.split(/\s+/),hWords=bestHeard.split(/\s+/);
    const sc=Math.round(bestScore);
    const rc=sc>=85?"ex":sc>=70?"good":sc>=50?"fair":"poor";
    const lbl=sc>=85?"Mükemmel 🌟":sc>=70?"İyi 👍":sc>=50?"Gelişiyor 💪":"Tekrar dene 🔄";
    const missed=tWords.filter(tw=>!hWords.find(hw=>hw===tw||levDist(hw,tw)<=1));
    const tip=missed.length===0?"Tüm kelimeleri doğru söyledin!":missed.length<=2?`"${missed.join('","')}" kelimelerini tekrar çalış.`:"Yavaşça kelime kelime söyle.";

    // Türkçe karşılık
    const trText = item.sentenceTr || item.tr || '';

    if(!wordStatus[item.word]) wordStatus[item.word]={attempts:0,correct:0,pronScore:null};
    wordStatus[item.word].pronScore=sc;
    try{saveProgress();}catch(e){}
    try{
      wmSavePronunciationHistoryEntry({time:Date.now(),word:item.word,target:target,heard:bestHeard||heard,score:sc,mode:'word'});
    }catch(e){}

    // Harf bazlı renkli karşılaştırma
    const coloredLetters = colorLetters(tNorm, bestHeard);

    // Sonucu doğrudan liveTx'e yaz
    const lt=document.getElementById("liveTx");
    if(lt){
      lt.innerHTML=`
        <div style="margin-bottom:8px;font-size:12px;color:var(--muted)">Duyulan: <span style="color:var(--text);font-weight:700">"${bestHeard||heard}"</span></div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;background:var(--bg3);border-radius:12px;padding:10px">
          <div style="width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0;background:${rc==='ex'?'#16a34a':rc==='good'?'#1d4ed8':rc==='fair'?'#ea580c':'#dc2626'}">${sc}</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:var(--text)">${lbl}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Telaffuz skoru</div>
          </div>
        </div>

        <div style="background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px">
          <div style="font-size:10px;font-weight:800;color:var(--muted);margin-bottom:8px;letter-spacing:1px">HARF BAZLI ANALİZ</div>
          <div style="line-height:2.2;word-break:break-all">${coloredLetters}</div>
          <div style="display:flex;gap:12px;margin-top:8px;font-size:11px">
            <span><span style="color:#4ade80;font-weight:800">■</span> Doğru</span>
            <span><span style="color:#f87171;font-weight:800">■</span> Yanlış/Eksik</span>
          </div>
        </div>

        ${trText ? `
        <div style="background:#1a0a2e;border:1px solid var(--purple);border-radius:10px;padding:10px;margin-bottom:8px;display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:10px;font-weight:800;color:var(--purple);margin-bottom:3px">🇹🇷 TÜRKÇE ANLAM</div>
            <div style="font-size:13px;color:var(--sub)">${trText}</div>
          </div>
          <button onclick="speakTurkish('${trText.replace(/'/g,"\\'")}')" style="padding:6px 10px;background:#4c1d95;border:none;border-radius:8px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:#c4b5fd;flex-shrink:0">🔊 Konuş</button>
        </div>` : ''}

        <div style="background:#1e1635;border-radius:8px;padding:8px 10px;font-size:12px;color:#c4b5fd;margin-bottom:10px">💡 ${tip}</div>

        <div style="display:flex;gap:8px">
          <button onclick="resetPronun()" style="flex:1;padding:8px;background:var(--bg3);border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;color:var(--sub)">🔄 Tekrar</button>
          <button onclick="playRec()" style="flex:1;padding:8px;background:#1e3a5f;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;color:#93c5fd">▶ Kaydımı Konuş</button>
          <button onclick="speak('${tNorm.replace(/'/g,"\\'")}','en-US')" style="flex:1;padding:8px;background:#052e16;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;cursor:pointer;color:#4ade80">🔊 Doğrusu</button>
        </div>
        <button id="pronunAddLearnBtn" onclick="addCurrentPronunWordToLearnList()" style="width:100%;margin-top:8px;padding:9px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;color:#052e16">📌 Ezberleneceklere Ekle</button>`;
      lt.className="live-tx show";
    }
  }catch(err){
    const lt=document.getElementById("liveTx");
    if(lt) lt.innerHTML=`<em style="color:var(--red)">Hata: ${err.message}</em>`;
    console.error("scorePronun hata:",err);
  }
}
function calcPronScore(t,h){
  if(!h) return 0;
  const tw=t.split(/\s+/),hw=h.split(/\s+/);
  let ok=0;tw.forEach(x=>{if(hw.find(y=>y===x||levDist(y,x)<=1))ok++;});
  return Math.round((ok/tw.length)*70+(1-levDist(t,h)/Math.max(t.length,h.length))*30);
}
function levDist(a,b){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ══════════════════════════════════════════════════════════
// SENTENCE IMAGE
// ══════════════════════════════════════════════════════════
async function loadSentenceImage(sentence,word){
  console.log('📷 loadSentenceImage çağrıldı:', word, sentence);
  const wrap=document.getElementById("sentImgWrap");
  const img=document.getElementById("sentImg");
  const credit=document.getElementById("imgCredit");
  if(!wrap||!img) {
    console.error('❌ sentImgWrap veya sentImg elementi yok!');
    return;
  }
  wrap.style.display="none";img.style.display="block";img.src="";credit.innerHTML="";
  
  // Kelime resimleri kapalıysa yükleme
  if(!enableWordImages) {
    console.log('⏹️ Kelime resimleri kapalı, yükleme yapılmıyor');
    return;
  }
  
  // NSFW kelime filtresi - bu kelimelerde görsel gösterme
  const nsfwWords = new Set([
    'give','take','come','blow','suck','lick','cock','dick','pussy','sex','fuck','ass','breast','penis','vagina',
    'orgasm','masturbate','porn','nude','naked','strip','erotic','arousal','seduce','horny','anal','oral',
    'ejaculate','penetrate','climax','cum','sperm','viagra','condom','dildo','vibrator','fetish','kinky'
  ]);
  
  const wordLower = word.toLowerCase();
  const sentenceLower = (sentence || '').toLowerCase();
  
  // Kelime veya cümle NSFW içeriyorsa görsel yükleme
  if (nsfwWords.has(wordLower) || [...nsfwWords].some(w => sentenceLower.includes(w))) {
    console.log('🚫 NSFW kelime tespit edildi, görsel gösterilmiyor');
    return;
  }
  
  console.log('✅ Kelime resimleri açık, resim aranıyor...');
  
  const stop=new Set(["the","a","an","is","are","was","were","be","have","had","do","did","will","would","could","should","to","of","in","on","at","by","for","with","and","or","but","not","it","this","that","they","we","he","she","i","you","my","as","so","ever","before","after"]);
  const kw=[...new Set([word.toLowerCase(),...(sentence||"").replace(/[^a-zA-Z ]/g," ").split(" ").map(w=>w.toLowerCase().trim()).filter(w=>w.length>3&&!stop.has(w))])].slice(0,3);
  for(const q of[kw[0],kw.slice(0,2).join(" "),kw.join(" ")]){
    try{
      const url="https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilimit=1&titles="+encodeURIComponent(q);
      const res=await fetch(url);const data=await res.json();
      const pages=Object.values((data.query&&data.query.pages)||{});
      const page=pages.find(p=>p.thumbnail);
      if(page&&page.thumbnail?.source){
        console.log('✅ Wikipedia resim bulundu:', page.thumbnail.source);
        img.src=page.thumbnail.source;
        img.onload=()=>{
          console.log('✅ Resim yüklendi, gösteriliyor');
          wrap.style.display="block";
          credit.innerHTML="📷 Wikipedia";
        };
        img.onerror=()=>{
          console.error('❌ Resim yüklenemedi');
          wrap.style.display="none";
        };
        return;
      }
    }catch(e){
      console.warn('Wikipedia resim alınamadı:', e.message);
    }
  }
  // search fallback
  try{
    const url="https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch="+encodeURIComponent(kw[0])+"&srlimit=5";
    const res=await fetch(url);const data=await res.json();
    const results=(data.query&&data.query.search)||[];
    for(const r of results){
      const u2="https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilimit=1&pageids="+r.pageid;
      const r2=await fetch(u2);const d2=await r2.json();
      const pg=Object.values((d2.query&&d2.query.pages)||{}).find(p=>p.thumbnail);
      if(pg){img.src=pg.thumbnail.source;img.onload=()=>{wrap.style.display="block";credit.innerHTML="📷 Wikipedia";};img.onerror=()=>{wrap.style.display="none";};return;}
    }
  }catch(e){}
}

// ══════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════
function switchTab(tab){
  // Telaffuz ekranından çıkıldığında mikrofonu zorla kapat (mikrofonun açık kalmasını önler)
  if (typeof spForceCleanup === 'function' && currentTab === 'pronstandalone' && tab !== 'pronstandalone') {
    spForceCleanup();
  }

  if(tab==="realnew"){
    currentTab = tab;
    document.querySelectorAll(".bnav-btn").forEach(b=>b.classList.remove("active"));
    document.getElementById("bn-realnew")?.classList.add("active");
    showScreen("sc-realnew");
    return;
  }

  // Ana menüyü gizle
  document.getElementById("sc-menu").classList.remove("active");
  document.getElementById("sc-menu").style.display = "none";
  
  currentTab=tab;
  document.querySelectorAll(".bnav-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("bn-"+tab)?.classList.add("active");
  if(tab==="word"){showScreen("sc-word");if(words.length) renderLearn();}
  else if(tab==="flashcard"){showScreen("sc-flashcard");if(!fcWords.length)initFlashcards();else renderFlashcard();}
  else if(tab==="sent"){showScreen("sc-sent");renderSentMode();}
  else if(tab==="letter"){showScreen("sc-letter");renderLetterMode();}
  else if(tab==="daily"){showScreen("sc-daily");initDailyDashboard();}
  else if(tab==="pronstandalone"){showScreen("sc-pronstandalone");if(typeof initStandalonePron==='function')initStandalonePron();}
  else if(tab==="stats"){showScreen("sc-stats");renderStats();}
  else if(tab==="games"){showScreen("sc-games");openGamesMenu();}
  else if(tab==="ai"){showScreen("sc-ai");if(!chatHistory.length)initAIChat();}
  else if(tab==="askai"){showScreen("sc-askai");if(typeof initAskAIPage==='function')initAskAIPage();}
  else if(tab==="dictbuilder"){showScreen("sc-dictbuilder");if(typeof initDictBuilder==='function')initDictBuilder();}
  else if(tab==="cameraCoach"){showScreen("sc-camera-coach");if(typeof initCameraCoach==='function')initCameraCoach();}
  else if(tab==="learned"){showScreen("sc-learned");renderLearnedWordsScreen();}
  else if(tab==="settings"){showScreen("sc-settings");loadAITokenSettings();updateLastSaveTime();if(typeof renderPromptsUI==='function')renderPromptsUI();}
}

// Liste seçici göster
function showListSelector(){
  // ✅ Doğru kaynak: multiLists (eskiden yanlışlıkla 'wordLists' okunuyordu)
  const lists = (typeof multiLists !== 'undefined' && multiLists) ? multiLists : [];
  const currentId = (typeof activeListId !== 'undefined') ? activeListId : null;

  let html = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px" onclick="this.remove()">';
  html += '<div style="background:var(--bg);padding:20px;border-radius:16px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;border:1px solid var(--border)" onclick="event.stopPropagation()">';
  html += '<h3 style="margin:0 0 16px 0;font-family:\'Nunito\',sans-serif;color:var(--text)">📚 Listelerim</h3>';

  // "Ana Liste" — aktif liste yoksa burada
  const isMainActive = !currentId;
  html += `<div onclick="_pickMainList()" style="padding:12px;background:${isMainActive?'var(--blue)':'var(--bg2)'};color:${isMainActive?'#fff':'var(--text)'};border-radius:10px;margin-bottom:8px;cursor:pointer;font-weight:${isMainActive?'700':'500'};font-family:'Nunito',sans-serif">📖 Ana Liste ${isMainActive?'✓':''}</div>`;

  // Kullanıcının kendi listeleri (multiLists)
  if (lists.length === 0) {
    html += '<div style="padding:12px;color:var(--muted);font-size:12px;text-align:center;font-family:\'Nunito\',sans-serif">Henüz başka liste yok.</div>';
  } else {
    lists.forEach(l => {
      const isActive = l.id === currentId;
      const pct = l.wordCount > 0 ? '' : '';
      html += `<div onclick="_pickMultiList('${l.id.replace(/'/g,"\\'")}')" style="padding:12px;background:${isActive?'var(--blue)':'var(--bg2)'};color:${isActive?'#fff':'var(--text)'};border-radius:10px;margin-bottom:8px;cursor:pointer;font-weight:${isActive?'700':'500'};font-family:'Nunito',sans-serif;display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span>${l.emoji||'📝'} ${l.name}</span>
        <span style="font-size:11px;opacity:.7">${l.wordCount||0} kelime${isActive?' ✓':''}</span>
      </div>`;
    });
  }

  html += '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:10px;margin-top:12px;cursor:pointer;font-weight:700;font-family:\'Nunito\',sans-serif">Kapat</button>';
  html += '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

// Modal'dan ana liste seçimi
function _pickMainList() {
  // Modal'ı kapat
  document.querySelectorAll('div[style*="position:fixed"][style*="z-index:10000"]').forEach(el => el.remove());
  // Zaten ana listedeyse bir şey yapma
  if (!activeListId) return;
  // multiList'ten ana listeye dönüş: aktif liste id'sini temizle ve eski ana liste verisini yükle
  // En basiti: kullanıcıyı kelime listesi ekranına yönlendir, böylece "Ana Liste" yolunu seçebilir
  try {
    // İlerlemeyi kaydet
    if (activeListId && typeof wordStatus !== 'undefined') {
      const currentProgress = { wordStatus, learnedSet: [...learnedSet], spacedRepetition };
      localStorage.setItem('listProgress_' + activeListId, JSON.stringify(currentProgress));
    }
    activeListId = null;
    localStorage.removeItem('activeListId');
    localStorage.setItem('activeListName','Ana Liste');
    localStorage.setItem('wm.activeListName','Ana Liste');
    localStorage.setItem('currentListName','Ana Liste');
    if (typeof setActiveListTitle === 'function') setActiveListTitle('Ana Liste');
    // Ana listeye dön — multi-list listeleme ekranına git, kullanıcı oradan yönetir
    if (typeof showList === 'function') showList();
    else if (typeof showScreen === 'function') showScreen('sc-multilist');
  } catch(e) { console.warn('Ana liste seçimi hatası:', e); }
  showToast('📖 Ana Liste', 'Aktif liste sıfırlandı');
}

// Modal'dan multiList seçimi
function _pickMultiList(id) {
  document.querySelectorAll('div[style*="position:fixed"][style*="z-index:10000"]').forEach(el => el.remove());
  if (typeof switchToList === 'function') switchToList(id);
}

// Liste değiştir
function switchList(listId){
  localStorage.setItem('currentListId',listId);
  
  // Liste ismini güncelle
  const lists = JSON.parse(localStorage.getItem('wordLists')||'[]');
  const list = lists.find(l=>l.id===listId);
  const listName = list ? list.name : 'Ana Liste';
  document.getElementById('currentListName').textContent = listName;
  
  // Kelimeleri yükle
  loadWordsFromList(listId);
  
  // Popup'ı kapat
  document.querySelector('[style*="position:fixed"]')?.remove();
  
  showToast('✅ '+listName,'Aktif liste');
}

// Listeden kelimeleri yükle
function loadWordsFromList(listId){
  if(listId==='default'){
    // Ana liste - learnedWords
    allWords = JSON.parse(localStorage.getItem('learnedWords')||'[]');
  }else{
    // Özel liste
    const lists = JSON.parse(localStorage.getItem('wordLists')||'[]');
    const list = lists.find(l=>l.id===listId);
    allWords = list ? list.words : [];
  }
  
  words = allWords;
  idx = 0;
  
  // Kelime sayısını güncelle
  updateWordCounter();
}

// Yeni liste oluştur
function createNewList(){
  const name = prompt('Liste adı:');
  if(!name) return;
  
  const emoji = prompt('Emoji (opsiyonel):') || '📝';
  
  const lists = JSON.parse(localStorage.getItem('wordLists')||'[]');
  const newList = {
    id: 'list_'+Date.now(),
    name: name,
    emoji: emoji,
    words: [],
    createdAt: Date.now()
  };
  
  lists.push(newList);
  localStorage.setItem('wordLists',JSON.stringify(lists));
  
  showToast('✅ Liste oluşturuldu',name);
  
  // Popup'ı kapat ve yeniden aç
  document.querySelector('[style*="position:fixed"]')?.remove();
  showListSelector();
}

function goHome() {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  document.getElementById("sc-menu").classList.add("active");
  document.getElementById("sc-menu").style.display = "block";
  document.getElementById("bottomNav").style.display = "none";
}

// ══════════════════════════════════════════════════════════
// SENTENCE MODE
// ══════════════════════════════════════════════════════════
function initFlashcards(){
  fcWords=[...words].sort(()=>Math.random()-.5);
  fcIdx=0;
  fcFlipped=false;
  renderFlashcard();
}

function renderFlashcard(){
  if(!fcWords.length){
    document.querySelector("#sc-flashcard .card").innerHTML="<p style='color:var(--muted);text-align:center;padding:20px'>Kelime yükle ve başla.</p>";
    return;
  }
  if(fcIdx>=fcWords.length){
    document.querySelector("#sc-flashcard .card").innerHTML=`
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:64px;margin-bottom:16px">🎉</div>
        <h3 style="font-size:20px;margin-bottom:8px">Tebrikler!</h3>
        <p style="color:var(--muted);margin-bottom:20px">Tüm kartları tamamladın!</p>
        <button class="btn btn-blue" onclick="restartFlashcards()">🔄 Tekrar Başla</button>
      </div>`;
    return;
  }
  
  const item=fcWords[fcIdx];
  document.getElementById("fcCounter").textContent=(fcIdx+1)+" / "+fcWords.length;
  
  // Ön yüz: İngilizce cümle
  document.getElementById("fcSentence").textContent=item.sentence||item.word;
  
  // Arka yüz: Türkçe çeviri + kelime
  document.getElementById("fcSentenceTr").textContent=item.sentenceTr||item.tr||"";
  document.getElementById("fcWord").textContent=item.word + (item.phonetic ? " • " + item.phonetic : "");
  
  document.getElementById("flashcardInner").classList.remove("flipped");
  fcFlipped=false;
}

function flipCard(){
  fcFlipped=!fcFlipped;
  const inner=document.getElementById("flashcardInner");
  if(fcFlipped) inner.classList.add("flipped");
  else inner.classList.remove("flipped");
}

function fcAgain(){
  // Tekrar göster - kartı listenin sonuna ekle
  const current=fcWords[fcIdx];
  fcWords.splice(fcIdx,1);
  fcWords.push(current);
  renderFlashcard();
}

function fcKnow(){
  // Biliyorum - sonraki karta geç
  fcIdx++;
  renderFlashcard();
}

function shuffleFlashcards(){
  fcWords.sort(()=>Math.random()-.5);
  fcIdx=0;
  renderFlashcard();
}

function restartFlashcards(){
  fcIdx=0;
  shuffleFlashcards();
}

function speakFlashcard(){
  const item=fcWords[fcIdx];
  if(!item) return;
  if(fcFlipped){
    // Arka yüz: Türkçe cümle
    speak(item.sentenceTr || item.tr,"tr-TR");
  }else{
    // Ön yüz: İngilizce cümle
    speak(item.sentence || item.word,"en-US");
  }
}

// ══════════════════════════════════════════════════════════
// GELİŞMİŞ AI CHAT (GROQ API)
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// GROQ MULTI-KEY ROTATION SİSTEMİ
// ══════════════════════════════════════════════════════════

