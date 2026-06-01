/* ════════════════════════════════════════════════════════════════
   WordMode — modül: nextgen.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

(function(){
'use strict';
const DAY=86400000;
function $(id){return document.getElementById(id)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function getAll(){
  try{
    if(typeof allWords!=='undefined' && Array.isArray(allWords) && allWords.length) return allWords;
    if(Array.isArray(window.allWords) && window.allWords.length) return window.allWords;
  }catch(e){}
  return [];
}
function getCurrent(){
  try{
    if(typeof words!=='undefined' && Array.isArray(words) && words.length) return words[typeof idx!=='undefined'?idx:0] || getAll()[0] || null;
    return (window.words&&window.words[window.idx])||getAll()[0]||null;
  }catch(e){return null}
}
function wordText(w){return typeof w==='string'?w:(w?.word||'')}
function meanText(w){
  if(!w) return '';
  if(Array.isArray(w.meanings)) return w.meanings.slice(0,2).join(', ');
  return w.tr||w.meaning||w.translation||w.turkish||'';
}
function zipf(w){return Number(w?.zipf??w?.freq??0)||0;}
function statusOf(word){try{return (window.wordStatus||{})[word]||{}}catch(e){return {}}}
function srsOf(word){try{return JSON.parse(localStorage.getItem('wm_srs2')||'{}')[word] || (window.spacedRepetition||{})[word] || null}catch(e){return null}}
function saveSRS2(db){localStorage.setItem('wm_srs2', JSON.stringify(db));}
function loadSRS2(){try{return JSON.parse(localStorage.getItem('wm_srs2')||'{}')}catch(e){return {}}}
function toast(a,b){ if(typeof window.showToast==='function') window.showToast(a,b||''); else alert(a+'\n'+(b||'')); }

// SM-2 tabanlı SRS 2.0 — eski updateSRS fonksiyonunu güvenli şekilde güçlendirir.
const oldUpdateSRS = window.updateSRS;
window.updateSRS = function(word, isCorrect){
  try{
    const key=String(word||'').trim(); if(!key) return oldUpdateSRS?.(word,isCorrect);
    const db=loadSRS2();
    const item=db[key]||{ease:2.5,interval:0,repetitions:0,lastReview:0,nextReview:Date.now(),history:[]};
    const quality=isCorrect?5:2;
    if(quality>=4){
      item.repetitions += 1;
      if(item.repetitions===1) item.interval=1;
      else if(item.repetitions===2) item.interval=3;
      else item.interval=Math.max(1,Math.round(item.interval*item.ease));
      item.ease += (0.1 - (5-quality)*(0.08+(5-quality)*0.02));
      if(item.ease<1.3) item.ease=1.3;
    }else{
      item.repetitions=0;
      item.interval=1;
      item.ease=Math.max(1.3,item.ease-0.2);
    }
    item.lastReview=Date.now();
    item.nextReview=Date.now()+item.interval*DAY;
    item.history=(item.history||[]).slice(-14); item.history.push({t:Date.now(),ok:!!isCorrect,q:quality});
    db[key]=item; saveSRS2(db);
  }catch(e){console.warn('SRS2 error',e)}
  try{return oldUpdateSRS?.(word,isCorrect)}catch(e){}
};

function riskScore(w){
  const word=wordText(w); if(!word) return 0;
  const st=statusOf(word); const s=srsOf(word);
  let risk=20;
  const attempts=Number(st.attempts||0), correct=Number(st.correct||0);
  if(attempts>0) risk += Math.max(0, 40 - (correct/attempts)*40);
  if(attempts===0) risk += 15;
  if(window.learnedSet && window.learnedSet.has && !window.learnedSet.has(word)) risk += 20;
  if(s?.nextReview){ const late=Math.max(0, Date.now()-Number(s.nextReview)); risk += Math.min(25, Math.round(late/DAY)*5); }
  const z=zipf(w); if(z>=5) risk+=12; else if(z>=4) risk+=8; else risk+=3;
  if(st.pronScore!=null) risk += Math.max(0, 18-Number(st.pronScore)/6);
  return Math.max(1, Math.min(100, Math.round(risk)));
}
function criticalWords(n=5){return getAll().slice().sort((a,b)=>riskScore(b)-riskScore(a)).slice(0,n)}

const scenarios={
  airport:{title:'🛫 Airport',role:'airport check-in officer',first:'Good morning. May I see your passport and ticket, please?'},
  cafe:{title:'☕ Coffee Shop',role:'friendly barista',first:'Hi! What would you like to drink today?'},
  hotel:{title:'🏨 Hotel',role:'hotel receptionist',first:'Welcome to our hotel. Do you have a reservation?'},
  taxi:{title:'🚕 Taxi',role:'taxi driver',first:'Hello. Where would you like to go?'},
  interview:{title:'💼 Job Interview',role:'job interviewer',first:'Thanks for coming. Could you briefly introduce yourself?'}
};
let activeScenario='airport'; let lifeHistory=[];
let rewriteVoiceRecognizer=null;
let rewriteVoiceActive=false;

function dictToWordArray(dict){
  if(!dict || typeof dict!=='object') return [];
  return Object.entries(dict).map(([key,info])=>{
    info = info && typeof info==='object' ? info : {};
    const meanings = Array.isArray(info.meanings) ? info.meanings.filter(Boolean) : [];
    const tr = meanings.length ? meanings.join(', ') : (info.tr || info.meaning || info.translation || '');
    return {
      word: String(key).trim(),
      en: String(key).trim(),
      tr,
      meanings,
      phonetic: info.tr_pron || info.phonetic || info.pronunciation || '',
      pronunciation: info.tr_pron || info.phonetic || info.pronunciation || '',
      level: info.cefr || info.level || '',
      cefr: info.cefr || info.level || '',
      zipf: Number(info.zipf || 0) || 0,
      sentence: info.sentence || '',
      sentenceTr: info.sentenceTr || '',
      highlights: [String(key).trim()].filter(Boolean),
      colors: {}
    };
  }).filter(x=>x.word);
}

async function ensureDefaultWordList(force=false){
  try{
    const existing = getAll();
    const hasUserList = !!localStorage.getItem('lastFileData');
    if(existing.length && !force) return existing;
    if(hasUserList && !force) return existing;
    const dict = await (window.WM_DictionaryReady || Promise.resolve(window.WM_Dictionary || {}));
    const arr = dictToWordArray(dict);
    if(!arr.length) return [];
    if(typeof allWords !== 'undefined') allWords = arr;
    if(typeof words !== 'undefined') words = arr.filter(w=>!(window.learnedSet&&window.learnedSet.has&&window.learnedSet.has(w.word)));
    if(typeof fileKey !== 'undefined') fileKey = 'wm_default_sozluk_json';
    window.allWords = arr;
    window.words = (typeof words !== 'undefined') ? words : arr;
    try{
      localStorage.setItem('lastUploadedFile', JSON.stringify({name:'sozluk.json', size:0, wordCount:arr.length, uploadDate:new Date().toISOString(), fileKey:'wm_default_sozluk_json', auto:true}));
      localStorage.setItem('lastFileData', JSON.stringify(arr));
      localStorage.setItem('wm_default_dictionary_loaded','1');
    }catch(e){ console.warn('Varsayılan sözlük localStorage kaydı yapılamadı:', e); }
    try{ if(typeof WMStore!=='undefined' && WMStore.saveAllWords) WMStore.saveAllWords(arr).catch(()=>{}); }catch(e){}
    if(force && typeof showToast==='function') showToast('✅ Varsayılan sözlük yüklendi', arr.length + ' kelime aktif');
    return arr;
  }catch(e){ console.warn('Varsayılan sözlük otomatik yüklenemedi:', e); return []; }
}

window.WMNG={
  init(){
    this.addMenuButtons(); this.addFloating();
    ensureDefaultWordList(false).then(()=>{ this.renderSummary(); if(document.getElementById('sc-critical')?.classList.contains('active')) this.renderCriticalWords(); });
    this.renderSummary();
    const oldShow=window.showScreen;
    if(typeof oldShow==='function' && !oldShow._wmng){
      const wrapped=function(id){ const r=oldShow.apply(this,arguments); if(id==='sc-nextgen') setTimeout(()=>WMNG.renderSummary(),0); return r; };
      wrapped._wmng=true; window.showScreen=wrapped;
    }
    const oldSwitch=window.switchTab;
    if(typeof oldSwitch==='function' && !oldSwitch._wmng){
      const wrapped=function(tab){ if(tab==='nextgen'){window.showScreen('sc-nextgen');return;} return oldSwitch.apply(this,arguments); };
      wrapped._wmng=true; window.switchTab=wrapped;
    }
  },
  addMenuButtons(){
    const menu=document.querySelector('#sc-menu > div:nth-of-type(2)');
    if(menu && !$('wmngMenuBtn')){
      const btn=document.createElement('button'); btn.id='wmngMenuBtn'; btn.onclick=()=>showScreen('sc-nextgen');
      btn.style.cssText='padding:24px;background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;border-radius:16px;cursor:pointer;grid-column:1 / -1';
      btn.innerHTML='<div style="font-size:32px;margin-bottom:8px">🚀</div><div style="font-size:14px;font-weight:800;color:#fff">Premium Koç</div>';
      menu.appendChild(btn);
    }
    const nav=$('bottomNav');
    if(nav && !$('bn-nextgen')){
      const b=document.createElement('button'); b.className='bnav-btn'; b.id='bn-nextgen'; b.onclick=()=>switchTab('nextgen'); b.innerHTML='<span class="bico">🚀</span>Koç'; nav.appendChild(b);
    }
  },
  addFloating(){
    if($('wmngFloat')) return;
    const b=document.createElement('button'); b.id='wmngFloat'; b.className='wmng-sticky-btn'; b.innerHTML='🚀'; b.onclick=()=>showScreen('sc-nextgen'); document.body.appendChild(b);
    setInterval(()=>{ const nav=$('bottomNav'); b.style.display=(nav&&nav.style.display!=='none')?'block':'none';},1500);
  },
  async loadDefaultDictionaryAsList(force=false){
    const arr = await ensureDefaultWordList(!!force);
    this.renderSummary();
    this.renderCriticalWords();
    if(!arr.length) toast('⚠️ Sözlük bulunamadı','sozluk.json aynı klasörde olmalı veya Ayarlar > Yerel Sözlük bölümünden JSON yüklemelisin.');
    return arr;
  },
  renderSummary(){
    const el=$('wmngSummary'); if(!el) return;
    const all=getAll(); const db=loadSRS2(); const due=Object.values(db).filter(x=>x.nextReview<=Date.now()).length;
    const learned=(window.learnedSet&&window.learnedSet.size)||0;
    const avgRisk=all.length?Math.round(criticalWords(Math.min(50,all.length)).reduce((a,w)=>a+riskScore(w),0)/Math.min(50,all.length)):0;
    el.innerHTML=`<div class="wmng-row"><div><b>📚 Toplam</b><div class="wmng-mini">${all.length} kelime · ${learned} öğrenildi</div></div><div style="font-size:28px;font-weight:900;color:var(--green)">${learned}</div></div>
    <div class="wmng-scorebar"><span style="width:${all.length?Math.round(learned/all.length*100):0}%"></span></div>
    <span class="wmng-pill">🔄 Bugün tekrar: ${due}</span><span class="wmng-pill">🔥 Ortalama risk: ${avgRisk}</span><span class="wmng-pill">🧠 SRS 2.0 aktif</span>`;
  },
  renderCriticalWords(){
    const el=$('wmngCriticalList'); if(!el) return;
    const list=criticalWords(5);
    if(!list.length){
      el.innerHTML='<div class="wmng-panel">📚 Liste hazırlanıyor... Varsayılan <b>sozluk.json</b> yükleniyor.</div>';
      ensureDefaultWordList(false).then(arr=>{
        if(arr.length) this.renderCriticalWords();
        else el.innerHTML='<div class="wmng-panel">Önce bir kelime listesi yükle. Üstteki <b>Özel Liste Ekle</b> butonuyla Excel seçebilir veya <b>Varsayılan Sözlüğü Yükle</b> butonunu deneyebilirsin.</div>';
      });
      return;
    }
    el.innerHTML=list.map(w=>{const safe=esc(wordText(w)).replace(/'/g,'&#39;'); return `<div class="wmng-word"><div class="risk">${riskScore(w)}</div><div style="flex:1"><div class="w wmng-clickword" onclick="WMNG.openWordPopup('${safe}', event)">${esc(wordText(w))}</div><div class="m">${esc(meanText(w))}</div><div class="wmng-mini">Zipf: ${zipf(w)||'-'} · SRS: ${srsOf(wordText(w))?.interval||0} gün</div></div><button class="btn btn-sm btn-blue" onclick="WMNG.practiceWord('${safe}')">Çalış</button></div>`}).join('');
  },
  practiceWord(word){
    try{
      const key = String(word || '').trim().toLowerCase();
      if(!key){ toast('Kelime seçilemedi',''); return; }

      // ÖNEMLİ: Bu dosyada `idx` ve `words` global `let` olarak tanımlı.
      // `window.idx` yazmak gerçek aktif kelimeyi değiştirmez.
      // Bu yüzden doğrudan lexical `idx` / `words` değişkenlerini güncelliyoruz.
      let i = Array.isArray(words) ? words.findIndex(w => String(w.word || w.en || '').trim().toLowerCase() === key) : -1;

      // Kritik kelime öğrenilmiş/filtre dışı kaldıysa aktif çalışma listesine ekle.
      if(i < 0 && Array.isArray(allWords)){
        const original = allWords.find(w => String(w.word || w.en || '').trim().toLowerCase() === key);
        if(original){
          if(!Array.isArray(words)) words = [];
          words.unshift(original);
          i = 0;
        }
      }

      if(i >= 0){
        idx = i;
        if(typeof window !== 'undefined'){ window.idx = idx; window.words = words; }
        showScreen('sc-word');
        if(typeof renderLearn === 'function') renderLearn();
        return;
      }
    }catch(e){ console.warn('Kritik kelime çalışma yönlendirme hatası:', e); }

    toast('Kelime bulunamadı', word + ' aktif listede yok. Varsayılan sözlüğü yeniden yüklemeyi dene.');
  },
  renderIntelligence(){
    const el=$('wmngIntelligence'); if(!el) return;
    const all=getAll(); const ws=window.wordStatus||{}; const entries=Object.entries(ws);
    const attempts=entries.reduce((a,[,s])=>a+(s.attempts||0),0); const correct=entries.reduce((a,[,s])=>a+(s.correct||0),0);
    const success=attempts?Math.round(correct/attempts*100):0;
    const hard=all.slice().filter(w=>{const s=ws[wordText(w)]||{};return (s.attempts||0)>0 && ((s.correct||0)/(s.attempts||1))<0.5}).slice(0,8);
    const due=Object.entries(loadSRS2()).filter(([,s])=>s.nextReview<=Date.now()).map(([w])=>w).slice(0,8);
    const advice=[];
    if(success<65) advice.push('Quizlerde doğruluk düşük: bugün sadece kritik 5 kelime + SRS tekrar çalış.');
    if(due.length>10) advice.push('Tekrar kuyruğu birikmiş: yeni kelime eklemeden önce SRS oturumu yap.');
    if(hard.length>3) advice.push('Bazı kelimeler tekrar tekrar hata veriyor: bu kelimelerle örnek cümle ve telaffuz çalış.');
    if(!advice.length) advice.push('Gidişat iyi. Zorluğu biraz artırıp konuşma senaryosu çalışabilirsin.');
    el.innerHTML=`<div style="font-size:20px;font-weight:900;margin-bottom:8px">Genel Durum</div>
    <div class="wmng-panel"><span class="wmng-pill">Deneme: ${attempts}</span><span class="wmng-pill">Doğruluk: ${success}%</span><span class="wmng-pill">SRS bekleyen: ${due.length}</span></div>
    <div class="wmng-scorebar"><span style="width:${success}%"></span></div>
    <h3 style="margin:14px 0 8px">🎯 AI Koç Önerisi</h3>${advice.map(a=>`<div class="wmng-level">${esc(a)}</div>`).join('')}
    <h3 style="margin:14px 0 8px">⚠️ Zorlanılan Kelimeler</h3><div>${(hard.length?hard:criticalWords(5)).map(w=>`<span class="wmng-pill">${esc(wordText(w))}</span>`).join('')}</div>
    <h3 style="margin:14px 0 8px">🔄 Bugün Tekrar</h3><div>${(due.length?due:['Henüz yok']).map(w=>`<span class="wmng-pill">${esc(w)}</span>`).join('')}</div>`;
  },
  startRewriteVoiceInput(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const status=$('wmngRewriteVoiceStatus');
    const input=$('wmngRewriteInput');
    if(!SR){ toast('Ses tanıma yok','Bu tarayıcı Speech Recognition desteklemiyor. Chrome ile dene.'); return; }
    try{ if(rewriteVoiceRecognizer) rewriteVoiceRecognizer.stop(); }catch(e){}
    rewriteVoiceRecognizer=new SR();
    rewriteVoiceRecognizer.lang='en-US';
    rewriteVoiceRecognizer.interimResults=true;
    rewriteVoiceRecognizer.continuous=false;
    rewriteVoiceActive=true;
    let finalText='';
    if(status){ status.style.display='block'; status.innerHTML='🎤 Dinleniyor... İngilizce cümleni söyle.'; }
    rewriteVoiceRecognizer.onresult=(ev)=>{
      let interim='';
      for(let i=ev.resultIndex;i<ev.results.length;i++){
        const part=ev.results[i][0].transcript;
        if(ev.results[i].isFinal) finalText+=part; else interim+=part;
      }
      const text=(finalText||interim).trim();
      if(input && text) input.value=text;
      if(status) status.innerHTML='🎙️ Algılanan: <b>'+esc(text||'...')+'</b>';
    };
    rewriteVoiceRecognizer.onerror=(e)=>{
      rewriteVoiceActive=false;
      if(status) status.innerHTML='⚠️ Ses alınamadı: '+esc(e.error||'hata');
      toast('Mikrofon hatası','İzinleri kontrol et veya tekrar dene.');
    };
    rewriteVoiceRecognizer.onend=()=>{
      rewriteVoiceActive=false;
      if(status){
        const val=input?.value?.trim();
        status.innerHTML=val?'✅ Ses metne çevrildi. İyileştir butonuna basabilirsin.':'⏹ Konuşme bitti.';
      }
    };
    try{ rewriteVoiceRecognizer.start(); }catch(e){ toast('Başlatılamadı','Mikrofon zaten açık olabilir.'); }
  },
  stopRewriteVoiceInput(){
    rewriteVoiceActive=false;
    try{ if(rewriteVoiceRecognizer) rewriteVoiceRecognizer.stop(); }catch(e){}
    const status=$('wmngRewriteVoiceStatus');
    if(status) status.innerHTML='⏹ Konuşme durduruldu.';
  },
  speakRewriteInput(){
    const text=$('wmngRewriteInput')?.value||'';
    if(!text.trim()){ toast('Metin yok','Önce cümle yaz veya sesle gir.'); return; }
    this.speakText(text);
  },
  speakRewriteResult(){
    const out=$('wmngRewriteResult');
    const text=out?.innerText||'';
    if(!text.trim()){ toast('Sonuç yok','Önce cümleyi iyileştir.'); return; }
    this.speakText(text.replace(/BASIC:|NATURAL:|NATIVE:|EXPLANATION:/g,' '));
  },
  useCurrentSentence(){
    const cur=getCurrent(); const sent=cur?.sentence||cur?.example||''; $('wmngRewriteInput').value=sent;
  },
  async rewriteSentence(){
    const inp=$('wmngRewriteInput'); const out=$('wmngRewriteResult'); const text=inp.value.trim(); if(!text){toast('Cümle yok','Önce İngilizce cümle yaz.');return;}
    out.style.display='block'; out.innerHTML='⏳ Hazırlanıyor...';
    const sys='You are an English teacher. Rewrite the user sentence in three levels: BASIC, NATURAL, NATIVE. Add a short Turkish explanation. Keep it concise.';
    const prompt=`Sentence: ${text}\n\nReturn exactly with headings BASIC, NATURAL, NATIVE, EXPLANATION.`;
    try{
      if(typeof window.callGroqAPI==='function'){
        const r=await window.callGroqAPI(sys,prompt,900);
        if(!String(r).startsWith('❌')&&!String(r).startsWith('⏳')){out.innerHTML=String(r).replace(/\n/g,'<br>');return;}
      }
    }catch(e){}
    const fixed=text.replace(/\bI very like\b/ig,'I really like').replace(/\bmore better\b/ig,'better').replace(/\bpeoples\b/ig,'people');
    out.innerHTML=`<div class="wmng-level"><b>BASIC:</b><br>${esc(fixed)}</div><div class="wmng-level"><b>NATURAL:</b><br>${esc(fixed.replace(/I like/,'I really like'))}</div><div class="wmng-level"><b>NATIVE:</b><br>${esc(fixed.replace(/I really like/,'I’m really into'))}</div><div class="wmng-mini">Not: API key yoksa basit offline düzeltme çalışır. Daha iyi sonuç için Groq API key gir.</div>`;
  },
  initLife(){
    if(!lifeHistory.length) this.setScenario(activeScenario);
  },
  setScenario(k){activeScenario=k; lifeHistory=[{role:'ai',text:scenarios[k].first}]; this.renderLife();},
  renderLife(){const chat=$('wmngLifeChat'); if(!chat)return; chat.innerHTML=lifeHistory.map((m,i)=>`<div class="wmng-msg ${m.role==='user'?'user':'ai'}">${m.role==='ai'?`<button class="wmng-speak-mini" onclick="WMNG.speakLife(${i})">🔊</button>`:''}${this.clickableHTML(m.text)}</div>`).join(''); this.makeContainerWordsClickable(chat); chat.scrollTop=chat.scrollHeight;},
  async sendLifeMessage(){
    const inp=$('wmngLifeInput'); const text=inp.value.trim(); if(!text)return; inp.value=''; lifeHistory.push({role:'user',text}); this.renderLife();
    const sc=scenarios[activeScenario]; lifeHistory.push({role:'ai',text:'⏳ ...'}); this.renderLife();
    let reply='Good. Can you give me one more detail?';
    try{
      if(typeof window.callGroqAPI==='function'){
        const hist=lifeHistory.filter(x=>x.text!=='⏳ ...').slice(-8).map(x=>`${x.role}: ${x.text}`).join('\n');
        const r=await window.callGroqAPI(`You are a ${sc.role}. Keep a realistic English role-play. Ask one question at a time. Correct serious mistakes gently in Turkish only after your English reply.`,hist,700);
        if(!String(r).startsWith('❌')&&!String(r).startsWith('⏳')) reply=r;
      }
    }catch(e){}
    lifeHistory[lifeHistory.length-1]={role:'ai',text:reply}; this.renderLife();
  },
  openWordPopup(word,event){
    try{ if(event) event.stopPropagation(); const clean=String(word||'').replace(/&#39;/g,"'").trim(); if(clean && window.WM_Pronunciation?.showPronunciationPopup) window.WM_Pronunciation.showPronunciationPopup(clean); else if(clean && typeof speak==='function') speak(clean,'en-US'); }catch(e){ console.warn('Popup açılamadı',e); }
  },
  clickableHTML(text){
    return esc(text).replace(/([A-Za-z][A-Za-z'’-]{1,})/g, '<span class="wmng-clickword" onclick="WMNG.openWordPopup(\'$1\', event)">$1</span>');
  },
  makeContainerWordsClickable(container){
    try{ if(window.WM_Pronunciation?.makeTextClickable) window.WM_Pronunciation.makeTextClickable(container); }catch(e){}
  },
  speakText(text){
    const clean=String(text||'').replace(/<[^>]*>/g,'').trim();
    if(!clean) return;
    try{ if(typeof speak==='function') speak(clean,'en-US'); else if(window.WM_Pronunciation?.speak) WM_Pronunciation.speak(clean); }
    catch(e){ const u=new SpeechSynthesisUtterance(clean); u.lang='en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  },
  speakLife(i){ const m=lifeHistory[i]; if(m) this.speakText(m.text); },
  enhanceAISpeechButtons(){
    const sel='.chat-msg.ai,.partner-msg.ai,.conv-msg.ai,.wmng-msg.ai';
    document.querySelectorAll(sel).forEach((el)=>{
      if(el.dataset.wmngSpeechReady) return;
      el.dataset.wmngSpeechReady='1';
      const btn=document.createElement('button'); btn.className='wmng-speak-mini'; btn.textContent='🔊';
      btn.onclick=(ev)=>{ev.stopPropagation(); this.speakText(el.innerText.replace(/^🔊/,'').trim());};
      el.prepend(btn);
      this.makeContainerWordsClickable(el);
    });
  },
  drawReferenceWave(word){
    const canvas=$('wmngRefWave'); if(!canvas) return;
    const txt=String(word||'word');
    this.drawSyntheticWave(canvas, txt);
  },
  drawSyntheticWave(canvas, seed){
    const dpr=window.devicePixelRatio||1, rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(300,rect.width*dpr); canvas.height=86*dpr;
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height, mid=h/2;
    ctx.clearRect(0,0,w,h); ctx.lineWidth=2*dpr; ctx.strokeStyle='#4ade80'; ctx.beginPath();
    let hash=0; for(const ch of seed) hash=(hash*31+ch.charCodeAt(0))>>>0;
    for(let x=0;x<w;x++){
      const t=x/w; const amp=(0.18+0.26*Math.abs(Math.sin((hash%7+3)*Math.PI*t)))*(1-Math.abs(t-.5)*.45);
      const y=mid + Math.sin(t*Math.PI*(18+(hash%9)) + (hash%13))*amp*h;
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0,mid); ctx.lineTo(w,mid); ctx.stroke();
  },
  async drawAudioWave(blob){
    const canvas=$('wmngUserWave'); if(!canvas || !blob) return;
    const buf=await blob.arrayBuffer(); const AC=window.AudioContext||window.webkitAudioContext; const ac=new AC();
    const audio=await ac.decodeAudioData(buf.slice(0)); const data=audio.getChannelData(0);
    const dpr=window.devicePixelRatio||1, rect=canvas.getBoundingClientRect(); canvas.width=Math.max(300,rect.width*dpr); canvas.height=86*dpr;
    const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height, mid=h/2, step=Math.ceil(data.length/w);
    ctx.clearRect(0,0,w,h); ctx.lineWidth=2*dpr; ctx.strokeStyle='#60a5fa'; ctx.beginPath();
    for(let x=0;x<w;x++){ let min=1,max=-1; for(let j=0;j<step;j++){const v=data[x*step+j]||0; if(v<min)min=v; if(v>max)max=v;} ctx.moveTo(x, mid+min*mid*.9); ctx.lineTo(x, mid+max*mid*.9); }
    ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0,mid); ctx.lineTo(w,mid); ctx.stroke();
    try{ac.close();}catch(e){}
  },
  async toggleVoiceRecord(){
    const btn=$('wmngRecordBtn');
    if(this._recorder && this._recorder.state==='recording'){
      this._recorder.stop(); if(btn) btn.textContent='● Kayıt Başlat'; return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      this._chunks=[]; this._recorder=new MediaRecorder(stream);
      this._recorder.ondataavailable=e=>{ if(e.data.size) this._chunks.push(e.data); };
      this._recorder.onstop=async()=>{
        this._userBlob=new Blob(this._chunks,{type:this._recorder.mimeType||'audio/webm'});
        stream.getTracks().forEach(t=>t.stop());
        await this.drawAudioWave(this._userBlob);
        const word=$('wmngPronTarget')?.value||''; this.drawReferenceWave(word);
        const msg=$('wmngVoiceCompare'); if(msg) msg.innerHTML='✅ Kayıt alındı. <b>Kaydımı Konuş</b> ile sesini dinleyebilir, grafikte hedef modelle karşılaştırabilirsin.';
      };
      this._recorder.start(); if(btn) btn.textContent='■ Kayıt Durdur';
      const msg=$('wmngVoiceCompare'); if(msg) msg.textContent='Kayıt başladı. Kelimeyi söyle ve durdur.';
    }catch(e){ toast('Mikrofon açılamadı', e.message||'Tarayıcı izinlerini kontrol et.'); }
  },
  playUserRecord(){
    if(!this._userBlob){toast('Kayıt yok','Önce kendi sesini kaydet.');return;}
    const url=URL.createObjectURL(this._userBlob); const a=new Audio(url); a.onended=()=>URL.revokeObjectURL(url); a.play();
  },
  speakTargetAndDraw(){
    const word=$('wmngPronTarget')?.value || wordText(getCurrent()) || '';
    if(!word){toast('Hedef kelime yok','Önce hedef kelime yaz.');return;}
    this.drawReferenceWave(word); this.speakText(word);
  },
  fillCurrentPronMap(){ const c=getCurrent(); if(c){$('wmngPronTarget').value=wordText(c); $('wmngPronSpoken').value=''; setTimeout(()=>this.drawReferenceWave(wordText(c)),120);} },
  comparePron(target,spoken){
    target=String(target||'').toLowerCase().trim(); spoken=String(spoken||'').toLowerCase().trim();
    const similar={v:['f','w'],f:['v'],r:['l'],l:['r'],t:['d'],d:['t'],i:['e','ı'],e:['i','a'],a:['e','ı'],o:['u','a'],u:['o'],c:['k','s'],k:['c'],s:['z'],z:['s'],w:['v']};
    const arr=[]; const n=Math.max(target.length,spoken.length);
    for(let i=0;i<n;i++){const t=target[i]||'', sp=spoken[i]||''; if(!t){arr.push({char:sp,status:'extra'});continue;} if(t===sp)arr.push({char:t,status:'ok'}); else if((similar[t]||[]).includes(sp))arr.push({char:t,status:'close'}); else arr.push({char:t,status:'bad'});}
    return arr;
  },
  renderPronMap(){
    const target=$('wmngPronTarget').value.trim(); const spoken=$('wmngPronSpoken').value.trim(); const out=$('wmngPronResult'); if(!target||!spoken){toast('Eksik bilgi','Hedef ve duyulan kelime gerekli.');return;}
    const data=this.comparePron(target,spoken); const ok=data.filter(x=>x.status==='ok').length; const score=Math.round(ok/Math.max(target.length,1)*100);
    out.style.display='block'; out.innerHTML=`<div class="wmng-pmap">${data.map(x=>`<span class="pm-${x.status}">${esc(x.char)}</span>`).join('')}</div><div class="wmng-scorebar"><span style="width:${score}%"></span></div><div class="wmng-mini">Skor: <b>${score}%</b> · Yeşil doğru, sarı yakın, kırmızı sorunlu ses.</div>`;
  },
  listenPronMap(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){toast('Destek yok','Bu tarayıcı speech recognition desteklemiyor.');return;}
    const rec=new SR(); rec.lang='en-US'; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult=e=>{ $('wmngPronSpoken').value=e.results[0][0].transcript; this.renderPronMap(); };
    rec.onerror=e=>toast('Konuşma hatası',e.error||''); rec.start(); toast('Dinleniyor','Kelimeyi İngilizce söyle.');
  }
};

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>WMNG.init(),500);
  setTimeout(()=>ensureDefaultWordList(false).then(()=>{ try{WMNG.renderSummary();}catch(e){} }),900);
  setTimeout(()=>{try{WMNG.enhanceAISpeechButtons();}catch(e){}},1200);
  try{ new MutationObserver(()=>{try{WMNG.enhanceAISpeechButtons();}catch(e){}}).observe(document.body,{childList:true,subtree:true}); }catch(e){}
});
setTimeout(()=>window.WMNG&&WMNG.init(),1800);
setInterval(()=>{try{WMNG.enhanceAISpeechButtons();}catch(e){}},2500);
setTimeout(()=>ensureDefaultWordList(false),2600);
})();


/* ===== extracted script block ===== */


