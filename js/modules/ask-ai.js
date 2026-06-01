/* ════════════════════════════════════════════════════════════════
   WordMode — modül: ask-ai.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function initAskAIPage(){
  try{
    const modelEl=document.getElementById('askAIModel');
    const tokenEl=document.getElementById('askAIToken');
    const sysEl=document.getElementById('askAISystem');
    const userEl=document.getElementById('askAIUser');
    if(modelEl) modelEl.value=(aiModelSettings && aiModelSettings.askai) || localStorage.getItem('askAIModel') || 'groq';
    if(tokenEl) tokenEl.value=(aiTokenSettings && aiTokenSettings.askai) || parseInt(localStorage.getItem('askAIToken')||'4000',10) || 4000;
    if(sysEl && !sysEl.value) sysEl.value=localStorage.getItem('askAISystem') || '';
    if(userEl && !userEl.value) userEl.value=localStorage.getItem('askAIUser') || '';
  }catch(e){ console.warn('AskAI init hatası:', e); }
}

async function sendAskAI(){
  const modelEl=document.getElementById('askAIModel');
  const tokenEl=document.getElementById('askAIToken');
  const sysEl=document.getElementById('askAISystem');
  const userEl=document.getElementById('askAIUser');
  const resultCard=document.getElementById('askAIResultCard');
  const resultEl=document.getElementById('askAIResult');
  const metaEl=document.getElementById('askAIMeta');
  const btn=document.getElementById('askAISendBtn');
  const systemPrompt=(sysEl?.value||'').trim();
  const userMessage=(userEl?.value||'').trim();
  const model=(modelEl?.value||'groq');
  let tokenLimit=parseInt(tokenEl?.value||'4000',10);
  if(!userMessage){ showToast('⚠️ Soru boş', 'Önce sorunu/isteğini yaz'); return; }
  if(!tokenLimit || tokenLimit<100) tokenLimit=100;
  if(tokenLimit>15000) tokenLimit=15000;
  try{
    aiModelSettings.askai=model;
    aiTokenSettings.askai=tokenLimit;
    localStorage.setItem('aiModelSettings', JSON.stringify(aiModelSettings));
    localStorage.setItem('aiTokenSettings', JSON.stringify(aiTokenSettings));
    localStorage.setItem('askAIModel', model);
    localStorage.setItem('askAIToken', String(tokenLimit));
    localStorage.setItem('askAISystem', systemPrompt);
    localStorage.setItem('askAIUser', userMessage);
  }catch(e){}
  if(resultCard) resultCard.style.display='block';
  if(resultEl) resultEl.textContent='⏳ Yapay zeka cevaplıyor...';
  if(metaEl) metaEl.textContent='';
  if(btn){ btn.disabled=true; btn.textContent='⏳ Cevap bekleniyor...'; }
  try{
    const response=await callAI(systemPrompt || 'You are a helpful assistant.', userMessage, 'askai');
    const content=response.content || response || '';
    if(resultEl) resultEl.textContent=content;
    if(metaEl) metaEl.textContent=`Model: ${response.model || model} • Maksimum token: ${response.tokenLimit || tokenLimit}`;
  }catch(err){
    console.error('AskAI hata:', err);
    if(resultEl) resultEl.textContent='❌ Hata: '+(err.message || err);
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='🚀 Yapay Zekaya Sor'; }
  }
}

function clearAskAI(){
  ['askAISystem','askAIUser','askAIResult','askAIMeta'].forEach(id=>{const el=document.getElementById(id); if(el) el.value!==undefined ? el.value='' : el.textContent='';});
  const card=document.getElementById('askAIResultCard'); if(card) card.style.display='none';
  localStorage.removeItem('askAISystem'); localStorage.removeItem('askAIUser');
}

function copyAskAIResult(){
  const txt=document.getElementById('askAIResult')?.textContent||'';
  if(!txt) return;
  navigator.clipboard?.writeText(txt).then(()=>showToast('📋 Kopyalandı','AI yanıtı panoya kopyalandı')).catch(()=>{});
}


/* === AI SOR MENÜ BAĞLANTISI FIX === */
function openAskAIScreen(){
  try{
    if(typeof showScreen === 'function'){
      showScreen('sc-askai');
    }else{
      document.querySelectorAll('.screen').forEach(function(scr){
        scr.classList.remove('active');
        scr.style.display='none';
      });
      var ask=document.getElementById('sc-askai');
      if(ask){ ask.classList.add('active'); ask.style.display='block'; }
    }
    var nav=document.getElementById('bottomNav');
    if(nav) nav.style.display='flex';
    setTimeout(function(){
      var sys=document.getElementById('askAISystem');
      if(sys && !sys.value) sys.focus();
    },80);
  }catch(e){
    console.error('AI Sor ekranı açılamadı:', e);
    alert('AI Sor ekranı açılamadı: '+(e.message||e));
  }
}



/* ===== extracted script block ===== */


// ══════════════════════════════════════════════════════════
// İNGİLİZCE-TÜRKÇE SÖZLÜK HAZIRLAYICI
// Kaynak mantığı: EVP/Cambridge CEFR yaklaşımı + Zipf tahmini + fonetik dönüşüm + AI tamamlama
// ══════════════════════════════════════════════════════════
