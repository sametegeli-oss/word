/* ════════════════════════════════════════════════════════════════
   WordMode — modül: ai-features.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function setUserLevel(level){
  aiUserLevel=level;
  if(level==="beginner") currentLevel=1;
  else if(level==="intermediate") currentLevel=2;
  else currentLevel=3;
  
  document.querySelectorAll(".level-chip").forEach(chip=>{
    chip.classList.remove("active");
    if(chip.dataset.level===level) chip.classList.add("active");
  });
}

// ══════════════════════════════════════════════════════════
// LONG PRESS - AUTO AI ANALYSIS (FROM WORD MODE)
// ══════════════════════════════════════════════════════════
async function openAIWithWord(){
  const item=words[idx];
  if(!item) return;
  
  showScreen("sc-ai");
  chatHistory=[];
  document.getElementById("chatMessages").innerHTML=`
    <div class="chat-msg ai">
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:12px">🤖</div>
        <p style="color:var(--muted)">"${item.word}" kelimesi analiz ediliyor...</p>
      </div>
    </div>`;
  
  const autoPrompt=`"${item.word}" kelimesi hakkında detaylı analiz yap:
1. Türkçe anlamı
2. Telaffuz ipucu
3. 3 farklı örnek cümle
4. Yaygın hataları
5. Benzer kelimeler
Öğretici ve motive edici ol!`;
  
  const response=await callGroqAPI(currentLevel===1?"Sen bir başlangıç seviyesi İngilizce öğretmenisin.":currentLevel===2?"Sen bir orta seviye İngilizce öğretmenisin.":"Sen bir ileri seviye İngilizce öğretmenisin.",autoPrompt);
  
  chatHistory=[{role:"user",content:autoPrompt},{role:"assistant",content:response}];
  document.getElementById("chatMessages").innerHTML=`<div class="chat-msg ai">${formatAIResponse(highlightEnglishWords(response).replace(/\n/g,"<br>"))}</div>`;
  document.getElementById("chatMessages").scrollTop=document.getElementById("chatMessages").scrollHeight;
  // Hazır promptları güncelle
  const suggests = [
    "Bu kelimeyi bir cümlede kullan",
    "Bu kelimenin eş anlamlıları neler?",
    "Bu kelimenin zıt anlamı nedir?",
    "Bu kelimenin kökeni nedir?",
    "Bana 3 örnek cümle ver",
    "Bu cümleyle aynı anlamı veren alternatif İngilizce cümleler nelerdir?"
  ];
  document.getElementById("chatSuggests").innerHTML = suggests.map(s =>
    `<div class="chat-chip" onclick="document.getElementById('chatInput').value='${s}';sendChat()">${s}</div>`
  ).join("");
}

// ══════════════════════════════════════════════════════════
// LONG PRESS - AUTO AI ANALYSIS (FROM SENTENCE MODE)
// ══════════════════════════════════════════════════════════
async function openAIWithSentenceWord(wordItem){
  showScreen("sc-ai");
  chatHistory=[];
  document.getElementById("chatMessages").innerHTML=`
    <div class="chat-msg ai">
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:12px">🤖</div>
        <p style="color:var(--muted)">"${wordItem.word}" kelimesi analiz ediliyor...</p>
      </div>
    </div>`;
  
  const autoPrompt=`"${wordItem.word}" kelimesi hakkında detaylı analiz yap:
1. Türkçe anlamı: ${wordItem.tr}
2. Telaffuz ipucu
3. 3 farklı örnek cümle (biri: "${wordItem.sentence||''}")
4. Bu cümlede nasıl kullanılmış
5. Yaygın hataları
6. Benzer kelimeler
Öğretici ve motive edici ol!`;
  
  const response=await callGroqAPI(currentLevel===1?"Sen bir başlangıç seviyesi İngilizce öğretmenisin.":currentLevel===2?"Sen bir orta seviye İngilizce öğretmenisin.":"Sen bir ileri seviye İngilizce öğretmenisin.",autoPrompt);
  
  chatHistory=[{role:"user",content:autoPrompt},{role:"assistant",content:response}];
  document.getElementById("chatMessages").innerHTML=`<div class="chat-msg ai">${formatAIResponse(highlightEnglishWords(response).replace(/\n/g,"<br>"))}</div>`;
  document.getElementById("chatMessages").scrollTop=document.getElementById("chatMessages").scrollHeight;
  // Hazır promptları güncelle
  const suggests2 = [
    "Bu cümledeki yapıları detaylı öğret",
    "Bu cümlenin gramer yapısını açıkla",
    "Bu cümleyle benzer 3 örnek ver",
    "Bu kelimenin kökeni nedir?",
    "Bu cümlenin zamanını açıkla",
    "Bu cümleyle aynı anlamı veren alternatif İngilizce cümleler nelerdir?"
  ];
  document.getElementById("chatSuggests").innerHTML = suggests2.map(s =>
    `<div class="chat-chip" onclick="document.getElementById('chatInput').value='${s}';sendChat()">${s}</div>`
  ).join("");
}

// ══════════════════════════════════════════════════════════
// AI PRONUNCIATION COACH
// ══════════════════════════════════════════════════════════

let pfcMode = "word";
const pfcSoundTips = {
  // same:true  = Türkçedeki sese yakın / yeşil
  // same:false = Türkçeden farklı veya özel dikkat ister / kırmızı
  "p": {name:"P", same:true, tip:"Türkçedeki P'ye yakın. Dudakları kapat, kısa ve net patlat.", mouth:"neutral"},
  "b": {name:"B", same:true, tip:"Türkçedeki B'ye yakın. Dudakları kapat, sesli ve kısa çıkar.", mouth:"neutral"},
  "t": {name:"T", same:true, tip:"Türkçedeki T'ye yakın. Dil ucunu üst dişlerin arkasına kısa temas ettir.", mouth:"neutral"},
  "d": {name:"D", same:true, tip:"Türkçedeki D'ye yakın. Sesli ve kısa söyle; kelime sonunda çok uzatma.", mouth:"neutral"},
  "k": {name:"K", same:true, tip:"Türkçedeki K'ye yakın. Dilin arkası damağa kısa temas eder. Kelime sonunda net ama abartısız bitir.", mouth:"back"},
  "g": {name:"G", same:true, tip:"Türkçedeki G'ye yakın. Dil arkası damağa temas eder, sesli çıkar.", mouth:"back"},
  "m": {name:"M", same:true, tip:"Türkçedeki M'ye yakın. Dudaklar kapanır, ses burundan gelir.", mouth:"neutral"},
  "n": {name:"N", same:true, tip:"Türkçedeki N'ye yakın. Dil üst dişlerin arkasına yaklaşır, ses burundan gelir.", mouth:"neutral"},
  "s": {name:"S", same:true, tip:"Türkçedeki S'ye yakın. Dişlerin arasından ince hava ver; ses tellerini titreştirme.", mouth:"smile"},
  "z": {name:"Z", same:true, tip:"Türkçedeki Z'ye yakın. S gibi ama ses telleri titreşir.", mouth:"smile"},
  "h": {name:"H", same:true, tip:"Türkçedeki H'ye yakın. Boğazdan hafif hava çıkar.", mouth:"open"},
  "l": {name:"L", same:true, tip:"Türkçedeki L'ye yakın. Dil ucunu üst damağa değdir, sesi yumuşak bırak.", mouth:"neutral"},
  "j": {name:"Y", same:true, tip:"Türkçedeki Y sesine yakın. 'yes' kelimesindeki başlangıç sesi gibi.", mouth:"smile"},

  "f": {name:"F", same:true, tip:"Türkçedeki F'ye yakın. Alt dudak üst dişe temas eder; hava sürtünmeli çıkar.", mouth:"teeth"},
  "v": {name:"V", same:true, tip:"Türkçedeki V'ye yakın ama W ile karıştırma. Alt dudağı üst dişe hafif değdir, sesli titreşim ver.", mouth:"teeth"},
  "ʃ": {name:"SH / Ş", same:true, tip:"Türkçedeki Ş'ye yakın. Dudaklar hafif öne gelir, hava sürtünmeli çıkar.", mouth:"wide"},
  "tʃ": {name:"CH / Ç", same:true, tip:"Türkçedeki Ç'ye yakın. Kısa patlamalı başlar: chair, choose gibi.", mouth:"wide"},
  "dʒ": {name:"J / C", same:true, tip:"Türkçedeki C'ye yakın. Önce kısa patlama sonra yumuşak sürtünme olur.", mouth:"wide"},

  "θ": {name:"TH / think", same:false, tip:"Türkçede birebir yok. T gibi vurma. Dil ucunu üst-alt dişlerin arasına çok hafif çıkar, havayı sürtünmeli ver.", mouth:"tongue"},
  "ð": {name:"TH / this", same:false, tip:"Türkçede birebir yok. D deme. Dil dişlerin arasında kalsın, ses telleri çalışsın ve hava sürtünsün.", mouth:"tongue"},
  "r": {name:"American R", same:false, tip:"Türkçedeki R gibi titretme. Dil ucunu damağa değdirme. Dudakları hafif yuvarla, dil geride ve gergin olsun.", mouth:"round"},
  "w": {name:"W", same:false, tip:"Türkçedeki V değil. Dişe temas yok. Dudakları iyice yuvarla ve hızlıca aç: w + sesli.", mouth:"round"},
  "ŋ": {name:"ING", same:false, tip:"Türkçede tek başına net karşılığı yok. Dil arkası yumuşak damağa yaklaşır. ING sonunda çoğu zaman sert G ekleme.", mouth:"back"},

  "ɪ": {name:"Kısa i", same:false, tip:"Türkçedeki uzun 'ii' gibi uzatma. Kısa, gevşek ve hızlı söyle: sit, think.", mouth:"smile"},
  "i": {name:"Kısa i / yumuşak i", same:false, tip:"Kısa ve hafif söyle. Türkçedeki net uzun İ gibi uzatma.", mouth:"smile"},
  "iː": {name:"Uzun i", same:false, tip:"Türkçedeki İ'ye yakın ama daha uzun. Dudakları gülümser gibi ger: see, need.", mouth:"smile"},
  "e": {name:"E", same:true, tip:"Türkçedeki E'ye yakın. Kısa ve net söyle.", mouth:"smile"},
  "æ": {name:"A/E arası", same:false, tip:"Türkçede birebir yok. E ile A arasında, ağız daha açık: cat, bad.", mouth:"open"},
  "ʌ": {name:"Kısa a", same:false, tip:"Türkçedeki net A kadar açık değil. Kısa ve merkezden çıkar: cup, study.", mouth:"open"},
  "ə": {name:"Schwa", same:false, tip:"Türkçede birebir yok. Çok kısa ve zayıf ı/e arası ses. Vurgusuz hecede ağzı yorma.", mouth:"neutral"},
  "uː": {name:"Uzun u", same:false, tip:"Türkçedeki U'ya yakın ama daha uzun ve yuvarlak: food, through.", mouth:"round"},
  "ʊ": {name:"Kısa u", same:false, tip:"Türkçedeki uzun U gibi değil. Kısa, gevşek ve yuvarlak: book, good.", mouth:"round"},
  "oʊ": {name:"O + u kayışı", same:false, tip:"Türkçedeki tek O değil. O'dan başlayıp hafif U'ya kayar: go, though.", mouth:"round"},
  "aɪ": {name:"AY", same:false, tip:"A'dan İ'ye kayar: right, my. Tek düz A gibi söyleme.", mouth:"open"},
  "eɪ": {name:"EY", same:false, tip:"E'den İ'ye kayar: day, say. Türkçedeki düz E gibi bırakma.", mouth:"smile"},
  "ɑː": {name:"Uzun a", same:false, tip:"Ağzı açık tut ve sesi uzat: father, calm. Türkçedeki kısa A'dan daha uzun.", mouth:"open"},
  "ɔː": {name:"Uzun o", same:false, tip:"O sesi daha uzun ve yuvarlak: thought, wrong. Kısa O gibi kesme.", mouth:"round"},
  "ɜː": {name:"ER sesi", same:false, tip:"Türkçede birebir yok. Dil geride, dudak hafif yuvarlak; work, word içinde duyulur.", mouth:"round"},
  "ər": {name:"ER / r'li hece", same:false, tip:"Vurgusuz ER. Çok bastırma; kısa bir ı + Amerikan R gibi düşün.", mouth:"round"},
  "ən": {name:"-en / -ın", same:false, tip:"Çok kısa zayıf hece. conversation sonundaki -tion gibi yumuşak bitir.", mouth:"neutral"}
};const pfcKnownIPA = {
  study:["s","t","ʌ","d","i"], student:["s","t","uː","d","ə","n","t"], school:["s","k","uː","l"], speak:["s","p","iː","k"], stop:["s","t","ɑː","p"],
  think:["θ","ɪ","ŋ","k"], through:["θ","r","uː"], though:["ð","oʊ"], this:["ð","ɪ","s"], that:["ð","æ","t"], three:["θ","r","iː"], enough:["ɪ","n","ʌ","f"], comfortable:["k","ʌ","m","f","t","ə","b","l"], vocabulary:["v","ə","ʊ","k","æ","b","j","ə","l","e","r","i"], conversation:["k","ɑː","n","v","ər","s","eɪ","ʃ","ən"], achievement:["ə","tʃ","iː","v","m","ə","n","t"], world:["w","ɜː","r","l","d"], very:["v","e","r","i"], work:["w","ɜː","r","k"], word:["w","ɜː","r","d"], run:["r","ʌ","n"], right:["r","aɪ","t"], wrong:["r","ɔː","ŋ"], difficult:["d","ɪ","f","ɪ","k","ə","l","t"], pronunciation:["p","r","ə","n","ʌ","n","s","i","eɪ","ʃ","ən"]
};
function setPFCMode(mode){
  pfcMode=mode;
  ["word","phrase","sentence"].forEach(m=>{const b=document.getElementById('pfcMode'+m[0].toUpperCase()+m.slice(1)); if(b) b.classList.toggle('active',m===mode);});
  const input=document.getElementById('pronCoachTargetInput');
  if(input){ input.placeholder = mode==='word' ? 'Örn: think, enough, comfortable...' : mode==='phrase' ? 'Örn: think about it, very well...' : 'Örn: I think this is very useful.'; }
}
function pfcTokenizeTarget(text){
  const clean=(text||'').toLowerCase().replace(/[^a-z\s']/g,' ').trim();
  if(!clean) return [];
  let out=[]; clean.split(/\s+/).forEach(w=>{ out=out.concat(pfcWordToIPA(w)); });
  return out;
}
function pfcWordToIPA(word){
  word=(word||'').toLowerCase().replace(/[^a-z']/g,'');
  if(pfcKnownIPA[word]) return pfcKnownIPA[word];
  const chunks=[];
  for(let i=0;i<word.length;i++){
    const two=word.slice(i,i+2), three=word.slice(i,i+3);
    if(three==='thr'){chunks.push('θ','r'); i+=2; continue;}
    if(two==='th'){chunks.push(['this','that','the','they','them','there','these','those','though'].includes(word)?'ð':'θ'); i++; continue;}
    if(two==='sh'){chunks.push('ʃ'); i++; continue;}
    if(two==='ch'){chunks.push('tʃ'); i++; continue;}
    if(two==='ng'){chunks.push('ŋ'); i++; continue;}
    if(two==='oo'){chunks.push('uː'); i++; continue;}
    if(two==='ee'||two==='ea'){chunks.push('iː'); i++; continue;}
    const c=word[i];
    const map={a:'æ',e:'e',i:'ɪ',o:'oʊ',u:'ʌ',y:'i',c:'k',j:'dʒ',x:'k s'};
    if(map[c]) chunks.push(...map[c].split(' ')); else chunks.push(c);
  }
  return chunks.filter(Boolean);
}
function pfcMouthForSound(sound){return (pfcSoundTips[sound]&&pfcSoundTips[sound].mouth)||({"uː":"round","oʊ":"round","i":"smile","e":"smile","ɑː":"open"}[sound]||"neutral");}
function pfcTipForSound(sound){return (pfcSoundTips[sound]&&pfcSoundTips[sound].tip)||"Bu sesi kısa ve net üret. Kelimeyi yavaşça hecelere böl, sonra normal hızda tekrar et.";}
function renderPFCFace(sound){
  const type=pfcMouthForSound(sound);
  let mouth='<ellipse cx="64" cy="84" rx="22" ry="9" fill="#111827" stroke="#e8eaf6" stroke-width="3"/>';
  let tongue=''; let teeth='';
  if(type==='round') mouth='<ellipse cx="64" cy="84" rx="15" ry="18" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
  if(type==='smile') mouth='<path d="M35 80 Q64 100 93 80" fill="none" stroke="#e8eaf6" stroke-width="5" stroke-linecap="round"/>';
  if(type==='open') mouth='<ellipse cx="64" cy="84" rx="24" ry="24" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
  if(type==='wide') mouth='<ellipse cx="64" cy="84" rx="28" ry="11" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>';
  if(type==='tongue'){ mouth='<ellipse cx="64" cy="84" rx="25" ry="11" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>'; tongue='<ellipse cx="64" cy="91" rx="13" ry="7" fill="#fca5a5"/>'; teeth='<rect x="45" y="76" width="38" height="7" rx="2" fill="#fff" opacity=".95"/>'; }
  if(type==='teeth'){ mouth='<path d="M40 80 Q64 94 88 80" fill="none" stroke="#e8eaf6" stroke-width="5" stroke-linecap="round"/>'; teeth='<rect x="44" y="74" width="40" height="8" rx="2" fill="#fff" opacity=".95"/>'; }
  if(type==='back'){ mouth='<ellipse cx="64" cy="84" rx="21" ry="13" fill="#050814" stroke="#e8eaf6" stroke-width="4"/>'; tongue='<path d="M43 94 Q64 82 85 94" fill="none" stroke="#fca5a5" stroke-width="6" stroke-linecap="round"/>'; }
  const svg=`<svg viewBox="0 0 128 128" width="128" height="128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="54" fill="#172033" stroke="#374151" stroke-width="3"/><circle cx="45" cy="55" r="5" fill="#e8eaf6"/><circle cx="83" cy="55" r="5" fill="#e8eaf6"/><path d="M50 39 Q64 32 78 39" fill="none" stroke="#7c85b0" stroke-width="4" stroke-linecap="round"/>${teeth}${mouth}${tongue}<text x="64" y="121" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="800">${sound||''}</text></svg>`;
  const el=document.getElementById('pfcFaceSvg'); if(el) el.innerHTML=svg;
}
function renderPFCTarget(target){
  const phones=pfcTokenizeTarget(target);
  const first=phones[0]||'—';
  const cs=document.getElementById('pfcCurrentSound'); if(cs) cs.textContent=first;
  const cl=document.getElementById('pfcCurrentLabel'); if(cl) cl.textContent=target ? 'İlk hedef fonem' : 'Hedef ses';
  const tip=document.getElementById('pfcTip'); if(tip) tip.textContent=first==='—'?'Kelime yazıp “Kelimeyi Ayarla” dediğinde dudak/dil pozisyonu ve fonem haritası burada görünecek.':pfcTipForSound(first);
  const ipa=document.getElementById('pfcIPA'); if(ipa) ipa.innerHTML='IPA: <b style="color:var(--green)">'+phones.join(' · ')+'</b>';
  const hm=document.getElementById('pfcHeatmap'); if(hm) hm.innerHTML=(phones.length?phones:['—']).map((p,i)=>`<button class="pfc-ph neutral" onclick="pfcSelectSound('${String(p).replace(/'/g,"\\'")}')"><span class="ipa">${p}</span><span class="lbl">${i+1}</span></button>`).join('');
  const score=document.getElementById('pfcScore'); if(score) score.textContent='—';
  const weak=document.getElementById('pfcWeakCount'); if(weak) weak.textContent='—';
  renderPFCFace(first);
  renderPFCProblemCards(phones);
}
function pfcSelectSound(sound){
  const cs=document.getElementById('pfcCurrentSound'); if(cs) cs.textContent=sound;
  const tip=document.getElementById('pfcTip'); if(tip) tip.textContent=pfcTipForSound(sound);
  renderPFCFace(sound);
}
function renderPFCProblemCards(targetPhones){
  const cards=document.getElementById('pfcProblemCards'); if(!cards) return;
  const phones = Array.isArray(targetPhones) ? targetPhones : pfcTokenizeTarget((document.getElementById('pronCoachTargetInput')?.value||''));
  const sounds = [...new Set(phones)].filter(Boolean);
  if(!sounds.length){
    cards.innerHTML = `<div class="pfc-sound-card" style="grid-column:1/-1"><b>ℹ️</b><div>Kelime yazınca buraya o kelimedeki tüm seslerin açıklaması gelecek.</div></div>`;
    return;
  }
  cards.innerHTML=sounds.map(s=>{
    const info=pfcSoundTips[s] || {name:s, same:false, tip:"Bu ses için temel açıklama: sesi kısa ve net üret. Kelime içindeki yerini dinle, sonra yavaşça tekrar et.", mouth:"neutral"};
    const same=!!info.same;
    const cls=same?'same-tr':'diff-tr';
    const tag=same?'<span class="pfc-tag same">Türkçeye yakın</span>':'<span class="pfc-tag diff">Türkçeden farklı / dikkat</span>';
    const safe=String(s).replace(/'/g,"\\'");
    return `<div class="pfc-sound-card ${cls}" onclick="pfcSelectSound('${safe}')">${tag}<br><b>${s}</b><div>${info.name}<br>${info.tip}</div></div>`;
  }).join('');
}
function pfcNormalize(s){return (s||'').toLowerCase().replace(/[^a-z\s']/g,' ').replace(/\s+/g,' ').trim();}
function pfcSimilarity(a,b){
  a=pfcNormalize(a); b=pfcNormalize(b); if(!a||!b) return 0;
  const m=a.length,n=b.length; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return Math.max(0,1-dp[m][n]/Math.max(m,n));
}
function renderPFCAnalysis(target,heard){
  const phones=pfcTokenizeTarget(target); const sim=pfcSimilarity(target,heard); const base=Math.round(sim*100);
  const hm=document.getElementById('pfcHeatmap'); if(!hm) return;
  const targetNorm=pfcNormalize(target), heardNorm=pfcNormalize(heard);
  let weak=0;
  hm.innerHTML=phones.map((p,i)=>{
    let local=base;
    const key=String(p).replace(/[ːɪəʌæɑɔʊ]/g,'');
    if(key && !heardNorm.includes(key[0]||'')) local-=18;
    if(['θ','ð','r','w','v','ŋ'].includes(p) && targetNorm!==heardNorm) local-=12;
    local=Math.max(25,Math.min(98,local+(i%3-1)*5));
    const cls=local>=80?'good':local>=55?'warn':'bad'; if(cls!=='good') weak++;
    return `<button class="pfc-ph ${cls}" onclick="pfcSelectSound('${String(p).replace(/'/g,"\\'")}')"><span class="ipa">${p}</span><span class="lbl">${local}%</span></button>`;
  }).join('');
  const score=document.getElementById('pfcScore'); if(score) score.textContent=base+'%';
  const wc=document.getElementById('pfcWeakCount'); if(wc) wc.textContent=weak;
  const firstWeak=phones.find((p,i)=>{const btn=hm.children[i]; return btn && !btn.classList.contains('good');}) || phones[0] || '—';
  pfcSelectSound(firstWeak);
  savePFCPronHistory(target, heard, base, weak, phones);
}
function savePFCPronHistory(target,heard,score,weak,phones){
  try{
    const key='wm_pronunciation_face_history';
    let arr=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(arr)) arr=[];
    arr.unshift({target,heard,score,weak,phones,date:new Date().toISOString(),mode:pfcMode});
    localStorage.setItem(key,JSON.stringify(arr.slice(0,100)));
  }catch(e){console.warn('PFC history save skipped',e);}
}

let pronCoachCustomTarget = "";

function getPronCoachTargetWord(){
  const input = document.getElementById("pronCoachTargetInput");
  const typed = input ? input.value.trim() : "";
  const fallback = (words && words[idx] && words[idx].word) ? words[idx].word : "think";
  return typed || pronCoachCustomTarget || fallback;
}

function refreshPronCoachWordUI(){
  const target = getPronCoachTargetWord();
  const selected = document.getElementById("pronCoachSelectedWord");
  if(selected) selected.innerHTML = `Seçili kelime: <b style="color:var(--green)">${escapeHtml(target)}</b>`;
  const status = document.getElementById("coachStatus");
  if(status){
    status.innerHTML=`
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:12px">🎤</div>
        <div style="font-size:24px;font-weight:800;color:var(--green);margin-bottom:8px">${escapeHtml(target)}</div>
        <p style="color:var(--muted)">Bu kelimeyi/ifadeyi seslendir, AI analiz etsin</p>
        <canvas id="waveformCanvas" width="400" height="80" style="width:100%;max-width:400px;margin-top:16px;background:var(--bg3);border-radius:8px;display:none"></canvas>
      </div>`;
  }
  try{ renderPFCTarget(target); }catch(e){ console.warn('PFC render error', e); }
}

function setPronCoachTargetFromInput(){
  const input = document.getElementById("pronCoachTargetInput");
  const val = input ? input.value.trim() : "";
  if(!val){ alert("Lütfen çalışmak istediğin kelimeyi yaz."); return; }
  pronCoachCustomTarget = val;
  refreshPronCoachWordUI();
  const fb = document.getElementById("coachFeedback");
  if(fb) fb.innerHTML = "";
}

function setRandomPronCoachTarget(){
  let pool = [];
  try{ pool = (words || []).map(w=>w.word).filter(Boolean); }catch(e){}
  if(!pool.length) pool = ["think","enough","through","comfortable","achievement","vocabulary","conversation"];
  const picked = pool[Math.floor(Math.random()*pool.length)];
  pronCoachCustomTarget = picked;
  const input = document.getElementById("pronCoachTargetInput");
  if(input) input.value = picked;
  refreshPronCoachWordUI();
  const fb = document.getElementById("coachFeedback");
  if(fb) fb.innerHTML = "";
}

function fillPronCoachSuggestions(){
  const dl = document.getElementById("pronCoachWordSuggestions");
  if(!dl || dl.dataset.ready === "1") return;
  try{
    const sample = (words || []).slice(0,250).map(w=>w.word).filter(Boolean);
    dl.innerHTML = sample.map(w=>`<option value="${escapeHtml(w)}"></option>`).join("");
    dl.dataset.ready = "1";
  }catch(e){}
}

function openPronCoach(){
  showScreen("sc-proncoach");
  fillPronCoachSuggestions();
  const input = document.getElementById("pronCoachTargetInput");
  const fallback = (words && words[idx] && words[idx].word) ? words[idx].word : "think";
  if(input && !input.value.trim()) input.value = pronCoachCustomTarget || fallback;
  pronCoachCustomTarget = getPronCoachTargetWord();
  refreshPronCoachWordUI();
  document.getElementById("coachFeedback").innerHTML="";
}

async function startPronCoach(){
  const targetWord = getPronCoachTargetWord();
  pronCoachCustomTarget = targetWord;
  const word={word:targetWord};
  const recog=getRecognition();
  if(!recog){alert("Tarayıcı ses tanımayı desteklemiyor");return;}
  
  // Önceki recognition'ı durdur
  try{recog.abort();}catch(e){}
  
  // Canvas göster
  const canvas=document.getElementById("waveformCanvas");
  if(canvas) canvas.style.display="block";
  
  document.getElementById("coachStatus").innerHTML=`
    <div style="text-align:center;padding:20px;color:var(--red)">
      <div style="font-size:48px;margin-bottom:12px">🎤</div>
      <div style="font-size:20px;font-weight:800">Dinleniyor...</div>
      <p>Şimdi söyle: <strong style="color:var(--green)">${word.word}</strong></p>
      <canvas id="waveformCanvas" width="400" height="80" style="width:100%;max-width:400px;margin-top:16px;background:var(--bg3);border-radius:8px"></canvas>
    </div>`;
  
  // Dalga grafiği animasyonu
  drawWaveform("waveformCanvas",true);
  
  recog.onresult=async (e)=>{
    const heard=e.results[0][0].transcript;
    try{ renderPFCAnalysis(targetWord, heard); }catch(err){ console.warn('PFC analysis error', err); }
    
    // Dalga animasyonunu durdur
    drawWaveform("waveformCanvas",false);
    
    document.getElementById("coachStatus").innerHTML=`
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:12px">⏳</div>
        <p style="color:var(--muted)">Telaffuz analiz ediliyor...</p>
      </div>`;
    
    const prompt=`User tried to say "${word.word}" but said "${heard}". 
Analyze their pronunciation:
1. What sounds did they struggle with?
2. Give 3 specific tips in Turkish to improve
3. Rate accuracy 1-10
Keep it short and encouraging.`;
    
    try {
      // DİNAMİK AI SİSTEMİ
      const aiResponse = await callAI(getPrompt("pronunciation"), prompt, "pronun");
      const analysis = aiResponse.content || aiResponse; // Geriye uyumluluk
      
      console.log('🎤 Telaffuz - Kullanılan Model:', aiResponse.model, 'Token:', aiResponse.tokenLimit);
      
      document.getElementById("coachStatus").innerHTML=`
        <div style="text-align:center;padding:20px">
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <div style="font-size:16px;font-weight:700;color:var(--text)">Duyulan: "${heard}"</div>
        </div>`;
      
      // Model badge bilgisi
      let badgeHTML = '';
      if(aiResponse.model) {
        const modelNames = {
          'groq': 'Groq Llama 3.3',
          'openai': 'OpenAI GPT-4o-mini',
          'claude': 'Claude 3.5 Sonnet',
          'gemini': 'Gemini 2.5 Flash',
        'openrouter': 'OpenRouter (Ücretsiz)'
        };
        const modelColors = {
          'groq': '#60a5fa',
          'openai': '#10b981',
          'claude': '#a78bfa',
          'gemini': '#f59e0b',
        'openrouter': '#22c55e'
        };
        const modelName = modelNames[aiResponse.model] || aiResponse.model;
        const modelColor = modelColors[aiResponse.model] || '#64748b';
        
        badgeHTML = `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(0,0,0,0.3);
            border: 1px solid ${modelColor};
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            color: ${modelColor};
            margin-bottom: 12px; ">
            🤖 ${modelName} <span style="opacity:0.6">• ${aiResponse.tokenLimit} token</span>
          </div>`;
      }
      
      document.getElementById("coachFeedback").innerHTML=`
        <div class="correction-box">
          <div class="correction-label">🎯 Telaffuz Analizi</div>
          ${badgeHTML}
          <div class="correction-explain" style="white-space:pre-line">${analysis}</div>
        </div>
        <button class="btn btn-blue" onclick="startPronCoach()">🔄 Tekrar Dene</button>`;
        
    } catch(error) {
      console.error('Telaffuz analizi hatası:', error);
      document.getElementById("coachStatus").innerHTML=`
        <div style="text-align:center;padding:20px">
          <div style="font-size:48px;margin-bottom:12px">❌</div>
          <p style="color:var(--red)">${error.message || 'Analiz başarısız'}</p>
        </div>`;
    }
  };
  recog.start();
}

// Dalga grafiği çiz
let waveAnimFrame=null;
function drawWaveform(canvasId,animate){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  const ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height;
  
  if(!animate){
    if(waveAnimFrame) cancelAnimationFrame(waveAnimFrame);
    ctx.clearRect(0,0,w,h);
    // Statik dalga (hedef)
    ctx.strokeStyle="#8b5cf6";
    ctx.lineWidth=2;
    ctx.beginPath();
    for(let x=0;x<w;x++){
      const y=h/2+Math.sin(x*0.05)*15;
      if(x===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
    return;
  }
  
  // Animasyonlu dalga
  let offset=0;
  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle="#3b82f6";
    ctx.lineWidth=3;
    ctx.beginPath();
    for(let x=0;x<w;x++){
      const y=h/2+Math.sin((x+offset)*0.05)*20*Math.random();
      if(x===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
    offset+=2;
    waveAnimFrame=requestAnimationFrame(draw);
  }
  draw();
}

function playTargetAudio(){
  speak(getPronCoachTargetWord(),"en-US");
}

// ══════════════════════════════════════════════════════════
// AI VOICE CLONE
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// AI CONTEXT ANALYSIS
// ══════════════════════════════════════════════════════════
async function openContextAnalysis(){
  showScreen("sc-context");
  
  // DOM element kontrolü
  const contextMessages = document.getElementById("contextMessages");
  const contextInput = document.getElementById("contextInput");
  const contextSuggests = document.getElementById("contextSuggests");
  
  if (!contextMessages || !contextInput || !contextSuggests) {
    console.error('❌ Context Analysis DOM elements not found');
    return;
  }
  
  contextMessages.innerHTML = '';

  // Seçili kelimeyi otomatik doldur
  const currentWord = (words && words[idx]) ? words[idx].word : '';
  contextInput.value = currentWord || '';

  // Öneri chip'leri
  const contextSuggestsData = currentWord
    ? [currentWord, 'make vs do', 'get', 'take']
    : ['run', 'make vs do', 'get', 'take'];
  contextSuggests.innerHTML = contextSuggestsData.map(s =>
    `<div class="chat-chip" onclick="document.getElementById('contextInput').value='${s.replace(/'/g,"\'")}';sendContextAnalysis()">${s}</div>`
  ).join('');
  if(currentWord) setTimeout(()=>sendContextAnalysis(), 400);
  
  // Hoş geldin mesajı
  const welcomeWrapper = document.createElement('div');
  welcomeWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:6px';
  
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'partner-msg ai';
  welcomeDiv.innerHTML = '🧠 Merhaba! Herhangi bir kelime veya cümleyi analiz edebilirim. Farklı bağlamlarda nasıl kullanıldığını gösteririm.';
  
  welcomeWrapper.appendChild(welcomeDiv);
  
  // Butonlar
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
  
  const speakBtn = document.createElement('button');
  speakBtn.innerHTML = '🔊 Sesli Oku';
  speakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  speakBtn.onclick = () => readMessageAloud(welcomeDiv);
  buttonRow.appendChild(speakBtn);
  
  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = '🔇 Durdur';
  stopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  stopBtn.onclick = () => stopSpeech();
  buttonRow.appendChild(stopBtn);
  
  welcomeWrapper.appendChild(buttonRow);
  contextMessages.appendChild(welcomeWrapper);
  
  // Ayarlardan model yükle
  const savedModel = aiModelSettings.context || 'groq';
  const contextModelSelect = document.getElementById('contextAIModel');
  if(contextModelSelect) {
    contextModelSelect.value = savedModel;
  }
}

async function sendContextAnalysis() {
  const input = document.getElementById('contextInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  
  // Kullanıcı mesajı
  const userDiv = document.createElement('div');
  userDiv.className = 'partner-msg user';
  userDiv.textContent = text;
  userDiv.style.cssText = 'margin-bottom:12px;margin-left:auto';
  document.getElementById('contextMessages').appendChild(userDiv);
  
  // AI mesajı wrapper
  const aiWrapper = document.createElement('div');
  aiWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:6px';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'partner-msg ai';
  typingDiv.innerHTML = `<em style="color:var(--muted)">✍️ analiz ediliyor...</em>`;
  
  aiWrapper.appendChild(typingDiv);
  document.getElementById('contextMessages').appendChild(aiWrapper);
  aiWrapper.scrollIntoView({ behavior: 'smooth' });
  
  // Custom prompt'u al
  const contextPrompt = getPrompt('context');
  const systemPrompt = contextPrompt?.system || "Sen bir İngilizce öğretmenisin. Kelimelerin ve cümlelerin bağlamını analiz edersin.";
  const userPrompt = contextPrompt?.user || "Kelime: {{word}}";
  
  // User prompt'u doldur
  const finalUserPrompt = userPrompt.replace(/{{word}}/g, text);
  
  try {
    // Dinamik AI çağrısı
    const selectedModel = document.getElementById('contextAIModel')?.value || 'groq';
    console.log('🧠 Context AI Model:', selectedModel);
    
    const aiResponse = await callAI(
      systemPrompt,
      finalUserPrompt,
      'context' // context özelliği için context ayarlarını kullan
    );
    
    const response = String(aiResponse.content || aiResponse);
    typingDiv.innerHTML = highlightEnglishWords(response).replace(/\n/g, '<br>');
    
  } catch(error) {
    typingDiv.innerHTML = `<span style="color:var(--red)">❌ Hata: ${error.message}</span>`;
  }
  
  // Butonlar
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
  
  const speakBtn = document.createElement('button');
  speakBtn.innerHTML = '🔊 Sesli Oku';
  speakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  speakBtn.onclick = () => readMessageAloud(typingDiv);
  buttonRow.appendChild(speakBtn);
  
  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = '🔇 Durdur';
  stopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  stopBtn.onclick = () => stopSpeech();
  buttonRow.appendChild(stopBtn);
  
  aiWrapper.appendChild(buttonRow);
  aiWrapper.scrollIntoView({ behavior: 'smooth' });
  
  // Otomatik sesli oku (ayar açıksa)
  if (enableAutoRead) {
    setTimeout(() => {
      readMessageAloud(typingDiv);
    }, 500);
  }
  
  // Kelime tıklama ekle
  if (enableWordClick) {
    typingDiv.addEventListener('click', handleWordDoubleClick);
    typingDiv.addEventListener('touchend', handleMobileTouchEnd);
  }
}

function contextKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendContextAnalysis(); }
}

// Mikrofon için
let contextRecognition = null;
let isContextListening = false;

function toggleContextVoice() {
  if (isContextListening) {
    stopContextVoice();
  } else {
    startContextVoice();
  }
}

function startContextVoice() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Tarayıcınız ses tanımayı desteklemiyor. Chrome kullanın.');
    return;
  }
  
  contextRecognition = new SR();
  contextRecognition.lang = 'en-US';
  contextRecognition.continuous = false;
  contextRecognition.interimResults = true;
  
  const micBtn = document.getElementById('contextMicBtn');
  const statusEl = document.getElementById('contextVoiceStatus');
  const inputEl = document.getElementById('contextInput');
  
  micBtn.classList.add('listening');
  micBtn.textContent = '⏹️';
  statusEl.style.display = 'block';
  statusEl.innerHTML = '<em>🎤 Dinleniyor... Kelime veya cümle söyle</em>';
  isContextListening = true;
  
  contextRecognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    inputEl.value = transcript;
    statusEl.innerHTML = `<em style="color:var(--text)">Duyulan: "${transcript}"</em>`;
  };
  
  contextRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    stopContextVoice();
    statusEl.innerHTML = `<em style="color:var(--red)">❌ Hata: ${e.error === 'no-speech' ? 'Ses algılanamadı' : e.error}</em>`;
    setTimeout(() => statusEl.style.display = 'none', 3000);
  };
  
  contextRecognition.onend = () => {
    stopContextVoice();
    if (inputEl.value.trim()) {
      statusEl.innerHTML = '<em style="color:var(--green)">✅ Analiz başlıyor...</em>';
      setTimeout(() => {
        sendContextAnalysis();
        statusEl.style.display = 'none';
      }, 500);
    } else {
      statusEl.style.display = 'none';
    }
  };
  
  contextRecognition.start();
}

function stopContextVoice() {
  if (contextRecognition) {
    try {
      contextRecognition.stop();
    } catch (e) {}
  }
  
  const micBtn = document.getElementById('contextMicBtn');
  micBtn.classList.remove('listening');
  micBtn.textContent = '🎤';
  isContextListening = false;

  try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
}


// ══════════════════════════════════════════════════════════
// BAĞLAM ANALİZİ SESLİ OKUMA
// ══════════════════════════════════════════════════════════
function colorizeContext(text) {
  return text.split('\n').map(line => {
    const stripped = line.trimStart();
    const lower = stripped.toLowerCase();
    const indent = line.length - stripped.length;
    const pad = '&nbsp;'.repeat(indent);

    // Örnek cümle → kırmızı
    if (lower.startsWith('- örnek cümle') || lower.startsWith('örnek cümle')) {
      const colonIdx = stripped.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = stripped.slice(0, colonIdx + 1);
        const sentence = stripped.slice(colonIdx + 1);
        return `${pad}<span style="color:#f87171;font-weight:700">${prefix}</span><span style="color:#f87171">${sentence}</span>`;
      }
      return `${pad}<span style="color:#f87171;font-weight:700">${stripped}</span>`;
    }

    // Türkçe çeviri → yeşil
    if (lower.startsWith('- türkçe çeviri') || lower.startsWith('türkçe çeviri')) {
      const colonIdx = stripped.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = stripped.slice(0, colonIdx + 1);
        const tr = stripped.slice(colonIdx + 1);
        return `${pad}<span style="color:#4ade80;font-weight:700">${prefix}</span><span style="color:#4ade80">${tr}</span>`;
      }
      return `${pad}<span style="color:#4ade80;font-weight:700">${stripped}</span>`;
    }

    // Bağlam → mavi
    if (lower.startsWith('- bağlam') || lower.startsWith('bağlam')) {
      const colonIdx = stripped.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = stripped.slice(0, colonIdx + 1);
        const content = stripped.slice(colonIdx + 1);
        return `${pad}<span style="color:#60a5fa;font-weight:700">${prefix}</span><span style="color:#60a5fa">${content}</span>`;
      }
      return `${pad}<span style="color:#60a5fa;font-weight:700">${stripped}</span>`;
    }

    // Numara + başlık (1. Nesne getirmek) → bold beyaz
    if (/^\d+\./.test(stripped)) {
      return `${pad}<span style="font-weight:900;color:var(--text);font-size:15px">${highlightEnglishWords(stripped)}</span>`;
    }

    // Diğer satırlar normal
    return `${pad}${highlightEnglishWords(stripped)}`;
  }).join('\n');
}

function readContextAloud() {
  const text = window._contextRawText;
  if (!text) return;
  stopSpeech();

  window._contextReading = true; // okuma bayrağı

  const lines = text.split('\n').filter(l => l.trim());
  const utterances = [];

  lines.forEach(line => {
    const stripped = line.replace(/^[-–•]\s*/, '').trim();
    if (!stripped) return;

    const lower = stripped.toLowerCase();

    // Örnek cümle satırı → İngilizce oku
    if (lower.startsWith('örnek cümle') || lower.startsWith('- örnek cümle')) {
      // "Örnek cümle: ..." prefix'ini Türkçe, geri kalanı İngilizce oku
      const colonIdx = stripped.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = stripped.slice(0, colonIdx + 1).trim();
        const sentence = stripped.slice(colonIdx + 1).trim().replace(/^"|"$/g, '');
        if (prefix) utterances.push({ text: prefix, lang: 'tr-TR' });
        if (sentence) utterances.push({ text: sentence, lang: 'en-US' });
      } else {
        utterances.push({ text: stripped, lang: 'en-US' });
      }
      return;
    }

    // Türkçe çeviri satırı → Türkçe oku
    if (lower.startsWith('türkçe çeviri') || lower.startsWith('- türkçe çeviri')) {
      const colonIdx = stripped.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = stripped.slice(0, colonIdx + 1).trim();
        const trText = stripped.slice(colonIdx + 1).trim().replace(/^"|"$/g, '');
        if (prefix) utterances.push({ text: prefix, lang: 'tr-TR' });
        if (trText) utterances.push({ text: trText, lang: 'tr-TR' });
      } else {
        utterances.push({ text: stripped, lang: 'tr-TR' });
      }
      return;
    }

    // Bağlam satırı → Türkçe oku
    if (lower.startsWith('bağlam') || lower.startsWith('- bağlam')) {
      utterances.push({ text: stripped, lang: 'tr-TR' });
      return;
    }

    // Numara + başlık satırı (1. Nesne getirmek) → Türkçe oku
    if (/^\d+\./.test(stripped)) {
      utterances.push({ text: stripped.replace(/\*\*/g, ''), lang: 'tr-TR' });
      return;
    }

    // Geri kalan satırlar → Türkçe (açıklama metni)
    utterances.push({ text: stripped, lang: 'tr-TR' });
  });

  // TTS sıralı kuyruk
  const voices = speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr')) || null;
  const enVoice = voices.find(v => v.lang.startsWith('en')) || null;

  let i = 0;
  const speakNext = () => {
    if (i >= utterances.length || !window._contextReading) return;
    const { text, lang } = utterances[i++];
    if (!text.trim()) { speakNext(); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = lang === 'tr-TR' ? ttsRateTR : ttsRateEN;
    if (lang === 'tr-TR' && trVoice) utt.voice = trVoice;
    if (lang === 'en-US' && enVoice) utt.voice = enVoice;
    utt.onend = speakNext;
    utt.onerror = speakNext;
    speechSynthesis.speak(utt);
  };
  speakNext();
}

