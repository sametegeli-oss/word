/* ════════════════════════════════════════════════════════════════
   WordMode — modül: session.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function startSession(){
  
  showScreen("sc-word");
  smWords=[...words];smIdx=0;
  lmWords=[...words];lmIdx=0;
  fcWords=[...words];fcIdx=0;
  sessionStart=Date.now();
  renderLearn();
  renderStats();
}
function restartQuiz(){clearProgress();words=[...allWords];smWords=[...words];lmWords=[...words];fcWords=[...words];idx=0;smIdx=0;lmIdx=0;fcIdx=0;score=100;streak=0;correctCount=0;showScreen("sc-word");renderLearn();}
function goUpload(){stopSpeech();showScreen("sc-upload");document.getElementById("bottomNav").style.display="none";}
function continueOrDone(){
  const rem=allWords.filter(w=>!learnedSet.has(w.word));
  if(rem.length===0){if(confirm("🎉 Tüm kelimeler öğrenildi!\nBaştan başlamak ister misin?"))restartQuiz();}
  else{words=rem;smWords=[...rem];lmWords=[...rem];fcWords=[...rem];idx=0;smIdx=0;lmIdx=0;fcIdx=0;score=100;streak=0;correctCount=0;showScreen("sc-word");renderLearn();}
}

// ══════════════════════════════════════════════════════════
// SCORE BAR
// ══════════════════════════════════════════════════════════
function getActiveListName(){
  try{
    if (typeof activeListId !== 'undefined' && activeListId && Array.isArray(multiLists)) {
      const activeList = multiLists.find(l => String(l.id) === String(activeListId));
      if (activeList && activeList.name) return activeList.name;
    }
    const storedName = localStorage.getItem('activeListName') || localStorage.getItem('wm.activeListName') || localStorage.getItem('currentListName');
    if (storedName && storedName.trim()) return storedName.trim();
  }catch(e){}
  return 'Ana Liste';
}

function setActiveListTitle(name){
  const listName = (name && String(name).trim()) ? String(name).trim() : getActiveListName();
  try{
    localStorage.setItem('activeListName', listName);
    localStorage.setItem('wm.activeListName', listName);
    localStorage.setItem('currentListName', listName);
  }catch(e){}
  const title = document.getElementById('currentListName');
  if (title && title.textContent.trim() !== listName) title.textContent = listName;
  const wcLabel = document.querySelector('#wordCard .wc-label');
  if (wcLabel) {
    const item = (typeof words !== 'undefined' && Array.isArray(words)) ? words[idx] : null;
    wcLabel.innerHTML = listName + (item && item.rowNum ? `<span style="opacity:0.5;font-size:10px;margin-left:8px">#${item.rowNum}</span>` : '');
  }
  return listName;
}

function saveCurrentListProgress(){
  try{
    if (typeof activeListId !== 'undefined' && activeListId) {
      const currentProgress = { wordStatus, learnedSet: [...learnedSet], spacedRepetition, idx, score, streak, correctCount };
      localStorage.setItem('listProgress_' + activeListId, JSON.stringify(currentProgress));
    }
  }catch(e){ console.warn('Aktif liste ilerlemesi kaydedilemedi:', e); }
}

function updateScoreBar(){
  const scoreNum = document.getElementById("scoreNum");
  const fill = document.getElementById("scoreFill");
  const scoreLbl = document.getElementById("scoreLbl");
  if(!scoreNum || !fill || !scoreLbl) return;
  scoreNum.textContent=score;
  const col=score>=85?"#22c55e":score>=70?"#3b82f6":score>=50?"#f97316":"#ef4444";
  fill.style.width=score+"%";fill.style.background=col;
  scoreNum.style.color=col;
  const scoreText = score>=85?"Mükemmel":score>=70?"İyi":score>=50?"Orta":"Düşük";
  scoreLbl.textContent = scoreText;
  setActiveListTitle(getActiveListName());
}

// ══════════════════════════════════════════════════════════
// RENDER LEARN
// ══════════════════════════════════════════════════════════


/* WM v15 direct sentence meta helpers */
function wmSentenceMetaEsc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function wmGetSentenceLevel(item){return String((item&& (item.sentenceLevel||item.level||item.cefr||item.CEFR)) || '').trim();}
function wmGetGrammarStructure(item){return String((item&& (item.grammarStructure||item.grammar||item.grammar_structure||item.structure)) || '').trim();}
function wmSentenceMetaBlock(item, mode){
  const lvl = wmGetSentenceLevel(item);
  const gr = wmGetGrammarStructure(item);
  if(!lvl && !gr) return '';
  const cls = mode==='list' ? 'wm-v15-meta wm-v15-list-meta' : 'wm-v15-meta wm-v15-main-meta';
  return `<div class="${cls}">${lvl?`<span class="wm-v15-chip wm-v15-level">📊 ${wmSentenceMetaEsc(lvl)}</span>`:''}${gr?`<span class="wm-v15-chip wm-v15-grammar">🏗️ ${wmSentenceMetaEsc(gr)}</span>`:''}</div>`;
}
function wmEnsureSentenceMetaCss(){
  if(document.getElementById('wm-v15-sentence-meta-css')) return;
  const st=document.createElement('style');
  st.id='wm-v15-sentence-meta-css';
  st.textContent=`
    .wm-v15-meta{display:flex!important;gap:6px!important;flex-wrap:wrap!important;align-items:center!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:30!important;clear:both!important;}
    .wm-v15-main-meta{margin:10px 0 14px!important;padding:8px 10px!important;border:1px solid rgba(96,165,250,.30)!important;background:rgba(59,130,246,.09)!important;border-radius:14px!important;}
    .wm-v15-list-meta{margin:7px 0 4px!important;padding:0!important;}
    .wm-v15-chip{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:5px 9px!important;border-radius:999px!important;font-size:11px!important;font-weight:900!important;line-height:1.15!important;white-space:normal!important;max-width:100%!important;}
    .wm-v15-level{background:linear-gradient(135deg,#2563eb,#3b82f6)!important;color:#fff!important;}
    .wm-v15-grammar{background:rgba(168,85,247,.18)!important;color:#d8b4fe!important;border:1px solid rgba(168,85,247,.35)!important;}
    #wordListEl .wi{min-height:112px!important;height:112px!important;overflow:visible!important;}
    #wordListEl .virtual-content{overflow:visible!important;}
  `;
  document.head.appendChild(st);
}

