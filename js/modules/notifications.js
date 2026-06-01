/* ════════════════════════════════════════════════════════════════
   WordMode — modül: notifications.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

async function sendNotificationViaSW(title, body, tag = 'word-mode') {
  try {
    // Service Worker disabled olduğu için fallback
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker desteklenmiyor, bildirim atlanıyor');
      return false;
    }
    
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag
      });
      return true;
    } else {
      throw new Error('Service Worker aktif değil');
    }
  } catch (error) {
    console.warn('Service Worker bildirimi gönderilemedi:', error);
    // Fallback: Normal notification
    if (Notification.permission === 'granted') {
      new Notification(title, { body, tag });
    }
    return false;
  }
}

// Hatırlatma sistemini güncelle
function scheduleReminderImproved() {
  if (reminderTimer) clearInterval(reminderTimer);
  
  const raw = localStorage.getItem('reminderSettings');
  if (!raw) return;
  
  const settings = JSON.parse(raw);
  if (!settings.dailyActive || Notification.permission !== 'granted') return;
  
  const [targetHour, targetMinute] = (settings.time || '09:00').split(':').map(Number);
  
  function checkAndSendReminder() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayKey = `reminder_sent_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}`;
    
    if (localStorage.getItem(todayKey)) return;
    
    const isTargetTime = (currentHour === targetHour && currentMinute === targetMinute);
    const justMissed = (currentHour === targetHour && currentMinute > targetMinute && currentMinute <= targetMinute + 5);
    
    if (isTargetTime || justMissed) {
      localStorage.setItem(todayKey, 'true');
      sendNotificationViaSW(
        '📚 Günlük Kelime Zamanı',
        settings.msg || 'Bugün kelime çalışma zamanı! 🌱',
        'daily-reminder'
      );
    }
  }
  
  reminderTimer = setInterval(checkAndSendReminder, 30000);
  setTimeout(checkAndSendReminder, 1000);
}
// OpenRouter API - SADECE ÜCRETSİZ MODELLER
async function callOpenRouterAPI(systemPrompt, userMessage, maxTokens = 500) {
  if(!apiKeys.openrouter) {
    throw new Error('OpenRouter API anahtarı girilmemiş. Ayarlar > API Anahtarları\'ndan ekleyin.');
  }
  
  // MODEL SEÇİMİ
  const preferredModels = [
    'anthropic/claude-3.5-sonnet',           // Claude Sonnet 3.5
    'anthropic/claude-3-opus',               // Claude Opus
    'google/gemini-2.0-flash-exp:free',      // Ücretsiz fallback
    'meta-llama/llama-3.3-70b-instruct:free' // Ücretsiz fallback
  ];
  
  const selectedModel = preferredModels[0]; // Claude Sonnet öncelik
  
  console.log('🌐 OpenRouter API çağrısı başlatılıyor...');
  console.log('Model:', selectedModel);
  console.log('Max tokens:', maxTokens);
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openrouter}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'Kelime Öğrenme Programı'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    
    if(!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API hatası:', response.status, errorText);
      
      let errorMessage = 'OpenRouter API hatası';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      } catch(e) {
        errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ OpenRouter API yanıt başarılı');
    console.log('📊 Kullanılan model:', data.model || selectedModel);
    console.log('💰 Maliyet: $0.00 (ÜCRETSIZ)');
    return data.choices?.[0]?.message?.content || '';
    
  } catch(error) {
    if(error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('OpenRouter API bağlantı hatası. İnternet bağlantınızı kontrol edin.');
    }
    throw error;
  }
}

// OpenAI API
async function callOpenAI(systemPrompt, userMessage, maxTokens = 500) {
  if(!apiKeys.openai) {
    throw new Error('OpenAI API anahtarı girilmemiş. Ayarlar > API Anahtarları\'ndan ekleyin.');
  }
  
  console.log('🟢 OpenAI API çağrısı başlatılıyor...');
  console.log('Model: gpt-4o-mini');
  console.log('Max tokens:', maxTokens);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    
    if(!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API hatası:', response.status, errorText);
      
      let errorMessage = 'OpenAI API hatası';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      } catch(e) {
        errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ OpenAI API yanıt başarılı');
    return data.choices?.[0]?.message?.content || '';
    
  } catch(error) {
    // CORS veya network hatası
    if(error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('OpenAI API tarayıcıdan erişilemez (CORS hatası). Lütfen başka model seçin veya backend kullanın.');
    }
    throw error;
  }
}

// Claude API (Anthropic)
async function callClaudeAPI(systemPrompt, userMessage, maxTokens = 500) {
  if(!apiKeys.claude) {
    throw new Error('Claude API anahtarı girilmemiş. Ayarlar > API Anahtarları\'ndan ekleyin.');
  }
  
  console.log('🟣 Claude API çağrısı başlatılıyor...');
  console.log('Model: claude-3-5-sonnet-20241022');
  console.log('Max tokens:', maxTokens);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.claude,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });
    
    if(!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API hatası:', response.status, errorText);
      
      let errorMessage = 'Claude API hatası';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      } catch(e) {
        errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ Claude API yanıt başarılı');
    return data.content?.[0]?.text || '';
    
  } catch(error) {
    // CORS veya network hatası
    if(error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Claude API tarayıcıdan erişilemez (CORS hatası). Lütfen başka model seçin veya backend kullanın.');
    }
    throw error;
  }
}

// Google Gemini API
async function callGeminiAPI(systemPrompt, userMessage, maxTokens = 500) {
  if(!apiKeys.gemini) {
    throw new Error('Gemini API anahtarı girilmemiş. Ayarlar > API Anahtarları\'ndan ekleyin.');
  }
  
  console.log('🟠 Gemini API çağrısı başlatılıyor...');
  console.log('Model: gemini-2.5-flash');
  console.log('Max tokens:', maxTokens);
  
  // Gemini 2.5 Flash (en yeni model)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeys.gemini}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n' + userMessage
        }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7
      }
    })
  });
  
  if(!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini API hatası:', response.status, errorText);
    
    let errorMessage = 'Gemini API hatası';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    } catch(e) {
      errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('✅ Gemini API yanıt başarılı');
  console.log('📊 Full Response:', JSON.stringify(data, null, 2));
  
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const content = candidate?.content?.parts?.[0]?.text || '';
  
  console.log('🔍 Finish Reason:', finishReason);
  console.log('📝 Content Length:', content.length, 'characters');
  console.log('📄 Content:', content);
  
  // Eğer yanıt kesilmişse uyar
  if(finishReason === 'MAX_TOKENS') {
    console.warn('⚠️ Yanıt token limitine ulaştı, kesilmiş olabilir!');
  }
  
  return content;
}

// AI Model Badge Gösterme
function showAIModelBadge(containerId, type) {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  const model = getAIModel(type);
  const tokenLimit = getAITokenLimit(type);
  
  // Model isimleri
  const modelNames = {
    'groq': 'Groq Llama 3.3',
    'openai': 'OpenAI GPT-4',
    'claude': 'Claude Sonnet',
    'gemini': 'Google Gemini'
  };
  
  // Model renkleri
  const modelColors = {
    'groq': '#60a5fa',
    'openai': '#10b981',
    'claude': '#a78bfa',
    'gemini': '#f59e0b',
        'openrouter': '#22c55e'
  };
  
  const modelName = modelNames[model] || model;
  const modelColor = modelColors[model] || '#64748b';
  
  const badge = document.createElement('div');
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0,0,0,0.3);
    border: 1px solid ${modelColor};
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: ${modelColor};
    margin-top: 8px;
  `;
  badge.innerHTML = `🤖 ${modelName} <span style="opacity:0.6">• ${tokenLimit} token</span>`;
  
  // Eğer zaten badge varsa güncelle, yoksa ekle
  const existingBadge = container.querySelector('.ai-model-badge');
  if(existingBadge) {
    existingBadge.replaceWith(badge);
  } else {
    container.insertBefore(badge, container.firstChild);
  }
  badge.className = 'ai-model-badge';
}

// ══════════════════════════════════════════════════════════
// LOCALSTORAGE KONTROL VE DEBUG
// ══════════════════════════════════════════════════════════