// ══════════════════════════════════════════════════════════
// AI CONVERSATION SIMULATION
// ══════════════════════════════════════════════════════════
function openConversationSim(){
  showScreen("sc-conversation");
  document.getElementById("convMessages").innerHTML="";
  convHistory=[];
  convScenario="";
}

function clearConvChat(){
  if(confirm("🗑️ Tüm konuşma geçmişi silinecek. Emin misin?")){
    document.getElementById("convMessages").innerHTML="";
    convHistory=[];
    convScenario="";
  }
}

// ── Tüm senaryolar ──
const ALL_SCENARIOS = [
  // 🏠 Günlük
  {id:'restaurant', cat:'daily', icon:'🍽️', name:'Restoran', role:'You are a friendly waiter at a cozy restaurant. I am a customer deciding what to order.'},
  {id:'cafe', cat:'daily', icon:'☕', name:'Kafe', role:'You are a barista at a busy coffee shop. I am a customer ordering coffee.'},
  {id:'grocery', cat:'daily', icon:'🛒', name:'Market', role:'You are a helpful grocery store employee. I am shopping for ingredients.'},
  {id:'pharmacy', cat:'daily', icon:'💊', name:'Eczane', role:'You are a pharmacist. I am a customer looking for medicine.'},
  {id:'barbershop', cat:'daily', icon:'💈', name:'Berber', role:'You are a barber. I am a customer getting a haircut.'},
  {id:'gym', cat:'daily', icon:'🏋️', name:'Spor Salonu', role:'You are a personal trainer at a gym. I am a new member.'},
  {id:'bank', cat:'daily', icon:'🏦', name:'Banka', role:'You are a bank teller. I am a customer with a banking question.'},
  {id:'postoffice', cat:'daily', icon:'📮', name:'Postane', role:'You are a post office clerk. I am sending a package.'},

  // ✈️ Seyahat
  {id:'airport', cat:'travel', icon:'✈️', name:'Havaalanı', role:'You are check-in staff at an international airport. I am a passenger.'},
  {id:'hotel', cat:'travel', icon:'🏨', name:'Otel', role:'You are a hotel receptionist. I am checking in for my stay.'},
  {id:'taxi', cat:'travel', icon:'🚕', name:'Taksi', role:'You are a taxi driver in a foreign city. I am a tourist.'},
  {id:'train', cat:'travel', icon:'🚆', name:'Tren İstasyonu', role:'You are a train station clerk. I need help with my ticket.'},
  {id:'tourist', cat:'travel', icon:'🗺️', name:'Turist Rehberi', role:'You are a local tour guide. I am a tourist asking for recommendations.'},
  {id:'customs', cat:'travel', icon:'🛂', name:'Gümrük', role:'You are a customs officer at the border. I am a traveler.'},
  {id:'lostbaggage', cat:'travel', icon:'🧳', name:'Kayıp Bagaj', role:'You are an airline lost baggage officer. My suitcase is missing.'},

  // 💼 İş
  {id:'jobinterview', cat:'work', icon:'💼', name:'İş Görüşmesi', role:'You are an HR manager interviewing me for a marketing position. Be professional but friendly.'},
  {id:'meeting', cat:'work', icon:'📊', name:'İş Toplantısı', role:'You are my colleague and we are in a business meeting discussing a new project.'},
  {id:'presentation', cat:'work', icon:'🎤', name:'Sunum', role:'You are my manager and I just finished a presentation. Give me feedback.'},
  {id:'negotiation', cat:'work', icon:'🤝', name:'Müzakere', role:'You are a client and we are negotiating a business deal.'},
  {id:'techsupport', cat:'work', icon:'💻', name:'Teknik Destek', role:'You are an IT support specialist. I am having trouble with my computer.'},
  {id:'teamwork', cat:'work', icon:'👥', name:'Takım Çalışması', role:'You are my coworker and we need to solve a problem together.'},

  // 👥 Sosyal
  {id:'party', cat:'social', icon:'🎉', name:'Parti', role:'You are a friendly person I just met at a party. Make small talk.'},
  {id:'dating', cat:'social', icon:'💝', name:'Tanışma', role:'You are someone I just met on a blind date at a coffee shop.'},
  {id:'neighbor', cat:'social', icon:'🏠', name:'Komşu', role:'You are my new neighbor. We meet for the first time in the hallway.'},
  {id:'university', cat:'social', icon:'🎓', name:'Üniversite', role:'You are a student advisor at a university. I am inquiring about programs.'},
  {id:'debate', cat:'social', icon:'💬', name:'Tartışma', role:'You are my friend and we are having a friendly debate about technology vs nature.'},
  {id:'friendship', cat:'social', icon:'😊', name:'Arkadaşlık', role:'You are my old friend I have not seen in years. We catch up over coffee.'},

  // 🚨 Acil
  {id:'doctor', cat:'emergency', icon:'👨‍⚕️', name:'Doktor', role:'You are a doctor in a clinic. I am a patient describing my symptoms.'},
  {id:'police', cat:'emergency', icon:'🚔', name:'Polis', role:'You are a police officer. I am reporting a lost item.'},
  {id:'hospital', cat:'emergency', icon:'🏥', name:'Hastane', role:'You are an emergency room receptionist. I am bringing in someone who is injured.'},
  {id:'caraccident', cat:'emergency', icon:'🚗', name:'Trafik Kazası', role:'You are a police officer at a minor car accident scene. I was involved.'},
  {id:'firstreport', cat:'emergency', icon:'📋', name:'Şikayet', role:'You are a customer service representative. I am complaining about a product.'},
];

