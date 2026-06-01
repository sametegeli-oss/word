/* ════════════════════════════════════════════════════════════════
   WordMode — modül: stats.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function saveTimingData(){
  try{
    const today=new Date().toISOString().slice(0,10);
    const mins=Math.round((Date.now()-sessionStart)/60000);
    const key="wm_timing";
    const data=JSON.parse(localStorage.getItem(key)||"{}");
    data[today]=(data[today]||0)+mins;
    localStorage.setItem(key,JSON.stringify(data));
    // update streak
    const skey="wm_streak";
    const sdata=JSON.parse(localStorage.getItem(skey)||'{"streak":0,"lastDay":""}');
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    if(sdata.lastDay===yesterday) sdata.streak++;
    else if(sdata.lastDay!==today) sdata.streak=1;
    sdata.lastDay=today;
    localStorage.setItem(skey,JSON.stringify(sdata));
  }catch(e){}
}
function renderStats(){
  // streak
  let dayStreak=0;
  try{const s=JSON.parse(localStorage.getItem("wm_streak")||'{"streak":0}');dayStreak=s.streak||0;}catch(e){}
  document.getElementById("statStreakNum").textContent=dayStreak;
  
  // 14. Kelime İstatistikleri
  const correctCount=learnedSet.size;
  const wrongCount=Object.values(wordStatus).filter(s=>s.attempts>0&&s.correct===0).length;
  const unseenCount=allWords.length-Object.keys(wordStatus).length;
  if(document.getElementById("correctWordsCount"))document.getElementById("correctWordsCount").textContent=correctCount;
  if(document.getElementById("wrongWordsCount"))document.getElementById("wrongWordsCount").textContent=wrongCount;
  if(document.getElementById("unseenWordsCount"))document.getElementById("unseenWordsCount").textContent=unseenCount;
  
  // week grid
  const days=["Paz","Pzt","Sal","Çar","Per","Cum","Cts"];
  const today=new Date();
  let weekHTML="";
  for(let i=6;i>=0;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    const ds=d.toISOString().slice(0,10);
    let timingData={};try{timingData=JSON.parse(localStorage.getItem("wm_timing")||"{}");}catch(e){}
    const done=timingData[ds]>0;
    const isToday=i===0;
    weekHTML+=`<div class="week-day">
      <div class="day-circle${done?" done":""}${isToday?" today":""}">${done?"✓":d.getDate()}</div>
      <div class="day-name">${days[d.getDay()]}</div></div>`;
  }
  document.getElementById("weekGrid").innerHTML=weekHTML;
  // bar chart (last 7 days)
  let timingData={};try{timingData=JSON.parse(localStorage.getItem("wm_timing")||"{}");}catch(e){}
  const dayNames=["Paz","Pzt","Sal","Çar","Per","Cum","Cts"];
  let barHTML="",maxMins=0;
  const dayArr=[];
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const ds=d.toISOString().slice(0,10);const m=timingData[ds]||0;dayArr.push({name:dayNames[d.getDay()],mins:m});maxMins=Math.max(maxMins,m);}
  dayArr.forEach(({name,mins})=>{
    const pct=maxMins>0?Math.round((mins/maxMins)*100):0;
    barHTML+=`<div class="bar-row">
      <div class="bar-day">${name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%">${mins>0?mins+"dk":""}</div></div>
    </div>`;
  });
  document.getElementById("barChart").innerHTML=barHTML;
  
  // Zayıf Noktalar Analizi
  renderWeakPoints();
  
  // Skor çubuğunu güncelle (aktif liste adı için)
  updateScoreBar();
  
  // stats cards
  const totalMins=Object.values(timingData).reduce((a,b)=>a+b,0);
  document.getElementById("statsCards").innerHTML=`
    <div class="stats-card"><div class="sc-val" style="color:var(--green)">${learnedSet.size}</div><div class="sc-key">✅ Öğrenilen Kelime</div></div>
    <div class="stats-card"><div class="sc-val" style="color:var(--blue)">${allWords.length}</div><div class="sc-key">📚 Toplam Kelime</div></div>
    <div class="stats-card"><div class="sc-val" style="color:var(--orange)">${totalMins}</div><div class="sc-key">⏱ Toplam Dakika</div></div>
    <div class="stats-card"><div class="sc-val" style="color:var(--purple)">${dayStreak}</div><div class="sc-key">🔥 Günlük Seri</div></div>`;
}

// ══════════════════════════════════════════════════════════
// AI CHAT LEVEL SETTER
// ══════════════════════════════════════════════════════════
