const DEFAULT_PROMPTS = {
  explain: 'You are an English teacher explaining words to Turkish learners.',
  quiz: 'You are creating English vocabulary quizzes for Turkish learners.',
  story: 'You are a creative story writer helping Turkish learners practice English.',
  visual: 'You are a visual English vocabulary teacher. Respond in Turkish.',
  context: 'You are an English teacher analyzing sentences for Turkish learners.',
  relations: 'You are an English vocabulary expert.',
  pronunciation: 'You are a pronunciation coach.',
  conversation: 'You are a conversation partner helping with English practice.'
};

function getPrompt(type) {
  const custom = localStorage.getItem('prompt_' + type);
  return custom || DEFAULT_PROMPTS[type] || '';
}

function savePrompt(type, text) {
  if (text.trim()) {
    localStorage.setItem('prompt_' + type, text.trim());
  } else {
    localStorage.removeItem('prompt_' + type);
  }
}

function renderPromptsUI() {
  const container = document.getElementById('promptsContainer');
  if (!container) return;
  
  const prompts = [
    { key: 'explain', label: '📖 Kelime Açıklama', desc: 'Kelimeye tıklayınca açıklama' },
    { key: 'relations', label: '🔗 Kelime İlişkileri', desc: 'Synonyms, antonyms, collocations' },
    { key: 'quiz', label: '❓ AI Test', desc: 'Quiz soruları üretir' },
    { key: 'story', label: '📚 Hikaye', desc: 'Kelimelerle hikaye yazar' },
    { key: 'context', label: '🧠 Bağlam Analizi', desc: 'Cümle içinde kelime analizi' },
    { key: 'visual', label: '🎨 Görsel', desc: 'Kelime görselleri' },
    { key: 'pronunciation', label: '🎤 Telaffuz', desc: 'Telaffuz koçu' },
    { key: 'conversation', label: '💬 Konuşma', desc: 'Sohbet simülasyonu' }
  ];
  
  container.innerHTML = prompts.map(p => `
    <div style="margin-bottom:16px;padding:12px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.label}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${p.desc}</div>
      <textarea id="prompt_${p.key}" rows="3" placeholder="${DEFAULT_PROMPTS[p.key]}" style="width:100%;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-family:monospace;resize:vertical">${getPrompt(p.key)}</textarea>
    </div>
  `).join('');
}

function savePrompts() {
  const keys = Object.keys(DEFAULT_PROMPTS);
  keys.forEach(key => {
    const el = document.getElementById('prompt_' + key);
    if (el) savePrompt(key, el.value);
  });
  showToast('💾 Kaydedildi', 'Promptlar güncellendi');
}