let scenarioCatFilter = 'all';
let scenarioPanelOpen = false;

function initScenarios(){
  renderScenarioGrid();
  
  // Ayarlardan model yükle
  const savedModel = aiModelSettings.conversation || 'groq';
  const convModelSelect = document.getElementById('conversationAIModel');
  if(convModelSelect) {
    convModelSelect.value = savedModel;
  }
}

function filterScenarioCat(cat){
  scenarioCatFilter = cat;
  document.querySelectorAll('[id^="sc-cat-"]').forEach(b=>b.classList.remove('active'));
  document.getElementById('sc-cat-'+cat)?.classList.add('active');
  renderScenarioGrid();
}

function toggleScenarioPanel(){
  scenarioPanelOpen = !scenarioPanelOpen;
  const btn = document.getElementById('scenarioPanelToggle');
  if(btn) btn.textContent = scenarioPanelOpen ? '▲ Gizle' : '▼ Tümünü Gör';
  renderScenarioGrid();
}

function renderScenarioGrid(){
  const el = document.getElementById('scenarioGrid');
  if(!el) return;
  let list = scenarioCatFilter === 'all' ? ALL_SCENARIOS : ALL_SCENARIOS.filter(s=>s.cat===scenarioCatFilter);
  if(!scenarioPanelOpen) list = list.slice(0, 8);
  el.innerHTML = list.map(s =>
    `<button class="scenario-chip" onclick="startScenario('${s.id}')" title="${s.name}">${s.icon} ${s.name}</button>`
  ).join('');
  if(!scenarioPanelOpen && ALL_SCENARIOS.filter(s=>scenarioCatFilter==='all'||s.cat===scenarioCatFilter).length > 8){
    el.innerHTML += `<button class="scenario-chip" onclick="toggleScenarioPanel()" style="border-color:var(--purple);color:var(--purple)">+${ALL_SCENARIOS.filter(s=>scenarioCatFilter==='all'||s.cat===scenarioCatFilter).length - 8} daha</button>`;
  }
}

async function generateCustomScenario(){
  const input = document.getElementById('customScenarioInput');
  const preview = document.getElementById('customScenarioPreview');
  const topic = input?.value?.trim();
  if(!topic){ showToast('⚠️ Konu girin','Örn: kafede arkadaşla buluşma'); return; }

  preview.innerHTML = '<span style="color:var(--muted)">🤖 Senaryo oluşturuluyor...</span>';

  const role = await callGroqAPI(
    'You are a language learning scenario designer. Create a short role description in English.',
    `Create a role-play scenario for English practice based on this topic: "${topic}"
    
    Return ONLY a single sentence describing the AI role, like:
    "You are a [role]. I am [my role]. [Brief context]."
    
    Keep it under 2 sentences. No extra text.`
  );

  if(!role || role === '__RATE_LIMIT__'){
    preview.innerHTML = '<span style="color:var(--red)">Üretilemedi, tekrar dene</span>';
    return;
  }

  preview.innerHTML = `<span style="color:var(--green)">✅ ${role}</span><br><button onclick="startCustomScenario(this.dataset.role)" data-role="${role.replace(/"/g,'&quot;')}" style="margin-top:8px;padding:6px 14px;background:var(--purple);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">▶ Bu senaryoyu başlat</button>`;
}

