/* ════════════════════════════════════════════════════════════════
   WordMode — modül: dictionary.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const dictSeed = {
  about:['hakkında','ebaut','A1','6.9','This book is about history.','Bu kitap tarih hakkındadır.'],
  because:['çünkü','bikoz','A1','7.1','I stayed home because it was raining.','Yağmur yağdığı için evde kaldım.'],
  through:['içinden / boyunca','tru','B1','6.3','We walked through the park.','Parkın içinden yürüdük.'],
  enough:['yeterli','inaf','A2','6.5','We have enough time.','Yeterince zamanımız var.'],
  thought:['düşünce','tot','B1','6.4','That was an interesting thought.','Bu ilginç bir düşünceydi.'],
  knowledge:['bilgi','nolic','B2','5.7','Knowledge is very important.','Bilgi çok önemlidir.'],
  achievement:['başarı','ıçivmınt','B2','5.2','Winning the prize was a big achievement.','Ödülü kazanmak büyük bir başarıydı.'],
  environment:['çevre','invayrınmınt','B1','5.8','We must protect the environment.','Çevreyi korumalıyız.'],
  schedule:['program','skedjul','B1','5.9','My schedule is very busy today.','Programım bugün çok yoğun.'],
  although:['rağmen','olzou','B2','5.5','Although he was tired, he continued working.','Yorgun olmasına rağmen çalışmaya devam etti.'],
  improve:['geliştirmek','impruv','A2','5.8','I want to improve my English.','İngilizcemi geliştirmek istiyorum.'],
  research:['araştırma','risörç','B2','5.6','She is doing research on language learning.','Dil öğrenimi üzerine araştırma yapıyor.'],
  opportunity:['fırsat','apartunıti','B2','5.4','This job is a great opportunity.','Bu iş büyük bir fırsat.'],
  successful:['başarılı','saksesfıl','B1','5.7','She became a successful doctor.','Başarılı bir doktor oldu.'],
  conversation:['sohbet','konvırseyşın','B1','5.3','We had a long conversation yesterday.','Dün uzun bir sohbet ettik.'],
  vocabulary:['kelime bilgisi','vokebyuleri','B2','4.9','Reading improves your vocabulary.','Okumak kelime bilginizi geliştirir.'],
  understand:['anlamak','andırstend','A1','6.4','I understand your problem.','Sorununu anlıyorum.'],
  journey:['yolculuk','cörni','A2','5.1','The journey took five hours.','Yolculuk beş saat sürdü.'],
  difficult:['zor','difikılt','A2','5.9','This question is difficult.','Bu soru zor.'],
  confident:['kendine güvenen','konfidınt','B2','5.0','She feels confident about the exam.','Sınav konusunda kendine güveniyor.']
};

// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// SOZLUK.JSON BOOTSTRAP: YEDEK KLASÖRÜ → GITHUB/PROJE → KLASÖRE KAYDET
// ══════════════════════════════════════════════════════════
const WM_SOZLUK_FILE_NAME = 'sozluk.json';
// İstersen Ayarlar/Console üzerinden set edebilirsin:
// localStorage.setItem('wm_sozluk_github_url','https://raw.githubusercontent.com/KULLANICI/REPO/main/sozluk.json')
function getSozlukGithubUrl(){
  return (localStorage.getItem('wm_sozluk_github_url') || window.WM_SOZLUK_GITHUB_URL || '').trim();
}
function setStartupDictStatus(msg){
  const el = document.getElementById('startupDictStatus');
  if(el){ el.style.display='block'; el.innerHTML = msg; }
  const mini = document.getElementById('myDictStatus');
  if(mini) mini.textContent = msg.replace(/<[^>]*>/g,'');
  console.log('[sozluk bootstrap]', msg.replace(/<[^>]*>/g,''));
}
function normalizeDictionaryPayload(payload){
  if(Array.isArray(payload)) return payload;
  if(payload && typeof payload === 'object'){
    if(Array.isArray(payload.words)) return payload.words;
    if(Array.isArray(payload.data)) return payload.data;
    return payload;
  }
  return [];
}
async function readSozlukFromBackupFolder(){
  if(!backupFolderHandle) return null;
  const fh = await backupFolderHandle.getFileHandle(WM_SOZLUK_FILE_NAME);
  const file = await fh.getFile();
  const text = await file.text();
  const json = JSON.parse(text);
  return normalizeDictionaryPayload(json);
}
async function writeSozlukToBackupFolder(jsonData){
  if(!backupFolderHandle) return false;
  const fh = await backupFolderHandle.getFileHandle(WM_SOZLUK_FILE_NAME, {create:true});
  const w = await fh.createWritable();
  await w.write(JSON.stringify(jsonData, null, 2));
  await w.close();
  return true;
}
async function fetchSozlukFromProjectOrGithub(){
  const sources = ['sozluk.json'];
  const raw = getSozlukGithubUrl();
  if(raw && !sources.includes(raw)) sources.push(raw);
  let lastErr = null;
  for(const url of sources){
    try{
      setStartupDictStatus(`⬇️ <b>sozluk.json</b> indiriliyor...<br><small>${url === 'sozluk.json' ? 'Aynı GitHub/proje klasörü' : 'GitHub raw URL'}</small>`);
      const res = await fetch(url, {cache:'reload'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = normalizeDictionaryPayload(await res.json());
      const count = Array.isArray(json) ? json.length : Object.keys(json||{}).length;
      if(!count) throw new Error('Sözlük boş görünüyor');
      return {json, source:url, count};
    }catch(e){ lastErr = e; console.warn('sozluk fetch failed:', url, e); }
  }
  throw lastErr || new Error('sozluk.json indirilemedi');
}
async function ensureSozlukJsonInBackupFolder(opts={}){
  const force = !!opts.force;
  const showStatus = opts.showStatus !== false;
  if(!backupFolderHandle){
    if(showStatus) setStartupDictStatus('⚠️ Yedekleme klasörü seçilmedi.');
    return null;
  }
  try{
    let dict = null;
    let source = 'Yedekleme klasörü';
    if(!force){
      try{
        if(showStatus) setStartupDictStatus('📦 <b>sozluk.json</b> yedekleme klasöründe aranıyor...');
        dict = await readSozlukFromBackupFolder();
        const count = Array.isArray(dict) ? dict.length : Object.keys(dict||{}).length;
        if(count){
          window.WM_Dictionary = dict;
          window.WM_DictionarySource = 'backup-folder';
          if(showStatus) setStartupDictStatus(`✅ <b>sozluk.json</b> klasörde bulundu. <b>${count}</b> kayıt hazır.`);
          return dict;
        }
      }catch(e){ console.log('sozluk.json klasörde yok veya okunamadı:', e.message); }
    }
    const fetched = await fetchSozlukFromProjectOrGithub();
    dict = fetched.json;
    await writeSozlukToBackupFolder(dict);
    window.WM_Dictionary = dict;
    window.WM_DictionarySource = fetched.source === 'sozluk.json' ? 'github-project' : 'github-raw';
    if(showStatus) setStartupDictStatus(`✅ <b>sozluk.json</b> indirildi ve yedekleme klasörüne kaydedildi. <b>${fetched.count}</b> kayıt hazır.`);
    if(typeof showToast === 'function') showToast('📚 Sözlük Hazır', `${fetched.count} kayıt yedek klasöründe`);
    return dict;
  }catch(e){
    if(showStatus) setStartupDictStatus(`⚠️ <b>sozluk.json indirilemedi.</b><br><small>GitHub’da index.html ile aynı klasöre sozluk.json koy veya raw URL ayarla.</small>`);
    console.error('sozluk bootstrap error:', e);
    return null;
  }
}
window.ensureSozlukJsonInBackupFolder = ensureSozlukJsonInBackupFolder;
window.refreshSozlukJsonFromGithub = async function(){ return ensureSozlukJsonInBackupFolder({force:true, showStatus:true}); };

// SÖZLÜĞÜM: sozluk.json / kullanıcı sözlüğü görüntüleyici
// ══════════════════════════════════════════════════════════
let myDictionaryRows = [];

function openMyDictionary(){ showScreen('sc-my-dictionary'); }

function normalizeMyDictEntry(word, entry){
  const e = entry || {};
  const w = String(word || e.Kelime || e.word || e.English || e.english || '').trim();
  let meanings = [];
  if (Array.isArray(e.meanings)) meanings = e.meanings;
  else if (Array.isArray(e.meaning)) meanings = e.meaning;
  else if (typeof e.meaning === 'string') meanings = [e.meaning];
  else if (typeof e.tr === 'string') meanings = [e.tr];
  else if (typeof e.turkish === 'string') meanings = [e.turkish];
  else if (typeof e.turkish_meaning === 'string') meanings = [e.turkish_meaning];
  ['anlam1','anlam2','anlam3','Turkish meaning','turkish_meaning'].forEach(k=>{ if(e[k]) meanings.push(e[k]); });
  const meaningText = meanings.map(x => String(x || '').trim()).filter(Boolean).join(', ');
  return {
    english: w,
    meaning: meaningText,
    pron: e['türkçe_okunuş'] || e.turkce_okunus || e.tr_pron || e.pron || e.pronunciation || e.turkish_pronunciation || '',
    cefr: String(e.seviye || e.cefr || e.level || '').toUpperCase(),
    zipf: e.zipf !== undefined ? String(e.zipf) : (e.Frekans !== undefined ? String(e.Frekans) : (e.frequency !== undefined ? String(e.frequency) : '')),
    example: e.example || e.example_en || '',
    tr: e.example_tr || e.translation || e.tr_sentence || ''
  };
}

async function loadMyDictionaryPage(forceReload){
  const status = document.getElementById('myDictStatus');
  if (status) status.textContent = 'Sözlük yükleniyor...';
  try {
    let dict = null;
    let source = '';
    const dictCount = d => Array.isArray(d) ? d.length : (d && typeof d === 'object' ? Object.keys(d).length : 0);
    if (!forceReload && window.WM_Dictionary && dictCount(window.WM_Dictionary)) {
      dict = window.WM_Dictionary;
      source = window.WM_DictionarySource === 'user' ? 'Kullanıcı sözlüğü' : 'Aktif sozluk.json';
    } else {
      if (backupFolderHandle && typeof ensureSozlukJsonInBackupFolder === 'function') {
        dict = await ensureSozlukJsonInBackupFolder({ force: !!forceReload, showStatus: true });
        if (dict) source = 'Yedekleme klasörü / sozluk.json';
      }
      if (!dict) {
        try {
          const res = await fetch('sozluk.json', { cache: forceReload ? 'reload' : 'default' });
          if (res.ok) {
            dict = await res.json();
            source = 'sozluk.json';
            window.WM_Dictionary = dict;
            window.WM_DictionarySource = 'fetch';
          }
        } catch(e) {}
      }
      if (!dict) {
        const saved = localStorage.getItem('wm_user_dictionary');
        if (saved) { dict = JSON.parse(saved); source = 'Kullanıcı sözlüğü'; }
      }
      if (!dict && window.WM_Dictionary) { dict = window.WM_Dictionary; source = 'Aktif sözlük'; }
    }
    if (!dict || (typeof dict !== 'object' && !Array.isArray(dict))) dict = [];
    myDictionaryRows = Array.isArray(dict)
      ? dict.map(e => normalizeMyDictEntry(null, e)).filter(r => r.english)
      : Object.keys(dict).map(k => normalizeMyDictEntry(k, dict[k])).filter(r => r.english);
    if (status) status.dataset.source = source || 'Sözlük';
    renderMyDictionaryPage();
  } catch(e) {
    myDictionaryRows = [];
    renderMyDictionaryPage('Sözlük okunamadı: ' + e.message);
  }
}

function getMyDictionaryVisibleRows(){
  const q = (document.getElementById('myDictSearch')?.value || '').toLowerCase().trim();
  const cefr = (document.getElementById('myDictCefr')?.value || '').toUpperCase();
  const sort = document.getElementById('myDictSort')?.value || 'az';
  let rows = myDictionaryRows.filter(r => {
    const hay = (r.english + ' ' + r.meaning + ' ' + r.pron).toLowerCase();
    return (!q || hay.includes(q)) && (!cefr || r.cefr === cefr);
  });
  const cefrOrder = {A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
  rows.sort((a,b)=>{
    if(sort==='za') return b.english.localeCompare(a.english);
    if(sort==='zipf') return (parseFloat(b.zipf)||0) - (parseFloat(a.zipf)||0);
    if(sort==='cefr') return (cefrOrder[a.cefr]||99) - (cefrOrder[b.cefr]||99) || a.english.localeCompare(b.english);
    return a.english.localeCompare(b.english);
  });
  return rows;
}

function renderMyDictionaryPage(errorMsg){
  const list = document.getElementById('myDictList');
  const status = document.getElementById('myDictStatus');
  if (!list) return;
  const rows = getMyDictionaryVisibleRows();
  const source = status?.dataset?.source || (window.WM_DictionarySource === 'user' ? 'Kullanıcı sözlüğü' : 'sozluk.json');
  if (status) status.textContent = errorMsg || `${source} · Toplam ${myDictionaryRows.length} kelime · Görünen ${rows.length}`;
  if (!rows.length) {
    list.innerHTML = `<div class="card" style="color:var(--muted);font-size:13px;line-height:1.6">Sözlük verisi bulunamadı. GitHub'a <b>index.html</b> ile aynı klasöre <b>sozluk.json</b> yükle veya JSON dosyasını buradan seç.</div>`;
    return;
  }
  list.innerHTML = rows.slice(0, 500).map(r => `
    <div class="wi" style="align-items:flex-start;cursor:default">
      <div class="wi-ico">📘</div>
      <div class="wi-body">
        <div class="wi-word">${esc(r.english)}</div>
        <div class="wi-tr">${esc(r.meaning || 'Anlam yok')}</div>
        ${r.example ? `<div style="font-size:12px;color:var(--sub);margin-top:6px;line-height:1.5">${esc(r.example)}</div>` : ''}
        ${r.tr ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;font-style:italic">${esc(r.tr)}</div>` : ''}
      </div>
      <div class="wi-badges">
        <span class="badge bp">${esc(r.pron || '-')}</span>
        <span class="badge bu">${esc(r.cefr || '?')}</span>
        <span class="badge bl">Zipf ${esc(r.zipf || '?')}</span>
      </div>
    </div>
  `).join('') + (rows.length > 500 ? `<div class="card" style="font-size:12px;color:var(--muted);text-align:center">Performans için ilk 500 sonuç gösteriliyor. Arama yaparak daraltabilirsin.</div>` : '');
}

function handleMyDictionaryUpload(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const data = JSON.parse(e.target.result);
      if(!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('JSON sözlük nesnesi olmalı');
      localStorage.setItem('wm_user_dictionary', JSON.stringify(data));
      window.WM_Dictionary = data;
      window.WM_DictionarySource = 'user';
      myDictionaryRows = Object.keys(data).map(k => normalizeMyDictEntry(k, data[k])).filter(r => r.english);
      const status = document.getElementById('myDictStatus');
      if(status) status.dataset.source = 'Yüklenen JSON';
      renderMyDictionaryPage();
      if(typeof showToast === 'function') showToast('✅ Sözlük yüklendi', myDictionaryRows.length + ' kelime');
    }catch(err){ alert('Geçersiz JSON: ' + err.message); }
    event.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function myDictionaryToTSV(rows){
  const header=['English','Turkish meaning','Turkish pronunciation','CEFR','Zipf','Example English sentence','Turkish translation'];
  return [header].concat(rows.map(r=>[r.english,r.meaning,r.pron,r.cefr,r.zipf,r.example,r.tr])).map(a=>a.map(x=>String(x||'').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t')).join('\n');
}
function copyMyDictionaryVisible(){
  const rows=getMyDictionaryVisibleRows();
  if(!rows.length){ alert('Kopyalanacak veri yok.'); return; }
  navigator.clipboard.writeText(myDictionaryToTSV(rows));
  if(typeof showToast==='function') showToast('📋 Kopyalandı', rows.length + ' kelime'); else alert('Kopyalandı.');
}
function downloadMyDictionaryVisibleCSV(){
  const rows=getMyDictionaryVisibleRows();
  if(!rows.length){ alert('İndirilecek veri yok.'); return; }
  const csv=myDictionaryToTSV(rows).replace(/\t/g, ',');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='sozlugum.csv'; a.click(); URL.revokeObjectURL(a.href);
}



// ══════════════════════════════════════════════════════════
// WORDMODE DATA FOLDER + GENİŞ SÖZLÜK
// Kalıcı veri seçilen yedekleme klasöründe tutulur.
// Browser storage sadece klasör izni ve küçük fallback için kullanılır.
// ══════════════════════════════════════════════════════════
let broadDictionaryRows = [];
let broadDictionaryIndex = new Map();
let broadCurrentWord = null;
window.broadFavoritesOnly = false;

const WM_DATA = {
  dir: null,
  ready: false,
  source: 'firatkaya_simple.json',
  favorites: [],
  studyWords: [],
  userDictionary: [],
  settings: {},
  aiCache: []
};

function safeArray(value){ return Array.isArray(value) ? value : []; }
function uniqueStrings(arr){ return [...new Set(safeArray(arr).map(x=>String(x||'').toLowerCase().trim()).filter(Boolean))]; }
function safeJsonParse(text, fallback){ try{ const v=JSON.parse(text); return v ?? fallback; }catch(e){ return fallback; } }

async function wmIdbOpen(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('WordModeDataHandleDB',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('handles');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function wmIdbGet(key){
  try{const db=await wmIdbOpen();return await new Promise((res,rej)=>{const tx=db.transaction('handles','readonly');const r=tx.objectStore('handles').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}catch(e){return null;}
}
async function wmIdbSet(key,val){
  try{const db=await wmIdbOpen();return await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');const r=tx.objectStore('handles').put(val,key);r.onsuccess=()=>res(true);r.onerror=()=>rej(r.error);});}catch(e){return false;}
}
async function wmVerifyPermission(handle, write=false){
  if(!handle || !handle.queryPermission) return false;
  const opts={mode:write?'readwrite':'read'};
  if(await handle.queryPermission(opts)==='granted') return true;
  if(await handle.requestPermission(opts)==='granted') return true;
  return false;
}
async function wmGetDir(path, create=false){
  if(!WM_DATA.dir) throw new Error('Yedekleme klasörü seçilmedi');
  let dir=WM_DATA.dir;
  for(const part of String(path||'').split('/').filter(Boolean)){
    dir=await dir.getDirectoryHandle(part,{create});
  }
  return dir;
}
async function wmReadJson(relPath, fallback){
  try{
    const parts=relPath.split('/').filter(Boolean);
    const fileName=parts.pop();
    const dir=await wmGetDir(parts.join('/'), false);
    const fh=await dir.getFileHandle(fileName);
    const file=await fh.getFile();
    return safeJsonParse(await file.text(), fallback);
  }catch(e){ return fallback; }
}
async function wmWriteJson(relPath, data){
  if(!WM_DATA.dir) return false;
  try{
    const ok=await wmVerifyPermission(WM_DATA.dir,true);
    if(!ok) throw new Error('Klasör yazma izni verilmedi');
    const parts=relPath.split('/').filter(Boolean);
    const fileName=parts.pop();
    const dir=await wmGetDir(parts.join('/'), true);
    const fh=await dir.getFileHandle(fileName,{create:true});
    const writable=await fh.createWritable();
    await writable.write(JSON.stringify(data,null,2));
    await writable.close();
    return true;
  }catch(e){ console.warn('Veri kaydedilemedi:', relPath, e); return false; }
}
function wmUpdateFolderStatus(extra){
  const el=document.getElementById('wmBackupFolderStatus');
  if(!el) return;
  if(WM_DATA.dir){
    el.innerHTML = `✅ Aktif klasör: <b>${esc(WM_DATA.dir.name || 'WordModeData')}</b><br>` +
      `Favori: ${WM_DATA.favorites.length} · Çalışılacak: ${WM_DATA.studyWords.length} · Sözlüğüm: ${WM_DATA.userDictionary.length}` +
      (extra ? `<br><span style="color:var(--green)">${esc(extra)}</span>` : '');
  }else{
    el.textContent = 'Klasör seçilmedi. Seçersen tüm kalıcı veriler dosya olarak bu klasöre yazılır.';
  }
}
async function chooseWordModeDataFolder(){
  if(!window.showDirectoryPicker){
    alert('Bu özellik Chrome/Edge üzerinde http://localhost veya https ile çalışır. HTML dosyasını çift tıklamak yerine python -m http.server 8000 ile aç.');
    return;
  }
  try{
    const dir=await window.showDirectoryPicker({mode:'readwrite'});
    const ok=await wmVerifyPermission(dir,true);
    if(!ok) throw new Error('Klasör izni verilmedi');
    WM_DATA.dir=dir; WM_DATA.ready=true;
    await wmIdbSet('wordmode-data-dir', dir);
    await syncWordModeDataFolder();
    await ensureWordModeFolderFiles();
    wmUpdateFolderStatus('Klasör bağlandı ve dosya yapısı hazırlandı.');
    if(typeof showToast==='function') showToast('📁 Yedekleme klasörü bağlandı', dir.name || 'WordModeData');
  }catch(e){ alert('Klasör seçilemedi: ' + (e.message||e)); }
}
async function restoreWordModeDataFolder(){
  const dir=await wmIdbGet('wordmode-data-dir');
  if(dir && await wmVerifyPermission(dir,true)){
    WM_DATA.dir=dir; WM_DATA.ready=true;
    await syncWordModeDataFolder(false);
    wmUpdateFolderStatus('Önceki klasör bağlantısı geri yüklendi.');
  }else wmUpdateFolderStatus();
}
async function ensureWordModeFolderFiles(){
  await wmWriteJson('user/favorites.json', WM_DATA.favorites);
  await wmWriteJson('user/study_words.json', WM_DATA.studyWords);
  await wmWriteJson('user/my_dictionary.json', WM_DATA.userDictionary);
  await wmWriteJson('user/settings.json', WM_DATA.settings || {});
  await wmWriteJson('user/ai_cache.json', safeArray(WM_DATA.aiCache).slice(0,20));
}
async function syncWordModeDataFolder(showMsg=true){
  if(!WM_DATA.dir){ wmUpdateFolderStatus(); if(showMsg) alert('Önce yedekleme klasörü seç.'); return; }
  WM_DATA.favorites = uniqueStrings(await wmReadJson('user/favorites.json', []));
  WM_DATA.studyWords = safeArray(await wmReadJson('user/study_words.json', []));
  WM_DATA.userDictionary = safeArray(await wmReadJson('user/my_dictionary.json', []));
  WM_DATA.settings = await wmReadJson('user/settings.json', {});
  WM_DATA.aiCache = safeArray(await wmReadJson('user/ai_cache.json', [])).slice(0,20);
  await loadBroadDictionaryFromFolder(false);
  wmUpdateFolderStatus(showMsg ? 'Klasör verileri okundu.' : '');
  renderBroadDictionaryPage();
}
async function loadBroadDictionaryFromFolder(render=true){
  if(!WM_DATA.dir) return false;
  const data = await wmReadJson('dictionary/firatkaya_simple.json', null);
  if(Array.isArray(data)){
    setBroadDictionaryData(data, 'Yedekleme klasörü/dictionary/firatkaya_simple.json');
    if(render) renderBroadDictionaryPage();
    return true;
  }
  return false;
}
function setBroadDictionaryData(data, source){
  broadDictionaryRows = safeArray(data).map(normalizeBroadDictEntry).filter(r => r.word);
  broadDictionaryIndex = new Map();
  for(const r of broadDictionaryRows){
    const k=String(r.word||'').toLowerCase();
    if(k && !broadDictionaryIndex.has(k)) broadDictionaryIndex.set(k,r);
  }
  WM_DATA.source = source || 'Geniş sözlük';
  const status=document.getElementById('broadDictStatus');
  if(status) status.dataset.source=WM_DATA.source;
}
function openBroadDictionary(){
  showScreen('sc-broad-dictionary');
  restoreWordModeDataFolder();
  if(!broadDictionaryRows.length) loadBroadDictionaryPage(false);
}
function normalizeBroadDictEntry(entry){
  const e = entry || {};
  const word = String(e.word || e.Kelime || e.english || '').trim();
  let meanings = [];
  if (Array.isArray(e.meanings)) meanings = e.meanings;
  else if (Array.isArray(e.anlamlar)) meanings = e.anlamlar;
  else if (typeof e.meaning === 'string') meanings = [e.meaning];
  else if (typeof e.tr === 'string') meanings = [e.tr];
  else if (typeof e.anlam1 === 'string') meanings = [e.anlam1,e.anlam2,e.anlam3];
  meanings = meanings.map(x => String(x || '').trim()).filter(Boolean);
  return { word, meanings, meaningText: meanings.join(', '), cefr:e.cefr||e.seviye||'', zipf:e.zipf||e.Zipf||'' };
}
async function loadBroadDictionaryPage(forceReload){
  const status = document.getElementById('broadDictStatus');
  if(status) status.textContent = 'Geniş sözlük yükleniyor...';
  try{
    if(await loadBroadDictionaryFromFolder(false)){ renderBroadDictionaryPage(); return; }
    let data = null, source = '';
    try{
      const res = await fetch('firatkaya_simple.json', { cache: forceReload ? 'reload' : 'default' });
      if(res.ok){ data = await res.json(); source = 'Aynı klasör/firatkaya_simple.json'; }
    }catch(e){}
    if(!Array.isArray(data)) throw new Error('firatkaya_simple.json okunamadı. Dosyayı yedekleme klasöründe dictionary/firatkaya_simple.json olarak bulundur veya JSON Yükle düğmesiyle seç.');
    setBroadDictionaryData(data, source);
    renderBroadDictionaryPage();
  }catch(err){
    broadDictionaryRows = [];
    renderBroadDictionaryPage('Geniş sözlük okunamadı: ' + err.message);
  }
}
function getBroadDictionaryVisibleRows(){
  const q = (document.getElementById('broadDictSearch')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('broadDictSort')?.value || 'az';
  let rows = broadDictionaryRows.filter(r => {
    const hay = (r.word + ' ' + r.meaningText).toLowerCase();
    return !q || hay.includes(q);
  });
  if(window.broadFavoritesOnly){ const favs=getBroadFavorites(); rows=rows.filter(r=>favs.includes(String(r.word||'').toLowerCase())); }
  rows.sort((a,b)=>{
    if(sort === 'za') return b.word.localeCompare(a.word);
    if(sort === 'meaningCount') return (b.meanings.length - a.meanings.length) || a.word.localeCompare(b.word);
    return a.word.localeCompare(b.word);
  });
  return rows;
}
function renderBroadDictionaryPage(errorMsg){
  const list = document.getElementById('broadDictList');
  const status = document.getElementById('broadDictStatus');
  if(!list) return;
  let rows = getBroadDictionaryVisibleRows();
  const source = status?.dataset?.source || WM_DATA.source || 'firatkaya_simple.json';
  const limit = parseInt(document.getElementById('broadDictLimit')?.value || '200', 10);
  if(status) status.textContent = errorMsg || `${source} · Toplam ${broadDictionaryRows.length} kelime · Eşleşen ${rows.length} · Gösterilen ${Math.min(rows.length, limit)}`;
  const favBtn = document.getElementById('broadFavFilterBtn');
  if(favBtn) favBtn.style.borderColor = window.broadFavoritesOnly ? 'var(--green)' : 'var(--border)';
  wmUpdateFolderStatus();
  if(!rows.length){
    list.innerHTML = `<div class="card" style="color:var(--muted);font-size:13px;line-height:1.6">Geniş sözlük verisi bulunamadı. <b>Yedekleme klasörü seç</b> ve içine <b>dictionary/firatkaya_simple.json</b> koy ya da JSON Yükle düğmesini kullan.</div>`;
    return;
  }
  const favs = getBroadFavorites();
  list.innerHTML = rows.slice(0, limit).map((r) => {
    const isFav = favs.includes(String(r.word||'').toLowerCase());
    const cefr = r.cefr || r.seviye || '';
    const zipf = r.zipf || r.Zipf || '';
    const cefrBadge = cefr ? `<span class="badge bp">${esc(cefr)}</span>` : `<span class="badge bu">CEFR yok</span>`;
    const zipfBadge = zipf ? `<span class="badge bl">Zipf ${esc(zipf)}</span>` : `<span class="badge bu">Zipf yok</span>`;
    return `
    <div class="wi" onclick="openBroadDictDetail('${encodeURIComponent(r.word)}')" style="align-items:flex-start;cursor:pointer">
      <div class="wi-ico">${isFav ? '⭐' : '🌍'}</div>
      <div class="wi-body">
        <div class="wi-word">${esc(r.word)}</div>
        <div class="wi-tr">${esc(r.meanings.slice(0, 6).join(' • ') || 'Anlam yok')}</div>
        ${r.meanings.length > 6 ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">+${r.meanings.length - 6} anlam daha var</div>` : ''}
      </div>
      <div class="wi-badges">
        <span class="badge bl">${r.meanings.length} anlam</span>
        ${cefrBadge}${zipfBadge}
      </div>
    </div>`;
  }).join('') + (rows.length > limit ? `<div class="card" style="font-size:12px;color:var(--muted);text-align:center">Performans için ${limit} sonuç gösteriliyor. Arama yaparak daraltabilirsin.</div>` : '');
}
async function handleBroadDictionaryUpload(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  try{
    const data = JSON.parse(await file.text());
    if(!Array.isArray(data)) throw new Error('JSON liste olmalı. Örnek: [{"word":"about","meanings":["yaklaşık"]}]');
    setBroadDictionaryData(data, 'Yüklenen JSON');
    if(WM_DATA.dir){
      await wmWriteJson('dictionary/firatkaya_simple.json', data);
      await ensureWordModeFolderFiles();
    }
    renderBroadDictionaryPage();
    if(typeof showToast === 'function') showToast('✅ Geniş sözlük yüklendi', broadDictionaryRows.length + ' kelime');
  }catch(err){ alert('Geçersiz JSON: ' + err.message); }
  event.target.value = '';
}
function broadDictionaryToTSV(rows){
  const header = ['English','Turkish meanings'];
  return [header].concat(rows.map(r => [r.word, r.meanings.join(' | ')])).map(a => a.map(x => String(x || '').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t')).join('\n');
}
function copyBroadDictionaryVisible(){
  const rows = getBroadDictionaryVisibleRows();
  if(!rows.length){ alert('Kopyalanacak veri yok.'); return; }
  navigator.clipboard.writeText(broadDictionaryToTSV(rows));
  if(typeof showToast === 'function') showToast('📋 Kopyalandı', rows.length + ' kelime'); else alert('Kopyalandı.');
}
function downloadBroadDictionaryVisibleCSV(){
  const rows = getBroadDictionaryVisibleRows();
  if(!rows.length){ alert('İndirilecek veri yok.'); return; }
  const csv = broadDictionaryToTSV(rows).replace(/\t/g, ',');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'genis_sozluk.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function getBroadFavorites(){ return uniqueStrings(WM_DATA.favorites); }
async function setBroadFavorites(arr){ WM_DATA.favorites=uniqueStrings(arr); await wmWriteJson('user/favorites.json', WM_DATA.favorites); }
function getBroadStudyWords(){ return safeArray(WM_DATA.studyWords); }
async function setBroadStudyWords(arr){ WM_DATA.studyWords=safeArray(arr); await wmWriteJson('user/study_words.json', WM_DATA.studyWords); }
async function setUserDictionary(arr){ WM_DATA.userDictionary=safeArray(arr); await wmWriteJson('user/my_dictionary.json', WM_DATA.userDictionary); }
function findBroadRow(word){
  const w=String(word||'').toLowerCase();
  return broadDictionaryIndex.get(w) || broadDictionaryRows.find(r=>String(r.word||'').toLowerCase().startsWith(w));
}
function openBroadDictDetail(encodedWord){
  const word=decodeURIComponent(encodedWord||'');
  const row=findBroadRow(word);
  if(!row) return;
  broadCurrentWord=row;
  const modal=document.getElementById('broadDictModal');
  document.getElementById('bdModalWord').textContent=row.word;
  document.getElementById('bdModalMeta').textContent=`${row.meanings.length} anlam · Geniş sözlük`;
  const cefr=row.cefr||row.seviye||'';
  const zipf=row.zipf||row.Zipf||'';
  document.getElementById('bdModalBadges').innerHTML=[
    `<span class="badge bl">${row.meanings.length} anlam</span>`,
    cefr?`<span class="badge bp">CEFR ${esc(cefr)}</span>`:`<span class="badge bu">CEFR verisi yok</span>`,
    zipf?`<span class="badge bl">Zipf ${esc(zipf)}</span>`:`<span class="badge bu">Zipf verisi yok</span>`
  ].join('');
  document.getElementById('bdModalMeanings').innerHTML=row.meanings.map((m,i)=>`<div style="padding:5px 0;border-bottom:1px solid var(--border)"><b style="color:var(--green)">${i+1}.</b> ${esc(m)}</div>`).join('');
  document.getElementById('bdMorphology').innerHTML=buildBroadMorphology(row.word);
  document.getElementById('bdSynAntBox').style.display='none';
  document.getElementById('bdExampleBox').style.display='none';
  document.getElementById('bdAIBox').style.display='none';
  updateBroadFavButton();
  modal.style.display='flex';
}
function closeBroadDictModal(){document.getElementById('broadDictModal').style.display='none';}
function updateBroadFavButton(){
  if(!broadCurrentWord) return;
  const favs=getBroadFavorites();
  const isFav=favs.includes(broadCurrentWord.word.toLowerCase());
  const btn=document.getElementById('bdFavBtn');
  if(btn) btn.textContent=isFav?'⭐ Favoriden Çıkar':'⭐ Favoriye Ekle';
}
async function toggleBroadFavorite(){
  if(!broadCurrentWord) return;
  const key=broadCurrentWord.word.toLowerCase();
  let favs=getBroadFavorites();
  favs=favs.includes(key)?favs.filter(x=>x!==key):favs.concat(key);
  await setBroadFavorites(favs); updateBroadFavButton(); renderBroadDictionaryPage();
  if(typeof showToast==='function') showToast('⭐ Favoriler güncellendi', broadCurrentWord.word);
}
function toggleBroadFavoriteFilter(){window.broadFavoritesOnly=!window.broadFavoritesOnly;renderBroadDictionaryPage();}
function showBroadStudyWords(){
  const words=getBroadStudyWords();
  const q=document.getElementById('broadDictSearch');
  if(q) q.value='';
  window.broadFavoritesOnly=false;
  const list=document.getElementById('broadDictList');
  const status=document.getElementById('broadDictStatus');
  if(status) status.textContent=`Çalışılacaklar · ${words.length} kelime`;
  if(!words.length){list.innerHTML='<div class="card" style="color:var(--muted);font-size:13px;text-align:center">Henüz çalışılacak kelime eklenmedi.</div>';return;}
  list.innerHTML=words.map(w=>`<div class="wi" onclick="openBroadDictDetail('${encodeURIComponent(w.word)}')"><div class="wi-ico">🎯</div><div class="wi-body"><div class="wi-word">${esc(w.word)}</div><div class="wi-tr">${esc(safeArray(w.meanings).slice(0,3).join(' • '))}</div></div><div class="wi-badges"><span class="badge bp">çalış</span></div></div>`).join('');
}
async function addBroadWordToStudy(){
  if(!broadCurrentWord) return;
  const key=broadCurrentWord.word.toLowerCase();
  let arr=getBroadStudyWords();
  if(!arr.some(x=>String(x?.word||'').toLowerCase()===key)) arr.unshift({word:broadCurrentWord.word,meanings:broadCurrentWord.meanings,addedAt:new Date().toISOString()});
  await setBroadStudyWords(arr.slice(0,1000));
  wmUpdateFolderStatus();
  if(typeof showToast==='function') showToast('🎯 Çalışılacaklara eklendi', broadCurrentWord.word); else alert('Çalışılacaklara eklendi.');
}
async function addBroadWordToMyDictionary(){
  if(!broadCurrentWord) return;
  let arr=safeArray(WM_DATA.userDictionary);
  const exists=arr.some(x=>String(x?.Kelime||x?.word||'').toLowerCase()===broadCurrentWord.word.toLowerCase());
  if(!exists){
    arr.unshift({Kelime:broadCurrentWord.word,Frekans:'',türkçe_okunuş:'',anlam1:broadCurrentWord.meanings[0]||'',anlam2:broadCurrentWord.meanings[1]||'',anlam3:broadCurrentWord.meanings[2]||'',seviye:broadCurrentWord.cefr||'',zipf:broadCurrentWord.zipf||'',addedAt:new Date().toISOString()});
    await setUserDictionary(arr);
  }
  wmUpdateFolderStatus();
  if(typeof showToast==='function') showToast(exists?'ℹ️ Zaten Sözlüğümde':'📚 Sözlüğüme eklendi', broadCurrentWord.word); else alert(exists?'Zaten Sözlüğümde':'Sözlüğüme eklendi');
}
function speakBroadDictWord(){
  if(!broadCurrentWord) return;
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(broadCurrentWord.word); u.lang='en-US'; u.rate=0.85; speechSynthesis.speak(u); }
  catch(e){alert('Tarayıcı seslendirmeyi desteklemiyor.');}
}
function buildBroadMorphology(word){
  const w=String(word||'').toLowerCase();
  const rules=[];
  const suffixes=[['ing','-ing: devam eden eylem / fiilimsi'],['ed','-ed: geçmiş zaman veya sıfat'],['ly','-ly: zarf yapabilir'],['ness','-ness: isim yapar'],['ment','-ment: isim yapar'],['tion','-tion: isim yapar'],['sion','-sion: isim yapar'],['able','-able: yapılabilir anlamı'],['less','-less: -siz / olmayan'],['ful','-ful: -li / dolu'],['er','-er: kişi veya karşılaştırma'],['est','-est: en üstünlük']];
  const prefixes=[['un','un-: olumsuzluk'],['re','re-: tekrar'],['pre','pre-: önce'],['dis','dis-: olumsuz / ters'],['mis','mis-: yanlış'],['over','over-: aşırı'],['under','under-: eksik / altında']];
  prefixes.forEach(([p,txt])=>{if(w.startsWith(p)&&w.length>p.length+2)rules.push(txt)});
  suffixes.forEach(([suf,txt])=>{if(w.endsWith(suf)&&w.length>suf.length+2)rules.push(txt)});
  if(!rules.length) return 'Belirgin bir İngilizce ön ek / son ek yakalanmadı. Bu kelime kök halde olabilir veya özel analiz gerektirebilir.';
  return rules.map(x=>`<div>• ${esc(x)}</div>`).join('');
}
async function loadBroadSynAnt(){
  if(!broadCurrentWord) return;
  const box=document.getElementById('bdSynAntBox'); box.style.display='block'; box.innerHTML='⏳ Synonym / antonym aranıyor...';
  try{
    const res=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(broadCurrentWord.word));
    if(!res.ok) throw new Error('Bulunamadı');
    const data=await res.json();
    const syn=new Set(), ant=new Set();
    safeArray(data).forEach(e=>safeArray(e.meanings).forEach(m=>{
      safeArray(m.synonyms).forEach(x=>syn.add(x)); safeArray(m.antonyms).forEach(x=>ant.add(x));
      safeArray(m.definitions).forEach(d=>{safeArray(d.synonyms).forEach(x=>syn.add(x));safeArray(d.antonyms).forEach(x=>ant.add(x));});
    }));
    box.innerHTML=`<b style="color:var(--green)">Synonyms:</b> ${esc([...syn].slice(0,20).join(', ')||'Bulunamadı')}<br><b style="color:var(--red)">Antonyms:</b> ${esc([...ant].slice(0,20).join(', ')||'Bulunamadı')}`;
  }catch(e){box.innerHTML='Synonym / antonym otomatik bulunamadı. AI açıklama düğmesiyle ürettirebilirsin.';}
}
function generateBroadExample(){
  if(!broadCurrentWord) return;
  const box=document.getElementById('bdExampleBox'); box.style.display='block';
  const meaning=broadCurrentWord.meanings[0]||'';
  const w=broadCurrentWord.word;
  box.innerHTML=`<b>EN:</b> I want to learn how to use the word <b style="color:var(--green)">${esc(w)}</b> correctly.<br><b>TR:</b> <b style="color:var(--green)">${esc(w)}</b> kelimesini doğru kullanmayı öğrenmek istiyorum.<br><span style="color:var(--muted)">İlk anlam: ${esc(meaning)}</span>`;
}
async function explainBroadWordAI(){
  if(!broadCurrentWord) return;
  const box=document.getElementById('bdAIBox'); box.style.display='block'; box.innerHTML='⏳ AI açıklama hazırlanıyor...';
  try{
    const sys='Sen İngilizce öğretmenisin. Türkçe, kısa ve öğretici anlat. Gereksiz uzun yazma.';
    const user=`Kelime: ${broadCurrentWord.word}\nTürkçe anlamlar: ${broadCurrentWord.meanings.join(' | ')}\nBu kelimeyi Türk öğrenciye açıkla. Şunları ver: kısa anlam, kullanım notu, 2 örnek cümle, eş/zıt anlamlılar varsa, akılda kalma ipucu.`;
    const txt=await callAI(sys,user,'askai');
    box.innerHTML=String(txt||'Yanıt alınamadı.').replace(/\n/g,'<br>');
    // Sadece son 20 AI açıklaması dosyada tutulur; localStorage kota şişmez.
    WM_DATA.aiCache = [{word:broadCurrentWord.word, text:String(txt||''), at:new Date().toISOString()}].concat(safeArray(WM_DATA.aiCache)).slice(0,20);
    await wmWriteJson('user/ai_cache.json', WM_DATA.aiCache);
  }catch(e){box.innerHTML='AI açıklama alınamadı. API anahtarını ve AI ayarlarını kontrol et. Hata: '+esc(e.message||e);}
}
restoreWordModeDataFolder();

let dictionaryRows = [];
function openDictBuilder(){ switchTab('dictbuilder'); }
function initDictBuilder(){
  const inp=document.getElementById('dictInput');
  if(inp && !inp.value) inp.value=localStorage.getItem('dictInput')||'';
  const saved=localStorage.getItem('dictionaryRows');
  if(saved && !dictionaryRows.length){try{dictionaryRows=JSON.parse(saved)||[];renderDictionaryRows();}catch(e){}}
}
function parseDictWords(){
  const raw=(document.getElementById('dictInput')?.value||'').trim();
  localStorage.setItem('dictInput', raw);
  return [...new Set(raw.split(/[\n,;\t]+/).map(w=>w.trim().toLowerCase()).filter(Boolean).map(w=>w.replace(/[^a-z\-']/g,'')).filter(Boolean))];
}
function estimateCEFR(word){
  const len=word.length;
  const common={be:'A1',have:'A1',do:'A1',say:'A1',go:'A1',get:'A1',make:'A1',know:'A1',think:'A1',take:'A1',see:'A1',come:'A1',want:'A1',use:'A1',find:'A1',give:'A1',tell:'A1',work:'A1',call:'A1',try:'A1'};
  if(common[word]) return common[word];
  if(len<=5) return 'A1'; if(len<=7) return 'A2'; if(len<=9) return 'B1'; if(len<=12) return 'B2'; return 'C1';
}
function estimateZipf(word){
  const cefr=estimateCEFR(word); const base={A1:6.3,A2:5.8,B1:5.3,B2:4.9,C1:4.4,C2:3.9}[cefr]||5.0;
  const adj=Math.max(-.6,Math.min(.4,(7-word.length)*0.07));
  return (base+adj).toFixed(1);
}
function turkishPronunciation(word){
  let w=word.toLowerCase();
  const specials={through:'tru',thought:'tot',enough:'inaf',because:'bikoz',about:'ebaut',knowledge:'nolic',achievement:'ıçivmınt',environment:'invayrınmınt',schedule:'skedjul',although:'olzou',vocabulary:'vokebyuleri'};
  if(specials[w]) return specials[w];
  const rules=[[/tion$/g,'şın'],[/sion$/g,'jın'],[/ture$/g,'çır'],[/ough/g,'of'],[/ght/g,'t'],[/ph/g,'f'],[/ch/g,'ç'],[/sh/g,'ş'],[/th/g,'t'],[/ck/g,'k'],[/qu/g,'ku'],[/x/g,'ks'],[/w/g,'v'],[/c(?=e|i|y)/g,'s'],[/c/g,'k'],[/j/g,'c'],[/y$/g,'i'],[/ee/g,'i'],[/ea/g,'i'],[/oo/g,'u'],[/ou/g,'au'],[/ow/g,'au'],[/ai/g,'ey'],[/ay/g,'ey'],[/ei/g,'ey'],[/oa/g,'ou'],[/er$/g,'ır'],[/or$/g,'ır'],[/ar$/g,'ar'],[/e$/g,'']];
  for(const [re,rep] of rules) w=w.replace(re,rep);
  w=w.replace(/a/g,'a').replace(/e/g,'e').replace(/i/g,'i').replace(/o/g,'o').replace(/u/g,'u');
  return w.replace(/[^a-zçşğıöüı\-']/g,'').replace(/'/g,'');
}
function localMeaning(word){
  const map={hello:'merhaba',world:'dünya',book:'kitap',water:'su',food:'yiyecek',house:'ev',school:'okul',teacher:'öğretmen',student:'öğrenci',language:'dil',learn:'öğrenmek',speak:'konuşmak',read:'okumak',write:'yazmak',listen:'dinlemek',important:'önemli',beautiful:'güzel',happy:'mutlu',problem:'sorun',question:'soru',answer:'cevap',time:'zaman',day:'gün',night:'gece',friend:'arkadaş',family:'aile',money:'para',city:'şehir'};
  return map[word] || 'AI ile tamamlanmalı';
}
function makeLocalRow(word){
  if(dictSeed[word]) return {english:word,meaning:dictSeed[word][0],pron:dictSeed[word][1],cefr:dictSeed[word][2],zipf:dictSeed[word][3],example:dictSeed[word][4],tr:dictSeed[word][5]};
  const meaning=localMeaning(word);
  return {english:word,meaning,pron:turkishPronunciation(word),cefr:estimateCEFR(word),zipf:estimateZipf(word),example:`I want to learn the word "${word}".`,tr:`"${word}" kelimesini öğrenmek istiyorum.`};
}
function generateDictionaryLocal(){
  const words=parseDictWords();
  if(!words.length){alert('Önce kelime gir.');return;}
  dictionaryRows=words.map(makeLocalRow);
  renderDictionaryRows('Yerel sistemle oluşturuldu. Anlamı “AI ile tamamlanmalı” olan satırları AI ile tamamlatabilirsin.');
}
function renderDictionaryRows(status){
  const body=document.getElementById('dictTbody'); if(!body) return;
  body.innerHTML=dictionaryRows.map(r=>`<tr><td style="padding:8px;border-bottom:1px solid var(--border);font-weight:800;color:var(--green)">${esc(r.english)}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(r.meaning)}</td><td style="padding:8px;border-bottom:1px solid var(--border);color:var(--purple);font-weight:700">${esc(r.pron)}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(r.cefr)}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(r.zipf)}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(r.example)}</td><td style="padding:8px;border-bottom:1px solid var(--border)">${esc(r.tr)}</td></tr>`).join('');
  document.getElementById('dictResultCard').style.display=dictionaryRows.length?'block':'none';
  document.getElementById('dictStatus').textContent=status||`${dictionaryRows.length} kelime hazır.`;
  localStorage.setItem('dictionaryRows', JSON.stringify(dictionaryRows));
}
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
async function generateDictionaryAI(){
  const words=parseDictWords(); if(!words.length){alert('Önce kelime gir.');return;}
  const btn=document.getElementById('dictAIBtn'); if(btn){btn.disabled=true;btn.textContent='⏳ AI hazırlıyor...';}
  try{
    const sys='İngilizce-Türkçe kelime sözlüğü hazırlayan uzman bir dil verisi asistanısın. Sadece geçerli JSON array döndür. Alanlar: english, meaning, pron, cefr, zipf, example, tr. Türkçe okunuş Türk harfleriyle yazılmalı, İngilizce kelimenin aynısı olmamalı. CEFR A1-C2 arası olmalı. Zipf 1.0-7.5 arası tahmini sayı olmalı.';
    const user='Şu kelimeler için İngilizce-Türkçe sözlük verisi üret: '+words.join(', ');
    let oldToken=(window.aiTokenSettings&&aiTokenSettings.askai)||4000; if(window.aiTokenSettings) aiTokenSettings.askai=12000;
    const txt=await callAI(sys,user,'askai'); if(window.aiTokenSettings) aiTokenSettings.askai=oldToken;
    const jsonText=String(txt).replace(/```json|```/g,'').trim();
    const arr=JSON.parse(jsonText);
    dictionaryRows=arr.map(r=>({english:r.english||'',meaning:r.meaning||r.turkish_meaning||'',pron:r.pron||r.pronunciation||'',cefr:r.cefr||'',zipf:String(r.zipf||''),example:r.example||'',tr:r.tr||r.translation||''})).filter(r=>r.english);
    renderDictionaryRows('AI ile tamamlandı.');
  }catch(e){
    console.error(e); alert('AI çıktısı tabloya çevrilemedi. Yerel oluşturmayı kullan veya AI ayarlarını kontrol et. Hata: '+(e.message||e));
  }finally{if(btn){btn.disabled=false;btn.textContent='🤖 AI ile Tamamla';}}
}
function dictionaryToTSV(){
  const head=['English','Turkish meaning','Turkish pronunciation','CEFR level','Zipf frequency estimate','Example English sentence','Turkish translation'];
  const rows=dictionaryRows.map(r=>[r.english,r.meaning,r.pron,r.cefr,r.zipf,r.example,r.tr]);
  return [head,...rows].map(row=>row.map(v=>String(v??'').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t')).join('\n');
}
function copyDictionaryTable(){ if(!dictionaryRows.length){alert('Kopyalanacak tablo yok.');return;} navigator.clipboard.writeText(dictionaryToTSV()); alert('Tablo kopyalandı.'); }
function downloadDictionaryCSV(){
  if(!dictionaryRows.length){alert('İndirilecek tablo yok.');return;}
  const csv=dictionaryToTSV().replace(/\t/g,',');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='ingilizce_turkce_sozluk.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function clearDictionaryBuilder(){ dictionaryRows=[]; localStorage.removeItem('dictionaryRows'); renderDictionaryRows('Temizlendi.'); }


/* ===== extracted script block ===== */


