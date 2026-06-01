/* ════════════════════════════════════════════════════════════════
   WordMode — modül: prompt-editor.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let customPrompts = {};
let currentPromptType = '';

// LocalStorage'dan custom prompt'ları yükle
function loadCustomPrompts() {
  const saved = localStorage.getItem('customPrompts');
  if (saved) {
    try {
      customPrompts = JSON.parse(saved);
    } catch(e) {
      customPrompts = {};
    }
  }
}

// Varsayılan promptlar
const defaultPrompts = {
  explain: {
    title: "📖 Kelime Açıklama",
    system: "You are an English teacher explaining words to Turkish learners.",
    user: "Kelime: {{word}}"
  },
  convList: {
    title: "📚 Senaryodan Çalışma Listesi",
    system: "Sen bir İngilizce-Türkçe kelime listesi üreticisin. 25 İngilizce kelime için TÜRKÇE KARŞILIK üret. JSON array döndür.",
    user: `Senaryo: {{scenario}}
Seviye: {{level}}

Bu formatta 25 kelime:
[
  {"word":"provide","tr":"sağlamak","phonetic":"prəˈvaɪd","sentence":"We provide coffee.","sentenceTr":"Biz kahve sağlıyoruz."},
  {"word":"customer","tr":"müşteri","phonetic":"ˈkʌstəmər","sentence":"The customer is happy.","sentenceTr":"Müşteri mutlu."}
]

ÖNEMLİ KURALLAR:
1. "tr" alanı MUTLAKA Türkçe olmalı (provide→sağlamak, customer→müşteri)
2. "sentenceTr" alanı cümlenin Türkçe çevirisi olmalı
3. "tr" ve "sentenceTr" alanlarına İngilizce kelime yazma!
4. 25 kelime
5. Sadece JSON array döndür, başka metin yok

Kullanılabilir değişkenler: {{scenario}}, {{level}}`
  },
  relations: {
    title: "🔗 Kelime İlişkileri",
    system: "You are an English vocabulary expert.",
    user: "Kelime: {{word}}\n\nSynonyms, antonyms, collocations göster."
  },
  quiz: {
    title: "❓ AI Test",
    system: "You are creating English vocabulary quizzes for Turkish learners.",
    user: "Kelime: {{word}}\n\nBu kelime için quiz soruları oluştur."
  },
  context: {
    title: "🧠 Bağlam Analizi",
    system: "You are an English teacher analyzing sentences for Turkish learners.",
    user: "Kelime: {{word}}"
  },
  visual: {
    title: "🎨 Görsel",
    system: "You are a visual English vocabulary teacher. Respond in Turkish.",
    user: "Kelime: {{word}}"
  },
  pronunciation: {
    title: "🎤 Telaffuz",
    system: "You are a pronunciation coach.",
    user: "Kelime: {{word}}"
  },
  conversation: {
    title: "💬 Konuşma",
    system: "You are a conversation partner helping with English practice.",
    user: "Kelime: {{word}}"
  },
  story: {
    title: "📖 AI Hikaye Üretici",
    system: "Sen profesyonel bir İngilizce hikaye yazarısın. {{level}} seviyesinde hikayeler yazıyorsun.",
    user: `Konu: {{topic}}
Seviye: {{levelName}}
Kelime Sayısı: {{wordCount}}
Kullanılacak Kelimeler: {{words}}

Özel Talimatlar:
{{instructions}}

Hikaye Formatı:
- Başlık (Title) ekle
- İlgi çekici başla
- Net bir olay örgüsü olsun
- Güzel bir son yap

⚠️ ÖNEMLİ: Hikayede verilen kelimeleri MUTLAKA kullan.

Hikayeyi şimdi yaz:`
  },
  podcast: {
    title: "🎧 AI Podcast Oluşturucu",
    system: "Sen profesyonel bir İngilizce podcast sunucususun. {{levelName}} seviyesinde podcast yapıyorsun.",
    user: `Konu: {{topicText}}
Seviye: {{levelName}}
Kelime Sayısı: {{wordCount}}

Özel Talimatlar:
{{instructions}}

Podcast Formatı:
1. İlgi çekici bir açılış yap (Hello listeners, welcome to...)
2. Konuyu tanıt ve neden önemli olduğunu açıkla
3. Ana noktaları detaylıca anlat (2-3 ana nokta)
4. Örnekler ve açıklamalar ver
5. Güzel bir kapanış yap (That's all for today...)

ÖNEMLİ:
- Podcast sunucusu gibi konuş (samimi, sıcak, eğitici)
- Doğal bir podcast akışı olsun
- Sadece İngilizce yaz

Podcast metnini şimdi yaz:`
  },
  teacher: {
    title: "🤖 AI Öğretmenim",
    system: "Sen yardımsever bir İngilizce öğretmenisin. Öğrencilere sabırla ve açık şekilde yardım ediyorsun.",
    user: "{{userQuestion}}"
  },
  context: {
    title: "🧠 Bağlam Analizi",
    system: "Sen bir İngilizce öğretmenisin. Kelimelerin farklı bağlamlarda nasıl kullanıldığını öğretiyorsun.",
    user: "Kelime: {{word}}\n\nBu kelimeyi 3 farklı bağlamda kullanarak örnek cümleler yaz. Her cümle farklı bir anlam veya kullanım göstermeli."
  },
  conversation: {
    title: "🗣️ Konuşma Simülasyonu",
    system: "Sen {{scenario}} senaryosunda konuşan bir kişisin. Doğal ve gerçekçi konuş.",
    user: "{{userMessage}}"
  },
  visual: {
    title: "🖼️ Görsel Açıklama",
    system: "Sen görselleri İngilizce açıklayan bir öğretmensin. Detaylı ve eğitici açıklamalar yaparsın.",
    user: "Bu görseli İngilizce açıkla:\n{{imageDescription}}\n\nAçıklamanda şunları ekle:\n- Görselde ne var?\n- Renkler, şekiller, objeler\n- 5-10 yeni kelime ve anlamları"
  },
  test: {
    title: "📝 AI Test",
    system: "Sen bir İngilizce sınav hazırlayıcısısın. {{level}} seviyesinde testler oluşturursun.",
    user: "Konu: {{topic}}\nSoru Sayısı: {{count}}\n\nÇoktan seçmeli sorular oluştur. Her soru için 4 şık ve doğru cevabı belirt."
  },
  grammar: {
    title: "📚 Gramer Rehberi",
    system: "Sen bir İngilizce gramer öğretmenisin. Gramer konularını açık ve anlaşılır şekilde anlatırsın.",
    user: "Konu: {{topic}}\n\nBu gramer konusunu şu formatta anlat:\n1. Tanım ve ne zaman kullanılır\n2. Yapısı (formula)\n3. 5 örnek cümle\n4. Sık yapılan hatalar\n5. İpuçları"
  },
  partner: {
    title: "💬 Konuşma Partner",
    system: "Sen {{partnerName}} ({{gender}}) adında bir konuşma partnerısın. Doğal ve samimi konuş.",
    user: "{{userMessage}}"
  },
  corrector: {
    title: "✍️ Cümle Düzeltme",
    system: "Sen bir İngilizce öğretmenisin. Cümleleri düzeltir ve öğretirsin.",
    user: `Cümle: "{{sentence}}"

ÖNEMLİ: Büyük/küçük harf ve noktalama farklarını (.,!?) HATA OLARAK SAYMA.
Sadece GERÇEK gramer hatalarını düzelt (yanlış zaman, kelime sırası, eksik kelime, yanlış edat).

Bu cümleyi analiz et:
1. GERÇEK bir gramer hatası varsa düzelt
2. Hatayı açıkla (Türkçe)
3. Doğru cümleyi göster
4. 2 benzer örnek ver

Format:
❌ Yanlış: ... (sadece GERÇEK hata varsa)
✅ Doğru: ...
📚 Açıklama: ...
💡 Örnekler: ...

GERÇEK gramer hatası yoksa: "✅ Cümle doğru!"`
  },
  relations: {
    title: "🔗 Kelime İlişkileri",
    system: "Sen bir İngilizce öğretmenisin. Kelimelerin eş anlamlıları, zıt anlamlıları ve ilişkili kelimelerini öğretirsin.",
    user: `Kelime: "{{word}}" (Türkçe: {{tr}})

Bu kelime için:
1. **Synonyms** (eş anlamlı): 5 kelime + Türkçe anlamları
2. **Antonyms** (zıt anlamlı): 3-5 kelime + Türkçe anlamları
3. **Related words** (ilgili kelimeler): 5 kelime aynı konu/bağlamda + Türkçe anlamları
4. **Collocations** (kelime öbekleri): 3-5 yaygın TAM CÜMLE (sadece kelime değil)

Format:
**Synonyms:**
- word1 (türkçe)
- word2 (türkçe)

**Antonyms:**
- word1 (türkçe)

**Related:**
- word1 (türkçe)

**Collocations:**
- tam cümle burada (türkçe)
- başka tam cümle (türkçe)

ÖNEMLİ: Collocations için SADECE TAM CÜMLE yaz, kelime değil.`
  },
  convList: {
    title: "📚 Senaryodan Çalışma Listesi",
    system: "Sen bir İngilizce-Türkçe kelime listesi üreticisin. 25 İngilizce kelime için TÜRKÇE KARŞILIK üret. JSON array döndür.",
    user: `Senaryo: {{scenario}}
Seviye: {{level}}

Bu formatta 25 kelime:
[
  {"word":"provide","tr":"sağlamak","phonetic":"prəˈvaɪd","sentence":"We provide coffee.","sentenceTr":"Biz kahve sağlıyoruz."},
  {"word":"customer","tr":"müşteri","phonetic":"ˈkʌstəmər","sentence":"The customer is happy.","sentenceTr":"Müşteri mutlu."}
]

ÖNEMLİ KURALLAR:
1. "tr" alanı MUTLAKA Türkçe olmalı (provide→sağlamak, customer→müşteri)
2. "sentenceTr" alanı cümlenin Türkçe çevirisi olmalı
3. "tr" ve "sentenceTr" alanlarına İngilizce kelime yazma!
4. 25 kelime
5. Sadece JSON array döndür, başka metin yok`
  }
};



function ensurePromptEditorModal(){
  let modal=document.getElementById('promptEditorModal');
  if(modal && document.getElementById('promptEditorTitle') && document.getElementById('promptEditorSystem') && document.getElementById('promptEditorUser')) return modal;
  const old=document.getElementById('promptEditorModal');
  if(old) old.remove();
  modal=document.createElement('div');
  modal.id='promptEditorModal';
  modal.style.cssText='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.82);z-index:2147483000;padding:20px;overflow-y:auto';
  modal.innerHTML=`
    <div style="max-width:800px;margin:40px auto;background:var(--bg);border-radius:16px;padding:24px;border:1px solid var(--border);box-shadow:var(--shadow)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="margin:0;color:var(--text)">📝 AI Prompt Düzenle</h2>
        <button onclick="closePromptEditor()" style="width:32px;height:32px;border:none;background:var(--red);color:#fff;border-radius:8px;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="margin-bottom:16px"><label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">Ekran:</label><div id="promptEditorTitle" style="font-size:14px;font-weight:700;color:var(--text);padding:8px;background:var(--bg2);border-radius:8px"></div></div>
      <div style="margin-bottom:16px"><label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">System Prompt:</label><textarea id="promptEditorSystem" style="width:100%;height:100px;padding:12px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:monospace;font-size:12px;resize:vertical"></textarea></div>
      <div style="margin-bottom:20px"><label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">User Prompt:</label><textarea id="promptEditorUser" style="width:100%;height:200px;padding:12px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:monospace;font-size:12px;resize:vertical"></textarea></div>
      <div style="display:flex;gap:12px;margin-bottom:20px;padding:16px;background:var(--bg2);border-radius:12px;border:1px solid var(--border)">
        <div style="flex:1"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px">🤖 AI Model</label><select id="promptEditorModel" style="width:100%;padding:10px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-size:13px;font-family:'Nunito',sans-serif;cursor:pointer"><option value="groq">Groq Llama 3.3</option><option value="gemini">Gemini 2.5 Flash</option><option value="openai">OpenAI GPT-4o-mini</option><option value="claude">Claude 3.5 Sonnet</option><option value="openrouter">OpenRouter (Ücretsiz)</option></select></div>
        <div style="flex:1"><label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px">🎯 Token Limiti</label><input id="promptEditorTokenLimit" max="15000" min="500" placeholder="1500" step="500" style="width:100%;padding:10px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-size:13px;font-family:'Nunito',sans-serif" type="number"/></div>
      </div>
      <div style="display:flex;gap:8px"><button onclick="savePrompt()" style="flex:1;padding:12px;background:var(--green);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">💾 Kaydet & Uygula</button><button onclick="resetPrompt()" style="flex:1;padding:12px;background:var(--red);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">🔄 Varsayılana Dön</button></div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function wmSavePronunciationHistoryEntry(entry){
  try{
    entry=Object.assign({time:Date.now(),mode:'word'},entry||{});
    ['wm_pronunciation_history_v2','wm_pron_history','wmPronHistory'].forEach(key=>{
      let arr=[]; try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){arr=[]}
      if(!Array.isArray(arr)) arr=[];
      arr.push(entry);
      localStorage.setItem(key,JSON.stringify(arr.slice(-300)));
    });
    if(typeof wmProRenderPronHistory==='function') setTimeout(wmProRenderPronHistory,50);
    if(typeof wmRenderProfessionalUpgrade==='function') setTimeout(wmRenderProfessionalUpgrade,50);
  }catch(e){console.warn('Telaffuz geçmişi kaydedilemedi:',e)}
}

function addCurrentPronunWordToLearnList(){
  try{
    const item=(Array.isArray(words)&&words[idx])?words[idx]:null;
    const word=(item&&item.word)||'';
    if(!word){ showToast&&showToast('⚠️ Kelime yok','Eklenecek kelime bulunamadı'); return; }
    if(typeof addToLearnList==='function') addToLearnList(word);
    const btn=document.getElementById('pronunAddLearnBtn');
    if(btn){ btn.textContent='✅ Eklendi'; btn.disabled=true; }
    if(typeof showToast==='function') showToast('✅ Eklendi', word+' ezberleneceklere eklendi');
  }catch(e){ console.warn(e); }
}

function showPromptEditor(type) {
  try{
    currentPromptType = type;
    loadCustomPrompts();
    const modal = ensurePromptEditorModal();
    const base = defaultPrompts[type] || {title:type || 'Prompt', system:'', user:''};
    const prompt = customPrompts[type] || base;
    const titleEl=document.getElementById('promptEditorTitle');
    const sysEl=document.getElementById('promptEditorSystem');
    const userEl=document.getElementById('promptEditorUser');
    if(titleEl) titleEl.textContent = base.title || type || 'Prompt';
    if(sysEl) sysEl.value = prompt.system || '';
    if(userEl) userEl.value = prompt.user || '';
    const modelSelect = document.getElementById('promptEditorModel');
    const tokenInput = document.getElementById('promptEditorTokenLimit');
    if(modelSelect) modelSelect.value = getAIModel(type);
    if(tokenInput) tokenInput.value = getAITokenLimit(type);
    document.body.style.overflow = 'hidden';
    modal.style.display = 'block';
  }catch(err){
    console.error('Prompt editörü açılamadı:',err);
    alert('Prompt editörü açılamadı: '+err.message);
  }
}

function closePromptEditor() {
  const modal=document.getElementById('promptEditorModal'); if(modal) modal.style.display = 'none';
  // ✅ GÖREV #21: Scroll'u geri aç
  document.body.style.overflow = '';
}

function savePrompt() {
  const system = document.getElementById('promptEditorSystem').value;
  const user = document.getElementById('promptEditorUser').value;
  const model = document.getElementById('promptEditorModel')?.value;
  const tokenLimit = parseInt(document.getElementById('promptEditorTokenLimit')?.value);
  
  customPrompts[currentPromptType] = { system, user };
  localStorage.setItem('customPrompts', JSON.stringify(customPrompts));
  
  // ✅ GÖREV #20: Model ve Token Kaydet
  if(model) {
    aiModelSettings[currentPromptType] = model;
    localStorage.setItem('aiModelSettings', JSON.stringify(aiModelSettings));
  }
  if(tokenLimit && tokenLimit >= 500 && tokenLimit <= 15000) {
    aiTokenLimits[currentPromptType] = tokenLimit;
    localStorage.setItem('aiTokenLimits', JSON.stringify(aiTokenLimits));
  }
  
  // ✅ GÖREV #4: Yedekleme kaydet
  localStorage.setItem('prompt_backup_' + currentPromptType + '_system', system);
  localStorage.setItem('prompt_backup_' + currentPromptType + '_user', user);
  
  // ✅ YENİ: Yedek klasöre otomatik kaydet
  if(backupFolderHandle) {
    savePromptToBackupFolder(currentPromptType, system, user, model, tokenLimit);
  }
  
  showToast('✅ Tümü Kaydedildi', 'Prompt, model ve token ayarlandı');
  closePromptEditor();
  
  // Listeyi güncelle
  if (typeof renderPromptsUI === 'function') {
    renderPromptsUI();
  }
}

function resetPrompt() {
  if (!confirm('Prompt varsayılan haline dönecek. Emin misiniz?')) return;
  
  delete customPrompts[currentPromptType];
  localStorage.setItem('customPrompts', JSON.stringify(customPrompts));
  
  const defaultPrompt = defaultPrompts[currentPromptType];
  document.getElementById('promptEditorSystem').value = defaultPrompt.system;
  document.getElementById('promptEditorUser').value = defaultPrompt.user;
  
  showToast('🔄 Sıfırlandı', 'Prompt varsayılan haline döndü');
}

// Prompt al (custom varsa onu, yoksa default)
function getPrompt(type) {
  loadCustomPrompts();
  return customPrompts[type] || defaultPrompts[type];
}

// Template değişkenlerini doldur
function fillPromptTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Sayfa yüklendiğinde custom prompt'ları yükle
loadCustomPrompts();



/* ===== extracted script block ===== */