(function(){
  "use strict";

  function drawRealWaveform(canvas, samples){
    if(!canvas || !samples || !samples.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || 320));
    const h = Math.max(74, Math.floor(rect.height || 74));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--bg3") || "#1c2130";
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = "rgba(160,168,200,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,h/2);
    ctx.lineTo(w,h/2);
    ctx.stroke();

    const step = Math.ceil(samples.length / w);
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--green") || "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for(let x=0; x<w; x++){
      const start = x * step;
      let min = 1, max = -1;
      for(let i=0; i<step && start+i<samples.length; i++){
        const v = samples[start+i];
        if(v < min) min = v;
        if(v > max) max = v;
      }
      const y1 = (1 + min) * h / 2;
      const y2 = (1 + max) * h / 2;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
  }

  async function decodeAudioFileToSamples(file){
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channel = audioBuffer.getChannelData(0);
    const copy = new Float32Array(channel.length);
    copy.set(channel);
    if(audioCtx.close) audioCtx.close();
    return copy;
  }

  function removeFakeTargetCanvas(){
    const candidates = [
      "#targetWaveCanvas",
      "#correctWaveCanvas",
      "#referenceWaveCanvas",
      ".target-wave-canvas",
      ".correct-wave-canvas",
      ".reference-wave-canvas"
    ];
    candidates.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        const box = el.closest(".real-wave-row,.wave-row,.comparison-bar,.pronun-tip,div") || el;
        if(box && box.parentNode){
          box.remove();
        }
      });
    });

    document.querySelectorAll("canvas").forEach(c=>{
      const txt = (c.parentElement && c.parentElement.innerText || "").toLowerCase();
      if(txt.includes("doğru ses") || txt.includes("olması gereken") || txt.includes("target") || txt.includes("reference")){
        const parent = c.closest(".real-wave-row,.wave-row,.comparison-bar") || c.parentElement;
        if(parent && parent.parentNode) parent.remove();
      }
    });
  }

  function injectRealReferencePanel(){
    const possibleContainers = [
      document.querySelector("#pronunResult"),
      document.querySelector(".pronun-result"),
      document.querySelector("#accentAnalysisResult"),
      document.querySelector(".pronun-panel")
    ].filter(Boolean);

    const host = possibleContainers[0];
    if(!host || document.querySelector("#realReferenceWavePanel")) return;

    const panel = document.createElement("div");
    panel.id = "realReferenceWavePanel";
    panel.innerHTML = `
      <div class="real-wave-row">
        <div class="real-wave-label">🎙️ Benim ses grafiğim</div>
        <canvas id="realUserWaveCanvas" class="real-wave-canvas"></canvas>
      </div>

      <div class="real-wave-row">
        <div class="real-wave-label">✅ Gerçek doğru ses grafiği</div>
        <canvas id="realTargetWaveCanvas" class="real-wave-canvas"></canvas>
        <input id="realReferenceAudioInput" class="ref-audio-input" type="file" accept="audio/*">
        <div class="real-wave-note">
          Eski “doğru ses grafiği” temsiliydi. Tarayıcının SpeechSynthesis sesi ham audio verisi vermediği için gerçek waveform çizilemez.
          Gerçek doğru grafik için referans telaffuz ses dosyası yükle; bu alan gerçek audio dosyasından çizilir.
        </div>
      </div>
    `;
    host.appendChild(panel);

    const input = panel.querySelector("#realReferenceAudioInput");
    input.addEventListener("change", async function(){
      const file = this.files && this.files[0];
      if(!file) return;
      try{
        const samples = await decodeAudioFileToSamples(file);
        drawRealWaveform(document.querySelector("#realTargetWaveCanvas"), samples);
      }catch(err){
        alert("Referans ses dosyası okunamadı: " + err.message);
      }
    });
  }

  // Dışarıdan gerçek kullanıcı kayıt verisi varsa onu canvas'a basmak için global yardımcı.
  window.WM_drawRealUserWaveform = function(samples){
    const canvas = document.querySelector("#realUserWaveCanvas");
    if(canvas && samples) drawRealWaveform(canvas, samples);
  };

  // MediaRecorder blob'u gelirse gerçek kullanıcı waveform'u çiz.
  window.WM_drawUserWaveformFromBlob = async function(blob){
    try{
      if(!blob) return;
      const file = new File([blob], "user-recording.webm", {type: blob.type || "audio/webm"});
      const samples = await decodeAudioFileToSamples(file);
      drawRealWaveform(document.querySelector("#realUserWaveCanvas"), samples);
    }catch(e){
      console.warn("User waveform decode failed:", e);
    }
  };

  function patchFakeWaveFunctions(){
    const names = [
      "drawTargetWaveform",
      "drawCorrectWaveform",
      "drawReferenceWaveform",
      "drawFakeTargetWaveform",
      "drawPronunciationComparison"
    ];
    names.forEach(name=>{
      if(typeof window[name] === "function"){
        window[name] = function(){
          removeFakeTargetCanvas();
          injectRealReferencePanel();
          return false;
        };
      }
    });
  }

  const oldSpeak = window.speechSynthesis && window.speechSynthesis.speak;
  // Not overriding speech output; only preventing fake graph from being redrawn.
  document.addEventListener("DOMContentLoaded", function(){
    removeFakeTargetCanvas();
    injectRealReferencePanel();
    patchFakeWaveFunctions();
  });

  const observer = new MutationObserver(function(){
    removeFakeTargetCanvas();
    injectRealReferencePanel();
    patchFakeWaveFunctions();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();


/* ===== extracted script block ===== */


(function(){
  "use strict";

  function normalizeText(s){
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z\s']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshteinMatrix(a,b){
    const m = a.length, n = b.length;
    const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + cost
        );
      }
    }
    return dp;
  }

  function alignChars(target, spoken){
    const a = normalizeText(target).replace(/\s/g,"");
    const b = normalizeText(spoken).replace(/\s/g,"");
    const dp = levenshteinMatrix(a,b);
    let i=a.length, j=b.length;
    const out = [];

    while(i>0 || j>0){
      if(i>0 && j>0 && dp[i][j] === dp[i-1][j-1] + (a[i-1]===b[j-1] ? 0 : 1)){
        out.push({target:a[i-1], spoken:b[j-1] || "", status:a[i-1]===b[j-1] ? "ok" : "bad"});
        i--; j--;
      } else if(i>0 && dp[i][j] === dp[i-1][j] + 1){
        out.push({target:a[i-1], spoken:"", status:"missing"});
        i--;
      } else {
        j--;
      }
    }
    return out.reverse();
  }

  const similarGroups = [
    ["v","f","w"],
    ["t","d"],
    ["s","z"],
    ["i","e","y"],
    ["o","u","a"],
    ["r","l"],
    ["c","k","q"],
    ["g","j"],
    ["p","b"]
  ];

  function areClose(a,b){
    if(!a || !b) return false;
    return similarGroups.some(g => g.includes(a) && g.includes(b));
  }

  function makePhonemeResult(target, spoken){
    return alignChars(target, spoken).map(x=>{
      if(x.status === "ok") return x;
      if(x.status === "bad" && areClose(x.target, x.spoken)) return {...x, status:"close"};
      return x;
    });
  }

  function getCurrentWordForPhoneme(){
    if(window.words && typeof window.idx !== "undefined" && window.words[window.idx]){
      return window.words[window.idx].word || window.words[window.idx].en || window.words[window.idx].english || "";
    }
    const el = document.querySelector(".wc-word,.fc-word,#currentWord,[data-current-word]");
    return el ? el.textContent.trim() : "";
  }

  function getLastSpokenText(){
    const candidates = [
      "#liveTranscript",
      ".live-tx .heard",
      ".live-tx",
      "#pronunLiveText",
      "#speechText",
      "#heardText"
    ];
    for(const sel of candidates){
      const el = document.querySelector(sel);
      if(el && el.textContent.trim()) return el.textContent.trim();
    }
    return window.lastRecognizedText || window.WM_lastSpokenText || "";
  }

  function renderPhonemeComparison(target, spoken){
    const host = document.querySelector("#pronunResult") || document.querySelector(".pronun-result") || document.querySelector(".pronun-panel");
    if(!host) return;

    let panel = document.querySelector("#phonemeComparePanel");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "phonemeComparePanel";
      panel.className = "phoneme-compare-panel";
      host.appendChild(panel);
    }

    const result = makePhonemeResult(target, spoken);
    const bads = result.filter(x => x.status === "bad" || x.status === "missing").map(x=>x.target);
    const closes = result.filter(x => x.status === "close").map(x=>x.target);

    let tip = "Yeşil alanlar doğru duyulan bölümler. Sarı yakın ama geliştirilmesi gereken sesleri, kırmızı ise belirgin hataları gösterir.";
    if(bads.length || closes.length){
      tip += " Özellikle şu seslere dikkat et: " + [...new Set([...bads, ...closes])].join(", ") + ".";
    }

    panel.innerHTML = `
      <div class="phoneme-title">🎯 Telaffuz Karşılaştırması</div>
      <div class="phoneme-target-word">${escapeHtml(target || "Kelime yok")}</div>
      <div class="phoneme-legend">
        <span>✅ doğru</span>
        <span>⚠️ yakın</span>
        <span>❌ hatalı/eksik</span>
      </div>
      <div class="phoneme-row">
        ${result.map(x => `
          <span class="phoneme-chip2 ${x.status}" title="Beklenen: ${escapeHtml(x.target)}${x.spoken ? " | Duyulan: " + escapeHtml(x.spoken) : " | Duyulmadı"}">
            ${escapeHtml(x.target)}
          </span>
        `).join("")}
      </div>
      <div class="phoneme-tip">${escapeHtml(tip)}</div>
      <div class="user-wave-only-note">Not: Senin ses dalga grafiğin gerçek kayıt üzerinden kalır. Doğru ses için sahte waveform gösterilmez.</div>
    `;
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function removeTargetReferenceWave(){
    document.querySelectorAll("#realTargetWaveCanvas,#realReferenceAudioInput").forEach(el=>{
      const row = el.closest(".real-wave-row");
      if(row) row.classList.add("target-wave-removed");
      else el.style.display = "none";
    });

    document.querySelectorAll("canvas").forEach(c=>{
      const text = (c.parentElement && c.parentElement.innerText || "").toLowerCase();
      if(text.includes("gerçek doğru ses grafiği") || text.includes("doğru ses grafiği") || text.includes("referans ses")){
        const row = c.closest(".real-wave-row,.wave-row,.comparison-bar");
        if(row) row.classList.add("target-wave-removed");
      }
    });
  }

  // Existing pronunciation result hooks
  window.WM_renderPhonemeComparison = renderPhonemeComparison;

  const observer = new MutationObserver(function(){
    removeTargetReferenceWave();
    const target = getCurrentWordForPhoneme();
    const spoken = getLastSpokenText();
    if(target && spoken) renderPhonemeComparison(target, spoken);
  });

  document.addEventListener("DOMContentLoaded", function(){
    removeTargetReferenceWave();
    observer.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
  });
/* SpeechRecognition monkey-patch kaldırıldı: native constructor korunuyor. */
// If old code calls fake comparison, redirect to phoneme comparison.
  ["drawTargetWaveform","drawCorrectWaveform","drawReferenceWaveform","drawFakeTargetWaveform"].forEach(name=>{
    window[name] = function(){
      removeTargetReferenceWave();
      renderPhonemeComparison(getCurrentWordForPhoneme(), getLastSpokenText());
      return false;
    };
  });
})();


