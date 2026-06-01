/* ════════════════════════════════════════════════════════════════
   WordMode — modül: sentence-family.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

(function(){
  if(window.__WM_FAMILY_PROMPT_V33__) return;
  window.__WM_FAMILY_PROMPT_V33__ = true;

  const PROMPT_KEY = 'wm_sentence_family_prompt_v33';

  function esc(s){
    return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function clean(s){ return String(s ?? '').replace(/\s+/g,' ').trim(); }
  function getArr(){
    try{ if(Array.isArray(window.words) && window.words.length) return window.words; }catch(e){}
    try{ if(Array.isArray(words) && words.length) return words; }catch(e){}
    try{ if(Array.isArray(window.allWords) && window.allWords.length) return window.allWords; }catch(e){}
    try{ if(Array.isArray(allWords) && allWords.length) return allWords; }catch(e){}
    return [];
  }
  function currentIndex(){
    try{ return Number(window.idx ?? idx ?? 0) || 0; }catch(e){ return 0; }
  }
  function currentItem(){ return getArr()[currentIndex()] || null; }
  function field(w, keys){
    for(const k of keys){
      if(w && w[k] != null && String(w[k]).trim()) return clean(w[k]);
    }
    return '';
  }
  function sentenceOf(w){ return field(w,['sentence','text','enSentence','example']); }
  function sentenceTrOf(w){ return field(w,['sentenceTr','sentenceTR','trSentence','translationSentence','turkishSentence']); }
  function grammarOf(w){ return field(w,['grammarStructure','grammar','grammar_structure','structure']); }
  function levelOf(w){ return field(w,['sentenceLevel','level','cefr','CEFR']); }
  function wordOf(w){ return field(w,['word','targetWord','highlight','highlights']); }

  function defaultPrompt(){
    return `Sen bir İngilizce öğretmenisin.

Görevin verilen cümle için "Cümle Ailesi" üretmektir.

Ana ilke:
Cümle Ailesi = Anlam Benzerliği + Aynı Gramer + Aynı Seviye

Kurallar:
1. Ana cümlenin iletişim amacını koru.
2. Aynı grammarStructure yapısını koru.
3. Aynı sentenceLevel seviyesinde kal.
4. Rastgele alakasız örnek verme.
5. İngilizce cümlelerin doğal ve doğru olsun.
6. Her İngilizce cümlenin Türkçe anlamını da yaz.
7. En fazla 4 örnek üret.
8. Ana cümlenin aynısını tekrar etme.
9. Sadece JSON döndür; açıklama yazma.

Verilen bilgiler:
ENGLISH: {{sentence}}
TURKISH: {{sentenceTr}}
TARGET WORD: {{word}}
GRAMMAR: {{grammarStructure}}
LEVEL: {{sentenceLevel}}

JSON formatı:
{
  "pattern": "kısa yapı açıklaması",
  "meaning": "Türkçe kalıp/anlam açıklaması",
  "examples": [
    {"en":"...", "tr":"..."},
    {"en":"...", "tr":"..."},
    {"en":"...", "tr":"..."},
    {"en":"...", "tr":"..."}
  ]
}

Örnek kalite hedefi:
Eğer ana cümle "Have you ever ridden a camel before?" ise, örnekler aynı deneyim sorma ailesinde kalmalıdır:
- Have you ever ridden a horse before? / Daha önce ata bindin mi?
- Have you ever driven a tractor before? / Daha önce traktör kullandın mı?
- Have you ever sailed a boat before? / Daha önce tekne kullandın mı?

"Have you finished your homework yet?" gibi sadece grameri aynı ama anlam ailesi farklı örnekler üretme.`;
  }

  function getPrompt(){
    try{ return localStorage.getItem(PROMPT_KEY) || defaultPrompt(); }catch(e){ return defaultPrompt(); }
  }
  function setPrompt(v){
    try{ localStorage.setItem(PROMPT_KEY, String(v || defaultPrompt())); }catch(e){}
  }
  function fillPrompt(tpl,w){
    return String(tpl || '').replace(/{{\s*sentence\s*}}/g, sentenceOf(w))
      .replace(/{{\s*sentenceTr\s*}}/g, sentenceTrOf(w))
      .replace(/{{\s*word\s*}}/g, wordOf(w))
      .replace(/{{\s*grammarStructure\s*}}/g, grammarOf(w))
      .replace(/{{\s*sentenceLevel\s*}}/g, levelOf(w));
  }

  function ensureStyles(){
    if(document.getElementById('wmV33FamilyPromptStyles')) return;
    const st=document.createElement('style');
    st.id='wmV33FamilyPromptStyles';
    st.textContent=`
      .wm-v33-overlay{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
      .wm-v33-modal{width:min(760px,96vw);max-height:88vh;overflow:auto;background:var(--card,#111827);border:1px solid var(--border,#334155);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:16px;color:var(--text,#fff);font-family:Nunito,Arial,sans-serif}
      .wm-v33-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .wm-v33-title{font-weight:900;font-size:18px}.wm-v33-x{border:0;border-radius:10px;padding:8px 11px;background:var(--bg3,#1f2937);color:var(--text,#fff);font-weight:900;cursor:pointer}
      .wm-v33-help{font-size:12px;color:var(--muted,#94a3b8);line-height:1.5;margin-bottom:10px}
      .wm-v33-text{width:100%;min-height:360px;resize:vertical;background:var(--bg2,#0f172a);color:var(--text,#fff);border:1px solid var(--border,#334155);border-radius:14px;padding:12px;font-family:Consolas,monospace;font-size:12px;line-height:1.5;box-sizing:border-box}
      .wm-v33-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.wm-v33-btn{border:0;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer;color:#fff;background:linear-gradient(135deg,#3b82f6,#2563eb)}
      .wm-v33-btn.green{background:linear-gradient(135deg,#22c55e,#16a34a)}.wm-v33-btn.ghost{background:var(--bg3,#1f2937);color:var(--text,#fff);border:1px solid var(--border,#334155)}
      .wm-v33-prompt-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6)!important}
      .wm-v33-loading{padding:12px;border:1px solid rgba(59,130,246,.35);border-radius:14px;background:rgba(59,130,246,.10);color:var(--text,#fff);font-weight:800}
    `;
    document.head.appendChild(st);
  }

  function toast(a,b){
    try{ if(typeof showToast==='function') return showToast(a,b); }catch(e){}
    try{ console.log('[Toast]', a, b||''); }catch(e){}
  }

  window.wmV33OpenFamilyPrompt=function(){
    ensureStyles();
    const old=document.getElementById('wmV33FamilyPromptModal');
    if(old) old.remove();
    const ov=document.createElement('div');
    ov.id='wmV33FamilyPromptModal';
    ov.className='wm-v33-overlay';
    ov.innerHTML=`
      <div class="wm-v33-modal">
        <div class="wm-v33-top"><div class="wm-v33-title">📝 Cümle Ailesi Promptu</div><button class="wm-v33-x" onclick="wmV33CloseFamilyPrompt()">✕</button></div>
        <div class="wm-v33-help">Bu prompt, <b>✨ Benzer Cümleler Üret</b> düğmesine basınca kullanılır. Değişkenler: <code>{{sentence}}</code>, <code>{{sentenceTr}}</code>, <code>{{word}}</code>, <code>{{grammarStructure}}</code>, <code>{{sentenceLevel}}</code></div>
        <textarea id="wmV33FamilyPromptText" class="wm-v33-text">${esc(getPrompt())}</textarea>
        <div class="wm-v33-actions">
          <button class="wm-v33-btn green" onclick="wmV33SaveFamilyPrompt()">💾 Kaydet</button>
          <button class="wm-v33-btn" onclick="wmV33SaveFamilyPrompt();wmV32GenerateSentenceFamily();wmV33CloseFamilyPrompt();">✨ Kaydet ve Üret</button>
          <button class="wm-v33-btn ghost" onclick="wmV33ResetFamilyPrompt()">↩ Varsayılana Dön</button>
          <button class="wm-v33-btn ghost" onclick="wmV33CloseFamilyPrompt()">Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.wmV33CloseFamilyPrompt=function(){ const el=document.getElementById('wmV33FamilyPromptModal'); if(el) el.remove(); };
  window.wmV33SaveFamilyPrompt=function(){
    const t=document.getElementById('wmV33FamilyPromptText');
    setPrompt(t ? t.value : defaultPrompt());
    toast('✅ Prompt kaydedildi','Cümle Ailesi artık bu promptla üretilecek');
    wmV33InjectPromptButton();
  };
  window.wmV33ResetFamilyPrompt=function(){
    const t=document.getElementById('wmV33FamilyPromptText');
    if(t) t.value=defaultPrompt();
    setPrompt(defaultPrompt());
    toast('↩ Varsayılan prompt yüklendi','');
  };

  function parseAIJSON(text){
    text=String(text || '').trim();
    text=text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```$/,'').trim();
    const first=text.indexOf('{'), last=text.lastIndexOf('}');
    if(first>=0 && last>first) text=text.slice(first,last+1);
    const obj=JSON.parse(text);
    const examples=Array.isArray(obj.examples) ? obj.examples : [];
    return {
      pattern: clean(obj.pattern || ''),
      meaning: clean(obj.meaning || ''),
      examples: examples.map(x=>({en:clean(x.en || x.english || ''), tr:clean(x.tr || x.turkish || '')})).filter(x=>x.en).slice(0,4)
    };
  }

  function fallbackExamples(w){
    const s=sentenceOf(w).toLowerCase();
    const gr=grammarOf(w);
    const out=[];
    const add=(en,tr)=>out.push({en,tr});
    if(/have you ever .*ridden.*camel/.test(s) || /ridden a camel/.test(s)){
      add('Have you ever ridden a horse before?','Daha önce ata bindin mi?');
      add('Have you ever driven a tractor before?','Daha önce traktör kullandın mı?');
      add('Have you ever sailed a boat before?','Daha önce tekne kullandın mı?');
      add('Have you ever flown in a helicopter before?','Daha önce helikoptere bindin mi?');
    }else if(/have you .*tried/.test(s)){
      add('Have you tried Turkish coffee before?','Daha önce Türk kahvesi denedin mi?');
      add('Have you tried this dish before?','Daha önce bu yemeği denedin mi?');
      add('Have you tried learning online before?','Daha önce çevrim içi öğrenmeyi denedin mi?');
      add('Have you tried speaking with a native speaker before?','Daha önce ana dili İngilizce olan biriyle konuşmayı denedin mi?');
    }else if(/finished .*ing/.test(s)){
      add('Have they finished cleaning the room yet?','Odayı temizlemeyi bitirdiler mi?');
      add('Have they finished decorating the room yet?','Odayı dekore etmeyi bitirdiler mi?');
      add('Have they finished repairing the room yet?','Odayı tamir etmeyi bitirdiler mi?');
      add('Have they finished checking the room yet?','Odayı kontrol etmeyi bitirdiler mi?');
    }else{
      add('I can use this sentence in a new situation.','Bu cümleyi yeni bir durumda kullanabilirim.');
      add('I can change the subject and keep the same structure.','Özneyi değiştirip aynı yapıyı koruyabilirim.');
      add('I can make a similar sentence at the same level.','Aynı seviyede benzer bir cümle kurabilirim.');
      add('I can practice this pattern with different words.','Bu kalıbı farklı kelimelerle çalışabilirim.');
    }
    return {pattern: gr || 'Aynı yapı', meaning:'Anlam benzerliği + aynı gramer + aynı seviye', examples:out.slice(0,4)};
  }

  function familyCardHTML(w, data){
    const gr=grammarOf(w)||'aynı yapı';
    const lvl=levelOf(w)||'';
    const examples=(data && Array.isArray(data.examples) ? data.examples : []).slice(0,4);
    return `<div class="wm-v21-title">📚 Benzer Cümleler <span class="wm-v21-chip">${esc(gr)}</span></div>
      <div class="wm-v21-sub">🎯 Anlam Benzerliği + 🏗️ Aynı Gramer${lvl ? ' + 📊 '+esc(lvl) : ''}</div>
      ${data?.pattern ? `<div class="wm-v21-sub">🏗️ Yapı: ${esc(data.pattern)}</div>` : ''}
      ${data?.meaning ? `<div class="wm-v21-sub">TR Anlam: ${esc(data.meaning)}</div>` : ''}
      ${examples.map((x,i)=>`<div class="wm-v21-family-item"><b>${i+1}. ${esc(x.en)}</b>${x.tr?`<div style="margin-top:5px;color:var(--muted);font-style:italic">${esc(x.tr)}</div>`:''}</div>`).join('')}
      <div class="wm-v21-row"><button class="wm-v21-btn ghost" onclick="wmV32SpeakFamily()">🔊 Aileyi Oku</button><button class="wm-v21-btn ghost wm-v33-prompt-btn" onclick="wmV33OpenFamilyPrompt()">📝 Promptu Düzenle</button><button class="wm-v21-btn ghost" onclick="wmV32ResetSentenceFamily()">↩ Gizle</button></div>`;
  }

  function loadingHTML(){
    return `<div class="wm-v21-title">📚 Benzer Cümleler</div><div class="wm-v33-loading">✨ Prompt ile benzer cümleler hazırlanıyor...</div><div class="wm-v21-row"><button class="wm-v21-btn ghost wm-v33-prompt-btn" onclick="wmV33OpenFamilyPrompt()">📝 Promptu Düzenle</button></div>`;
  }

  const oldGenerate = window.wmV32GenerateSentenceFamily;
  window.wmV32GenerateSentenceFamily = async function(){
    const card=document.getElementById('wmV21FamilyCard');
    const w=currentItem();
    if(!card || !w) return;
    ensureStyles();
    card.innerHTML=loadingHTML();
    const prompt=fillPrompt(getPrompt(), w);
    let data=null;
    try{
      if(typeof window.callAI === 'function'){
        const sys='You are an English teacher. Return only valid JSON. Do not add markdown.';
        const res=await window.callAI(sys, prompt, 'chat');
        const text=(res && (res.content || res.text || res.message)) || String(res || '');
        data=parseAIJSON(text);
      }
    }catch(e){
      console.warn('[Family Prompt] AI üretim başarısız, güvenli fallback kullanılacak:', e);
    }
    if(!data || !Array.isArray(data.examples) || data.examples.length===0){
      data=fallbackExamples(w);
    }
    window.__wmV32LastFamilyExamples = data.examples;
    card.dataset.wmV32Sentence=sentenceOf(w);
    card.dataset.wmV32Mode='generated';
    card.innerHTML=familyCardHTML(w,data);
  };

  const oldReset = window.wmV32ResetSentenceFamily;
  window.wmV32ResetSentenceFamily = function(){
    if(typeof oldReset === 'function') oldReset();
    setTimeout(wmV33InjectPromptButton, 0);
    setTimeout(wmV33InjectPromptButton, 120);
  };

  window.wmV33InjectPromptButton=function(){
    const card=document.getElementById('wmV21FamilyCard');
    if(!card) return;
    if(card.querySelector('.wm-v33-prompt-btn')) return;
    const row=card.querySelector('.wm-v21-row') || card;
    const btn=document.createElement('button');
    btn.className='wm-v21-btn ghost wm-v33-prompt-btn';
    btn.type='button';
    btn.textContent='📝 Promptu Düzenle';
    btn.onclick=window.wmV33OpenFamilyPrompt;
    row.appendChild(btn);
  };

  ['renderLearn'].forEach(fn=>{
    const old=window[fn];
    if(typeof old!=='function' || old.__wmV33PromptButton) return;
    const wrapped=function(){
      const r=old.apply(this, arguments);
      setTimeout(wmV33InjectPromptButton,0);
      setTimeout(wmV33InjectPromptButton,150);
      return r;
    };
    wrapped.__wmV33PromptButton=true;
    window[fn]=wrapped;
    try{ eval(fn+' = window[fn]'); }catch(e){}
  });
  document.addEventListener('DOMContentLoaded',()=>setTimeout(wmV33InjectPromptButton,700));
  setTimeout(wmV33InjectPromptButton,1200);
  console.log('✅ WM v33 Cümle Ailesi prompt editörü aktif');
})();


/* =====================================================================
   WM v34 — PDF/TXT kitap yükleme → yedek klasöre TXT kaydetme bağlantısı
   Bu katman, PDF/TXT metni WMStore'a kaydedildiğinde aynı metni seçilmiş
   yedek klasörüne .txt olarak da yazar. Eski load/save fonksiyonlarını
   daha toleranslı hale getirir.
   ===================================================================== */