document.addEventListener('DOMContentLoaded', function () {
  function bindInstallButton(idName) {
    const btn = document.getElementById(idName);
    if (btn && !btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', function () {
        if (typeof installPWA === 'function') {
          installPWA();
        }
      });
    }
  }

  bindInstallButton('pwaInstallBtn');
  bindInstallButton('pwaInstallBtnSecondary');
});

// Service Worker kaydı
// Service Worker disabled - Console hatalarını önlemek için kapatıldı
// Mevcut Service Worker'ları temizle
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister().then(success => {
        if (success) console.log('🗑️ Eski Service Worker temizlendi');
      });
    });
  });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA kurulum prompt\'u hazır');
  e.preventDefault();
  deferredPrompt = e;
  
  // Sadece console'a log, otomatik gösterme
  console.log('💡 PWA kurulum hazır. Kullanıcı bir butona tıklayınca showInstallPrompt() çağrılabilir.');
});

function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('⚠️ Install prompt hazır değil');
    return;
  }
  
  // Prompt'u göster (sadece user gesture ile)
  deferredPrompt.prompt();
  
  // Kullanıcının seçimini bekle
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ Kullanıcı PWA kurulumunu kabul etti');
      showToast('✅ Yükleniyor', 'Word Mode kuruluyor...');
    } else {
      console.log('❌ Kullanıcı PWA kurulumunu reddetti');
    }
    deferredPrompt = null;
  });
}

// Kurulum tamamlandığında
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA başarıyla kuruldu!');
  showToast('🎉 Kuruldu', 'Word Mode ana ekranına eklendi!');
  deferredPrompt = null;
});


/* ===== extracted script block ===== */


// localStorage'daki bozuk prompt verilerini temizle
function fixPromptData() {
  console.log('🔧 Prompt verileri temizleniyor...');
  
  // customPrompts'u sil
  localStorage.removeItem('customPrompts');
  
  // Tüm prompt_ keylerini sil
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('prompt_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  
  console.log('✅ Prompt verileri temizlendi:', keysToRemove.length, 'anahtar silindi');
}

// Sayfa her yüklendiğinde temizle
fixPromptData();


/* ===== extracted script block ===== */


// ════════════════════════════════════════════════════════════════
// KELIME İLİŞKİ GRAFİĞİ
// D3.js force-directed graph
// Düğümler: kelimeler | Kenarlar: kök/konu/kullanım ilişkileri
// ════════════════════════════════════════════════════════════════