/* ===== extracted script block ===== */


(function(){
"use strict";

function openWordPopupMobile(word){
  if(!word) return;

  if(typeof window.showWordPopup === "function"){
    window.showWordPopup(word);
    return;
  }

  if(typeof window.openWordModal === "function"){
    window.openWordModal(word);
    return;
  }

  alert("Kelime: " + word);
}

function wrapWordsForMobile(container){
  if(!container || container.dataset.mobileWrapped) return;

  const skipTags = ["BUTTON","TEXTAREA","INPUT","SCRIPT","STYLE"];

  function process(node){
    if(node.nodeType === 3){
      const txt = node.textContent;
      if(!txt.trim()) return;

      const frag = document.createDocumentFragment();

      txt.split(/(\s+)/).forEach(part=>{
        if(/^[a-zA-Z'-]{2,}$/.test(part)){
          const span = document.createElement("span");
          span.className = "mobile-popup-word";
          span.textContent = part;

          span.addEventListener("click", function(e){
            e.stopPropagation();
            openWordPopupMobile(part.toLowerCase());
          }, {passive:false});

          span.addEventListener("touchend", function(e){
            e.preventDefault();
            e.stopPropagation();
            openWordPopupMobile(part.toLowerCase());
          }, {passive:false});

          frag.appendChild(span);
        }else{
          frag.appendChild(document.createTextNode(part));
        }
      });

      node.parentNode.replaceChild(frag,node);
      return;
    }

    if(node.nodeType !== 1) return;
    if(skipTags.includes(node.tagName)) return;

    [...node.childNodes].forEach(process);
  }

  process(container);
  container.dataset.mobileWrapped = "1";
}

function addAIButtons(){
  const targets = document.querySelectorAll(
    ".chat-msg.ai,.partner-msg.ai,.conv-msg.ai,#aiOutput,#conversationOutput"
  );

  targets.forEach(box=>{
    if(box.querySelector(".ai-extra-buttons")) return;

    const wrap = document.createElement("div");
    wrap.className = "ai-extra-buttons";

    const trBtn = document.createElement("button");
    trBtn.className = "ai-extra-btn ai-translate-btn";
    trBtn.innerHTML = "🇹🇷 Türkçe Çeviri";

    const sugBtn = document.createElement("button");
    sugBtn.className = "ai-extra-btn ai-suggest-btn";
    sugBtn.innerHTML = "💡 Sen Öner";

    trBtn.onclick = async function(){
      const text = box.innerText.trim();

      if(typeof window.translateText === "function"){
        try{
          const res = await window.translateText(text);
          alert(res);
          return;
        }catch(e){}
      }

      const translated = "Çeviri özelliği AI API ile bağlanabilir.\\n\\nMetin:\\n" + text;
      alert(translated);
    };

    sugBtn.onclick = function(){
      const suggestions = [
        "Daha doğal nasıl söylenir?",
        "Bunu daha kısa söyle",
        "Native gibi söyle",
        "Daha resmi versiyon",
        "Günlük konuşma versiyonu"
      ];

      const pick = suggestions[Math.floor(Math.random()*suggestions.length)];

      if(typeof window.insertChatSuggestion === "function"){
        window.insertChatSuggestion(pick);
      } else {
        const input = document.querySelector(".chat-input,textarea");
        if(input){
          input.value = pick;
          input.focus();
        }
      }
    };

    box.appendChild(wrap);
    wrap.appendChild(trBtn);
    wrap.appendChild(sugBtn);

    wrapWordsForMobile(box);
  });
}

document.addEventListener("DOMContentLoaded", function(){
  addAIButtons();

  const observer = new MutationObserver(function(){
    addAIButtons();

    document.querySelectorAll(
      ".chat-msg,.partner-msg,.conv-msg,#aiOutput,#conversationOutput,.ai-box"
    ).forEach(wrapWordsForMobile);
  });

  observer.observe(document.body,{
    childList:true,
    subtree:true
  });
});
})();


/* ===== extracted script block ===== */


(function(){
"use strict";

function speakTextSafe(text){
  try{
    if(!text || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[ığüşöçİĞÜŞÖÇ]/.test(text) ? "tr-TR" : "en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}

async function translateSafe(text){
  const clean = (text || "").replace(/🇹🇷 Türkçe Çeviri|💡 Sen Öner|🔊/g,"").trim();
  if(!clean) return;

  if(typeof window.callAI === "function"){
    try{
      const prompt = "Translate this English text into natural Turkish. Only return Turkish translation.";
      const res = await window.callAI(prompt, clean, "translate");
      if(res){
        alert(typeof res === "string" ? res : (res.text || JSON.stringify(res)));
        return;
      }
    }catch(e){}
  }

  alert("Türkçe çeviri için AI bağlantısı gerekir.\n\nMetin:\n" + clean);
}

function suggestForRealLife(container){
  const suggestions = [
    "Can you say that more simply?",
    "Could you repeat that, please?",
    "I’m not sure I understand. Can you explain?",
    "That sounds good to me.",
    "Could you give me an example?"
  ];
  const text = suggestions[Math.floor(Math.random()*suggestions.length)];

  const inputs = [
    "#realLifeInput",
    "#scenarioInput",
    "#conversationInput",
    ".conv-input-row textarea",
    ".conv-input-row input",
    ".chat-input",
    "textarea"
  ];

  for(const sel of inputs){
    const el = document.querySelector(sel);
    if(el){
      el.value = text;
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.focus();
      return;
    }
  }

  navigator.clipboard && navigator.clipboard.writeText(text);
  alert("Öneri kopyalandı:\n" + text);
}

function addButtonsToMessage(msg){
  if(!msg || msg.querySelector(".wm-reallife-actions")) return;

  const row = document.createElement("div");
  row.className = "wm-reallife-actions";

  const tr = document.createElement("button");
  tr.className = "wm-translate-btn";
  tr.type = "button";
  tr.textContent = "🇹🇷 Türkçe Çeviri";

  const sug = document.createElement("button");
  sug.className = "wm-suggest-btn";
  sug.type = "button";
  sug.textContent = "💡 Sen Öner";

  const speak = document.createElement("button");
  speak.className = "wm-translate-btn";
  speak.type = "button";
  speak.textContent = "🔊 Oku";

  tr.onclick = function(e){
    e.stopPropagation();
    translateSafe(msg.innerText);
  };
  sug.onclick = function(e){
    e.stopPropagation();
    suggestForRealLife(msg);
  };
  speak.onclick = function(e){
    e.stopPropagation();
    speakTextSafe(msg.innerText.replace(/🇹🇷 Türkçe Çeviri|💡 Sen Öner|🔊 Oku/g,""));
  };

  row.appendChild(tr);
  row.appendChild(sug);
  row.appendChild(speak);
  msg.appendChild(row);
}

function findRealLifeArea(){
  const textMatches = [...document.querySelectorAll("h1,h2,h3,h4,.top-bar,.screen,.card")]
    .filter(el => /gerçek hayat|real life|scenario|senaryo/i.test(el.innerText || ""));

  const areas = new Set();

  textMatches.forEach(el=>{
    const screen = el.closest(".screen") || el.closest(".card") || el;
    areas.add(screen);
  });

  document.querySelectorAll(
    "#realLifeScreen,#realLifeMode,#realLifeOutput,#scenarioScreen,#scenarioOutput,#conversationOutput,.real-life-mode,.scenario-mode,.conv-messages,.partner-chat"
  ).forEach(el=>areas.add(el.closest(".screen") || el));

  return [...areas].filter(Boolean);
}

function applyRealLifeButtons(){
  const areas = findRealLifeArea();

  areas.forEach(area=>{
    // Existing AI message classes
    area.querySelectorAll(
      ".conv-msg.ai,.chat-msg.ai,.partner-msg.ai,.room-msg.other,.ai-msg,.message.ai,.bot-message,.assistant-message"
    ).forEach(addButtonsToMessage);

    // If no message class, add a fixed button panel near output area
    const outputs = area.querySelectorAll("#realLifeOutput,#scenarioOutput,#conversationOutput,.conv-messages,.partner-chat,.chat-messages");
    outputs.forEach(out=>{
      const last = [...out.children].reverse().find(x => (x.innerText || "").trim().length > 10);
      if(last) addButtonsToMessage(last);
    });

    if(!area.querySelector(".real-life-action-row")){
      const input = area.querySelector("textarea,input,.conv-input-row,.chat-input-row");
      const row = document.createElement("div");
      row.className = "real-life-action-row";

      const tr = document.createElement("button");
      tr.className = "wm-translate-btn";
      tr.type = "button";
      tr.textContent = "🇹🇷 Son Mesajı Çevir";

      const sug = document.createElement("button");
      sug.className = "wm-suggest-btn";
      sug.type = "button";
      sug.textContent = "💡 Sen Öner";

      tr.onclick = function(){
        const msgs = area.querySelectorAll(".conv-msg.ai,.chat-msg.ai,.partner-msg.ai,.room-msg.other,.ai-msg,.message.ai,.bot-message,.assistant-message");
        const last = msgs[msgs.length-1] || area;
        translateSafe(last.innerText);
      };
      sug.onclick = function(){ suggestForRealLife(area); };

      row.appendChild(tr);
      row.appendChild(sug);

      if(input && input.parentNode){
        input.parentNode.insertBefore(row, input);
      }else{
        area.appendChild(row);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function(){
  applyRealLifeButtons();
  const obs = new MutationObserver(applyRealLifeButtons);
  obs.observe(document.body, {childList:true, subtree:true});
});
})();


/* ===== extracted script block ===== */


(function(){
"use strict";

const WM = window.WordModePro = window.WordModePro || {};
const STORAGE_KEY = "wm_pro_phase_state_v1";

WM.state = Object.assign({
  level:"A2",
  accent:"en-US",
  activeScenario:"coffee",
  activeCharacter:"emma",
  customScenarios:[],
  memory:{
    weakSounds:{},
    grammarIssues:{},
    scenarioUsage:{},
    speakingScores:[]
  }
}, loadState());

WM.scenarios = {
  coffee:{
    title:"Coffee Shop",
    emoji:"☕",
    role:"Barista",
    goal:"Order a drink naturally",
    palette:["#5b371f","#b7791f","#f6ad55"],
    desc:"Busy cafe, morning queue, friendly service."
  },
  airport:{
    title:"Airport Check-in",
    emoji:"✈️",
    role:"Airport Staff",
    goal:"Check in and ask travel questions",
    palette:["#1e3a8a","#38bdf8","#c7d2fe"],
    desc:"Airport counter, suitcase, boarding screen."
  },
  hotel:{
    title:"Hotel Reception",
    emoji:"🏨",
    role:"Receptionist",
    goal:"Check in, ask for help, solve issues",
    palette:["#312e81","#a78bfa","#fde68a"],
    desc:"Hotel lobby, reservation desk, polite tone."
  },
  taxi:{
    title:"Taxi Ride",
    emoji:"🚕",
    role:"Taxi Driver",
    goal:"Give directions and make small talk",
    palette:["#78350f","#facc15","#111827"],
    desc:"City traffic, short practical conversation."
  },
  interview:{
    title:"Job Interview",
    emoji:"💼",
    role:"Interviewer",
    goal:"Answer interview questions confidently",
    palette:["#111827","#64748b","#60a5fa"],
    desc:"Formal meeting room, professional tone."
  },
  doctor:{
    title:"Doctor Visit",
    emoji:"👨‍⚕️",
    role:"Doctor",
    goal:"Explain symptoms clearly",
    palette:["#064e3b","#34d399","#e0f2fe"],
    desc:"Clinic room, careful questions, simple explanations."
  }
};

WM.characters = {
  emma:{name:"Emma",emoji:"👩",gender:"female",personality:"friendly",voiceHint:["female","woman","zira","samantha","google us english"],style:"warm, patient, encouraging"},
  mike:{name:"Mike",emoji:"👨",gender:"male",personality:"casual",voiceHint:["male","man","david","alex","google uk english male"],style:"casual, direct, natural"},
  sophia:{name:"Sophia",emoji:"👩‍💼",gender:"female",personality:"formal",voiceHint:["female","woman","serena","susan"],style:"formal, clear, polite"},
  jack:{name:"Jack",emoji:"🧔",gender:"male",personality:"funny",voiceHint:["male","man","daniel","tom"],style:"funny, energetic, quick"}
};

WM.levelGuides = {
  A1:"Use very short sentences, basic words, one question at a time.",
  A2:"Use simple daily conversation and clear follow-up questions.",
  B1:"Use natural but not too complex English. Encourage full sentence answers.",
  B2:"Use more natural expressions, idioms lightly, and realistic speed.",
  C1:"Use native-like phrasing, nuance, and realistic conversation flow."
};

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(WM.state)); }
function loadState(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch(e){return{}} }

function toast(msg){
  document.querySelectorAll(".wm-toast").forEach(x=>x.remove());
  const el=document.createElement("div");
  el.className="wm-toast";
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function svgHero(scenario){
  const p = scenario.palette || ["#1e3a8a","#38bdf8","#c7d2fe"];
  const emoji = scenario.emoji || "🌍";
  return `
  <svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(scenario.title)}">
    <defs>
      <linearGradient id="wmgrad${scenario.title.replace(/\W/g,'')}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p[0]}"/>
        <stop offset=".55" stop-color="${p[1]}"/>
        <stop offset="1" stop-color="${p[2]}"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <rect width="720" height="300" fill="url(#wmgrad${scenario.title.replace(/\W/g,'')})"/>
    <circle cx="590" cy="65" r="76" fill="rgba(255,255,255,.16)" filter="url(#blur)"/>
    <circle cx="120" cy="250" r="110" fill="rgba(0,0,0,.12)" filter="url(#blur)"/>
    <text x="62" y="155" font-size="92">${emoji}</text>
    <rect x="230" y="72" width="410" height="42" rx="18" fill="rgba(255,255,255,.16)"/>
    <rect x="230" y="132" width="330" height="32" rx="16" fill="rgba(255,255,255,.13)"/>
    <rect x="230" y="182" width="250" height="28" rx="14" fill="rgba(0,0,0,.16)"/>
    <path d="M0 245 C120 215 220 282 360 248 C500 212 600 244 720 218 L720 300 L0 300 Z" fill="rgba(0,0,0,.22)"/>
  </svg>`;
}

function getAllScenarios(){
  const custom = {};
  (WM.state.customScenarios||[]).forEach((s,i)=>custom["custom_"+i]=s);
  return Object.assign({}, WM.scenarios, custom);
}

function selectedScenario(){
  const all = getAllScenarios();
  return all[WM.state.activeScenario] || all.coffee;
}
function selectedCharacter(){
  return WM.characters[WM.state.activeCharacter] || WM.characters.emma;
}

function chooseVoice(){
  const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  const ch = selectedCharacter();
  const accent = WM.state.accent || "en-US";
  const hints = ch.voiceHint || [];
  let v = voices.find(v => v.lang === accent && hints.some(h=>v.name.toLowerCase().includes(h)));
  if(!v) v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(accent.toLowerCase().split("-")[0]) && hints.some(h=>v.name.toLowerCase().includes(h)));
  if(!v) v = voices.find(v => v.lang === accent);
  if(!v) v = voices.find(v => v.lang && v.lang.startsWith("en"));
  return v || null;
}

WM.speak = function(text){
  if(!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/🇹🇷.*|💡.*|🔊.*/g,""));
  u.lang = WM.state.accent || "en-US";
  const v = chooseVoice();
  if(v) u.voice = v;
  const level = WM.state.level;
  u.rate = level === "A1" ? .78 : level === "A2" ? .86 : level === "B1" ? .95 : level === "B2" ? 1.03 : 1.08;
  u.pitch = selectedCharacter().gender === "female" ? 1.08 : .92;
  speechSynthesis.speak(u);
};

function scenarioPrompt(){
  const sc = selectedScenario();
  const ch = selectedCharacter();
  return `You are ${ch.name}, a ${ch.personality} ${sc.role}. Scenario: ${sc.title}. Goal: ${sc.goal}. Personality style: ${ch.style}. Level: ${WM.state.level}. ${WM.levelGuides[WM.state.level]}. Ask one question at a time. Correct softly when needed.`;
}

WM.makeSuggestions = function(contextText){
  const sc = selectedScenario();
  const lvl = WM.state.level;
  const samples = {
    A1:["Yes, please.","I want coffee.","Thank you."],
    A2:["I’d like a coffee, please.","Can you help me, please?","How much is it?"],
    B1:["Could I have a coffee, please?","I’m looking for something not too expensive.","Could you explain that again?"],
    B2:["I’ll have a latte, if that’s okay.","I’m not sure yet. What would you recommend?","Could you give me a bit more detail?"],
    C1:["I’m leaning toward a latte. What would you recommend?","Could you walk me through the options?","That sounds reasonable, but I’d like to clarify one thing."]
  };
  let arr = samples[lvl] || samples.A2;
  if(sc.title.toLowerCase().includes("airport")){
    arr = lvl==="A1" ? ["I have a ticket.","Here is my passport.","Where is gate five?"] :
          lvl==="A2" ? ["I’d like to check in, please.","Here is my passport.","Where is the boarding gate?"] :
          lvl==="B1" ? ["Could you help me check in for my flight?","Do I need to check this bag?","Could you tell me where security is?"] :
          lvl==="B2" ? ["I’m checking in for the flight to London.","Could you confirm whether my bag is included?","Is there any delay I should know about?"] :
          ["I’m checking in for my London flight and wanted to confirm the baggage allowance.","Could you let me know if there are any schedule changes?","Would it be possible to get an aisle seat?"];
  }
  if(sc.title.toLowerCase().includes("interview")){
    arr = lvl==="A1" ? ["I am a student.","I like learning.","I can work hard."] :
          lvl==="A2" ? ["I have experience with computers.","I’m good at learning new things.","I want to improve my skills."] :
          lvl==="B1" ? ["I have worked on several small projects.","I’m comfortable learning new tools quickly.","I enjoy solving practical problems."] :
          lvl==="B2" ? ["In my previous projects, I focused on building practical solutions.","I’d describe myself as adaptable and detail-oriented.","I’m especially interested in improving user experience."] :
          ["I tend to combine practical problem-solving with a strong focus on user experience.","One strength I bring is the ability to learn quickly and turn feedback into improvements.","I’m looking for a role where I can grow while contributing meaningfully."];
  }
  return arr;
};

function insertIntoBestInput(text){
  const selectors = ["#realLifeInput","#scenarioInput","#conversationInput",".conv-input-row textarea",".conv-input-row input",".chat-input","textarea","input[type='text']"];
  for(const sel of selectors){
    const el = document.querySelector(sel);
    if(el && !el.disabled){
      el.value = text;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.focus();
      return true;
    }
  }
  return false;
}

function renderSuggestionCards(host, context){
  if(!host) return;
  host.querySelectorAll(".wm-suggestion-box").forEach(x=>x.remove());
  const box=document.createElement("div");
  box.className="wm-suggestion-box";
  const suggestions=WM.makeSuggestions(context);
  box.innerHTML = `<div class="wm-suggestion-title">💡 Seviyene uygun cevap önerileri</div>` + suggestions.map((s,i)=>`
    <div class="wm-suggestion-card">
      <div class="wm-suggestion-label">${i===0?"Kolay":i===1?"Doğal":"Daha iyi"}</div>
      <div class="wm-suggestion-text">${escapeHtml(s)}</div>
      <div class="wm-suggestion-actions">
        <button class="wm-mini-btn wm-btn-green" data-use="${escapeHtml(s)}">Kullan</button>
        <button class="wm-mini-btn wm-btn-purple" data-speak="${escapeHtml(s)}">Oku</button>
        <button class="wm-mini-btn wm-btn-ghost" data-copy="${escapeHtml(s)}">Kopyala</button>
      </div>
    </div>
  `).join("");
  box.addEventListener("click", e=>{
    const use=e.target.getAttribute("data-use");
    const speak=e.target.getAttribute("data-speak");
    const copy=e.target.getAttribute("data-copy");
    if(use){ insertIntoBestInput(use); toast("Cevap yazı alanına eklendi."); }
    if(speak){ WM.speak(speak); }
    if(copy){ navigator.clipboard && navigator.clipboard.writeText(copy); toast("Kopyalandı."); }
  });
  host.appendChild(box);
}

function translateTextBasic(text){
  const t = String(text||"").replace(/🇹🇷 Türkçe Çeviri|💡 Sen Öner|🔊 Oku/g,"").trim();
  if(!t) return;
  if(typeof window.callAI === "function"){
    try{
      const maybe = window.callAI("Translate this English text into natural Turkish. Only Turkish.", t, "translate");
      if(maybe && typeof maybe.then==="function"){
        maybe.then(r=>alert(typeof r==="string"?r:(r.text||JSON.stringify(r)))).catch(()=>alert("AI çeviri bağlantısı başarısız.\n\nMetin:\n"+t));
        return;
      }
    }catch(e){}
  }
  alert("AI çeviri API bağlantısı yoksa otomatik çeviri yapılamaz.\n\nÇevrilecek metin:\n"+t);
}

function addActionButtonsToMessage(msg){
  if(!msg || msg.querySelector(".wm-reallife-actions")) return;
  const row=document.createElement("div");
  row.className="wm-reallife-actions wm-btn-row";
  row.innerHTML = `
    <button type="button" class="wm-btn wm-btn-purple">🇹🇷 Türkçe Çeviri</button>
    <button type="button" class="wm-btn wm-btn-ghost">🔊 Oku</button>
  `;
  const [tr,spk]=row.querySelectorAll("button");
  tr.onclick=e=>{e.stopPropagation();translateTextBasic(msg.innerText);};
  spk.onclick=e=>{e.stopPropagation();WM.speak(msg.innerText);};
  msg.appendChild(row);
}

function renderControlPanel(){
  const areas = findRealLifeAreas();
  areas.forEach(area=>{
    if(area.querySelector(".wm-phase-panel")) return;

    const sc = selectedScenario();
    const panel=document.createElement("div");
    panel.className="wm-pro-panel wm-phase-panel";
    panel.innerHTML=`
      <div class="wm-hero">
        ${svgHero(sc)}
        <div class="wm-hero-caption">
          <b>${escapeHtml(sc.emoji+" "+sc.title)}</b>
          <span>${escapeHtml(sc.desc || sc.goal || "")}</span>
        </div>
      </div>
      <div class="wm-pro-title">🎭 Gerçek Hayat Koçu</div>
      <div class="wm-pro-sub">Seviye, senaryo, karakter, ses ve kişilik seç.</div>

      <div class="wm-pro-sub"><b>Seviye</b></div>
      <div class="wm-chip-row" data-wm-levels>
        ${["A1","A2","B1","B2","C1"].map(l=>`<span class="wm-chip ${WM.state.level===l?"active":""}" data-level="${l}">${l}</span>`).join("")}
      </div>

      <div class="wm-grid-2">
        <div>
          <div class="wm-pro-sub"><b>Senaryo</b></div>
          <select class="wm-select" data-scenario-select>
            ${Object.entries(getAllScenarios()).map(([k,s])=>`<option value="${escapeHtml(k)}" ${WM.state.activeScenario===k?"selected":""}>${escapeHtml((s.emoji||"🌍")+" "+s.title)}</option>`).join("")}
          </select>
        </div>
        <div>
          <div class="wm-pro-sub"><b>Aksan</b></div>
          <select class="wm-select" data-accent-select>
            <option value="en-US" ${WM.state.accent==="en-US"?"selected":""}>🇺🇸 American</option>
            <option value="en-GB" ${WM.state.accent==="en-GB"?"selected":""}>🇬🇧 British</option>
            <option value="en-AU" ${WM.state.accent==="en-AU"?"selected":""}>🇦🇺 Australian</option>
          </select>
        </div>
      </div>

      <div class="wm-pro-sub" style="margin-top:10px"><b>Konuşmacı Kişiliği</b></div>
      <div class="wm-character-grid">
        ${Object.entries(WM.characters).map(([k,c])=>`
          <div class="wm-character ${WM.state.activeCharacter===k?"active":""}" data-character="${k}">
            <div class="wm-char-emoji">${c.emoji}</div>
            <div class="wm-char-name">${escapeHtml(c.name)}</div>
            <div class="wm-char-meta">${escapeHtml(c.gender+" • "+c.personality)}</div>
          </div>
        `).join("")}
      </div>

      <div class="wm-btn-row">
        <button class="wm-btn wm-btn-blue" data-start-roleplay>▶️ Bu Ayarlarla Başlat</button>
        <button class="wm-btn wm-btn-purple" data-add-scenario>➕ Yeni Senaryo</button>
      </div>

      <div class="wm-stat-grid">
        <div class="wm-stat"><div class="wm-stat-val" data-wm-sessions>0</div><div class="wm-stat-lbl">Senaryo kullanımı</div></div>
        <div class="wm-stat"><div class="wm-stat-val" data-wm-avg>--</div><div class="wm-stat-lbl">Ortalama speaking</div></div>
      </div>
      <div class="wm-score-bars">
        <div class="wm-score-line"><span>Pronunciation</span><div class="wm-score-track"><div class="wm-score-fill" style="width:78%"></div></div><span>78</span></div>
        <div class="wm-score-line"><span>Grammar</span><div class="wm-score-track"><div class="wm-score-fill" style="width:72%"></div></div><span>72</span></div>
        <div class="wm-score-line"><span>Fluency</span><div class="wm-score-track"><div class="wm-score-fill" style="width:69%"></div></div><span>69</span></div>
        <div class="wm-score-line"><span>Naturalness</span><div class="wm-score-track"><div class="wm-score-fill" style="width:65%"></div></div><span>65</span></div>
      </div>
    `;
    const insertBefore = area.querySelector(".conv-messages,.partner-chat,.chat-messages,#conversationOutput,#realLifeOutput") || area.firstChild;
    area.insertBefore(panel, insertBefore);

    bindPanel(panel, area);
  });
}

function bindPanel(panel, area){
  panel.querySelectorAll("[data-level]").forEach(chip=>{
    chip.onclick=()=>{
      WM.state.level=chip.dataset.level; saveState(); rerenderPanels(); toast("Seviye: "+WM.state.level);
    };
  });
  panel.querySelector("[data-scenario-select]").onchange=e=>{
    WM.state.activeScenario=e.target.value; saveState(); rerenderPanels();
  };
  panel.querySelector("[data-accent-select]").onchange=e=>{
    WM.state.accent=e.target.value; saveState(); toast("Aksan güncellendi.");
  };
  panel.querySelectorAll("[data-character]").forEach(card=>{
    card.onclick=()=>{
      WM.state.activeCharacter=card.dataset.character; saveState(); rerenderPanels(); toast("Karakter: "+selectedCharacter().name);
    };
  });
  panel.querySelector("[data-global-suggest]").onclick=()=>renderSuggestionCards(panel, "");
  panel.querySelector("[data-start-roleplay]").onclick=()=>{
    const first = `Hi, I'm ${selectedCharacter().name}. ${startQuestionForScenario()}`;
    appendAIMessage(area, first);
    WM.speak(first);
    WM.state.memory.scenarioUsage[WM.state.activeScenario]=(WM.state.memory.scenarioUsage[WM.state.activeScenario]||0)+1;
    saveState();
  };
  panel.querySelector("[data-add-scenario]").onclick=()=>showScenarioCreator(panel);
  updatePanelStats(panel);
}

function startQuestionForScenario(){
  const sc = selectedScenario().title.toLowerCase();
  const lvl = WM.state.level;
  if(sc.includes("coffee")) return lvl==="A1" ? "What do you want?" : "What would you like to order today?";
  if(sc.includes("airport")) return lvl==="A1" ? "Passport, please." : "May I see your passport and ticket, please?";
  if(sc.includes("hotel")) return lvl==="A1" ? "Do you have a reservation?" : "Welcome. Do you have a reservation with us?";
  if(sc.includes("taxi")) return lvl==="A1" ? "Where do you go?" : "Where would you like to go today?";
  if(sc.includes("interview")) return lvl==="A1" ? "Tell me about you." : "Could you tell me a little about yourself?";
  if(sc.includes("doctor")) return lvl==="A1" ? "What is wrong?" : "What symptoms are you experiencing?";
  return "How can I help you today?";
}

function appendAIMessage(area, text){
  const container = area.querySelector(".conv-messages,.partner-chat,.chat-messages,#conversationOutput,#realLifeOutput") || area;
  const msg=document.createElement("div");
  msg.className="conv-msg ai";
  msg.textContent=text;
  container.appendChild(msg);
  addActionButtonsToMessage(msg);
  wrapWords(msg);
  container.scrollTop = container.scrollHeight;
}

function showScenarioCreator(host){
  host.querySelectorAll(".wm-scenario-creator").forEach(x=>x.remove());
  const box=document.createElement("div");
  box.className="wm-pro-panel wm-scenario-creator";
  box.innerHTML=`
    <div class="wm-pro-title">➕ Yeni Senaryo Ekle</div>
    <input class="wm-input" data-new-title placeholder="Senaryo adı: Amerika vize görüşmesi">
    <textarea class="wm-textarea" data-new-desc placeholder="Ortam açıklaması ve hedef: A visa officer asks questions. I need to answer confidently."></textarea>
    <div class="wm-grid-2">
      <input class="wm-input" data-new-emoji placeholder="Emoji: 🛂">
      <input class="wm-input" data-new-role placeholder="AI rolü: Visa Officer">
    </div>
    <div class="wm-btn-row">
      <button class="wm-btn wm-btn-green" data-save-scenario>Kaydet</button>
      <button class="wm-btn wm-btn-ghost" data-cancel-scenario>Vazgeç</button>
    </div>
  `;
  host.appendChild(box);
  box.querySelector("[data-cancel-scenario]").onclick=()=>box.remove();
  box.querySelector("[data-save-scenario]").onclick=()=>{
    const title=box.querySelector("[data-new-title]").value.trim();
    const desc=box.querySelector("[data-new-desc]").value.trim();
    const emoji=box.querySelector("[data-new-emoji]").value.trim() || "🌍";
    const role=box.querySelector("[data-new-role]").value.trim() || "Conversation Partner";
    if(!title){toast("Senaryo adı gerekli."); return;}
    WM.state.customScenarios = WM.state.customScenarios || [];
    WM.state.customScenarios.push({
      title, desc, emoji, role, goal:desc || "Practice real-life English", palette:["#0f172a","#3b82f6","#a78bfa"]
    });
    WM.state.activeScenario = "custom_" + (WM.state.customScenarios.length-1);
    saveState();
    rerenderPanels();
    toast("Yeni senaryo eklendi.");
  };
}

function updatePanelStats(panel){
  const usage = WM.state.memory.scenarioUsage[WM.state.activeScenario] || 0;
  const scores = WM.state.memory.speakingScores || [];
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : "--";
  const a=panel.querySelector("[data-wm-sessions]");
  const b=panel.querySelector("[data-wm-avg]");
  if(a) a.textContent=usage;
  if(b) b.textContent=avg;
}

function rerenderPanels(){
  document.querySelectorAll(".wm-phase-panel").forEach(x=>x.remove());
  renderControlPanel();
}

function findRealLifeAreas(){
  const areas = new Set();
  document.querySelectorAll(".screen,.card,section,div").forEach(el=>{
    const txt=(el.innerText||"").slice(0,800).toLowerCase();
    if(txt.includes("gerçek hayat") || txt.includes("real life") || txt.includes("senaryo") || txt.includes("scenario")){
      const screen=el.closest(".screen") || el;
      areas.add(screen);
    }
  });
  document.querySelectorAll("#realLifeScreen,#realLifeMode,#scenarioScreen,#conversationOutput,.conv-messages").forEach(el=>areas.add(el.closest(".screen")||el));
  return [...areas].filter(Boolean).slice(0,3);
}

function wrapWords(container){
  if(!container || container.dataset.wmWordsWrapped) return;
  const skip=["BUTTON","TEXTAREA","INPUT","SCRIPT","STYLE","SELECT","OPTION"];
  function walk(node){
    if(node.nodeType===3){
      const txt=node.nodeValue;
      if(!txt || !/[a-zA-Z]/.test(txt)) return;
      const frag=document.createDocumentFragment();
      txt.split(/(\s+)/).forEach(part=>{
        if(/^[a-zA-Z][a-zA-Z'-]{1,}$/.test(part)){
          const sp=document.createElement("span");
          sp.className="wm-mobile-word";
          sp.textContent=part;
          const open=(e)=>{e.preventDefault();e.stopPropagation();openWordPopup(part.toLowerCase());};
          sp.addEventListener("click",open,{passive:false});
          sp.addEventListener("touchend",open,{passive:false});
          frag.appendChild(sp);
        }else frag.appendChild(document.createTextNode(part));
      });
      node.parentNode && node.parentNode.replaceChild(frag,node);
      return;
    }
    if(node.nodeType!==1 || skip.includes(node.tagName)) return;
    [...node.childNodes].forEach(walk);
  }
  walk(container);
  container.dataset.wmWordsWrapped="1";
}

function openWordPopup(word){
  if(!word) return;
  if(typeof window.showWordPopup==="function") return window.showWordPopup(word);
  if(typeof window.openWordModal==="function") return window.openWordModal(word);
  if(window.dictionary && window.dictionary[word]){
    const d=window.dictionary[word];
    alert(`${word}\n${d.tr_pron||""}\n${(d.meanings||[]).join(", ")}\nCEFR: ${d.cefr||"-"} | Zipf: ${d.zipf||"-"}`);
    return;
  }
  alert("Kelime: " + word);
}

function enhanceMessages(){
  document.querySelectorAll(".conv-msg.ai,.chat-msg.ai,.partner-msg.ai,.room-msg.other,.ai-msg,.message.ai,.bot-message,.assistant-message").forEach(msg=>{
    addActionButtonsToMessage(msg);
    wrapWords(msg);
  });
}

function observeSpeech(){}
function boot(){
  renderControlPanel();
  enhanceMessages();
  const obs=new MutationObserver(()=>{renderControlPanel(); enhanceMessages();});
  obs.observe(document.body,{childList:true,subtree:true});
  if(window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined){
    speechSynthesis.onvoiceschanged = function(){};
  }
}

document.addEventListener("DOMContentLoaded", boot);

// Public helpers
WM.saveState = saveState;
WM.toast = toast;
WM.scenarioPrompt = scenarioPrompt;
WM.insertSuggestion = insertIntoBestInput;
})();


/* ===== extracted script block ===== */


(function(){
"use strict";

const WMFR = window.WMForcedRealLife = window.WMForcedRealLife || {};
const KEY = "wm_forced_reallife_v2";

WMFR.state = Object.assign({
  level:"A2",
  accent:"en-US",
  scenario:"airport",
  character:"emma",
  custom:[]
}, load());

const scenarios = {
  airport:{title:"Airport Check-in",emoji:"✈️",role:"Airport Staff",desc:"Passport, ticket, gate and baggage practice.",palette:["#0f172a","#2563eb","#93c5fd"]},
  coffee:{title:"Coffee Shop",emoji:"☕",role:"Barista",desc:"Order drinks, ask prices, make small talk.",palette:["#3b2415","#b7791f","#fbbf24"]},
  hotel:{title:"Hotel Reception",emoji:"🏨",role:"Receptionist",desc:"Check in, reservation, room problems.",palette:["#312e81","#7c3aed","#fde68a"]},
  taxi:{title:"Taxi Ride",emoji:"🚕",role:"Taxi Driver",desc:"Directions, payment, city conversation.",palette:["#78350f","#facc15","#111827"]},
  interview:{title:"Job Interview",emoji:"💼",role:"Interviewer",desc:"Introduce yourself and answer questions.",palette:["#111827","#475569","#60a5fa"]},
  doctor:{title:"Doctor Visit",emoji:"🩺",role:"Doctor",desc:"Explain symptoms and understand advice.",palette:["#064e3b","#10b981","#e0f2fe"]}
};

const chars = {
  emma:{name:"Emma",emoji:"👩",gender:"female",style:"friendly and patient"},
  mike:{name:"Mike",emoji:"👨",gender:"male",style:"casual and direct"},
  sophia:{name:"Sophia",emoji:"👩‍💼",gender:"female",style:"formal and clear"},
  jack:{name:"Jack",emoji:"🧔",gender:"male",style:"funny and energetic"}
};

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
function save(){localStorage.setItem(KEY,JSON.stringify(WMFR.state))}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){document.querySelectorAll(".wmfr-toast").forEach(x=>x.remove());const d=document.createElement("div");d.className="wmfr-toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}

function allScenarios(){
  const out = Object.assign({}, scenarios);
  (WMFR.state.custom||[]).forEach((s,i)=>out["custom_"+i]=s);
  return out;
}
function sc(){return allScenarios()[WMFR.state.scenario] || scenarios.airport}
function ch(){return chars[WMFR.state.character] || chars.emma}

function heroSvg(s){
  const p=s.palette||["#111827","#3b82f6","#a78bfa"];
  return `<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="gwmfr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".55" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient></defs>
    <rect width="800" height="300" fill="url(#gwmfr)"/>
    <circle cx="640" cy="70" r="80" fill="rgba(255,255,255,.14)"/>
    <circle cx="120" cy="250" r="120" fill="rgba(0,0,0,.16)"/>
    <text x="68" y="166" font-size="96">${s.emoji||"🌍"}</text>
    <rect x="260" y="78" width="410" height="44" rx="22" fill="rgba(255,255,255,.15)"/>
    <rect x="260" y="142" width="320" height="34" rx="17" fill="rgba(255,255,255,.13)"/>
    <rect x="260" y="194" width="240" height="30" rx="15" fill="rgba(0,0,0,.18)"/>
  </svg>`;
}

function findRealLifeRoot(){
  // En güvenilir yöntem: başlık metnine göre en yakın büyük screen/card alanını bul.
  const nodes = [...document.querySelectorAll("h1,h2,h3,h4,div,section")];
  const title = nodes.find(el => (el.innerText||"").trim().includes("Gerçek Hayat Konuşması"));
  if(title){
    return title.closest(".screen") || title.closest(".card") || title.parentElement || title;
  }

  // Yedek: ekran içinde senaryo butonları varsa onları kapsayan alan
  const scenarioButton = nodes.find(el => /Airport|Coffee Shop|Job Interview/.test(el.innerText||""));
  if(scenarioButton){
    return scenarioButton.closest(".screen") || scenarioButton.closest(".card") || scenarioButton.parentElement || scenarioButton;
  }

  return document.querySelector("#app") || document.body;
}

function dockTarget(root){
  // Başlık sonrası ekle, mümkünse ilk senaryo butonlarından önce.
  const buttonsArea = [...root.querySelectorAll("div")].find(el => /Airport/.test(el.innerText||"") && /Coffee Shop/.test(el.innerText||""));
  return buttonsArea || root.firstElementChild || root;
}

function render(){
  const root = findRealLifeRoot();
  if(!root || document.getElementById("wmForcedRealLifeCoach")) return;

  const s = sc();
  const panel = document.createElement("div");
  panel.id = "wmForcedRealLifeCoach";
  panel.innerHTML = `
    <div class="wmfr-hero">
      ${heroSvg(s)}
      <div class="wmfr-cap"><b>${esc(s.emoji+" "+s.title)}</b><span>${esc(s.desc)}</span></div>
    </div>

    <div class="wmfr-title">🎭 Gerçek Hayat Koçu</div>
    <div class="wmfr-sub">Seviye, senaryo, karakter ve ses tarzını seç.</div>

    <div class="wmfr-label">Seviye</div>
    <div class="wmfr-row" id="wmfrLevelRow">
      ${["A1","A2","B1","B2","C1"].map(l=>`<button class="wmfr-chip ${WMFR.state.level===l?"active":""}" data-level="${l}">${l}</button>`).join("")}
    </div>

    <div class="wmfr-grid">
      <div>
        <div class="wmfr-label">Senaryo</div>
        <select class="wmfr-select" id="wmfrScenario">
          ${Object.entries(allScenarios()).map(([k,v])=>`<option value="${esc(k)}" ${WMFR.state.scenario===k?"selected":""}>${esc((v.emoji||"🌍")+" "+v.title)}</option>`).join("")}
        </select>
      </div>
      <div>
        <div class="wmfr-label">Aksan</div>
        <select class="wmfr-select" id="wmfrAccent">
          <option value="en-US" ${WMFR.state.accent==="en-US"?"selected":""}>🇺🇸 American</option>
          <option value="en-GB" ${WMFR.state.accent==="en-GB"?"selected":""}>🇬🇧 British</option>
          <option value="en-AU" ${WMFR.state.accent==="en-AU"?"selected":""}>🇦🇺 Australian</option>
        </select>
      </div>
    </div>

    <div class="wmfr-label">Konuşmacı kişiliği</div>
    <div class="wmfr-char-grid">
      ${Object.entries(chars).map(([k,c])=>`
        <div class="wmfr-char ${WMFR.state.character===k?"active":""}" data-char="${k}">
          <div class="wmfr-emoji">${c.emoji}</div>
          <div class="wmfr-name">${esc(c.name)}</div>
          <div class="wmfr-meta">${esc(c.gender+" • "+c.style)}</div>
        </div>`).join("")}
    </div>

    <div class="wmfr-btnrow">
      <button class="wmfr-btn wmfr-blue" id="wmfrStart">▶️ Başlat</button>
      <button class="wmfr-btn wmfr-purple" id="wmfrAddScenario">➕ Yeni Senaryo</button>
      <button class="wmfr-btn wmfr-ghost" id="wmfrSpeak">🔊 Son Mesajı Oku</button>
    </div>
  `;

  const target = dockTarget(root);
  if(target && target.parentNode){
    target.parentNode.insertBefore(panel, target);
  }else{
    root.insertBefore(panel, root.firstChild);
  }

  bind(panel);
}

function refresh(){
  const old = document.getElementById("wmForcedRealLifeCoach");
  if(old) old.remove();
  setTimeout(render, 50);
}

function bind(panel){
  panel.querySelectorAll("[data-level]").forEach(btn=>btn.onclick=()=>{WMFR.state.level=btn.dataset.level;save();refresh();toast("Seviye: "+WMFR.state.level)});
  panel.querySelectorAll("[data-char]").forEach(card=>card.onclick=()=>{WMFR.state.character=card.dataset.char;save();refresh();toast("Karakter: "+ch().name)});
  panel.querySelector("#wmfrScenario").onchange=e=>{WMFR.state.scenario=e.target.value;save();refresh()};
  panel.querySelector("#wmfrAccent").onchange=e=>{WMFR.state.accent=e.target.value;save();toast("Aksan değişti")};
  panel.querySelector("#wmfrStart").onclick=()=>startRoleplay();
  panel.querySelector("#wmfrSpeak").onclick=()=>speak(lastAiText());
  panel.querySelector("#wmfrAddScenario").onclick=()=>scenarioCreator(panel);
}

function firstQuestion(){
  const title = sc().title.toLowerCase();
  const l = WMFR.state.level;
  if(title.includes("airport")) return l==="A1" ? "Passport, please." : "Good morning. May I see your passport and ticket, please?";
  if(title.includes("coffee")) return l==="A1" ? "What do you want?" : "Hi! What would you like to order today?";
  if(title.includes("hotel")) return l==="A1" ? "Reservation?" : "Welcome to our hotel. Do you have a reservation?";
  if(title.includes("taxi")) return l==="A1" ? "Where do you go?" : "Where would you like to go today?";
  if(title.includes("interview")) return l==="A1" ? "Tell me about you." : "Could you tell me a little about yourself?";
  if(title.includes("doctor")) return l==="A1" ? "What is wrong?" : "What symptoms are you experiencing?";
  return "How can I help you today?";
}

function startRoleplay(){
  const text = firstQuestion();
  appendMessage(text);
  speak(text);
}

function appendMessage(text){
  const root = findRealLifeRoot();
  const container = root.querySelector(".conv-messages,.partner-chat,.chat-messages,#conversationOutput,#realLifeOutput") || 
                    [...root.querySelectorAll("div")].find(el => /Son Mesajı Çevir/.test(el.innerText||"")) ||
                    root;
  const msg = document.createElement("div");
  msg.className = "conv-msg ai wmfr-ai-msg";
  msg.style.cssText = "background:var(--bg2,#131720);border:1px solid var(--border,#252d42);border-radius:14px;padding:14px;margin:10px 0;color:var(--text,#e8eaf6);font-size:16px;line-height:1.6;";
  msg.textContent = text;
  container.appendChild(msg);
}

function lastAiText(){
  const root = findRealLifeRoot();
  const msgs = root.querySelectorAll(".conv-msg.ai,.chat-msg.ai,.partner-msg.ai,.wmfr-ai-msg");
  const last = msgs[msgs.length-1];
  return last ? last.innerText : firstQuestion();
}

function speak(text){
  if(!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/🇹🇷.*|💡.*|🔊.*/g,""));
  u.lang = WMFR.state.accent || "en-US";
  const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  const gender = ch().gender;
  const voice = voices.find(v => v.lang === u.lang && new RegExp(gender==="female"?"female|woman|zira|samantha|susan|serena":"male|man|david|alex|daniel|tom","i").test(v.name)) ||
                voices.find(v => v.lang === u.lang) ||
                voices.find(v => /^en/i.test(v.lang));
  if(voice) u.voice = voice;
  u.pitch = gender==="female" ? 1.08 : .92;
  u.rate = WMFR.state.level==="A1" ? .78 : WMFR.state.level==="A2" ? .86 : WMFR.state.level==="B1" ? .95 : WMFR.state.level==="B2" ? 1.03 : 1.08;
  speechSynthesis.speak(u);
}

function suggestions(){
  const l = WMFR.state.level, title = sc().title.toLowerCase();
  const base = {
    A1:["Yes, please.","I want coffee.","Thank you."],
    A2:["I’d like a coffee, please.","Can you help me, please?","How much is it?"],
    B1:["Could you help me, please?","Could you explain that again?","I’m not sure. What do you recommend?"],
    B2:["Could you give me a bit more detail?","That sounds good to me.","I’d like to clarify one thing first."],
    C1:["Could you walk me through the options?","That sounds reasonable, but I’d like to clarify one point.","I’m leaning toward that option. What would you recommend?"]
  };
  if(title.includes("airport")){
    return l==="A1"?["Here is my passport.","I have a ticket.","Where is gate five?"]:
           l==="A2"?["I’d like to check in, please.","Here is my passport and ticket.","Where is the boarding gate?"]:
           l==="B1"?["Could you help me check in for my flight?","Do I need to check this bag?","Could you tell me where security is?"]:
           l==="B2"?["I’m checking in for the flight to London.","Could you confirm whether my bag is included?","Is there any delay I should know about?"]:
           ["I’m checking in for my London flight and wanted to confirm the baggage allowance.","Would it be possible to get an aisle seat?","Could you let me know if there are any schedule changes?"];
  }
  return base[l] || base.A2;
}

function showSuggestions(host){
  host.querySelectorAll(".wmfr-suggestions").forEach(x=>x.remove());
  const box = document.createElement("div");
  box.className = "wmfr-suggestions";
  box.innerHTML = `<div class="wmfr-title" style="font-size:15px">💡 Seviyene uygun cevaplar</div>` + suggestions().map((s,i)=>`
    <div class="wmfr-suggestion">
      <div class="wmfr-label">${i===0?"Kolay":i===1?"Doğal":"Daha iyi"}</div>
      <div class="wmfr-text">${esc(s)}</div>
      <div class="wmfr-minirow">
        <button class="wmfr-mini wmfr-green" data-use="${esc(s)}">Kullan</button>
        <button class="wmfr-mini wmfr-purple" data-say="${esc(s)}">Oku</button>
        <button class="wmfr-mini wmfr-ghost" data-copy="${esc(s)}">Kopyala</button>
      </div>
    </div>`).join("");
  box.onclick = e => {
    const use=e.target.getAttribute("data-use"), say=e.target.getAttribute("data-say"), copy=e.target.getAttribute("data-copy");
    if(use){insertInput(use);toast("Cevap yazı alanına eklendi")}
    if(say){speak(say)}
    if(copy){navigator.clipboard && navigator.clipboard.writeText(copy);toast("Kopyalandı")}
  };
  host.appendChild(box);
}

function insertInput(text){
  const root = findRealLifeRoot();
  const input = root.querySelector("textarea,input[type='text'],.chat-input") || document.querySelector("textarea,input[type='text']");
  if(input){input.value=text;input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();return true;}
  return false;
}

function scenarioCreator(host){
  host.querySelectorAll(".wmfr-creator").forEach(x=>x.remove());
  const box = document.createElement("div");
  box.className = "wmfr-suggestions wmfr-creator";
  box.innerHTML = `
    <div class="wmfr-title" style="font-size:15px">➕ Yeni Senaryo</div>
    <input class="wmfr-input" id="wmfrNewTitle" placeholder="Senaryo adı: Amerika vize görüşmesi">
    <textarea class="wmfr-textarea" id="wmfrNewDesc" placeholder="Ortam ve hedef: Visa officer asks questions. I answer confidently."></textarea>
    <div class="wmfr-grid">
      <input class="wmfr-input" id="wmfrNewEmoji" placeholder="Emoji: 🛂">
      <input class="wmfr-input" id="wmfrNewRole" placeholder="AI rolü: Visa Officer">
    </div>
    <div class="wmfr-btnrow">
      <button class="wmfr-btn wmfr-green" id="wmfrSaveNew">Kaydet</button>
      <button class="wmfr-btn wmfr-ghost" id="wmfrCancelNew">Vazgeç</button>
    </div>`;
  host.appendChild(box);
  box.querySelector("#wmfrCancelNew").onclick=()=>box.remove();
  box.querySelector("#wmfrSaveNew").onclick=()=>{
    const title=box.querySelector("#wmfrNewTitle").value.trim();
    if(!title){toast("Senaryo adı gerekli");return}
    const desc=box.querySelector("#wmfrNewDesc").value.trim() || "Custom English practice scenario.";
    const emoji=box.querySelector("#wmfrNewEmoji").value.trim() || "🌍";
    const role=box.querySelector("#wmfrNewRole").value.trim() || "Conversation Partner";
    WMFR.state.custom = WMFR.state.custom || [];
    WMFR.state.custom.push({title,desc,emoji,role,palette:["#111827","#3b82f6","#a78bfa"]});
    WMFR.state.scenario = "custom_"+(WMFR.state.custom.length-1);
    save(); refresh(); toast("Yeni senaryo eklendi");
  };
}

// Re-try because original app renders screens dynamically.
function observeSpeech(){}
function boot(){
  render();
  let tries = 0;
  const timer = setInterval(()=>{render(); if(++tries>20) clearInterval(timer)}, 500);
  const obs = new MutationObserver(()=>render());
  obs.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener("DOMContentLoaded", boot);
if(document.readyState !== "loading") boot();
})();


/* ===== extracted script block ===== */


window.initOfflineScreen = window.initOfflineScreen || function(){};
window.initDailyScreen = window.initDailyScreen || function(){};
window.initStatsScreen = window.initStatsScreen || function(){};
window.initSettingsScreen = window.initSettingsScreen || function(){};
window.initRealLifeScreen = window.initRealLifeScreen || function(){};


/* ===== extracted script block ===== */


(function(){
"use strict";

/* --------- Telaffuz haritası: buton ekleme yok, kilitlenme yok --------- */

function normalize(s){
  return String(s||"").toLowerCase().replace(/[^a-z']/g,"");
}

function currentWord(){
  try{
    if(window.words && typeof window.idx !== "undefined" && window.words[window.idx]){
      return window.words[window.idx].word || window.words[window.idx].en || window.words[window.idx].english || "";
    }
  }catch(e){}
  const el = document.querySelector(".wc-word,.fc-word,#currentWord,[data-current-word]");
  return el ? el.textContent.trim() : "";
}

function lastSpoken(){
  const sels = [".live-tx .heard",".live-tx","#pronunLiveText","#speechText","#heardText"];
  for(const s of sels){
    const el = document.querySelector(s);
    if(el && el.textContent.trim()) return el.textContent.trim();
  }
  return window.WM_lastSpokenText || window.lastRecognizedText || "";
}

function levAlign(a,b){
  a = normalize(a); b = normalize(b);
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    }
  }
  let i=m,j=n,out=[];
  while(i>0 || j>0){
    if(i>0 && j>0 && dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){
      out.push({t:a[i-1],s:b[j-1],status:a[i-1]===b[j-1]?"ok":"bad"});
      i--;j--;
    }else if(i>0 && dp[i][j]===dp[i-1][j]+1){
      out.push({t:a[i-1],s:"",status:"missing"}); i--;
    }else{ j--; }
  }
  return out.reverse();
}

const similar = [["v","f","w"],["t","d"],["s","z"],["i","e","y"],["o","u","a"],["r","l"],["c","k","q"],["g","j"],["p","b"]];
function closeSound(a,b){return similar.some(g=>g.includes(a)&&g.includes(b));}

function renderMap(target, spoken){
  if(!target) return;
  const host = document.querySelector("#pronunResult,.pronun-result,.pronun-panel");
  if(!host) return;

  let panel = document.querySelector("#wmSafePronMap");
  if(!panel){
    panel = document.createElement("div");
    panel.id = "wmSafePronMap";
    host.appendChild(panel);
  }

  const arr = spoken ? levAlign(target, spoken).map(x => x.status==="bad" && closeSound(x.t,x.s) ? {...x,status:"close"} : x) : [];
  const chips = arr.length ? arr.map(x=>`<span class="wmsp-chip ${x.status}" title="Beklenen: ${x.t}${x.s ? " | Duyulan: "+x.s : " | Duyulmadı"}">${x.t}</span>`).join("") : 
    `<span class="wmsp-note">Kayıt yaptıktan sonra harita otomatik oluşur.</span>`;

  const weak = arr.filter(x=>x.status==="bad"||x.status==="close"||x.status==="missing").map(x=>x.t);
  const note = weak.length ? 
    "Dikkat etmen gereken sesler: " + [...new Set(weak)].join(", ") + "." :
    "Yeşil sesler doğru duyuldu. Sarı yakın, kırmızı/ turuncu geliştirilmesi gereken bölümlerdir.";

  panel.innerHTML = `
    <div class="wmsp-title">🎯 Telaffuz Haritası</div>
    <div class="wmsp-word">${escapeHtml(target)}</div>
    <div class="wmsp-row">${chips}</div>
    <div class="wmsp-note">${escapeHtml(note)}<br>Bu bölüm ekstra buton eklemez; mevcut Konuş / Kayıt sistemiyle çalışır.</div>
  `;
}

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function cleanupOldPronunciationClutter(){
  // Sahte/çakışan referans waveform panellerini kaldır
  document.querySelectorAll("#realReferenceWavePanel,#realTargetWaveCanvas,#realReferenceAudioInput").forEach(el=>{
    const row = el.closest(".real-wave-row") || el.closest("div");
    if(row) row.remove();
    else el.remove();
  });

  // Eski phoneme panelindeki ekstra buton satırlarını kaldır
  document.querySelectorAll("#phonemeComparePanel button,.phoneme-compare-panel button").forEach(btn=>btn.remove());
}

function safeTick(){
  cleanupOldPronunciationClutter();
  const w = currentWord();
  const s = lastSpoken();
  if(w) renderMap(w,s);
}
/* SpeechRecognition monkey-patch kaldırıldı: native constructor korunuyor. */
/* Daha önce sahte grafik çizen fonksiyonlar varsa etkisizleştir */
["drawTargetWaveform","drawCorrectWaveform","drawReferenceWaveform","drawFakeTargetWaveform"].forEach(name=>{
  window[name] = function(){ safeTick(); return false; };
});

document.addEventListener("DOMContentLoaded", function(){
  safeTick();
  const obs = new MutationObserver(function(){
    clearTimeout(window.__wmPronTick);
    window.__wmPronTick = setTimeout(safeTick, 120);
  });
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});
});

/* --------- Kadın / erkek ses seçimi düzeltmesi --------- */

function getVoicesReady(){
  return new Promise(resolve=>{
    let voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    if(voices.length) return resolve(voices);
    const done = () => resolve(speechSynthesis.getVoices ? speechSynthesis.getVoices() : []);
    speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 800);
  });
}

function genderHints(gender){
  if(gender === "female"){
    return ["female","woman","zira","samantha","susan","serena","victoria","karen","moira","tessa","google us english","microsoft aria","microsoft jenny","microsoft mia","microsoft sonia"];
  }
  return ["male","man","david","alex","daniel","tom","fred","ralph","google uk english male","microsoft guy","microsoft ryan","microsoft george"];
}

function activeGender(){
  try{
    if(window.WMForcedRealLife && WMForcedRealLife.state && WMForcedRealLife.state.character){
      const c = WMForcedRealLife.state.character;
      if(c === "emma" || c === "sophia") return "female";
      if(c === "mike" || c === "jack") return "male";
    }
  }catch(e){}
  try{
    if(window.WordModePro && WordModePro.state && WordModePro.state.activeCharacter){
      const c = WordModePro.state.activeCharacter;
      if(c === "emma" || c === "sophia") return "female";
      if(c === "mike" || c === "jack") return "male";
    }
  }catch(e){}
  return "female";
}

function activeAccent(){
  try{
    if(window.WMForcedRealLife && WMForcedRealLife.state && WMForcedRealLife.state.accent) return WMForcedRealLife.state.accent;
  }catch(e){}
  try{
    if(window.WordModePro && WordModePro.state && WordModePro.state.accent) return WordModePro.state.accent;
  }catch(e){}
  return "en-US";
}

function activeLevel(){
  try{
    if(window.WMForcedRealLife && WMForcedRealLife.state && WMForcedRealLife.state.level) return WMForcedRealLife.state.level;
  }catch(e){}
  try{
    if(window.WordModePro && WordModePro.state && WordModePro.state.level) return WordModePro.state.level;
  }catch(e){}
  return "A2";
}

async function pickVoice(gender, accent){
  const voices = await getVoicesReady();
  const hints = genderHints(gender);
  const langShort = (accent||"en-US").split("-")[0].toLowerCase();

  let v = voices.find(v => v.lang === accent && hints.some(h=>v.name.toLowerCase().includes(h)));
  if(!v) v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langShort) && hints.some(h=>v.name.toLowerCase().includes(h)));
  if(!v) v = voices.find(v => v.lang === accent);
  if(!v) v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("en"));
  return v || null;
}

function showVoiceWarning(){
  if(document.querySelector(".wm-voice-warning")) return;
  const panel = document.querySelector("#wmForcedRealLifeCoach") || document.querySelector(".wm-pro-panel");
  if(!panel) return;
  const div = document.createElement("div");
  div.className = "wm-voice-warning";
  div.innerHTML = "Not: Tarayıcıda ayrı kadın/erkek İngilizce ses yüklü değilse iki karakter aynı sesle konuşabilir. Windows’ta İngilizce ses paketleri eklenirse ayrım daha iyi çalışır.";
  panel.appendChild(div);
}

/* Mevcut konuşma fonksiyonlarını daha iyi ses seçimiyle override et */
async function speakBetter(text){
  if(!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();

  const gender = activeGender();
  const accent = activeAccent();
  const level = activeLevel();

  const u = new SpeechSynthesisUtterance(String(text).replace(/🇹🇷.*|💡.*|🔊.*/g,""));
  u.lang = accent;

  const v = await pickVoice(gender, accent);
  if(v) u.voice = v;
  else showVoiceWarning();

  u.pitch = gender === "female" ? 1.18 : 0.82;
  u.rate = level === "A1" ? .78 : level === "A2" ? .86 : level === "B1" ? .95 : level === "B2" ? 1.03 : 1.08;

  speechSynthesis.speak(u);
}

window.WM_speakBetter = speakBetter;

setTimeout(function(){
  try{
    if(window.WMForcedRealLife) window.WMForcedRealLife.speak = speakBetter;
    if(window.WordModePro) window.WordModePro.speak = speakBetter;
  }catch(e){}
}, 1000);

/* Sayfadaki Oku butonlarını yakala */
document.addEventListener("click", function(e){
  const btn = e.target.closest("button");
  if(!btn) return;
  const t = (btn.textContent||"").trim();
  if(t.includes("Son Mesajı Oku") || t === "🔊 Oku" || t.includes("Oku")){
    const root = document.querySelector("#wmForcedRealLifeCoach")?.parentElement || document.body;
    const msgs = root.querySelectorAll(".conv-msg.ai,.chat-msg.ai,.partner-msg.ai,.wmfr-ai-msg");
    const last = msgs[msgs.length-1];
    if(last){
      e.preventDefault();
      e.stopPropagation();
      speakBetter(last.innerText);
    }
  }
}, true);

})();


/* ===== extracted script block ===== */


(function(){
"use strict";

function norm(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z']/g,"");
}

function esc(s){
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function levenshteinAlign(target, spoken){
  const a = norm(target);
  const b = norm(spoken);
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, () => Array(n+1).fill(0));

  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;

  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + cost
      );
    }
  }

  let i=m, j=n, out=[];
  while(i>0 || j>0){
    if(i>0 && j>0 && dp[i][j] === dp[i-1][j-1] + (a[i-1]===b[j-1] ? 0 : 1)){
      out.push({t:a[i-1], s:b[j-1], status:a[i-1]===b[j-1] ? "ok" : "bad"});
      i--; j--;
    } else if(i>0 && dp[i][j] === dp[i-1][j] + 1){
      out.push({t:a[i-1], s:"", status:"missing"});
      i--;
    } else {
      j--;
    }
  }
  return out.reverse();
}