(function(){
  if (window.__WM_BOOK_TXT_BACKUP_V34__) return;
  window.__WM_BOOK_TXT_BACKUP_V34__ = true;

  function wmBookToast(title, msg){
    try {
      if (typeof showToast === 'function') showToast(title, msg || '');
      else if (window.WM_Toast && typeof WM_Toast.show === 'function') WM_Toast.show('📚', String(title || '') + (msg ? ' - ' + msg : ''));
      else console.log('[BookBackup]', title, msg || '');
    } catch(e) { console.log('[BookBackup]', title, msg || ''); }
  }

  function wmGetBackupHandle(){
    try {
      if (typeof backupFolderHandle !== 'undefined' && backupFolderHandle) {
        window.backupFolderHandle = backupFolderHandle;
        return backupFolderHandle;
      }
    } catch(e) {}
    return window.backupFolderHandle || null;
  }

  async function wmEnsureBookPermission(handle){
    if (!handle) return false;
    try {
      if (!handle.queryPermission || !handle.requestPermission) return true;
      let perm = await handle.queryPermission({mode:'readwrite'});
      if (perm !== 'granted') perm = await handle.requestPermission({mode:'readwrite'});
      return perm === 'granted';
    } catch(e) {
      console.warn('[BookBackup] izin kontrolü yapılamadı:', e);
      return false;
    }
  }

  function wmSafeBookFileName(bookId, title){
    const id = String(bookId || ('book_' + Date.now())).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const name = String(title || 'kitap').replace(/\.(pdf|txt|epub)$/i,'').replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g, '_').replace(/^_+|_+$/g,'').slice(0, 70) || 'kitap';
    return `book_${id}_${name}.txt`;
  }

  async function wmWriteBookTxtToBackup(bookId, title, text){
    const handle = wmGetBackupHandle();
    if (!handle) {
      console.log('[BookBackup] Yedek klasörü seçili değil; TXT klasöre yazılmadı.');
      return false;
    }
    if (!(await wmEnsureBookPermission(handle))) {
      console.warn('[BookBackup] Yedek klasörü izni yok; TXT klasöre yazılmadı.');
      return false;
    }
    if (!text || !String(text).trim()) {
      console.warn('[BookBackup] Boş kitap metni; TXT yazılmadı:', bookId);
      return false;
    }
    try {
      const fileName = wmSafeBookFileName(bookId, title);
      const fileHandle = await handle.getFileHandle(fileName, {create:true});
      const writable = await fileHandle.createWritable();
      await writable.write(String(text));
      await writable.close();
      console.log('✅ Kitap TXT yedek klasörüne kaydedildi:', fileName, `(${String(text).length} karakter)`);
      return true;
    } catch(e) {
      console.error('[BookBackup] TXT yedekleme hatası:', e);
      return false;
    }
  }

  async function wmReadBookTxtFromBackup(bookId, title){
    const handle = wmGetBackupHandle();
    if (!handle || !(await wmEnsureBookPermission(handle))) return null;
    const exact = wmSafeBookFileName(bookId, title || 'kitap');
    const prefix = 'book_' + String(bookId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      try {
        const fh = await handle.getFileHandle(exact);
        const f = await fh.getFile();
        const t = await f.text();
        if (t && t.length) {
          console.log('✅ Kitap TXT yedek klasöründen okundu:', exact);
          return t;
        }
      } catch(e) {}
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.startsWith(prefix) && entry.name.toLowerCase().endsWith('.txt')) {
          const f = await entry.getFile();
          const t = await f.text();
          if (t && t.length) {
            console.log('✅ Kitap TXT yedek klasöründen okundu:', entry.name);
            return t;
          }
        }
      }
    } catch(e) {
      console.warn('[BookBackup] TXT okuma hatası:', e);
    }
    return null;
  }

  // Eski global fonksiyonları daha güvenli sürümle değiştir.
  window.saveBookToBackupFolder = async function(bookId, title, text){
    const ok = await wmWriteBookTxtToBackup(bookId, title, text);
    if (ok) wmBookToast('💾 Kitap TXT yedeklendi', String(title || bookId || 'Kitap'));
    return ok;
  };

  window.loadBookFromBackupFolder = async function(bookId, title){
    return await wmReadBookTxtFromBackup(bookId, title || '');
  };

  // WMStore.setBook çağrısını yakala: PDF/TXT upload metni IDB'ye yazılınca klasöre de yazılsın.
  function installWMStoreBookHook(){
    if (!window.WMStore && typeof WMStore === 'undefined') return false;
    const store = window.WMStore || WMStore;
    if (!store || !store.setBook || store.__bookBackupHookedV34) return !!(store && store.__bookBackupHookedV34);
    const originalSetBook = store.setBook.bind(store);
    store.setBook = async function(bookId, title, text){
      const result = await originalSetBook(bookId, title, text);
      try { await wmWriteBookTxtToBackup(bookId, title, text); } catch(e) { console.warn('[BookBackup] setBook sonrası TXT yazılamadı:', e); }
      return result;
    };
    store.__bookBackupHookedV34 = true;
    console.log('✅ WM v34 kitap TXT yedekleme bağlantısı aktif');
    return true;
  }

  if (!installWMStoreBookHook()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (installWMStoreBookHook() || tries > 40) clearInterval(timer);
    }, 250);
  }

  // PDF/TXT yükleme fonksiyonu doğrudan çağrılıyorsa ayrıca son güvenlik ağı.
  if (typeof processPDFFile === 'function' && !processPDFFile.__bookBackupWrappedV34) {
    const originalProcessPDFFile = processPDFFile;
    processPDFFile = async function(file){
      const before = Date.now();
      const res = await originalProcessPDFFile.apply(this, arguments);
      // Asıl kayıt WMStore.setBook hook'u ile yapılır; bu wrapper yalnızca log için tutulur.
      console.log('[BookBackup] PDF/TXT işleme tamamlandı:', file?.name || '', Date.now() - before + 'ms');
      return res;
    };
    processPDFFile.__bookBackupWrappedV34 = true;
  }
})();