function wmNormalizeHighlightsForRender(highlights){
  try{
    if(Array.isArray(highlights)) return highlights.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
    if(!highlights) return [];
    if(typeof highlights === "string"){
      const s = highlights.trim();
      if(!s) return [];
      try{
        const parsed = JSON.parse(s);
        if(Array.isArray(parsed)) return parsed.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
      }catch(e){}
      return s.split(/[,;|\n]+/).map(x=>String(x||'').trim().toLowerCase()).filter(Boolean);
    }
    if(typeof highlights === "object"){
      return Object.keys(highlights).filter(k=>highlights[k]).map(k=>String(k||'').trim().toLowerCase()).filter(Boolean);
    }
  }catch(e){}
  return [];
}

function mkSentColored(sentence,highlights,colors){
  if(!sentence) return "";
  highlights = wmNormalizeHighlightsForRender(highlights);
  
  // Önce **kelime** formatını işle
  sentence = String(sentence).replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
  
  return sentence.split(/(\s+)/).map(p=>{
    const c=p.replace(/[^a-zA-Z]/g,"").toLowerCase();
    const col=colors&&c&&colors[c];
    
    // Renkli kelime - tıklanabilir yap
    if(col) {
      const cleanWord = p.replace(/[^a-zA-Z]/g,'');
      return `<span style="color:${col};font-weight:800;cursor:pointer;transition:all 0.2s" onclick="explainWord('${cleanWord}','wordCard')" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">${p}</span>`;
    }
    
    // Vurgulu kelime (yeşil) - tıklanabilir yap
    if(c && highlights.some(h=>h===c)) {
      const cleanWord = p.replace(/[^a-zA-Z]/g,'');
      return `<span class="hl" style="cursor:pointer;transition:all 0.2s" onclick="explainWord('${cleanWord}','wordCard')" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">${p}</span>`;
    }
    
    // DİĞER KELİMELER - Eğer 2+ harf içeriyorsa onları da tıklanabilir yap
    if(c && c.length >= 2) {
      return `<span class="word-clickable" style="cursor:pointer" onclick="explainWord('${c}','wordCard')">${p}</span>`;
    }
    
    return p;
  }).join("");
}