const similarGroups = [
  ["v","f","w"],
  ["t","d"],
  ["s","z"],
  ["i","e","y"],
  ["o","u","a"],
  ["r","l"],
  ["c","k","q"],
  ["g","j"],
  ["p","b"],
  ["a","e"]
];

function isClose(a,b){
  return similarGroups.some(g => g.includes(a) && g.includes(b));
}

function findPronScreen(){
  const candidates = [...document.querySelectorAll(".screen,.card,section,div")];
  return candidates.find(el => {
    const t = (el.innerText || "").slice(0,1000);
    return t.includes("Telaffuz Haritası") && t.includes("Haritala");
  }) || document.body;
}

function findWordInput(root){
  const inputs = [...root.querySelectorAll("input,textarea")];
  return inputs.find(i => (i.value || "").trim() || (i.placeholder || "").toLowerCase().includes("kelime")) || inputs[0];
}

function findHeardInput(root){
  const fields = [...root.querySelectorAll("input,textarea,div")];
  return fields.find(el => {
    const t = ((el.value || el.textContent || "") + " " + (el.placeholder || "")).toLowerCase();
    return t.includes("duyulan") || t.includes("okunan") || t.includes("volint");
  });
}

function getTargetWord(){
  const root = findPronScreen();
  const input = findWordInput(root);
  const v = input && (input.value || input.textContent || "").trim();
  if(v) return v;

  if(window.words && typeof window.idx !== "undefined" && window.words[window.idx]){
    return window.words[window.idx].word || window.words[window.idx].en || "";
  }

  const wc = document.querySelector(".wc-word,.fc-word,#currentWord,[data-current-word]");
  return wc ? wc.textContent.trim() : "";
}

