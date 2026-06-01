/* ════════════════════════════════════════════════════════════════
   WordMode — modül: user-profile.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let userProfile = {
  weakWords: [],           // Zorlandığı kelimeler
  strongTopics: [],        // İyi olduğu konular
  learningStyle: 'mixed',  // visual, auditory, kinesthetic, mixed
  preferredDifficulty: 'intermediate',
  totalMistakes: {},       // { word: count }
  totalCorrect: {},        // { word: count }
  lastUpdated: Date.now()
};

// LocalStorage'dan yükle
function loadUserProfile() {
  try {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      userProfile = { ...userProfile, ...JSON.parse(saved) };
    }
  } catch(e) {
    console.error('❌ User profile load error:', e);
  }
}

// Kaydet
function saveUserProfile() {
  try {
    userProfile.lastUpdated = Date.now();
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
  } catch(e) {
    console.error('❌ User profile save error:', e);
  }
}

// Hatalı cevap kaydet
function recordMistake(word) {
  if (!userProfile.totalMistakes[word]) {
    userProfile.totalMistakes[word] = 0;
  }
  userProfile.totalMistakes[word]++;
  
  // 3+ hata → weak word
  if (userProfile.totalMistakes[word] >= 3 && !userProfile.weakWords.includes(word)) {
    userProfile.weakWords.push(word);
    if (userProfile.weakWords.length > 20) {
      userProfile.weakWords.shift(); // En eski 20'yi tut
    }
  }
  
  saveUserProfile();
}

// Doğru cevap kaydet
function recordCorrect(word) {
  if (!userProfile.totalCorrect[word]) {
    userProfile.totalCorrect[word] = 0;
  }
  userProfile.totalCorrect[word]++;
  
  // 5+ doğru → weak words'den çıkar
  if (userProfile.totalCorrect[word] >= 5) {
    userProfile.weakWords = userProfile.weakWords.filter(w => w !== word);
  }
  
  saveUserProfile();
}

// AI'a kişiselleştirilmiş prompt ekle
function getPersonalizedPrompt() {
  let prompt = '';
  
  if (userProfile.weakWords.length > 0) {
    prompt += `\n\nKullanıcının zayıf olduğu kelimeler: ${userProfile.weakWords.slice(0, 5).join(', ')}`;
    prompt += `\nBu kelimelerle ilgili örnekler verirken daha detaylı açıkla.`;
  }
  
  if (userProfile.learningStyle === 'visual') {
    prompt += `\n\nKullanıcı görsel öğrenen biri. Mümkünse görsel betimlemeler, örnekler kullan.`;
  } else if (userProfile.learningStyle === 'auditory') {
    prompt += `\n\nKullanıcı işitsel öğrenen biri. Telaffuz, ritim, ses ile ilgili açıklamalar ekle.`;
  }
  
  return prompt;
}

// Sayfa yüklendiğinde profile'ı yükle
loadUserProfile();

// 9. Otomatik ses ayarı
let autoPlayAudio=false;

// 10. Tekrar sistemi - yanlış kelimeler
let wrongWords=new Set();
let wordAttempts={};

// SM = Sentence Mode, LM = Letter Mode, FC = Flashcard Mode
let smWords=[], smIdx=0, smRecognition=null, smListening=false;
let lmWords=[], lmIdx=0, lmAnswer=[];
let lmSelectedIdxs=[];
let fcWords=[], fcIdx=0, fcFlipped=false;

// Session timing
let sessionStart=Date.now(), todayMinutes=0;

// Motivasyon Sistemi
let dailyGoal = parseInt(localStorage.getItem('dailyGoal')) || 20;
let todayLearned = 0;
let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
let longestStreak = parseInt(localStorage.getItem('longestStreak')) || 0;
let lastActiveDate = localStorage.getItem('lastActiveDate') || '';
let badges = JSON.parse(localStorage.getItem('badges') || '[]');
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
let totalXP = parseInt(localStorage.getItem('totalXP')) || 0;

// Rozet tanımları
const BADGES = {
  first_word: { id: 'first_word', name: 'İlk Adım', desc: 'İlk kelimeyi öğren', icon: '🎯', requirement: 1 },
  ten_words: { id: 'ten_words', name: '10 Kelime', desc: '10 kelime öğren', icon: '📚', requirement: 10 },
  fifty_words: { id: 'fifty_words', name: '50 Kelime', desc: '50 kelime öğren', icon: '🌟', requirement: 50 },
  hundred_words: { id: 'hundred_words', name: '100 Kelime Ustası', desc: '100 kelime öğren', icon: '🏆', requirement: 100 },
  streak_3: { id: 'streak_3', name: '3 Gün Streak', desc: '3 gün üst üste çalış', icon: '🔥', requirement: 3 },
  streak_7: { id: 'streak_7', name: '1 Hafta Streak', desc: '7 gün üst üste çalış', icon: '⚡', requirement: 7 },
  streak_30: { id: 'streak_30', name: '1 Ay Streak', desc: '30 gün üst üste çalış', icon: '💎', requirement: 30 },
  perfect_score: { id: 'perfect_score', name: 'Mükemmel Skor', desc: "Skoru 100'de tut", icon: '🌈', requirement: 100, cat:'ozel' },
  five_hundred:  { id: 'five_hundred',  name: '500 Kelime',       desc: '500 kelime öğren',          icon: '💫', requirement: 500,  cat:'kelime' },
  thousand:      { id: 'thousand',      name: '1000 Kelime',      desc: '1000 kelime öğren',         icon: '👑', requirement: 1000, cat:'kelime' },
  streak_14:     { id: 'streak_14',     name: '2 Hafta Streak',   desc: '14 gün üst üste çalış',     icon: '💪', requirement: 14,   cat:'streak' },
  streak_100:    { id: 'streak_100',    name: '100 Gün Efsane',   desc: '100 gün üst üste çalış',    icon: '🦁', requirement: 100,  cat:'streak' },
  quiz_master:   { id: 'quiz_master',   name: 'Quiz Ustası',      desc: '10 quiz tamamla',            icon: '🧠', requirement: 10,   cat:'oyun' },
  speed_demon:   { id: 'speed_demon',   name: 'Hız Şeytanı',      desc: 'Hız testinde 20+ puan al',  icon: '⚡', requirement: 20,   cat:'oyun' },
  listener:      { id: 'listener',      name: 'Konuşyici',         desc: '5 dinleme testi tamamla',   icon: '👂', requirement: 5,    cat:'oyun' },
  first_book:    { id: 'first_book',    name: 'Kitap Kurdu',       desc: 'İlk kitabı aç',             icon: '📖', requirement: 1,    cat:'okuma' },
  early_bird:    { id: 'early_bird',    name: 'Sabahçı Kuş',       desc: "Sabah 7'den önce çalış",    icon: '🌅', requirement: 1,    cat:'ozel' },
  night_owl:     { id: 'night_owl',     name: 'Gece Baykuşu',      desc: "Gece 23'ten sonra çalış",   icon: '🦉', requirement: 1,    cat:'ozel' },
  srs_master:    { id: 'srs_master',    name: 'SRS Ustası',         desc: '10 kelimeyi Uzman yap',     icon: '🧬', requirement: 10,   cat:'ozel' },
};

// Kütüphane State
let libraryBooks = [];
let libraryLevel = 'intermediate';
let libraryCategory = 'classics';
let currentBook = null;
let readerChunks = [];
let readerChunkIdx = 0;
let readerAudioOn = false;

// ── Gutenberg kitap ID'leri (kategori bazlı) ──
const GUTENBERG_BOOKS = {
  classics: [
    {id:1342, title:'Pride and Prejudice', author:'Jane Austen', level:'intermediate', emoji:'💃'},
    {id:11,   title:'Alice in Wonderland', author:'Lewis Carroll', level:'beginner', emoji:'🐇'},
    {id:74,   title:'The Adventures of Tom Sawyer', author:'Mark Twain', level:'intermediate', emoji:'🚣'},
    {id:1661, title:'The Adventures of Sherlock Holmes', author:'Arthur Conan Doyle', level:'intermediate', emoji:'🔍'},
    {id:84,   title:'Frankenstein', author:'Mary Shelley', level:'advanced', emoji:'⚡'},
    {id:98,   title:'A Tale of Two Cities', author:'Charles Dickens', level:'advanced', emoji:'🏰'},
    {id:2701, title:'Moby Dick', author:'Herman Melville', level:'advanced', emoji:'🐋'},
    {id:1952, title:'The Yellow Wallpaper', author:'Charlotte Perkins Gilman', level:'intermediate', emoji:'📄'},
    {id:45,   title:'Anne of Green Gables', author:'L.M. Montgomery', level:'beginner', emoji:'🌿'},
    {id:76,   title:'Adventures of Huckleberry Finn', author:'Mark Twain', level:'intermediate', emoji:'🛶'},
  ],
  'short-stories': [
    {id:23,   title:'Narrative of the Life of Frederick Douglass', author:'Frederick Douglass', level:'intermediate', emoji:'✊'},
    {id:910,  title:'The Call of the Wild', author:'Jack London', level:'intermediate', emoji:'🐺'},
    {id:160,  title:'The Scarlet Letter', author:'Nathaniel Hawthorne', level:'advanced', emoji:'🔴'},
    {id:5200, title:'Metamorphosis', author:'Franz Kafka', level:'advanced', emoji:'🪲'},
    {id:174,  title:'The Picture of Dorian Gray', author:'Oscar Wilde', level:'advanced', emoji:'🖼️'},
    {id:219,  title:'Heart of Darkness', author:'Joseph Conrad', level:'advanced', emoji:'🌑'},
    {id:1260, title:'Jane Eyre', author:'Charlotte Bronte', level:'intermediate', emoji:'🕯️'},
    {id:36,   title:'The War of the Worlds', author:'H.G. Wells', level:'intermediate', emoji:'👾'},
    {id:1080, title:'The Gift of the Magi', author:'O. Henry', level:'beginner', emoji:'🎁'},
    {id:30254,title:'The Story of My Life', author:'Helen Keller', level:'beginner', emoji:'✋'},
  ],
  'fairy-tales': [
    {id:19994,title:"Grimm's Fairy Tales", author:'Brothers Grimm', level:'beginner', emoji:'🧚'},
    {id:1597, title:"Aesop's Fables", author:'Aesop', level:'beginner', emoji:'🦊'},
    {id:16,   title:'Peter Pan', author:'J.M. Barrie', level:'beginner', emoji:'🧒'},
    {id:55,   title:"The Wonderful Wizard of Oz", author:'L. Frank Baum', level:'beginner', emoji:'🌈'},
    {id:521,  title:'The Secret Garden', author:'Frances Hodgson Burnett', level:'beginner', emoji:'🌷'},
    {id:514,  title:'Little Women', author:'Louisa May Alcott', level:'intermediate', emoji:'👭'},
    {id:103,  title:'Around the World in 80 Days', author:'Jules Verne', level:'intermediate', emoji:'🌍'},
    {id:35,   title:'The Time Machine', author:'H.G. Wells', level:'intermediate', emoji:'⏰'},
  ],
  mystery: [
    {id:2852, title:'The Hound of the Baskervilles', author:'Arthur Conan Doyle', level:'intermediate', emoji:'🐕'},
    {id:108,  title:'The Jungle Book', author:'Rudyard Kipling', level:'beginner', emoji:'🐯'},
    {id:1400, title:'Great Expectations', author:'Charles Dickens', level:'advanced', emoji:'🎩'},
    {id:2554, title:'Crime and Punishment', author:'Fyodor Dostoevsky', level:'advanced', emoji:'⚖️'},
    {id:244,  title:'A Study in Scarlet', author:'Arthur Conan Doyle', level:'intermediate', emoji:'🔎'},
    {id:863,  title:'The Mystery of the Yellow Room', author:'Gaston Leroux', level:'intermediate', emoji:'🟡'},
    {id:1064, title:"The Red House Mystery", author:'A.A. Milne', level:'beginner', emoji:'🏠'},
    {id:3289, title:'Dracula', author:'Bram Stoker', level:'advanced', emoji:'🧛'},
  ]
};

const LEVEL_LABELS = {beginner:'🟢 A1-A2', intermediate:'🟡 B1-B2', advanced:'🔴 C1-C2'};

function loadLibraryCategory(cat){
  libraryCategory = cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  event?.target?.closest('.category-btn')?.classList.add('active');
  renderLibraryBooks();
}

function setLibraryLevel(lvl){
  libraryLevel = lvl;
  document.querySelectorAll('.level-badge').forEach(b => b.classList.remove('active'));
  document.getElementById('lib-level-'+lvl)?.classList.add('active');
  renderLibraryBooks();
}

function renderLibraryBooks(){
  const books = GUTENBERG_BOOKS[libraryCategory] || [];
  const filtered = libraryLevel === 'all' ? books : books.filter(b => b.level === libraryLevel);
  const listEl = document.getElementById('libraryBookList');
  const countEl = document.getElementById('libraryBookCount');
  if(!listEl) return;

  countEl.textContent = filtered.length + ' kitap';

  if(filtered.length === 0){
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Bu seviyede kitap bulunamadı</div>';
    return;
  }

  listEl.innerHTML = filtered.map(book => {
    const saved = localStorage.getItem('reader_progress_'+book.id);
    const progress = saved ? JSON.parse(saved).pct || 0 : 0;
    return `<div class="library-book-card" onclick="openBook(${book.id})">
      <div style="font-size:28px;margin-right:12px">${book.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:14px;color:var(--text);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${book.title}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${book.author}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:10px;font-weight:700;color:${book.level==='beginner'?'#10b981':book.level==='intermediate'?'#f59e0b':'#ef4444'}">${LEVEL_LABELS[book.level]}</span>
          ${progress>0?`<span style="font-size:10px;color:var(--muted)">· %${progress} okundu</span>`:''}
        </div>
        ${progress>0?`<div style="height:3px;background:var(--bg3);border-radius:2px;margin-top:4px"><div style="height:100%;width:${progress}%;background:var(--green);border-radius:2px"></div></div>`:''}
      </div>
      <div style="font-size:20px;color:var(--muted)">›</div>
    </div>`;
  }).join('');

  // İndirilenler
  renderDownloadedBooks();
}

function renderDownloadedBooks(){
  const dlEl = document.getElementById('libraryDownloaded');
  if(!dlEl) return;
  const downloaded = [];
  Object.keys(localStorage).forEach(k => {
    if(k.startsWith('book_text_')){
      const id = k.replace('book_text_','');
      const meta = localStorage.getItem('book_meta_'+id);
      if(meta) downloaded.push({id, ...JSON.parse(meta)});
    }
  });
  if(downloaded.length === 0){
    dlEl.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">Henüz indirilmiş kitap yok</div>';
    return;
  }
  dlEl.innerHTML = downloaded.map(b =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--bg2);border-radius:10px;cursor:pointer" onclick="openBook(${b.id})">
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--text)">${b.title||'Kitap'}</div>
        <div style="font-size:11px;color:var(--green)">✅ İndirildi</div>
      </div>
      <button onclick="event.stopPropagation();deleteBook(${b.id})" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted)">🗑️</button>
    </div>`
  ).join('');
}

function deleteBook(id){
  localStorage.removeItem('book_text_'+id);
  localStorage.removeItem('book_meta_'+id);
  renderDownloadedBooks();
  showToast('🗑️ Silindi', 'Kitap kaldırıldı');
}

async function openBook(bookId){
  // Tüm kategorilerde ara
  let book = null;
  for(const cat of Object.values(GUTENBERG_BOOKS)){
    book = cat.find(b => b.id === bookId);
    if(book) break;
  }
  if(!book) book = {id:bookId, title:'Kitap', author:'', emoji:'📖'};

  showScreen('sc-reader');
  document.getElementById('readerTitle').textContent = book.emoji+' '+book.title;
  document.getElementById('readerBookInfo').innerHTML =
    `<b style="color:var(--text)">${book.title}</b> · ${book.author} · <span style="color:${book.level==='beginner'?'#10b981':book.level==='intermediate'?'#f59e0b':'#ef4444'}">${LEVEL_LABELS[book.level]||''}</span>`;
  document.getElementById('readerContent').innerHTML =
    '<div style="text-align:center;padding:40px;color:var(--muted)"><div style="font-size:36px">📖</div><div style="margin-top:8px">Kitap yükleniyor...</div></div>';

  currentBook = book;

  // Yedek klasöründen oku
  let text = await WMStore.getBook(bookId);
  
  if(text){
    console.log('📚 Kitap yedek klasöründen yüklendi');
  }

  if(!text){
    try {
      // Gutenberg proxy API (CORS destekli)
      // Timeout ile fetch
      const fetchWithTimeout = (url, ms=6000) => {
        const ctrl = new AbortController();
        const id = setTimeout(()=>ctrl.abort(), ms);
        return fetch(url, {signal: ctrl.signal}).finally(()=>clearTimeout(id));
      };
      const gutUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
      const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(gutUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(gutUrl)}`,
      ];
      for(const url of proxyUrls){
        try {
          const resp = await fetchWithTimeout(url, 6000);
          if(resp.ok){
            const t = await resp.text();
            if(t && t.length>500 && !t.trim().startsWith('<')) { text=t; break; }
          }
        } catch(e){ console.log('Proxy failed:', url, e.message); }
      }
    } catch(e){}

    // Tüm proxy'ler başarısız → Groq ile kitabın ilk bölümlerini üret
  if(!text || text.length < 500){
    document.getElementById('readerContent').innerHTML =
      '<div style="text-align:center;padding:30px;color:var(--muted)"><div style="font-size:32px">🤖</div><div style="margin-top:8px">AI ile kitap özeti hazırlanıyor...</div></div>';
    try {
      // Groq ile sadece ilk bölümü üret — sonrakiler "Sonraki" butonunda gelecek
      showToast('🤖 İlk bölüm yükleniyor...', '');
      const sysPrompt = 'Write ONLY story prose in English. No chapter titles, no meta-text, no summaries. Just the narrative.';
      const ch1 = await callGroqAPI(sysPrompt,
        'Write the opening scene of "'+book.title+'" by '+book.author+' in about 800 words. Start immediately with the story. Be faithful to the original.'
      );
      if(!ch1 || ch1 === '__RATE_LIMIT__' || ch1.length < 100) throw new Error('İçerik üretilemedi');
      text = ch1;
      
      // Yedek klasörüne TXT kaydet
      await WMStore.setBook(bookId, book.title, text);
    } catch(e){
      document.getElementById('readerContent').innerHTML =
        `<div style="text-align:center;padding:40px">
          <div style="font-size:36px;margin-bottom:12px">❌</div>
          <div style="color:var(--red);font-weight:700;margin-bottom:8px">Kitap yüklenemedi</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:16px">İnternet bağlantısını kontrol edin.</div>
          <button onclick="showScreen('sc-library')" class="btn btn-ghost">← Kütüphaneye Dön</button>
        </div>`;
      return;
    }
  }

    // Gutenberg header/footer temizle
    text = cleanGutenbergText(text);
    
    // Yedek klasörüne TXT kaydet
    await WMStore.setBook(bookId, book.title, text);
  }

  // Paragraflara böl, chunk yap
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const CHUNK_SIZE = 15; // paragraf/chunk
  readerChunks = [];
  for(let i=0; i<paragraphs.length; i+=CHUNK_SIZE){
    readerChunks.push(paragraphs.slice(i,i+CHUNK_SIZE).join('\n\n'));
  }

  // Kayıtlı ilerlemeyi yükle
  const saved = localStorage.getItem('reader_progress_'+bookId);
  readerChunkIdx = saved ? (JSON.parse(saved).chunk || 0) : 0;

  renderReaderChunk();
}

function cleanGutenbergText(text){
  // HTML sayfası geldiyse (proxy HTML döndürdü) → reddet
  if(text.trim().startsWith('<!') || text.includes('<html') || text.includes('<form')){
    return '';
  }

  // HTML taglarını temizle (bazen karışık gelir)
  text = text.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

  // Start marker
  const startMarkers = ['*** START OF', '***START OF', 'START OF THE PROJECT', 'START OF THIS PROJECT'];
  for(const m of startMarkers){
    const idx = text.indexOf(m);
    if(idx !== -1){
      const nl = text.indexOf('\n', idx);
      if(nl !== -1) text = text.substring(nl+1);
      break;
    }
  }
  // End marker
  const endMarkers = ['*** END OF', '***END OF', 'END OF THE PROJECT', 'END OF THIS PROJECT'];
  for(const m of endMarkers){
    const idx = text.indexOf(m);
    if(idx !== -1){ text = text.substring(0, idx); break; }
  }
  return text.trim();
}

function renderReaderChunk(){
  if(!readerChunks.length) return;
  readerChunkIdx = Math.max(0, Math.min(readerChunkIdx, readerChunks.length-1));

  const chunk = readerChunks[readerChunkIdx] || '';
  const pct = Math.round((readerChunkIdx+1)/readerChunks.length*100);

  document.getElementById('readerProgress').style.width = pct+'%';
  document.getElementById('readerProgressText').textContent = pct+'%  ('+(readerChunkIdx+1)+'/'+readerChunks.length+')';

  try {
    // Önce HTML özel karakterlerini escape et (TXT dosyaları için)
    // Nokta/ünlem/soru işareti sonrası yeni satır ekle (cümleleri ayır)
    const cleaned = chunk
      .replace(/([.!?])\s{2,}/g,'$1\n')        // Zaten çift boşluk varsa
      .replace(/([.!?])\s([A-ZİÇŞÖÜĞa-z])/g,'$1\n$2'); // Nokta + büyük harf
    const escaped = cleaned
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\n\n/g,'<br><br>')
      .replace(/\n/g,'<br>');
    const html = makeReaderWordsClickable(escaped);
    document.getElementById('readerContent').innerHTML = html || escaped;
  } catch(e) {
    // Fallback: düz metin göster
    document.getElementById('readerContent').textContent = chunk;
  }

  // Başa scroll
  try { document.getElementById('sc-reader').scrollTop = 0; } catch(e){}

  // İlerlemeyi kaydet
  if(currentBook){
    try { localStorage.setItem('reader_progress_'+currentBook.id, JSON.stringify({chunk:readerChunkIdx, pct})); } catch(e){}
  }
}

function makeReaderWordsClickable(html){
  // DÜZ METİN AMA TIKLANABİLİR
  // Renk yok, sadece cursor:pointer ve onclick
  try {
    return html.replace(/\b([A-Za-z]{3,})\b/g, (match) => {
      const common = ['the','and','are','for','was','with','you','that','this','have','from','not','but','can','will','she','her','his','him','they','them','their','had','has','been','were','said','did','all','one','would','could','should','what','when','where','which','who','how','its','our','your','into','than','then','more','some','such','each','most'];
      if(common.includes(match.toLowerCase())) return match;
      // Düz metin ama tıklanabilir (renk yok)
      return `<span style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px" onclick="explainWord('${match.replace(/'/g,"\\'")}','readerContent')">${match}</span>`;
    });
  } catch(e){ return html; }
}

async function readerNextChapter(){
  if(readerChunkIdx < readerChunks.length-1){
    readerChunkIdx++;
    renderReaderChunk();
  } else {
    // Sonraki bölümü Groq ile üret
    const nextBtn = document.querySelector('.reader-btn:last-child');
    if(nextBtn){ nextBtn.textContent='⏳'; nextBtn.disabled=true; }

    // Kaçıncı bölümdeyiz?
    const metaRaw = localStorage.getItem('book_meta_'+currentBook?.id);
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    const chNum = (meta.chapterNum || 1) + 1;
    showToast('🤖 Bölüm '+chNum+' yükleniyor...', '');

    try {
      const sysPrompt = 'Write ONLY story prose in English. No chapter titles, no meta-text. Just the narrative.';
      const prompt = 'Continue "'+currentBook?.title+'" by '+currentBook?.author+
        ' — Chapter '+chNum+'. Write about 800 words continuing naturally from where the story left off. Stay faithful to the original characters and style.';
      const newChapter = await callGroqAPI(sysPrompt, prompt);

      if(newChapter && newChapter !== '__RATE_LIMIT__' && newChapter.length > 100){
        // Yeni bölümü chunk'lara ekle
        const paras = newChapter.split(/\n\s*\n/).filter(p=>p.trim().length>20);
        const CHUNK_SIZE = 15;
        for(let i=0; i<paras.length; i+=CHUNK_SIZE){
          readerChunks.push(paras.slice(i,i+CHUNK_SIZE).join('\n\n'));
        }
        // Cache'e ekle
        // Yeni chapter: sadece klasöre ekle (localStorage yerine)
        const existingText = await WMStore.getBook(currentBook.id) || '';
        const updatedText = existingText + '\n\n' + newChapter;
        await WMStore.setBook(currentBook.id, currentBook.title, updatedText);
        meta.chapterNum = chNum;
        localStorage.setItem('book_meta_'+currentBook?.id, JSON.stringify(meta));

        readerChunkIdx++;
        renderReaderChunk();
        showToast('✅ Bölüm '+chNum+' hazır!', '');
      } else if(newChapter === '__RATE_LIMIT__'){
        showToast('⏳ Rate limit', 'Birkaç saniye bekle, tekrar dene');
      } else {
        showToast('❌ Bölüm yüklenemedi', 'Tekrar dene');
      }
    } catch(e){
      showToast('❌ Hata', 'Bölüm yüklenemedi');
    }

    if(nextBtn){ nextBtn.textContent='Sonraki →'; nextBtn.disabled=false; }
  }
}

function readerPrevChapter(){
  if(readerChunkIdx > 0){
    readerChunkIdx--;
    renderReaderChunk();
  }
}

function toggleReaderAudio(){
  const chunk = readerChunks[readerChunkIdx] || '';
  const btn = document.getElementById('readerAudioBtn');
  if(readerAudioOn){
    stopSpeech();
    readerAudioOn = false;
    btn.textContent = '🔊 Sesli Oku';
  } else {
    readerAudioOn = true;
    btn.textContent = '⏹ Durdur';
    const plain = chunk.replace(/<[^>]+>/g,'').substring(0,500);
    speak(plain, 'en-US');
    setTimeout(()=>{ readerAudioOn=false; btn.textContent='🔊 Sesli Oku'; }, plain.length*60);
  }
}


let currentChapter = 0;
let readerAudioPlaying = false;

// AI Chat (Groq API)
let chatHistory=[], chatWord=null;
let aiUserLevel = "intermediate";
let chatMode = "english"; // english veya turkish
let currentLevel = 2; // 1=Beginner, 2=Intermediate, 3=Advanced

// Conversation & Coach
let convScenario="";
let convHistory=[];
let convLevel="intermediate"; // Konuşma seviyesi

function setConvLevel(level){
  convLevel=level;
  document.querySelectorAll('#sc-conversation .level-chip').forEach(chip=>chip.classList.remove('active'));
  document.querySelector(`#sc-conversation .level-chip[data-level="${level}"]`).classList.add('active');
}
let pronCoachRecording=false;
let pronCoachAudio=null;
let userVoiceSample=null;

// Speech Recognition - Global instance (tek izin)
let globalRecognition=null;
function getRecognition(){
  if(!globalRecognition){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return null;
    globalRecognition=new SR();
    globalRecognition.lang="en-US";
    globalRecognition.continuous=false;
    globalRecognition.interimResults=false;
  }
  return globalRecognition;
}

// AI Settings
let aiTextSize=16; // AI metin boyutu (px)
let enableWordImages=true; // Kelime resimleri göster
let highlightSettings={
  quotes:{enabled:true,color:"#ef4444"},
  parens:{enabled:true,color:"#3b82f6"},
  stars:{enabled:true,color:"#22c55e"}
};

// Irregular Verbs Database (97 verbs)
const IRREGULAR_VERBS=[{"v1":"awake","v2":"awoke","v3":"awoken","tr":"uyandırmak"},{"v1":"be","v2":"was were","v3":"been","tr":"olmak"},{"v1":"beat","v2":"beat","v3":"beaten","tr":"vurmak"},{"v1":"become","v2":"became","v3":"become","tr":"olmak"},{"v1":"begin","v2":"began","v3":"begun","tr":"başlamak"},{"v1":"bend","v2":"bent","v3":"bent","tr":"bükmek"},{"v1":"bet","v2":"bet","v3":"bet","tr":"bahse girmek"},{"v1":"bid","v2":"bid","v3":"bid","tr":"emretmek"},{"v1":"bite","v2":"bit","v3":"bitten","tr":"ısırmak"},{"v1":"blow","v2":"blew","v3":"blown","tr":"esmek"},{"v1":"break","v2":"broke","v3":"broken","tr":"kırmak"},{"v1":"bring","v2":"brought","v3":"brought","tr":"getirmek"},{"v1":"broadcast","v2":"broadcast","v3":"broadcast","tr":"yayımlamak"},{"v1":"build","v2":"built","v3":"built","tr":"inşa etmek"},{"v1":"burn","v2":"burned burnt","v3":"burned burnt","tr":"yakmak"},{"v1":"burst","v2":"burst","v3":"burst","tr":"patlamak"},{"v1":"buy","v2":"bought","v3":"bought","tr":"satın almak"},{"v1":"catch","v2":"caught","v3":"caught","tr":"yakalamak"},{"v1":"choose","v2":"chose","v3":"chosen","tr":"seçmek"},{"v1":"come","v2":"came","v3":"come","tr":"gelmek"},{"v1":"cost","v2":"cost","v3":"cost","tr":"mal olmak (masraf)"},{"v1":"creep","v2":"crept","v3":"crept","tr":"emeklemek"},{"v1":"cut","v2":"cut","v3":"cut","tr":"kesmek"},{"v1":"deal","v2":"dealt","v3":"dealt","tr":"anlaşmak"},{"v1":"dig","v2":"dug","v3":"dug","tr":"kazmak"},{"v1":"do","v2":"did","v3":"done","tr":"yapmak"},{"v1":"draw","v2":"drew","v3":"drawn","tr":"çizmek"},{"v1":"dream","v2":"dreamed dreamt","v3":"dreamed dreamt","tr":"rüya görmek"},{"v1":"drive","v2":"drove","v3":"driven","tr":"sürmek"},{"v1":"drink","v2":"drank","v3":"drunk","tr":"içmek"},{"v1":"eat","v2":"ate","v3":"eaten","tr":"yemek"},{"v1":"fall","v2":"fell","v3":"fallen","tr":"düşmek"},{"v1":"feed","v2":"fed","v3":"fed","tr":"beslemek"},{"v1":"feel","v2":"felt","v3":"felt","tr":"hissetmek"},{"v1":"fight","v2":"fought","v3":"fought","tr":"dövüşmek"},{"v1":"find","v2":"found","v3":"found","tr":"bulmak"},{"v1":"flee","v2":"fled","v3":"fled","tr":"firar etmek"},{"v1":"fly","v2":"flew","v3":"flown","tr":"uçmak"},{"v1":"forbid","v2":"forbade","v3":"forbidden","tr":"yasaklamak"},{"v1":"forget","v2":"forgot","v3":"forgotten","tr":"unutmak"},{"v1":"forgive","v2":"forgave","v3":"forgiven","tr":"affetmek"},{"v1":"freeze","v2":"froze","v3":"frozen","tr":"dondurmak"},{"v1":"get","v2":"got","v3":"got gotten","tr":"almak"},{"v1":"give","v2":"gave","v3":"given","tr":"vermek"},{"v1":"go","v2":"went","v3":"gone","tr":"gitmek"},{"v1":"grow","v2":"grew","v3":"grown","tr":"büyümek"},{"v1":"hang","v2":"hung","v3":"hung","tr":"asmak"},{"v1":"have","v2":"had","v3":"had","tr":"sahip olmak"},{"v1":"hear","v2":"heard","v3":"heard","tr":"işitmek"},{"v1":"hide","v2":"hid","v3":"hidden","tr":"saklamak"},{"v1":"hit","v2":"hit","v3":"hit","tr":"vurmak"},{"v1":"hold","v2":"held","v3":"held","tr":"kaldırmak"},{"v1":"hurt","v2":"hurt","v3":"hurt","tr":"acıtmak"},{"v1":"keep","v2":"kept","v3":"kept","tr":"tutmak"},{"v1":"know","v2":"knew","v3":"known","tr":"bilmek"},{"v1":"lay","v2":"laid","v3":"laid","tr":"uzanmak"},{"v1":"lead","v2":"led","v3":"led","tr":"önderlik etmek"},{"v1":"learn","v2":"learned learnt","v3":"learned learnt","tr":"öğrenmek"},{"v1":"leave","v2":"left","v3":"left","tr":"terk etmek"},{"v1":"lend","v2":"lent","v3":"lent","tr":"ödünç vermek"},{"v1":"let","v2":"let","v3":"let","tr":"izin almak"},{"v1":"lie","v2":"lay","v3":"lain","tr":"yalan söylemek"},{"v1":"lose","v2":"lost","v3":"lost","tr":"kaybetmek"},{"v1":"make","v2":"made","v3":"made","tr":"yapmak"},{"v1":"mean","v2":"meant","v3":"meant","tr":"anlamına gelmek"},{"v1":"meet","v2":"met","v3":"met","tr":"görüşmek"},{"v1":"pay","v2":"paid","v3":"paid","tr":"ödemek"},{"v1":"put","v2":"put","v3":"put","tr":"koymak"},{"v1":"read","v2":"read","v3":"read","tr":"okumak"},{"v1":"ride","v2":"rode","v3":"ridden","tr":"sürmek"},{"v1":"ring","v2":"rang","v3":"rung","tr":"zil çalmak"},{"v1":"rise","v2":"rose","v3":"risen","tr":"yükselmek"},{"v1":"run","v2":"ran","v3":"run","tr":"koşmak"},{"v1":"say","v2":"said","v3":"said","tr":"söylemek"},{"v1":"see","v2":"saw","v3":"seen","tr":"görmek"},{"v1":"sell","v2":"sold","v3":"sold","tr":"satmak"},{"v1":"send","v2":"sent","v3":"sent","tr":"göndermek"},{"v1":"set","v2":"set","v3":"set","tr":"kurmak/ayarlamak"},{"v1":"show","v2":"showed","v3":"showed shown","tr":"göstermek"},{"v1":"shut","v2":"shut","v3":"shut","tr":"kapatmak"},{"v1":"sing","v2":"sang","v3":"sung","tr":"şarkı söylemek"},{"v1":"sit","v2":"sat","v3":"sat","tr":"oturmak"},{"v1":"sleep","v2":"slept","v3":"slept","tr":"uyumak"},{"v1":"speak","v2":"spoke","v3":"spoken","tr":"konuşmak"},{"v1":"spend","v2":"spent","v3":"spent","tr":"harcamak"},{"v1":"stand","v2":"stood","v3":"stood","tr":"beklemek"},{"v1":"swim","v2":"swam","v3":"swum","tr":"yüzmek"},{"v1":"take","v2":"took","v3":"taken","tr":"almak"},{"v1":"teach","v2":"taught","v3":"taught","tr":"öğretmek"},{"v1":"tear","v2":"tore","v3":"torn","tr":"yırtmak"},{"v1":"tell","v2":"told","v3":"told","tr":"anlatmak"},{"v1":"think","v2":"thought","v3":"thought","tr":"düşünmek"},{"v1":"throw","v2":"threw","v3":"thrown","tr":"atmak"},{"v1":"understand","v2":"understood","v3":"understood","tr":"anlamak"},{"v1":"wake","v2":"woke","v3":"woken","tr":"uyanmak"},{"v1":"wear","v2":"wore","v3":"worn","tr":"giymek"},{"v1":"win","v2":"won","v3":"won","tr":"kazanmak"},{"v1":"write","v2":"wrote","v3":"written","tr":"yazmak"},{"v1":"provide","v2":"provided","v3":"provided","tr":"sağlamak"},{"v1":"pass","v2":"passed","v3":"passed","tr":"geçmek"},{"v1":"race","v2":"raced","v3":"raced","tr":"yarışmak"}];

// Fiil lookup: cümledeki kelimeyi bul, base form döndür
function findVerbBase(word){
  const w=word.toLowerCase().trim();
  
  // 1. Database'de ara
  for(const v of IRREGULAR_VERBS){
    if(v.v1===w) return {base:v.v1,actual:w,tr:v.tr};
    if(v.v2.split(' ').includes(w)) return {base:v.v1,actual:w,tr:v.tr};
    if(v.v3.split(' ').includes(w)) return {base:v.v1,actual:w,tr:v.tr};
  }
  
  // 2. Regular verb temizleme
  // -ies → -y (tries → try)
  if(w.endsWith('ies') && w.length>4){
    return {base:w.slice(0,-3)+'y',actual:w,tr:null};
  }
  
  // -ing → base (running, walking, starving, racing)
  if(w.endsWith('ing') && w.length>4){
    let base=w.slice(0,-3);
    const last=base[base.length-1];
    const prev=base[base.length-2];
    
    // Çift sessiz harf: running → run, stopping → stop
    if(last===prev && !'aeiou'.includes(last)){
      return {base:base.slice(0,-1),actual:w,tr:null};
    }
    
    // Sesli + c: racing → race, dancing → dance (e ekle)
    if(last==='c'){
      return {base:base+'e',actual:w,tr:null};
    }
    
    // Sesli + v: starving → starve, having → have (e ekle)
    if(last==='v'){
      return {base:base+'e',actual:w,tr:null};
    }
    
    // Diğer: walking → walk, sulking → sulk
    return {base,actual:w,tr:null};
  }
  
  // -ed → base (called, walked, tried)
  if(w.endsWith('ed') && w.length>3){
    let base=w.slice(0,-2);
    const last=base[base.length-1];
    const prev=base[base.length-2];
    
    // Çift sessiz harf: stopped → stop, called → call
    if(last===prev && !'aeiou'.includes(last)){
      return {base:base.slice(0,-1),actual:w,tr:null};
    }
    // -ied → -y: tried → try
    if(base.endsWith('i')){
      return {base:base.slice(0,-1)+'y',actual:w,tr:null};
    }
    return {base,actual:w,tr:null};
  }
  
  // -es → base (goes → go, watches → watch)
  if(w.endsWith('es') && w.length>3){
    return {base:w.slice(0,-2),actual:w,tr:null};
  }
  
  // -s → base (provides → provide, runs → run)
  if(w.endsWith('s') && w.length>2){
    const base=w.slice(0,-1);
    const last=base[base.length-1];
    const prev=base[base.length-2];
    
    // Çift harf + s: pass, miss, guess → değiştirme
    if(last==='s' && prev==='s'){
      return {base:w,actual:w,tr:null}; // "pass" olarak kal
    }
    
    return {base:base,actual:w,tr:null};
  }
  
  return {base:w,actual:w,tr:null};
}

// AI metin boyutunu güncelle
function updateAITextSize(size){
  aiTextSize=parseInt(size);
  document.documentElement.style.setProperty('--ai-text-size',aiTextSize+'px');
  document.getElementById("aiSizeValue").textContent=aiTextSize+"px";
  localStorage.setItem("aiTextSize",aiTextSize);
}

function saveGroqKey(){
  const input=document.getElementById("groqApiKeyInput");
  const key=input.value.trim();
  if(!key){
    alert("⚠️ Lütfen geçerli bir API key girin!");
    return;
  }
  if(!key.startsWith("gsk_")){
    alert("⚠️ GROQ API Key 'gsk_' ile başlamalıdır!");
    return;
  }
  GROQ_API_KEY=key;
  localStorage.setItem("groq_api_key",key);
  input.type="password";
  alert("✅ API Key kaydedildi!");
}

function saveHighlightSettings(){
  highlightSettings={
    quotes:{
      enabled:document.getElementById("highlightQuotes").checked,
      color:document.getElementById("colorQuotes").value
    },
    parens:{
      enabled:document.getElementById("highlightParens").checked,
      color:document.getElementById("colorParens").value
    },
    stars:{
      enabled:document.getElementById("highlightStars").checked,
      color:document.getElementById("colorStars").value
    }
  };
  localStorage.setItem("highlightSettings",JSON.stringify(highlightSettings));
}

function loadHighlightSettings(){
  const saved=localStorage.getItem("highlightSettings");
  if(saved){
    try{
      highlightSettings=JSON.parse(saved);
      document.getElementById("highlightQuotes").checked=highlightSettings.quotes.enabled;
      document.getElementById("colorQuotes").value=highlightSettings.quotes.color;
      document.getElementById("highlightParens").checked=highlightSettings.parens.enabled;
      document.getElementById("colorParens").value=highlightSettings.parens.color;
      document.getElementById("highlightStars").checked=highlightSettings.stars.enabled;
      document.getElementById("colorStars").value=highlightSettings.stars.color;
    }catch(e){
      console.error('❌ Highlight settings load error:', e);
    }
  }
}

function saveWordImagesSetting(){
  enableWordImages=document.getElementById("enableWordImages").checked;
  localStorage.setItem("enableWordImages",enableWordImages?"1":"0");
}

function loadWordImagesSetting(){
  const saved=localStorage.getItem("enableWordImages");
  if(saved!==null){
    enableWordImages=saved==="1";
    if(document.getElementById("enableWordImages")){
      document.getElementById("enableWordImages").checked=enableWordImages;
    }
  }
}

// Kelime Tıklama Ayarı
let enableWordClick = true;

function saveWordClickSetting(){
  enableWordClick=document.getElementById("enableWordClick").checked;
  localStorage.setItem("enableWordClick",enableWordClick?"1":"0");
  showToast('💾 Kaydedildi', enableWordClick ? 'Kelime tıklama aktif' : 'Kelime tıklama kapalı');
}

function loadWordClickSetting(){
  const saved=localStorage.getItem("enableWordClick");
  if(saved!==null){
    enableWordClick=saved==="1";
    if(document.getElementById("enableWordClick")){
      document.getElementById("enableWordClick").checked=enableWordClick;
    }
  }
}

// Otomatik Sesli Okuma Ayarı
let enableAutoRead = false; // Otomatik okuma KAPALI (varsayılan)

function saveAutoReadSetting(){
  enableAutoRead=document.getElementById("enableAutoRead").checked;
  localStorage.setItem("enableAutoRead",enableAutoRead?"1":"0");
  showToast('💾 Kaydedildi', enableAutoRead ? '🔊 Otomatik okuma açık' : '🔇 Otomatik okuma kapalı');
}

function saveAIFontSize() {
  const size = document.getElementById("aiFontSize").value;
  localStorage.setItem("aiFontSize", size);
  document.documentElement.style.setProperty('--ai-text-size', size + 'px');
  showToast('💾 Kaydedildi', `Font boyutu: ${size}px`);
}

function loadAIFontSize() {
  const saved = localStorage.getItem("aiFontSize") || "16";
  const select = document.getElementById("aiFontSize");
  if (select) select.value = saved;
  return saved;
}

function getAIFontSize() {
  return localStorage.getItem("aiFontSize") || "16";
}

function loadAutoReadSetting(){
  const saved=localStorage.getItem("enableAutoRead");
  if(saved!==null){
    enableAutoRead=saved==="1";
    if(document.getElementById("enableAutoRead")){
      document.getElementById("enableAutoRead").checked=enableAutoRead;
    }
  }
}

// ══════════════════════════════════════════════════════════
// TIRNAK İÇLERİ YEŞİL + TÜM KELİMELER TIKLANABİLİR
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// SADECE TIRNAK İÇLERİ YEŞİL - DİĞER KELİMELER TIKLANABİLİR AMA RENKSİZ
// ══════════════════════════════════════════════════════════

