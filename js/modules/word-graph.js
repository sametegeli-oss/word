/* ════════════════════════════════════════════════════════════════
   WordMode — modül: word-graph.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

let wgData = null;        // { nodes, links }
let wgSimulation = null;
let wgFilter = 'all';
let wgRelCache = {};      // AI'dan gelen ilişki verileri cache

// ── Ekran açılınca ──
const _origShowScreenWG = window.showScreen;
window.showScreen = function(id) {
  if (_origShowScreenWG) _origShowScreenWG(id);
  if (id === 'sc-wordgraph') {
    setTimeout(() => {
      if (!wgData) buildWordGraph();
      else wgRender(wgData);
    }, 150);
  }
};

// ── Graf verisi oluştur ──
async function buildWordGraph() {
  const pool = allWords.filter(w => w.word && w.tr);
  if (pool.length < 3) {
    showToast('⚠️', 'En az 3 kelime gerekli');
    return;
  }

  const loading = document.getElementById('wg-loading');
  const container = document.getElementById('wg-container');
  if (loading) loading.style.display = 'block';
  if (container) container.style.opacity = '0.3';

  // Maks 80 kelime — daha fazlası için rastgele örnekle
  const sample = pool.length > 80
    ? [...pool].sort(() => Math.random() - .5).slice(0, 80)
    : pool;

  const nodes = sample.map(w => ({
    id: w.word,
    word: w.word,
    tr: w.tr,
    topic: w.topic || 'genel',
    phonetic: w.phonetic || '',
    sentence: w.sentence || '',
    learned: learnedSet.has(w.word),
    srsLevel: spacedRepetition[w.word]?.level || 0,
  }));

  // AI'dan ilişki verisi çek (cache kullan)
  await wgFetchRelations(nodes, (pct) => {
    const bar = document.getElementById('wg-progress');
    const txt = document.getElementById('wg-loading-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `İlişkiler analiz ediliyor... %${pct}`;
  });

  // Kenarları oluştur
  const links = wgBuildLinks(nodes);

  wgData = { nodes, links };
  if (loading) loading.style.display = 'none';
  if (container) container.style.opacity = '1';
  wgRender(wgData);
}

// ── AI'dan kelime ilişkisi çek ──
async function wgFetchRelations(nodes, onProgress) {
  // 📦 Önce localStorage cache'inden yükle (in-memory wgRelCache'i doldur)
  for (const n of nodes) {
    if (!wgRelCache[n.word]) {
      const cached = _aiCache.get('linguistics', n.word);
      if (cached && cached.data) {
        wgRelCache[n.word] = cached.data;
      }
    }
  }

  // Gruplara böl (5'er kelime — token tasarrufu)
  const BATCH = 5;
  const uncached = nodes.filter(n => !wgRelCache[n.word]);
  const batches = [];
  for (let i = 0; i < uncached.length; i += BATCH) {
    batches.push(uncached.slice(i, i + BATCH));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const wordList = batch.map(n => n.word).join(', ');
    onProgress(Math.round((b / batches.length) * 100));

    try {
      const prompt = `For these English words: ${wordList}
Return ONLY a JSON object like this (no extra text):
{
  "word1": { "root": "latin_root", "family": ["related1","related2"], "topics": ["topic1","topic2"], "collocates": ["often_used_with1","often_used_with2"] },
  "word2": { ... }
}
Keep it minimal. topics should be 1-2 words like "medicine","technology","emotion","nature","business","academic".`;

      const res = await callAI(
        'You are a concise English linguistics assistant. Return only valid JSON.',
        prompt, 'explain'
      );
      const raw = (res.content || res || '').trim()
        .replace(/```json|```/g, '').trim();

      let parsed;
      try { parsed = JSON.parse(raw); } catch(e) { continue; }

      Object.assign(wgRelCache, parsed);
      // 💾 Her kelimeyi localStorage cache'ine de yaz
      for (const [w, data] of Object.entries(parsed)) {
        try { _aiCache.set('linguistics', w, data); } catch(e) {}
      }
    } catch(e) {
      console.warn('[WG] Batch failed:', e.message);
    }
  }
  onProgress(100);
}

// ── Kenar listesi oluştur ──
function wgBuildLinks(nodes) {
  const links = [];
  const wordSet = new Set(nodes.map(n => n.word));
  const added = new Set();

  const addLink = (source, target, type, strength) => {
    const key = [source, target].sort().join('|');
    if (!added.has(key) && source !== target) {
      added.add(key);
      links.push({ source, target, type, strength });
    }
  };

  // 1. AI ilişki verisinden bağlantılar
  nodes.forEach(n => {
    const rel = wgRelCache[n.word];
    if (!rel) return;

    // Kelime ailesi bağlantıları
    rel.family?.forEach(f => {
      if (wordSet.has(f)) addLink(n.word, f, 'family', 0.9);
    });

    // Aynı kök bağlantıları
    if (rel.root) {
      nodes.forEach(m => {
        if (m.word !== n.word && wgRelCache[m.word]?.root === rel.root) {
          addLink(n.word, m.word, 'root', 0.7);
        }
      });
    }

    // Aynı konu bağlantıları
    rel.topics?.forEach(topic => {
      nodes.forEach(m => {
        if (m.word !== n.word && wgRelCache[m.word]?.topics?.includes(topic)) {
          addLink(n.word, m.word, 'topic', 0.4);
        }
      });
    });

    // Collocate bağlantıları
    rel.collocates?.forEach(c => {
      if (wordSet.has(c)) addLink(n.word, c, 'collocate', 0.6);
    });
  });

  // 2. Aynı topic (kelime datasından) bağlantıları
  nodes.forEach(n => {
    nodes.forEach(m => {
      if (n.topic && n.topic === m.topic && n.word !== m.word) {
        addLink(n.word, m.word, 'topic', 0.3);
      }
    });
  });

  return links;
}

// ── D3 Graf Render ──
function wgRender(data) {
  const svg = d3.select('#wg-svg');
  svg.selectAll('*').remove();

  const container = document.getElementById('wg-container');
  const W = container.clientWidth || 360;
  const H = container.clientHeight || 500;

  // Filtreye göre node'ları filtrele
  let nodes = data.nodes;
  if (wgFilter === 'learned') nodes = nodes.filter(n => n.learned);
  if (wgFilter === 'topic')   nodes = [...nodes].sort((a,b) => a.topic.localeCompare(b.topic));

  const nodeIds = new Set(nodes.map(n => n.id));
  const links = data.links.filter(l =>
    nodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
    nodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
  );

  // Renk skalası — konuya göre
  const topics = [...new Set(nodes.map(n => n.topic))];
  const topicColor = d3.scaleOrdinal(d3.schemeTableau10).domain(topics);

  // Link renkleri
  const linkColors = {
    family: '#a78bfa', root: '#60a5fa',
    topic: 'rgba(255,255,255,0.08)', collocate: '#34d399'
  };

  // SVG kurulum
  const g = svg.append('g');

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (e) => g.attr('transform', e.transform));
  svg.call(zoom);

  // Simulation
  if (wgSimulation) wgSimulation.stop();
  wgSimulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id)
      .distance(d => d.type === 'family' ? 60 : d.type === 'root' ? 80 : 120)
      .strength(d => d.strength))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide().radius(d => wgNodeRadius(d) + 4));

  // Kenarlar
  const link = g.append('g').selectAll('line')
    .data(links).join('line')
    .attr('stroke', d => linkColors[d.type] || 'rgba(255,255,255,0.1)')
    .attr('stroke-width', d => d.type === 'family' ? 2 : 1)
    .attr('stroke-opacity', d => d.type === 'topic' ? 0.3 : 0.6)
    .attr('stroke-dasharray', d => d.type === 'collocate' ? '4,2' : null);

  // Düğümler
  const node = g.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) wgSimulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',  (e, d) => { d.fx=e.x; d.fy=e.y; })
      .on('end',   (e, d) => { if (!e.active) wgSimulation.alphaTarget(0); d.fx=null; d.fy=null; })
    )
    .on('click', (e, d) => { e.stopPropagation(); wgShowTooltip(d, e); });

  // Daire
  node.append('circle')
    .attr('r', d => wgNodeRadius(d))
    .attr('fill', d => {
      if (d.learned) return '#22c55e';
      if (d.srsLevel > 0) return '#3b82f6';
      return topicColor(d.topic);
    })
    .attr('stroke', d => d.learned ? '#4ade80' : 'rgba(255,255,255,0.2)')
    .attr('stroke-width', d => d.learned ? 2 : 1)
    .attr('fill-opacity', 0.85);

  // Etiket
  node.append('text')
    .text(d => d.word)
    .attr('text-anchor', 'middle')
    .attr('dy', d => wgNodeRadius(d) + 11)
    .attr('fill', d => d.learned ? '#4ade80' : 'rgba(255,255,255,0.75)')
    .attr('font-size', d => Math.max(8, Math.min(11, wgNodeRadius(d) * 1.1)))
    .attr('font-family', 'Nunito, sans-serif')
    .attr('font-weight', d => d.learned ? '800' : '600')
    .attr('pointer-events', 'none');

  // Simulation tick
  wgSimulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Boş alana tıklayınca tooltip kapat
  svg.on('click', () => {
    const tt = document.getElementById('wg-tooltip');
    if (tt) tt.style.display = 'none';
  });
}

// ── Düğüm yarıçapı ──
function wgNodeRadius(d) {
  const base = d.learned ? 14 : 10;
  return base + Math.min(d.srsLevel * 1.5, 6);
}

// ── Tooltip ──
function wgShowTooltip(d, event) {
  const tt = document.getElementById('wg-tooltip');
  const rel = wgRelCache[d.word] || {};
  const container = document.getElementById('wg-container');
  const rect = container.getBoundingClientRect();

  const srsLabels = ['🌱 Yeni','📘 Başlangıç','📗 Orta','📙 İyi','⭐ Güçlü','🌟 Çok Güçlü','🏆 Uzman'];
  const nextReview = spacedRepetition[d.word]?.nextReview;
  const nextStr = nextReview ? new Date(nextReview).toLocaleDateString('tr-TR') : '—';

  tt.innerHTML = `
    <div style="font-size:15px;font-weight:900;color:${d.learned?'#4ade80':'var(--text)'};margin-bottom:4px">
      ${d.word} ${d.learned ? '✅' : ''}
    </div>
    <div style="font-size:12px;color:var(--sub);margin-bottom:6px">${d.tr}</div>
    ${d.phonetic ? `<div style="font-size:11px;color:var(--muted);margin-bottom:4px">${d.phonetic}</div>` : ''}
    <div style="font-size:11px;color:var(--purple);margin-bottom:4px">📂 ${d.topic}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${srsLabels[d.srsLevel] || '🌱 Yeni'}</div>
    ${nextReview ? `<div style="font-size:10px;color:var(--muted)">📅 Sonraki: ${nextStr}</div>` : ''}
    ${rel.root ? `<div style="font-size:10px;color:#60a5fa;margin-top:4px">🌿 Kök: <b>${rel.root}</b></div>` : ''}
    ${rel.family?.length ? `<div style="font-size:10px;color:#a78bfa;margin-top:2px">👨‍👩‍👧 Aile: ${rel.family.slice(0,4).join(', ')}</div>` : ''}
    ${rel.topics?.length ? `<div style="font-size:10px;color:#34d399;margin-top:2px">🏷️ Konular: ${rel.topics.join(', ')}</div>` : ''}
    ${d.sentence ? `<div style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic;line-height:1.4">"${d.sentence.substring(0,80)}${d.sentence.length>80?'...':''}"</div>` : ''}
    <div style="display:flex;gap:6px;margin-top:8px">
      <button onclick="speak('${d.word}','en-US')" style="flex:1;padding:5px;background:#052e16;color:#4ade80;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">🔊</button>
      <button onclick="showWordJourney('${d.word}')" style="flex:1;padding:5px;background:#1e1635;color:#a78bfa;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">📊</button>
    </div>
  `;
  tt.style.display = 'block';

  // Pozisyon — ekran dışına taşma önle
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  tt.style.left = Math.min(x + 10, rect.width - 210) + 'px';
  tt.style.top  = Math.min(y + 10, rect.height - 220) + 'px';
}

// ── Filtre ──
function wgSetFilter(f) {
  wgFilter = f;
  ['all','learned','topic'].forEach(id => {
    const btn = document.getElementById('wg-filter-' + id);
    if (btn) {
      btn.style.background = id === f ? 'var(--purple)' : 'var(--bg3)';
      btn.style.color = id === f ? '#fff' : 'var(--sub)';
    }
  });
  if (wgData) wgRender(wgData);
}

// ── Arama / vurgulama ──
function wgHighlightSearch(query) {
  if (!wgSimulation) return;
  const q = query.toLowerCase().trim();
  d3.selectAll('#wg-svg circle')
    .attr('stroke', d => {
      if (!q) return d.learned ? '#4ade80' : 'rgba(255,255,255,0.2)';
      return (d.word.toLowerCase().includes(q) || d.tr.toLowerCase().includes(q))
        ? '#fbbf24' : 'rgba(255,255,255,0.05)';
    })
    .attr('stroke-width', d => {
      if (!q) return d.learned ? 2 : 1;
      return (d.word.toLowerCase().includes(q) || d.tr.toLowerCase().includes(q)) ? 3 : 1;
    });
}

console.log('✅ Kelime Grafiği modülü yüklendi');


/* ===== extracted script block ===== */