function startCustomScenario(role){
  startScenarioWithRole('custom', role);
}

async function startScenario(scenarioId){
  const s = ALL_SCENARIOS.find(x=>x.id===scenarioId);
  const role = s ? s.role : scenarioId;
  const name = s ? s.icon + ' ' + s.name : '🎭 Özel Senaryo';
  await startScenarioWithRole(name, role);
}

async function startScenarioWithRole(name, role){
  convScenario = name;
  convHistory = [];
  document.getElementById("convMessages").innerHTML = "";

  const levelInstructions={
    beginner:"Use simple words and short sentences. Speak slowly and clearly.",
    intermediate:"Use everyday vocabulary. Speak naturally at normal pace.",
    advanced:"Use advanced vocabulary and complex sentences. Speak like a native speaker."
  };

  // ✅ GÖREV #2: Partner karakterini system message olarak ekle
  convHistory.push({
    role: "system",
    content: `${role} Play your role naturally and stay in character. ${levelInstructions[convLevel]} Speak ONLY in English. Keep responses to 1-3 sentences max. Be conversational.`
  });

  addConvMsg("🎬 <b>" + name + "</b> senaryosu başladı! Tüm konuşma İngilizce olacak.", "system");

  const firstMsg = await callGroqAPI(
    `${role} Play your role naturally and stay in character. ${levelInstructions[convLevel]} Speak ONLY in English. Keep responses to 1-3 sentences max. Be conversational.`,
    "Start the conversation with a natural opening line."
  );

  if(firstMsg && firstMsg !== '__RATE_LIMIT__'){
    addConvMsg(firstMsg, "ai");
    convHistory.push({role:"assistant", content:firstMsg});
    speakPartner(firstMsg);
  }
}

function addConvMsg(text,role){
  const wrapper=document.createElement("div");
  wrapper.style.cssText="position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:14px";
  
  const div=document.createElement("div");
  div.className="conv-msg "+role;
  
  // AI mesajlarında İngilizce kelimeleri vurgula
  let processedText=text;
  if(role==="ai"){
    processedText=highlightEnglishWords(text);
  }
  
  div.innerHTML=processedText.replace(/\n/g,"<br>");
  wrapper.appendChild(div);
  
  // Kelime tıklama ekle
  if (role === "ai" && enableWordClick) {
    div.addEventListener('click', handleWordDoubleClick);
    div.addEventListener('touchend', handleMobileTouchEnd);
  }
  
  // AI mesajlarına seslendir/sus toggle butonu ekle (mesajın ALTINDA)
  if(role==="ai" && !text.startsWith("❌")){
    // Buton container
    const btnContainer=document.createElement("div");
    btnContainer.style.cssText="display:flex;gap:8px;align-items:center";
    
    // Seslendir butonu
    const speakBtn=document.createElement("button");
    speakBtn.innerHTML="🔊";
    speakBtn.style.cssText="width:36px;height:36px;border:none;border-radius:50%;background:var(--blue);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0.8;transition:all 0.2s";
    speakBtn.onmouseover=()=>speakBtn.style.opacity="1";
    speakBtn.onmouseout=()=>speakBtn.style.opacity="0.8";
    
    let isSpeaking=false;
    let speechTimeout=null;
    
    speakBtn.onclick=()=>{
      if(isSpeaking){
        stopSpeech();
        speakBtn.innerHTML="🔊";
        speakBtn.style.background="var(--blue)";
        isSpeaking=false;
        if(speechTimeout) clearTimeout(speechTimeout);
      }else{
        // Sadece İngilizce kısmı seslendir (Türkçe düzeltme hariç)
        const englishPart=text.split('[✓')[0].trim();
        if(englishPart){
          speak(englishPart,"en-US");
          speakBtn.innerHTML="🔇";
          speakBtn.style.background="var(--red)";
          isSpeaking=true;
          // 10 saniye sonra otomatik reset (uzun metinler için)
          speechTimeout=setTimeout(()=>{
            speakBtn.innerHTML="🔊";
            speakBtn.style.background="var(--blue)";
            isSpeaking=false;
          },10000);
        }
      }
    };
    
    // Çeviri butonu
    const translateBtn=document.createElement("button");
    translateBtn.innerHTML="🌐";
    translateBtn.style.cssText="width:36px;height:36px;border:none;border-radius:50%;background:var(--green);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0.8;transition:all 0.2s";
    translateBtn.onmouseover=()=>translateBtn.style.opacity="1";
    translateBtn.onmouseout=()=>translateBtn.style.opacity="0.8";
    translateBtn.title="Türkçe Çevir";
    
    translateBtn.onclick=async ()=>{
      const englishPart=text.split('[✓')[0].trim();
      if(!englishPart) return;
      
      // Çeviri zaten varsa tekrar yapma
      if(div.querySelector('.translation-box')) return;
      
      translateBtn.innerHTML="⏳";
      translateBtn.disabled=true;
      
      const translation=await callGroqAPI(
        "Sen bir çevirmensin. İngilizce metni Türkçeye çevir. Sadece çeviriyi yaz, başka bir şey ekleme.",
        englishPart
      );
      
      // Çeviriyi mesajın altına ekle
      const transBox=document.createElement("div");
      transBox.className="translation-box";
      transBox.style.cssText="margin-top:8px;padding:10px 35px 10px 10px;background:rgba(34,197,94,0.1);border-left:3px solid var(--green);border-radius:6px;font-size:14px;line-height:1.6;position:relative";
      transBox.innerHTML=`<strong style="color:var(--green)">🇹🇷 Türkçe:</strong><br>${translation}`;
      
      // Kapat butonu
      const closeBtn=document.createElement("button");
      closeBtn.innerHTML="❌";
      closeBtn.style.cssText="position:absolute;top:8px;right:8px;background:none;border:none;font-size:16px;cursor:pointer;opacity:0.6;transition:opacity 0.2s;padding:4px";
      closeBtn.onmouseover=()=>closeBtn.style.opacity="1";
      closeBtn.onmouseout=()=>closeBtn.style.opacity="0.6";
      closeBtn.onclick=()=>transBox.remove();
      closeBtn.title="Kapat";
      
      transBox.appendChild(closeBtn);
      div.appendChild(transBox);
      
      translateBtn.innerHTML="🌐";
      translateBtn.disabled=false;
    };
    
    btnContainer.appendChild(speakBtn);
    btnContainer.appendChild(translateBtn);
    wrapper.appendChild(btnContainer);
  }
  
  document.getElementById("convMessages").appendChild(wrapper);
  wrapper.scrollIntoView({behavior:"smooth"});
}

async function convSend(){
  const input=document.getElementById("convInput");
  const msg=input.value.trim();
  if(!msg||!convScenario) return;
  if(/[ğĞüÜşŞıİöÖçÇ]/.test(msg)){showToast("⚠️ İngilizce","Sadece İngilizce yazın");return;}
  input.value="";
  
  addConvMsg(msg,"user");
  convHistory.push({role:"user",content:msg});
  
  // Seviyeye göre talimat
  const levelInstructions={
    beginner:"Use simple words and short sentences. Correct every grammar mistake in Turkish.",
    intermediate:"Use everyday vocabulary. Only correct major grammar mistakes in Turkish.",
    advanced:"Use advanced vocabulary. Only correct serious mistakes in Turkish."
  };
  
  const systemPrompt=`You are playing a role in an English conversation practice. 
1. Continue the conversation in your role (in ENGLISH, 1-2 sentences). ${levelInstructions[convLevel]}
2. IMPORTANT: Ignore capitalization (uppercase/lowercase) and punctuation differences (.,!?). These are NOT errors.
3. Only correct REAL grammar mistakes (wrong verb tense, word order, missing words, wrong prepositions) in Turkish at the end like this:
   [✓ Düzeltme: "doğru cümle" - kısa açıklama]
   
Keep the conversation flowing naturally in English. Only add Turkish correction if there's a REAL grammar error.`;

  // Conversation history'yi API formatına çevir
  const messages = [
    { role: "system", content: systemPrompt },
    ...convHistory
  ];
  
  try {
    // Dinamik AI çağrısı
    const selectedModel = document.getElementById('conversationAIModel')?.value || 'groq';
    console.log('🎙️ Conversation AI Model:', selectedModel);
    
    const aiResponse = await callAI(
      systemPrompt,
      msg,
      'conversation' // conversation özelliği için conversation ayarlarını kullan
    );
    
    const aiMsg = String(aiResponse.content || aiResponse);
    addConvMsg(aiMsg,"ai");
    convHistory.push({role:"assistant",content:aiMsg});
    
    // AI cevabını sesli oku (sadece İngilizce kısmı)
    const englishPart=aiMsg.split('[✓')[0].trim();
    if(englishPart && !aiMsg.startsWith('❌')){
      speak(englishPart,"en-US");
    }
  } catch(error) {
    const errorMsg = `❌ Hata: ${error.message}`;
    addConvMsg(errorMsg, "ai");
  }
}

function convKeyDown(e){
  if(e.key==="Enter"&&!e.shiftKey){
    e.preventDefault();
    convSend();
  }
}

function convSpeak(){
  const recog=getRecognition();
  if(!recog){alert("Tarayıcı ses tanımayı desteklemiyor");return;}
  
  // İlk kullanımda bilgilendirme
  if(!localStorage.getItem('micPermissionShown')){
    localStorage.setItem('micPermissionShown','true');
    // Bilgilendirme göster ama izin istemeyi engelleme
  }
  
  try{recog.abort();}catch(e){}
  recog.onresult=(e)=>{
    const text=e.results[0][0].transcript;
    document.getElementById("convInput").value=text;
  };
  recog.onerror=(e)=>{
    if(e.error==='not-allowed'){
      alert('⚠️ Mikrofon izni reddedildi. Tarayıcı ayarlarından izin verin.');
    }
  };
  recog.start();
}

// ══════════════════════════════════════════════════════════
// AI SENTENCE CORRECTOR
// ══════════════════════════════════════════════════════════
let correctorAudioBlob = null;
let correctorAudioURL = null;
let correctorMediaRecorder = null;
let correctorRecognition = null;

function openSentenceCorrector(){
  showScreen("sc-corrector");
  document.getElementById("sentInput").value="";
  document.getElementById("correctionResult").innerHTML="";
  document.getElementById("correctorPlayBtn").style.display = "none";
  correctorAudioBlob = null;
  if (correctorAudioURL) {
    URL.revokeObjectURL(correctorAudioURL);
    correctorAudioURL = null;
  }
}

function startCorrectorRecording() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { 
    showToast('❌ Hata', 'Ses tanıma desteklenmiyor. Chrome kullanın.'); 
    return; 
  }

  const btn = document.getElementById('correctorRecBtn');
  btn.textContent = '🔴 Dinleniyor...';
  btn.style.background = '#7c2d12';

  // Ses kaydı başlat
  correctorAudioBlob = null;
  if (correctorAudioURL) { 
    URL.revokeObjectURL(correctorAudioURL); 
    correctorAudioURL = null; 
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    correctorMediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    correctorMediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    correctorMediaRecorder.onstop = () => {
      try{ correctorMediaRecorder.stream && correctorMediaRecorder.stream.getTracks().forEach(t=>t.stop()); }catch(e){}
      stream.getTracks().forEach(t => t.stop());
      correctorAudioBlob = new Blob(chunks, { type: mime });
      correctorAudioURL = URL.createObjectURL(correctorAudioBlob);
      document.getElementById('correctorPlayBtn').style.display = 'block';
      console.log('✅ Corrector ses kaydı:', correctorAudioBlob.size, 'bytes');
    };
    correctorMediaRecorder.start();

    // SpeechRecognition başlat
    correctorRecognition = new SR();
    correctorRecognition.lang = 'en-US';
    correctorRecognition.continuous = false;
    correctorRecognition.interimResults = false;

    correctorRecognition.onresult = e => {
      const text = e.results[0][0].transcript;
      document.getElementById('sentInput').value = text;
      console.log('🎤 Algılanan:', text);
    };

    correctorRecognition.onend = () => {
      if (correctorMediaRecorder && correctorMediaRecorder.state !== 'inactive') {
        correctorMediaRecorder.stop();
      }
      btn.textContent = '🎤 Sesle Gir';
      btn.style.background = 'var(--red)';
    };

    correctorRecognition.onerror = err => {
      console.error('❌ SpeechRecognition hatası:', err);
      if (correctorMediaRecorder && correctorMediaRecorder.state !== 'inactive') {
        correctorMediaRecorder.stop();
      }
      btn.textContent = '🎤 Sesle Gir';
      btn.style.background = 'var(--red)';
    };

    correctorRecognition.start();
  }).catch(err => {
    console.error('❌ Mikrofon hatası:', err);
    showToast('❌ Mikrofon Hatası', 'Mikrofon izni reddedildi');
    btn.textContent = '🎤 Sesle Gir';
    btn.style.background = 'var(--red)';
  });
}

function playCorrectorRecording() {
  if (!correctorAudioURL) { 
    showToast('⚠️', 'Kayıt yok'); 
    return; 
  }
  const audio = new Audio(correctorAudioURL);
  audio.play();
}

async function correctSentence(){
  const sentence=document.getElementById("sentInput").value.trim();
  if(!sentence) return;
  
  document.getElementById("correctionResult").innerHTML=`
    <div style="text-align:center;padding:20px;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:8px">🤖</div>
      <p>Cümlen kontrol ediliyor...</p>
    </div>`;
  
  // Custom prompt kullan
  const promptTemplate = getPrompt('corrector');
  const systemPrompt = promptTemplate.system || "Sen bir İngilizce öğretmenisin. Cümleleri düzeltir ve öğretirsin.";
  const userPrompt = fillPromptTemplate(promptTemplate.user || `Cümle: "{{sentence}}"

IMPORTANT: Ignore capitalization (uppercase/lowercase) and punctuation differences (.,!?). These are NOT errors.
Only correct REAL grammar mistakes (wrong verb tense, word order, missing words, wrong prepositions).

Analyze this sentence:
1. If there's a REAL grammar error, correct it
2. Explain the error (in Turkish)
3. Show the correct sentence
4. Give 2 similar examples

Format:
❌ Yanlış: ... (only if there's a REAL error)
✅ Doğru: ...
📚 Açıklama: ...
💡 Örnekler: ...

If no REAL grammar errors, say: "✅ Cümle doğru!"`, { sentence });
  
  const response=await callGroqAPI(systemPrompt, userPrompt);
  
  document.getElementById("correctionResult").innerHTML=`
    <div class="correction-box" id="correctionBoxContainer">
      <div class="correction-label">📝 Senin Cümlen</div>
      <div class="correction-text wrong">${sentence}</div>
      <div class="correction-explain" style="white-space:pre-line">${highlightEnglishWords(response)}</div>
    </div>
    <button class="btn btn-blue" onclick="document.getElementById('sentInput').value='';document.getElementById('correctionResult').innerHTML=''">🔄 Yeni Cümle</button>`;
  
  // Kelime tıklama ekle
  if (enableWordClick) {
    const correctionBox = document.getElementById('correctionBoxContainer');
    if (correctionBox) {
      correctionBox.addEventListener('click', handleWordDoubleClick);
      correctionBox.addEventListener('touchend', handleMobileTouchEnd);
    }
  }
}

// ══════════════════════════════════════════════════════════
// FLASHCARD MODE
// ══════════════════════════════════════════════════════════
let selectedPartner = 'sarah';
let partnerHistory = [];
let partnerTopic = '';
let partnerListening = false;
let partnerRecognition = null;

const PARTNERS = {
  sarah: {
    emoji: '👩‍🦰',
    name: 'Sarah',
    gender: 'female',
    style: 'You are Sarah, a friendly and patient English conversation partner. You speak clearly, use simple vocabulary, and gently correct mistakes. You are warm and encouraging. Always respond in English but offer Turkish translations when asked.',
    voice: 'en-US'
  },
  alex: {
    emoji: '👨‍💼',
    name: 'Alex',
    gender: 'male',
    style: 'You are Alex, a professional English speaker. You use formal language, business vocabulary. You are polite but direct. Speak naturally as a professional would in a business context.',
    voice: 'en-US'
  },
  mia: {
    emoji: '👩‍🎓',
    name: 'Mia',
    gender: 'female',
    style: 'You are Mia, an English teacher. You correct grammar mistakes explicitly, explain why something is wrong, and provide the correct form. You are educational and thorough but kind.',
    voice: 'en-GB'
  },
  jake: {
    emoji: '🧑‍🎤',
    name: 'Jake',
    gender: 'male',
    style: 'You are Jake, a cool and casual English speaker. You use slang, contractions, everyday expressions. You are fun and relaxed. Keep it conversational and natural.',
    voice: 'en-US'
  }
};

function openPartnerChat() {
  showScreen('sc-partner');
  document.getElementById('partnerSetup').style.display = '';
  document.getElementById('partnerChatArea').style.display = 'none';
}

