/* ════════════════════════════════════════════════════════════════
   WordMode — modül: fileupload.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

document.getElementById("fileInput").addEventListener("change",e=>{if(e.target.files[0])loadFile(e.target.files[0]);});
const dz=document.getElementById("dropZone");
dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("drag");});
dz.addEventListener("dragleave",()=>dz.classList.remove("drag"));
dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("drag");if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);});

function parseColorsColumn(str){
  const map={};
  if(!str||!str.trim()) return map;
  str.split(",").forEach(part=>{
    const ci=part.lastIndexOf(":");
    if(ci<1) return;
    const word=part.slice(0,ci).trim().toLowerCase().replace(/[^a-z]/g,"");
    const color=part.slice(ci+1).trim();
    if(word&&color) map[word]=color.startsWith("#")?color:"#"+color;
  });
  return map;
}

async function loadFile(file){
  console.log("📂 Dosya yükleniyor:", file.name, file.type, file.size);
  document.getElementById("errBox").style.display="none";
  
  if(!file.name.match(/\.(xlsx|xls)$/i)){
    showErr("Sadece .xlsx veya .xls dosyası yükleyebilirsin!");
    return;
  }
  
  const reader=new FileReader();
  reader.onerror=()=>showErr("Dosya okuma hatası!");
  reader.onload=async e=>{
    try{
      console.log("📖 Dosya okundu, parse ediliyor...");
      const wb=XLSX.read(e.target.result,{type:"array",cellStyles:true,cellRichText:true});
      console.log("✅ Workbook:", wb.SheetNames);
      const ws=wb.Sheets[wb.SheetNames[0]];
      const range=XLSX.utils.decode_range(ws["!ref"]||"A1");
      const headers={};
      for(let c=range.s.c;c<=range.e.c;c++){
        const cell=ws[XLSX.utils.encode_cell({r:range.s.r,c})];
        if(cell&&cell.v) headers[String(cell.v).trim().toLowerCase()]=c;
      }
      console.log("📋 Headers:", headers);
      const gc=(r,c)=>{if(c==null) return "";const cell=ws[XLSX.utils.encode_cell({r,c})];return cell?String(cell.v??""):"";};
      const colWord = headers["word"] ?? headers["kelime"] ?? headers["english"] ?? headers["en"] ?? 0;
      const colTr   = headers["translation"] ?? headers["translations"] ?? headers["tr"] ?? 
                      headers["türkçe"] ?? headers["turkce"] ?? headers["çeviri"] ?? 
                      headers["ceviri"] ?? headers["anlam"] ?? headers["meaning"] ?? 1;
      const colPh   = headers["phonetic"] ?? headers["fonetik"] ?? null;
      const colSent = headers["sentence"] ?? headers["cümle"] ?? headers["cumle"] ?? 
                      headers["example"] ?? headers["örnek"] ?? null;
      const colSentTr = headers["sentenceTr"] ?? headers["sentencetr"] ?? headers["sentence_tr"] ??
                        headers["Sentence Tr"] ?? headers["Sentence TR"] ?? headers["SENTENCE TR"] ??
                        headers["cümleçeviri"] ?? headers["cumle_ceviri"] ?? null;
      const colLevel = headers["sentencelevel"] ?? headers["sentence_level"] ?? headers["sentence level"] ??
                       headers["level"] ?? headers["cefr"] ?? headers["seviye"] ?? null;
      const colGrammar = headers["grammarstructure"] ?? headers["grammar_structure"] ?? headers["grammar structure"] ??
                         headers["grammar"] ?? headers["gramer"] ?? headers["gramer yapı"] ??
                         headers["gramer yapısı"] ?? headers["grameryapısı"] ?? headers["structure"] ?? null;
      
      // DEBUG: Sütunları konsola yazdır
      console.log("📊 Excel Sütunları:", Object.keys(headers));
      console.log("✅ sentenceTr sütunu bulundu:", colSentTr !== null, "- Index:", colSentTr);
      const colHL   = headers["highlights"] ?? null;
      const colColors = headers["colors"] ?? headers["renkler"] ?? null;
      const parsed=[];
      for(let r=range.s.r+1;r<=range.e.r;r++){
        let word=gc(r,colWord).trim();
        let tr=gc(r,colTr).trim();
        const sentence=colSent!=null?gc(r,colSent).trim():"";
        let foundVerb=null; // Scope dışına çıkar
        
        // Word VE translation varsa devam et (sentence opsiyonel)
        if(!word && !sentence) continue; // Hem word hem sentence boşsa skip
        
        // Word boşsa sentence'tan fiil çek
        if(!word && sentence){
          const sent=sentence.toLowerCase();
          
          // Yardımcı fiilleri cümleden temizle
          const auxVerbs=['am','is','are','was','were','be','been','have','has','had','do','does','did','done','will','would','can','could','should','shall','may','might','must'];
          let cleanSent=sent;
          auxVerbs.forEach(aux=>{
            cleanSent=cleanSent.replace(new RegExp('\\b'+aux+'\\b','gi'),'');
          });
          
          const sentWords=cleanSent.split(/\s+/).filter(w=>w.length>0);
          
          // 1. Database'de ara
          for(const w of sentWords){
            const clean=w.replace(/[^a-z]/g,'');
            if(clean.length<3) continue;
            
            const verbInfo=findVerbBase(clean);
            if(verbInfo.tr){ // Database'de bulundu
              word=verbInfo.base;
              foundVerb=clean;
              break;
            }
          }
          
          // 2. Database'de yoksa -ed/-ied/-ing/-s/-es pattern (min 3 harf)
          if(!word){
            const verbPattern=/\b(\w{3,}(?:ies|ied|es|ed|ing|s))\b/i;
            const verbMatch=cleanSent.match(verbPattern);
            if(verbMatch){
              foundVerb=verbMatch[1];
              const verbInfo=findVerbBase(foundVerb);
              word=verbInfo.base;
            }else{
              continue; // Kelime bulunamadı, bu satırı atla
            }
          }
        }
        
        // Translation boşsa placeholder
        if(!tr) tr="çeviri yok";
        
        // Highlights oluştur
        let highlights=colHL!=null?gc(r,colHL).split(",").map(h=>h.trim()).filter(Boolean):[];
        // foundVerb varsa highlights'a ekle
        if(foundVerb && !highlights.includes(foundVerb)){
          highlights.push(foundVerb);
        }
        // Highlights boşsa word ekle
        if(highlights.length===0) highlights=[word];
        
        const colorsRaw=colColors!=null?gc(r,colColors):"";
        parsed.push({
          rowNum: r+1,
          en: word,        // Quiz için 'en' alanı
          word,            // Mevcut kod için 'word' alanı
          tr,
          phonetic:  colPh!=null?gc(r,colPh):"",
          sentence,
          sentenceTr:colSentTr!=null?gc(r,colSentTr):"",
          sentenceLevel: colLevel!=null ? gc(r,colLevel).trim() : "",
          grammarStructure: colGrammar!=null ? gc(r,colGrammar).trim() : "",
          level: colLevel!=null ? gc(r,colLevel).trim() : "",
          grammar: colGrammar!=null ? gc(r,colGrammar).trim() : "",
          highlights,
          colors:    parseColorsColumn(colorsRaw),
        });
      }
      console.log("✅ Parse edildi:", parsed.length, "kelime");
      if(parsed.length<2){showErr("En az 2 kelime gerekli. Bulunan: "+parsed.length);return;}
      allWords=parsed;
      fileKey="wm_"+allWords.slice(0,3).map(w=>w.word).join("_");
      
      // ══════════════════════════════════════════════════════════
      // YEDEKLEME KLASÖRÜNE OTOMATİK KAYDET (TXT FORMAT)
      // ══════════════════════════════════════════════════════════
      try {
        await saveWordListToBackupFolder(file.name, parsed);
        console.log('💾 Kelime listesi yedekleme klasörüne kaydedildi');
      } catch(e) {
        console.error('⚠️ Yedekleme klasörüne kayıt hatası:', e);
        // Hata olsa bile devam et
      }
      
      // DOSYA BİLGİLERİNİ KAYDET (artık kullanılmıyor, sadece uyumluluk için)
      try {
        const fileInfo = {
          name: file.name,
          size: file.size,
          wordCount: parsed.length,
          uploadDate: new Date().toISOString(),
          fileKey: fileKey
        };
        localStorage.setItem('lastUploadedFile', JSON.stringify(fileInfo));
        localStorage.setItem('lastFileData', JSON.stringify(allWords));
        console.log('💾 Dosya bilgileri kaydedildi:', fileInfo.name);
      } catch(e) {
        console.error('❌ Dosya bilgisi kayıt hatası:', e);
      }
      
      const hasProg=loadProgress();
      words=allWords.filter(w=>!learnedSet.has(w.word));
      if(words.length===0){
        if(confirm("🎉 Tüm kelimeleri öğrendin! Baştan başlamak ister misin?")){clearProgress();words=[...allWords];startSession();}
        return;
      }
      if(hasProg&&learnedSet.size>0){
        const cont=confirm("📖 Kaldığın yerden devam et?\n✅ Öğrenilen: "+learnedSet.size+"\n📚 Kalan: "+words.length+"\n\nİptal = Baştan başla");
        if(!cont){clearProgress();words=[...allWords];}
      }
      startSession();
    }catch(ex){console.error("❌ Parse hatası:",ex);showErr("Dosya okunamadı: "+ex.message);}
  };
  reader.readAsArrayBuffer(file);
}

// ══════════════════════════════════════════════════════════
// OTOMATK DOSYA YÜKLEME SİSTEMİ
// ══════════════════════════════════════════════════════════

function checkLastUploadedFile(){
  try {
    console.log('📂 Son yüklenen dosya kontrol ediliyor...');
    
    const fileInfo = localStorage.getItem('lastUploadedFile');
    const fileData = localStorage.getItem('lastFileData');
    
    console.log('📦 lastUploadedFile:', fileInfo ? 'VAR' : 'YOK');
    console.log('📦 lastFileData:', fileData ? 'VAR (' + (fileData.length/1024).toFixed(1) + ' KB)' : 'YOK');
    
    if(!fileInfo || !fileData) {
      console.log('ℹ️ Son yüklenen dosya bulunamadı - banner gizli kalacak');
      document.getElementById('resumeBanner').style.display = 'none';
      return false;
    }
    
    // JSON parse denemesi
    try {
      const info = JSON.parse(fileInfo);
      const data = JSON.parse(fileData);
      
      console.log('✅ Dosya bilgisi parse edildi:', info.name, data.length, 'kelime');
      
      const fileNameEl = document.getElementById('lastFileName');
      const fileInfoEl = document.getElementById('lastFileInfo');
      
      if(fileNameEl) fileNameEl.textContent = info.name;
      if(fileInfoEl) {
        const uploadDate = new Date(info.uploadDate);
        fileInfoEl.textContent = `${info.wordCount} kelime • ${uploadDate.toLocaleDateString('tr-TR')}`;
      }
      
      document.getElementById('resumeBanner').style.display = 'block';
      console.log('✅ Banner gösteriliyor:', info.name);
      return true;
      
    } catch(parseError) {
      console.error('❌ JSON parse hatası:', parseError);
      console.log('🗑️ Bozuk veri temizleniyor...');
      localStorage.removeItem('lastUploadedFile');
      localStorage.removeItem('lastFileData');
      document.getElementById('resumeBanner').style.display = 'none';
      return false;
    }
    
  } catch(e) {
    console.error('❌ Son dosya kontrolü hatası:', e);
    document.getElementById('resumeBanner').style.display = 'none';
    return false;
  }
}

function loadLastFile(){
  try {
    console.log('📖 SON DOSYA YÜKLEME İSTEĞİ...');
    
    const fileData = localStorage.getItem('lastFileData');
    const fileInfo = localStorage.getItem('lastUploadedFile');
    
    console.log('📦 lastFileData:', fileData ? 'VAR' : 'YOK');
    console.log('📦 lastUploadedFile:', fileInfo ? 'VAR' : 'YOK');
    
    if(!fileData || !fileInfo) {
      console.error('❌ Dosya bilgisi eksik!');
      showToast('⚠️ Dosya Bulunamadı', 'Lütfen yeni dosya yükleyin');
      // clearLastFile() ÇAĞRILMASIN - kullanıcı tekrar deneyebilir
      return;
    }
    
    console.log('📄 JSON parse ediliyor...');
    const parsed = JSON.parse(fileData);
    const info = JSON.parse(fileInfo);
    
    console.log('✅ Parse başarılı:', info.name, parsed.length, 'kelime');
    
    allWords = parsed;
    fileKey = info.fileKey || "wm_"+allWords.slice(0,3).map(w=>w.word).join("_");
    
    const hasProg = loadProgress();
    words = allWords.filter(w=>!learnedSet.has(w.word));
    
    console.log('📊 Öğrenilen kelimeler:', learnedSet.size);
    console.log('📊 Kalan kelimeler:', words.length);
    
    if(words.length === 0){
      if(confirm("🎉 Tüm kelimeleri öğrendin! Baştan başlamak ister misin?")){
        clearProgress();
        words = [...allWords];
        startSession();
      }
      return;
    }
    
    if(hasProg && learnedSet.size > 0){
      const cont = confirm("📖 Kaldığın yerden devam et?\n✅ Öğrenilen: "+learnedSet.size+"\n📚 Kalan: "+words.length+"\n\nİptal = Baştan başla");
      if(!cont){
        clearProgress();
        words = [...allWords];
      }
    }
    
    showToast('✅ Dosya Yüklendi', info.name);
    startSession();
    
  } catch(e) {
    console.error('❌ SON DOSYA YÜKLEME HATASI:', e);
    console.error('Hata detayı:', e.message);
    console.error('Stack:', e.stack);
    showToast('❌ Yükleme Hatası', e.message);
    // clearLastFile() ÇAĞRILMASIN - sorun geçici olabilir
  }
}

function clearLastFile(){
  if(!confirm('⚠️ Son yüklenen dosya bilgisi silinecek. Emin misiniz?')){
    return;
  }
  
  try {
    localStorage.removeItem('lastUploadedFile');
    localStorage.removeItem('lastFileData');
    document.getElementById('resumeBanner').style.display = 'none';
    showToast('🗑️ Temizlendi', 'Yeni dosya yükleyebilirsiniz');
    console.log('🗑️ Son dosya bilgisi kullanıcı tarafından silindi');
  } catch(e) {
    console.error('❌ Dosya silme hatası:', e);
    showToast('❌ Hata', 'Silme işlemi başarısız');
  }
}

// Sayfa yüklendiğinde kontrol et
function initUploadScreen(){
  checkLastUploadedFile();
}

// ══════════════════════════════════════════════════════════
// PROGRESS PERSISTENCE
// ══════════════════════════════════════════════════════════
// Klasöre yazma için debounce timer (sık çağrılmalarda kasma önler)
function initPDFBooks(){
  renderPDFBookList().catch(console.error);
  // Drop zone stil
  const dz = document.getElementById('pdfDropZone');
  if(dz){
    dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.style.borderColor='var(--blue)'; });
    dz.addEventListener('dragleave', ()=>{ dz.style.borderColor='var(--border)'; });
    dz.addEventListener('drop', e=>{
      e.preventDefault(); dz.style.borderColor='var(--border)';
      const file = e.dataTransfer?.files?.[0];
      if(file) processPDFFile(file);
    });
  }
}

async function handlePDFUpload(event){
  const file = event.target.files?.[0];
  if(!file) return;
  await processPDFFile(file);
  event.target.value = ''; // reset input
}

async function processPDFFile(file){
  const ext = file.name.split('.').pop().toLowerCase();
  const maxSize = 20 * 1024 * 1024; // 20MB
  if(file.size > maxSize){ showToast('❌ Dosya çok büyük', 'Maks 20MB'); return; }

  showPDFProgress(true, 'Dosya okunuyor...', 5);

  try {
    let text = '';
    if(ext === 'txt'){
      text = await readTxtFile(file);
      showPDFProgress(true, 'Metin işleniyor...', 80);
    } else if(ext === 'pdf'){
      text = await extractPDFText(file);
    } else {
      showToast('❌ Desteklenmiyor', 'PDF veya TXT yükleyin');
      showPDFProgress(false);
      return;
    }

    if(!text || text.trim().length < 100){
      showToast('❌ Metin çıkarılamadı', 'PDF taranmış görsel olabilir');
      showPDFProgress(false);
      return;
    }

    // Kaydet
    const bookId = 'pdf_' + Date.now();
    const meta = { title: file.name.replace(/\.(pdf|txt|epub)$/i,''), author: 'Yüklenen Dosya', level: 'intermediate', isPDF: true, size: text.length, date: Date.now() };

    // Meta: localStorage + WMStore'a kaydet
    const metaStr = JSON.stringify(meta);
    localStorage.setItem('book_meta_'+bookId, metaStr);
    WMStore.set('book_meta_'+bookId, metaStr).catch(()=>{});
    
    // Metin: WMStore'a kaydet (IDB + klasör)
    try{ await WMStore.setBook(bookId, meta.title, text); }catch(e){ console.warn('Kitap kayıt hatası:',e); }

    // ══════════════════════════════════════════════════════════
    // PDF/TXT → YEDEK KLASÖRÜNE .txt OLARAK YAZ (doğrudan bağlantı)
    // WMStore.setBook hook'una güvenmeden, upload akışında garantili çağrı.
    // ══════════════════════════════════════════════════════════
    try{
      if(typeof window.saveBookToBackupFolder === 'function'){
        const ok = await window.saveBookToBackupFolder(bookId, meta.title, text);
        if(ok) console.log('📚 Kitap TXT yedek klasörüne yazıldı:', meta.title);
        else console.log('ℹ️ Yedek klasörü seçili değil; kitap yalnızca IndexedDB\'ye kaydedildi.');
      }
    }catch(e){ console.warn('⚠️ Kitap TXT yedekleme hatası:', e); }

    showPDFProgress(true, '✅ Hazır!', 100);
    setTimeout(()=>{ showPDFProgress(false); renderPDFBookList().catch(console.error); }, 800);
    showToast('✅ Kitap yüklendi!', meta.title);

  } catch(e){
    console.error('PDF error:', e);
    showToast('❌ Hata', 'Dosya işlenemedi: '+e.message);
    showPDFProgress(false);
  }
}

function readTxtFile(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

async function extractPDFText(file){
  if(typeof pdfjsLib === 'undefined'){
    throw new Error('PDF.js yüklenemedi');
  }
  const arrayBuffer = await file.arrayBuffer();
  showPDFProgress(true, 'PDF yükleniyor...', 20);

  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  const totalPages = pdf.numPages;
  let fullText = '';

  for(let p=1; p<=Math.min(totalPages, 100); p++){
    showPDFProgress(true, `Sayfa ${p}/${Math.min(totalPages,100)} işleniyor...`, Math.round(20 + (p/Math.min(totalPages,100))*70));
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(item=>item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  if(totalPages > 100) fullText += '\n\n[... Dosya çok büyük, ilk 100 sayfa gösteriliyor ...]';
  return fullText;
}

function showPDFProgress(show, status='', pct=0){
  const el = document.getElementById('pdfUploadProgress');
  if(!el) return;
  el.style.display = show ? '' : 'none';
  if(show){
    document.getElementById('pdfUploadStatus').textContent = status;
    document.getElementById('pdfUploadBar').style.width = pct+'%';
  }
}

async function renderPDFBookList(){
  const el = document.getElementById('pdfBookList');
  if(!el) return;
  const books = [];
  // IDB + localStorage'dan tüm book_meta_ anahtarlarını tara
  const _allMeta = {};
  for(let k in localStorage){ if(k.startsWith('book_meta_')) _allMeta[k] = localStorage.getItem(k); }
  try { const _idb = await WMStore.getByPrefix('book_meta_'); Object.assign(_allMeta, _idb); } catch(e) {}
  for(const k in _allMeta){
    if(k.startsWith('book_meta_pdf_') || k.startsWith('book_meta_')){
      try{
        const meta = JSON.parse(_allMeta[k]);
        if(meta && meta.isPDF) books.push({id: k.replace('book_meta_',''), ...meta});
      }catch(e){}
    }
  }
  books.sort((a,b)=>b.date-a.date);

  if(books.length===0){
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">Henüz PDF yüklenmedi</div>';
    return;
  }

  el.innerHTML = books.map(b => {
    const kb = Math.round(b.size/1024);
    const date = new Date(b.date).toLocaleDateString('tr-TR');
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg2);border-radius:12px;cursor:pointer" onclick="openPDFBook('${b.id}')">
      <div style="font-size:24px">📄</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
        <div style="font-size:11px;color:var(--muted)">${kb}KB · ${date}</div>
      </div>
      <button onclick="event.stopPropagation();deletePDFBook('${b.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted)">🗑️</button>
    </div>`;
  }).join('');
}

async function openPDFBook(bookId){
  // Meta: localStorage → WMStore sırasıyla dene
  const metaRaw = localStorage.getItem('book_meta_'+bookId)
    || await WMStore.get('book_meta_'+bookId).catch(()=>null);
  if(!metaRaw){ showToast('❌ Kitap bulunamadı',''); return; }
  const meta = JSON.parse(metaRaw);

  showToast('⏳ Açılıyor...', meta.title);

  // Metin: WMStore.getBook (IDB → klasör → localStorage sırasıyla)
  const text = await WMStore.getBook(bookId).catch(()=>null);

  if(!text || text.trim().length < 50){
    showToast('❌ Metin bulunamadı', 'Dosyayı tekrar yükleyin');
    return;
  }

  // currentBook set et ve reader'a aç
  currentBook = {id: bookId, title: meta.title, author: meta.author||'', level: meta.level||'intermediate', emoji:'📄'};
  showScreen('sc-reader');
  document.getElementById('readerTitle').textContent = '📄 ' + meta.title;
  document.getElementById('readerBookInfo').innerHTML = `<b style="color:var(--text)">${meta.title}</b>`;

  // Chunk'lara böl
  const paragraphs = text.split(/\n\s*\n/).filter(p=>p.trim().length>20);
  const CHUNK_SIZE = 15;
  readerChunks = [];
  for(let i=0; i<paragraphs.length; i+=CHUNK_SIZE){
    readerChunks.push(paragraphs.slice(i,i+CHUNK_SIZE).join('\n\n'));
  }
  if(readerChunks.length === 0) readerChunks = [text]; // Tek blok

  const saved = localStorage.getItem('reader_progress_'+bookId)
    || await WMStore.get('reader_progress_'+bookId).catch(()=>null);
  readerChunkIdx = saved ? (JSON.parse(saved).chunk||0) : 0;
  renderReaderChunk();
}

async function deletePDFBook(bookId){
  await WMStore.deleteBook(bookId);
  localStorage.removeItem('book_meta_'+bookId);
  await WMStore.remove('book_meta_'+bookId);
  localStorage.removeItem('reader_progress_'+bookId);
  await WMStore.remove('reader_progress_'+bookId);
  await renderPDFBookList();
  showToast('🗑️ Silindi','');
}

// ══════════════════════════════════════════════════════════
// 🔔 HATIRLATMA SİSTEMİ
// ══════════════════════════════════════════════════════════