(function(){
  function ensureMenuVisibility(){
    try{
      document.querySelectorAll('.feature-content.open').forEach(function(el){
        el.style.maxHeight='none';
        el.style.overflow='visible';
      });
      var bottom=document.getElementById('bottomNav');
      if(bottom){
        bottom.style.overflowX='auto';
        bottom.style.justifyContent='flex-start';
      }
      if(!document.getElementById('wmFloatingSettingsBtn')){
        var btn=document.createElement('button');
        btn.id='wmFloatingSettingsBtn';
        btn.title='Ayarlar';
        btn.innerHTML='⚙️';
        btn.onclick=function(){
          if(typeof switchTab==='function') switchTab('settings');
          else if(typeof showScreen==='function') showScreen('sc-settings');
        };
        document.body.appendChild(btn);
      }
    }catch(e){console.warn('menu visibility fix error',e);}
  }
  document.addEventListener('DOMContentLoaded', ensureMenuVisibility);
  window.addEventListener('load', ensureMenuVisibility);
  document.addEventListener('click', function(e){
    if(e.target && (e.target.closest('.feature-header') || e.target.id==='featuresToggleBtn')){
      setTimeout(ensureMenuVisibility, 80);
    }
  }, true);
  var oldToggle=window.toggleFeatureCategory;
  if(typeof oldToggle==='function'){
    window.toggleFeatureCategory=function(header){
      var r=oldToggle.apply(this, arguments);
      setTimeout(ensureMenuVisibility, 50);
      return r;
    };
  }
})();