// ====================================================================
// WM_Dictionary: yerel sözlük — hibrit yükleme
// ====================================================================
window.WM_Dictionary = null; // başlangıçta boş, async yüklenir
window.WM_DictionarySource = null;
window.WM_DictionaryReady = (async function loadDictionary() {
  // 1) Kullanıcının yüklediği özel sözlük varsa öncelikli (Settings'ten yüklediği)
  try {
    const userJson = localStorage.getItem('wm_user_dictionary');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && typeof user === 'object' && Object.keys(user).length > 0) {
        window.WM_Dictionary = user;
        window.WM_DictionarySource = 'user';
        console.log('📚 Sözlük yüklendi (kullanıcı):', Object.keys(user).length, 'kelime');
        return user;
      }
    }
  } catch(e) { console.warn('Kullanıcı sözlüğü okunamadı:', e.message); }

  // 2) Kullanıcı yüklemesi yoksa: sozluk.json'u fetch ile dene (GitHub/server'da çalışır)
  try {
    const res = await fetch('sozluk.json', { cache: 'default' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        window.WM_Dictionary = data;
        window.WM_DictionarySource = 'fetch';
        console.log('📚 Sözlük yüklendi (fetch):', Object.keys(data).length, 'kelime');
        return data;
      }
    }
  } catch(e) {
    console.log('ℹ️ sozluk.json fetch edilemedi (normal, file:// modunda olabilir):', e.message);
  }

  // 3) Hiçbiri yoksa boş
  window.WM_Dictionary = {};
  window.WM_DictionarySource = 'empty';
  console.warn('⚠️ Sözlük yüklenemedi. Settings → Yerel Sözlük → "Sözlük Yükle" ile yükleyebilirsin.');
  return {};
})();

