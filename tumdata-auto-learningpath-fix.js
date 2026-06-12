/* TumData otomatik yükleme + Öğrenme Yolu aktif dosya + modül yenileme düzeltmesi */
(function(){
  'use strict';
  const FILE_NAME = 'tumdata_temiz.xlsx';
  const FILE_URL = 'data/tumdata_temiz.xlsx';
  const DB_NAME = 'WordAppDB';
  const STORE = 'systemFiles';
  const KEY = 'data/tumdata_temiz.xlsx';

  const ALIAS = {
    level:['seviye','level','cefr','sentencelevel','sentence level'],
    module:['modül','modul','module','modulename','module name','ders','lesson'],
    part:['parça','parca','part','p','bolum','bölüm'],
    stage:['learningstage','learning stage','stage','aşama','asama'],
    en:['sentence','english','englishsentence','sentenceen','en','ingilizce','ingilizce cümle'],
    tr:['sentencetr','sentence tr','turkish','turkishsentence','tr','türkçe','turkce','türkçe cümle'],
    image:['image','imageurl','img','photo','picture','resim','görsel','gorsel']
  };

  function norm(s){
    return String(s||'').toLowerCase().trim()
      .replace(/[ı]/g,'i').replace(/[İ]/g,'i')
      .replace(/[ğ]/g,'g').replace(/[ü]/g,'u')
      .replace(/[ş]/g,'s').replace(/[ö]/g,'o').replace(/[ç]/g,'c')
      .replace(/[^a-z0-9]+/g,'');
  }
  function get(row, list){
    const keys = Object.keys(row||{});
    for(const wanted of list){
      const nw = norm(wanted);
      const k = keys.find(x=>norm(x)===nw);
      if(k && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
    }
    return '';
  }
  function safeText(s){ return String(s==null?'':s).trim(); }

  function idbPut(buffer){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(buffer, KEY);
        tx.oncomplete = ()=>resolve(true);
        tx.onerror = ()=>reject(tx.error);
      };
      req.onerror = ()=>reject(req.error);
    });
  }

  function readWorkbook(buffer){
    if(!window.XLSX) throw new Error('XLSX kütüphanesi bulunamadı. xlsx.full.min.js bu scriptlerden önce yüklenmeli.');
    const wb = XLSX.read(buffer, {type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, {defval:''});
  }

  function normalizeRows(rows){
    return rows.map((r,i)=>{
      const level = safeText(get(r, ALIAS.level)) || 'A';
      const module = safeText(get(r, ALIAS.module)) || 'Genel Modül';
      const part = safeText(get(r, ALIAS.part));
      const stage = safeText(get(r, ALIAS.stage));
      const en = safeText(get(r, ALIAS.en));
      const tr = safeText(get(r, ALIAS.tr));
      return Object.assign({}, r, {
        __id:i+1,
        level, seviye:level, Seviye:level,
        module, modul:module, 'Modül':module, Modul:module,
        part, parca:part, 'Parça':part,
        learningStage:stage, LearningStage:stage,
        sentence:en, Sentence:en, English:en,
        sentenceTr:tr, SentenceTR:tr, Turkish:tr,
        imageUrl:safeText(get(r, ALIAS.image))
      });
    }).filter(x=>x.sentence || x.Sentence || x.English);
  }

  function buildModules(rows){
    const map = new Map();
    rows.forEach(r=>{
      const key = [r.level, r.module, r.part, r.learningStage].filter(Boolean).join(' · ') || 'Genel Modül';
      if(!map.has(key)) map.set(key, {id:key, title:key, level:r.level, module:r.module, part:r.part, stage:r.learningStage, rows:[], count:0});
      const m = map.get(key); m.rows.push(r); m.count++;
    });
    return Array.from(map.values()).sort((a,b)=>String(a.id).localeCompare(String(b.id),'tr',{numeric:true}));
  }

  function ensureActiveFileUI(){
    let el = document.getElementById('activeDataFileName');
    if(!el){
      const h = Array.from(document.querySelectorAll('h1,h2,.title,.hero-title')).find(x=>/Öğrenme Yolu|Ogrenme Yolu/i.test(x.textContent));
      el = document.createElement('div');
      el.id = 'activeDataFileName';
      el.className = 'active-file-name';
      el.style.cssText = 'margin-top:8px;font-size:14px;color:#7dd3fc;font-weight:800;letter-spacing:.2px;';
      if(h && h.parentNode) h.insertAdjacentElement('afterend', el);
      else document.body.prepend(el);
    }
    return el;
  }
  function setActiveFileName(name, count, modCount){
    const txt = 'Aktif veri: ' + name + (count ? ' • ' + count + ' cümle' : '') + (modCount ? ' • ' + modCount + ' modül' : '');
    ensureActiveFileUI().textContent = txt;
    localStorage.setItem('activeDataFileName', name);
    localStorage.setItem('activeDataFileInfo', txt);
  }

  function updateVisibleCounters(modCount){
    // Öğrenme yolu üstündeki ilk sayı modül sayısı ise düzelt.
    const cards = Array.from(document.querySelectorAll('*')).filter(el=>/MODÜL/i.test(el.textContent||'') && el.children.length<=4);
    const card = cards.find(el=>/MODÜL/i.test(el.textContent||''));
    if(card){
      const num = Array.from(card.querySelectorAll('*')).find(x=>/^\d+$/.test((x.textContent||'').trim()));
      if(num) num.textContent = String(modCount);
    }
  }

  function callRenderHooks(rows, modules){
    window.TUMDATA_ROWS = rows;
    window.TUMDATA_MODULES = modules;
    window.learningPathRows = rows;
    window.learningPathModules = modules;
    window.currentLearningPathRows = rows;
    window.currentLearningPathModules = modules;
    localStorage.setItem('tumdata_rows_cache', JSON.stringify(rows.slice(0,2000))); // hızlı kontrol için ilk bölüm
    localStorage.setItem('tumdata_module_count', String(modules.length));

    const hookNames = ['renderLearningPath','renderLearningModules','buildLearningPath','initLearningPath','refreshLearningPath','loadLearningPath'];
    hookNames.forEach(fn=>{ try{ if(typeof window[fn]==='function') window[fn](modules, rows); }catch(e){ console.warn(fn+' çalışmadı:', e); } });
    window.dispatchEvent(new CustomEvent('tumdata:loaded', {detail:{rows, modules, fileName:FILE_NAME}}));
    updateVisibleCounters(modules.length);
  }

  async function loadTumDataFromGithub(){
    const btn = document.getElementById('loadTumDataBtn') || document.getElementById('tumDataAutoBtn');
    try{
      if(btn){ btn.disabled = true; btn.dataset.oldText = btn.textContent; btn.textContent = '⏳ TumData yükleniyor...'; }
      const url = FILE_URL + '?v=' + Date.now();
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('Dosya bulunamadı: ' + FILE_URL + ' / HTTP ' + res.status);
      const buffer = await res.arrayBuffer();
      await idbPut(buffer);
      const rawRows = readWorkbook(buffer);
      const rows = normalizeRows(rawRows);
      const modules = buildModules(rows);
      setActiveFileName(FILE_NAME, rows.length, modules.length);
      callRenderHooks(rows, modules);
      if(btn) btn.textContent = '✅ TumData aktif';
      console.log('✅ TumData otomatik yüklendi:', rows.length, 'cümle /', modules.length, 'modül');
      alert('TumData yüklendi: ' + rows.length + ' cümle / ' + modules.length + ' modül');
    }catch(err){
      console.error('TumData otomatik yükleme hatası:', err);
      alert('TumData yüklenemedi:\n' + (err && err.message ? err.message : err));
      if(btn) btn.textContent = '❌ TumData hata';
    }finally{
      if(btn){ setTimeout(()=>{ btn.disabled=false; btn.textContent = btn.dataset.oldText || '📥 TumData Yükle'; }, 1800); }
    }
  }

  function ensureButton(){
    let btn = document.getElementById('loadTumDataBtn') || document.getElementById('tumDataAutoBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'loadTumDataBtn';
      btn.textContent = '📥 TumData Yükle';
      btn.style.cssText='border:0;border-radius:14px;padding:10px 14px;font-weight:900;background:#2563eb;color:white;cursor:pointer;margin:4px;';
      const target = document.querySelector('.topbar,.toolbar,header,nav') || document.body;
      target.appendChild(btn);
    }
    btn.onclick = loadTumDataFromGithub;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureButton();
    const saved = localStorage.getItem('activeDataFileInfo') || localStorage.getItem('activeDataFileName');
    if(saved) ensureActiveFileUI().textContent = saved.startsWith('Aktif') ? saved : ('Aktif veri: ' + saved);
  });
  window.loadTumDataFromGithub = loadTumDataFromGithub;
})();