/* ===== extracted script block ===== */


window.addEventListener('load', function(){
  try{
    if(document.getElementById('pronCoachTargetInput')){
      renderPFCProblemCards();
      renderPFCTarget((document.getElementById('pronCoachTargetInput').value||'think'));
    }
  }catch(e){console.warn('PFC init skipped',e);}
});


/* ===== extracted script block ===== */


/* STORAGE SAFE GUARD - quota hatalarında uygulama kırılmaz */
(function(){
  window.wmSafeJSONParseArray=function(key){
    try{ var v=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; }
  };
  window.wmSafeSetJSON=function(key,val,maxItems){
    try{
      if(Array.isArray(val) && maxItems) val=val.slice(0,maxItems);
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    }catch(e){
      try{
        if(Array.isArray(val)) localStorage.setItem(key, JSON.stringify(val.slice(0, Math.min(maxItems||20,20))));
        return true;
      }catch(_){ console.warn('Veri kaydedilemedi:', key); return false; }
    }
  };
})();


/* ===== extracted script block ===== */


(function(){
  function $(id){return document.getElementById(id)}
  window.wmOpenSpeakingWorld=function(){var o=$('wmSpeakingWorldOverlay'); if(o){o.classList.add('active');o.setAttribute('aria-hidden','false');}}
  window.wmCloseSpeakingWorld=function(){var o=$('wmSpeakingWorldOverlay'); if(o){o.classList.remove('active');o.setAttribute('aria-hidden','true');}}
  function addBtn(){
    if($('wmSpeakingWorldBtn')) return;
    var panel=$('lcPronFaceCoachPanel') || document.querySelector('.pfc-panel') || document.querySelector('.card') || document.body;
    var btn=document.createElement('button');
    btn.id='wmSpeakingWorldBtn';
    btn.type='button';
    btn.textContent='🎙️ AI Speaking World’a Geç';
    btn.onclick=window.wmOpenSpeakingWorld;
    if(panel && panel.parentNode){ panel.parentNode.insertBefore(btn, panel.nextSibling); }
    else document.body.appendChild(btn);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addBtn); else addBtn();
  setTimeout(addBtn,800);
  function safeJSON(k,def){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x||def}catch(e){return def}}
  window.wmSWReview=function(){
    var p=safeJSON('wm_pfc_v2_progress',{}); var keys=Object.keys(p).sort(function(a,b){return (p[a].avg||0)-(p[b].avg||0)});
    var weak=keys.slice(0,5); var out=$('wmSWReviewOut');
    out.innerHTML = weak.length ? ('<b>Bugün odaklan:</b><br>'+weak.map(function(k){return '• '+k+' — '+(p[k].avg||0)+'%'}).join('<br>')+'<br><br>Öneri: Her zayıf sesi 3 kelime içinde tekrar et.') : 'Henüz kayıt yok. Canlı Skor Koçu ile birkaç kelime çalışınca liste oluşacak.';
  }
  window.wmSWMemory=function(){
    var p=safeJSON('wm_pfc_v2_progress',{}); var keys=Object.keys(p); var out=$('wmSWMemoryOut');
    if(!keys.length){out.innerHTML='Henüz yeterli veri yok. Telaffuz koçunda kayıt yaptıkça hafıza dolacak.';return;}
    var weak=keys.filter(function(k){return (p[k].avg||100)<70});
    out.innerHTML='<b>Kişisel hafıza:</b><br>Toplam takip edilen ses: '+keys.length+'<br>Zayıf sesler: '+(weak.join(', ')||'yok')+'<br>Öneri: Kırmızı sesleri önce tek başına, sonra kelime içinde çalış.';
  }
  window.wmSWRPG=function(s){window.__wmScenario=s; var out=$('wmSWRPGOut'); out.innerHTML='<b>'+s+'</b> senaryosu seçildi.<br>Şimdi İngilizce bir cümle yaz ve analiz et.';}
  window.wmSWRPGAnalyze=function(){var t=($('wmSWRPGInput')||{}).value||''; var s=window.__wmScenario||'Genel konuşma'; var out=$('wmSWRPGOut'); if(!t.trim()){out.innerHTML='Önce İngilizce bir cümle yaz.';return;} var words=t.trim().split(/\s+/).length; out.innerHTML='<b>'+s+' analizi</b><br>Cümle: '+t.replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]})+'<br>Akıcılık: '+(words>=5?'🟢 iyi':'🟡 kısa')+'<br>Öneri: Cümleyi doğal hızda 2 kez söyle, sonra Canlı Skor Koçu ile telaffuzunu ölç.';}
})();


/* ===== extracted script block ===== */


/* ═══════════════════════════════════════════════════════
   AI CONTEXT TEACHER + WORD FAMILY TREE
   ═══════════════════════════════════════════════════════ */