function selectPartner(id) {
  selectedPartner = id;
  document.querySelectorAll('.partner-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('pc-' + id);
  if(card) card.classList.add('active');
}

async function startPartnerChat(topic) {
  partnerTopic = topic;
  partnerHistory = [];
  
  // Custom partner mı yoksa built-in mi kontrol et
  let p;
  if(selectedPartner.startsWith('custom_')){
    // Custom partner'ı localStorage'dan yükle
    const savedPartners = JSON.parse(localStorage.getItem('customPartners') || '{}');
    const customPartner = savedPartners[selectedPartner];
    if(!customPartner){
      showToast('❌ Partner bulunamadı', '');
      return;
    }
    // Custom partner'ı PARTNERS formatına çevir
    p = {
      emoji: customPartner.emoji,
      name: customPartner.name,
      style: `You are ${customPartner.name}, ${customPartner.description}. You are ${customPartner.personality}. Speak naturally and stay in character. Always respond in English.`,
      voice: 'en-US'
    };
  } else {
    // Built-in partner
    p = PARTNERS[selectedPartner];
  }
  
  if(!p){
    showToast('❌ Partner seçilmedi', '');
    return;
  }
  
  document.getElementById('partnerSetup').style.display = 'none';
  document.getElementById('partnerChatArea').style.display = '';
  document.getElementById('partnerAvatarDisplay').textContent = p.emoji;
  document.getElementById('partnerNameDisplay').textContent = p.name;
  document.getElementById('partnerMessages').innerHTML = '';
  document.getElementById('partnerScoreRow').style.display = 'none';
  
  addPartnerMsg(`🎯 Konu: ${topic} | Partner: ${p.name}`, 'system');
  
  const openingMsg = await callGroqAPI(
    p.style + ` Topic of conversation: "${topic}". Keep your responses short (2-3 sentences max). Be natural and engaging.`,
    `Start a conversation about "${topic}". Greet the user and ask an interesting opening question.`
  );
  addPartnerMsg(openingMsg, 'ai');
  partnerHistory.push({ role: 'assistant', content: openingMsg });
  speakPartner(openingMsg.replace(/<[^>]+>/g, ''));
}

function addPartnerMsg(text, role) {
  const div = document.createElement('div');
  div.className = 'partner-msg ' + role;
  div.innerHTML = (role === 'ai' ? formatAIResponse(highlightEnglishWords(text)) : text).replace(/\n/g, '<br>');
  document.getElementById('partnerMessages').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
}

async function sendPartnerMsg() {
  const input = document.getElementById('partnerInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  
  addPartnerMsg(msg, 'user');
  partnerHistory.push({ role: 'user', content: msg });
  
  const p = PARTNERS[selectedPartner];
  const messages = [
    { role: 'system', content: p.style + ` Topic: "${partnerTopic}". Keep responses SHORT (2-3 sentences). Be natural. If user makes grammar errors, continue the conversation naturally and note the correction at the end with "[💡 Düzeltme: ...]".` },
    ...partnerHistory.slice(-8)
  ];
  
  const typingEl = document.createElement('div');
  typingEl.className = 'partner-msg ai';
  typingEl.innerHTML = `<em style="color:var(--muted)">${p.emoji} yazıyor...</em>`;
  document.getElementById('partnerMessages').appendChild(typingEl);
  typingEl.scrollIntoView({ behavior: 'smooth' });
  
  const response = await callGroqAPIWithHistory(messages);
  typingEl.innerHTML = highlightEnglishWords(response).replace(/\n/g, '<br>');
  
  // Kelime tıklama ekle
  if (enableWordClick) {
    typingEl.addEventListener('click', handleWordDoubleClick);
    typingEl.addEventListener('touchend', handleMobileTouchEnd);
  }
  
  partnerHistory.push({ role: 'assistant', content: response });
  if (partnerHistory.length > 16) partnerHistory.splice(1, 2);
  
  // Konuşma istatistiği
  showPartnerScore(msg);
  speakPartner(response.replace(/\[💡[^\]]+\]/g, '').replace(/<[^>]+>/g, ''));
}

function showPartnerScore(userMsg) {
  const wordCount = userMsg.split(/\s+/).length;
  const hasQuestion = userMsg.includes('?');
  const scoreRow = document.getElementById('partnerScoreRow');
  scoreRow.style.display = 'flex';
  
  const chips = [
    { label: `${wordCount} kelime`, cls: wordCount >= 5 ? 'good' : 'warn' },
    { label: hasQuestion ? '❓ Soru sordu' : '📝 İfade', cls: 'good' },
    { label: `Sıra: ${Math.ceil(partnerHistory.length / 2)}`, cls: 'good' }
  ];
  
  scoreRow.innerHTML = chips.map(c => `<span class="pscore-chip ${c.cls}">${c.label}</span>`).join('');
}

function partnerKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPartnerMsg(); }
}

async function partnerAskCorrection() {
  if (partnerHistory.length < 2) return;
  const lastUser = [...partnerHistory].reverse().find(m => m.role === 'user');
  if (!lastUser) return;
  const correction = await callGroqAPI(
    'You are a grammar teacher. Analyze the sentence briefly in Turkish.',
    `Check this English sentence for grammar errors: "${lastUser.content}". List errors and corrections in Turkish. If correct, say "✅ Cümle doğru!"`
  );
  addPartnerMsg('📝 ' + correction, 'system');
}

async function partnerGetHint() {
  const hint = await callGroqAPI(
    `You are ${PARTNERS[selectedPartner].name}. Topic: ${partnerTopic}`,
    `Give me a natural question or response I could say in English right now in this conversation. Just give one short suggestion with Turkish translation.`
  );
  addPartnerMsg('💡 ' + hint, 'system');
}

async function partnerTranslate() {
  const lastAI = [...partnerHistory].reverse().find(m => m.role === 'assistant');
  if (!lastAI) return;
  const tr = await callGroqAPI(
    'You are a translator. Translate to Turkish concisely.',
    `Translate to Turkish: "${lastAI.content}"`
  );
  addPartnerMsg('🌐 ' + tr, 'system');
}

function partnerVoiceInput() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Tarayıcı ses tanımayı desteklemiyor'); return; }
  
  const btn = document.getElementById('partnerMicBtn');
  if (partnerListening) {
    try { partnerRecognition.stop(); } catch(e) {}
    partnerListening = false;
    btn.className = 'mic-btn idle';
    btn.textContent = '🎤';
    return;
  }
  
  partnerRecognition = new SR();
  partnerRecognition.lang = 'en-US';
  partnerRecognition.continuous = false;
  partnerListening = true;
  btn.className = 'mic-btn rec';
  btn.textContent = '⏹';
  
  partnerRecognition.onresult = e => {
    const text = e.results[0][0].transcript;
    document.getElementById('partnerInput').value = text;
    partnerListening = false;
    btn.className = 'mic-btn idle';
    btn.textContent = '🎤';
    sendPartnerMsg();
  };
  partnerRecognition.onerror = () => {
    partnerListening = false;
    btn.className = 'mic-btn idle';
    btn.textContent = '🎤';
  };
  partnerRecognition.onend = () => { partnerListening = false; };
  partnerRecognition.start();
}

function clearPartnerChat() {
  partnerHistory = [];
  document.getElementById('partnerMessages').innerHTML = '';
  document.getElementById('partnerScoreRow').style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// 16. SHADOWING MODU
// ══════════════════════════════════════════════════════════
let shadowPhrases = [];
let shadowIdx = 0;
let shadowDone = 0;
let shadowSpeed = 1.0;
let shadowRecognition = null;

function openShadowMode() {
  showScreen('sc-shadow');
  loadShadowPhrases();
}

function loadShadowPhrases() {
  // Kelimelerin cümlelerini al - TÜM KELİMELER
  const available = words.filter(w => w.sentence && w.sentence.trim());
  if (available.length === 0) {
    document.getElementById('shadowPhraseList').innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:8px">😅</div>
        <p>Cümlesi olan kelime bulunamadı. Excel'de sentence sütunu olduğundan emin ol.</p>
      </div>`;
    return;
  }
  
  // TÜM cümleli kelimeleri al (slice kaldırıldı)
  shadowPhrases = available.map(w => ({
    en: w.sentence,
    tr: w.sentenceTr || '',
    word: w.word,
    done: false,
    score: null
  }));
  
  renderShadowList();
}

function renderShadowList() {
  const list = document.getElementById('shadowPhraseList');
  list.innerHTML = shadowPhrases.map((p, i) => `
    <div class="phrase-item ${p.done ? 'done' : ''} ${i === shadowIdx ? 'active' : ''}" onclick="selectShadowPhrase(${i})">
      <div class="pi-en">${p.en}</div>
      ${p.tr ? `<div class="pi-tr">🇹🇷 ${p.tr}</div>` : ''}
      ${p.done ? `<div class="pi-score" style="color:${p.score >= 70 ? 'var(--green)' : 'var(--orange)'}">✓ %${p.score}</div>` : ''}
    </div>
  `).join('');
}

function shuffleShadowPhrases(){
  for(let i=shadowPhrases.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [shadowPhrases[i],shadowPhrases[j]]=[shadowPhrases[j],shadowPhrases[i]];
  }
  shadowIdx=0;
  renderShadowList();
  showToast('🔀 Karıştırıldı',shadowPhrases.length+' cümle');
}

function selectShadowPhrase(i) {
  shadowIdx = i;
  const phrase = shadowPhrases[i];
  
  // Yeni cümleye geçince önceki kaydı sıfırla
  shadowAudioBlob = null;
  if (shadowAudioURL) {
    URL.revokeObjectURL(shadowAudioURL);
    shadowAudioURL = null;
  }
  
  document.getElementById('shadowPhraseSection').style.display = 'none';
  document.getElementById('shadowPlayer').style.display = '';
  
  // Cümleyi kelimelere böl ve tıklanabilir yap
  const words = phrase.en.split(/\s+/);
  const clickableText = words.map(word => {
    const cleanWord = word.replace(/[^\w']/g, '');
    return `<span onclick="showWordModal('${cleanWord.replace(/'/g,"\\'")}')" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted">${word}</span>`;
  }).join(' ');
  
  document.getElementById('shadowTargetText').innerHTML = clickableText;
  document.getElementById('shadowTrText').textContent = phrase.tr || '—';
  document.getElementById('shadowResult').style.display = 'none';
  document.getElementById('shadowDoneCount').textContent = shadowDone;
}

function updateShadowSpeed(val) {
  shadowSpeed = parseFloat(val);
  document.getElementById('shadowSpeedVal').textContent = shadowSpeed.toFixed(1) + 'x';
}

function playShadowAudio() {
  const phrase = shadowPhrases[shadowIdx];
  if (!phrase) return;
  
  stopSpeech();
  
  // TTS'nin cancel'den sonra hazır olması için delay
  setTimeout(() => {
    // Eğer kullanıcı kaydı varsa (renklendirme yapılmışsa), HTML'i değiştirme
    const targetEl = document.getElementById('shadowTargetText');
    const hasUserRecording = shadowAudioBlob !== null;
    
    if (!hasUserRecording) {
      // Kullanıcı henüz kayıt yapmadıysa, normal highlight animation
      const words_arr = phrase.en.split(' ');
      targetEl.innerHTML = words_arr.map((w, i) => `<span class="word-highlight" id="sw${i}">${w}</span>`).join(' ');
    }
    // Eğer kayıt varsa, mevcut renklendirmeyi koru
    
    let utt = new SpeechSynthesisUtterance(phrase.en);
    utt.lang = 'en-US';
    utt.rate = shadowSpeed;
    
    let wordIdx = 0;
    utt.onboundary = e => {
      if (e.name === 'word' && !hasUserRecording) {
        // Sadece kayıt yoksa animasyon yap
        document.querySelectorAll('.word-highlight').forEach(el => el.classList.remove('active'));
        const el = document.getElementById('sw' + wordIdx);
        if (el) el.classList.add('active');
        wordIdx++;
      }
    };
    utt.onend = () => {
      if (!hasUserRecording) {
        document.querySelectorAll('.word-highlight').forEach(el => el.classList.remove('active'));
      }
      const playBtn = document.getElementById('shadowPlayBtn');
      if (playBtn) playBtn.textContent = '▶ Konuş';
    };
    
    const playBtn = document.getElementById('shadowPlayBtn');
    if (playBtn) playBtn.textContent = '🔊 Oynatılıyor...';
    
    const progress = document.getElementById('shadowProgressFill');
    if (progress) {
      let prog = 0;
      const progInterval = setInterval(() => {
        prog = Math.min(100, prog + (100 / (phrase.en.split(' ').length * 0.8)));
        progress.style.width = prog + '%';
        if (prog >= 100) clearInterval(progInterval);
      }, (phrase.en.split(' ').length * 500) / 100 / shadowSpeed);
    }
    
    speechSynthesis.speak(utt);
  }, TTS_CANCEL_DELAY_MS); // 100ms delay
}

let shadowAudioBlob = null;
let shadowMediaRecorder = null;
let shadowAudioURL = null;

function startShadowing() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const phrase = shadowPhrases[shadowIdx];
  if (!phrase) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Ses tanıma desteklenmiyor. Chrome kullan.'); return; }

  const btn = document.getElementById('shadowRecBtn');
  btn.textContent = '🔴 Dinleniyor...';
  btn.style.background = '#7c2d12';

  // Ses kaydı başlat
  shadowAudioBlob = null;
  if (shadowAudioURL) { URL.revokeObjectURL(shadowAudioURL); shadowAudioURL = null; }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    shadowMediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    shadowMediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    shadowMediaRecorder.onstop = () => {
      try{ shadowMediaRecorder.stream && shadowMediaRecorder.stream.getTracks().forEach(t=>t.stop()); }catch(e){}
      stream.getTracks().forEach(t => t.stop());
      shadowAudioBlob = new Blob(chunks, { type: mime });
      shadowAudioURL = URL.createObjectURL(shadowAudioBlob);
      console.log('✅ Ses kaydı tamamlandı:', shadowAudioBlob.size, 'bytes');
    };
    shadowMediaRecorder.start();
    console.log('🎙️ Ses kaydı başladı');
    
    // MediaRecorder başladıktan sonra SpeechRecognition'ı başlat
    shadowRecognition = new SR();
    shadowRecognition.lang = 'en-US';
    shadowRecognition.continuous = false;
    shadowRecognition.interimResults = false;

    let collectedText = '';

    shadowRecognition.onresult = e => {
      collectedText = e.results[0][0].transcript;
      console.log('🎤 Algılanan:', collectedText);
    };

    shadowRecognition.onend = () => {
      if (shadowMediaRecorder && shadowMediaRecorder.state !== 'inactive') shadowMediaRecorder.stop();
      btn.textContent = '🎤 Tekrar Et';
      btn.style.background = '#4c1d95';
      if (collectedText) gradeShadowing(phrase.en, collectedText, shadowIdx);
      else {
        document.getElementById('shadowResult').style.display = '';
        document.getElementById('shadowResult').innerHTML = '<div style="text-align:center;padding:12px;color:var(--muted)">Ses algılanamadı — tekrar dene</div>';
      }
    };

    shadowRecognition.onerror = err => {
      console.error('❌ SpeechRecognition hatası:', err);
      if (shadowMediaRecorder && shadowMediaRecorder.state !== 'inactive') shadowMediaRecorder.stop();
      btn.textContent = '🎤 Tekrar Et';
      btn.style.background = '#4c1d95';
    };

    shadowRecognition.start();
    console.log('🎤 Ses tanıma başladı');
  }).catch(err => {
    console.error('❌ Mikrofon hatası:', err);
    showToast('❌ Mikrofon Hatası', 'Mikrofon izni reddedildi veya mevcut değil');
    btn.textContent = '🎤 Tekrar Et';
    btn.style.background = '#4c1d95';
    return;
  });
}

function playShadowRec() {
  if (!shadowAudioURL) { showToast('⚠️', 'Kayıt yok'); return; }
  const audio = new Audio(shadowAudioURL);
  audio.play();
}

function gradeShadowing(target, heard, idx) {
  const norm = s => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const tNorm = norm(target);
  const hNorm = norm(heard);
  const tWords = tNorm.split(/\s+/);
  const hWords = hNorm.split(/\s+/);

  let matches = 0;
  tWords.forEach(tw => {
    if (hWords.some(hw => hw === tw || levDist(hw, tw) <= 1)) matches++;
  });

  const score = Math.round((matches / tWords.length) * 100);
  shadowPhrases[idx].done = true;
  shadowPhrases[idx].score = score;
  shadowDone = shadowPhrases.filter(p => p.done).length;
  document.getElementById('shadowDoneCount').textContent = shadowDone;

  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--orange)' : 'var(--red)';
  const emoji = score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪';

  // Hedef cümle kutucuklarını renklendir
  const targetEl = document.getElementById('shadowTargetText');
  if (targetEl) {
    targetEl.innerHTML = tWords.map((tw, i) => {
      const match = hWords.find(hw => hw === tw || levDist(hw, tw) <= 1);
      const close = !match && hWords.find(hw => levDist(hw, tw) <= 2);
      if (match) {
        return `<span class="word-highlight" style="background:#16a34a;color:#fff">${tw}</span>`;
      } else if (close) {
        return `<span class="word-highlight" style="background:#ea580c;color:#fff" title="Söylenen: ${close}">${tw}</span>`;
      } else {
        return `<span class="word-highlight" style="background:#dc2626;color:#fff">${tw}</span>`;
      }
    }).join(' ');
  }

  document.getElementById('shadowResult').style.display = '';
  document.getElementById('shadowResult').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg2);border-radius:14px">
      <div style="font-size:32px">${emoji}</div>
      <div>
        <div style="font-size:28px;font-weight:900;color:${color}">%${score}</div>
        <div style="font-size:12px;color:var(--muted)">Sen söyledin: "${heard}"</div>
      </div>
    </div>`;

  renderShadowList();
}

function nextShadowPhrase() {
  shadowIdx = (shadowIdx + 1) % shadowPhrases.length;
  selectShadowPhrase(shadowIdx);
}

function prevShadowPhrase() {
  shadowIdx = (shadowIdx - 1 + shadowPhrases.length) % shadowPhrases.length;
  selectShadowPhrase(shadowIdx);
}

// ══════════════════════════════════════════════════════════
// 25. AI ÖĞRETMEN KİŞİSELLEŞTİRME
// ══════════════════════════════════════════════════════════
let selectedPersona = 'strict';
let selectedGoal = 'exam';
let teacherHistory = [];

const PERSONAS = {
  strict: { emoji:'👩‍🏫', prompt:'You are a strict English teacher. Correct every grammar mistake immediately and explicitly. Be thorough but not unkind.', gender:'female', voice:'Google UK English Female' },
  friendly: { emoji:'🤗', prompt:'You are a warm and friendly English teacher. Focus on encouragement. Correct mistakes gently at the end of your response.', gender:'female', voice:'Google UK English Female' },
  socratic: { emoji:'🧐', prompt:'You are a Socratic English teacher. Instead of giving questions to guide the student to discover the answer themselves.', gender:'male', voice:'Google UK English Male' },
  coach: { emoji:'⚡', prompt:'You are a motivational English coach. High energy, goal-focused. Push the student to practice more and celebrate every improvement.', gender:'male', voice:'Google US English' }
};

const GOALS = {
  exam: 'IELTS/TOEFL/YDS exam preparation',
  travel: 'Travel and daily conversation English',
  business: 'Business English for meetings and emails',
  fluency: 'Natural fluency and idioms'
};

function openTeacherScreen() {
  showScreen('sc-teacher');
  if (teacherHistory.length === 0) initTeacherChat();
  renderLearnPlan();
}

function selectPersona(id) {
  selectedPersona = id;
  document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
  document.getElementById('persona-' + id).classList.add('active');
  teacherHistory = [];
  document.getElementById('teacherMessages').innerHTML = '';
  initTeacherChat();
}

function selectGoal(id) {
  selectedGoal = id;
  document.querySelectorAll('.goal-opt').forEach(c => c.classList.remove('active'));
  document.getElementById('goal-' + id).classList.add('active');
}

function initTeacherChat() {
  const p = PERSONAS[selectedPersona];
  const welcomes = {
    strict: '📚 Merhaba. Bugünkü dersinize başlayalım. Soru sorun, öğrenelim.',
    friendly: '🤗 Merhaba! Seninle çalışmak harika olacak! Bugün ne öğrenmek istiyorsun?',
    socratic: '🧐 Merhaba. Sana bir soru soracağım: İngilizce öğrenmenin en zor tarafı sence ne?',
    coach: '⚡ Hazır mısın?! Bugün güçlü bir seans yapacağız! Hedefin ne olursa olsun, başaracaksın!'
  };
  
  // Wrapper ile hoş geldin mesajı - YENİ YAPI: Dikey
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:6px';
  
  const div = document.createElement('div');
  div.className = 'partner-msg ai';
  div.innerHTML = welcomes[selectedPersona];
  div.dataset.originalText = welcomes[selectedPersona];
  
  wrapper.appendChild(div);
  
  // Ses butonu alta
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
  
  const speakBtn = document.createElement('button');
  speakBtn.innerHTML = '🔊 Sesli Oku';
  speakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  speakBtn.onclick = () => readMessageAloud(div);
  buttonRow.appendChild(speakBtn);
  
  // DURDUR butonu ekle
  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = '🔇 Durdur';
  stopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  stopBtn.onclick = () => stopSpeech();
  buttonRow.appendChild(stopBtn);
  
  wrapper.appendChild(buttonRow);
  document.getElementById('teacherMessages').appendChild(wrapper);
}

async function sendTeacherMsg() {
  const input = document.getElementById('teacherInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  
  // Kullanıcı mesajı wrapper
  const userWrapper = document.createElement('div');
  userWrapper.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;justify-content:flex-end';
  
  const userDiv = document.createElement('div');
  userDiv.className = 'partner-msg user';
  userDiv.textContent = msg;
  userDiv.dataset.originalText = msg; // Ham metni sakla
  
  // Kullanıcı mesajı için ses butonu
  const userSpeakBtn = document.createElement('button');
  userSpeakBtn.innerHTML = '🔊';
  userSpeakBtn.style.cssText = 'width:32px;height:32px;border:none;border-radius:50%;background:var(--blue);color:#fff;font-size:14px;cursor:pointer;flex-shrink:0;margin-top:4px';
  userSpeakBtn.onclick = () => readMessageAloud(userDiv);
  
  userWrapper.appendChild(userDiv);
  userWrapper.appendChild(userSpeakBtn);
  document.getElementById('teacherMessages').appendChild(userWrapper);
  userWrapper.scrollIntoView({ behavior: 'smooth' });
  
  teacherHistory.push({ role: 'user', content: msg });
  
  const p = PERSONAS[selectedPersona];
  const goal = GOALS[selectedGoal];
  const stats = {
    learned: learnedSet.size,
    total: allWords.length,
    currentWord: words[idx] ? words[idx].word : 'none'
  };
  
  const system = `${p.prompt}
Student goal: ${goal}
Student stats: ${stats.learned}/${stats.total} words learned. Currently studying: "${stats.currentWord}".
Respond in Turkish for explanations, use English for examples. Keep responses focused and practical.`;
  
  const messages = [{ role: 'system', content: system }, ...teacherHistory.slice(-6)];
  
  // AI mesajı wrapper - YENİ YAPI: Dikey
  const aiWrapper = document.createElement('div');
  aiWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:6px';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'partner-msg ai';
  typingDiv.innerHTML = `<em style="color:var(--muted)">✍️ yazıyor...</em>`;
  
  aiWrapper.appendChild(typingDiv);
  document.getElementById('teacherMessages').appendChild(aiWrapper);
  aiWrapper.scrollIntoView({ behavior: 'smooth' });
  
  try {
    const response = await callGroqAPIWithHistory(messages);
    
    if (!response) {
      typingDiv.innerHTML = `<span style="color:var(--red)">❌ API hatası. Lütfen API anahtarını kontrol edin.</span>`;
      return;
    }
    
    // HTML ETİKETLERİNİ TEMİZLE (SORUN 2 DÜZELTMESİ)
    let cleanResponse = response
      .replace(/<color[^>]*>/gi, '')
      .replace(/<\/color>/gi, '')
      .replace(/<b>/gi, '<strong>')
      .replace(/<\/b>/gi, '</strong>')
      .replace(/<i>/gi, '<em>')
      .replace(/<\/i>/gi, '</em>')
      .replace(/<u>/gi, '<span style="text-decoration:underline">')
      .replace(/<\/u>/gi, '</span>');
    
    // Format ve render
    const highlighted = highlightEnglishWords(cleanResponse).replace(/\n/g, '<br>');
    const formatted = formatAIResponse(highlighted);
    typingDiv.innerHTML = formatted;
    typingDiv.dataset.originalText = cleanResponse; // Ham metni sakla (HTML olmadan)
    teacherHistory.push({ role: 'assistant', content: cleanResponse });
  } catch (error) {
    console.error('Teacher mesaj hatası:', error);
    typingDiv.innerHTML = `<span style="color:var(--red)">❌ Bağlantı hatası: ${error.message}</span>`;
  }
  
  // Ses butonunu ALTA ekle
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
  
  const aiSpeakBtn = document.createElement('button');
  aiSpeakBtn.innerHTML = '🔊 Sesli Oku';
  aiSpeakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  aiSpeakBtn.onclick = () => readMessageAloud(typingDiv);
  buttonRow.appendChild(aiSpeakBtn);
  
  // SUS BUTONU DÜZELTMESİ (SORUN 1)
  const aiStopBtn = document.createElement('button');
  aiStopBtn.innerHTML = '🔇 Sus';
  aiStopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  aiStopBtn.onclick = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('🔇 Teacher Chat sesi durduruldu');
    }
  };
  buttonRow.appendChild(aiStopBtn);
  
  aiWrapper.appendChild(buttonRow);
  typingDiv.scrollIntoView({ behavior: 'smooth' });
  
  // AI cevabını otomatik sesli oku (ayar açıksa)
  if (enableAutoRead) {
    setTimeout(() => {
      readMessageAloud(typingDiv);
    }, 500);
  }
  
  // Kelime tıklama ekle
  if (enableWordClick) {
    typingDiv.addEventListener('click', handleWordDoubleClick);
    typingDiv.addEventListener('touchend', handleMobileTouchEnd);
  }
}

function teacherKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTeacherMsg(); }
}

// ══════════════════════════════════════════════════════════
// AI ÖĞRETMEN SESLİ KONUŞMA
// ══════════════════════════════════════════════════════════
let teacherRecognition = null;
let isTeacherListening = false;

function toggleTeacherVoice() {
  if (isTeacherListening) {
    stopTeacherVoice();
  } else {
    startTeacherVoice();
  }
}

function startTeacherVoice() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Tarayıcınız ses tanımayı desteklemiyor. Chrome kullanın.');
    return;
  }
  
  teacherRecognition = new SR();
  teacherRecognition.lang = 'en-US';
  teacherRecognition.continuous = false;
  teacherRecognition.interimResults = true;
  
  const micBtn = document.getElementById('teacherMicBtn');
  const statusEl = document.getElementById('teacherVoiceStatus');
  const inputEl = document.getElementById('teacherInput');
  
  micBtn.classList.add('listening');
  micBtn.textContent = '⏹️';
  statusEl.style.display = 'block';
  statusEl.innerHTML = '<em>🎤 Dinleniyor... İngilizce konuş</em>';
  isTeacherListening = true;
  
  teacherRecognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    inputEl.value = transcript;
    statusEl.innerHTML = `<em style="color:var(--text)">Duyulan: "${transcript}"</em>`;
  };
  
  teacherRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    stopTeacherVoice();
    statusEl.innerHTML = `<em style="color:var(--red)">❌ Hata: ${e.error === 'no-speech' ? 'Ses algılanamadı' : e.error}</em>`;
    setTimeout(() => statusEl.style.display = 'none', 3000);
  };
  
  teacherRecognition.onend = () => {
    stopTeacherVoice();
    // Eğer metin varsa otomatik gönder
    if (inputEl.value.trim()) {
      statusEl.innerHTML = '<em style="color:var(--green)">✅ Soru gönderiliyor...</em>';
      setTimeout(() => {
        sendTeacherMsg();
        statusEl.style.display = 'none';
      }, 500);
    } else {
      statusEl.style.display = 'none';
    }
  };
  
  teacherRecognition.start();
}

function stopTeacherVoice() {
  if (teacherRecognition) {
    try {
      teacherRecognition.stop();
    } catch (e) {}
  }
  
  const micBtn = document.getElementById('teacherMicBtn');
  micBtn.classList.remove('listening');
  micBtn.textContent = '🎤';
  isTeacherListening = false;

  try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
}


function readMessageAloud(msgDiv) {
  stopSpeech();
  
  // Regex'leri önce compile et (performance)
  const QUOTE_REGEX = /["'"]/g;
  const PUNCTUATION_REGEX = /^[.,;:!?()[\]{}\-—–+*=#@&%]+$/;
  
  // Speech synthesis cancel işlemi tamamlansın diye kısa delay
  setTimeout(() => {
    // innerHTML'i kullan - ekranda görünen hali
    const htmlContent = msgDiv.innerHTML;
    if (!htmlContent || !htmlContent.trim()) return;
    
    if (window.DEBUG_MODE) console.log('🔍 HTML İçeriği:', htmlContent);
    
    const utterances = [];
  
  // HTML'i parse et - span'leri tespit et
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  if (window.DEBUG_MODE) console.log('📝 textContent:', tempDiv.textContent);
  
  // childNodes ile tüm node'ları gez (text + element)
  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Düz metin → Türkçe
      let text = node.textContent.trim();
      if (text) {
        // Noktalama işaretlerini temizle (sadece noktalama ise atla)
        const cleanText = text.replace(QUOTE_REGEX, '').trim();
        
        // Sadece noktalama işareti veya özel karakter mi?
        if (PUNCTUATION_REGEX.test(cleanText)) {
          // Sadece noktalama/özel karakter → Atla
          return;
        }
        
        if (cleanText) {
          if (window.DEBUG_MODE) console.log('🇹🇷 Türkçe:', cleanText);
          utterances.push({ text: cleanText, lang: 'tr-TR' });
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList && node.classList.contains('en-word')) {
        // class="en-word" olanlar → İngilizce
        const text = node.textContent.trim();
        if (text) {
          if (window.DEBUG_MODE) console.log('🇬🇧 İngilizce (en-word):', text);
          utterances.push({ text, lang: 'en-US' });
        }
      } else if (node.tagName === 'BR') {
        // BR tagı - boşluk ekle
        if (utterances.length > 0) {
          utterances[utterances.length - 1].text += ' ';
        }
      } else {
        // Diğer taglar (span, code, em, strong vb) - içeriğini işle
        node.childNodes.forEach(processNode);
      }
    }
  };
  
  tempDiv.childNodes.forEach(processNode);
  
  if (utterances.length === 0) {
    // Hiç parça yok, tümü Türkçe
    const plainText = tempDiv.textContent.trim();
    if (plainText) {
      console.log('🇹🇷 Tümü Türkçe:', plainText);
      utterances.push({ text: plainText, lang: 'tr-TR' });
    }
  }
  
  // AYNI DİLDE YAN YANA GELEN PARÇALARI BİRLEŞTİR
  const mergedUtterances = [];
  for (let i = 0; i < utterances.length; i++) {
    const current = utterances[i];
    
    // Son eklenen ile aynı dilde mi?
    if (mergedUtterances.length > 0 && mergedUtterances[mergedUtterances.length - 1].lang === current.lang) {
      // Birleştir
      mergedUtterances[mergedUtterances.length - 1].text += ' ' + current.text;
    } else {
      // Yeni parça ekle
      mergedUtterances.push({ text: current.text, lang: current.lang });
    }
  }
  
  if (window.DEBUG_MODE) console.log('🎯 Birleştirilmiş Parçalar:', mergedUtterances);
  
  if (mergedUtterances.length === 0) return;
  
  // TTS kuyruğu
  const voices = speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr')) || null;
  
  // Persona'ya göre İngilizce ses seç
  const persona = PERSONAS[selectedPersona];
  let enVoice = null;
  
  if (persona && persona.voice) {
    // Persona'nın ses tercihini bul
    enVoice = voices.find(v => v.name === persona.voice) || 
              voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(persona.gender)) ||
              voices.find(v => v.lang.startsWith('en'));
  } else {
    // Default: herhangi bir İngilizce ses
    enVoice = voices.find(v => v.lang.startsWith('en')) || null;
  }
  
  let i = 0;
  const speakNext = () => {
    if (i >= mergedUtterances.length) return;
    const { text, lang } = mergedUtterances[i++];
    
    console.log(`🔊 Okunan (${lang}):`, text);
    
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = lang === 'tr-TR' ? ttsRateTR : ttsRateEN;
    if (lang === 'tr-TR' && trVoice) utt.voice = trVoice;
    if (lang === 'en-US' && enVoice) utt.voice = enVoice;
    utt.onend = speakNext;
    utt.onerror = speakNext;
    speechSynthesis.speak(utt);
  };
  
  speakNext();
  }, 100); // 100ms delay - cancel tamamlansın
}

function readTeacherChatAloud() {
  const container = document.getElementById('teacherMessages');
  if (!container) return;
  
  stopSpeech();
  
  // Tüm mesajları topla
  const messages = container.querySelectorAll('.partner-msg');
  if (messages.length === 0) return;
  
  const utterances = [];
  
  messages.forEach(msg => {
    const text = msg.textContent || msg.innerText;
    if (!text.trim()) return;
    
    // İngilizce kelime tespiti (küçük harfler + noktalama)
    const englishWordCount = (text.match(/\b[a-z]+\b/gi) || []).length;
    const totalWordCount = text.split(/\s+/).length;
    const englishRatio = totalWordCount > 0 ? englishWordCount / totalWordCount : 0;
    
    // %50'den fazla İngilizce kelime varsa → İngilizce oku
    const lang = englishRatio > 0.5 ? 'en-US' : 'tr-TR';
    
    // Kırmızı renkli İngilizce kelimeleri çıkar (highlight edilmiş)
    const cleanText = text.replace(/\*\*/g, ''); // Bold işaretlerini temizle
    
    utterances.push({ text: cleanText, lang });
  });
  
  // TTS kuyruğu
  const voices = speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr')) || null;
  
  // Persona'ya göre ses seç
  const persona = PERSONAS[selectedPersona];
  let enVoice = null;
  
  if (persona && persona.voice) {
    // Persona'nın ses tercihini bul
    enVoice = voices.find(v => v.name === persona.voice) || 
              voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(persona.gender)) ||
              voices.find(v => v.lang.startsWith('en'));
  } else {
    // Default: herhangi bir İngilizce ses
    enVoice = voices.find(v => v.lang.startsWith('en')) || null;
  }
  
  let i = 0;
  const speakNext = () => {
    if (i >= utterances.length) return;
    const { text, lang } = utterances[i++];
    if (!text.trim()) { speakNext(); return; }
    
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = lang === 'tr-TR' ? ttsRateTR : ttsRateEN;
    if (lang === 'tr-TR' && trVoice) utt.voice = trVoice;
    if (lang === 'en-US' && enVoice) utt.voice = enVoice;
    utt.onend = speakNext;
    speechSynthesis.speak(utt);
  };
  
  speakNext();
}

