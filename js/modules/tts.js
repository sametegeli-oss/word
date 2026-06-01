/* ════════════════════════════════════════════════════════════════
   WordMode — modül: tts.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function speakWord(){if(words[idx])speak(words[idx].word,"en-US");}
function speakSentence(){const s=words[idx]?.sentence;if(s)speak(s,"en-US");}
function speakTR(){const item=words[idx];if(item)speak(item.sentenceTr||item.tr,"tr-TR");}
// TTS Hız Ayarları
let ttsRateEN = parseFloat(localStorage.getItem('ttsRateEN') || '0.9');
let ttsRateTR = parseFloat(localStorage.getItem('ttsRateTR') || '0.9');

function updateTTSRate(lang, val) {
  val = parseFloat(val);
  if (lang === 'en') {
    ttsRateEN = val;
    localStorage.setItem('ttsRateEN', val);
    const el = document.getElementById('enRateVal');
    if (el) el.textContent = val.toFixed(2) + 'x';
  } else {
    ttsRateTR = val;
    localStorage.setItem('ttsRateTR', val);
    const el = document.getElementById('trRateVal');
    if (el) el.textContent = val.toFixed(2) + 'x';
  }
}

function loadTTSRateSettings() {
  const enSlider = document.getElementById('enRateSlider');
  const trSlider = document.getElementById('trRateSlider');
  if (enSlider) { enSlider.value = ttsRateEN; document.getElementById('enRateVal').textContent = ttsRateEN.toFixed(2) + 'x'; }
  if (trSlider) { trSlider.value = ttsRateTR; document.getElementById('trRateVal').textContent = ttsRateTR.toFixed(2) + 'x'; }
}

function speak(text,lang){
  console.log('🔊 TTS ÇAL ÇAĞRILDI:', text, 'Dil:', lang);
  
  if(!window.speechSynthesis){
    console.error('❌ speechSynthesis desteklenmiyor!');
    alert("Tarayıcın sesi desteklemiyor.");
    return;
  }
  
  console.log('✅ speechSynthesis mevcut');
  
  speechSynthesis.cancel();
  console.log('🛑 Önceki ses iptal edildi');
  
  // Sesler yüklendikten sonra çal
  const playWithVoices = () => {
    const u=new SpeechSynthesisUtterance(text);
    u.lang=lang;
    u.rate = lang && lang.startsWith('tr') ? ttsRateTR : ttsRateEN;
    u.pitch=1;
    u.volume=1; // VOLUME 1 (maksimum)
    
    console.log('⚙️ TTS Ayarları:', {
      text: text,
      lang: lang,
      rate: u.rate,
      pitch: u.pitch,
      volume: u.volume
    });
    
    const voices=speechSynthesis.getVoices();
    console.log('🎤 Mevcut sesler:', voices.length, 'adet');
    
    if(voices.length === 0) {
      console.warn('⚠️ Sesler henüz yüklenmedi, varsayılan ile devam');
    } else {
      console.log('🎤 Sesler:', voices.map(v => v.name + ' (' + v.lang + ')').slice(0, 5).join(', '));
    }
    
    const v=voices.find(v=>v.lang===lang&&v.localService)||voices.find(v=>v.lang.startsWith(lang.split("-")[0]));
    
    if(v) {
      u.voice=v;
      console.log('✅ Ses seçildi:', v.name, v.lang);
    } else {
      console.warn('⚠️ Uygun ses bulunamadı, varsayılan kullanılacak');
    }
    
    // Event listener'lar ekle
    u.onstart = () => console.log('▶️ TTS başladı');
    u.onend = () => console.log('⏹️ TTS bitti');
    u.onerror = (e) => console.error('❌ TTS hatası:', e);
    
    console.log('📢 speechSynthesis.speak() çağrılıyor...');
    speechSynthesis.speak(u);
    console.log('✅ speak() çağrıldı, bekleniyor...');
  };
  
  // Sesler zaten yüklüyse hemen çal
  if(speechSynthesis.getVoices().length > 0) {
    playWithVoices();
  } else {
    // Sesler yüklenene kadar bekle (max 1 saniye)
    console.log('⏳ Sesler yükleniyor...');
    let played = false;
    
    const timeout = setTimeout(() => {
      if (!played) {
        played = true;
        console.warn('⏱️ 1 saniye timeout, yine de çalıyorum');
        playWithVoices();
      }
    }, 1000);
    
    speechSynthesis.addEventListener('voiceschanged', () => {
      if (!played) {
        played = true;
        clearTimeout(timeout);
        console.log('✅ Sesler yüklendi!');
        playWithVoices();
      }
    }, { once: true });
  }
}

function testTTS(){
  console.log('🧪 TTS TEST BAŞLIYOR...');
  
  if(!window.speechSynthesis){
    alert('❌ Tarayıcınız TTS desteklemiyor!');
    return;
  }
  
  const voices = speechSynthesis.getVoices();
  console.log('🎤 Toplam ses:', voices.length);
  
  if(voices.length === 0){
    alert('⚠️ Hiç ses bulunamadı! Lütfen sayfayı yenileyin.');
    return;
  }
  
  // İngilizce test
  speak('Hello, this is a test', 'en-US');
  
  // 3 saniye sonra Türkçe test
  setTimeout(() => {
    speak('Merhaba, bu bir testtir', 'tr-TR');
  }, 3000);
  
  showToast('🧪 TTS Testi', 'Console\'u kontrol edin');
}

function speakPartner(text){
  if(!window.speechSynthesis) return;
  speechSynthesis.cancel();
  
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = ttsRateEN;
  
  // Seçili partner'ın cinsiyetini al
  const partner = PARTNERS[selectedPartner];
  const isFemale = partner && partner.gender === 'female';
  
  // Sesler yüklendikten sonra çal
  function playWithVoice() {
    const voices = speechSynthesis.getVoices();
    
    if (isFemale) {
      // BAYAN SESLERİ - Sarah, Mia
      const femaleVoice = voices.find(function(v) { return v.voiceURI && v.voiceURI.includes("Zira"); }) ||
                          voices.find(function(v) { return v.name && v.name.includes("Zira"); }) ||
                          voices.find(function(v) { return v.name && v.name.includes("Samantha"); }) ||
                          voices.find(function(v) { return v.name && v.name.includes("Victoria"); }) ||
                          voices.find(function(v) { return v.name && v.name.toLowerCase().includes("female"); }) ||
                          voices.find(function(v) { return v.lang.startsWith('en') && v.name.toLowerCase().includes("woman"); });
      
      if (femaleVoice) {
        u.voice = femaleVoice;
        console.log("✅ BAYAN PARTNER SES:", femaleVoice.name);
      } else {
        u.pitch = 1.3; // Tiz - bayan sesi
        console.log("⚠️ Bayan ses bulunamadı, Pitch: 1.3");
      }
    } else {
      // ERKEK SESLERİ - Alex, Jake
      const maleVoice = voices.find(function(v) { return v.voiceURI && v.voiceURI.includes("David"); }) ||
                        voices.find(function(v) { return v.name && v.name.includes("David"); }) ||
                        voices.find(function(v) { return v.name && v.name.includes("Daniel"); }) ||
                        voices.find(function(v) { return v.name && v.name.includes("James"); }) ||
                        voices.find(function(v) { return v.name && v.name.toLowerCase().includes("male"); }) ||
                        voices.find(function(v) { return v.lang.startsWith('en') && v.name.toLowerCase().includes("man"); });
      
      if (maleVoice) {
        u.voice = maleVoice;
        console.log("✅ ERKEK PARTNER SES:", maleVoice.name);
      } else {
        u.pitch = 0.8; // Pes - erkek sesi
        console.log("⚠️ Erkek ses bulunamadı, Pitch: 0.8");
      }
    }
    
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
}

// speechSynthesis sesleri yükle
if(window.speechSynthesis){
  speechSynthesis.onvoiceschanged=()=>{
    const voices = speechSynthesis.getVoices();
    console.log('🎤 Sesler yüklendi:', voices.length, 'adet');
  };
  
  // İlk yüklemede de dene
  const voices = speechSynthesis.getVoices();
  if(voices.length > 0){
    console.log('🎤 Sesler hazır:', voices.length, 'adet');
  } else {
    console.log('⏳ Sesler yükleniyor...');
  }
}

// ══════════════════════════════════════════════════════════
// GOOGLE TRANSLATE
// ══════════════════════════════════════════════════════════
function openGT(){
  const item=words[idx];
  if(!item) return;
  const text=item.sentence||item.word;
  const url="https://translate.google.com/?sl=en&tl=tr&text="+encodeURIComponent(text)+"&op=translate";
  const a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noopener noreferrer";
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

function copyToClipboard(){
  const item=words[idx];if(!item)return;
  const text=item.sentence||item.word;
  const doIt=()=>{
    const ta=document.createElement("textarea");
    ta.value=text;ta.style.cssText="position:fixed;opacity:0;top:0;left:0;";
    document.body.appendChild(ta);ta.focus();ta.select();
    try{document.execCommand("copy");}catch(e){}
    document.body.removeChild(ta);
    showToast("📋 Kopyalandı!",text);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>showToast("📋 Kopyalandı!",text)).catch(doIt);
  }else{doIt();}
}
function showToast(title,text){
  document.getElementById("wm-toast")?.remove();
  const t=document.createElement("div");
  t.id="wm-toast";
  t.innerHTML="<b>"+title+"</b><br><span style='font-size:12px;opacity:.85'>"+text.slice(0,80)+(text.length>80?"...":"")+"</span>";
  t.style.cssText="position:fixed;bottom:84px;left:50%;transform:translateX(-50%);background:rgba(30,58,95,0.95);backdrop-filter:blur(16px);border:1.5px solid rgba(59,130,246,.5);color:#e0f0ff;border-radius:16px;padding:13px 18px;font-size:13px;z-index:9999;max-width:320px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.6);";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}
// ══════════════════════════════════════════════════════════
// MARK LEARNED
// ══════════════════════════════════════════════════════════
function stopSpeechGuaranteed() {
  if (!window.speechSynthesis) return;
  
  // Method 1: Cancel
  window.speechSynthesis.cancel();
  
  // Method 2: Pause + Resume + Cancel (iOS trick)
  window.speechSynthesis.pause();
  window.speechSynthesis.resume();
  window.speechSynthesis.cancel();
  
  // Method 3: Empty utterance to clear queue
  const silence = new SpeechSynthesisUtterance('');
  silence.volume = 0;
  window.speechSynthesis.speak(silence);
  window.speechSynthesis.cancel();
  
  // Method 4: Delayed final cancel
  setTimeout(() => {
    window.speechSynthesis.cancel();
  }, 50);
  
  // Method 5: Force stop by getting all voices and canceling again
  setTimeout(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.cancel();
  }, 100);
  
  console.log('🔇 Ses garantili durduruldu');
}

// Replace old stopSpeech with guaranteed version (if exists)
if (typeof stopSpeech !== 'undefined') {
  const originalStopSpeech = stopSpeech;
  stopSpeech = stopSpeechGuaranteed;
}

// ══════════════════════════════════════════════════════════
// MEMORY USAGE MONITOR
// ══════════════════════════════════════════════════════════