function getSpokenText(){
  const root = findPronScreen();
  const heard = findHeardInput(root);
  let text = heard && (heard.value || heard.textContent || "").trim();

  if(text){
    text = text.replace(/^Duyulan\/okunan kelime:\s*/i,"").trim();
    if(text) return text;
  }

  return window.WM_lastSpokenText || window.lastRecognizedText || "";
}

function renderForcedMap(target, spoken){
  const root = findPronScreen();
  if(!root || !target) return;

  let panel = root.querySelector("#wmPronForcePanel");
  if(!panel){
    panel = document.createElement("div");
    panel.id = "wmPronForcePanel";

    const oldGraph = [...root.querySelectorAll("div")].find(el => 
      (el.innerText || "").includes("Kendi Ses Kaydın + Grafik Karşılaştırma")
    );

    if(oldGraph && oldGraph.parentNode){
      oldGraph.parentNode.insertBefore(panel, oldGraph);
    } else {
      root.appendChild(panel);
    }
  }

  const arr = spoken ? levenshteinAlign(target, spoken).map(x => {
    if(x.status === "bad" && isClose(x.t,x.s)) return {...x, status:"close"};
    return x;
  }) : [];

  const chips = arr.length
    ? arr.map(x => `<span class="wmpf-chip ${x.status}" title="Beklenen: ${esc(x.t)}${x.s ? " | Duyulan: " + esc(x.s) : " | Duyulmadı"}">${esc(x.t)}</span>`).join("")
    : `<div class="wmpf-note">Önce hedef kelimeyi yaz, sonra duyulan/okunan kelime alanına sonucu gir veya sesle kayıt yap. Sonra <b>Haritala</b> butonuna bas.</div>`;

  const weak = arr.filter(x => x.status !== "ok").map(x => x.t);
  const score = arr.length ? Math.round((arr.filter(x=>x.status==="ok").length / arr.length) * 100) : 0;

  panel.innerHTML = `
    <div class="wmpf-title">🎯 Çalışan Telaffuz Haritası</div>
    <div class="wmpf-word">${esc(target)}</div>
    <div class="wmpf-legend">
      <span>✅ doğru</span>
      <span>⚠️ yakın</span>
      <span>❌ hatalı</span>
      <span>🟠 eksik</span>
    </div>
    <div class="wmpf-row">${chips}</div>
    <div class="wmpf-note">
      Skor: <b>${score || "-"}</b>${score ? "/100" : ""}<br>
      ${weak.length ? "Dikkat edilecek sesler: <b>" + esc([...new Set(weak)].join(", ")) + "</b>" : "Kayıttan sonra hatalı sesler burada görünecek."}
      <br>Not: Senin ses dalga grafiğin aşağıda kalır; sahte doğru ses grafiği gösterilmez.
    </div>
  `;
}