async function generateLearnPlan() {
  const goal = GOALS[selectedGoal];
  const learned = learnedSet.size;
  const total = allWords.length;
  
  document.getElementById('learnPlanEl').innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">✨ Plan oluşturuluyor...</div>';
  
  const plan = await callGroqAPI(
    'You create personalized English learning plans. Respond in Turkish.',
    `Create a 7-day learning plan for a student. Goal: ${goal}. Current: ${learned}/${total} words learned. Make it specific with daily activities. Format as JSON array with 7 objects: {day, title, desc, done:false}`
  );
  
  try {
    const clean = plan.replace(/```json|```/g, '').trim();
    const days = JSON.parse(clean);
    renderLearnPlan(days);
    localStorage.setItem('learnPlan', JSON.stringify(days));
  } catch(e) {
    document.getElementById('learnPlanEl').innerHTML = `<div style="white-space:pre-line;font-size:13px;color:var(--sub)">${plan}</div>`;
  }
}

function renderLearnPlan(days) {
  const savedDays = days || JSON.parse(localStorage.getItem('learnPlan') || 'null');
  const el = document.getElementById('learnPlanEl');
  if (!savedDays) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Plan oluşturmak için butona bas.</div>';
    return;
  }
  el.innerHTML = savedDays.map((d, i) => `
    <div class="learn-plan-day" onclick="togglePlanDay(${i})">
      <div class="lpd-num ${d.done ? 'done' : ''}">${d.done ? '✓' : i + 1}</div>
      <div class="lpd-content">
        <div class="lpd-title">${d.title || 'Gün ' + (i+1)}</div>
        <div class="lpd-desc">${d.desc || ''}</div>
      </div>
    </div>`).join('');
}

function togglePlanDay(i) {
  const plan = JSON.parse(localStorage.getItem('learnPlan') || '[]');
  if (plan[i]) { plan[i].done = !plan[i].done; localStorage.setItem('learnPlan', JSON.stringify(plan)); renderLearnPlan(plan); }
}

// ══════════════════════════════════════════════════════════
// 15. ACCENT COACH
// ══════════════════════════════════════════════════════════
let selectedAccent = 'american';
let selectedPhoneme = null;
let accentRecognition = null;

const ACCENT_DATA = {
  american: {
    name: 'American English',
    phonemes: [
      { sound: '/æ/', example: 'cat, bad, have', tip: '"a" sesi ağzı geniş açarak söylenir. Türkçe "a"dan daha geniş.', hard: true },
      { sound: '/ɹ/', example: 'red, car, bird', tip: 'Amerikan R\'si dil ucunu geriye kıvırarak söylenir. Türkçe R\'sinden farklı.', hard: true },
      { sound: '/θ/', example: 'think, three', tip: '"th" için dil ucunu dişlerin arasına koy, hava üfle.', hard: true },
      { sound: '/ð/', example: 'the, this, that', tip: '"th" sesinin titreşimli hali. Dil dişler arasında, ses teli titreşir.', hard: false },
      { sound: '/ʌ/', example: 'cup, but, love', tip: 'Kısa "a" gibi. Türkçe "a" ile "e" arası.', hard: false },
      { sound: '/iː/', example: 'see, meet, feel', tip: 'Uzun "i" sesi. Dudakları yanlara çekerek söyle.', hard: false },
      { sound: '/ɪ/', example: 'sit, big, kit', tip: 'Kısa "i". Türkçe "i"den daha kısa ve kapalı.', hard: true },
      { sound: '/oʊ/', example: 'go, home, know', tip: '"o" ve "u" arasında çift ünlü. go = "gou"', hard: true }
    ]
  },
  british: {
    name: 'British English (RP)',
    phonemes: [
      { sound: '/ɑː/', example: 'bath, fast, can\'t', tip: 'British "a" sesi daha derin ve uzun. Bath = "baath"', hard: true },
      { sound: '/ɒ/', example: 'hot, lot, stop', tip: 'Kısa yuvarlak "o". Dudaklar tam yuvarlak.', hard: true },
      { sound: '/juː/', example: 'new, tune, due', tip: 'British "u" sesi. new = "nyuu"', hard: false },
      { sound: '/ɪə/', example: 'near, here, beer', tip: '"i" ve "ə" birleşimi. here = "hiə"', hard: true },
      { sound: '/eɪ/', example: 'face, cake, make', tip: '"e" + "i" çift ünlü. face = "feis"', hard: false },
      { sound: '/ɜː/', example: 'bird, word, nurse', tip: 'Merkezi ünlü. Ağız yarı açık, dil ortada.', hard: true }
    ]
  },
  australian: {
    name: 'Australian English',
    phonemes: [
      { sound: '/æɪ/', example: 'day, say, face', tip: 'Avustralya "a" sesi çok uzatılır. day = "deɪ" ile "daɪ" arası', hard: true },
      { sound: '/æː/', example: 'dance, chance', tip: 'Uzun "a". Amerikan ve British arası.', hard: false },
      { sound: '/ɪ/', example: 'kit, bit, sit', tip: 'Avustralya kısa "i"si. Amerikan\'dan biraz farklı.', hard: false },
      { sound: '/oː/', example: 'thought, law, door', tip: 'Uzun "o" sesi. Dudaklar yuvarlak.', hard: false }
    ]
  }
};

function selectAccent(id) {
  selectedAccent = id;
  document.querySelectorAll('.accent-opt').forEach(el => el.classList.remove('active'));
  document.getElementById('acc-' + id).classList.add('active');
  renderPhonemeGrid();
  renderAccentExercises();
}

function renderPhonemeGrid() {
  const data = ACCENT_DATA[selectedAccent];
  const grid = document.getElementById('phonemeGrid');
  grid.innerHTML = data.phonemes.map((p, i) => `
    <div class="phoneme-chip ${p.hard ? 'hard' : 'ok'}" onclick="showPhonemeDetail(${i})" title="${p.example}">
      ${p.sound}
    </div>`).join('');
}

function showPhonemeDetail(i) {
  const data = ACCENT_DATA[selectedAccent];
  const p = data.phonemes[i];
  selectedPhoneme = p;
  
  document.getElementById('phonemeDetail').style.display = '';
  document.getElementById('phonemeName').textContent = `${p.sound} — ${p.example}`;
  document.getElementById('phonemeTip').textContent = p.tip;
  
  speak(p.example.split(',')[0].trim(), 'en-US');
}

async function practicePhoneme() {
  if (!selectedPhoneme) return;
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Ses tanıma desteklenmiyor.'); return; }
  
  const example = selectedPhoneme.example.split(',')[0].trim();
  const btn = document.querySelector('#sc-accent button.btn-blue.btn-sm');
  if (btn) { btn.textContent = '🔴 Dinleniyor...'; btn.disabled = true; }
  
  accentRecognition = new SR();
  accentRecognition.lang = 'en-US';
  
  accentRecognition.onresult = async e => {
    const heard = e.results[0][0].transcript;
    if (btn) { btn.textContent = '🎤 Bu Sesi Uygula'; btn.disabled = false; }
    
    const feedback = await callGroqAPI(
      `You are an accent coach for ${ACCENT_DATA[selectedAccent].name}. Give specific, short feedback in Turkish.`,
      `The target sound was "${selectedPhoneme.sound}" as in "${example}". The student said: "${heard}". 
Compare and give 2-3 specific tips. Rate: Excellent/Good/Needs Practice.`
    );
    
    document.getElementById('accentAnalysisResult').innerHTML = `
      <div class="accent-tip">
        <div class="at-label">🎯 "${example}" → Duyulan: "${heard}"</div>
        <div class="at-text">${feedback}</div>
      </div>`;
  };
  accentRecognition.onerror = () => { if (btn) { btn.textContent = '🎤 Bu Sesi Uygula'; btn.disabled = false; } };
  accentRecognition.start();
}

let accentAudioBlob = null;
let accentMediaRecorder = null;