async function renderLearn(){
  phase="learn";stopSpeech();
  try{wmEnsureSentenceMetaCss();}catch(e){}
  const item=words[idx];
  if(!item || !item.word) return;
  
  updateScoreBar();
  document.getElementById("progFill").style.width=(idx/words.length*100)+"%";
  const sb=document.getElementById("streakBadge");
  if(streak>=2){sb.style.display="";sb.textContent="🔥 "+streak;}else sb.style.display="none";
  const ph=item.phonetic?`<div class="wc-phonetic">${item.phonetic}</div>`:"";
  const wmDirectMetaHTML = wmSentenceMetaBlock(item, "main");
  let sentHTML="";
  if(item.sentence){
    sentHTML=`<div class="wc-sent">${mkSentColored(item.sentence,item.highlights,item.colors)}</div>`;
    if(item.sentenceTr) sentHTML+=`<div class="wc-sent-tr">${item.sentenceTr}</div>`;
  }
  // SRS rozeti - DÜZELTME: Hiç çalışılmamış ve çalışılmış kelimeleri ayır
  const srsData = spacedRepetition[item.word];
  const isStudied = srsData !== undefined; // Kelime daha önce çalışılmış mı?
  const srsLevel = srsData ? srsData.level : 0;
  const srsLabels = ['🌱 Yeni','📘 Başlangıç','📗 Orta','📙 İyi','⭐ Güçlü','🌟 Çok Güçlü','🏆 Uzman'];
  const srsColors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899','#8b5cf6'];
  const srsNextDate = srsData ? new Date(srsData.nextReview) : null;
  const srsNextStr = srsNextDate
    ? (srsData.nextReview <= Date.now() ? '⏰ Tekrar zamanı!' : '📅 ' + srsNextDate.toLocaleDateString('tr-TR'))
    : '';
  
  // Rozet HTML'i - Hiç çalışılmamış kelimeler için özel durum
  let srsBadge;
  if (!isStudied) {
    // Hiç çalışılmamış kelime - sadece "Henüz çalışılmadı" göster
    srsBadge = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="background:#64748b;color:#e2e8f0;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:800">❌ Henüz çalışılmadı</span>
    </div>`;
  } else {
    // Çalışılmış kelime - seviye rozetini göster
    srsBadge = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="background:${srsColors[srsLevel]};color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:800">${srsLabels[srsLevel]||'🏆 Uzman'}</span>
      <span style="font-size:11px;color:var(--muted)">${srsNextStr}</span>
    </div>`;
  }
  const activeListDisplayName = getActiveListName();
  document.getElementById("wordCard").innerHTML=`
    <div class="wc-label">${activeListDisplayName}${item.rowNum?`<span style="opacity:0.5;font-size:10px;margin-left:8px">#${item.rowNum}</span>`:''}</div>
    ${srsBadge}
    ${wmDirectMetaHTML}
    <div class="wc-word" style="cursor:pointer;transition:all 0.2s" onclick="explainWord('${item.word.replace(/'/g,"\\'")}','wordCard')" onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='scale(1)'">${item.word}</div>
    ${ph}
    <div class="wc-tr">${item.tr}</div>
    ${sentHTML}
    <div class="sent-img-wrap" id="sentImgWrap" style="margin-top:12px">
      <img class="sent-img" id="sentImg" alt="">
      <div class="img-credit" id="imgCredit"></div>
    </div>
    <!-- Resmin altı: İleri/Geri + Kelime/Cümle (eski wordQuickBar buraya taşındı) -->
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:12px;padding:10px;background:var(--bg3);border:1.5px solid var(--border);border-radius:14px">
      <button onclick="prevWord()" title="Önceki kelime (←)" aria-label="Önceki kelime" style="padding:10px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:#fff;font-size:16px;font-weight:800;cursor:pointer;min-width:48px">◀</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button onclick="speakWord()" title="Kelimeyi seslendir" style="padding:10px 8px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">🔊 Kelime</button>
        <button onclick="speakSentence()" title="Cümleyi seslendir" style="padding:10px 8px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">🔊 Cümle</button>
      </div>
      <button onclick="navNextWord()" title="Sonraki kelime (→)" aria-label="Sonraki kelime" style="padding:10px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:#fff;font-size:16px;font-weight:800;cursor:pointer;min-width:48px">▶</button>
    </div>`;
  const bl=document.getElementById("btnLearned");
  if(learnedSet.has(item.word)){bl.textContent="✓ Öğrenildi";bl.classList.add("done");}
  else{bl.textContent="✅ Öğrendim";bl.classList.remove("done");}
  document.getElementById("btnSpkSent").style.display=item.sentence?"":"none";
  document.getElementById("btnSpkTr").style.display=(item.sentenceTr||item.tr)?"":"none";
  document.getElementById("pronunTarget").innerHTML=item.sentence?mkSentColored(item.sentence,item.highlights,item.colors):`<strong>${item.word}</strong>`;
  document.getElementById("pronunPanel").style.display="none";
  resetPronun();
  const quizArea = document.getElementById("quizArea");
  if(quizArea) quizArea.style.display="none";
  const aiFeedback = document.getElementById("aiFeedback");
  if(aiFeedback) aiFeedback.style.display="none";
  const btnQuiz = document.getElementById("btnQuiz");
  if(btnQuiz) btnQuiz.style.display="";
  const btnNext = document.getElementById("btnNext");
  if(btnNext) btnNext.style.display="none";
  const wc=document.getElementById("wordCounter");
  if(wc) wc.textContent=(idx+1)+" / "+words.length+" kelime";
  loadSentenceImage(item.sentence||"",item.word);
  animCard("fadeIn");
  
  // Tekrar edilecek kelime sayısını güncelle
  updateReviewCount();
  
  // 9. Otomatik ses çalma - SADECE KELIME DEĞİŞTİĞİNDE VE NAVIGASYON BUTONU İLE
  // Her renderLearn çağrısında ses çalmaması için flag sistemi
  if(!window.lastRenderedWord) window.lastRenderedWord = '';
  if(!window.lastRenderedIndex) window.lastRenderedIndex = -1;
  
  const shouldPlayAudio = autoPlayAudio && 
                         (window.lastRenderedWord !== item.word || window.lastRenderedIndex !== idx);
  
  window.lastRenderedWord = item.word;
  window.lastRenderedIndex = idx;
  
  if(shouldPlayAudio){
    setTimeout(()=>{
      if(item.sentence) speakSentence();
      else speakWord();
    },300);
  }
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════