function mapNow(){
  const target = getTargetWord();
  const spoken = getSpokenText();

  if(!target){
    alert("Önce hedef kelimeyi yaz.");
    return;
  }

  renderForcedMap(target, spoken || target);
}

function patchButtons(){
  const root = findPronScreen();
  if(!root || root.dataset.wmpfPatched) return;

  const buttons = [...root.querySelectorAll("button")];
  const mapBtn = buttons.find(b => (b.innerText || "").trim().toLowerCase().includes("haritala"));
  if(mapBtn){
    mapBtn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      mapNow();
      return false;
    };
  }

  const wordInput = findWordInput(root);
  if(wordInput){
    wordInput.classList.add("wmpf-input-fix");
    wordInput.addEventListener("input", () => {
      setTimeout(() => renderForcedMap(getTargetWord(), getSpokenText()), 120);
    });
  }

  root.dataset.wmpfPatched = "1";
}
/* SpeechRecognition monkey-patch kaldırıldı: native constructor korunuyor. */
function observeSpeech(){}
function boot(){
  patchButtons();
  observeSpeech();

  const root = findPronScreen();
  if(root && (root.innerText || "").includes("Telaffuz Haritası")){
    renderForcedMap(getTargetWord(), getSpokenText());
  }
}

document.addEventListener("DOMContentLoaded", function(){
  boot();
  const obs = new MutationObserver(function(){
    clearTimeout(window.__wmpfTimer);
    window.__wmpfTimer = setTimeout(boot, 200);
  });
  obs.observe(document.body, {childList:true, subtree:true, characterData:true});
});

if(document.readyState !== "loading") boot();

window.WM_forcePronunciationMap = mapNow;
})();


/* ===== extracted script block ===== */


