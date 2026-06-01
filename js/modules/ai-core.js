/* ════════════════════════════════════════════════════════════════
   WordMode — modül: ai-core.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let tokenUsage = {
  total: 0,
  byKey: {}, // Her API key için ayrı
  byType: {},
  history: []
};

function loadTokenUsage() {
  const saved = localStorage.getItem('tokenUsage');
  if (saved) {
    try {
      tokenUsage = JSON.parse(saved);
      if (!tokenUsage.byKey) tokenUsage.byKey = {};
    } catch(e) {
      tokenUsage = { total: 0, byKey: {}, byType: {}, history: [] };
    }
  }
}

function saveTokenUsage() {
  localStorage.setItem('tokenUsage', JSON.stringify(tokenUsage));
}

function addTokenUsage(apiKey, type, inputTokens, outputTokens, model) {
  const total = (inputTokens || 0) + (outputTokens || 0);
  const keyLast4 = apiKey ? apiKey.slice(-4) : 'unknown';
  
  // Toplam
  tokenUsage.total += total;
  
  // API Key bazlı
  if (!tokenUsage.byKey[keyLast4]) {
    tokenUsage.byKey[keyLast4] = {
      total: 0,
      input: 0,
      output: 0,
      calls: 0,
      byType: {},
      model: model || 'unknown'
    };
  }
  tokenUsage.byKey[keyLast4].total += total;
  tokenUsage.byKey[keyLast4].input += (inputTokens || 0);
  tokenUsage.byKey[keyLast4].output += (outputTokens || 0);
  tokenUsage.byKey[keyLast4].calls += 1;
  tokenUsage.byKey[keyLast4].byType[type] = (tokenUsage.byKey[keyLast4].byType[type] || 0) + total;
  
  // Tip bazlı
  tokenUsage.byType[type] = (tokenUsage.byType[type] || 0) + total;
  
  // Geçmiş
  tokenUsage.history.push({
    timestamp: Date.now(),
    keyLast4: keyLast4,
    type: type,
    input: inputTokens || 0,
    output: outputTokens || 0,
    total: total,
    model: model || 'unknown'
  });
  
  // Son 200 kaydı tut
  if (tokenUsage.history.length > 200) {
    tokenUsage.history = tokenUsage.history.slice(-200);
  }
  
  saveTokenUsage();
  updateTokenDisplay();
}

function updateTokenDisplay() {
  const display = document.getElementById('tokenUsageDisplay');
  if (display) {
    display.textContent = formatNumber(tokenUsage.total);
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function showTokenStats() {
  let html = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;padding:20px;overflow-y:auto" onclick="this.style.display='none'">
      <div style="max-width:700px;margin:40px auto;background:var(--bg);border-radius:16px;padding:24px" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0">📊 Token İstatistikleri</h2>
          <button onclick="document.getElementById('tokenStatsModal').style.display='none'" style="width:32px;height:32px;border:none;background:var(--red);color:#fff;border-radius:8px;font-size:18px;cursor:pointer">×</button>
        </div>
        
        <div style="background:var(--bg2);padding:16px;border-radius:12px;margin-bottom:20px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Toplam Kullanım</div>
          <div style="font-size:32px;font-weight:700;color:var(--green)">${tokenUsage.total.toLocaleString()} token</div>
        </div>
        
        <div style="margin-bottom:20px">
          <h3 style="font-size:14px;margin-bottom:12px">🔑 API Key Bazlı:</h3>`;
    
    if (Object.keys(tokenUsage.byKey).length === 0) {
      html += `<div style="text-align:center;padding:20px;color:var(--muted)">Henüz token kullanılmamış</div>`;
    } else {
      for (const [keyLast4, stats] of Object.entries(tokenUsage.byKey)) {
        const percentage = ((stats.total / tokenUsage.total) * 100).toFixed(1);
        html += `
          <div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-weight:700">Key: ...${keyLast4}</span>
              <span style="color:var(--green)">${stats.total.toLocaleString()} (${percentage}%)</span>
            </div>
            <div style="font-size:11px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap">
              <span>📥 Input: ${stats.input.toLocaleString()}</span>
              <span>📤 Output: ${stats.output.toLocaleString()}</span>
              <span>📞 Çağrı: ${stats.calls}</span>
              <span>🤖 ${stats.model}</span>
            </div>
          </div>`;
      }
    }
    
    html += `
        </div>
        
        <div style="margin-bottom:20px">
          <h3 style="font-size:14px;margin-bottom:12px">📋 Türlere Göre:</h3>`;
    
    if (Object.keys(tokenUsage.byType).length === 0) {
      html += `<div style="text-align:center;padding:20px;color:var(--muted)">Henüz token kullanılmamış</div>`;
    } else {
      for (const [type, count] of Object.entries(tokenUsage.byType)) {
        const percentage = ((count / tokenUsage.total) * 100).toFixed(1);
        html += `
          <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:8px;margin-bottom:8px">
            <span style="font-weight:700">${type}</span>
            <span>${count.toLocaleString()} (${percentage}%)</span>
          </div>`;
      }
    }
    
    html += `
        </div>
        
        <button onclick="resetTokenStats()" class="btn" style="width:100%;background:var(--red);color:#fff">🔄 İstatistikleri Sıfırla</button>
      </div>
    </div>`;
  
  const modal = document.createElement('div');
  modal.id = 'tokenStatsModal';
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function resetTokenStats() {
  if (!confirm('Token istatistikleri sıfırlanacak. Emin misiniz?')) return;
  tokenUsage = { total: 0, byKey: {}, byType: {}, history: [] };
  saveTokenUsage();
  updateTokenDisplay();
  
  // Modal'ı kapat
  const modal = document.getElementById('tokenStatsModal');
  if (modal) modal.remove();
  
  showToast('🔄 Sıfırlandı', 'Token istatistikleri sıfırlandı');
}

loadTokenUsage();

function setStoryLevel(level) {
  selectedStoryLevel = level;
  document.querySelectorAll('[data-story-level]').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelector('[data-story-level="' + level + '"]').classList.add('active');
}

// Story ekranını aç (hikaye oluşturmadan)
function openStoryScreen() {
  showScreen("sc-story");
}

async function generateStory(){
  // Ekran zaten açık olmalı, sadece hikaye üret
  
  // Ayarlardan model yükle
  const savedModel = aiModelSettings.story || 'groq';
  const storyModelSelect = document.getElementById('storyAIModel');
  if(storyModelSelect) {
    storyModelSelect.value = savedModel;
  }
  
  // Ezberlenecekler listesini topla
  const toLearnWords = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('toLearnWords_')) {
      try {
        const wordData = JSON.parse(localStorage.getItem(key));
        if (wordData && wordData.word) {
          toLearnWords.push(wordData.word);
        }
      } catch(e) {
        console.warn('Kelime parse hatası:', e);
      }
    }
  }
  
  // En az 3 kelime gerekli
  if(toLearnWords.length < 3){
    document.getElementById("storyContent").innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:12px">😅</div>
        <p style="color:var(--muted)">En az 3 kelime eklemelisin!</p>
        <p style="font-size:13px;color:var(--muted);margin-top:8px">Ezberlenecekler listesine kelime ekledikten sonra hikaye oluşturabilirim.</p>
        <button onclick="showScreen('sc-word')" class="btn btn-blue" style="margin-top:16px">📖 Kelime Ekle</button>
      </div>`;
    document.getElementById("storyAudioControls").style.display = "none";
    document.getElementById("btnRegenerateStory").style.display = "none";
    return;
  }
  
  // En fazla 15 kelime kullan
  const selectedWords = toLearnWords.slice(0, 15);
  
  // Seviye yapılandırması
  const levelConfigs = {
    "beginner": {
      name: "Başlangıç (A1-A2)",
      wordCount: "100-120",
      instructions: "Çok basit kelimeler kullan. Kısa cümleler (5-8 kelime). Sadece Present Simple ve Past Simple. Karmaşık yapılardan kaçın."
    },
    "intermediate": {
      name: "Orta (B1-B2)",
      wordCount: "120-150",
      instructions: "Orta seviye kelimeler. Farklı zamanları karıştır. Bağlaçlar kullan (and, but, because, when). Akıcı okuma."
    },
    "advanced": {
      name: "İleri (C1-C2)",
      wordCount: "150-200",
      instructions: "Zengin kelime haznesi. Karmaşık yapılar (relative clauses, conditionals). İdiomatik ifadeler. Edebi dil."
    }
  };
  
  const config = levelConfigs[selectedStoryLevel] || levelConfigs["intermediate"];
  
  document.getElementById("storyContent").innerHTML = `
    <div style="text-align:center;padding:40px 20px;color:var(--muted)">
      <div style="font-size:48px;margin-bottom:12px">✨</div>
      <p>📊 Seviye: ${config.name}</p>
      <p>📌 Ezberlenecekler listenden ${selectedWords.length} kelime ile hikaye yazıyorum:</p>
      <div style="margin-top:12px;font-weight:700;color:var(--text)">${selectedWords.join(", ")}</div>
    </div>`;
  
  // Custom prompt kullan
  const promptTemplate = getPrompt('story');
  const systemPrompt = fillPromptTemplate(promptTemplate.system, {
    level: config.name,
    levelName: config.name
  });
  
  const userPrompt = fillPromptTemplate(promptTemplate.user, {
    topic: "User's learned words",
    levelName: config.name,
    wordCount: config.wordCount,
    words: selectedWords.join(", "),
    instructions: config.instructions
  });

  try {
    // Dinamik AI çağrısı
    const selectedModel = document.getElementById('storyAIModel')?.value || 'groq';
    console.log('📖 Story AI Model:', selectedModel);
    
    const aiResponse = await callAI(
      systemPrompt,
      userPrompt,
      'story' // story özelliği için story ayarlarını kullan
    );
    
    const story = String(aiResponse.content || aiResponse);
    currentStory = story;
    
    document.getElementById("storyContent").innerHTML = `
      <div style="background:var(--bg2);padding:16px;border-radius:12px;margin-bottom:12px" id="storyTextContainer">
        <div style="font-weight:700;color:var(--purple);margin-bottom:8px;font-size:12px">📚 Hikaye (${selectedWords.length} kelime)</div>
        <div style="line-height:1.8;font-size:14px">${highlightEnglishWords(story)}</div>
      </div>`;
    
    // Kelime tıklama ekle
    if (enableWordClick) {
      const storyContainer = document.getElementById('storyTextContainer');
      if (storyContainer) {
        storyContainer.addEventListener('click', handleWordDoubleClick);
        storyContainer.addEventListener('touchend', handleMobileTouchEnd);
      }
    }
    
    // Ses kontrol butonlarını göster
    document.getElementById("storyAudioControls").style.display = "flex";
    document.getElementById("btnSpeakStory").style.display = "block";
    document.getElementById("btnStopStory").style.display = "none";
    document.getElementById("btnRegenerateStory").style.display = "block";
  } catch(error) {
    document.getElementById("storyContent").innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:12px">❌</div>
        <p style="color:var(--red)">${error.message}</p>
      </div>`;
    document.getElementById("storyAudioControls").style.display = "none";
    document.getElementById("btnRegenerateStory").style.display = "none";
  }
}

// ══════════════════════════════════════════════════════════
// PODCAST LEARNING SYSTEM
// ══════════════════════════════════════════════════════════

// Podcast veritabanı
function loadAITokenSettings(){
  // Token ayarlarını yükle
  const storedTokens = localStorage.getItem('aiTokenSettings');
  if(storedTokens){
    try {
      aiTokenSettings = JSON.parse(storedTokens);
      console.log('🤖 AI token ayarları yüklendi:', aiTokenSettings);
    } catch(e){
      console.error('AI token ayarları yüklenemedi:', e);
    }
  }
  
  // Model ayarlarını yükle
  const storedModels = localStorage.getItem('aiModelSettings');
  if(storedModels){
    try {
      aiModelSettings = JSON.parse(storedModels);
      console.log('🤖 AI model ayarları yüklendi:', aiModelSettings);
    } catch(e){
      console.error('AI model ayarları yüklenemedi:', e);
    }
  }
  
  // API anahtarlarını yükle
  loadAPIKeys();
  
  // Token input alanlarına yükle
  document.getElementById('tokenExplain').value = aiTokenSettings.explain || 1500;
  document.getElementById('tokenQuiz').value = aiTokenSettings.quiz || 800;
  document.getElementById('tokenPronun').value = aiTokenSettings.pronun || 1000;
  document.getElementById('tokenWriting').value = aiTokenSettings.writing || 2000;
  document.getElementById('tokenChat').value = aiTokenSettings.chat || 8000;
  document.getElementById('tokenVisual').value = aiTokenSettings.visual || 1500;
  document.getElementById('tokenContext').value = aiTokenSettings.context || 1500;
  document.getElementById('tokenConversation').value = aiTokenSettings.conversation || 2000;
  document.getElementById('tokenStory').value = aiTokenSettings.story || 1500;
  document.getElementById('tokenPodcast').value = aiTokenSettings.podcast || 1500;
  
  // Model select alanlarına yükle
  document.getElementById('modelExplain').value = aiModelSettings.explain || 'groq';
  document.getElementById('modelQuiz').value = aiModelSettings.quiz || 'groq';
  document.getElementById('modelPronun').value = aiModelSettings.pronun || 'groq';
  document.getElementById('modelWriting').value = aiModelSettings.writing || 'claude';
  document.getElementById('modelChat').value = aiModelSettings.chat || 'openai';
  document.getElementById('modelVisual').value = aiModelSettings.visual || 'openai';
  document.getElementById('modelContext').value = aiModelSettings.context || 'groq';
  document.getElementById('modelConversation').value = aiModelSettings.conversation || 'groq';
  document.getElementById('modelStory').value = aiModelSettings.story || 'groq';
  document.getElementById('modelPodcast').value = aiModelSettings.podcast || 'groq';
  
  // API Key input alanlarına yükle
  if(document.getElementById('apiKeyGroq')) document.getElementById('apiKeyGroq').value = apiKeys.groq || '';
  if(document.getElementById('apiKeyOpenAI')) document.getElementById('apiKeyOpenAI').value = apiKeys.openai || '';
  if(document.getElementById('apiKeyClaude')) document.getElementById('apiKeyClaude').value = apiKeys.claude || '';
  if(document.getElementById('apiKeyGemini')) document.getElementById('apiKeyGemini').value = apiKeys.gemini || '';
  if(document.getElementById('apiKeyOpenRouter')) document.getElementById('apiKeyOpenRouter').value = apiKeys.openrouter || '';
}

function saveAPIKeysSettings(){
  // Groq 3 key'i topla
  const groqKeys = [
    document.getElementById('apiKeyGroq1')?.value.trim(),
    document.getElementById('apiKeyGroq2')?.value.trim(),
    document.getElementById('apiKeyGroq3')?.value.trim()
  ].filter(k => k); // Boş olmayanları al
  
  if (groqKeys.length > 0) {
    saveGroqKeys(groqKeys);
    apiKeys.groq = groqKeys[0]; // İlk key'i de apiKeys'e koy (compat)
  } else {
    apiKeys.groq = '';
  }
  
  // Diğer API anahtarları
  apiKeys.openai = document.getElementById('apiKeyOpenAI')?.value.trim() || '';
  apiKeys.claude = document.getElementById('apiKeyClaude')?.value.trim() || '';
  apiKeys.gemini = document.getElementById('apiKeyGemini')?.value.trim() || '';
  apiKeys.openrouter = document.getElementById('apiKeyOpenRouter')?.value.trim() || '';
  
  // Kaydet
  saveAPIKeys();
  
  // Hangi anahtarlar girilmiş göster
  let message = 'API Anahtarları kaydedildi:\n';
  if(groqKeys.length > 0) message += `✅ Groq (${groqKeys.length} key)\n`;
  if(apiKeys.openai) message += '✅ OpenAI\n';
  if(apiKeys.claude) message += '✅ Claude\n';
  if(apiKeys.gemini) message += '✅ Gemini\n';
  if(apiKeys.openrouter) message += '✅ OpenRouter (200+ model)\n';
  
  if(groqKeys.length === 0 && !apiKeys.openai && !apiKeys.claude && !apiKeys.gemini && !apiKeys.openrouter){
    message = '⚠️ Hiç API anahtarı girilmedi!';
  }
  
  showToast('🔑 Kaydedildi', message);
  console.log('💾 API anahtarları kaydedildi:', {
    groq: groqKeys.length > 0 ? `✅ (${groqKeys.length})` : '❌',
    openai: apiKeys.openai ? '✅' : '❌',
    claude: apiKeys.claude ? '✅' : '❌',
    gemini: apiKeys.gemini ? '✅' : '❌',
    openrouter: apiKeys.openrouter ? '✅' : '❌'
  });
}

function saveAITokenSettings(){
  aiTokenSettings = {
    explain: parseInt(document.getElementById('tokenExplain').value) || 1500,
    quiz: parseInt(document.getElementById('tokenQuiz').value) || 800,
    pronun: parseInt(document.getElementById('tokenPronun').value) || 1000,
    writing: parseInt(document.getElementById('tokenWriting').value) || 2000,
    chat: parseInt(document.getElementById('tokenChat').value) || 8000,
    visual: parseInt(document.getElementById('tokenVisual').value) || 1500,
    context: parseInt(document.getElementById('tokenContext').value) || 1500,
    conversation: parseInt(document.getElementById('tokenConversation').value) || 2000,
    story: parseInt(document.getElementById('tokenStory').value) || 1500,
    podcast: parseInt(document.getElementById('tokenPodcast').value) || 1500
  };
  
  aiModelSettings = {
    explain: document.getElementById('modelExplain').value || 'groq',
    quiz: document.getElementById('modelQuiz').value || 'groq',
    pronun: document.getElementById('modelPronun').value || 'groq',
    writing: document.getElementById('modelWriting').value || 'claude',
    chat: document.getElementById('modelChat').value || 'openai',
    visual: document.getElementById('modelVisual').value || 'openai',
    context: document.getElementById('modelContext').value || 'groq',
    conversation: document.getElementById('modelConversation').value || 'groq',
    story: document.getElementById('modelStory').value || 'groq',
    podcast: document.getElementById('modelPodcast').value || 'groq'
  };
  
  localStorage.setItem('aiTokenSettings', JSON.stringify(aiTokenSettings));
  localStorage.setItem('aiModelSettings', JSON.stringify(aiModelSettings));
  console.log('💾 AI token ayarları kaydedildi:', aiTokenSettings);
  console.log('💾 AI model ayarları kaydedildi:', aiModelSettings);
  
  showToast('✅ AI Ayarları Kaydedildi', 'Token limitleri ve modeller güncellendi');
  
  setTimeout(() => switchTab('word'), 800);
}

function getAITokenLimit(type){
  return aiTokenSettings[type] || 500;
}

function getAIModel(type){
  return aiModelSettings[type] || 'groq';
}

// ══════════════════════════════════════════════════════════
// DİNAMİK AI API SİSTEMİ - TÜM MODELLER
// ══════════════════════════════════════════════════════════

// API Anahtarları (localStorage'dan yüklenecek)
let apiKeys = {
  groq: '',
  openai: '',
  claude: '',
  gemini: ''
};

// Groq multi-key desteği
let GROQ_API_KEYS = [];

// Groq anahtarlarını kaydet
function saveGroqKeys(keys) {
  GROQ_API_KEYS = keys.filter(k => k && k.trim()); // Boş olmayanları al
  localStorage.setItem('groqApiKeys', JSON.stringify(GROQ_API_KEYS));
  console.log(`🔑 ${GROQ_API_KEYS.length} Groq API anahtarı kaydedildi`);
}

// Groq anahtarlarını yükle
function loadGroqKeys() {
  const stored = localStorage.getItem('groqApiKeys');
  if (stored) {
    try {
      GROQ_API_KEYS = JSON.parse(stored);
      console.log(`🔑 ${GROQ_API_KEYS.length} Groq API anahtarı yüklendi`);
    } catch(e) {
      console.error('Groq anahtarları yüklenemedi:', e);
      GROQ_API_KEYS = [];
    }
  }
}

// API anahtarlarını yükle
function loadAPIKeys() {
  // Önce Groq keylerini yükle
  loadGroqKeys();
  
  // ✅ GÜVENLİK İYİLEŞTİRMESİ: Şifrelenmiş keyleri çöz
  let stored = localStorage.getItem('apiKeys_secure');
  let isSecure = true;
  
  // Eski şifrelenmemiş versiyonu kontrol et
  if (!stored) {
    stored = localStorage.getItem('apiKeys');
    isSecure = false;
  }
  
  if(stored) {
    try {
      const parsedKeys = JSON.parse(stored);
      
      // Şifrelenmiş ise çöz
      if (isSecure && window.WM_Security) {
        for (const [provider, encryptedKey] of Object.entries(parsedKeys)) {
          apiKeys[provider] = WM_Security.decryptAPIKey(encryptedKey);
        }
        console.log('🔑 API anahtarları şifreli olarak yüklendi');
      } else {
        apiKeys = parsedKeys;
        console.log('🔑 API anahtarları yüklendi (şifrelenmemiş - yükseltme önerilir)');
        // Otomatik şifrele
        if (window.WM_Security) {
          saveAPIKeys(); // Şifreli olarak kaydet
        }
      }
      
      // Groq multi-key'leri inputlara yükle
      if (GROQ_API_KEYS.length > 0) {
        if(document.getElementById('apiKeyGroq1')) document.getElementById('apiKeyGroq1').value = GROQ_API_KEYS[0] || '';
        if(document.getElementById('apiKeyGroq2')) document.getElementById('apiKeyGroq2').value = GROQ_API_KEYS[1] || '';
        if(document.getElementById('apiKeyGroq3')) document.getElementById('apiKeyGroq3').value = GROQ_API_KEYS[2] || '';
      }
      
      // Diğer API key'leri inputlara yükle
      if(document.getElementById('apiKeyOpenAI')) document.getElementById('apiKeyOpenAI').value = apiKeys.openai || '';
      if(document.getElementById('apiKeyClaude')) document.getElementById('apiKeyClaude').value = apiKeys.claude || '';
      if(document.getElementById('apiKeyGemini')) document.getElementById('apiKeyGemini').value = apiKeys.gemini || '';
      if(document.getElementById('apiKeyOpenRouter')) document.getElementById('apiKeyOpenRouter').value = apiKeys.openrouter || '';
      
    } catch(e) {
      console.error('API anahtarları yüklenemedi:', e);
    }
  }
}

// API anahtarlarını kaydet
function saveAPIKeys() {
  // ✅ GÜVENLİK İYİLEŞTİRMESİ: API keyleri artık şifreleniyor
  try {
    const secureKeys = {};
    
    // Her bir key'i şifrele
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.trim()) {
        // Validasyon
        if (!WM_Security.validateAPIKey(key, provider)) {
          console.warn(`⚠️ Geçersiz ${provider} API key formatı`);
        }
        // Şifrele ve kaydet
        secureKeys[provider] = WM_Security.encryptAPIKey(key);
      }
    }
    
    localStorage.setItem('apiKeys_secure', JSON.stringify(secureKeys));
    console.log('🔑 API anahtarları şifrelenmiş olarak kaydedildi');
    
    // Eski şifrelenmemiş versiyonu temizle
    localStorage.removeItem('apiKeys');
  } catch (error) {
    console.error('API key kaydetme hatası:', error);
    // Fallback: şifreleme başarısız olursa düz metin kaydet
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }
}

// Dinamik AI çağrısı - model seçimine göre doğru API'yi çağırır
async function callAI(systemPrompt, userMessage, aiType) {
  let fallbackAttempted = false;

  const model = getAIModel(aiType);
  const tokenLimit = getAITokenLimit(aiType);
  
  // Cache key oluştur - Unicode-safe
  const cacheKey = `ai_cache_${aiType}_${encodeURIComponent(userMessage).substring(0, 50).replace(/%/g, '_')}`;
  
  // Offline ise cache'den getir
  if (!navigator.onLine) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('📦 Offline: Cache\'den yanıt döndürüldü');
      try {
        return JSON.parse(cached);
      } catch(e) {
        console.error('Cache parse hatası:', e);
      }
    }
    throw new Error('İnternet bağlantısı yok ve cache\'de veri bulunamadı');
  }
  
  console.log(`🤖 callAI - Type: ${aiType}, Model: ${model}, Tokens: ${tokenLimit}`);
  console.log(`📊 Seçilen Model: ${model}`);
  
  let result, actualModel;
  
  try {
    switch(model) {
      case 'groq':
        console.log('🔵 Groq API çağrılıyor...');
        result = await callGroqAPI(systemPrompt, userMessage, tokenLimit);
        actualModel = 'groq';
        console.log('✅ Groq API yanıt verdi');
        break;
      case 'openai':
        console.log('🟢 OpenAI API çağrılıyor...');
        result = await callOpenAI(systemPrompt, userMessage, tokenLimit);
        actualModel = 'openai';
        console.log('✅ OpenAI API yanıt verdi');
        break;
      case 'claude':
        console.log('🟣 Claude API çağrılıyor...');
        result = await callClaudeAPI(systemPrompt, userMessage, tokenLimit);
        actualModel = 'claude';
        console.log('✅ Claude API yanıt verdi');
        break;
      case 'gemini':
        console.log('🟠 Gemini API çağrılıyor...');
        result = await callGeminiAPI(systemPrompt, userMessage, tokenLimit);
        actualModel = 'gemini';
        console.log('✅ Gemini API yanıt verdi');
        break;
      case 'openrouter':
        console.log('🌐 OpenRouter API çağrılıyor...');
        result = await callOpenRouterAPI(systemPrompt, userMessage, tokenLimit);
        actualModel = 'openrouter';
        console.log('✅ OpenRouter API yanıt verdi');
        break;
      default:
        throw new Error('Geçersiz model: ' + model);
    }
    
    console.log(`✅ BAŞARILI - Kullanılan Model: ${actualModel}, Token Limiti: ${tokenLimit}`);
    
    // Gerçek kullanılan model bilgisini döndür
    const response = {
      content: result,
      model: actualModel,
      tokenLimit: tokenLimit
    };
    
    // Başarılı yanıtı cache'le
    try {
      localStorage.setItem(cacheKey, JSON.stringify(response));
    } catch(e) {
      console.warn('Cache kayıt hatası:', e);
    }
    
    return response;
    
  } catch(error) {
    console.error(`❌ ${model} API hatası:`, error.message);
    
    // AKILLI FALLBACK SİSTEMİ: Hata varsa OpenRouter'a geç
    if (!fallbackAttempted && model !== 'openrouter' && apiKeys.openrouter) {
      fallbackAttempted = true;
      console.log('🔄 FALLBACK: OpenRouter\'a geçiliyor...');
      
      try {
        result = await callOpenRouterAPI(systemPrompt, userMessage, tokenLimit);
        console.log('✅ FALLBACK BAŞARILI: OpenRouter yanıt verdi');
        
        return {
          content: result + '\n\n_↻ OpenRouter ile yanıtlandı (ana model hata verdi)_',
          model: 'openrouter',
          tokenLimit: tokenLimit
        };
      } catch(fallbackError) {
        console.error('❌ FALLBACK BAŞARISIZ:', fallbackError.message);
        throw new Error(`${model} hatası: ${error.message}\nFallback hatası: ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}
// ══════════════════════════════════════════════════════════
// GELİŞMİŞ HATA YÖNETİMİ VE RETRY MEKANİZMASI
// ══════════════════════════════════════════════════════════

async function callAIWithRetry(systemPrompt, userMessage, aiType, maxRetries = 2) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 AI çağrısı yeniden deneniyor (${attempt}/${maxRetries})...`);
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      
      const result = await callAI(systemPrompt, userMessage, aiType);
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Deneme ${attempt + 1} başarısız:`, error.message);
      
      // Rate limit hatası - daha uzun bekle
      if (error.message.includes('rate') || error.message.includes('429')) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error(`AI çağrısı ${maxRetries + 1} kez başarısız oldu: ${lastError?.message}`);
}

// ══════════════════════════════════════════════════════════
// COMPRESSED STORAGE (localStorage optimizasyonu)
// ══════════════════════════════════════════════════════════

