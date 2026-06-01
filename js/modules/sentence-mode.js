/* ════════════════════════════════════════════════════════════════
   WordMode — modül: sentence-mode.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let smSelected=null;

function renderSentMode(){
  if(!smWords.length){document.querySelector("#sc-sent .card").innerHTML="<p style='color:var(--muted);text-align:center;padding:20px'>Kelime yükle ve Word Mode'dan başla.</p>";return;}
  if(smIdx>=smWords.length) smIdx=0;
  const item=smWords[smIdx];
  document.getElementById("smCounter").textContent=(smIdx+1)+" / "+smWords.length;
  const sent=item.sentence||item.word;
  const tokenWords=sent.split(/(\s+)/).filter(t=>t.trim());
  const shuffled=[...tokenWords].sort(()=>Math.random()-.5);
  smSelected=null;
  document.getElementById("smAnswer").innerHTML="";
  document.getElementById("smBank").innerHTML=shuffled.map((w,i)=>{
    const clean=w.replace(/[^a-zA-Z]/g,"").toLowerCase();
    const found=allWords.find(x=>x.word.toLowerCase()===clean);
    const wTr=found?found.tr:(clean===item.word.toLowerCase()?item.tr:"");
    return `<div class="sm-word" id="smw${i}" data-word="${w}" data-idx="${i}" data-tr="${(wTr||'').replace(/"/g,'&quot;')}"
      onclick="smWordClick(${i})"
      onpointerdown="smLongPressStart(${i})"
      onpointerup="smLongPressEnd()"
      onpointercancel="smLongPressEnd()">
      ${w}
      <div class="word-tooltip" id="tip${i}"></div>
    </div>`;
  }).join("");
  document.getElementById("smFeedback").style.display="none";
  document.getElementById("smNext").style.display="none";
  document.getElementById("smPronunResult").style.display="none";
  const spb=document.getElementById("smBtnPrev");
  const snb=document.getElementById("smBtnNext");
  if(spb)spb.disabled=(smIdx===0);
  if(snb)snb.disabled=(smIdx>=smWords.length-1);
  resetSMSpeech();
}

let lpTimer=null;
const tipCache={};

let smLongPressed=false;
function smLongPressStart(i){
  smLongPressed=false;
  lpTimer=setTimeout(()=>{
    smLongPressed=true;
    const el=document.getElementById("smw"+i);
    if(!el) return;
    const rawWord=el.dataset.word||"";
    const clean=rawWord.replace(/[^a-zA-Z]/g,"").toLowerCase();
    if(!clean) return;
    navigator.vibrate&&navigator.vibrate(50);
    _explainWordImpl(clean,'chatMessages');
  },600);
}
function smLongPressEnd(){clearTimeout(lpTimer);}

function smWordClick(i){
  if(smLongPressed){smLongPressed=false;return;}
  const el=document.getElementById("smw"+i);
  if(!el||el.dataset.placed==="1") return;
  // move to answer
  el.dataset.placed="1";
  el.style.opacity="0.3";
  const w=el.dataset.word;
  const ansEl=document.getElementById("smAnswer");
  const slot=document.createElement("div");
  slot.className="sm-word";slot.textContent=w;slot.dataset.srcIdx=i;
  slot.onclick=()=>{
    // return to bank
    el.style.opacity="1";el.dataset.placed="0";
    slot.remove();
  };
  ansEl.appendChild(slot);
}

function checkSentence(){
  const item=smWords[smIdx];
  const sent=item.sentence||item.word;
  const correct=sent.split(/(\s+)/).filter(t=>t.trim());
  const answer=[...document.getElementById("smAnswer").querySelectorAll(".sm-word")].map(el=>el.textContent.trim());
  if(answer.length===0){alert("Önce kelimeleri sırala!");return;}
  const isCorrect=answer.join(" ")===correct.join(" ");
  const fb=document.getElementById("smFeedback");
  fb.style.display="block";
  if(isCorrect){
    fb.style.background="#052e16";fb.style.color="#4ade80";fb.style.border="1.5px solid #166534";
    fb.textContent="✅ Harika! Doğru sıraladın!";
    document.getElementById("smNext").style.display="";
    // color words green
    document.getElementById("smAnswer").querySelectorAll(".sm-word").forEach(el=>el.classList.add("correct"));
  }else{
    fb.style.background="#1c0a00";fb.style.color="#fb923c";fb.style.border="1.5px solid #7c2d12";
    fb.textContent="❌ Yanlış. Doğru: "+correct.join(" ");
    document.getElementById("smAnswer").querySelectorAll(".sm-word").forEach((el,i)=>{
      el.classList.add(el.textContent.trim()===correct[i]?"correct":"wrong");
    });
    document.getElementById("smNext").style.display="";
  }
}
function resetSentMode(){smSelected=null;renderSentMode();}
function smPrev(){if(smIdx>0){smIdx--;renderSentMode();}}
function smNavNext(){if(smIdx<smWords.length-1){smIdx++;renderSentMode();}}
function nextSentMode(){smIdx++;renderSentMode();}

function startSentenceModeWithWord(targetWord) {
  // smWords listesini tüm kelimelerle yükle
  if (smWords.length === 0) {
    smWords = [...words];
  }
  
  // Belirtilen kelimeyi bul
  const wordIndex = smWords.findIndex(w => w.word.toLowerCase() === targetWord.toLowerCase());
  
  if (wordIndex !== -1) {
    smIdx = wordIndex;
  } else {
    // Kelime yoksa, allWords'den bul ve ekle
    const found = allWords.find(w => w.word.toLowerCase() === targetWord.toLowerCase());
    if (found) {
      smWords.push(found);
      smIdx = smWords.length - 1;
    }
  }
  
  // Cümle modunu aç
  showScreen('sc-sent');
  renderSentMode();
}

function startContextWithWord(targetWord) {
  // Bağlam Analizi ekranına git
  showScreen('sc-context');
  
  // Input'a kelimeyi yaz ve otomatik analiz başlat
  setTimeout(() => {
    const contextInput = document.getElementById("contextInput");
    if (contextInput) {
      contextInput.value = targetWord;
      // Enter event simüle et
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 });
      contextInput.dispatchEvent(event);
    }
  }, 100);
}

// SM Pronunciation
let smRec=null,smIsListening=false;
function toggleSMSpeech(){if(smIsListening)stopSMSpeech();else startSMSpeech();}
function startSMSpeech(){
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert("Chrome gerekli.");return;}
  smRec=new SR();smRec.lang="en-US";smRec.continuous=false;smRec.interimResults=true;smRec.maxAlternatives=3;
  const lt=document.getElementById("smLiveTx");
  smRec.onstart=()=>{smIsListening=true;setMicState("rec","smMicBtn",null);lt.textContent="Dinleniyor…";};
  smRec.onresult=e=>{
    let interim="",final="";
    for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t;else interim+=t;}
    lt.textContent=final||interim;
    if(final){
      smIsListening=false;setMicState("idle","smMicBtn",null);
      const alts=[];for(let i=0;i<e.results[e.results.length-1].length;i++) alts.push(e.results[e.results.length-1][i].transcript.trim().toLowerCase());
      scoreSMPronun(final.trim(),alts);
    }
  };
  smRec.onerror=()=>{smIsListening=false;setMicState("idle","smMicBtn",null);};
  smRec.onend=()=>{smIsListening=false;};
  smRec.start();
}
function stopSMSpeech(){if(smRec){try{smRec.stop();}catch(e){}}smIsListening=false;
  try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
}

function scoreSMPronun(heard,alts){
  const item=smWords[smIdx];
  const target=item.sentence||item.word;
  const norm=s=>s.toLowerCase().replace(/[^a-z\s]/g,"").trim();
  const tNorm=norm(target);
  let bestScore=0,bestHeard=norm(heard);
  for(const alt of[norm(heard),...alts.map(norm)]){const s=calcPronScore(tNorm,alt);if(s>bestScore){bestScore=s;bestHeard=alt;}}
  const sc=Math.round(bestScore);
  const col=sc>=85?"#4ade80":sc>=70?"#60a5fa":sc>=50?"#fb923c":"#f87171";
  // Color sentence words based on pronunciation match
  const tWords=tNorm.split(/\s+/),hWords=bestHeard.split(/\s+/);
  document.getElementById("smAnswer").querySelectorAll(".sm-word").forEach(el=>{
    const w=el.textContent.trim().toLowerCase().replace(/[^a-z]/g,"");
    if(hWords.find(h=>h===w||levDist(h,w)<=1)) el.style.borderColor="#22c55e";
    else el.style.borderColor="#ef4444";
  });
  const res=document.getElementById("smPronunResult");
  res.style.display="block";
  res.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg2);border-radius:10px">
    <div style="width:50px;height:50px;border-radius:50%;background:${col.replace("#","") >= "80" ? "#052e16":"#1c0a00"};
      display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:${col}">${sc}</div>
    <div><div style="font-weight:800;color:${col}">${sc>=85?"Mükemmel 🌟":sc>=70?"İyi 👍":sc>=50?"Gelişiyor 💪":"Tekrar dene 🔄"}</div>
    <div style="font-size:12px;color:var(--muted)">Duyulan: "${bestHeard}"</div></div></div>`;
}

// ══════════════════════════════════════════════════════════
// LETTER MODE
// ══════════════════════════════════════════════════════════
function renderLetterMode(){
  if(!lmWords.length){document.querySelector("#sc-letter .card").innerHTML="<p style='color:var(--muted);text-align:center;padding:20px'>Kelime yükle ve Word Mode'dan başla.</p>";return;}
  if(lmIdx>=lmWords.length) lmIdx=0;
  const item=lmWords[lmIdx];
  document.getElementById("lmCounter").textContent=(lmIdx+1)+" / "+lmWords.length;
  // Cümleyi göster, kelimeyi boşlukla gizle
  const sent=item.sentence||"";
  const blank="_".repeat(item.word.length);
  let blanked=sent;
  if(sent){
    // Kelimeyi case-insensitive bul ve blank ile değiştir
    const idx2=sent.toLowerCase().indexOf(item.word.toLowerCase());
    if(idx2>=0) blanked=sent.slice(0,idx2)+blank+sent.slice(idx2+item.word.length);
  }
  const lmS=document.getElementById("lmSentence");
  const lmT=document.getElementById("lmTr");
  if(lmS) lmS.textContent=blanked||item.tr+" → ?";
  if(lmT) lmT.textContent=item.sentenceTr||item.tr;
  lmAnswer=[];lmSelectedIdxs=[];
  const letters=item.word.split("").sort(()=>Math.random()-.5);
  document.getElementById("lmLetters").innerHTML=letters.map((l,i)=>
    `<div class="lm-letter" id="ll${i}" data-letter="${l}" onclick="lmPickLetter(${i},'${l}')">${l}</div>`).join("");
  renderLMAnswer(item.word.length);
  document.getElementById("lmFeedback").style.display="none";
  document.getElementById("lmNext").style.display="none";
  const pb=document.getElementById("lmBtnPrev");
  const nb=document.getElementById("lmBtnNext");
  if(pb)pb.disabled=(lmIdx===0);
  if(nb)nb.disabled=(lmIdx>=lmWords.length-1);
}
function lmPrev(){if(lmIdx>0){lmIdx--;renderLetterMode();}}
function lmNavNext(){if(lmIdx<lmWords.length-1){lmIdx++;renderLetterMode();}}
function lmShowHint(){
  const item=lmWords[lmIdx];
  const nextPos=lmAnswer.length;
  if(nextPos>=item.word.length) return;
  const correctLetter=item.word[nextPos];
  const els=document.getElementById("lmLetters").querySelectorAll(".lm-letter");
  for(const el of els){
    if(!el.classList.contains("used")&&el.dataset.letter.toLowerCase()===correctLetter.toLowerCase()){
      lmPickLetter(parseInt(el.id.replace("ll","")),el.dataset.letter);
      break;
    }
  }
}
function renderLMAnswer(total){
  document.getElementById("lmAnswer").innerHTML=lmAnswer.map((l,i)=>
    `<div class="lm-slot" onclick="lmRemoveLetter(${i})">${l}</div>`).join("")+
    Array(total-lmAnswer.length).fill('<div class="lm-slot" style="opacity:.2">_</div>').join("");
  // update display
  document.getElementById("lmDisplay").innerHTML=lmAnswer.map(l=>`<span>${l}</span>`).join("")+
    Array(lmWords[lmIdx].word.length-lmAnswer.length).fill('<span style="opacity:.2">_</span>').join("");
}
function lmPickLetter(i,l){
  const el=document.getElementById("ll"+i);
  if(!el||el.classList.contains("used")) return;
  el.classList.add("used");lmSelectedIdxs.push(i);lmAnswer.push(l);
  renderLMAnswer(lmWords[lmIdx].word.length);
}
function lmRemoveLetter(pos){
  const srcIdx=lmSelectedIdxs[pos];
  document.getElementById("ll"+srcIdx)?.classList.remove("used");
  lmAnswer.splice(pos,1);lmSelectedIdxs.splice(pos,1);
  renderLMAnswer(lmWords[lmIdx].word.length);
}
function clearLMAnswer(){
  lmSelectedIdxs.forEach(i=>document.getElementById("ll"+i)?.classList.remove("used"));
  lmAnswer=[];lmSelectedIdxs=[];renderLMAnswer(lmWords[lmIdx].word.length);
}
function checkLetters(){
  const item=lmWords[lmIdx];
  const answer=lmAnswer.join("").toLowerCase();
  const correct=item.word.toLowerCase();
  const fb=document.getElementById("lmFeedback");
  fb.style.display="block";
  document.getElementById("lmAnswer").querySelectorAll(".lm-slot").forEach((el,i)=>{
    el.classList.remove("correct","wrong");
    if(i<lmAnswer.length) el.classList.add(lmAnswer[i].toLowerCase()===correct[i]?"correct":"wrong");
  });
  if(answer===correct){
    fb.style.background="#052e16";fb.style.color="#4ade80";fb.style.border="1.5px solid #166534";
    fb.textContent="✅ Doğru! "+item.word+" = "+item.tr;
    document.getElementById("lmNext").style.display="";
  }else{
    fb.style.background="#1c0a00";fb.style.color="#fb923c";fb.style.border="1.5px solid #7c2d12";
    fb.textContent="❌ Doğrusu: "+item.word;
    document.getElementById("lmNext").style.display="";
  }
}
function nextLetterMode(){lmIdx++;renderLetterMode();}

// ══════════════════════════════════════════════════════════
// STATS & DAILY TRACKING
// ══════════════════════════════════════════════════════════