(function(){
  function cleanRealLifeUI(){
    try{
      var pills=document.getElementById('wmngScenarioPills');
      if(pills) pills.remove();
      document.querySelectorAll('#wmForcedRealLifeCoach #wmfrSuggest,.wm-phase-panel [data-global-suggest]').forEach(function(el){el.remove();});
      document.querySelectorAll('.wm-reallife-actions button,.wmfr-actions button,.wm-btn-row button').forEach(function(btn){
        if((btn.textContent||'').includes('Sen Öner')) btn.remove();
      });
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded',function(){cleanRealLifeUI();setTimeout(cleanRealLifeUI,500);setTimeout(cleanRealLifeUI,1500);});
  try{new MutationObserver(cleanRealLifeUI).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}
})();


/* ===== extracted script block ===== */


(function(){
  const state={level:'A1',persona:'Emma',style:'sabırlı ve öğretici',scenarioKey:'taxi',scenario:null,started:false,recognition:null,listening:false};
  const scenarios={
    taxi:{emoji:'🚕',title:'Taxi Ride',desc:'Taksiye bindin. Gideceğin yeri söyle, süre ve ücret hakkında soru sor.',opening:'Hello! Where would you like to go today?'},
    hotel:{emoji:'🏨',title:'Hotel Check-in',desc:'Otele giriş yapıyorsun. Rezervasyonunu söyle, oda ve kahvaltı bilgisi sor.',opening:'Good evening. Welcome to our hotel. Do you have a reservation?'},
    restaurant:{emoji:'🍽️',title:'Restaurant Order',desc:'Restoranda sipariş veriyorsun. Menü, öneri ve hesap hakkında konuş.',opening:'Hi! Are you ready to order, or would you like a few more minutes?'},
    airport:{emoji:'✈️',title:'Airport Help',desc:'Havalimanında yön bulmaya çalışıyorsun. Gate, bagaj ve saatleri sor.',opening:'Hello, how can I help you at the airport today?'},
    shopping:{emoji:'🛍️',title:'Shopping',desc:'Mağazada ürün soruyorsun. Beden, fiyat, renk ve ödeme hakkında konuş.',opening:'Hi there! Are you looking for anything specific today?'},
    doctor:{emoji:'🩺',title:'Doctor Visit',desc:'Doktora şikayetini anlatıyorsun. Belirti, süre ve tavsiye hakkında konuş.',opening:'Hello. What seems to be the problem today?'},
    job:{emoji:'💼',title:'Job Interview',desc:'İş görüşmesindesin. Deneyim, beceri ve hedeflerinden bahset.',opening:'Welcome. Could you please tell me a little about yourself?'},
    school:{emoji:'🎓',title:'School Talk',desc:'Okulda öğretmen veya arkadaşınla ders, ödev ve plan hakkında konuş.',opening:'Hi! Did you understand today\'s lesson, or do you need help?'}
  };
  const $=(id)=>document.getElementById(id);
  function scenario(){return state.scenario||scenarios[state.scenarioKey]||scenarios.taxi;}
  function addMsg(type,text){const chat=$('rlnewChat'); if(!chat) return; const d=document.createElement('div'); d.className='rlnew-msg '+type; d.textContent=text; chat.appendChild(d); chat.scrollTop=chat.scrollHeight;}
  function updateScene(sc){state.scenario=sc; const img=$('rlnewSceneImage'), title=$('rlnewSceneTitle'), desc=$('rlnewSceneDesc'); if(img) img.textContent=sc.emoji; if(title) title.textContent=sc.title; if(desc) desc.textContent=sc.desc;}
  function startConversation(){const sc=scenario(); state.started=true; const chat=$('rlnewChat'); if(chat) chat.innerHTML=''; addMsg('system',`Seviye: ${state.level} • Senaryo: ${sc.title} • Partner: ${state.persona}`); addMsg('ai', sc.opening||'Hello! Let\'s start. What would you like to say?'); speak(sc.opening||'Hello! Let\'s start.');}
  function simpleReply(userText){
    const sc=scenario(); const t=(userText||'').toLowerCase();
    if(!state.started) return 'Let\'s start first. Please press “Konuşmayı Başlat”.';
    if(t.includes('turkish')||t.includes('türkçe')) return 'Try to say it in English. You can use a short sentence.';
    const levelHelp={A1:'Use a simple sentence. For example: “I want…” or “Can I…?”',A2:'Good. Try adding one detail: time, place, price, or reason.',B1:'Nice. Can you explain your preference in one more sentence?',B2:'Good point. Could you negotiate or ask a follow-up question?',C1:'Excellent. Try to sound more natural and specific.'}[state.level]||'Good.';
    const bank={taxi:['Sure. What address should I take you to?','Do you prefer the fastest route or the cheaper route?','It may take about twenty minutes. Is that okay?'],hotel:['May I have your name, please?','Would you like a room with breakfast included?','Your room is ready. Do you need help with your luggage?'],restaurant:['Great choice. Would you like anything to drink?','Would you like it spicy or mild?','Would you like dessert or the bill?'],airport:['Your gate is on the second floor. Do you have your boarding pass?','The flight is on time. Do you need baggage help?','Security is straight ahead on the left.'],shopping:['What size are you looking for?','This one is on sale today. Would you like to try it on?','You can pay by card or cash.'],doctor:['How long have you had this problem?','Do you have a fever or any pain?','I recommend rest and plenty of water.'],job:['Can you tell me about your previous experience?','What are your strongest skills?','Why do you want this position?'],school:['Which part was difficult for you?','Do you want to study together after class?','The homework is due tomorrow.']};
    const arr=bank[state.scenarioKey]||['I understand. Can you tell me more?'];
    return arr[Math.floor(Math.random()*arr.length)]+' '+levelHelp;
  }
  function send(){const input=$('rlnewMessageInput'); if(!input) return; const text=input.value.trim(); if(!text) return; input.value=''; addMsg('user',text); setTimeout(()=>{const reply=simpleReply(text); addMsg('ai',reply); speak(reply);},350);}
  function speak(text){try{ if(!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate=0.92; window.speechSynthesis.speak(u);}catch(e){}}
  function customScenario(){const raw=($('rlnewCustomPrompt')?.value||'').trim(); if(!raw){addMsg('system','Yeni senaryo için önce kısa bir açıklama yaz.'); return;} const lower=raw.toLowerCase(); let emoji='🎭'; if(lower.includes('cafe')||lower.includes('kafe')||lower.includes('coffee')) emoji='☕'; else if(lower.includes('train')||lower.includes('tren')) emoji='🚆'; else if(lower.includes('bank')) emoji='🏦'; else if(lower.includes('market')||lower.includes('shop')) emoji='🛒'; else if(lower.includes('park')) emoji='🌳'; else if(lower.includes('londra')||lower.includes('london')) emoji='🌉';
    const title=raw.split(/[.!?]/)[0].slice(0,42) || 'Custom Scenario';
    updateScene({emoji,title,desc:raw,opening:`Hi! We are in this situation: ${raw}. What would you like to say first?`});
    addMsg('system','Görselli yeni senaryo hazırlandı. Konuşmayı Başlat düğmesine bas.');
  }
  function clearChat(){const chat=$('rlnewChat'); if(chat) chat.innerHTML=''; state.started=false; addMsg('system','Sohbet silindi. Yeni konuşma başlatabilirsin.');}
  function hint(){const sc=scenario(); const hints={A1:'Can I have ... please?',A2:'I would like to ... because ...',B1:'Could you tell me more about ...?',B2:'Would it be possible to ...?',C1:'I was wondering whether you could clarify ...'}; addMsg('system','Öneri: '+(hints[state.level]||hints.A1)+'  • Senaryo: '+sc.title);}
  function mic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition; const btn=$('rlnewMicBtn'); if(!SR){addMsg('system','Bu tarayıcıda sesli yazdırma desteklenmiyor. Chrome kullanmayı deneyebilirsin.'); return;} if(state.listening && state.recognition){state.recognition.stop(); return;} const rec=new SR(); state.recognition=rec; rec.lang='en-US'; rec.interimResults=false; rec.continuous=false; rec.onstart=()=>{state.listening=true; btn&&btn.classList.add('listening');}; rec.onend=()=>{state.listening=false; btn&&btn.classList.remove('listening');}; rec.onerror=()=>addMsg('system','Ses algılanamadı. Tekrar deneyebilirsin.'); rec.onresult=(e)=>{const text=e.results[0][0].transcript; const input=$('rlnewMessageInput'); if(input) input.value=text;}; rec.start();}
  function addEntrances(){
    const nav=document.getElementById('bottomNav'); if(nav && !document.getElementById('bn-realnew')){const b=document.createElement('button'); b.className='bnav-btn'; b.id='bn-realnew'; b.onclick=()=>{ if(typeof showScreen==='function') showScreen('sc-realnew'); document.querySelectorAll('.bnav-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');}; b.innerHTML='<span class="bico">🎭</span>Gerçek'; nav.appendChild(b);}
    const menu=document.querySelector('#sc-menu .menu-grid, #sc-menu div[style*="grid"], #sc-menu'); if(menu && !document.getElementById('menu-realnew-card')){const c=document.createElement('button'); c.id='menu-realnew-card'; c.onclick=()=>{ if(typeof showScreen==='function') showScreen('sc-realnew');}; c.style.cssText='padding:18px;background:linear-gradient(135deg,#0f766e,#2563eb);border:none;border-radius:18px;color:white;font-family:Nunito,sans-serif;font-weight:900;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25);'; c.innerHTML='<div style="font-size:34px;margin-bottom:8px">🎭</div><div style="font-size:15px">Gerçek Sohbet</div><div style="font-size:11px;opacity:.85;margin-top:4px">Sıfırdan temiz ekran</div>'; menu.appendChild(c);}
  }
  function init(){
    document.querySelectorAll('#rlnewLevels .rlnew-level').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#rlnewLevels .rlnew-level').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.level=b.dataset.level;}));
    document.querySelectorAll('#rlnewPersonas .rlnew-persona').forEach(p=>p.addEventListener('click',()=>{document.querySelectorAll('#rlnewPersonas .rlnew-persona').forEach(x=>x.classList.remove('active')); p.classList.add('active'); state.persona=p.dataset.persona; state.style=p.dataset.style;}));
    $('rlnewScenarioSelect')?.addEventListener('change',e=>{state.scenarioKey=e.target.value; state.scenario=null; updateScene(scenarios[state.scenarioKey]);});
    $('rlnewUseScenarioBtn')?.addEventListener('click',()=>{state.scenario=null; updateScene(scenarios[state.scenarioKey]); addMsg('system','Hazır senaryo uygulandı: '+scenario().title);});
    $('rlnewStartBtn')?.addEventListener('click',startConversation);
    $('rlnewGenerateBtn')?.addEventListener('click',customScenario);
    $('rlnewClearPromptBtn')?.addEventListener('click',()=>{const x=$('rlnewCustomPrompt'); if(x) x.value='';});
    $('rlnewSendBtn')?.addEventListener('click',send);
    $('rlnewMessageInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); send();}});
    $('rlnewClearChatBtn')?.addEventListener('click',clearChat);
    $('rlnewHintBtn')?.addEventListener('click',hint);
    $('rlnewMicBtn')?.addEventListener('click',mic);
    updateScene(scenarios.taxi); addEntrances();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.openRealLifeNewPage=function(){ if(typeof showScreen==='function') showScreen('sc-realnew'); };
})();


/* ===== extracted script block ===== */


(function(){
"use strict";
const $ = (id)=>document.getElementById(id);

const RLNEW_DEFAULT_PROMPT = `You are a real-life English conversation partner for a Turkish learner.

Rules:
1. Stay inside the selected real-life scenario.
2. Continue the conversation naturally. Do NOT restart the same opening question.
3. Read the full conversation history before answering.
4. Ask only one short follow-up question at the end.
5. Keep your answer appropriate for the learner level:
   A1: 1 short sentence, very simple words.
   A2: 1-2 short sentences.
   B1: natural but clear.
   B2-C1: more natural, richer vocabulary.
6. If the user makes an English mistake, briefly correct it in Turkish after your English reply.
7. Do not translate everything unless the user presses the Turkish translation button.
8. Your main conversation reply must be in English.`;

const localTR = {
  "Hello! Where would you like to go today?":"Merhaba! Bugün nereye gitmek istersiniz?",
  "Good evening. Welcome to our hotel. Do you have a reservation?":"İyi akşamlar. Otelimize hoş geldiniz. Rezervasyonunuz var mı?",
  "Hi! Are you ready to order, or would you like a few more minutes?":"Merhaba! Sipariş vermeye hazır mısınız, yoksa birkaç dakika daha ister misiniz?",
  "Hello, how can I help you at the airport today?":"Merhaba, bugün havalimanında size nasıl yardımcı olabilirim?",
  "Hi there! Are you looking for anything specific today?":"Merhaba! Bugün özellikle aradığınız bir şey var mı?",
  "Hello. What seems to be the problem today?":"Merhaba. Bugün sorun nedir?",
  "Welcome. Could you please tell me a little about yourself?":"Hoş geldiniz. Lütfen bana biraz kendinizden bahseder misiniz?",
  "Hi! Did you understand today's lesson, or do you need help?":"Merhaba! Bugünkü dersi anladın mı, yoksa yardıma ihtiyacın var mı?"
};

function getVisibleScenario(){
  const title = $("rlnewSceneTitle")?.textContent?.trim() || "Real Life Scenario";
  const desc = $("rlnewSceneDesc")?.textContent?.trim() || "";
  return {title, desc};
}

function getLevel(){
  return document.querySelector("#rlnewLevels .rlnew-level.active")?.dataset?.level || "A1";
}

function getPersona(){
  const p = document.querySelector("#rlnewPersonas .rlnew-persona.active");
  return {
    name: p?.dataset?.persona || "Emma",
    style: p?.dataset?.style || "sabırlı ve öğretici"
  };
}

function getMessages(){
  return [...document.querySelectorAll("#rlnewChat .rlnew-msg")]
    .map(x => ({role: x.classList.contains("user") ? "User" : x.classList.contains("ai") ? "AI" : "System", text: x.textContent.trim()}))
    .filter(x => x.text);
}

function addMsg(type,text){
  const chat=$("rlnewChat"); 
  if(!chat) return; 
  const d=document.createElement("div"); 
  d.className="rlnew-msg "+type; 
  d.textContent=text; 
  chat.appendChild(d); 
  chat.scrollTop=chat.scrollHeight;
}

function setAIInfo(text){
  const box=$("rlnewAiInfo");
  if(box) box.innerHTML = text;
}

function promptText(){
  return ($("rlnewSystemPrompt")?.value || localStorage.getItem("rlnewSystemPrompt") || RLNEW_DEFAULT_PROMPT).trim();
}

function buildUserMessage(userText){
  const sc = getVisibleScenario();
  const persona = getPersona();
  const history = getMessages().slice(-12).map(m => `${m.role}: ${m.text}`).join("\n");
  return `Level: ${getLevel()}
Scenario title: ${sc.title}
Scenario description: ${sc.desc}
Partner: ${persona.name}
Partner style: ${persona.style}

Conversation history:
${history}

User's new message:
${userText}

Now continue the role-play naturally.`;
}

function smarterLocalReply(userText){
  const level = getLevel();
  const sc = getVisibleScenario();
  const msgs = getMessages();
  const aiCount = msgs.filter(m=>m.role==="AI").length;
  const t=(userText||"").toLowerCase();

  const simple = {
    A1: ["Okay. Can you say that again with one more word?", "Good. What do you need?", "I understand. Can you tell me the place?"],
    A2: ["Okay, I understand. Can you give me one more detail?", "That sounds good. What would you like to do next?", "Sure. Do you want the cheaper option or the faster option?"],
    B1: ["I see. Could you explain your preference a little more?", "That makes sense. What is most important for you in this situation?", "Okay. Let me check that for you. Do you have any other questions?"],
    B2: ["Understood. I can help with that, but could you clarify one detail first?", "That is reasonable. Would you like me to suggest the best option?", "Good point. How flexible are you about the time or price?"],
    C1: ["I understand your point. Could you be a little more specific about what outcome you prefer?", "That is clear. Would you like me to handle it directly, or explain the alternatives first?", "Certainly. Before we continue, could you clarify your main priority?"]
  };

  const scenarioLines = {
    "Taxi Ride":["I can take you there. Do you prefer the fastest route?", "Traffic is a little heavy. Is that okay for you?", "The fare should be around twenty pounds. Is that fine?"],
    "Hotel Check-in":["May I see your passport, please?", "Your room is almost ready. Would you like breakfast included?", "Would you prefer a quiet room or a room with a view?"],
    "Restaurant Order":["Great. Would you like something to drink with that?", "Would you like it spicy or mild?", "Sure. Do you have any allergies I should know about?"],
    "Airport Help":["Your gate is upstairs on the left. Do you need help with your baggage?", "Your flight is on time. Would you like me to show you the gate?", "Security is straight ahead. Do you have your boarding pass ready?"],
    "Shopping":["What size are you looking for?", "Would you like to try it on?", "This one is on sale. Do you want another color?"],
    "Doctor Visit":["How long have you had this problem?", "Do you have any pain or fever?", "I see. Can you describe the symptoms more clearly?"],
    "Job Interview":["Could you tell me about your previous experience?", "What are your strongest skills?", "Why are you interested in this position?"],
    "School Talk":["Which part of the lesson was difficult?", "Do you want to study together after class?", "The homework is due tomorrow. Do you need help?"]
  };

  if(t.includes("hello") || t.includes("hi")) return "Hello! Nice to meet you. " + (scenarioLines[sc.title]?.[aiCount % (scenarioLines[sc.title]?.length || 1)] || "How can I help you?");
  if(t.length < 4) return "No problem. Please try a short English sentence, for example: “I need help.”";

  const arr = scenarioLines[sc.title] || simple[level] || simple.A1;
  const base = arr[aiCount % arr.length];
  const support = level==="A1" ? " You can answer with a short sentence." : "";
  return base + support;
}

async function aiReply(userText){
  const systemPrompt = promptText();
  const userMessage = buildUserMessage(userText);

  const aiType = "conversation";
  try{
    if(typeof window.callAIWithRetry === "function"){
      setAIInfo("<b>Kullanılan AI:</b> Proje AI altyapısı <b>callAIWithRetry()</b> üzerinden çalışıyor. <b>Tip:</b> conversation");
      const res = await window.callAIWithRetry(systemPrompt, userMessage, aiType, 1);
      const content = typeof res === "string" ? res : (res?.content || "");
      if(content.trim()){
        setAIInfo(`<b>Kullanılan AI:</b> ${res?.model || "callAI"} <b>• Tip:</b> conversation <b>• Token:</b> ${res?.tokenLimit || "-"}`);
        return content.trim();
      }
    }
    if(typeof window.callAI === "function"){
      setAIInfo("<b>Kullanılan AI:</b> Proje AI altyapısı <b>callAI()</b> üzerinden çalışıyor. <b>Tip:</b> conversation");
      const res = await window.callAI(systemPrompt, userMessage, aiType);
      const content = typeof res === "string" ? res : (res?.content || "");
      if(content.trim()){
        setAIInfo(`<b>Kullanılan AI:</b> ${res?.model || "callAI"} <b>• Tip:</b> conversation <b>• Token:</b> ${res?.tokenLimit || "-"}`);
        return content.trim();
      }
    }
  }catch(err){
    setAIInfo(`<b>Kullanılan sistem:</b> API çağrısı başarısız oldu; gelişmiş yerel motor kullanılıyor.<br><b>Hata:</b> ${String(err.message || err).slice(0,160)}`);
  }
  return smarterLocalReply(userText);
}

function speak(text){
  try{
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\n+/g," "));
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

async function send(){
  const input=$("rlnewMessageInput"); 
  if(!input) return; 
  const text=input.value.trim(); 
  if(!text) return; 
  input.value=""; 
  addMsg("user",text); 
  addMsg("system","AI düşünüyor...");
  const chat=$("rlnewChat");
  const thinking = chat?.lastElementChild;
  const reply = await aiReply(text);
  if(thinking && thinking.classList.contains("system") && thinking.textContent==="AI düşünüyor...") thinking.remove();
  addMsg("ai",reply);
  speak(reply);
}

function startConversation(){
  const sc = getVisibleScenario();
  const chat=$("rlnewChat"); 
  if(chat) chat.innerHTML="";
  const persona=getPersona();
  addMsg("system",`Seviye: ${getLevel()} • Senaryo: ${sc.title} • Partner: ${persona.name}`);
  const opening = localTR[sc.title] ? Object.keys(localTR).find(k=>false) : null;
  const select = $("rlnewScenarioSelect");
  const openingMap = {
    taxi:"Hello! Where would you like to go today?",
    hotel:"Good evening. Welcome to our hotel. Do you have a reservation?",
    restaurant:"Hi! Are you ready to order, or would you like a few more minutes?",
    airport:"Hello, how can I help you at the airport today?",
    shopping:"Hi there! Are you looking for anything specific today?",
    doctor:"Hello. What seems to be the problem today?",
    job:"Welcome. Could you please tell me a little about yourself?",
    school:"Hi! Did you understand today's lesson, or do you need help?"
  };
  const text = openingMap[select?.value] || `Hi! We are in this situation: ${sc.desc}. What would you like to say first?`;
  addMsg("ai", text);
  speak(text);
}

function clearChat(){
  const chat=$("rlnewChat"); 
  if(chat) chat.innerHTML="";
  addMsg("system","Sohbet silindi. Yeni konuşma başlatabilirsin.");
  const tr=$("rlnewTranslateBox"); if(tr){tr.classList.remove("show"); tr.textContent="";}
}

function hint(){
  const hints={A1:"I need help, please.",A2:"I would like to ask about the price.",B1:"Could you explain the options, please?",B2:"Would it be possible to change the time?",C1:"I was wondering whether you could clarify the best available option."};
  addMsg("system","Cevap önerisi: "+(hints[getLevel()]||hints.A1));
}

function mic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition; 
  const btn=$("rlnewMicBtn"); 
  const input=$("rlnewMessageInput");
  if(!SR){addMsg("system","Bu tarayıcıda sesli yazdırma desteklenmiyor. Chrome kullanmayı deneyebilirsin."); return;} 
  const rec=new SR(); 
  rec.lang="en-US"; 
  rec.interimResults=true; 
  rec.continuous=false; 
  let finalText="";
  rec.onstart=()=>{btn&&btn.classList.add("listening"); if(input) input.placeholder="Dinliyorum...";}; 
  rec.onend=()=>{btn&&btn.classList.remove("listening"); if(input) input.placeholder="Mesajını İngilizce yaz veya mikrofona bas..."; if(finalText && input){input.value=finalText; input.focus();}}; 
  rec.onerror=(e)=>{addMsg("system","Ses algılanamadı veya mikrofon izni verilmedi. Tekrar deneyebilirsin.");}; 
  rec.onresult=(e)=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0].transcript;
      if(e.results[i].isFinal) finalText += txt + " ";
      else interim += txt;
    }
    if(input) input.value = (finalText + interim).trim();
  }; 
  rec.start();
}

async function translateLast(){
  const box=$("rlnewTranslateBox");
  if(!box) return;
  const msgs = [...document.querySelectorAll("#rlnewChat .rlnew-msg.ai,#rlnewChat .rlnew-msg.user")];
  const last = msgs[msgs.length-1]?.textContent?.trim();
  if(!last){box.textContent="Çevrilecek mesaj yok."; box.classList.add("show"); return;}
  box.textContent="Çeviri hazırlanıyor...";
  box.classList.add("show");

  if(localTR[last]){
    box.textContent=localTR[last]; return;
  }

  try{
    if(typeof window.callAIWithRetry === "function"){
      const res = await window.callAIWithRetry("Translate the following English text into natural Turkish. Only return the Turkish translation.", last, "translation", 1);
      box.textContent = (typeof res === "string" ? res : res?.content || "").trim() || "Çeviri alınamadı.";
      return;
    }
    if(typeof window.callAI === "function"){
      const res = await window.callAI("Translate the following English text into natural Turkish. Only return the Turkish translation.", last, "translation");
      box.textContent = (typeof res === "string" ? res : res?.content || "").trim() || "Çeviri alınamadı.";
      return;
    }
  }catch(e){}
  box.textContent = "Yerel çeviri: Bu mesajın Türkçesi için API anahtarı gerekir. Mesaj: " + last;
}

function initPatch(){
  const promptArea=$("rlnewSystemPrompt");
  if(promptArea) promptArea.value = localStorage.getItem("rlnewSystemPrompt") || RLNEW_DEFAULT_PROMPT;

  $("rlnewPromptToggle")?.addEventListener("click",()=> $("rlnewPromptEditor")?.classList.toggle("open"));
  $("rlnewSavePromptBtn")?.addEventListener("click",()=>{localStorage.setItem("rlnewSystemPrompt", promptText()); const s=$("rlnewPromptStatus"); if(s) s.textContent="Prompt kaydedildi.";});
  $("rlnewResetPromptBtn")?.addEventListener("click",()=>{localStorage.removeItem("rlnewSystemPrompt"); if(promptArea) promptArea.value=RLNEW_DEFAULT_PROMPT; const s=$("rlnewPromptStatus"); if(s) s.textContent="Varsayılan prompt geri yüklendi.";});

  const sendBtn=$("rlnewSendBtn"), input=$("rlnewMessageInput");
  if(sendBtn){sendBtn.replaceWith(sendBtn.cloneNode(true)); $("rlnewSendBtn")?.addEventListener("click",send);}
  if(input){input.onkeydown=(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); send();}};}

  const micBtn=$("rlnewMicBtn"); if(micBtn){micBtn.replaceWith(micBtn.cloneNode(true)); $("rlnewMicBtn")?.addEventListener("click",mic);}
  const startBtn=$("rlnewStartBtn"); if(startBtn){startBtn.replaceWith(startBtn.cloneNode(true)); $("rlnewStartBtn")?.addEventListener("click",startConversation);}
  const clearBtn=$("rlnewClearChatBtn"); if(clearBtn){clearBtn.replaceWith(clearBtn.cloneNode(true)); $("rlnewClearChatBtn")?.addEventListener("click",clearChat);}
  const hintBtn=$("rlnewHintBtn"); if(hintBtn){hintBtn.replaceWith(hintBtn.cloneNode(true)); $("rlnewHintBtn")?.addEventListener("click",hint);}
  $("rlnewTranslateBtn")?.addEventListener("click",translateLast);

  setAIInfo("<b>Kullanılan sistem:</b> API anahtarı varsa mevcut proje <b>callAI()</b> altyapısı; yoksa gelişmiş yerel konuşma motoru. Prompt aşağıdan düzenlenebilir.");
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initPatch); else initPatch();
})();