// Yardımcı: kelimeyi sözlükte ara (lowercase, trim)
window.WM_lookupDict = function(word) {
  if (!window.WM_Dictionary || !word) return null;
  const key = String(word).trim().toLowerCase();
  return window.WM_Dictionary[key] || null;
};


/* ===== extracted script block ===== */


const WM_Pronunciation = {
  // Ayarlar
  settings: {
    enabled: true,
    autoPlayOnClick: true,
    showPhonetic: true,
    showSyllables: true,
    highlightStress: true,
    playbackSpeed: 1.0,
    voice: 'en-US',
    theme: 'popup' // 'popup', 'inline', 'sidebar'
  },

  // TTS Sesli okuma
  speak: async function(text, options = {}) {
    const {
      lang = 'en-US',
      rate = this.settings.playbackSpeed,
      pitch = 1.0,
      volume = 1.0
    } = options;

    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('TTS desteklenmiyor'));
        return;
      }

      // Önceki okumayı durdur
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // En iyi sesi seç
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang === lang && v.name.includes('Google')
      ) || voices.find(v => v.lang === lang);
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    });
  },

  // Fonetik transkripsiyon (IPA) al
  getPhonetic: async function(word) {
    // Önce cache'e bak
    const cached = this.getFromCache('phonetic', word);
    if (cached) return cached;

    try {
      // Free Dictionary API
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      const phonetic = data[0]?.phonetic || 
                      data[0]?.phonetics?.[0]?.text || 
                      this.generateApproximatePhonetic(word);
      
      this.saveToCache('phonetic', word, phonetic);
      return phonetic;
    } catch (error) {
      console.warn('Phonetic API error:', error);
      return this.generateApproximatePhonetic(word);
    }
  },

  // Yaklaşık fonetik üret (API başarısız olursa)
  generateApproximatePhonetic: function(word) {
    // Basit kurallarla yaklaşık IPA
    const rules = {
      'th': 'θ', 'ch': 'tʃ', 'sh': 'ʃ', 'ng': 'ŋ',
      'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɑ', 'u': 'ʌ'
    };
    
    let phonetic = word.toLowerCase();
    for (const [pattern, replacement] of Object.entries(rules)) {
      phonetic = phonetic.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    return `/${phonetic}/`;
  },

  // Hecelere ayır
  getSyllables: function(word) {
    // Önce cache'e bak
    const cached = this.getFromCache('syllables', word);
    if (cached) return cached;

    // Basit hece ayırma algoritması
    const syllables = this.splitIntoSyllables(word);
    this.saveToCache('syllables', word, syllables);
    return syllables;
  },

  splitIntoSyllables: function(word) {
    // Sesli harfler
    const vowels = 'aeiouy';
    const syllables = [];
    let currentSyllable = '';
    
    const lower = word.toLowerCase();
    
    for (let i = 0; i < lower.length; i++) {
      currentSyllable += word[i];
      
      // Sesli harf bulundu
      if (vowels.includes(lower[i])) {
        // Sonraki harf sessiz ise ve ondan sonraki sesli ise, kes
        if (i < lower.length - 2 && 
            !vowels.includes(lower[i + 1]) && 
            vowels.includes(lower[i + 2])) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
    }
    
    if (currentSyllable) syllables.push(currentSyllable);
    return syllables.length > 0 ? syllables : [word];
  },

  // Vurgu (stress) tespiti
  getStressedSyllable: function(word, phonetic) {
    // IPA'da ˈ işareti vurguyu gösterir
    if (phonetic.includes('ˈ')) {
      const parts = phonetic.split('ˈ');
      return parts.findIndex((_, i) => i > 0);
    }
    
    // Varsayılan: ilk hece
    return 0;
  },

  // Detaylı telaffuz bilgisi al
  getDetailedInfo: async function(text) {
    const words = text.trim().split(/\s+/);
    
    // Tek kelime
    if (words.length === 1) {
      const word = words[0].replace(/[.,!?;:]/g, '');
      const phonetic = await this.getPhonetic(word);
      const syllables = this.getSyllables(word);
      const stressIndex = this.getStressedSyllable(word, phonetic);
      
      return {
        type: 'word',
        text: word,
        phonetic,
        syllables,
        stressIndex,
        audio: null // TTS ile üretilecek
      };
    }
    
    // Cümle
    return {
      type: 'sentence',
      text,
      words: await Promise.all(
        words.map(async w => {
          const clean = w.replace(/[.,!?;:]/g, '');
          return {
            word: clean,
            phonetic: await this.getPhonetic(clean),
            syllables: this.getSyllables(clean)
          };
        })
      )
    };
  },

  // Detaylı telaffuz popup'ı göster
  showPronunciationPopup: async function(text, element) {
    // Önce overlay'i aç, içine loading koy
    this.closePopup();
    const overlay = document.createElement('div');
    overlay.id = 'wm-pronunciation-popup-container';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:999998;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease';
    overlay.innerHTML = '<div class="pronunciation-popup" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:16px"><div style="width:36px;height:36px;border:4px solid var(--border,#252d42);border-top-color:var(--blue,#3b82f6);border-radius:50%;animation:spin .8s linear infinite"></div><div style="color:var(--muted,#7c85b0);font-size:14px">Yükleniyor…</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target===overlay) this.closePopup(); });
    document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ WM_Pronunciation.closePopup(); document.removeEventListener('keydown',esc); }});

    try {
      const info = await this.getDetailedInfo(text);
      const popupHTML = this.createPopupHTML(info);
      // İçeriği güncelle (overlay'i koru)
      overlay.innerHTML = popupHTML;
      overlay.addEventListener('click', e => { if(e.target===overlay) this.closePopup(); });
      if (this.settings.autoPlayOnClick) this.speak(info.text);
    } catch (error) {
      console.error('Pronunciation error:', error);
      overlay.innerHTML = '<div class="pronunciation-popup" style="padding:32px;text-align:center;color:#f87171">❌ Yüklenemedi</div>';
    }
  },

  // Popup HTML oluştur
  createPopupHTML: function(info) {
    const word = info.type === 'word' ? info.text : info.text;
    const phonetic = info.phonetic || ('/' + word + '/');
    const syllablesHTML = (info.syllables || []).map((syl, i) =>
      `<span class="syllable ${i === info.stressIndex ? 'stressed' : ''}"
             onclick="WM_Pronunciation.speak('${syl}')">${syl}</span>`
    ).join(' · ');

    // 📚 Yerel sözlükten ara (tek kelime için)
    const dictEntry = (info.type === 'word' && window.WM_lookupDict) ? window.WM_lookupDict(word) : null;

    // Telaffuz alanı: sözlükte varsa Türkçe okunuş, yoksa ipaToTurkish çıktısı
    const pronText = (dictEntry && dictEntry.tr_pron)
      ? dictEntry.tr_pron
      : WM_Pronunciation.ipaToTurkish(phonetic);

    // CEFR rozet rengi
    const cefrColors = {
      'A1': '#22c55e', 'A2': '#84cc16',
      'B1': '#3b82f6', 'B2': '#8b5cf6',
      'C1': '#f59e0b', 'C2': '#ef4444'
    };
    const cefrColor = (dictEntry && cefrColors[dictEntry.cefr]) || '#6b7280';

    // 🎯 Değer skoru — CEFR + Zipf frequency birleşimi
    let valueBadgeHTML = '';
    if (dictEntry) {
      const cefr = dictEntry.cefr || '';
      const zipf = typeof dictEntry.zipf === 'number' ? dictEntry.zipf : 0;
      let level, color, label, tooltip;
      // Yüksek değer: A1-B1 veya çok yaygın (Zipf ≥ 5)
      if (['A1','A2','B1'].includes(cefr) || zipf >= 5) {
        level = 'high'; color = '#22c55e'; label = '🟢 Yüksek değer';
        tooltip = `Öncelikli: ${cefr || '-'} seviye, sıklık ${zipf || '?'}`;
      }
      // Orta değer: B2 veya orta sıklık (Zipf 4-5)
      else if (cefr === 'B2' || zipf >= 4) {
        level = 'mid'; color = '#f59e0b'; label = '🟡 Orta değer';
        tooltip = `Faydalı: ${cefr || '-'} seviye, sıklık ${zipf || '?'}`;
      }
      // Düşük öncelik
      else {
        level = 'low'; color = '#94a3b8'; label = '⚪ Düşük öncelik';
        tooltip = `Nadir: ${cefr || '-'} seviye, sıklık ${zipf || '?'}`;
      }
      valueBadgeHTML = `<span title="${tooltip}" style="background:rgba(255,255,255,.05);color:${color};border:1px solid ${color};padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.3px;margin-right:6px">${label}</span>`;
    }

    // Anlamlar bloğu HTML'i (sadece sözlükte varsa)
    // Anlamlar bloğu HTML'i
    let meaningsHTML;
    if (dictEntry && dictEntry.meanings && dictEntry.meanings.length) {
      meaningsHTML = `
          <div class="meanings-section" style="margin-top:14px;padding:12px;background:var(--bg2,rgba(255,255,255,.03));border-radius:10px;border:1px solid var(--border,#252d42)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
              <label style="font-size:12px;font-weight:700;color:var(--muted,#7c85b0);text-transform:uppercase;letter-spacing:.5px;margin:0">📖 Anlamlar</label>
              <div style="display:flex;align-items:center;gap:0">
                ${valueBadgeHTML}
                ${dictEntry.cefr ? `<span style="background:${cefrColor};color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.5px">${dictEntry.cefr}</span>` : ''}
              </div>
            </div>
            <ol style="margin:0;padding-left:20px;color:var(--text,#e6e9f5);font-size:14px;line-height:1.7">
              ${dictEntry.meanings.map(m => `<li>${m}</li>`).join('')}
            </ol>
          </div>`;
    } else if (info.type === 'word') {
      // Sözlükte yok — "Sözlüğe Ekle" butonu
      const safeWord = word.replace(/'/g, "\\'");
      meaningsHTML = `
          <div class="meanings-section" style="margin-top:14px;padding:12px;background:var(--bg2,rgba(255,255,255,.03));border-radius:10px;border:1px dashed var(--border,#252d42)">
            <div style="font-size:12px;color:var(--muted,#7c85b0);margin-bottom:8px;text-align:center">
              ℹ️ "${word}" yerel sözlükte yok
            </div>
            <button onclick="addWordToUserDictionary('${safeWord}', this)"
                    style="width:100%;padding:8px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">
              ➕ Sözlüğe Ekle (AI ile)
            </button>
            <div style="font-size:10px;color:var(--muted,#7c85b0);margin-top:6px;text-align:center;line-height:1.4">
              AI bu kelimeyi analiz eder, sözlüğüne kalıcı olarak kaydeder
            </div>
          </div>`;
    } else {
      meaningsHTML = '';
    }

    return `
      <div class="pronunciation-popup" data-word="${word}" onclick="event.stopPropagation()">
        <div class="popup-header">
          <h3>${word}</h3>
          <button class="popup-close" onclick="WM_Pronunciation.closePopup()">✕</button>
        </div>

        <div class="popup-content">
          <!-- Fonetik -->
          <div class="phonetic-section">
            <label>📢 IPA</label>
            <div class="phonetic-text">${phonetic}</div>
            <div style="text-align:center;margin-top:8px;font-size:15px;color:var(--muted);font-weight:600;letter-spacing:1px">
              ${pronText}
            </div>
          </div>

          ${meaningsHTML}

          ${syllablesHTML ? `
          <div class="syllables-section">
            <label>🔤 Syllables</label>
            <div class="syllables-container">${syllablesHTML}</div>
          </div>` : ''}

          <!-- Konuş butonları -->
          <div class="controls-section">
            <button class="control-btn play-btn" onclick="WM_Pronunciation.speak('${word}')">🔊 Play</button>
            <button class="control-btn slow-btn" onclick="WM_Pronunciation.speak('${word}', {rate: 0.7})">🐌 Slow</button>
            <button class="control-btn fast-btn" onclick="WM_Pronunciation.speak('${word}', {rate: 1.3})">🐇 Fast</button>
          </div>

          <!-- Hız -->
          <div class="speed-control">
            <label>⚡ Speed: <span id="wmp-speed-val">${this.settings.playbackSpeed}x</span></label>
            <input type="range" min="0.5" max="2" step="0.1"
                   value="${this.settings.playbackSpeed}"
                   oninput="WM_Pronunciation.setSpeed(this.value)"
                   class="speed-slider">
          </div>

          <!-- Ek aksiyonlar: Kelime Açıklama & İlişkileri -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
            <button onclick="WM_Pronunciation.closePopup(); _explainWordImpl('${word.replace(/'/g,"\\'")}','wordCard')"
                    style="padding:12px 8px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">
              🤖 Kelime Açıklama
            </button>
            <button onclick="WM_Pronunciation.closePopup(); showWordRelations('${word.replace(/'/g,"\\'")}', _findWordTr('${word.replace(/'/g,"\\'")}'), _findWordSentence('${word.replace(/'/g,"\\'")}'))"
                    style="padding:12px 8px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">
              🔗 Kelime İlişkileri
            </button>
          </div>

          <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">

          <!-- Kayıt & Analiz -->
          <div style="margin-bottom:8px">
            <label style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">🎤 Telaffuzunu Dene</label>
          </div>

          <button id="wmp-rec-btn"
                  onclick="WM_Pronunciation.toggleRecord('${word}')"
                  style="width:100%;padding:14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px;transition:all .2s">
            🎤 Kaydı Başlat
          </button>

          <!-- Kendi kaydını dinle -->
          <button id="wmp-play-rec-btn"
                  onclick="WM_Pronunciation.playRecording()"
                  style="display:none;width:100%;padding:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:12px">
            ▶ Kendi Kaydımı Konuş
          </button>

          <!-- Analiz sonucu -->
          <div id="wmp-result"></div>
        </div>
      </div>
    `;
  },

  // Popup göster
  displayPopup: function(html, anchorElement) {
    // Eski popup'ı kaldır
    this.closePopup();

    // Yeni popup oluştur
    const popup = document.createElement('div');
    popup.id = 'wm-pronunciation-popup-container';
    popup.innerHTML = html;
    document.body.appendChild(popup);

    // Pozisyon ayarla (anchor element'e göre)
    if (anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const popupContent = popup.querySelector('.pronunciation-popup');
      
      // Ekranın ortasına yerleştir
      popupContent.style.position = 'fixed';
      popupContent.style.top = '50%';
      popupContent.style.left = '50%';
      popupContent.style.transform = 'translate(-50%, -50%)';
      popupContent.style.zIndex = '999999';
    }

    // Arka plana tıklayınca kapat
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this.closePopup();
      }
    });

    // ESC ile kapat
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closePopup();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  // Popup kapat
  closePopup: function() {
    const popup = document.getElementById('wm-pronunciation-popup-container');
    if (popup) {
      popup.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => popup.remove(), 200);
    }
    // TTS'yi durdur
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  // Loading popup
  showLoadingPopup: function(element) {
    const loading = document.createElement('div');
    loading.id = 'wm-pronunciation-popup-container';
    loading.innerHTML = `
      <div class="pronunciation-popup loading-popup">
        <div class="loading-spinner"></div>
        <div>Loading pronunciation...</div>
      </div>
    `;
    document.body.appendChild(loading);
  },

  // Error popup
  showErrorPopup: function(element) {
    this.closePopup();
    WM_Toast.show('❌', 'Pronunciation data unavailable');
  },

  // Hız ayarla
  // IPA → Türkçe yaklaşık okunuş
  ipaToTurkish: function(ipa) {
    if (!ipa) return '';
    // Sembolleri ve slashları temizle
    let s = ipa.replace(/[\/\[\]ˈˌ\.]/g, '');

    // Uzun sesli işaretleri — önce işle
    s = s.replace(/iː/g, 'ii');
    s = s.replace(/uː/g, 'uu');
    s = s.replace(/ɔː/g, 'oo');
    s = s.replace(/ɑː/g, 'aa');
    s = s.replace(/ɜː/g, 'ör');
    s = s.replace(/əː/g, 'ör');

    // Diftonglar
    s = s.replace(/eɪ/g, 'ey');
    s = s.replace(/aɪ/g, 'ay');
    s = s.replace(/ɔɪ/g, 'oy');
    s = s.replace(/aʊ/g, 'av');
    s = s.replace(/əʊ/g, 'ou');
    s = s.replace(/ɪə/g, 'iö');
    s = s.replace(/eə/g, 'eö');
    s = s.replace(/ʊə/g, 'uö');
    s = s.replace(/juː/g, 'yu');
    s = s.replace(/ju/g,  'yu');

    // Ünsüzler
    s = s.replace(/tʃ/g, 'ç');
    s = s.replace(/dʒ/g, 'c');
    s = s.replace(/ŋ/g,  'ng');
    s = s.replace(/θ/g,  'th');
    s = s.replace(/ð/g,  'dh');
    s = s.replace(/ʃ/g,  'ş');
    s = s.replace(/ʒ/g,  'j');
    s = s.replace(/ɹ/g,  'r');
    s = s.replace(/ʍ/g,  'wh');
    s = s.replace(/ʔ/g,  '');
    s = s.replace(/x/g,  'h');

    // Sesli harfler
    s = s.replace(/ɪ/g,  'i');
    s = s.replace(/ʊ/g,  'u');
    s = s.replace(/ɛ/g,  'e');
    s = s.replace(/æ/g,  'e');
    s = s.replace(/ɑ/g,  'a');
    s = s.replace(/ɒ/g,  'o');
    s = s.replace(/ʌ/g,  'a');
    s = s.replace(/ə/g,  'ı');
    s = s.replace(/ɔ/g,  'o');
    s = s.replace(/e/g,  'e');

    return s.trim() ? '≈ ' + s.trim() : '';
  },

  setSpeed: function(value) {
    this.settings.playbackSpeed = parseFloat(value);
    const display = document.getElementById('wmp-speed-val') || document.getElementById('speed-value');
    if (display) display.textContent = value + 'x';
    localStorage.setItem('wm_pronunciation_speed', value);
  },

  // ── Kayıt & Analiz ──
  _recorder: null,
  _recChunks: [],
  _recBlob: null,
  _recStream: null,
  _isRecording: false,
  _recognition: null,
  _lastSpoken: '',

  toggleRecord: function(word) {
    if (this._isRecording) {
      this._stopRecord();
    } else {
      this._startRecord(word);
    }
  },

  _startRecord: async function(word) {
    this._isRecording = true;
    this._recChunks = [];
    this._recBlob = null;
    this._lastSpoken = '';

    const btn = document.getElementById('wmp-rec-btn');
    const result = document.getElementById('wmp-result');
    const playBtn = document.getElementById('wmp-play-rec-btn');
    if (btn) { btn.textContent = '⏹ Durdur'; btn.style.background = 'linear-gradient(135deg,#64748b,#475569)'; }
    if (result) result.innerHTML = '<div style="text-align:center;color:var(--muted);padding:12px;font-size:13px">🎤 Dinleniyor…</div>';
    if (playBtn) playBtn.style.display = 'none';

    // Mikrofon kaydı (WebAudio)
    try {
      this._recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      this._recorder = new MediaRecorder(this._recStream, { mimeType: mime });
      this._recorder.ondataavailable = e => { if (e.data.size > 0) this._recChunks.push(e.data); };
      this._recorder.onstop = () => {
        this._recBlob = new Blob(this._recChunks, { type: this._recorder.mimeType });
        this._recStream.getTracks().forEach(t => t.stop());
        if (playBtn) playBtn.style.display = '';
      };
      this._recorder.start();
    } catch(e) {
      console.warn('Mikrofon kaydı başlatılamadı:', e);
    }

    // Speech Recognition (transkript için)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this._showRecError('Tarayıcı ses tanımayı desteklemiyor (Chrome/Edge kullanın)'); return; }

    this._recognition = new SR();
    this._recognition.lang = 'en-US';
    this._recognition.maxAlternatives = 5;
    this._recognition.interimResults = false;

    this._recognition.onresult = async (e) => {
      const alts = Array.from(e.results[0]).map(r => r.transcript.toLowerCase().trim());
      this._lastSpoken = alts[0];
      await this._analyzeAndShow(word, alts);
    };

    this._recognition.onerror = (e) => {
      const msgs = { 'no-speech': 'Ses algılanamadı', 'not-allowed': 'Mikrofon izni gerekli', 'network': 'İnternet gerekli' };
      this._showRecError(msgs[e.error] || 'Hata: ' + e.error);
    };

    this._recognition.onend = () => {
      this._isRecording = false;
      if (this._recorder && this._recorder.state !== 'inactive') this._recorder.stop();
      const btn2 = document.getElementById('wmp-rec-btn');
      if (btn2) { btn2.textContent = '🔁 Tekrar Dene'; btn2.style.background = 'linear-gradient(135deg,#3b82f6,#2563eb)'; }
    };

    this._recognition.start();
  },

  _stopRecord: function() {
    if (this._recognition) try { this._recognition.stop(); } catch(e) {}
    if (this._recorder && this._recorder.state !== 'inactive') try { this._recorder.stop(); } catch(e) {}
    this._isRecording = false;
  },

  playRecording: function() {
    if (!this._recBlob) return;
    const url = URL.createObjectURL(this._recBlob);
    const audio = new Audio(url);
    const btn = document.getElementById('wmp-play-rec-btn');
    if (btn) btn.textContent = '▶ Oynatılıyor…';
    audio.play();
    audio.onended = () => { if (btn) btn.textContent = '▶ Kendi Kaydımı Konuş'; URL.revokeObjectURL(url); };
  },

  // Needleman-Wunsch alignment
  _align: function(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({length: m+1}, (_,i) =>
      Array.from({length: n+1}, (_,j) => i===0 ? -j : j===0 ? -i : 0)
    );
    for (let i=1;i<=m;i++)
      for (let j=1;j<=n;j++)
        dp[i][j] = Math.max(
          dp[i-1][j-1] + (s1[i-1]===s2[j-1] ? 2 : -1),
          dp[i-1][j] - 1, dp[i][j-1] - 1
        );
    let a1='', a2='', i=m, j=n;
    while (i>0||j>0) {
      if (i>0&&j>0&&dp[i][j]===dp[i-1][j-1]+(s1[i-1]===s2[j-1]?2:-1)) { a1=s1[i-1]+a1; a2=s2[j-1]+a2; i--;j--; }
      else if (i>0&&dp[i][j]===dp[i-1][j]-1) { a1=s1[i-1]+a1; a2='-'+a2; i--; }
      else { a1='-'+a1; a2=s2[j-1]+a2; j--; }
    }
    return { a1, a2 };
  },

  // Renkli harf HTML üret
  _colorLetters: function(target, spoken) {
    const { a1, a2 } = this._align(target, spoken);
    let html = '';
    for (let i=0; i<a1.length; i++) {
      const t = a1[i], s = a2[i];
      if (t === '-') continue; // fazla harf — atla
      if (t === s) {
        html += `<span style="color:#4ade80;font-weight:900;font-size:22px;letter-spacing:1px">${t}</span>`;
      } else if (s === '-') {
        html += `<span style="color:#f87171;font-weight:900;font-size:22px;letter-spacing:1px;opacity:.5;text-decoration:line-through" title="eksik">${t}</span>`;
      } else {
        html += `<span style="color:#f87171;font-weight:900;font-size:22px;letter-spacing:1px;text-decoration:underline wavy #ef4444" title="'${t}' yerine '${s}' söylendi">${t}</span>`;
      }
    }
    return html;
  },

  // En iyi alternatifi seç (hedefe en yakın)
  _bestAlt: function(target, alts) {
    let best = alts[0], bestScore = -1;
    for (const a of alts) {
      const m = target.length, n = a.length;
      const dp = Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
      for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
        dp[i][j]=a[j-1]===target[i-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
      const score = 1 - dp[m][n]/Math.max(m,n);
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return { word: best, score: bestScore };
  },

  _analyzeAndShow: async function(target, alts) {
    const result = document.getElementById('wmp-result');
    if (!result) return;

    result.innerHTML = '<div style="text-align:center;color:var(--muted);padding:12px;font-size:13px">⏳ Analiz ediliyor…</div>';

    const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
    const tNorm = norm(target);
    const { word: bestSpoken, score: simScore } = this._bestAlt(tNorm, alts.map(norm));

    // Renkli harf analizi
    const coloredHTML = this._colorLetters(tNorm, bestSpoken);

    // Doğru/yanlış sayıları
    const { a1, a2 } = this._align(tNorm, bestSpoken);
    let correct=0, wrong=0, missing=0;
    for (let i=0; i<a1.length; i++) {
      if (a1[i]==='-') continue;
      if (a1[i]===a2[i]) correct++;
      else if (a2[i]==='-') missing++;
      else wrong++;
    }
    const total = correct + wrong + missing;

    // IPA Türkçe karşılaştırması
    // Hedefin IPA'sını cache'den al (popup'ta zaten gösteriliyor)
    const targetIPA  = this.getFromCache('phonetic', target) || '';
    const targetTR   = this.ipaToTurkish(targetIPA);  // hedef IPA → Türkçe

    // Söylenen kelimenin IPA'sını al:
    // 1) Söylenen ≈ hedef ise (birebir veya çok yüksek benzerlik) hedefin IPA'sını kullan
    // 2) Söylenen başka bir kelime ise onun cache IPA'sını ara (örn. "ship" yerine "sheep" demişse)
    // 3) Hiçbiri yoksa approximate üretime düş
    let spokenIPA;
    if (bestSpoken === tNorm || simScore >= 0.95) {
      spokenIPA = targetIPA;
      console.log('[Telaffuz] Söylenen ≈ hedef, IPA hedeften alındı. bestSpoken=', bestSpoken, 'tNorm=', tNorm, 'score=', simScore);
    } else {
      spokenIPA = this.getFromCache('phonetic', bestSpoken) || this.generateApproximatePhonetic(bestSpoken);
      console.log('[Telaffuz] Söylenen ≠ hedef. bestSpoken=', bestSpoken, 'tNorm=', tNorm, 'score=', simScore, 'spokenIPA=', spokenIPA);
    }
    const spokenTR   = this.ipaToTurkish(spokenIPA); // söylenen IPA → Türkçe

    // Her ikisi de Türkçe forma getirildi, şimdi karşılaştır
    const trColoredHTML = this._colorLettersTR(targetTR, spokenTR);

    // AI analizi (Settings'ten ayarlanabilir, varsayılan: kapalı)
    let aiHTML = '';
    if (typeof isPronunAIAnalysisEnabled === 'function' && isPronunAIAnalysisEnabled()) {
      try {
        const aiResp = await callAI(
          'You are a strict English pronunciation coach. Respond only in Turkish. Be concise.',
          `Hedef: "${target}" (IPA: ${targetIPA || '?'}, Türkçe okunuş: ${targetTR || '?'})
Öğrenci söyledi: "${bestSpoken}"
Doğru harf: ${correct}/${total}
Hangi sesler/harfler yanlış? Neden? Kısa ve madde madde.`,
          'pronun'
        );
        const aiText = aiResp.content || aiResp;
        aiHTML = `<div style="background:#1a1035;border:1px solid var(--purple);border-radius:10px;padding:12px;margin-top:10px">
          <div style="font-size:11px;font-weight:800;color:var(--purple);margin-bottom:6px">🤖 AI Analizi</div>
          <div style="font-size:13px;color:var(--sub);line-height:1.7">${aiText}</div>
        </div>`;
      } catch(e) { console.warn('AI analizi başarısız:', e); }
    }

    // Seviye
    const pct = Math.round(simScore * 100);
    const color = pct>=90?'#4ade80':pct>=70?'#3b82f6':pct>=50?'#f59e0b':'#ef4444';
    const emoji = pct>=90?'🎉':pct>=70?'✅':pct>=50?'👍':'💪';
    const label = pct>=90?'Mükemmel':pct>=70?'İyi':pct>=50?'Orta':'Gelişmeli';

    result.innerHTML = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:36px;margin-bottom:4px">${emoji}</div>
        <div style="font-size:20px;font-weight:900;color:${color}">${label}</div>
        <div style="font-size:28px;font-weight:900">${pct}%</div>
      </div>

      <!-- Türkçe Okunuş Karşılaştırması -->
      ${targetTR ? `
      <div style="background:var(--bg2);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:800;color:var(--muted);margin-bottom:10px;letter-spacing:.5px">🇹🇷 TÜRKÇE OKUNUŞ KARŞILAŞTIRMASI</div>
        <div style="display:grid;gap:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;color:var(--muted);min-width:64px;font-weight:700">✅ Doğru:</span>
            <span style="font-size:18px;font-weight:800;color:#4ade80;font-family:monospace;letter-spacing:2px">${targetTR}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;color:var(--muted);min-width:64px;font-weight:700">🎤 Sizin:</span>
            <span style="font-size:18px;font-weight:800;font-family:monospace;letter-spacing:2px">${trColoredHTML}</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">
          <span style="color:#4ade80;font-weight:800">■</span> Doğru &nbsp;
          <span style="color:#f87171;font-weight:800">■</span> Yanlış/Eksik
        </div>
      </div>
      ` : ''}

      <!-- Harf bazlı analiz (İngilizce) -->
      <div style="background:var(--bg2);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="font-size:11px;font-weight:800;color:var(--muted);margin-bottom:8px;letter-spacing:.5px">🔤 HARF BAZLI ANALİZ</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">
          Hedef: <strong style="color:var(--text)">${target}</strong> → Duyulan: <strong style="color:${color}">${bestSpoken}</strong>
        </div>
        <div style="letter-spacing:2px;margin-bottom:10px;line-height:2">${coloredHTML}</div>
        <div style="display:flex;gap:16px;font-size:11px">
          <span><span style="color:#4ade80;font-weight:800">■</span> Doğru (${correct})</span>
          <span><span style="color:#f87171;font-weight:800">■</span> Yanlış/Eksik (${wrong+missing})</span>
        </div>
      </div>

      <!-- Sayaçlar -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
        <div style="background:rgba(74,222,128,.1);border:1px solid #4ade80;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#4ade80">${correct}</div>
          <div style="font-size:10px;color:var(--muted)">Doğru</div>
        </div>
        <div style="background:rgba(248,113,113,.1);border:1px solid #f87171;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#f87171">${wrong}</div>
          <div style="font-size:10px;color:var(--muted)">Yanlış</div>
        </div>
        <div style="background:rgba(248,113,113,.06);border:1px solid #f8717180;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:#f87171">${missing}</div>
          <div style="font-size:10px;color:var(--muted)">Eksik</div>
        </div>
      </div>

      ${aiHTML}
    `;
  },

  // Türkçe okunuş harf karşılaştırması
  // targetTR = IPA'dan üretilen Türkçe (doğru), spokenRaw = API'den gelen İngilizce metin
  _colorLettersTR: function(targetTR, spokenRaw) {
    if (!targetTR) return spokenRaw;

    // Her ikisini de aynı normalize formuna getir
    // targetTR: IPA'dan üretilmiş "≈ pekic" gibi
    // spokenRaw: Speech API'den gelen İngilizce "package" gibi
    // İkisini de küçük harf + sadece harf olarak normalize et
    const t = targetTR.replace('≈','').trim().toLowerCase().replace(/[^a-z]/g,'');
    const s = spokenRaw.toLowerCase().replace(/[^a-z]/g,'');

    // Eğer tamamen eşleşiyorsa direkt yeşil döndür
    if (t === s) {
      return t.split('').map(c =>
        `<span style="color:#4ade80;font-weight:900">${c}</span>`
      ).join('');
    }

    const { a1, a2 } = this._align(t, s);
    let html = '';
    for (let i = 0; i < a1.length; i++) {
      const tc = a1[i], sc = a2[i];
      if (tc === '-') continue;
      if (tc === sc) {
        html += `<span style="color:#4ade80;font-weight:900">${tc}</span>`;
      } else if (sc === '-') {
        html += `<span style="color:#f87171;opacity:.5;font-weight:900;text-decoration:line-through">${tc}</span>`;
      } else {
        html += `<span style="color:#f87171;font-weight:900;text-decoration:underline wavy" title="'${tc}' yerine '${sc}'">${tc}</span>`;
      }
    }
    return html || s;
  },

  _showRecError: function(msg) {
    this._isRecording = false;
    const result = document.getElementById('wmp-result');
    if (result) result.innerHTML = `<div style="color:#f87171;text-align:center;padding:12px;font-size:13px">❌ ${msg}</div>`;
    const btn = document.getElementById('wmp-rec-btn');
    if (btn) { btn.textContent = '🎤 Kaydı Başlat'; btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)'; }
  },

  // Cache yönetimi
  cache: {},

  getFromCache: function(type, key) {
    const cacheKey = `${type}_${key}`;
    return this.cache[cacheKey];
  },

  saveToCache: function(type, key, value) {
    const cacheKey = `${type}_${key}`;
    this.cache[cacheKey] = value;
    
    // LocalStorage'a da kaydet (kalıcı)
    try {
      const storageKey = `wm_pronunciation_${type}_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.warn('Cache save error:', e);
    }
  },

  loadCache: function() {
    // LocalStorage'dan cache'i yükle
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wm_pronunciation_')) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          const parts = key.replace('wm_pronunciation_', '').split('_');
          const type = parts[0];
          const word = parts.slice(1).join('_');
          this.cache[`${type}_${word}`] = value;
        } catch (e) {}
      }
    }
  },

  // Tüm kelimeleri tıklanabilir yap
  makeTextClickable: function(containerSelector) {
    const containers = document.querySelectorAll(containerSelector);
    
    containers.forEach(container => {
      // Data attribute ile işaretlenmiş mi kontrol et
      if (container.dataset.pronunciationEnabled) return;
      container.dataset.pronunciationEnabled = 'true';

      // Kelime bazında wrap
      const text = container.textContent;
      const words = text.split(/(\s+)/); // Boşlukları koru
      
      container.innerHTML = words.map(word => {
        if (word.trim() === '') return word; // Boşluk
        
        const clean = word.replace(/[.,!?;:]/g, '');
        if (clean.length < 2) return word; // Çok kısa
        
        return `<span class="pronounceable-word" data-word="${clean}">${word}</span>`;
      }).join('');

      // Çift tıklama → telaffuz popup
      container.addEventListener('dblclick', (e) => {
        const wordSpan = e.target.closest('.pronounceable-word');
        if (wordSpan) {
          e.preventDefault();
          e.stopPropagation();
          const word = wordSpan.dataset.word;
          this.showPronunciationPopup(word, wordSpan);
        }
      });
    });
  },

  // Double-click ile telaffuz
  enableDoubleClickPronunciation: function() {
    document.addEventListener('dblclick', async (e) => {
      // Seçili metni al
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        e.preventDefault();
        await this.showPronunciationPopup(text, e.target);
      }
    });
  },

  // Sağ tık menüsü
  enableContextMenu: function() {
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        e.preventDefault();
        
        // Custom context menu
        this.showContextMenu(e.clientX, e.clientY, text);
      }
    });
  },

  showContextMenu: function(x, y, text) {
    // Eski menüyü kaldır
    const oldMenu = document.getElementById('wm-context-menu');
    if (oldMenu) oldMenu.remove();

    // Yeni menü oluştur
    const menu = document.createElement('div');
    menu.id = 'wm-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 8px;
      z-index: 999999;
    `;
    
    menu.innerHTML = `
      <button class="context-menu-item" onclick="WM_Pronunciation.showPronunciationPopup('${text}'); WM_Pronunciation.closeContextMenu()">
        🔊 Pronunciation
      </button>
      <button class="context-menu-item" onclick="WM_Pronunciation.speak('${text}'); WM_Pronunciation.closeContextMenu()">
        ▶️ Play
      </button>
    `;
    
    document.body.appendChild(menu);

    // Dışarı tıklayınca kapat
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        this.closeContextMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  },

  closeContextMenu: function() {
    const menu = document.getElementById('wm-context-menu');
    if (menu) menu.remove();
  },

  // Ayarları yükle
  loadSettings: function() {
    const saved = localStorage.getItem('wm_pronunciation_settings');
    if (saved) {
      try {
        Object.assign(this.settings, JSON.parse(saved));
      } catch (e) {}
    }
    
    // Hızı yükle
    const speed = localStorage.getItem('wm_pronunciation_speed');
    if (speed) {
      this.settings.playbackSpeed = parseFloat(speed);
    }
  },

  // Ayarları kaydet
  saveSettings: function() {
    localStorage.setItem('wm_pronunciation_settings', JSON.stringify(this.settings));
  },

  // Başlat
  init: function() {
    console.log('🔊 Pronunciation system initializing...');
    
    // Ayarları yükle
    this.loadSettings();
    this.loadCache();
    
    // Voices yüklenene kadar bekle
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('✅ TTS voices loaded');
      };
    }
    
    // Double-click telaffuz aktifleştir
    this.enableDoubleClickPronunciation();
    
    // Context menu (isteğe bağlı)
    // this.enableContextMenu();
    
    console.log('✅ Pronunciation system ready');
  }
};

// CSS Stilleri
const pronunciationStyles = `

`;

// Stilleri head'e ekle
document.head.insertAdjacentHTML('beforeend', pronunciationStyles);

// Otomatik başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    WM_Pronunciation.init();
    // Programın her yerinde çift tıklamayla telaffuz aktif
    // makeTextClickable ile de tek tıklama desteklenir
    WM_Pronunciation.makeTextClickable('.pronun-target');
    WM_Pronunciation.makeTextClickable('#liveTx');
    WM_Pronunciation.makeTextClickable('.correction-explain');
    WM_Pronunciation.makeTextClickable('.at-text');
    WM_Pronunciation.makeTextClickable('.sentence-display');
    WM_Pronunciation.makeTextClickable('#coachFeedback');
  });
} else {
  WM_Pronunciation.init();
  WM_Pronunciation.makeTextClickable('.pronun-target');
  WM_Pronunciation.makeTextClickable('#liveTx');
  WM_Pronunciation.makeTextClickable('.correction-explain');
  WM_Pronunciation.makeTextClickable('.at-text');
  WM_Pronunciation.makeTextClickable('.sentence-display');
  WM_Pronunciation.makeTextClickable('#coachFeedback');
}

console.log('✅ Global Pronunciation System loaded');


/* ===== extracted script block ===== */


async function createListFromConv(){
  if(!convScenario){showToast('⚠️','Senaryo seçin');return}
  showToast('⏳','AI çalışıyor...');
  try{
    // Kullanıcı düzenlenebilir prompt sisteminden al
    const p = (typeof getPrompt === 'function') ? getPrompt('convList') : null;
    const tpl = p || {
      system: "Sen bir İngilizce-Türkçe kelime listesi üreticisin. 25 İngilizce kelime için TÜRKÇE KARŞILIK üret. JSON array döndür.",
      user: 'Senaryo: {{scenario}}\nSeviye: {{level}}\n\nBu formatta 25 kelime:\n[\n  {"word":"provide","tr":"sağlamak","phonetic":"prəˈvaɪd","sentence":"We provide coffee.","sentenceTr":"Biz kahve sağlıyoruz."},\n  {"word":"customer","tr":"müşteri","phonetic":"ˈkʌstəmər","sentence":"The customer is happy.","sentenceTr":"Müşteri mutlu."}\n]\n\nÖNEMLİ KURALLAR:\n1. "tr" alanı MUTLAKA Türkçe olmalı (provide→sağlamak, customer→müşteri)\n2. "sentenceTr" alanı cümlenin Türkçe çevirisi olmalı\n3. "tr" ve "sentenceTr" alanlarına İngilizce kelime yazma!\n4. 25 kelime\n5. Sadece JSON array döndür, başka metin yok'
    };
    const sys = String(tpl.system||'')
      .replace(/\{\{scenario\}\}/g, convScenario)
      .replace(/\{\{level\}\}/g, convLevel||'intermediate');
    const usr = String(tpl.user||'')
      .replace(/\{\{scenario\}\}/g, convScenario)
      .replace(/\{\{level\}\}/g, convLevel||'intermediate');
    const r = await callAIWithRetry(sys, usr, 'conversation');
    let t = typeof r==='object'?(r.content||r.text||JSON.stringify(r)):String(r);
    t = t.trim().replace(/```[a-z]*\n?/g,'').replace(/```$/,'').trim();
    const w = JSON.parse(t).slice(0,25);
    const listId='conv_'+Date.now();
    const listName='🗣️ '+convScenario;
    multiLists.push({id:listId,name:listName,createdAt:new Date().toISOString(),source:'conversation',scenario:convScenario});
    saveMultiLists();
    localStorage.setItem('multiList_words_'+listId,JSON.stringify(w));
    w.forEach(word=>{if(!allWords.find(x=>x.word===word.word)){allWords.push(word)}});
    saveProgress();
    showToast('✅',w.length+' kelime eklendi - Liste sekmesine git');
    setTimeout(()=>showScreen('sc-multi-lists'),1000);
  }catch(e){
    console.error(e);
    showToast('❌',e.message);
  }
}


/* ===== extracted script block ===== */


// ══════════════════════════════════════════════════════════
// KELİME LİSTESİNİ YEDEKLEME KLASÖRÜNE KAYDET (TXT)
// ══════════════════════════════════════════════════════════
