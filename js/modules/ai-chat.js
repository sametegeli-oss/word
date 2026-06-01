/* ════════════════════════════════════════════════════════════════
   WordMode — modül: ai-chat.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let currentGroqKeyIndex = 0; // Hangi key'deyiz
let groqKeyFailCount = {}; // Her key için hata sayacı

// Rate limit'e takılan key'leri geçici yasakla
let groqKeyBanList = {}; // { keyIndex: banUntilTimestamp }

// Kullanılabilir bir Groq key bul
function getNextGroqKey() {
  if (!GROQ_API_KEYS || GROQ_API_KEYS.length === 0) {
    console.error('❌ GROQ_API_KEYS boş! Ayarlardan 3 key gir.');
    return null;
  }
  
  const now = Date.now();
  
  // Yasaklı key'leri temizle (süresi dolmuş)
  Object.keys(groqKeyBanList).forEach(idx => {
    if (groqKeyBanList[idx] < now) {
      delete groqKeyBanList[idx];
      console.log(`🔓 Key #${idx} yasağı kalktı`);
    }
  });
  
  // Tüm key'leri dene (max 3 deneme)
  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const idx = (currentGroqKeyIndex + i) % GROQ_API_KEYS.length;
    
    // Yasaklı değilse kullan
    if (!groqKeyBanList[idx]) {
      currentGroqKeyIndex = idx;
      console.log(`🔑 Groq Key #${idx + 1}/${GROQ_API_KEYS.length} kullanılıyor`);
      return GROQ_API_KEYS[idx];
    }
  }
  
  // Hepsi yasaklıysa en yakın süre dolacak olanı bekle
  const nextAvailable = Object.entries(groqKeyBanList)
    .sort((a, b) => a[1] - b[1])[0];
  
  if (nextAvailable) {
    const waitSec = Math.ceil((nextAvailable[1] - now) / 1000);
    console.warn(`⏳ Tüm key'ler yasaklı, ${waitSec}s sonra key #${nextAvailable[0]} kullanılabilir`);
  }
  
  return null;
}

// Rate limit hatasında key'i yasakla
function banGroqKey(keyIndex, durationMs = 120000) {  // 60s → 120s (2 dakika)
  groqKeyBanList[keyIndex] = Date.now() + durationMs;
  console.log(`🚫 Key #${keyIndex} yasağa alındı (${durationMs/1000}s)`);
  
  // Bir sonraki key'e geç
  currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_API_KEYS.length;
}

async function callGroqAPI(systemPrompt, userMessage, maxTokens) {
  // Eğer maxTokens verilmemişse, eski davranış (geriye uyumluluk)
  if(maxTokens === undefined) {
    maxTokens = 1500;
  }
  
  console.log("🔵 Groq API Call Starting...");
  console.log("Max tokens:", maxTokens);
  
  // Parametre kontrolü
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    console.error('❌ systemPrompt invalid:', typeof systemPrompt, systemPrompt);
    return '❌ System prompt hatası';
  }
  if (!userMessage || typeof userMessage !== 'string') {
    console.error('❌ userMessage invalid:', typeof userMessage, userMessage);
    return '❌ User message hatası';
  }
  
  // MULTI-KEY ROTATION: Kullanılabilir key bul
  let apiKey = getNextGroqKey();
  
  if(!apiKey || apiKey.trim()===""){
    // Key'ler hiç girilmemiş mi yoksa hepsi yasaklı mı?
    if (!GROQ_API_KEYS || GROQ_API_KEYS.length === 0) {
      return `❌ GROQ API Key girilmemiş! Lütfen Ayarlar'dan API Key girin. <a href="https://console.groq.com/keys" target="_blank" style="color:var(--blue)">Key almak için tıklayın</a>`;
    } else {
      // Tüm key'ler rate limit'te - süre hesapla
      const allBanned = Object.values(groqKeyBanList);
      if (allBanned.length > 0) {
        const nextAvailable = Math.min(...allBanned);
        const waitSeconds = Math.ceil((nextAvailable - Date.now()) / 1000);
        return `⏳ Tüm Groq API key'leri rate limit'te. ${waitSeconds} saniye sonra tekrar dene.`;
      }
      return `❌ Kullanılabilir API key bulunamadı`;
    }
  }
  
  // Key type kontrolü
  if (typeof apiKey !== 'string') {
    console.error('❌ API Key string değil:', typeof apiKey, apiKey);
    return `❌ API Key formatı hatalı`;
  }
  
  console.log("Key:", apiKey.substring(0, 20) + "...");
  console.log("System:", systemPrompt.substring(0, 50) + "...");
  console.log("User:", userMessage.substring(0, 50) + "...");
  
  // ═══ RETRY LOGİĞİ - Rate limit'e takılırsa başka key dene ═══
  let lastError = null;
  const maxRetries = Math.min(3, GROQ_API_KEYS.length || 1);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // HER DENEMEDE YENİ KEY AL (ilk denemede zaten mevcut, sonrakilerde getNextGroqKey'den gelir)
    if (attempt > 0) {
      apiKey = getNextGroqKey();
      if (!apiKey) {
        console.error('❌ Tüm key\'ler tükendi!');
        lastError = 'Tüm API anahtarları rate limit\'e takıldı';
        break;
      }
    }
    
    // HER DENEMEDE HANGİ KEY KULLANILIYOR GÖR
    const keyLast4 = apiKey ? `...${apiKey.slice(-4)}` : 'YOK';
    console.log(`\n🔑 DENEME ${attempt + 1}/${maxRetries} - Key: ${keyLast4} (Index: #${currentGroqKeyIndex})`);
    
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": "Bearer " + apiKey, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: maxTokens
        })
      });
      
      console.log("🟢 Response Status:", response.status);
      saveRateLimitHeaders(response.headers);
      
      // Rate limit (429) - Bu key'i yasakla ve başka key dene
      if(response.status === 429) {
        const errorText = await response.text();
        console.warn(`⚠️ Key ${keyLast4} (Index #${currentGroqKeyIndex}) RATE LIMIT! Deneme: ${attempt + 1}/${maxRetries}`);
        
        // Hata mesajından bekleme süresini çıkar (varsa)
        const retryAfter = response.headers.get('retry-after');
        const banDuration = retryAfter ? parseInt(retryAfter) * 1000 : 120000;
        
        console.log(`📛 Key ${keyLast4} yasaklanıyor, ${banDuration/1000}s süreyle...`);
        banGroqKey(currentGroqKeyIndex, banDuration);
        
        lastError = errorText;
        continue; // Bir sonraki denemeye geç (loop başında yeni key alınacak)
      }
      
      if(!response.ok){
        const errorText=await response.text();
        console.error("🔴 API Error:", response.status, errorText);
        return null;
      }
      
      const data = await response.json();
      console.log("🟢 Response OK:", data);
      if (data.error) return null;
      
      // Token kullanımını kaydet
      if (data.usage) {
        addTokenUsage(
          apiKey,
          'groq',
          data.usage.prompt_tokens || 0,
          data.usage.completion_tokens || 0,
          data.model || GROQ_MODEL
        );
        console.log("📊 Token kullanımı kaydedildi:", data.usage);
      }
      
      // Başarılı - hata sayacını sıfırla
      groqKeyFailCount[currentGroqKeyIndex] = 0;
      
      return data.choices?.[0]?.message?.content || null;
      
    } catch(e) { 
      console.error(`🔴 Fetch error (deneme ${attempt + 1}):`, e);
      lastError = e.message;
      
      // Network hatası - başka key dene
      if (attempt < maxRetries - 1) {
        apiKey = getNextGroqKey();
        if (!apiKey) break;
      }
    }
  }
  
  // Tüm denemeler başarısız
  console.error("❌ Tüm Groq key denemeleri başarısız");
  showToast('❌ API Hatası', lastError || 'Groq çağrısı başarısız');
  return null;
}

// Her API yanıtından rate limit bilgisini kaydet
function saveRateLimitHeaders(headers){
  try {
    const info = {
      reqLimit:  headers.get('x-ratelimit-limit-requests'),
      reqRemain: headers.get('x-ratelimit-remaining-requests'),
      reqReset:  headers.get('x-ratelimit-reset-requests'),
      tokLimit:  headers.get('x-ratelimit-limit-tokens'),
      tokRemain: headers.get('x-ratelimit-remaining-tokens'),
      tokReset:  headers.get('x-ratelimit-reset-tokens'),
      model:     GROQ_MODEL,
      updatedAt: new Date().toLocaleTimeString('tr-TR')
    };
    if(info.reqLimit || info.tokLimit){
      localStorage.setItem('groq_rate_info', JSON.stringify(info));
      renderGroqUsage(info);
    }
  } catch(e){}
}

function renderGroqUsage(info){
  const el = document.getElementById('groqUsageDisplay');
  if(!el || !info) return;
  const bar = (pct) => pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--orange)' : 'var(--red)';
  const reqPct = info.reqLimit && info.reqRemain ? Math.round(info.reqRemain/info.reqLimit*100) : null;
  const tokPct = info.tokLimit && info.tokRemain ? Math.round(info.tokRemain/info.tokLimit*100) : null;
  el.innerHTML =
    '<div style="background:var(--bg3);border-radius:10px;padding:12px">'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">🕐 '+info.updatedAt+' · '+info.model+'</div>'+
    (info.reqLimit ?
      '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">'+
      '<span>📨 İstek</span><b style="color:'+bar(reqPct)+'">'+info.reqRemain+' / '+info.reqLimit+'</b></div>'+
      '<div style="height:6px;background:var(--bg2);border-radius:3px"><div style="height:100%;width:'+reqPct+'%;background:'+bar(reqPct)+';border-radius:3px;transition:width .3s"></div></div>'+
      (info.reqReset ? '<div style="font-size:10px;color:var(--muted);margin-top:2px">↺ '+info.reqReset+'</div>' : '')+
      '</div>' : '')+
    (info.tokLimit ?
      '<div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">'+
      '<span>🔤 Token</span><b style="color:'+bar(tokPct)+'">'+Number(info.tokRemain).toLocaleString()+' / '+Number(info.tokLimit).toLocaleString()+'</b></div>'+
      '<div style="height:6px;background:var(--bg2);border-radius:3px"><div style="height:100%;width:'+tokPct+'%;background:'+bar(tokPct)+';border-radius:3px;transition:width .3s"></div></div>'+
      (info.tokReset ? '<div style="font-size:10px;color:var(--muted);margin-top:2px">↺ '+info.tokReset+'</div>' : '')+
      '</div>' : '')+
    '</div>';
}

// Conversation history ile API çağrısı
async function callGroqAPIWithHistory(messages) {
  // MULTI-KEY: Kullanılabilir key bul
  let apiKey = getNextGroqKey();
  
  if (!apiKey) {
    return '❌ API Key bulunamadı';
  }
  
  // ═══ RETRY LOGİĞİ ═══
  let lastError = null;
  const maxRetries = Math.min(3, GROQ_API_KEYS.length || 1);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": "Bearer " + apiKey, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      
      // Rate limit - başka key dene
      if(response.status === 429){
        const errorText = await response.text();
        console.warn(`⚠️ History API - Key #${currentGroqKeyIndex} rate limit! Deneme: ${attempt + 1}`);
        
        const retryAfter = response.headers.get('retry-after');
        const banDuration = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        
        banGroqKey(currentGroqKeyIndex, banDuration);
        
        apiKey = getNextGroqKey();
        if (!apiKey) {
          lastError = 'Tüm key\'ler rate limit';
          break;
        }
        
        lastError = errorText;
        continue;
      }
      
      if(!response.ok){
        const errorText=await response.text();
        console.error("API Error:", response.status, errorText);
        return null;
      }
      
      const data = await response.json();
      if (data.error) return null;
      
      groqKeyFailCount[currentGroqKeyIndex] = 0;
      return data.choices?.[0]?.message?.content || null;
      
    } catch(e) { 
      console.error(`Fetch error (deneme ${attempt + 1}):`, e);
      lastError = e.message;
      
      if (attempt < maxRetries - 1) {
        apiKey = getNextGroqKey();
        if (!apiKey) break;
      }
    }
  }
  
  console.error("❌ History API - Tüm denemeler başarısız");
  return null;
}

function setUserLevel(level) {
  aiUserLevel = level;
  document.querySelectorAll('.level-chip[data-level]').forEach(chip => chip.classList.remove('active'));
  document.querySelector(`.level-chip[data-level="${level}"]`).classList.add('active');
  addChatMsg(`✅ Seviye "${level === 'beginner' ? 'Başlangıç' : level === 'intermediate' ? 'Orta' : 'İleri'}" olarak değiştirildi`, "ai");
}

function setChatMode(mode){
  chatMode=mode;
  document.querySelectorAll('.level-chip[data-mode]').forEach(chip=>chip.classList.remove('active'));
  document.querySelector(`.level-chip[data-mode="${mode}"]`).classList.add('active');
  const modeText=mode==="english"?"🇬🇧 İngilizce Öğretmen":"🇹🇷 Türkçe Sohbet";
  addChatMsg(`✅ Mod "${modeText}" olarak değiştirildi`,`ai`);
}

function addChatMsg(text, role) {
  const div = document.createElement("div");
  div.className = "chat-msg " + role;
  
  // AI mesajlarında İngilizce kelimeleri vurgula
  const processedText = role === "ai" ? highlightEnglishWords(text) : text;
  div.innerHTML = processedText.replace(/\n/g, "<br>");
  
  document.getElementById("chatMessages").appendChild(div);
  div.scrollIntoView({ behavior: "smooth" });
  
  // AI mesajıysa ve kelime tıklama aktifse, ÇİFT tıklama listener ekle
  if (role === "ai" && enableWordClick) {
    console.log('🔍 Adding double-click listeners to words...');
    div.addEventListener('click', handleWordDoubleClick);
    
    // Mobil için touchend ekle
    div.addEventListener('touchend', handleMobileTouchEnd);
    
    console.log('✅ Double-click listener added to message');
  }
  
  return div;
}

// Mobil için touch end handler
function handleMobileTouchEnd(event) {
  setTimeout(() => {
    const selection = window.getSelection();
    let word = selection.toString().trim();
    
    if (!word) return;
    
    // Noktalama işaretlerini temizle
    word = word.replace(/[.,;:!?"'()[\]{}]/g, '');
    
    // Kelime kontrolü
    if (!word || word.length < 3) return;
    if (!/^[A-Za-z]+$/.test(word)) return;
    
    // Yaygın kelimeler hariç
    const commonWords = ['the', 'and', 'are', 'for', 'was', 'with', 'you', 'that', 'this'];
    if (commonWords.includes(word.toLowerCase())) return;
    
    console.log('📱 Word selected on mobile:', word);
    _explainWordImpl(word, 'chatMessages');
  }, 300); // 300ms bekle - kullanıcı seçimi tamamlasın
}

// Mesaja ÇİFT tıklanınca kelimeyi yakala
function handleWordDoubleClick(event) {
  // Tek tıklama: tıklanan kelimenin metnini al
  const el = event.target;
  let word = '';

  // Önce tıklanan element veya parent'ından kelime al
  const node = el.closest ? (el.closest('[data-word]') || el) : el;
  if (node && node.dataset && node.dataset.word) {
    word = node.dataset.word;
  } else {
    // Fallback: selection
    word = (window.getSelection().toString() || el.textContent || '').trim();
  }

  // Noktalama temizle
  word = word.replace(/[.,;:!?"'()[\]{}]/g, '').trim();

  if (!word || word.length < 2) return;
  if (!/^[A-Za-z]+$/.test(word)) return;

  const commonWords = ['the','and','are','for','was','with','you','that','this','a','an','in','on','at','to','of','is','it'];
  if (commonWords.includes(word.toLowerCase())) return;

  console.log('📖 Word clicked:', word);
  explainWord(word, 'chatMessages');
}

// Mobil için: Kelime seçilince otomatik açılsın
function handleWordSelection(event) {
  // Selection event'te target yok, anchorNode kullan
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode) return;
  
  // Parent elementi bul
  let parentElement = selection.anchorNode.parentElement;
  if (!parentElement) return;
  
  // Sadece AI mesajlarında çalış
  const validParent = parentElement.closest('.chat-msg.ai, .partner-msg.ai, .conv-msg.ai, .correction-box, #contextText, #storyTextContainer, #podcastTranscript');
  if (!validParent) return;
  
  // Kısa bir gecikme ile selection'ı kontrol et
  setTimeout(() => {
    let word = selection.toString().trim();
    
    if (!word) return;
    
    // Noktalama işaretlerini temizle
    word = word.replace(/[.,;:!?"'()[\]{}]/g, '');
    
    // Kelime kontrolü
    if (!word || word.length < 3) return;
    if (!/^[A-Za-z]+$/.test(word)) return;
    
    // Yaygın kelimeler hariç
    const commonWords = ['the', 'and', 'are', 'for', 'was', 'with', 'you', 'that', 'this'];
    if (commonWords.includes(word.toLowerCase())) return;
    
    console.log('📖 Word selected (mobile):', word);
    _explainWordImpl(word, 'chatMessages');
  }, 100);
}

// Mesaj içindeki kelimelere click event ekle - DOM tree traversal
function addWordClickListeners(element) {
  // Sadece EN yaygın kelimeler hariç (çok az kelime)
  const commonWords = ['the', 'and', 'are', 'for', 'was', 'with', 'you', 'that', 'this'];
  
  function processTextNode(textNode) {
    const text = textNode.textContent;
    const words = text.match(/\b[A-Za-z]{3,}\b/g);
    
    if (!words) return;
    
    // Fragment oluştur
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    // Her kelimeyi bul ve tıklanabilir span'a çevir
    const wordRegex = /\b([A-Za-z]{3,})\b/g;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      
      // Yaygın kelime değilse tıklanabilir yap
      if (!commonWords.includes(word.toLowerCase())) {
        // Önceki metin
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        
        // Tıklanabilir span
        const span = document.createElement('span');
        span.className = 'clickable-word';
        span.textContent = word;
        span.onclick = () => explainWord(word, 'chatMessages');
        fragment.appendChild(span);
        
        lastIndex = match.index + word.length;
      }
    }
    
    // Kalan metin
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    // Sadece değişiklik varsa replace et
    if (lastIndex > 0) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }
  
  // Tüm text node'ları bul ve işle
  function walkNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // span.clickable-word içindeyse işleme
      if (node.classList && node.classList.contains('clickable-word')) return;
      
      // Child node'ları işle
      const children = Array.from(node.childNodes);
      children.forEach(walkNodes);
    }
  }
  
  walkNodes(element);
}
async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  
  // Kullanıcı mesajı
  const userWrapper = document.createElement('div');
  userWrapper.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;justify-content:flex-end';
  
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = msg;
  
  userWrapper.appendChild(userDiv);
  document.getElementById('chatMessages').appendChild(userWrapper);
  
  chatHistory.push({ role: "user", content: msg });
  
  let systemPrompt, fullQuestion;
  
  if (chatMode === "turkish") {
    systemPrompt = `Sen yardımsever bir Türkçe asistansın. Kullanıcının sorularına Türkçe cevap ver. Samimi ve arkadaşça ol.
    
⚠️ ÇOK ÖNEMLİ KURALLAR:
- ASLA HTML, CSS veya renk kodu kullanma
- ASLA "color:", "font-weight:", "style=" yazma
- Sadece düz metin kullan
- **bold** için çift yıldız kullan
- *italic* için tek yıldız kullan - Örnekleri"tırnak" içinde göster`;
    fullQuestion = msg;
  } else {
    const currentWord = (words && words[idx]) ? words[idx] : null;
    const contextInfo = currentWord ? `Şu cümleyi öğreniyorum: "${currentWord.sentence || currentWord.word}" ${currentWord.sentenceTr ? `(Türkçe: "${currentWord.sentenceTr}")` : `(${currentWord.tr})`}. Ana kelime: "${currentWord.word}" (${currentWord.tr}).\n\n` : "";
    
    systemPrompt = `Sen bir İngilizce dil öğretmenisin. Seviye: ${aiUserLevel}

⚠️ KESİNLİKLE UYMAN GEREKEN KURALLAR:
1. ASLA HTML etiketi kullanma (<div>, <span>, <color>)
2. ASLA CSS kodu yazma (color:, font-weight:, style=)
3. ASLA renk kodu yazma (#22c55e, #60a5fa gibi)
4. ASLA "color:#xxx" veya "font-weight:xxx" yazma
5. Sadece DÜZ METİN kullan
6. **bold** için çift yıldız kullan
7. *italic* için tek yıldız kullan
8. Örnek cümleler için "tırnak" kullan
9. Madde işaretleri için • veya - kullan
10. Emoji kullanabilirsin 😊

EĞER YUKARIDAKİ KURALLARI İHLAL EDERSEN, CEVABIN GEÇERSİZ SAYILIR!`;
    
    fullQuestion = contextInfo + "Öğrenci sorusu: " + msg;
  }
  
  // AI mesajı wrapper
  const aiWrapper = document.createElement('div');
  aiWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:8px';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg ai';
  typingDiv.innerHTML = `<em style="color:var(--muted)">🤖 Yazıyor...</em>`;
  
  aiWrapper.appendChild(typingDiv);
  document.getElementById('chatMessages').appendChild(aiWrapper);
  aiWrapper.scrollIntoView({ behavior: 'smooth' });
  
  try {
    const aiResponse = await callAI(systemPrompt, fullQuestion, 'chat');
    let response = String(aiResponse.content || aiResponse);
    
    // ÖNCE tüm HTML/CSS kalıntılarını temizle
    response = cleanAIResponse(response);
    
    // SONRA güvenli vurgulamayı uygula
    const highlighted = highlightEnglishWords(response);
    typingDiv.innerHTML = highlighted.replace(/\n/g, '<br>');
    
    // Model badge
    if (aiResponse.model) {
      const modelNames = {
        'groq': 'Groq Llama 3.3',
        'openai': 'OpenAI GPT-4o-mini',
        'claude': 'Claude 3.5 Sonnet',
        'gemini': 'Gemini 2.5 Flash',
        'openrouter': 'OpenRouter'
      };
      const modelColors = {
        'groq': '#60a5fa',
        'openai': '#10b981',
        'claude': '#a78bfa',
        'gemini': '#f59e0b',
        'openrouter': '#22c55e'
      };
      
      const modelName = modelNames[aiResponse.model] || aiResponse.model;
      const modelColor = modelColors[aiResponse.model] || '#64748b';
      
      const badge = document.createElement('div');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid ${modelColor};
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
        color: ${modelColor};
        margin-left: 8px;
      `;
      badge.innerHTML = `🤖 ${modelName} <span style="opacity:0.6">• ${aiResponse.tokenLimit} token</span>`;
      aiWrapper.appendChild(badge);
    }
    
    chatHistory.push({ role: "assistant", content: response });
    if (chatHistory.length > 10) chatHistory.shift();
    
    // Ses butonları
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
    
    const aiSpeakBtn = document.createElement('button');
    aiSpeakBtn.innerHTML = '🔊 Sesli Oku';
    aiSpeakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
    aiSpeakBtn.onclick = () => readMessageAloud(typingDiv);
    buttonRow.appendChild(aiSpeakBtn);
    
    const aiStopBtn = document.createElement('button');
    aiStopBtn.innerHTML = '🔇 Durdur';
    aiStopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
    aiStopBtn.onclick = () => stopSpeech();
    buttonRow.appendChild(aiStopBtn);
    
    aiWrapper.appendChild(buttonRow);
    aiWrapper.scrollIntoView({ behavior: 'smooth' });
    
    if (enableAutoRead) {
      setTimeout(() => readMessageAloud(typingDiv), 500);
    }
    
    if (enableWordClick) {
      typingDiv.addEventListener('click', handleWordDoubleClick);
      typingDiv.addEventListener('touchend', handleMobileTouchEnd);
    }
    
  } catch (error) {
    console.error('Chat hatası:', error);
    typingDiv.innerHTML = `<span style="color:var(--red)">❌ ${error.message || 'Yanıt alınamadı'}</span>`;
  }
}

// AI cevaplarını formatla: nokta sonrası paragraf başlat
function formatAIResponse(text) {
  if (!text) return '';
  
  // Nokta, soru işareti, ünlem sonrası paragraf başlat
  // Ama kısaltmalar (Mr., Dr., vs.) ve sayılar (3.5) için değil
  let formatted = text
    // Nokta + boşluk + büyük harf = yeni paragraf
    .replace(/\.\s+([A-Z])/g, '.</p><p>$1')
    // Soru işareti + boşluk + büyük harf = yeni paragraf  
    .replace(/\?\s+([A-Z])/g, '?</p><p>$1')
    // Ünlem + boşluk + büyük harf = yeni paragraf
    .replace(/!\s+([A-Z])/g, '!</p><p>$1');
  
  // İlk ve son <p> etiketlerini ekle
  if (!formatted.startsWith('<p>')) {
    formatted = '<p>' + formatted;
  }
  if (!formatted.endsWith('</p>')) {
    formatted = formatted + '</p>';
  }
  
  // Boş paragrafları temizle
  formatted = formatted.replace(/<p>\s*<\/p>/g, '');
  
  return formatted;
}

let chatRecognition = null;
let isChatListening = false;

function toggleChatVoice() {
  if (isChatListening) {
    stopChatVoice();
  } else {
    startChatVoice();
  }
}

function startChatVoice() {
  try{ wmStopOpenMicStreams(); }catch(e){}

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Tarayıcınız ses tanımayı desteklemiyor. Chrome kullanın.');
    return;
  }
  
  chatRecognition = new SR();
  chatRecognition.lang = 'en-US';
  chatRecognition.continuous = false;
  chatRecognition.interimResults = true;
  
  const micBtn = document.getElementById('chatMicBtn');
  const statusEl = document.getElementById('chatVoiceStatus');
  const inputEl = document.getElementById('chatInput');
  
  micBtn.classList.add('listening');
  micBtn.textContent = '⏹️';
  statusEl.style.display = 'block';
  statusEl.innerHTML = '<em>🎤 Dinleniyor... İngilizce konuş</em>';
  isChatListening = true;
  
  chatRecognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    inputEl.value = transcript;
    statusEl.innerHTML = `<em style="color:var(--text)">Duyulan: "${transcript}"</em>`;
  };
  
  chatRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    stopChatVoice();
    statusEl.innerHTML = `<em style="color:var(--red)">❌ Hata: ${e.error === 'no-speech' ? 'Ses algılanamadı' : e.error}</em>`;
    setTimeout(() => statusEl.style.display = 'none', 3000);
  };
  
  chatRecognition.onend = () => {
    stopChatVoice();
    if (inputEl.value.trim()) {
      statusEl.innerHTML = '<em style="color:var(--green)">✅ Soru gönderiliyor...</em>';
      setTimeout(() => {
        sendChat();
        statusEl.style.display = 'none';
      }, 500);
    } else {
      statusEl.style.display = 'none';
    }
  };
  
  chatRecognition.start();
}

function stopChatVoice() {
  if (chatRecognition) {
    try {
      chatRecognition.stop();
    } catch (e) {}
  }
  
  const micBtn = document.getElementById('chatMicBtn');
  micBtn.classList.remove('listening');
  micBtn.textContent = '🎤';
  isChatListening = false;

  try{ wmStopOpenMicStreams(); wmResetMicButtons(); }catch(e){}
}


function initAIChat() {
  chatHistory = [];
  document.getElementById("chatMessages").innerHTML = "";
  const currentWord = words && words[idx] ? words[idx] : null;
  const welcomeMsg = currentWord ? 
    `Merhaba! 👋 Şu anda **"${currentWord.sentence || currentWord.word}"** cümlesini öğreniyorsun.\n\n${currentWord.sentenceTr ? `Türkçesi: "${currentWord.sentenceTr}"` : ""}\n\nBu cümle hakkında soru sorabilir, örnek cümle isteyebilir, dilbilgisi analizi isteyebilirsin. Nasıl yardımcı olabilirim?` :
    `Merhaba! 👋 Ben AI İngilizce öğretmenin.\n\nÖnce bir Excel dosyası yükleyip bir kelime seç, sonra bana o cümle hakkında soru sorabilirsin. Dilbilgisi, örnek cümleler, kelime analizi ve daha fazlası için buradayım!`;
  
  // Hoş geldin mesajı wrapper
  const welcomeWrapper = document.createElement('div');
  welcomeWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;gap:6px';
  
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'chat-msg ai';
  welcomeDiv.innerHTML = highlightEnglishWords(welcomeMsg.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
  
  welcomeWrapper.appendChild(welcomeDiv);
  
  // Ses butonları
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display:flex;gap:6px;margin-left:8px';
  
  const speakBtn = document.createElement('button');
  speakBtn.innerHTML = '🔊 Sesli Oku';
  speakBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--green);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  speakBtn.onclick = () => readMessageAloud(welcomeDiv);
  buttonRow.appendChild(speakBtn);
  
  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = '🔇 Durdur';
  stopBtn.style.cssText = 'padding:6px 12px;border:none;border-radius:8px;background:var(--red);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif';
  stopBtn.onclick = () => stopSpeech();
  buttonRow.appendChild(stopBtn);
  
  welcomeWrapper.appendChild(buttonRow);
  document.getElementById('chatMessages').appendChild(welcomeWrapper);
  
  const suggests = currentWord ? [
    "Bu cümledeki yapıları detaylı öğret",
    "Bu cümlenin gramer yapısını açıkla",
    "Bu cümleyle benzer 3 örnek ver",
    "Bu kelimenin kökeni nedir?",
    "Bu cümlenin zamanını açıkla",
    "Bu cümleyle aynı anlamı veren alternatif İngilizce cümleler nelerdir?"
  ] : [
    "İngilizce nasıl öğrenilir?",
    "Günlük İngilizce pratiği nasıl yapılır?"
  ];
  document.getElementById("chatSuggests").innerHTML = suggests.map(s => 
    `<div class="chat-chip" onclick="document.getElementById('chatInput').value='${s.replace(/'/g, "\\'")}';sendChat()">${s}</div>`
  ).join("");
}

function clearAIChat(){
  chatHistory=[];
  document.getElementById("chatMessages").innerHTML="";
  initAIChat();
}

function openAIChat() {
  chatWord = words && words[idx] ? words[idx] : null;
  showScreen("sc-ai");
  if (document.getElementById("chatMessages").children.length === 0) {
    initAIChat();
  }
}

// ══════════════════════════════════════════════════════════
// 27. AI KONUŞMA PARTNERİ
// ══════════════════════════════════════════════════════════
