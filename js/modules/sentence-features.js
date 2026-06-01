/* ════════════════════════════════════════════════════════════════
   WordMode — modül: sentence-features.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

async function showContextSentences() {
  const word = words[idx]?.word || window.currentWord || "";
  
  if (!word) {
    alert("❌ Önce bir kelime seçin!");
    return;
  }
  
  const confirmStart = confirm(`📖 "${word}" kelimesinin farklı bağlamlardaki kullanımlarını görmek ister misiniz?\n\nGroq API kullanılacak.`);
  
  if (!confirmStart) return;
  
  try {
    // 📦 Cache kontrolü
    let result;
    let sourceLabel;
    const cachedEx = _aiCache.get('examples', word);
    if (cachedEx && cachedEx.data) {
      result = cachedEx.data;
      sourceLabel = '📦 Önbellekten';
      console.log("📦 Örnek cümleler cache'den:", word);
    } else {
      result = await callGroqAPI(
        "Sen bir İngilizce öğretmenisin. Verilen kelimeyi içeren 3 farklı bağlamda örnek cümle yaz. Her cümleyi Türkçe çevirisiyle birlikte ver.",
        `Kelime: ${word}\n\nFormat:\n1. [İngilizce cümle]\n   → [Türkçe çeviri]\n\n2. [İngilizce cümle]\n   → [Türkçe çeviri]\n\n3. [İngilizce cümle]\n   → [Türkçe çeviri]`,
        1000
      );
      _aiCache.set('examples', word, result);
      sourceLabel = '🤖 Groq Llama 3.3 · 1000 token';
    }

    alert(`📖 BAĞLAMDAKI CÜMLELER\n[${sourceLabel}]\n━━━━━━━━━━━━━━━━━━━━\nKelime: ${word}\n\n${result}`);
    
  } catch(e) {
    alert("❌ Hata oluştu: " + e.message);
  }
}

console.log("✅ Özellik 1 yüklendi: Bağlamdaki Cümleler");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 2: Kendi Telaffuzunu Konuş
// ═══════════════════════════════════════════════════════
let selfRecording = null;
let selfMediaRecorder = null;
let isRecordingSelf = false;

async function recordSelfPronunciation() {
  const btn = document.getElementById("recordSelfBtn");
  
  // Durum 1: Hiç kayıt yok - kayda başla
  if (!selfRecording && !isRecordingSelf) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      selfMediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      
      selfMediaRecorder.ondataavailable = e => chunks.push(e.data);
      
      selfMediaRecorder.onstop = () => {
        const blob = new Blob(chunks, {type:'audio/webm'});
        selfRecording = URL.createObjectURL(blob);
        isRecordingSelf = false;
        btn.textContent = "▶️ Kaydı Konuş";
        btn.className = "btn btn-blue btn-sm";
        alert("✅ Kayıt tamamlandı!\n\nŞimdi kaydınızı dinlemek için butona tekrar tıklayın.");
      };
      
      selfMediaRecorder.start();
      isRecordingSelf = true;
      btn.textContent = "⏹️ Kaydı Durdur";
      btn.className = "btn btn-red btn-sm";
      alert("🎤 Kayıt başladı!\n\nCümleyi okuyun, sonra butona tekrar basıp durdurun.");
      
    } catch(e) {
      alert("❌ Mikrofon erişimi reddedildi!\n\nTarayıcı ayarlarından mikrofon iznini kontrol edin.");
    }
  }
  // Durum 2: Kaydediliyor - durdur
  else if (isRecordingSelf && selfMediaRecorder) {
    selfMediaRecorder.stop();
    selfMediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  // Durum 3: Kayıt var - oynat
  else if (selfRecording) {
    const audio = new Audio(selfRecording);
    audio.play();
    
    // Yeni kayıt seçeneği sun
    setTimeout(() => {
      if (confirm("🎧 Kayıt oynatıldı.\n\nYeni bir kayıt yapmak ister misiniz?")) {
        selfRecording = null;
        btn.textContent = "🎤 Kendi Telaffuzunu Kaydet & Konuş";
        btn.className = "btn btn-green btn-sm";
      }
    }, 1000);
  }
}

console.log("✅ Özellik 2 yüklendi: Kendi Telaffuzunu Konuş");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 3: Cümle Seslendir
// ═══════════════════════════════════════════════════════
function speakCurrentSentence() {
  const sentence = smWords[smIdx]?.sentence || "";
  
  if (!sentence) {
    alert("❌ Cümle bulunamadı!");
    return;
  }
  
  const ut = new SpeechSynthesisUtterance(sentence);
  ut.lang = "en-US";
  ut.rate = 0.85;
  ut.pitch = 1.0;
  
  speechSynthesis.cancel();
  speechSynthesis.speak(ut);
  
  console.log("🔊 Cümle seslendiriliyor:", sentence);
}

console.log("✅ Özellik 3 yüklendi: Cümle Seslendir");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 4: Flash Kart Seslendir (DEVRE DIŞI)
// ═══════════════════════════════════════════════════════
// Flash kart özelliği şu an kullanılmıyor

console.log("✅ Özellik 4 devre dışı: Flash Kart Seslendir");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 5: Harf Harf Spelling
// ═══════════════════════════════════════════════════════
function spellWordLetterByLetter() {
  const word = document.getElementById("lmAnswer")?.textContent.trim() || "";
  
  if (!word) {
    alert("❌ Önce harfleri sıralayın!");
    return;
  }
  
  const letters = word.split("");
  let index = 0;
  
  function sayNextLetter() {
    if (index >= letters.length) {
      alert("✅ Harf harf söyleme tamamlandı!");
      return;
    }
    
    const ut = new SpeechSynthesisUtterance(letters[index]);
    ut.lang = "en-US";
    ut.rate = 0.6;
    
    ut.onend = () => {
      index++;
      if (index < letters.length) {
        setTimeout(sayNextLetter, 400);
      } else {
        alert("✅ Harf harf söyleme tamamlandı!");
      }
    };
    
    speechSynthesis.speak(ut);
  }
  
  speechSynthesis.cancel();
  alert(`🔊 "${word}" kelimesi harf harf söylenecek...`);
  sayNextLetter();
}

console.log("✅ Özellik 5 yüklendi: Harf Harf Spelling");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 6: Konuşarak Kontrol
// ═══════════════════════════════════════════════════════
function checkVoicePronunciation() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("❌ Tarayıcınız ses tanımayı desteklemiyor!\n\nChrome veya Edge kullanın.");
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  
  const correctSentence = smWords[smIdx]?.sentence || "";
  
  if (!correctSentence) {
    alert("❌ Doğru cümle bulunamadı!");
    return;
  }
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    const similarity = calculateSimilarity(
      transcript.toLowerCase(),
      correctSentence.toLowerCase()
    );
    
    if (similarity > 0.85) {
      showToast('✅ Mükemmel',`${Math.round(similarity * 100)}% doğru`);
    } else if (similarity > 0.6) {
      showToast('⚠️ İyi',`${Math.round(similarity * 100)}%`);
    } else {
      showToast('❌ Tekrar dene',`${Math.round(similarity * 100)}%`);
    }
  };
  
  recognition.onerror = (event) => {
    showToast('❌ Hata','Ses tanıma başarısız');
  };
  
  recognition.start();
  showToast('🎤 Dinliyorum','Cümleyi okuyun');
}

function calculateSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

console.log("✅ Özellik 6 yüklendi: Konuşarak Kontrol");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 7: El Yazısı
// ═══════════════════════════════════════════════════════
function openHandwritingModal() {
  const modal = document.createElement("div");
  modal.id = "hwModal";
  modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px";
  
  modal.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:20px;max-width:500px;width:100%">
      <h3 style="color:#000;margin:0 0 16px 0;font-size:18px">✍️ Cümleyi El Yazısıyla Yazın</h3>
      <canvas id="hwCanvas" width="450" height="200" 
        style="border:2px solid #ccc;border-radius:12px;background:#fff;cursor:crosshair;touch-action:none;width:100%;height:auto"></canvas>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button onclick="clearHandwriting()" 
          style="padding:12px 20px;border-radius:12px;background:#f3f4f6;border:none;cursor:pointer;font-weight:600;color:#374151">
          🗑️ Temizle
        </button>
        <button onclick="submitHandwriting()" 
          style="flex:1;padding:12px 20px;border-radius:12px;background:#3b82f6;color:#fff;border:none;cursor:pointer;font-weight:700">
          ✅ Kontrol Et
        </button>
        <button onclick="closeHandwriting()" 
          style="padding:12px 20px;border-radius:12px;background:#f3f4f6;border:none;cursor:pointer;font-weight:600;color:#374151">
          ✖ Kapat
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const canvas = document.getElementById("hwCanvas");
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  
  let drawing = false;
  
  const startDraw = (e) => {
    e.preventDefault();
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const stopDraw = () => drawing = false;
  
  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDraw);
  canvas.addEventListener("touchstart", startDraw);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDraw);
  
  window.clearHandwriting = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.closeHandwriting = () => modal.remove();
  window.submitHandwriting = () => {
    alert("🔍 El yazısı tanıma özelliği yakında eklenecek!\n\nŞu an için manuel kontrol yapabilirsiniz.");
    modal.remove();
  };
}

console.log("✅ Özellik 7 yüklendi: El Yazısı");

// ═══════════════════════════════════════════════════════
// ÖZELLİK 8-16: YENİ MODLAR
// ═══════════════════════════════════════════════════════

// ÖZELLİK 8-9: Konuşma Partner (Otomatik Ses Seçimi)