/* ===== extracted script block ===== */


(function(){
"use strict";
const $ = (id)=>document.getElementById(id);

function escapeText(s){
  return String(s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function speakText(text){
  try{
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text||"").replace(/\n+/g," "));
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

function stopSpeak(){
  try{
    if("speechSynthesis" in window) window.speechSynthesis.cancel();
  }catch(e){}
}

function makeAudioTools(text){
  const tools = document.createElement("div");
  tools.className = "rlnew-audio-tools";

  const play = document.createElement("button");
  play.className = "rlnew-audio-btn";
  play.type = "button";
  play.title = "Seslendir";
  play.textContent = "🔊";
  play.addEventListener("click", (e)=>{
    e.stopPropagation();
    speakText(text);
  });

  const stop = document.createElement("button");
  stop.className = "rlnew-audio-btn stop";
  stop.type = "button";
  stop.title = "Sus";
  stop.textContent = "🔇";
  stop.addEventListener("click", (e)=>{
    e.stopPropagation();
    stopSpeak();
  });

  tools.appendChild(play);
  tools.appendChild(stop);
  return tools;
}

function addMsgWithTools(type,text){
  const chat = $("rlnewChat");
  if(!chat) return;

  const wrap = document.createElement("div");
  wrap.className = "rlnew-msg-wrap " + type;

  const msg = document.createElement("div");
  msg.className = "rlnew-msg " + type;
  msg.textContent = text;

  if(type === "user"){
    wrap.appendChild(makeAudioTools(text));
    wrap.appendChild(msg);
  }else{
    wrap.appendChild(msg);
    wrap.appendChild(makeAudioTools(text));
  }

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function upgradeOldMessages(){
  const chat = $("rlnewChat");
  if(!chat) return;
  [...chat.children].forEach(child=>{
    if(child.classList.contains("rlnew-msg-wrap")) return;
    if(!child.classList.contains("rlnew-msg")) return;
    const type = child.classList.contains("user") ? "user" : child.classList.contains("ai") ? "ai" : "system";
    const text = child.textContent || "";
    const wrap = document.createElement("div");
    wrap.className = "rlnew-msg-wrap " + type;
    child.replaceWith(wrap);
    if(type === "user"){
      wrap.appendChild(makeAudioTools(text));
      wrap.appendChild(child);
    }else{
      wrap.appendChild(child);
      wrap.appendChild(makeAudioTools(text));
    }
  });
}

function getLevel(){
  return document.querySelector("#rlnewLevels .rlnew-level.active")?.dataset?.level || "A1";
}
function getVisibleScenario(){
  return {
    title: $("rlnewSceneTitle")?.textContent?.trim() || "Real Life Scenario",
    desc: $("rlnewSceneDesc")?.textContent?.trim() || ""
  };
}

function hintToInput(){
  const input = $("rlnewMessageInput");
  if(!input) return;

  const sc = getVisibleScenario();
  const level = getLevel();

  const hints = {
    A1: {
      "Taxi Ride":"I want to go to the city center, please.",
      "Hotel Check-in":"I have a reservation under my name.",
      "Restaurant Order":"Can I have the menu, please?",
      "Airport Help":"Where is my gate, please?",
      "Shopping":"Do you have this in a different size?",
      "Doctor Visit":"I have a headache and I feel tired.",
      "Job Interview":"I have experience in this field.",
      "School Talk":"Can you help me with the homework?"
    },
    A2: {
      "Taxi Ride":"How long will it take to get there?",
      "Hotel Check-in":"Could you tell me if breakfast is included?",
      "Restaurant Order":"I would like this dish, but not too spicy.",
      "Airport Help":"Could you show me where the baggage claim is?",
      "Shopping":"Can I try this on in another color?",
      "Doctor Visit":"I have had this problem for two days.",
      "Job Interview":"I worked in a similar position before.",
      "School Talk":"I understood most of the lesson, but I need help with one part."
    },
    B1: {
      "Taxi Ride":"Could you take the fastest route? I am in a bit of a hurry.",
      "Hotel Check-in":"I booked a room online and I would like to confirm the details.",
      "Restaurant Order":"Could you recommend something popular that is not too spicy?",
      "Airport Help":"I need to find my gate and check whether my flight is delayed.",
      "Shopping":"I am looking for something comfortable and not too expensive.",
      "Doctor Visit":"The pain started yesterday and it gets worse when I move.",
      "Job Interview":"My strongest skill is communication, and I enjoy solving problems.",
      "School Talk":"I need more practice because the grammar topic was difficult for me."
    },
    B2: {
      "Taxi Ride":"Could you estimate the fare before we leave, and avoid heavy traffic if possible?",
      "Hotel Check-in":"I would appreciate a quiet room if one is available, preferably away from the elevator.",
      "Restaurant Order":"Could you suggest a local dish and explain what ingredients it contains?",
      "Airport Help":"I am worried about missing my connection. What is the quickest way to reach the gate?",
      "Shopping":"I like the design, but I am not sure about the size. What would you recommend?",
      "Doctor Visit":"I have been feeling unwell for several days, and the symptoms are affecting my daily routine.",
      "Job Interview":"I believe my previous experience matches this role because I have handled similar responsibilities.",
      "School Talk":"Could we review the topic again with a few examples? That would help me understand it better."
    },
    C1: {
      "Taxi Ride":"Given the traffic conditions, what route would you recommend to balance time and cost?",
      "Hotel Check-in":"Would it be possible to arrange a room upgrade if there is availability this evening?",
      "Restaurant Order":"I would appreciate a recommendation that reflects the local cuisine but is not overly heavy.",
      "Airport Help":"Could you clarify the boarding process and whether I need to go through security again?",
      "Shopping":"I am comparing quality and price, so I would like to know whether this item is worth it.",
      "Doctor Visit":"I would like to describe my symptoms in detail so we can understand what might be causing them.",
      "Job Interview":"I am particularly interested in this role because it aligns with both my experience and long-term goals.",
      "School Talk":"Could you help me approach this assignment more strategically rather than simply giving me the answer?"
    }
  };

  const byLevel = hints[level] || hints.A1;
  const suggestion = byLevel[sc.title] || byLevel["Taxi Ride"] || "I need help, please.";

  input.value = suggestion;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function patchButtons(){
  upgradeOldMessages();

  const hintBtn = $("rlnewHintBtn");
  if(hintBtn){
    const clone = hintBtn.cloneNode(true);
    hintBtn.replaceWith(clone);
    clone.addEventListener("click", hintToInput);
  }

  const clearBtn = $("rlnewClearChatBtn");
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      setTimeout(()=>upgradeOldMessages(), 80);
      stopSpeak();
    }, true);
  }

  const chat = $("rlnewChat");
  if(chat && !chat.dataset.audioObserver){
    const obs = new MutationObserver(()=>upgradeOldMessages());
    obs.observe(chat,{childList:true});
    chat.dataset.audioObserver = "1";
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", patchButtons);
}else{
  patchButtons();
}
})();


/* ===== extracted script block ===== */


(function(){
"use strict";

function $(id){ return document.getElementById(id); }

function normLetters(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^a-z]/g,"");
}

function esc(s){
  return String(s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

const closeGroups = [
  ["v","f","w"],["r","l"],["t","d"],["s","z"],["i","e","y"],
  ["o","u"],["a","e"],["c","k","q"],["g","j"],["p","b"]
];

function isClose(a,b){
  return closeGroups.some(g => g.includes(a) && g.includes(b));
}

function align(target, spoken){
  const a = normLetters(target);
  const b = normLetters(spoken);
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, () => Array(n+1).fill(0));

  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;

  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : (isClose(a[i-1], b[j-1]) ? 0.5 : 1);
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + cost
      );
    }
  }

  let i=m, j=n, out=[];
  while(i>0 || j>0){
    if(i>0 && j>0){
      const subCost = a[i-1] === b[j-1] ? 0 : (isClose(a[i-1], b[j-1]) ? 0.5 : 1);
      if(Math.abs(dp[i][j] - (dp[i-1][j-1] + subCost)) < 0.001){
        out.push({
          char:a[i-1],
          heard:b[j-1],
          status:a[i-1]===b[j-1] ? "ok" : (isClose(a[i-1],b[j-1]) ? "close" : "bad")
        });
        i--; j--;
        continue;
      }
    }
    if(i>0 && Math.abs(dp[i][j] - (dp[i-1][j] + 1)) < 0.001){
      out.push({char:a[i-1], heard:"", status:"miss"});
      i--;
    }else{
      out.push({char:b[j-1], heard:b[j-1], status:"extra"});
      j--;
    }
  }
  return out.reverse();
}

function toastSafe(title,msg){
  if(typeof window.toast === "function") window.toast(title,msg||"");
  else if(typeof window.showToast === "function") window.showToast(title,msg||"");
  else console.warn(title, msg||"");
}

function renderPronMapFixed(){
  const targetEl = $("wmngPronTarget");
  const spokenEl = $("wmngPronSpoken");
  const out = $("wmngPronResult");
  if(!targetEl || !spokenEl || !out){
    alert("Telaffuz haritası alanları bulunamadı.");
    return;
  }

  const target = targetEl.value.trim();
  let spoken = spokenEl.value.trim();

  if(!target){
    alert("Önce hedef kelimeyi yaz.");
    targetEl.focus();
    return;
  }

  // Eskiden burada duyulan kelime boşsa hiç çalışmıyordu.
  // Artık boşsa hedefe göre demo/başlangıç haritası gösteriyoruz.
  const demoMode = !spoken;
  if(!spoken) spoken = target;

  const data = align(target, spoken);
  const totalTarget = data.filter(x => x.status !== "extra").length || target.length || 1;
  const ok = data.filter(x => x.status === "ok").length;
  const close = data.filter(x => x.status === "close").length;
  const score = Math.round(((ok + close*0.5) / totalTarget) * 100);
  const weak = [...new Set(data.filter(x => !["ok","extra"].includes(x.status)).map(x=>x.char))];

  out.style.display = "block";
  out.innerHTML = `
    <div style="font-size:15px;font-weight:900;margin-bottom:6px">🎯 Telaffuz Haritası</div>
    <div class="wmng-pmap">
      ${data.map(x=>`<span class="pm-${x.status}" title="Beklenen: ${esc(x.char)}${x.heard ? " | Duyulan: "+esc(x.heard) : " | Duyulmadı"}">${esc(x.char)}</span>`).join("")}
    </div>
    <div class="wmng-scorebar"><span style="width:${Math.max(0,Math.min(100,score))}%"></span></div>
    <div class="pron-fix-note">
      Skor: <b>${score}%</b><br>
      ${demoMode ? "Duyulan/okunan alanı boş olduğu için başlangıç haritası hedef kelimeye göre gösterildi. Daha doğru analiz için <b>Konuş</b> düğmesine bas veya duyulan kelimeyi yaz." : ""}
      ${weak.length ? "<br>Dikkat edilecek sesler: <b>"+esc(weak.join(", "))+"</b>" : "<br>Belirgin sorunlu ses görünmüyor."}
      <br><span style="color:#4ade80">Yeşil</span>: doğru · <span style="color:#facc15">Sarı</span>: yakın · <span style="color:#fca5a5">Kırmızı</span>: sorunlu · <span style="color:#fb923c">Turuncu</span>: eksik
    </div>
  `;
}

function listenPronMapFixed(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const targetEl = $("wmngPronTarget");
  const spokenEl = $("wmngPronSpoken");

  if(!SR){
    alert("Bu tarayıcı ses tanımayı desteklemiyor. Android Chrome kullanmayı deneyin.");
    return;
  }
  if(!targetEl || !spokenEl){
    alert("Telaffuz haritası alanları bulunamadı.");
    return;
  }
  if(!targetEl.value.trim()){
    alert("Önce hedef kelimeyi yaz.");
    targetEl.focus();
    return;
  }

  try{ if(window.__wmPronMapRec){ window.__wmPronMapRec.stop(); window.__wmPronMapRec.abort && window.__wmPronMapRec.abort(); window.__wmPronMapRec=null; return; } }catch(e){}
  try{ wmStopOpenMicStreams(); }catch(e){}

  const rec = new SR();
  window.__wmPronMapRec = rec;
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;

  let finalText = "";
  rec.onstart = () => toastSafe("Dinleniyor", "Kelimeyi İngilizce söyle.");
  rec.onresult = (e) => {
    let interim = "";
    for(let i=e.resultIndex; i<e.results.length; i++){
      const txt = e.results[i][0].transcript || "";
      if(e.results[i].isFinal) finalText += txt + " ";
      else interim += txt;
    }
    spokenEl.value = (finalText + interim).trim();
  };
  rec.onend = () => {
    window.__wmPronMapRec = null;
    try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
    if(spokenEl.value.trim()) renderPronMapFixed();
  };
  rec.onerror = (e) => {
    window.__wmPronMapRec = null;
    try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(_e){}
    const err = e && e.error ? e.error : "";
    if(err === "not-allowed" || err === "service-not-allowed"){
      alert("Mikrofon izni verilmedi. Chrome adres çubuğundaki kilit simgesinden mikrofon iznini açın.");
    }else if(err !== "aborted"){
      alert("Ses algılanamadı. Tekrar deneyin. Hata: " + (err || "bilinmiyor"));
    }
  };
  try{ rec.start(); }catch(e){ window.__wmPronMapRec=null; alert("Mikrofon başlatılamadı. Sayfayı yenileyip tekrar deneyin."); }
}

function fillCurrentPronMapFixed(){
  const targetEl = $("wmngPronTarget");
  const spokenEl = $("wmngPronSpoken");
  if(!targetEl) return;

  let word = "";
  try{
    if(typeof window.getCurrent === "function"){
      const c = window.getCurrent();
      word = (typeof window.wordText === "function") ? window.wordText(c) : (c?.word || c?.en || "");
    }
  }catch(e){}
  if(!word && window.words && typeof window.idx !== "undefined" && window.words[window.idx]){
    const w = window.words[window.idx];
    word = w.word || w.en || w.english || "";
  }
  if(word) targetEl.value = word;
  if(spokenEl) spokenEl.value = "";
}

function installPronFix(){
  window.WMNG = window.WMNG || {};
  window.WMNG.renderPronMap = renderPronMapFixed;
  window.WMNG.listenPronMap = listenPronMapFixed;
  window.WMNG.fillCurrentPronMap = fillCurrentPronMapFixed;

  const mapBtn = document.querySelector('#sc-pronmap button[onclick*="renderPronMap"]');
  if(mapBtn){
    mapBtn.onclick = function(e){
      e.preventDefault();
      renderPronMapFixed();
      return false;
    };
  }

  const listenBtn = document.querySelector('#sc-pronmap button[onclick*="listenPronMap"]');
  if(listenBtn){
    listenBtn.onclick = function(e){
      e.preventDefault();
      listenPronMapFixed();
      return false;
    };
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", installPronFix);
}else{
  installPronFix();
}
setTimeout(installPronFix, 800);
setTimeout(installPronFix, 1800);
})();


/* ===== extracted script block ===== */


/* ══════════════════════════════════════════════════════════
   KAMERA KOÇU - Mikrofon sistemine dokunmaz
   - MediaPipe FaceMesh varsa dudak/çene landmark analizi
   - Yoksa güvenli fallback: kamera/pozisyon/ışık ve konuşma hareketi tahmini
   ══════════════════════════════════════════════════════════ */
