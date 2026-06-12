/* TumData GitHub Loader v1
   Düğmeye basınca kullanıcıdan dosya seçmeden GitHub'daki data/tumdata_temiz.xlsx dosyasını indirir.
   - yol.html içinde readWorkbook(...) varsa veriyi doğrudan ekrana yükler.
   - ayrıca IndexedDB'ye yedekler.
*/
(function(){
  'use strict';

  const RAW_URL = 'https://raw.githubusercontent.com/sametegeli-oss/word/main/data/tumdata_temiz.xlsx';
  const FILE_KEY = 'data/tumdata_temiz.xlsx';
  const BTN_ID = 'btnLoadTumDataFromGithub';

  function toast(msg){
    const old = document.getElementById('tumDataGithubToast');
    if(old) old.remove();
    const el = document.createElement('div');
    el.id = 'tumDataGithubToast';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:999999;background:#0f172a;color:#fff;border:1px solid rgba(56,189,248,.45);box-shadow:0 10px 30px rgba(0,0,0,.35);border-radius:16px;padding:11px 14px;font-weight:850;max-width:92vw;font-family:system-ui,Arial,sans-serif';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3500);
  }

  function openDb(name, version, storeName){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = function(){
        const db = req.result;
        if(storeName && !db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function putKV(dbName, version, storeName, key, value){
    const db = await openDb(dbName, version, storeName);
    await new Promise((resolve, reject)=>{
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = ()=>reject(tx.error);
    });
    db.close();
  }

  async function saveBufferToIndexedDB(buffer){
    await putKV('WordAppDB', 1, 'systemFiles', FILE_KEY, buffer);
    await putKV('WordAppDB', 1, 'systemFiles', 'TumData_Temiz.xlsx', buffer);
    await putKV('wmStore', 1, 'kv', FILE_KEY, buffer);
    await putKV('wmStore', 1, 'kv', 'TumData_Temiz.xlsx', buffer);
    try{ localStorage.setItem('tumDataGithubLastLoad', new Date().toISOString()); }catch(e){}
  }

  async function loadTumDataFromGithub(){
    const btn = document.getElementById(BTN_ID);
    const oldText = btn ? btn.textContent : '';
    try{
      if(btn){ btn.disabled = true; btn.textContent = '⏳ TumData yükleniyor...'; }
      toast('TumData GitHub’dan indiriliyor...');

      const response = await fetch(RAW_URL + '?t=' + Date.now(), { cache:'no-store' });
      if(!response.ok) throw new Error('GitHub dosyası indirilemedi: HTTP ' + response.status);

      const buffer = await response.arrayBuffer();
      if(!buffer || buffer.byteLength < 1000) throw new Error('İndirilen dosya boş veya hatalı görünüyor.');

      await saveBufferToIndexedDB(buffer);

      // yol.html içinde mevcut okuyucu varsa dosyayı doğrudan sisteme yükle.
      if(typeof window.readWorkbook === 'function'){
        await window.readWorkbook(buffer, FILE_KEY);
        toast('✅ TumData yüklendi ve ekrana işlendi.');
      }else if(typeof window.importTumDataWorkbook === 'function'){
        await window.importTumDataWorkbook(buffer, FILE_KEY);
        toast('✅ TumData sisteme aktarıldı.');
      }else{
        toast('✅ TumData IndexedDB’ye kaydedildi. Sayfayı yenileyip kullanabilirsin.');
      }

      if(btn) btn.textContent = '✅ TumData güncellendi';
    }catch(err){
      console.error('TumData yükleme hatası:', err);
      toast('❌ TumData yüklenemedi: ' + (err && err.message ? err.message : err));
      if(btn) btn.textContent = '❌ Tekrar dene';
    }finally{
      if(btn){
        setTimeout(()=>{ btn.disabled = false; btn.textContent = oldText || '📊 TumData Güncelle'; }, 2200);
      }
    }
  }

  function makeButton(){
    if(document.getElementById(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.className = 'btn secondary tumdata-github-btn';
    btn.textContent = '📊 TumData Güncelle';
    btn.onclick = loadTumDataFromGithub;
    btn.style.marginLeft = '8px';

    // Öncelik: yol.html üst sağ buton grubu
    const heroRows = Array.from(document.querySelectorAll('.hero .row'));
    const topRow = heroRows.find(r => /Excel Yükle|Ayarlar|index\.html/i.test(r.textContent || ''));
    if(topRow){ topRow.insertBefore(btn, topRow.firstChild); return; }

    // index.html öğrenme yolu ekranındaki sağ üst buton alanı veya genel buton grubu
    const candidates = Array.from(document.querySelectorAll('.row, .hero-actions, .top-actions, header, .app'));
    const target = candidates.find(el => /Öğrenme Yolu|Ana Menü|Excel|Ayarlar/i.test(el.textContent || '')) || document.body;
    target.appendChild(btn);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeButton);
  else makeButton();

  window.loadTumDataFromGithub = loadTumDataFromGithub;
})();