async function analyzeAccent() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const word = words[idx] ? words[idx].word : null;
  if (!word) { showToast('⚠️', 'Önce kelime ekranından bir kelime seç!'); return; }

  // Kelimeyi göster
  const wordEl = document.getElementById('accentCurrentWord');
  if (wordEl) wordEl.textContent = word;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Ses tanıma desteklenmiyor.'); return; }

  const el = document.getElementById('accentAnalyzeBtn');
  el.textContent = '🔴';
  el.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
  document.getElementById('accentAnalysisResult').innerHTML = '<div style="text-align:center;padding:12px;color:var(--muted)">🎤 Dinleniyor...</div>';

  // Ses kaydı başlat
  accentAudioBlob = null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    accentMediaRecorder = new MediaRecorder(stream);
    accentMediaRecorder.ondataavailable = e => chunks.push(e.data);
    accentMediaRecorder.onstop = () => {
      try{ accentMediaRecorder.stream && accentMediaRecorder.stream.getTracks().forEach(t=>t.stop()); }catch(e){}
      accentAudioBlob = new Blob(chunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      // Konuş butonunu göster
      const pbRow = document.getElementById('accentPlaybackRow');
      if (pbRow) pbRow.style.display = 'flex';
    };
    accentMediaRecorder.start();
  } catch(e) {}

  accentRecognition = new SR();
  accentRecognition.lang = 'en-US';
  accentRecognition.continuous = false;
  accentRecognition.interimResults = false;

  let collectedText = '';

  accentRecognition.onresult = e => {
    collectedText = e.results[0][0].transcript;
  };

  accentRecognition.onend = async () => {
    // Kaydı durdur
    if (accentMediaRecorder && accentMediaRecorder.state !== 'inactive') {
      accentMediaRecorder.stop();
    }
    el.textContent = '🎤';
    el.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)';

    if (!collectedText) {
      document.getElementById('accentAnalysisResult').innerHTML = '<div style="color:var(--muted);text-align:center;padding:12px">Ses algılanamadı, tekrar dene</div>';
      return;
    }

    document.getElementById('accentAnalysisResult').innerHTML = '<div style="text-align:center;padding:12px;color:var(--muted)">⏳ Analiz ediliyor...</div>';

    try {
      // DİNAMİK AI SİSTEMİ  
      const aiResponse = await callAI(
        `You are an ${ACCENT_DATA[selectedAccent].name} accent coach. Respond in Turkish.`,
        `Target word: "${word}". Student said: "${collectedText}".
1. Hangi sesler doğruydu?
2. Hangi sesler geliştirilmeli?
3. ${ACCENT_DATA[selectedAccent].name} telaffuzu için 2 spesifik ipucu ver.
Kısa ve yapıcı ol.`,
        'pronun'
      );
      
      const analysis = aiResponse.content || aiResponse; // Geriye uyumluluk
      console.log('🎤 Accent Coach - Kullanılan Model:', aiResponse.model, 'Token:', aiResponse.tokenLimit);

      // Model badge bilgisi
      let badgeHTML = '';
      if(aiResponse.model) {
        const modelNames = {
          'groq': 'Groq Llama 3.3',
          'openai': 'OpenAI GPT-4o-mini',
          'claude': 'Claude 3.5 Sonnet',
          'gemini': 'Gemini 2.5 Flash',
        'openrouter': 'OpenRouter (Ücretsiz)'
        };
        const modelColors = {
          'groq': '#60a5fa',
          'openai': '#10b981',
          'claude': '#a78bfa',
          'gemini': '#f59e0b',
        'openrouter': '#22c55e'
        };
        const modelName = modelNames[aiResponse.model] || aiResponse.model;
        const modelColor = modelColors[aiResponse.model] || '#64748b';
        
        badgeHTML = `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: rgba(0,0,0,0.3);
            border: 1px solid ${modelColor};
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            color: ${modelColor};
            margin-bottom: 8px; ">
            🤖 ${modelName} <span style="opacity:0.6">• ${aiResponse.tokenLimit} token</span>
          </div>`;
      }

      // Harf bazlı renkli karşılaştırma
      const norm = s => s.toLowerCase().replace(/[^a-z]/g,'');
      const coloredWord = colorLetters(norm(word), norm(collectedText));

      // Türkçe karşılık
      const wordItem = allWords.find(w => w.word.toLowerCase() === word.toLowerCase());
      const trText = wordItem ? (wordItem.tr || '') : '';

      document.getElementById('accentAnalysisResult').innerHTML = `
        <div style="background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:8px">
          <div style="font-size:10px;font-weight:800;color:var(--muted);margin-bottom:8px;letter-spacing:1px">HARF BAZLI ANALİZ</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">Hedef: <strong style="color:var(--text)">${word}</strong> → Duyulan: <strong style="color:var(--text)">${collectedText}</strong></div>
          <div style="line-height:2.5;word-break:break-all;margin-bottom:8px">${coloredWord}</div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span><span style="color:#4ade80;font-weight:800">■</span> Doğru</span>
            <span><span style="color:#f87171;font-weight:800">■</span> Yanlış/Eksik</span>
          </div>
        </div>
        ${trText ? `
        <div style="background:#1a0a2e;border:1px solid var(--purple);border-radius:10px;padding:10px;margin-bottom:8px;display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:10px;font-weight:800;color:var(--purple);margin-bottom:3px">🇹🇷 TÜRKÇE</div>
            <div style="font-size:13px;color:var(--sub)">${trText}</div>
          </div>
          <button onclick="speakTurkish('${trText.replace(/'/g,"\\'")}')" style="padding:6px 10px;background:#4c1d95;border:none;border-radius:8px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:#c4b5fd">🔊 TR</button>
        </div>` : ''}
        <div class="accent-tip">
          <div class="at-label">📊 "${word}" Aksan Analizi</div>
          ${badgeHTML}
          <div class="at-text">${highlightEnglishWords(analysis)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="speak('${word.replace(/'/g,"\\'")}','en-US')" style="flex:1;padding:8px;background:#052e16;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:#4ade80">🔊 Doğru EN</button>
          ${trText?`<button onclick="speakTurkish('${trText.replace(/'/g,"\\'")}')" style="flex:1;padding:8px;background:#1a0a2e;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:#c4b5fd">🔊 Türkçe</button>`:''}
          <button onclick="analyzeAccent()" style="flex:1;padding:8px;background:var(--bg3);border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:var(--sub)">🔄 Tekrar</button>
        </div>`;
        
    } catch(error) {
      console.error('Accent analizi hatası:', error);
      document.getElementById('accentAnalysisResult').innerHTML = `<div style="color:var(--red);text-align:center;padding:12px">❌ ${error.message || 'Analiz başarısız'}</div>`;
    }
  };

  accentRecognition.onerror = () => {
    if (accentMediaRecorder && accentMediaRecorder.state !== 'inactive') accentMediaRecorder.stop();
    el.textContent = '🎤';
    el.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
    document.getElementById('accentAnalysisResult').innerHTML = '<div style="color:var(--red);text-align:center;padding:12px">Hata — tekrar dene</div>';
  };

  accentRecognition.start();
}

function playAccentRec() {
  if (!accentAudioBlob) { showToast('⚠️', 'Kayıt yok'); return; }
  const url = URL.createObjectURL(accentAudioBlob);
  const audio = new Audio(url);
  audio.play();
  audio.onended = () => URL.revokeObjectURL(url);
}

// Accent Coach açılınca mevcut kelimeyi göster
function openAccentScreen() {
  showScreen('sc-accent');
  const wordEl = document.getElementById('accentCurrentWord');
  if (wordEl && words[idx]) wordEl.textContent = words[idx].word;
  const pbRow = document.getElementById('accentPlaybackRow');
  if (pbRow) pbRow.style.display = 'none';
}

function renderAccentExercises() {
  const exercises = [
    { title: 'Minimal Pair Alıştırması', desc: 'Benzer sesli kelimeleri karşılaştır', action: () => practiceMinimalPairs() },
    { title: 'Sesli Harf Drili', desc: 'Zor sesleri tekrar et', action: () => drillVowels() },
    { title: 'Cümle Ritmi', desc: 'İngilizce ritim ve vurguyu hisset', action: () => practiceRhythm() }
  ];
  
  document.getElementById('accentExercises').innerHTML = exercises.map((ex, i) => `
    <div class="accent-tip" style="cursor:pointer" onclick="accentExercise(${i})">
      <div class="at-label">${ex.title}</div>
      <div class="at-text">${ex.desc}</div>
    </div>`).join('');
}

async function accentExercise(i) {
  const word = words[idx] ? words[idx].word : 'beautiful';
  const prompts = [
    `Give 3 minimal pair examples with "${word}" or related sounds. Format: word1 / word2 - difference. Respond in Turkish.`,
    `Give a vowel drill exercise using "${word}" sounds. List 5 words with the same vowel sound. Respond in Turkish.`,
    `Explain the stress and rhythm pattern of this sentence using "${word}": "${words[idx]?.sentence || 'I ' + word + ' every day.'}". Mark stressed syllables. Respond in Turkish.`
  ];
  
  const resultEl = document.getElementById('accentAnalysisResult');
  resultEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">⏳ Hazırlanıyor...</div>';
  
  const response = await callGroqAPI('You are an English pronunciation expert.', prompts[i]);
  resultEl.innerHTML = `<div class="accent-tip"><div class="at-label">💡 Egzersiz ${i+1}</div><div class="at-text">${response.replace(/\n/g,'<br>')}</div></div>`;
}

// ══════════════════════════════════════════════════════════
// 8. PODCAST ENTEGRASYONu
// ══════════════════════════════════════════════════════════
function openConversationPartner() {
  var gender = prompt("💬 Partner seç:\n\n1 → Sarah (Bayan)\n2 → Michael (Erkek)", "1");
  if (!gender) return;
  
  var isFemale = (gender === "1");
  var name = isFemale ? "Sarah" : "Michael";
  var msg = prompt("💬 " + name + " ile konuş:");
  if (!msg) return;
  
  alert("⏳ Düşünüyor...");
  
  callGroqAPI(
    "Sen " + name + ". " + (isFemale ? "Bayan" : "Erkek") + " partner.",
    msg,
    500
  ).then(function(result) {
    // Otomatik seslendir - kullanıcıya sorma
    alert(name + ":\n\n" + result + "\n\n🔊 Seslendiriliyor...");
    
    // Sesler yüklendikten sonra çal
    function playWithVoice() {
      var u = new SpeechSynthesisUtterance(result);
      u.lang = "en-US";
      u.rate = 0.9;
      
      // Ses listesini al
      var voices = speechSynthesis.getVoices();
      
      if (isFemale) {
        // BAYAN - Zira (Windows), Samantha (Mac), Google Female
        var v = voices.find(function(x) { return x.voiceURI.includes("Zira"); }) ||
                voices.find(function(x) { return x.name.includes("Zira"); }) ||
                voices.find(function(x) { return x.name.includes("Samantha"); }) ||
                voices.find(function(x) { return x.name.includes("Google") && x.name.includes("female"); }) ||
                voices.find(function(x) { return x.name.toLowerCase().includes("female"); });
        
        if (v) {
          u.voice = v;
          console.log("✅ BAYAN SES:", v.name);
        } else {
          u.pitch = 1.4; // Tiz
          console.log("⚠️ Bayan ses bulunamadı, Pitch: 1.4 (tiz)");
        }
      } else {
        // ERKEK - David (Windows), Alex (Mac), Google Male  
        var v = voices.find(function(x) { return x.voiceURI.includes("David"); }) ||
                voices.find(function(x) { return x.name.includes("David"); }) ||
                voices.find(function(x) { return x.name.includes("Daniel"); }) ||
                voices.find(function(x) { return x.name.includes("Google") && x.name.includes("male"); }) ||
                voices.find(function(x) { return x.name.toLowerCase().includes("male"); });
        
        if (v) {
          u.voice = v;
          console.log("✅ ERKEK SES:", v.name);
        } else {
          u.pitch = 0.7; // Pes
          console.log("⚠️ Erkek ses bulunamadı, Pitch: 0.7 (pes)");
        }
      }
      
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    
    // Sesler yüklenmişse hemen çal, yoksa yüklenince çal
    if (speechSynthesis.getVoices().length > 0) {
      playWithVoice();
    } else {
      speechSynthesis.addEventListener('voiceschanged', function() {
        playWithVoice();
      }, { once: true });
    }
  });
}

// ÖZELLİK 10-11: Hikaye Oluşturucu
function openStoryGenerator() {
  // Ezberlenecekler listesini topla
  const toLearnWords = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('toLearnWords_')) {
      try {
        const wordData = JSON.parse(localStorage.getItem(key));
        if (wordData && wordData.word) {
          toLearnWords.push(wordData.word);
        }
      } catch(e) {
        console.warn('Kelime parse hatası:', e);
      }
    }
  }
  
  // Eğer listede kelime yoksa uyar
  if (toLearnWords.length === 0) {
    const useAnyway = confirm("⚠️ Ezberlenecekler listenizde kelime yok!\n\nYine de hikaye oluşturmak ister misiniz?\n\n(Kelimeleri eklemek için kelime kartından '📌 Ezberleneceklere Ekle' butonunu kullanın)");
    if (!useAnyway) return;
  }
  
  const topic = prompt("📚 Hikaye konusunu girin:\n\n(Örnek: friendship, space adventure, mystery, love story)");
  if (!topic || topic.trim() === "") {
    alert("❌ Lütfen bir konu girin!");
    return;
  }
  
  const level = prompt("📊 Seviye Seçin:\n\n1 → Başlangıç (A1-A2)\n   • Basit kelimeler\n   • Kısa cümleler\n   • Present tense\n\n2 → Orta (B1-B2)\n   • Orta kelime haznesi\n   • Karışık zamanlar\n   • Bağlaçlar\n\n3 → İleri (C1-C2)\n   • Zengin kelime\n   • Karmaşık yapılar\n   • İdiomlar", "2");
  
  const levelConfigs = {
    "1": {
      name: "A1-A2 (Başlangıç)",
      description: "A1-A2 seviyesinde",
      wordCount: "100-120",
      instructions: "Çok basit kelimeler kullan (günlük hayat kelimeleri). Kısa ve net cümleler (5-8 kelime). Sadece Present Simple ve Past Simple kullan. Her cümle bir fikir taşısın. Karmaşık yapılardan kaçın."
    },
    "2": {
      name: "B1-B2 (Orta)",
      description: "B1-B2 seviyesinde",
      wordCount: "120-150",
      instructions: "Orta seviye kelime haznesi kullan. Farklı zamanları karıştır (present, past, future). Bağlaçlarla cümleleri birleştir (and, but, because, when). Bazı deyimler ekle. Akıcı okumayı sağla."
    },
    "3": {
      name: "C1-C2 (İleri)",
      description: "C1-C2 seviyesinde",
      wordCount: "150-200",
      instructions: "Zengin ve çeşitli kelime kullan. Karmaşık cümle yapıları (relative clauses, conditionals). İdiomatik ifadeler ekle. Edebi dil kullan. Metaforlar ve betimlemeler yap. Akıcı ve etkileyici yaz."
    }
  };
  
  const config = levelConfigs[level] || levelConfigs["2"];
  
  // Hikayede kullanılacak kelimeleri seç
  let wordsToUse = [];
  if (toLearnWords.length > 0) {
    // Seviyeye göre kelime sayısı belirle
    const wordLimit = {
      "1": Math.min(8, toLearnWords.length),   // Başlangıç: 8 kelime
      "2": Math.min(12, toLearnWords.length),  // Orta: 12 kelime
      "3": Math.min(15, toLearnWords.length)   // İleri: 15 kelime
    }[level] || 10;
    
    // Rastgele kelime seç
    const shuffled = toLearnWords.sort(() => Math.random() - 0.5);
    wordsToUse = shuffled.slice(0, wordLimit);
  }
  
  alert("⏳ " + config.name + " hikaye oluşturuluyor...\n\n📌 " + wordsToUse.length + " kelime kullanılacak");
  
  const systemPrompt = "Sen profesyonel bir İngilizce hikaye yazarısın. " + config.description + " hikayeler yazıyorsun.";
  
  let userPrompt = "Konu: " + topic + "\n\n" +
    "Seviye: " + config.name + "\n" +
    "Kelime Sayısı: " + config.wordCount + "\n\n";
  
  // Eğer ezberlenecek kelimeler varsa ekle
  if (wordsToUse.length > 0) {
    userPrompt += "⚠️ ÖNEMLİ: Hikayede bu kelimeleri MUTLAKA kullan:\n" +
      wordsToUse.join(", ") + "\n\n" +
      "Bu kelimeleri doğal ve anlamlı cümlelerde kullan. Hikayenin akışını bozma.\n\n";
  }
  
  userPrompt += "Özel Talimatlar:\n" + config.instructions + "\n\n" +
    "Hikaye Formatı:\n" +
    "- Başlık (Title) ekle\n" +
    "- İlgi çekici başla\n" +
    "- Net bir olay örgüsü olsun\n" +
    "- Güzel bir son yap\n\n" +
    "Hikayeyi şimdi yaz:";
  
  callGroqAPI(
    systemPrompt,
    userPrompt,
    1500
  ).then(function(result) {
    // Kelime sayısını hesapla
    const wordCount = result.trim().split(/\s+/).length;
    
    // Hangi kelimelerin kullanıldığını kontrol et
    const usedWords = wordsToUse.filter(function(word) {
      return result.toLowerCase().includes(word.toLowerCase());
    });
    
    const wantVoice = confirm("✅ Hikaye Hazır!\n\n" + 
      "📊 Seviye: " + config.name + "\n" +
      "📝 Kelime Sayısı: " + wordCount + "\n" +
      "📌 Kullanılan Kelimeler: " + usedWords.length + "/" + wordsToUse.length + "\n" +
      (usedWords.length > 0 ? "✨ " + usedWords.join(", ") + "\n" : "") +
      "━━━━━━━━━━━━━━━━\n\n" +
      result + "\n\n" +
      "━━━━━━━━━━━━━━━━\n\n" +
      "🔊 Sesli okumak ister misiniz?");
    
    if (wantVoice) {
      const ut = new SpeechSynthesisUtterance(result);
      ut.lang = "en-US";
      
      // Seviyeye göre okuma hızı
      if (level === "1") {
        ut.rate = 0.75; // Başlangıç - yavaş
      } else if (level === "2") {
        ut.rate = 0.85; // Orta - normal
      } else {
        ut.rate = 0.95; // İleri - hızlı
      }
      
      speechSynthesis.cancel();
      speechSynthesis.speak(ut);
      
      setTimeout(function() {
        if (confirm("🔊 Okuma devam ediyor...\n\n⏸️ Durdurmak ister misiniz?")) {
          speechSynthesis.cancel();
        }
      }, 3000);
    }
  }).catch(function(err) {
    alert("❌ Hata: " + err.message);
  });
}

// ÖZELLİK 12: Podcast - Mevcut ekran kullanılıyor (initPodcastList)

// ÖZELLİK 13-16: Gramer
function openGrammarTopics() {
  const level = prompt("📚 Seviye Seç:\n\nA1 - Başlangıç\nA2 - Temel\nB1 - Orta\nB2 - Orta-İleri\nC1 - İleri\nC2 - Profesyonel", "B1").toLowerCase();
  
  const topics = {
    a1: [
      "Present Simple (Geniş Zaman)",
      "To Be (am/is/are)",
      "Personal Pronouns (Ben, Sen...)",
      "Articles (a/an/the)",
      "Plural Nouns (Çoğul)",
      "There is/There are",
      "This/That/These/Those",
      "Possessive Adjectives (my, your...)",
      "Can/Can't (Yetenek)",
      "Simple Commands (Emir Cümleleri)",
      "Prepositions of Place (in, on, at)",
      "Question Words (What, Where, Who)",
      "Have/Has Got",
      "Some/Any",
      "How much/How many"
    ],
    a2: [
      "Past Simple (Geçmiş Zaman)",
      "Future (will/going to)",
      "Present Continuous (Şimdiki Zaman)",
      "Past Continuous",
      "Comparatives & Superlatives",
      "Should/Shouldn't (Tavsiye)",
      "Must/Mustn't (Zorunluluk)",
      "Countable/Uncountable Nouns",
      "Adverbs of Frequency (always, never...)",
      "Present Perfect (temel)",
      "Too/Enough",
      "Both/Either/Neither",
      "Reflexive Pronouns (myself, yourself...)",
      "Imperative (Let's...)",
      "Would like"
    ],
    b1: [
      "Present Perfect vs Past Simple",
      "Present Perfect Continuous",
      "Modal Verbs (can, could, may, might)",
      "Conditional Type 1 (If I study...)",
      "Conditional Type 2 (If I were...)",
      "Used to / Be used to",
      "Passive Voice (Edilgen Çatı) - Temel",
      "Relative Clauses (who, which, that)",
      "Reported Speech - Temel",
      "Question Tags (isn't it?, don't you?)",
      "So/Such/Too/Enough",
      "Make vs Do",
      "Say vs Tell",
      "Like/Would like/Look like",
      "Gerunds & Infinitives"
    ],
    b2: [
      "Past Perfect (Geçmişin geçmişi)",
      "Past Perfect Continuous",
      "Conditional Type 3 (If I had known...)",
      "Mixed Conditionals",
      "Reported Speech - İleri",
      "Passive Voice - İleri",
      "Causative (have/get something done)",
      "Wish/If only",
      "Inversion (倒装)",
      "Subjunctive Mood",
      "Cleft Sentences (It is... that)",
      "Participle Clauses",
      "Advanced Relative Clauses",
      "Linking Words & Discourse Markers",
      "Emphatic Structures"
    ],
    c1: [
      "Advanced Conditionals & Mixed Types",
      "Sophisticated Passive Structures",
      "Participle Clauses (Advanced)",
      "Nominalization",
      "Fronting & Inversion",
      "Ellipsis & Substitution",
      "Cleft Sentences (Advanced)",
      "Discourse Markers",
      "Advanced Modal Verbs (nuances)",
      "Hedging Language",
      "Cohesion & Coherence",
      "Register & Formality",
      "Complex Noun Phrases",
      "Academic Writing Structures",
      "Reduced Adverb Clauses"
    ],
    c2: [
      "Sophisticated Inversion Patterns",
      "Advanced Participle Constructions",
      "Subjunctive in Formal Contexts",
      "Arcane & Literary Structures",
      "Nuanced Modal Combinations",
      "Complex Hypothetical Structures",
      "Advanced Cohesive Devices",
      "Stylistic Variations",
      "Rhetorical Devices",
      "Fine-grained Aspect & Tense",
      "Evaluative Language",
      "Metadiscourse Markers",
      "Academic Hedging & Boosting",
      "Pragmatic Competence",
      "Native-like Idiomatic Structures"
    ]
  };
  
  const levelTopics = topics[level] || topics.b1;
  const topicList = levelTopics.map(function(t, i) { return (i+1) + ". " + t; }).join("\n");
  
  const choice = prompt("📖 Konu Seç (" + levelTopics.length + " konu):\n\n" + topicList + "\n\nNumara girin:", "1");
  if (!choice) return;
  
  const topicIndex = parseInt(choice) - 1;
  if (topicIndex < 0 || topicIndex >= levelTopics.length) {
    alert("❌ Geçersiz numara!");
    return;
  }
  
  const topic = levelTopics[topicIndex];
  
  alert("⏳ Açıklama hazırlanıyor: " + topic);
  
  const prompt = "Sen profesyonel bir İngilizce gramer öğretmenisin. Türk öğrencilere " + level.toUpperCase() + " seviyesinde ders veriyorsun.\n\n" +
    "Konu: " + topic + "\n\n" +
    "Bu konuyu şu formatta açıkla:\n" +
    "1. TANIM: Konu ne işe yarar, ne zaman kullanılır\n" +
    "2. YAPISI: Gramer yapısı/formül\n" +
    "3. ÖRNEKLER: 5-6 örnek cümle (İngilizce + Türkçe)\n" +
    "4. DİKKAT: Sık yapılan hatalar\n" +
    "5. İPUÇLARI: Hatırlatıcı püf noktaları\n\n" +
    "Açıklamayı net, anlaşılır ve öğretici yap.";
  
  callGroqAPI(
    "Sen İngilizce gramer öğretmenisin.",
    prompt,
    1500
  ).then(function(result) {
    const wantExercise = confirm("📝 " + topic + "\n\n" + result + "\n\n━━━━━━━━━━━━━━━━\n\n💪 Alıştırma yapmak ister misiniz?");
    
    if (wantExercise) {
      alert("⏳ Alıştırma soruları hazırlanıyor...");
      
      const exercisePrompt = "Konu: " + topic + "\n\n" +
        "Bu konuyla ilgili 5 alıştırma sorusu hazırla:\n" +
        "- Her soru için 4 seçenek (A, B, C, D)\n" +
        "- Cevapları en sonda ver\n" +
        "- Soruları zordan kolaya sırala\n\n" +
        "Format:\n" +
        "1. Soru metni\n" +
        "   A) seçenek\n" +
        "   B) seçenek\n" +
        "   C) seçenek\n" +
        "   D) seçenek";
      
      callGroqAPI(
        "Sen İngilizce gramer öğretmenisin.",
        exercisePrompt,
        1200
      ).then(function(exercises) {
        alert("💪 ALIŞTIRMA SORULARI:\n\n" + exercises);
      });
    }
  }).catch(function(err) {
    alert("❌ Hata: " + err.message);
  });
}

// ═══════════════════════════════════════════════════════
// GRAMER EKRANI FONKSİYONLARI
// ═══════════════════════════════════════════════════════

async function generateCustomPartner(){
  const desc = document.getElementById('customPartnerDesc').value.trim();
  if(!desc) return showToast('⚠️ Açıklama girin','');
  const preview = document.getElementById('customPartnerPreview');
  preview.innerHTML='<span style="color:var(--muted)">🤖 Oluşturuluyor...</span>';
  
  try{
    // Basit system prompt
    const systemPrompt = "You are a helpful assistant that creates conversation partner profiles.";
    const userPrompt = `Create a conversation partner profile based on this description: "${desc}"

Return ONLY a JSON object with these fields:
{
  "name": "Partner's name (fits the description)",
  "emoji": "Single emoji that represents the partner",
  "personality": "2-3 word personality description"
}

Example:
Description: "Friendly Italian chef, 30 years old"
Output: {"name":"Marco","emoji":"👨‍🍳","personality":"Cheerful & Food-Loving"}`;

    const response = await callAI(systemPrompt, userPrompt, 'chat');
    const clean = (response.content || response).replace(/\`\`\`json|\`\`\`/g, '').trim();
    const partner = JSON.parse(clean);
    
    const partnerId = 'custom_' + Date.now();
    const savedPartners = JSON.parse(localStorage.getItem('customPartners') || '{}');
    savedPartners[partnerId] = {
      name: partner.name,
      emoji: partner.emoji,
      personality: partner.personality,
      description: desc
    };
    localStorage.setItem('customPartners', JSON.stringify(savedPartners));
    
    preview.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg2);border-radius:8px">
      <span style="font-size:24px">${partner.emoji}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--text)">${partner.name}</div>
        <div style="font-size:11px;color:var(--muted)">${partner.personality}</div>
      </div>
      <button onclick="selectPartner('${partnerId}')" style="padding:6px 12px;background:var(--green);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">✅ Seç</button>
    </div>`;
    showToast('✅ Hazır!', partner.name);
  } catch(e) {
    console.error('Partner generation error:', e);
    preview.innerHTML = '<span style="color:var(--red)">❌ Hata: ' + e.message + '</span>';
  }
}

// ══════════════════════════════════════════════════════════
// PWA SUPPORT - MANIFEST & SERVICE WORKER
// ══════════════════════════════════════════════════════════

// Inline Web App Manifest
