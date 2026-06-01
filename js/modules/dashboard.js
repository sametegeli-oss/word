/* ════════════════════════════════════════════════════════════════
   WordMode — modül: dashboard.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function recordLearningTime(word) {
  const now = new Date();
  const dateKey = now.toISOString().slice(0,10);
  const hourKey = now.getHours();

  // Günlük kayıt
  const dayData = JSON.parse(localStorage.getItem('analytics_day_' + dateKey) || '{"count":0,"hours":{}}');
  dayData.count++;
  dayData.hours[hourKey] = (dayData.hours[hourKey] || 0) + 1;
  localStorage.setItem('analytics_day_' + dateKey, JSON.stringify(dayData));
}

function initAnalytics() {
  renderAnalyticsTopStats();
  renderHeatmap();
  renderTrendBars();
  renderWordTypeBars();
  renderCefrDistribution();
  renderBestTimes();
  renderHardWords();
}

function renderAnalyticsTopStats() {
  const totalLearned = learnedSet.size;
  const totalWords = allWords.length;
  const pct = totalWords > 0 ? Math.round(totalLearned / totalWords * 100) : 0;

  // Toplam çalışma günleri
  let studyDays = 0;
  for (let i = 0; i < 70; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
    if (localStorage.getItem('analytics_day_' + d)) studyDays++;
  }

  // Bu hafta öğrenilen
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
    const data = JSON.parse(localStorage.getItem('analytics_day_' + d) || '{"count":0}');
    thisWeek += data.count;
  }

  const streak = parseInt(localStorage.getItem('wm_streak') || '0');

  document.getElementById('analyticsTopStats').innerHTML = `
    <div class="astat">
      <div class="astat-val" style="color:var(--green)">${totalLearned}</div>
      <div class="astat-lbl">Öğrenilen</div>
    </div>
    <div class="astat">
      <div class="astat-val" style="color:var(--orange)">${streak} 🔥</div>
      <div class="astat-lbl">Gün Serisi</div>
    </div>
    <div class="astat">
      <div class="astat-val" style="color:var(--blue)">${thisWeek}</div>
      <div class="astat-lbl">Bu Hafta</div>
    </div>
    <div class="astat">
      <div class="astat-val" style="color:var(--purple)">${studyDays}</div>
      <div class="astat-lbl">Çalışma Günü</div>
    </div>
    <div class="astat">
      <div class="astat-val" style="color:var(--text)">%${pct}</div>
      <div class="astat-lbl">Tamamlanan</div>
    </div>
    <div class="astat">
      <div class="astat-val" style="color:var(--green)">${parseInt(localStorage.getItem('xp_' + new Date().toISOString().slice(0,10)) || '0')}</div>
      <div class="astat-lbl">Bugün XP</div>
    </div>`;
}

function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  const weeks = 10;
  const days = weeks * 7;

  // Son 70 günün verilerini topla
  const cells = [];
  const now = new Date();

  // Haftanın ilk gününe hizala
  const dayOfWeek = (now.getDay() + 6) % 7; // Pazartesi=0
  const startOffset = days - 1 + dayOfWeek;

  for (let i = startOffset; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0,10);
    const data = JSON.parse(localStorage.getItem('analytics_day_' + key) || '{"count":0}');
    cells.push({ date: key, count: data.count, label: d.toLocaleDateString('tr-TR', {day:'numeric',month:'short'}) });
  }

  // Maksimum değer
  const maxCount = Math.max(...cells.map(c => c.count), 1);

  // Satır satır (haftalar)
  let html = '';
  for (let week = 0; week < weeks; week++) {
    html += `<div style="display:flex;gap:3px;margin-bottom:3px">`;
    html += `<div style="width:20px;font-size:9px;color:var(--muted);display:flex;align-items:center">${week === 0 ? new Date(cells[week*7]?.date).toLocaleDateString('tr-TR',{month:'short'}) : ''}</div>`;
    for (let day = 0; day < 7; day++) {
      const cell = cells[week * 7 + day];
      if (!cell) { html += `<div style="flex:1;aspect-ratio:1"></div>`; continue; }
      const level = cell.count === 0 ? 0 : cell.count < 3 ? 1 : cell.count < 7 ? 2 : cell.count < 12 ? 3 : cell.count < 20 ? 4 : 5;
      html += `<div class="hm-cell l${level}" style="flex:1" title="${cell.label}: ${cell.count} kelime"><div class="hm-tooltip">${cell.label}<br>${cell.count} kelime</div></div>`;
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

function renderTrendBars() {
  const bars = document.getElementById('trendBars');
  const labels = document.getElementById('trendLabels');
  const days = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const data = [];
  let max = 1;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0,10);
    const dayData = JSON.parse(localStorage.getItem('analytics_day_' + key) || '{"count":0}');
    const count = dayData.count;
    data.push({ count, label: days[(d.getDay() + 6) % 7], isToday: i === 0 });
    if (count > max) max = count;
  }

  bars.innerHTML = data.map(d => {
    const h = Math.max(4, Math.round((d.count / max) * 80));
    return `<div class="trend-bar-wrap">
      <div style="font-size:9px;color:var(--muted)">${d.count > 0 ? d.count : ''}</div>
      <div class="trend-bar ${d.isToday ? 'today' : ''}" style="height:${h}px"></div>
    </div>`;
  }).join('');

  labels.innerHTML = data.map(d => `
    <div style="flex:1;text-align:center;font-size:9px;color:${d.isToday ? 'var(--green)' : 'var(--muted)'};font-weight:${d.isToday ? '800' : '400'}">${d.label}</div>`).join('');
}

function renderWordTypeBars() {
  // Kelime tiplerini analiz et (basit heuristik)
  const types = { 'İsim': 0, 'Fiil': 0, 'Sıfat': 0, 'Zarf': 0, 'Diğer': 0 };
  const verbEndings = ['ate','ize','ify','ish','en','ed'];
  const adjEndings = ['ful','less','ous','al','ic','ive','able','ible'];
  const advEndings = ['ly'];

  learnedSet.forEach(word => {
    const w = word.toLowerCase();
    if (advEndings.some(e => w.endsWith(e))) types['Zarf']++;
    else if (adjEndings.some(e => w.endsWith(e))) types['Sıfat']++;
    else if (verbEndings.some(e => w.endsWith(e))) types['Fiil']++;
    else if (w.length > 4) types['İsim']++;
    else types['Diğer']++;
  });

  const total = Math.max(learnedSet.size, 1);
  const colors = ['var(--blue)', 'var(--green)', 'var(--purple)', 'var(--orange)', 'var(--muted)'];

  document.getElementById('wordTypeBars').innerHTML = Object.entries(types).map(([type, count], i) => {
    const pct = Math.round(count / total * 100);
    return `<div class="wtb-row">
      <div class="wtb-label">${type}</div>
      <div class="wtb-track"><div class="wtb-fill" style="width:${pct}%;background:${colors[i]}"></div></div>
      <div class="wtb-val">${count}</div>
    </div>`;
  }).join('');
}

function renderBestTimes() {
  // Saatlere göre aktivite
  const hourData = {};
  for (let i = 0; i < 70; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
    const data = JSON.parse(localStorage.getItem('analytics_day_' + d) || '{}');
    if (data.hours) {
      Object.entries(data.hours).forEach(([h, c]) => {
        hourData[h] = (hourData[h] || 0) + c;
      });
    }
  }

  const slots = [
    { label: '🌅 Sabah', hours: [6,7,8,9,10,11] },
    { label: '☀️ Öğle', hours: [12,13,14,15] },
    { label: '🌆 Akşam', hours: [16,17,18,19,20] },
    { label: '🌙 Gece', hours: [21,22,23,0,1,2] }
  ];

  const slotData = slots.map(s => ({
    label: s.label,
    count: s.hours.reduce((sum, h) => sum + (hourData[h] || 0), 0)
  }));

  const maxVal = Math.max(...slotData.map(s => s.count), 1);

  document.getElementById('bestTimeGrid').innerHTML = slotData.map(s => {
    const intensity = s.count / maxVal;
    const bg = intensity > 0.7 ? '#052e16' : intensity > 0.4 ? '#1a2040' : 'var(--bg2)';
    const color = intensity > 0.7 ? '#4ade80' : intensity > 0.4 ? '#93c5fd' : 'var(--muted)';
    return `<div class="bt-cell" style="background:${bg}">
      <div class="bt-time" style="color:${color}">${s.label}</div>
      <div class="bt-score">${s.count} kelime</div>
    </div>`;
  }).join('');
}

function renderCefrDistribution() {
  const el = document.getElementById('cefrDistribution');
  if (!el) return;

  const lookup = (typeof window !== 'undefined' && window.WM_lookupDict) ? window.WM_lookupDict : null;
  const counts = { 'A1':0, 'A2':0, 'B1':0, 'B2':0, 'C1':0, 'C2':0, '?':0 };

  learnedSet.forEach(word => {
    let cefr = '?';
    if (lookup) {
      try {
        const entry = lookup(word);
        if (entry && entry.cefr && counts.hasOwnProperty(entry.cefr)) cefr = entry.cefr;
      } catch(e) {}
    }
    counts[cefr]++;
  });

  const total = learnedSet.size || 1;
  const colors = {
    'A1':'#22c55e', 'A2':'#84cc16',
    'B1':'#3b82f6', 'B2':'#8b5cf6',
    'C1':'#f59e0b', 'C2':'#ef4444',
    '?':'#6b7280'
  };
  const labels = {
    'A1':'A1 — Başlangıç',
    'A2':'A2 — Temel',
    'B1':'B1 — Orta',
    'B2':'B2 — Üst Orta',
    'C1':'C1 — İleri',
    'C2':'C2 — Üst Düzey',
    '?':'Sözlükte Yok'
  };

  // Boşları gizle: hiç kelime olmayan satırı atla (ama hepsi boşsa boş mesaj)
  const order = ['A1','A2','B1','B2','C1','C2','?'];
  const hasAny = order.some(k => counts[k] > 0);
  if (!hasAny) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Henüz öğrenilmiş kelime yok</div>';
    return;
  }

  el.innerHTML = order.filter(k => counts[k] > 0).map(k => {
    const count = counts[k];
    const pct = Math.round(count / total * 100);
    const widthPct = Math.max(2, pct); // çok küçükler bile görünsün
    return `<div class="wtb-row">
      <div class="wtb-label" style="color:${colors[k]};font-weight:800">${labels[k]}</div>
      <div class="wtb-track"><div class="wtb-fill" style="width:${widthPct}%;background:${colors[k]}"></div></div>
      <div class="wtb-val">${count} <span style="color:var(--muted);font-weight:400">(%${pct})</span></div>
    </div>`;
  }).join('');
}

function renderHardWords() {
  const hard = Object.entries(wordStatus)
    .filter(([w, s]) => s.wrong > 1)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 8);

  const el = document.getElementById('analyticsHardWords');
  if (!hard.length) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Henüz yanlış yapılmış kelime yok 🎉</div>';
    return;
  }

  el.innerHTML = hard.map(([word, s]) => {
    const item = allWords.find(w => w.word === word);
    const pct = s.correct + s.wrong > 0 ? Math.round(s.correct / (s.correct + s.wrong) * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:14px;font-weight:800;color:var(--red);min-width:80px">${word}</div>
      <div style="flex:1;font-size:12px;color:var(--muted)">${item?.tr || ''}</div>
      <div style="font-size:12px;font-weight:700;color:${pct < 50 ? 'var(--red)' : 'var(--orange)'}">%${pct}</div>
      <div style="font-size:11px;color:var(--muted)">${s.wrong}x yanlış</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// 🌙 GECE TEKRAR MODU
// ══════════════════════════════════════════════════════════
let sleepWords = [];
let sleepIdx = 0;
let sleepAutoInterval = null;
let sleepAutoActive = false;
const SLEEP_INTERVAL = 4000; // 4 saniye

function startSleepMode() {
  // Öğrenilmiş kelimeler veya tüm kelimeler
  const pool = allWords.filter(w => learnedSet.has(w.word));
  const source = pool.length >= 5 ? pool : allWords;
  if (source.length === 0) { showToast('⚠️', 'Önce kelime yükle!'); return; }

  sleepWords = [...source].sort(() => Math.random() - 0.5).slice(0, 15);
  sleepIdx = 0;
  sleepAutoActive = false;

  // Ekranı aç
  document.getElementById('sc-sleep').style.display = '';
  document.body.style.overflow = 'hidden';

  // İlerleme noktaları
  renderSleepProgress();
  showSleepWord();

  // Görevi işaretle
  const today = new Date().toISOString().slice(0,10);
  dailyTasksDone.sleep = true;
  localStorage.setItem('dailyTasks_' + today, JSON.stringify(dailyTasksDone));
}

function showSleepWord() {
  const item = sleepWords[sleepIdx];
  if (!item) { exitSleepMode(); return; }

  document.getElementById('sleepCounter').textContent = (sleepIdx + 1) + ' / ' + sleepWords.length;

  const wordEl = document.getElementById('sleepWord');
  const trEl = document.getElementById('sleepTranslation');
  const sentEl = document.getElementById('sleepSentence');

  // Fade out
  wordEl.style.opacity = '0';
  trEl.style.opacity = '0';

  setTimeout(() => {
    wordEl.textContent = item.word;
    trEl.textContent = item.tr;
    sentEl.textContent = item.sentence ? '"' + item.sentence + '"' : '';

    // Fade in
    wordEl.style.opacity = '1';
    trEl.style.opacity = '1';

    // Sesi oku - cümle varsa cümleyi, yoksa kelimeyi oku
    const textToSpeak = item.sentence ? item.sentence : item.word;
    const utt = new SpeechSynthesisUtterance(textToSpeak);
    utt.lang = 'en-US';
    utt.volume = 0.6;
    utt.rate = 0.8;
    speechSynthesis.speak(utt);
  }, 400);

  renderSleepProgress();

  // Auto bar animasyonu
  if (sleepAutoActive) {
    const bar = document.getElementById('sleepAutoBar');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.transition = `width ${SLEEP_INTERVAL}ms linear`;
      bar.style.width = '100%';
    }, 50);
  }
}

function renderSleepProgress() {
  document.getElementById('sleepProgress').innerHTML = sleepWords.map((_, i) =>
    `<div class="sleep-dot ${i < sleepIdx ? 'done' : i === sleepIdx ? 'current' : ''}"></div>`
  ).join('');
}

function sleepNext() {
  if (sleepIdx < sleepWords.length - 1) {
    sleepIdx++;
    showSleepWord();
  } else {
    exitSleepMode();
  }
}

function sleepPrev() {
  if (sleepIdx > 0) {
    sleepIdx--;
    showSleepWord();
  }
}

function toggleSleepAuto() {
  sleepAutoActive = !sleepAutoActive;
  const btn = document.getElementById('sleepAutoBtn');

  if (sleepAutoActive) {
    btn.textContent = '⏸ Durdur';
    btn.style.borderColor = 'rgba(167,139,250,.6)';
    document.getElementById('sleepIntervalLabel').textContent = SLEEP_INTERVAL / 1000;

    // Auto bar
    const bar = document.getElementById('sleepAutoBar');
    bar.style.transition = `width ${SLEEP_INTERVAL}ms linear`;
    bar.style.width = '100%';

    sleepAutoInterval = setInterval(() => {
      if (sleepIdx < sleepWords.length - 1) {
        sleepIdx++;
        showSleepWord();
      } else {
        exitSleepMode();
      }
    }, SLEEP_INTERVAL);
  } else {
    btn.textContent = '▶ Oto';
    btn.style.borderColor = 'rgba(255,255,255,.2)';
    clearInterval(sleepAutoInterval);
    const bar = document.getElementById('sleepAutoBar');
    bar.style.transition = 'none';
    bar.style.width = '0%';
  }
}

function exitSleepMode() {
  clearInterval(sleepAutoInterval);
  sleepAutoActive = false;
  stopSpeech();
  document.getElementById('sc-sleep').style.display = 'none';
  document.body.style.overflow = '';
  addXP(15, 'Gece tekrarı tamamlandı! 🌙');
}

// ══════════════════════════════════════════════════════════
// ANALİTİK: KELİME ÖĞRENME KAYDI (mevcut fonksiyonlara entegre)
// ══════════════════════════════════════════════════════════
function openWordVisual() {
  showScreen('sc-visual');
  const w = words[idx];
  if (w) document.getElementById('visualCurrentWord').textContent = w.word + ' — ' + w.tr;
}

async function generateWordVisual() {
  const w = words[idx];
  if (!w) { alert('Önce bir kelime seç!'); return; }
  await doGenerateVisual(w.word, w.tr);
}

async function generateCustomVisual() {
  const word = document.getElementById('visualCustomWord').value.trim();
  if (!word) return;
  await doGenerateVisual(word, '');
}

async function doGenerateVisual(word, tr) {
  const btn = document.getElementById('visualGenBtn');
  if (btn) { btn.textContent = '⏳ Üretiliyor...'; btn.disabled = true; }
  document.getElementById('visualResult').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><div style="font-size:36px;margin-bottom:8px">🎨</div>AI görsel açıklama hazırlıyor...</div>';

  // Wikipedia'dan görsel çekmeye çalış
  let imageUrl = null;
  try {
    const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
    if (wikiResp.ok) {
      const wikiData = await wikiResp.json();
      if (wikiData.thumbnail?.source) imageUrl = wikiData.thumbnail.source;
    }
  } catch(e) {}

  // AI açıklama üret - DİNAMİK SİSTEM
  try {
    const prompt = `Word: "${word}" ${tr ? '(Turkish: ' + tr + ')' : ''}
Create a vivid visual description with:
1. Main visual: What does this word look like? Describe a concrete image/scene (2-3 sentences)
2. Scene 1: A real-life situation using this word (1-2 sentences)  
3. Scene 2: Another context/situation (1-2 sentences)
4. Memory hook: A creative visual memory trick (1 sentence)
Format as JSON: {"main": "...", "scene1": "...", "scene2": "...", "hook": "...", "emoji": "single emoji"}`;

    // 📦 Cache kontrolü
    let parsed = { main: '', scene1: '', scene2: '', hook: '', emoji: '🖼️' };
    let response = null;
    const cachedVis = _aiCache.get('visual', word);
    if (cachedVis && cachedVis.data) {
      parsed = cachedVis.data;
      console.log("📦 Visual cache'den:", word);
    } else {
      response = await callAI(getPrompt('visual'), prompt, 'visual');
      const desc = response.content || response; // Geriye uyumluluk

      // Model bilgisini logla
      if(response.model) {
        console.log('🖼️ Görsel Açıklama - Kullanılan Model:', response.model, 'Token:', response.tokenLimit);
      }

      parsed = { main: desc, scene1: '', scene2: '', hook: '', emoji: '🖼️' };
      try {
        const clean = desc.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch(e) {}
      _aiCache.set('visual', word, parsed);
    }
    
    // Model badge bilgisini hazırla
    const usedModel = (response && response.model) || getAIModel('visual');
    const usedTokenLimit = (response && response.tokenLimit) || getAITokenLimit('visual');
    const modelNames = {
      'groq': 'Groq Llama 3.3',
      'openai': 'OpenAI GPT-4o-mini',
      'claude': 'Claude 3.5 Sonnet',
      'gemini': 'Gemini 2.5 Flash',
        'openrouter': 'OpenRouter (Ücretsiz)'
    };
    const modelColors = {
      'groq': '#60a5fa',
      'openai': '#10b981',
      'claude': '#a78bfa',
      'gemini': '#f59e0b',
        'openrouter': '#22c55e'
    };
    const modelName = modelNames[usedModel] || usedModel;
    const modelColor = modelColors[usedModel] || '#64748b';

    // 📦 Cache'den mi yoksa AI'dan mı geldi? Rozet ona göre
    const fromCache = !response;
    const sourceBadgeHTML = fromCache
      ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(34,197,94,.15);border:1px solid #22c55e;border-radius:6px;font-size:10px;font-weight:700;color:#22c55e;margin-bottom:12px">📦 Önbellekten</div>`
      : `<div style="
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
            margin-bottom: 12px; ">
            🤖 ${modelName} <span style="opacity:0.6">• ${usedTokenLimit} token</span>
          </div>`;

    const resultEl = document.getElementById('visualResult');
    resultEl.innerHTML = `
      <div class="word-visual-card">
        ${imageUrl
          ? `<img src="${imageUrl}" class="wv-image" alt="${word}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
          : ''}
        <div class="wv-image-placeholder" ${imageUrl ? 'style="display:none"' : ''}>${parsed.emoji || '🖼️'}</div>
        <div class="wv-body">
          <div class="wv-word">${word} ${tr ? '<span style="font-size:14px;color:var(--muted);font-weight:400">— ' + tr + '</span>' : ''}</div>
          
          ${sourceBadgeHTML}
          
          <div class="wv-desc">${parsed.main || ''}</div>
          <div class="wv-scenes">
            ${parsed.scene1 ? `<div class="wv-scene">🏠 <strong>Sahne 1:</strong> ${parsed.scene1}</div>` : ''}
            ${parsed.scene2 ? `<div class="wv-scene">🌍 <strong>Sahne 2:</strong> ${parsed.scene2}</div>` : ''}
            ${parsed.hook ? `<div class="wv-scene" style="border-color:var(--purple)">💡 <strong>Hafıza İpucu:</strong> ${parsed.hook}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button onclick="speak('${word.replace(/'/g,"\\'")}','en-US')" style="flex:1;padding:8px;background:var(--bg3);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;font-size:12px;color:var(--sub)">🔊 Telaffuz</button>
            <button onclick="doGenerateVisual('${word.replace(/'/g,"\\'")}','${tr.replace(/'/g,"\\'")}')" style="flex:1;padding:8px;background:var(--bg3);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;font-size:12px;color:var(--sub)">🔄 Yenile</button>
          </div>
        </div>
      </div>`;

    if (btn) { btn.textContent = '✨ Görsel Açıklama Üret'; btn.disabled = false; }
    
  } catch(error) {
    console.error('Görsel açıklama hatası:', error);
    document.getElementById('visualResult').innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--red)">
        <div style="font-size:36px;margin-bottom:8px">❌</div>
        ${error.message || 'Görsel açıklama oluşturulamadı'}
      </div>`;
    if (btn) { btn.textContent = '✨ Görsel Açıklama Üret'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════════════════════════
// 🎵 KELİME ŞARKISI
// ══════════════════════════════════════════════════════════
let selectedGenre = 'rap';
let songWordCount = 5;
let currentSongLyrics = '';
let currentSongWords = [];

const GENRE_INFO = {
  rap: { icon: '🎤', name: 'Rap', style: 'rap/hip-hop with rhymes and flow, 16 bars' },
  pop: { icon: '🎵', name: 'Pop', style: 'catchy pop song with chorus, verse, bridge structure' },
  rock: { icon: '🎸', name: 'Rock', style: 'rock song with powerful imagery and energy' },
  hiphop: { icon: '🧢', name: 'Hip-Hop', style: 'hip-hop with metaphors and wordplay' },
  nursery: { icon: '🎠', name: 'Tekerleme', style: 'simple nursery rhyme/tongue twister style, very rhythmic' },
  blues: { icon: '🎷', name: 'Blues', style: 'blues song with soulful repetition pattern' }
};

function selectGenre(g) {
  selectedGenre = g;
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
  document.getElementById('genre-' + g).classList.add('active');
}

function setSongWordCount(n, el) {
  songWordCount = n;
  document.querySelectorAll('.speed-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

async function generateSong() {
  const btn = document.getElementById('songGenBtn');
  btn.textContent = '🎵 Şarkı üretiliyor...';
  btn.disabled = true;

  // Öğrenilen kelimeler
  const pool = allWords.filter(w => learnedSet.has(w.word));
  if (pool.length < 3) {
    btn.textContent = '🎵 Şarkı Üret';
    btn.disabled = false;
    alert('En az 3 öğrenilmiş kelime gerekli!');
    return;
  }

  const chosen = pool.sort(() => Math.random() - 0.5).slice(0, songWordCount);
  currentSongWords = chosen;
  const wordList = chosen.map(w => `${w.word} (${w.tr})`).join(', ');
  const genre = GENRE_INFO[selectedGenre];

  const lyrics = await callGroqAPI(
    `You are a creative songwriter. Write in ${genre.style} style. Use ALL the given English words naturally in the lyrics. Mark each target word with **word** (double asterisks). Write lyrics in English. Keep it fun and memorable.`,
    `Write a short ${genre.name} song (12-20 lines) using these words: ${wordList}.
The words must appear in the lyrics naturally. Mark each target word with **word**.
Add a title at the top: "Title: [song name]"
Then write the lyrics.`
  );

  currentSongLyrics = lyrics;

  // Parse title
  const titleMatch = lyrics.match(/Title:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : genre.name + ' Şarkısı';
  const lyricsBody = lyrics.replace(/Title:\s*.+\n?/i, '').trim();

  // Highlight target words
  let highlighted = lyricsBody;
  chosen.forEach(w => {
    highlighted = highlighted.replace(
      new RegExp(`\\*\\*${w.word}\\*\\*`, 'gi'),
      `<span class="song-word">${w.word}</span>`
    );
  });
  // Remove any remaining **
  highlighted = highlighted.replace(/\*\*/g, '');

  document.getElementById('songResult').style.display = '';
  document.getElementById('songGenreIcon').textContent = genre.icon;
  document.getElementById('songTitle').textContent = title;
  document.getElementById('songWordList').textContent = chosen.map(w => w.word).join(' • ');
  document.getElementById('songLyrics').innerHTML = highlighted;

  // Word cards
  document.getElementById('songWordCards').innerHTML = chosen.map(w => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg2);border-radius:10px;margin-bottom:6px">
      <span style="font-size:16px;font-weight:800;color:var(--green);min-width:80px">${w.word}</span>
      <span style="font-size:13px;color:var(--muted)">→</span>
      <span style="font-size:13px;color:var(--sub)">${w.tr}</span>
      <button onclick="speak('${w.word.replace(/'/g,"\\'")}','en-US')" style="margin-left:auto;padding:4px 8px;background:var(--bg3);border:none;border-radius:6px;cursor:pointer;font-size:12px">🔊</button>
    </div>`).join('');

  btn.textContent = '🎵 Şarkı Üret';
  btn.disabled = false;
}

function singTheSong() {
  const plain = currentSongLyrics.replace(/\*\*/g, '').replace(/Title:[^\n]+\n?/i, '').trim();
  const btn = document.getElementById('songSingBtn');
  if (speechSynthesis.speaking) {
    stopSpeech();
    btn.textContent = '🔊 Oku';
    return;
  }
  btn.textContent = '⏹ Durdur';
  const utt = new SpeechSynthesisUtterance(plain);
  utt.lang = 'en-US';
  utt.rate = selectedGenre === 'rap' || selectedGenre === 'hiphop' ? 1.1 : 0.9;
  utt.pitch = selectedGenre === 'blues' ? 0.8 : 1.0;
  utt.onend = () => { btn.textContent = '🔊 Oku'; };
  speechSynthesis.speak(utt);
}

function copySong() {
  const plain = currentSongLyrics.replace(/\*\*/g, '');
  navigator.clipboard.writeText(plain).then(() => showToast('📋 Kopyalandı', 'Şarkı sözleri panoya kopyalandı'));
}

// ══════════════════════════════════════════════════════════
// 📋 ÇOKLU LİSTE YÖNETİCİ
// ══════════════════════════════════════════════════════════
let multiLists = JSON.parse(localStorage.getItem('multiLists') || '[]');
let activeListId = localStorage.getItem('activeListId') || null;

function initMultiLists() {
  renderMultiListUI();
  renderMultiStats();

  // Drop zone
  const dz = document.getElementById('multiDropZone');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = 'var(--blue)'; });
    dz.addEventListener('dragleave', () => { dz.style.borderColor = ''; });
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) processMultiFile(file);
    });
  }
}

function addNewList(input) {
  const file = input.files[0];
  if (!file) return;
  processMultiFile(file);
  input.value = '';
}

function processMultiFile(file) {
  const nameInput = document.getElementById('newListName');
  const listName = nameInput?.value.trim() || file.name.replace(/\.[^.]+$/, '');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      // İlk yükleme mantığıyla aynı: satır satır oku
      const wb = XLSX.read(e.target.result, { type: 'array', cellStyles: true, cellRichText: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      
      // Header satırını oku
      const headers = {};
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
        if (cell && cell.v) headers[String(cell.v).trim().toLowerCase()] = c;
      }
      
      // Hücre okuma fonksiyonu
      const gc = (r, c) => {
        if (c == null) return "";
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        return cell ? String(cell.v ?? "") : "";
      };
      
      // Sütunları bul
      const colWord = headers["word"];
      const colTr = headers["translation"];
      const colSent = headers["sentence"];
      const colSentTr = headers["sentenceTr"] ?? headers["sentencetr"] ?? headers["sentence_tr"] ??
                        headers["Sentence Tr"] ?? headers["Sentence TR"] ?? headers["SENTENCE TR"] ??
                        headers["cümleçeviri"] ?? headers["cumle_ceviri"];
      const colLevel = headers["sentencelevel"] ?? headers["sentence_level"] ?? headers["sentence level"] ??
                       headers["level"] ?? headers["cefr"] ?? headers["seviye"];
      const colGrammar = headers["grammarstructure"] ?? headers["grammar_structure"] ?? headers["grammar structure"] ??
                         headers["grammar"] ?? headers["gramer"] ?? headers["gramer yapı"] ??
                         headers["gramer yapısı"] ?? headers["grameryapısı"] ?? headers["structure"];
      
      // Satır satır parse et
      const parsed = [];
      let skippedEmpty = 0;
      let extractedVerbs = 0;
      
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        let word = gc(r, colWord).trim();
        let tr = gc(r, colTr).trim();
        const sentence = colSent != null ? gc(r, colSent).trim() : "";
        const sentenceTr = colSentTr != null ? gc(r, colSentTr).trim() : "";
        const sentenceLevel = colLevel != null ? gc(r, colLevel).trim() : "";
        const grammarStructure = colGrammar != null ? gc(r, colGrammar).trim() : "";
        
        // Sentence boş olamaz (ilk yükleme mantığı)
        if (!sentence) {
          skippedEmpty++;
          continue;
        }
        
        // Word boşsa sentence'tan fiil çek (ilk yükleme mantığı)
        if (!word) {
          const sent = sentence.toLowerCase();
          
          // Yardımcı fiilleri cümleden temizle
          const auxVerbs = ['am','is','are','was','were','be','been','have','has','had','do','does','did','done','will','would','can','could','should','shall','may','might','must'];
          let cleanSent = sent;
          auxVerbs.forEach(aux => {
            cleanSent = cleanSent.replace(new RegExp('\\b' + aux + '\\b', 'gi'), '');
          });
          
          const sentWords = cleanSent.split(/\s+/).filter(w => w.length > 0);
          
          // 1. Database'de ara
          for (const w of sentWords) {
            const clean = w.replace(/[^a-z]/g, '');
            if (clean.length < 3) continue;
            
            const verbInfo = findVerbBase(clean);
            if (verbInfo.tr) { // Database'de bulundu
              word = verbInfo.base;
              extractedVerbs++;
              break;
            }
          }
          
          // 2. Database'de yoksa -ed/-ied/-ing/-s/-es pattern (min 3 harf)
          if (!word) {
            const verbPattern = /\b(\w{3,}(?:ies|ied|es|ed|ing|s))\b/i;
            const verbMatch = cleanSent.match(verbPattern);
            if (verbMatch) {
              const foundVerb = verbMatch[1];
              const verbInfo = findVerbBase(foundVerb);
              word = verbInfo.base;
              extractedVerbs++;
            } else {
              word = "verb"; // Fallback
            }
          }
        }
        
        // Translation boşsa placeholder (ilk yükleme mantığı)
        if (!tr) tr = "çeviri yok";
        
        parsed.push({
          word,
          en: word,
          tr,
          translation: tr,
          sentence,
          sentenceTr,
          sentenceLevel,
          grammarStructure,
          level: sentenceLevel,
          grammar: grammarStructure,
          highlights: word ? [word] : []
        });
      }

      console.log(`✅ Parse tamamlandı:
        - Toplam: ${parsed.length} kelime
        - Cümleden fiil çıkarılan: ${extractedVerbs} satır
        - Atlanan (cümle yok): ${skippedEmpty} satır`);
      
      if (parsed.length === 0) { 
        showToast('❌ Hata', 'Kelime bulunamadı. Excel formatını kontrol edin:\nword | translation | sentence | sentenceTr'); 
        return; 
      }

      const newList = {
        id: Date.now().toString(),
        name: listName,
        wordCount: parsed.length,
        words: parsed,
        addedAt: new Date().toLocaleDateString('tr-TR'),
        progress: {}
      };

      multiLists.push(newList);
      saveMultiLists();
      if (nameInput) nameInput.value = '';
      renderMultiListUI();
      renderMultiStats();
      showToast('✅ Liste Eklendi', `"${listName}" — ${parsed.length} kelime`);
    } catch(err) {
      console.error('❌ Liste parse hatası:', err);
      showToast('❌ Hata', 'Dosya okunamadı: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function saveMultiLists() {
  // Kelimeleri dışarıda tut (localStorage limit)
  const toSave = multiLists.map(l => ({ ...l, words: undefined, wordCount: l.wordCount }));
  try {
    const _mlStr = JSON.stringify(toSave);
    localStorage.setItem('multiLists', _mlStr);
    WMStore.set('multiLists', _mlStr).catch(()=>{});
    // Her liste için kelimelerini ayrı kaydet
    multiLists.forEach(l => {
      if (l.words) {
        try { localStorage.setItem('multiList_words_' + l.id, JSON.stringify(l.words)); } catch(e) {}
      }
    });
  } catch(e) {
    showToast('⚠️ Uyarı', 'Önbellek dolu, bazı listeler kaydedilemeyebilir');
  }
}

function loadMultiListWords(id) {
  try {
    const saved = localStorage.getItem('multiList_words_' + id);
    return saved ? JSON.parse(saved) : null;
  } catch(e) { return null; }
}

function switchToList(id) {
  const list = multiLists.find(l => l.id === id);
  if (!list) return;

  const words_data = list.words || loadMultiListWords(id);
  if (!words_data) { showToast('❌ Hata', 'Liste verisi bulunamadı'); return; }

  // Mevcut aktif listenin ilerlemesini kaydet
  const currentProgress = { wordStatus, learnedSet: [...learnedSet], spacedRepetition, idx, score, streak, correctCount };
  if (activeListId && activeListId !== id) {
    localStorage.setItem('listProgress_' + activeListId, JSON.stringify(currentProgress));
  }

  // Yeni liste için state'i SIFIRLA
  wordStatus = {};
  learnedSet = new Set();
  spacedRepetition = {};
  score = 100;
  streak = 0;
  correctCount = 0;

  // Yeni listenin ilerlemesini yükle
  const savedProgress = localStorage.getItem('listProgress_' + id);
  if (savedProgress) {
    try {
      const prog = JSON.parse(savedProgress);
      wordStatus = prog.wordStatus || {};
      learnedSet = new Set(prog.learnedSet || []);
      spacedRepetition = prog.spacedRepetition || {};
      idx = prog.idx || 0;
      score = prog.score ?? 100;
      streak = prog.streak ?? 0;
      correctCount = prog.correctCount ?? 0;
    } catch(e) {}
  }

  // Kelimeleri yükle
  allWords = words_data;
  words = [...allWords];
  if (idx < 0 || idx >= words.length) idx = 0;

  // Aktif listeyi kaydet
  activeListId = id;
  localStorage.setItem('activeListId', id);
  localStorage.setItem('prevActiveListId', id);
  localStorage.setItem('activeListName', list.name);
  localStorage.setItem('wm.activeListName', list.name);
  localStorage.setItem('currentListName', list.name);
  
  // UI'ı güncelle
  document.getElementById("bottomNav").style.display = "flex"; // Bottom nav'ı göster
  showScreen("sc-word"); // Kelime ekranını göster
  renderMultiListUI();
  setActiveListTitle(list.name); // Aktif liste adını güncelle
  updateScoreBar();
  renderLearn(); // Kelimeyi göster
  setActiveListTitle(list.name);
  
  showToast('✅ Liste Değiştirildi', `"${list.name}" — ${list.wordCount} kelime`);
}

function deleteMultiList(id, e) {
  e.stopPropagation();
  if (!confirm('Bu listeyi sil?')) return;
  multiLists = multiLists.filter(l => l.id !== id);
  localStorage.removeItem('multiList_words_' + id);
  localStorage.removeItem('listProgress_' + id);
  saveMultiLists();
  renderMultiListUI();
  renderMultiStats();
}

function renderMultiListUI() {
  const container = document.getElementById('multiListContainer');
  if (!container) return;

  if (multiLists.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">📭 Henüz liste yok. Aşağıdan ekle!</div>';
    return;
  }

  container.innerHTML = multiLists.map(l => {
    const isActive = l.id === activeListId;
    const progress = localStorage.getItem('listProgress_' + l.id);
    let learnedCount = 0;
    if (progress) { try { learnedCount = JSON.parse(progress).learnedSet?.length || 0; } catch(e) {} }
    const pct = l.wordCount > 0 ? Math.round(learnedCount / l.wordCount * 100) : 0;

    return `
      <div class="list-item-card ${isActive ? 'active-list' : ''}" onclick="switchToList('${l.id}')">
        <div class="li-icon">${isActive ? '▶️' : '📚'}</div>
        <div class="li-body">
          <div class="li-name">${l.name}</div>
          <div class="li-meta">${l.wordCount} kelime • ${l.addedAt} • %${pct} tamamlandı</div>
          <div style="height:4px;background:var(--bg3);border-radius:4px;margin-top:6px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${isActive ? 'var(--green)' : 'var(--blue)'};border-radius:4px"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <div class="li-badge ${isActive ? 'active-list' : ''}">${isActive ? '✓ Aktif' : 'Geç →'}</div>
          <button onclick="deleteMultiList('${l.id}',event)" style="padding:3px 8px;background:#2a1215;color:#fca5a5;border:none;border-radius:6px;font-size:11px;cursor:pointer">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function renderMultiStats() {
  const el = document.getElementById('multiListStats');
  if (!el) return;
  const total = multiLists.reduce((s, l) => s + Number(l.wordCount || l.sentenceCount || (Array.isArray(l.words)?l.words.length:0) || 0), 0);
  el.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;background:var(--bg2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:var(--blue)">${multiLists.length}</div>
        <div style="font-size:11px;color:var(--muted)">Liste</div>
      </div>
      <div style="flex:1;background:var(--bg2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:var(--green)">${total.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--muted)">Toplam Kelime</div>
      </div>
      <div style="flex:1;background:var(--bg2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:var(--purple)">${learnedSet.size}</div>
        <div style="font-size:11px;color:var(--muted)">Öğrenildi</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// ☁️ BULUT YEDEK
// ══════════════════════════════════════════════════════════
let selectedCloudProvider = 'gdrive';
let backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');

function initCloudScreen() {
  renderBackupHistory();
  updateBackupSize();
  updateCloudStatus();
}

function selectCloudProvider(id) {
  selectedCloudProvider = id;
  document.querySelectorAll('.cp-card').forEach(c => c.classList.remove('active'));
  document.getElementById('cp-' + id).classList.add('active');
}

async function buildBackupData() {
  const toLearnWords = [], analyticsData = {}, dailyTasks = {},
        listProgress = {}, readerProgress = {}, promptBackups = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      if (key.startsWith('toLearnWords_'))    toLearnWords.push({ key, word: JSON.parse(localStorage.getItem(key)) });
      if (key.startsWith('analytics_day_'))   analyticsData[key] = localStorage.getItem(key);
      if (key.startsWith('dailyTasks_'))      dailyTasks[key] = localStorage.getItem(key);
      if (key.startsWith('listProgress_'))    listProgress[key] = localStorage.getItem(key);
      if (key.startsWith('reader_progress_')) readerProgress[key] = localStorage.getItem(key);
      if (key.startsWith('prompt_backup_'))   promptBackups[key] = localStorage.getItem(key);
    } catch(e) {}
  }

  // ── Kitaplar: meta localStorage, metin klasörden (yoksa localStorage fallback) ──
  const libraryBooks = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('book_meta_')) {
      const id = key.replace('book_meta_', '');
      try {
        const meta = JSON.parse(localStorage.getItem(key));
        let text = '';
        // Önce klasörden oku
        // WMStore önce IDB'den, yoksa klasörden, yoksa localStorage'dan okur
        try { text = await WMStore.getBook(id) || ''; } catch(e) {}
        libraryBooks.push({ id, meta, text });
      } catch(e) {}
    }
  }

  const mainWords = allWords && allWords.length > 0
    ? allWords
    : JSON.parse(localStorage.getItem('learnedWords') || '[]');

  return {
    version: 3,
    exportDate: new Date().toISOString(),
    appName: 'WordMode',
    allWords: mainWords,
    wordStatus,
    learnedSet: [...learnedSet],
    spacedRepetition,
    learnedWords: JSON.parse(localStorage.getItem('learnedWords') || '[]'),
    multiLists: multiLists.map(l => ({ ...l, words: loadMultiListWords(l.id) })),
    activeListId: localStorage.getItem('activeListId'),
    currentListId: localStorage.getItem('currentListId'),
    libraryBooks,
    toLearnWords,
    streak: localStorage.getItem('streak'),
    currentStreak: localStorage.getItem('currentStreak'),
    longestStreak: localStorage.getItem('longestStreak'),
    studyDays: localStorage.getItem('studyDays'),
    totalXP: localStorage.getItem('totalXP'),
    todayLearned: localStorage.getItem('todayLearned'),
    correctCount: localStorage.getItem('correctCount'),
    wm_streak: localStorage.getItem('wm_streak'),
    wm_lastActive: localStorage.getItem('wm_lastActive'),
    gameScores: JSON.parse(localStorage.getItem('gameScores') || '{}'),
    badges: localStorage.getItem('badges'),
    userProfile: localStorage.getItem('userProfile') || localStorage.getItem('user_profile'),
    learnPlan: localStorage.getItem('learnPlan'),
    analyticsData, dailyTasks, listProgress, readerProgress,
    customPartners: JSON.parse(localStorage.getItem('customPartners') || '{}'),
    customPrompts: JSON.parse(localStorage.getItem('customPrompts') || '{}'),
    promptBackups,
    // 📦 AI cache'leri (token tasarrufu için yedeğe dahil)
    wordExplainCache: JSON.parse(localStorage.getItem('wm_word_explain_cache') || '{}'),
    wordRelationsCache: JSON.parse(localStorage.getItem('wm_word_relations_cache') || '{}'),
    aiCache: JSON.parse(localStorage.getItem('wm_ai_cache') || '{}'),
    apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
    groqApiKeys: GROQ_API_KEYS,
    settings: {
      enableWordImages: localStorage.getItem('enableWordImages'),
      autoPlayAudio: localStorage.getItem('autoPlayAudio'),
      enableWordClick: localStorage.getItem('enableWordClick'),
      enableAutoRead: localStorage.getItem('enableAutoRead'),
      darkMode: localStorage.getItem('darkMode'),
      aiTextSize: localStorage.getItem('aiTextSize'),
      aiFontSize: localStorage.getItem('aiFontSize'),
      ttsRateEN: localStorage.getItem('ttsRateEN'),
      ttsRateTR: localStorage.getItem('ttsRateTR'),
      highlightSettings: localStorage.getItem('highlightSettings'),
      userLevel: localStorage.getItem('userLevel'),
      selectedPersona, selectedGoal,
      reminderSettings: localStorage.getItem('reminderSettings'),
      reminderTime: localStorage.getItem('reminderTime'),
      reminderMsg: localStorage.getItem('reminderMsg'),
      groq_model: localStorage.getItem('groq_model')
    }
  };
}

async function updateBackupSize() {
  const data = await buildBackupData();
  const json = JSON.stringify(data);
  const sizeKB = (json.length / 1024).toFixed(1);
  const el = document.getElementById('backupSize');
  const bc = data.libraryBooks?.length || 0;
  const wc = data.allWords?.length || 0;
  if (el) el.innerHTML = `<b style="color:var(--blue)">${sizeKB} KB</b> <span style="color:var(--muted);font-size:11px">· ${wc} kelime · ${data.multiLists?.length||0} liste · ${bc} kitap</span>`;
}

function updateCloudStatus() {
  const last = backupHistory[0];
  const title = document.getElementById('cloudStatusTitle');
  const sub = document.getElementById('cloudStatusSub');
  if (!title || !sub) return;
  if (last) {
    title.textContent = '✅ Yedeklenmiş';
    sub.textContent = 'Son yedek: ' + last.date;
  } else {
    title.textContent = 'Yedek yok';
    sub.textContent = 'Henüz yedeklemediniz';
  }
}

async function doCloudBackup() {
  const data = buildBackupData();
  const json = JSON.stringify(data, null, 2);
  const result = document.getElementById('cloudActionResult');
  
  // Dosya adı için timestamp oluştur (çakışma önleme)
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

  if (selectedCloudProvider === 'gdrive') {
    // JSON dosyası indir
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordmode_backup_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    result.innerHTML = '<div style="padding:10px;background:#052e16;border-radius:10px;color:#4ade80;font-size:13px;font-weight:700">✅ Dosya indirildi!</div>';

  } else if (selectedCloudProvider === 'text') {
    // Base64 kodu
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const short = encoded.slice(0, 200) + '...[' + encoded.length + ' karakter]';
    result.innerHTML = `
      <div style="padding:10px;background:var(--bg2);border-radius:10px;margin-bottom:8px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Metin Kodu (kopyala):</div>
        <div style="font-size:10px;color:var(--sub);word-break:break-all;max-height:80px;overflow:hidden">${short}</div>
      </div>
      <button onclick="copyBackupCode('${encoded.replace(/'/g,"\\'")})" style="width:100%;padding:10px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📋 Tam Kodu Kopyala</button>`;

  } else if (selectedCloudProvider === 'qr') {
    // QR kod için basit URL
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(json.slice(0, 2000)))));
    result.innerHTML = `
      <div style="text-align:center;padding:10px;background:var(--bg2);border-radius:10px">
        <div style="font-size:36px;margin-bottom:8px">📱</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px">QR kod için JSON dosyasını indir, sonra bir QR üretici sitesiyle QR oluştur</div>
        <div style="font-size:11px;color:var(--muted)">Öneri: qr-code-generator.com</div>
      </div>`;
    // JSON'u da indir
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordmode_backup_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);

  } else if (selectedCloudProvider === 'link') {
    result.innerHTML = `
      <div style="padding:10px;background:var(--bg2);border-radius:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">🔗 Paylaşım Linki</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6">JSON dosyasını Google Drive, Dropbox veya başka bir bulut servise yükle ve linki paylaş. Diğer cihazdan "Geri Yükle" ile yükle.</div>
      </div>`;
    // JSON indir
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordmode_backup_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Geçmişe ekle
  const entry = {
    date: new Date().toLocaleString('tr-TR'),
    size: (json.length / 1024).toFixed(1) + ' KB',
    method: selectedCloudProvider,
    wordCount: learnedSet.size
  };
  backupHistory.unshift(entry);
  if (backupHistory.length > 10) backupHistory.pop();
  localStorage.setItem('backupHistory', JSON.stringify(backupHistory));
  renderBackupHistory();
  updateCloudStatus();
}

function copyBackupCode(code) {
  navigator.clipboard.writeText(code).then(() => showToast('📋 Kopyalandı', 'Yedek kodu panoya kopyalandı'));
}

function doCloudRestore() {
  const result = document.getElementById('cloudActionResult');
  result.innerHTML = `
    <div style="padding:12px;background:var(--bg2);border-radius:10px">
      <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:10px">📥 Geri Yükleme</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button onclick="restoreFromFile()" style="padding:10px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📂 JSON Dosyasından Yükle</button>
        <button onclick="showRestoreTextInput()" style="padding:10px;background:var(--bg3);color:var(--sub);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📝 Metin Kodundan Yükle</button>
      </div>
    </div>`;
}

function restoreFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        applyBackupData(data);
      } catch(err) {
        console.error('Restore error:', err);
        showToast('❌ Hata', 'Geçersiz yedek dosyası: ' + err.message);
      } finally {
        // Input reset - aynı dosya tekrar seçilebilsin
        input.value = '';
      }
    };
    reader.onerror = () => {
      showToast('❌ Hata', 'Dosya okunamadı');
      input.value = '';
    };
    reader.readAsText(file);
  };
  input.click();
}

function showRestoreTextInput() {
  const result = document.getElementById('cloudActionResult');
  result.innerHTML += `
    <div style="margin-top:8px">
      <textarea id="restoreCodeInput" style="width:100%;height:80px;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;color:var(--text);padding:10px;font-size:12px;font-family:monospace;resize:none" placeholder="Yedek kodunu buraya yapıştır..."></textarea>
      <button onclick="restoreFromCode()" style="width:100%;padding:10px;background:var(--green);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-top:6px">✅ Geri Yükle</button>
    </div>`;
}

function restoreFromCode() {
  const code = document.getElementById('restoreCodeInput')?.value.trim();
  if (!code) {
    showToast('❌ Hata', 'Lütfen bir kod girin');
    return;
  }
  try {
    const json = decodeURIComponent(escape(atob(code)));
    const data = JSON.parse(json);
    applyBackupData(data);
  } catch(err) {
    console.error('Code restore error:', err);
    showToast('❌ Hata', 'Geçersiz kod: ' + err.message);
  }
}

async function applyBackupData(data) {
  // Version kontrolü - hem eski hem yeni formatları kabul et
  if (!data.learnedSet && !data.wordStatus) {
    showToast('❌ Hata', 'Geçersiz yedek formatı');
    return;
  }
  
  const learnedCount = data.learnedSet?.length || 0;
  const exportDate = data.exportDate?.slice(0,10) || '?';
  
  if (!_silentRestore && !confirm(`⚠️ Geri yüklensin mi?\n\n📝 ${learnedCount} öğrenilmiş kelime\n📅 Tarih: ${exportDate}\n\n⚠️ Mevcut veriler birleştirilecek!`)) return;

  // Rollback için mevcut verileri yedekle
  const rollbackData = {
    learnedSet: [...learnedSet],
    wordStatus: {...wordStatus},
    spacedRepetition: {...spacedRepetition},
    multiLists: JSON.parse(JSON.stringify(multiLists))
  };

  try {
    // İlerleme verisini uygula
    if (data.learnedSet) data.learnedSet.forEach(w => learnedSet.add(w));
    if (data.wordStatus) Object.assign(wordStatus, data.wordStatus);
    if (data.spacedRepetition) Object.assign(spacedRepetition, data.spacedRepetition);

    // API keylerini geri yükle (sadece yeni yedeklerde var)
    if (data.apiKeys && Object.keys(data.apiKeys).length > 0) {
      localStorage.setItem('apiKeys', JSON.stringify(data.apiKeys));
    }
    
    // Groq multi-key restore
    if (data.groqApiKeys && Array.isArray(data.groqApiKeys) && data.groqApiKeys.length > 0) {
      saveGroqKeys(data.groqApiKeys);
    }

    // Çoklu listeler
    if (data.multiLists?.length) {
      data.multiLists.forEach(l => {
        if (!multiLists.find(m => m.id === l.id)) {
          multiLists.push(l);
          if (l.words) {
            try {
              const _mlwStr2 = JSON.stringify(l.words);
              localStorage.setItem('multiList_words_' + l.id, _mlwStr2);
              WMStore.set('multiList_words_' + l.id, _mlwStr2).catch(()=>{});
            } catch(e) { console.warn('Liste kaydedilemedi:', l.id, e); }
          }
        }
      });
      saveMultiLists();
    }

    // Ayarlar
    if (data.settings) {
      if (data.settings.enableWordImages) localStorage.setItem('enableWordImages', data.settings.enableWordImages);
      if (data.settings.autoPlayAudio) localStorage.setItem('autoPlayAudio', data.settings.autoPlayAudio);
      if (data.settings.selectedPersona) selectedPersona = data.settings.selectedPersona;
      if (data.settings.selectedGoal) selectedGoal = data.settings.selectedGoal;
      if (data.settings.ttsRateEN) { ttsRateEN = data.settings.ttsRateEN; localStorage.setItem('ttsRateEN', ttsRateEN); }
      if (data.settings.ttsRateTR) { ttsRateTR = data.settings.ttsRateTR; localStorage.setItem('ttsRateTR', ttsRateTR); }
    }
    
    // Custom Prompts
    if (data.customPrompts && Object.keys(data.customPrompts).length > 0) {
      localStorage.setItem('customPrompts', JSON.stringify(data.customPrompts));
    }

    // 📦 AI cache'lerini geri yükle (mevcut cache ile birleştirilir, mevcut korunur)
    try {
      if (data.wordExplainCache && typeof data.wordExplainCache === 'object') {
        const existing = JSON.parse(localStorage.getItem('wm_word_explain_cache') || '{}');
        const merged = Object.assign({}, data.wordExplainCache, existing);
        // 500 sınırını koruyacak şekilde, en fazla 500 girişe budama
        const keys = Object.keys(merged);
        if (keys.length > 500) {
          keys.slice(0, keys.length - 500).forEach(k => delete merged[k]);
        }
        localStorage.setItem('wm_word_explain_cache', JSON.stringify(merged));
      }
      if (data.wordRelationsCache && typeof data.wordRelationsCache === 'object') {
        const existingR = JSON.parse(localStorage.getItem('wm_word_relations_cache') || '{}');
        const mergedR = Object.assign({}, data.wordRelationsCache, existingR);
        const keysR = Object.keys(mergedR);
        if (keysR.length > 500) {
          keysR.slice(0, keysR.length - 500).forEach(k => delete mergedR[k]);
        }
        localStorage.setItem('wm_word_relations_cache', JSON.stringify(mergedR));
        // Bellek cache'ini sıfırla ki yeni veriyi okusun
        if (typeof _wordRelationsCache !== 'undefined' && _wordRelationsCache._reset) {
          _wordRelationsCache._reset();
        }
      }
      // 📦 Generic AI cache (OCR, Visual, Examples, Linguistics)
      if (data.aiCache && typeof data.aiCache === 'object') {
        const existingA = JSON.parse(localStorage.getItem('wm_ai_cache') || '{}');
        const mergedA = Object.assign({}, data.aiCache, existingA);
        const keysA = Object.keys(mergedA);
        if (keysA.length > 1000) {
          keysA.slice(0, keysA.length - 1000).forEach(k => delete mergedA[k]);
        }
        localStorage.setItem('wm_ai_cache', JSON.stringify(mergedA));
        if (typeof _aiCache !== 'undefined' && _aiCache._reset) {
          _aiCache._reset();
        }
      }
      console.log('📦 AI cache geri yüklendi');
    } catch(e) {
      console.warn('AI cache geri yükleme hatası:', e);
    }

    // Game scores
    if (data.gameScores) {
      localStorage.setItem('gameScores', JSON.stringify(data.gameScores));
    }
    
    // toLearnWords
    if (data.toLearnWords?.length) {
      data.toLearnWords.forEach(item => {
        try {
          localStorage.setItem(item.key, JSON.stringify(item.word));
        } catch(e) {
          console.warn('toLearnWord kaydedilemedi:', item.key, e);
        }
      });
    }
    
    // Kütüphane Kitapları — meta localStorage+WMStore, metin WMStore (IDB + klasör)
    if (data.libraryBooks?.length) {
      for (const book of data.libraryBooks) {
        try {
          if (book.meta) {
            localStorage.setItem('book_meta_' + book.id, JSON.stringify(book.meta));
            WMStore.set('book_meta_' + book.id, JSON.stringify(book.meta)).catch(()=>{});
          }
          if (book.text && book.text.length > 0) {
            await WMStore.setBook(book.id, book.meta?.title || book.id, book.text);
          }
        } catch(e) { console.warn('Kitap geri yüklenemedi:', book.meta?.title, e); }
      }
    }

    saveProgress();
    showToast('✅ Başarılı', `${learnedCount} kelime geri yüklendi!`);
    document.getElementById('cloudActionResult').innerHTML = '<div style="padding:10px;background:#052e16;border-radius:10px;color:#4ade80;font-size:13px;font-weight:700">✅ Geri yükleme tamamlandı!</div>';
    updateCloudStatus();

  } catch(err) {
    // Rollback - hata durumunda eski verileri geri yükle
    console.error('Geri yükleme hatası, rollback yapılıyor:', err);
    learnedSet.clear();
    rollbackData.learnedSet.forEach(w => learnedSet.add(w));
    Object.keys(wordStatus).forEach(k => delete wordStatus[k]);
    Object.assign(wordStatus, rollbackData.wordStatus);
    Object.keys(spacedRepetition).forEach(k => delete spacedRepetition[k]);
    Object.assign(spacedRepetition, rollbackData.spacedRepetition);
    multiLists.length = 0;
    multiLists.push(...rollbackData.multiLists);
    saveProgress();
    showToast('❌ Hata', 'Geri yükleme başarısız, eski veriler geri yüklendi');
  }
}

function renderBackupHistory() {
  const el = document.getElementById('backupHistory');
  if (!el) return;
  if (backupHistory.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Henüz yedek yok</div>';
    return;
  }
  const methodIcons = { gdrive: '📁', text: '📝', qr: '📱', link: '🔗' };
  el.innerHTML = backupHistory.map((b, i) => `
    <div class="bh-item">
      <div class="bh-icon">${methodIcons[b.method] || '☁️'}</div>
      <div class="bh-info">
        <div class="bh-date">${b.date}</div>
        <div class="bh-size">${b.size} • ${b.wordCount} öğrenilmiş kelime</div>
      </div>
    </div>`).join('');
}

function saveCloudSettings() {
  localStorage.setItem('cloudSettings', JSON.stringify({
    autoBackup: document.getElementById('autoBackup')?.checked
  }));
}

// ══════════════════════════════════════════════════════════
let gameScores = JSON.parse(localStorage.getItem('gameScores') || '{"memory":null,"speed":null,"scramble":null,"trueFalse":null}');

function saveGameScore(game, score) {
  if (!gameScores[game] || score > gameScores[game]) {
    gameScores[game] = score;
    localStorage.setItem('gameScores', JSON.stringify(gameScores));
  }
}

function openGamesMenu() {
  backToGamesMenu();
  renderGameScores();
  
  // Minimum kelime uyarısı
  const learned = [...learnedSet];
  const warnEl = document.getElementById('gamesLearnedWarn');
  if (learned.length < 4) {
    warnEl.style.display = '';
    warnEl.textContent = `⚠️ Oyunlar için en az 4 öğrenilmiş kelime gerekli. Şu an: ${learned.length}. Kelime öğren ve geri gel!`;
  } else {
    warnEl.style.display = 'none';
  }
}

function backToGamesMenu() {
  document.getElementById('gamesMenu').style.display = '';
  document.getElementById('memoryGame').style.display = 'none';
  document.getElementById('speedQuiz').style.display = 'none';
  document.getElementById('wordScramble').style.display = 'none';
  document.getElementById('trueFalseGame').style.display = 'none';
  document.getElementById('listeningTest').style.display = 'none';
  document.getElementById('listeningResult').style.display = 'none';
  stopSpeech();
  clearInterval(sqInterval);
  clearInterval(memTimerInterval);
  clearInterval(tfTimerInterval);
  clearInterval(ltAutoPlay);
  renderGameScores();
}

function renderGameScores() {
  const el = document.getElementById('gameScores');
  const games = [
    { key: 'memory', icon: '🧩', name: 'Memory', unit: 'hamle' },
    { key: 'speed', icon: '⚡', name: 'Hız Testi', unit: 'puan' },
    { key: 'scramble', icon: '🔀', name: 'Kelime Karıştır', unit: 'puan' },
    { key: 'trueFalse', icon: '✅', name: 'Doğru/Yanlış', unit: 'puan' },
    { key: 'listening', icon: '🔊', name: 'Konuşme Testi', unit: 'puan' }
  ];
  el.innerHTML = games.map(g => {
    const sc = gameScores[g.key];
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${g.icon} ${g.name}</span>
      <span style="font-size:13px;font-weight:800;color:${sc ? 'var(--green)' : 'var(--muted)'}">${sc !== null ? sc + ' ' + g.unit : '—'}</span>
    </div>`;
  }).join('');
}

function getGameWords(min = 4) {
  // Önce öğrenilmiş kelimelerden al, yetmezse tüm kelimelerden
  let pool = allWords.filter(w => learnedSet.has(w.word));
  if (pool.length < min) pool = [...allWords];
  if (pool.length < min) return null;
  return pool.sort(() => Math.random() - 0.5);
}

// ── MEMORY GAME ──
let memCards = [], memFlipped = [], memMatchCount = 0, memMoveCount = 0;
let memTimerInterval = null, memSeconds = 0, memLocked = false;

function startMemoryGame() {
  const pool = getGameWords(4);
  if (!pool) {
    alert('⚠️ En az 4 kelime gerekli!');
    return;
  }

  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('memoryGame').style.display = '';
  document.getElementById('memResult').style.display = 'none';

  const chosen = pool.slice(0, 6);
  // Her kelime için 2 kart: İngilizce + Türkçe
  memCards = [];
  chosen.forEach((w, i) => {
    memCards.push({ id: i * 2, pairId: i, text: w.word, type: 'en', matched: false });
    memCards.push({ id: i * 2 + 1, pairId: i, text: w.tr, type: 'tr', matched: false });
  });
  memCards.sort(() => Math.random() - 0.5);

  memFlipped = [];
  memMatchCount = 0;
  memMoveCount = 0;
  memSeconds = 0;
  memLocked = false;

  document.getElementById('memMatches').textContent = '0';
  document.getElementById('memMoves').textContent = '0';
  document.getElementById('memTimer').textContent = '⏱ 0s';

  clearInterval(memTimerInterval);
  memTimerInterval = setInterval(() => {
    memSeconds++;
    document.getElementById('memTimer').textContent = '⏱ ' + memSeconds + 's';
  }, 1000);

  renderMemoryGrid();
}

function renderMemoryGrid() {
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = memCards.map((c, i) => `
    <div class="mem-card face-down" id="mc${i}" onclick="flipMemCard(${i})">❓</div>
  `).join('');
}

function flipMemCard(i) {
  if (memLocked) return;
  const card = memCards[i];
  if (card.matched || memFlipped.includes(i)) return;
  if (memFlipped.length >= 2) return;

  const el = document.getElementById('mc' + i);
  el.className = 'mem-card flipped';
  el.textContent = card.text;
  memFlipped.push(i);

  if (memFlipped.length === 2) {
    memMoveCount++;
    document.getElementById('memMoves').textContent = memMoveCount;
    memLocked = true;

    const [a, b] = memFlipped;
    if (memCards[a].pairId === memCards[b].pairId) {
      // Eşleşti!
      memCards[a].matched = true;
      memCards[b].matched = true;
      document.getElementById('mc' + a).className = 'mem-card matched';
      document.getElementById('mc' + b).className = 'mem-card matched';
      memFlipped = [];
      memMatchCount++;
      document.getElementById('memMatches').textContent = memMatchCount;
      memLocked = false;

      if (memMatchCount === 6) {
        clearInterval(memTimerInterval);
        const score = Math.max(0, 1000 - memMoveCount * 30 - memSeconds * 5);
        saveGameScore('memory', memMoveCount); // Daha az hamle = daha iyi
        setTimeout(() => showMemResult(score), 300);
      }
    } else {
      // Eşleşmedi
      document.getElementById('mc' + a).className = 'mem-card wrong';
      document.getElementById('mc' + b).className = 'mem-card wrong';
      setTimeout(() => {
        document.getElementById('mc' + a).className = 'mem-card face-down';
        document.getElementById('mc' + a).textContent = '❓';
        document.getElementById('mc' + b).className = 'mem-card face-down';
        document.getElementById('mc' + b).textContent = '❓';
        memFlipped = [];
        memLocked = false;
      }, 900);
    }
  }
}

function showMemResult(score) {
  const el = document.getElementById('memResult');
  el.style.display = '';
  const emoji = memMoveCount <= 8 ? '🏆' : memMoveCount <= 12 ? '🎉' : '👍';
  el.innerHTML = `
    <div style="font-size:48px;margin-bottom:8px">${emoji}</div>
    <div style="font-size:22px;font-weight:900;color:var(--green);margin-bottom:4px">Tamamlandı!</div>
    <div style="font-size:14px;color:var(--muted);margin-bottom:12px">${memSeconds}s • ${memMoveCount} hamle</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:14px">${memMoveCount <= 8 ? '🏆 Mükemmel hafıza!' : memMoveCount <= 12 ? '🎉 Çok iyi!' : '💪 Pratik yap!'}</div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="startMemoryGame()" style="padding:10px 18px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🔄 Tekrar</button>
      <button onclick="backToGamesMenu()" style="padding:10px 18px;background:var(--bg3);color:var(--sub);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">← Menü</button>
    </div>`;
}

// ── SPEED QUIZ ──
let sqWords = [], sqIdx = 0, sqCorrectCount = 0, sqWrongCount = 0;
let sqInterval = null, sqTimeLeft = 30, sqActive = false;

function startSpeedQuiz() {
  const pool = getGameWords(4);
  if (!pool) { alert('⚠️ En az 4 kelime gerekli!'); return; }

  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('speedQuiz').style.display = '';
  document.getElementById('sqResult').style.display = 'none';

  sqWords = pool;
  sqIdx = 0;
  sqCorrectCount = 0;
  sqWrongCount = 0;
  sqTimeLeft = 30;
  sqActive = true;

  document.getElementById('sqCorrect').textContent = '0';
  document.getElementById('sqWrong').textContent = '0';
  document.getElementById('sqTimer').textContent = '30';
  document.getElementById('sqTimerBar').style.width = '100%';

  clearInterval(sqInterval);
  sqInterval = setInterval(() => {
    sqTimeLeft--;
    document.getElementById('sqTimer').textContent = sqTimeLeft;
    document.getElementById('sqTimerBar').style.width = (sqTimeLeft / 30 * 100) + '%';
    if (sqTimeLeft <= 0) {
      sqActive = false;
      clearInterval(sqInterval);
      showSqResult();
    }
  }, 1000);

  showSqQuestion();
}

function showSqQuestion() {
  if (!sqActive) return;
  const item = sqWords[sqIdx % sqWords.length];
  sqIdx++;

  document.getElementById('sqWord').textContent = item.word;

  // 4 şık: 1 doğru + 3 yanlış
  const wrong = sqWords
    .filter(w => w.word !== item.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.tr);
  const opts = [...wrong, item.tr].sort(() => Math.random() - 0.5);

  document.getElementById('sqOptions').innerHTML = opts.map((opt, i) => `
    <button class="opt-btn" onclick="sqAnswer('${opt.replace(/'/g,"\\'")}','${item.tr.replace(/'/g,"\\'")}',this)">${opt}</button>
  `).join('');
}

function sqAnswer(chosen, correct, btn) {
  if (!sqActive) return;
  const allBtns = document.querySelectorAll('#sqOptions .opt-btn');
  allBtns.forEach(b => b.onclick = null);

  if (chosen === correct) {
    btn.classList.add('correct');
    sqCorrectCount++;
    document.getElementById('sqCorrect').textContent = sqCorrectCount;
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b => { if (b.textContent === correct) b.classList.add('correct'); });
    sqWrongCount++;
    document.getElementById('sqWrong').textContent = sqWrongCount;
  }

  setTimeout(() => { if (sqActive) showSqQuestion(); }, 600);
}

function showSqResult() {
  const total = sqCorrectCount + sqWrongCount;
  const pct = total > 0 ? Math.round(sqCorrectCount / total * 100) : 0;
  const score = sqCorrectCount * 10 - sqWrongCount * 3;
  saveGameScore('speed', Math.max(0, score));

  document.getElementById('sqOptions').innerHTML = '';
  document.getElementById('sqWord').textContent = '';
  const el = document.getElementById('sqResult');
  el.style.display = '';
  el.innerHTML = `
    <div style="font-size:48px;margin-bottom:8px">${pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div>
    <div style="font-size:22px;font-weight:900;color:var(--green)">%${pct}</div>
    <div style="font-size:14px;color:var(--muted);margin:6px 0 12px">✅ ${sqCorrectCount} doğru • ❌ ${sqWrongCount} yanlış • ${total} soru</div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="startSpeedQuiz()" style="padding:10px 18px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🔄 Tekrar</button>
      <button onclick="backToGamesMenu()" style="padding:10px 18px;background:var(--bg3);color:var(--sub);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">← Menü</button>
    </div>`;
}

// ── WORD SCRAMBLE ──
let wsWords = [], wsIdx = 0, wsAnswer_arr = [], wsLetters_arr = [], wsCorrectCount = 0;

function startWordScramble() {
  const pool = getGameWords(4);
  if (!pool) { alert('⚠️ En az 4 kelime gerekli!'); return; }

  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('wordScramble').style.display = '';
  document.getElementById('wsResult').style.display = 'none';

  wsWords = pool.slice(0, 10);
  wsIdx = 0;
  wsCorrectCount = 0;
  showWsQuestion();
}

function showWsQuestion() {
  if (wsIdx >= wsWords.length) { showWsResult(); return; }
  const item = wsWords[wsIdx];

  document.getElementById('wsProgress').textContent = (wsIdx + 1) + '/' + wsWords.length;
  document.getElementById('wsTurkish').textContent = item.tr;
  document.getElementById('wsFeedback').style.display = 'none';
  document.getElementById('wsNext').style.display = 'none';

  // Harfleri karıştır
  const letters = item.word.toUpperCase().split('');
  wsLetters_arr = [...letters].sort(() => Math.random() - 0.5);
  // Eğer aynı sıraysa tekrar karıştır
  while (wsLetters_arr.join('') === letters.join('') && letters.length > 1) {
    wsLetters_arr.sort(() => Math.random() - 0.5);
  }
  wsAnswer_arr = [];

  renderWsLetters();
  renderWsAnswer();
}

function renderWsLetters() {
  document.getElementById('wsLetters').innerHTML = wsLetters_arr.map((l, i) =>
    l !== null
      ? `<div class="lm-letter" onclick="wsPickLetter(${i})">${l}</div>`
      : `<div class="lm-letter" style="opacity:0;pointer-events:none"></div>`
  ).join('');
}

function renderWsAnswer() {
  document.getElementById('wsAnswer').innerHTML = wsAnswer_arr.map((l, i) =>
    `<div class="lm-slot" onclick="wsRemoveLetter(${i})">${l}</div>`
  ).join('');
}

function wsPickLetter(i) {
  if (wsLetters_arr[i] === null) return;
  wsAnswer_arr.push(wsLetters_arr[i]);
  wsLetters_arr[i] = null;
  renderWsLetters();
  renderWsAnswer();
}

function wsRemoveLetter(i) {
  const letter = wsAnswer_arr[i];
  wsAnswer_arr.splice(i, 1);
  // Boş slotu bul ve geri koy
  const emptyIdx = wsLetters_arr.indexOf(null);
  if (emptyIdx !== -1) wsLetters_arr[emptyIdx] = letter;
  renderWsLetters();
  renderWsAnswer();
}

function wsClear() {
  // Tüm cevap harflerini geri al
  wsAnswer_arr.forEach(l => {
    const emptyIdx = wsLetters_arr.indexOf(null);
    if (emptyIdx !== -1) wsLetters_arr[emptyIdx] = l;
  });
  wsAnswer_arr = [];
  renderWsLetters();
  renderWsAnswer();
}

function wsHint() {
  const item = wsWords[wsIdx];
  const target = item.word.toUpperCase();
  // Sonraki doğru harfi ipucu olarak ver
  if (wsAnswer_arr.length < target.length) {
    const nextLetter = target[wsAnswer_arr.length];
    const idx = wsLetters_arr.findIndex((l, i) => l === nextLetter);
    if (idx !== -1) wsPickLetter(idx);
  }
}

function checkScramble() {
  const item = wsWords[wsIdx];
  const answer = wsAnswer_arr.join('').toLowerCase();
  const correct = item.word.toLowerCase();
  const fb = document.getElementById('wsFeedback');
  fb.style.display = '';

  if (answer === correct) {
    fb.style.background = '#052e16';
    fb.style.color = '#4ade80';
    fb.textContent = '✅ Doğru! ' + item.word;
    wsCorrectCount++;
    document.getElementById('wsNext').style.display = '';
  } else if (wsAnswer_arr.length < item.word.length) {
    fb.style.background = 'var(--bg2)';
    fb.style.color = 'var(--muted)';
    fb.textContent = '⚠️ Tüm harfleri kullan!';
  } else {
    fb.style.background = '#2a1215';
    fb.style.color = '#fca5a5';
    fb.textContent = '❌ Yanlış. Doğrusu: ' + item.word;
    document.getElementById('wsNext').style.display = '';
  }
}

function nextScramble() {
  wsIdx++;
  showWsQuestion();
}

function showWsResult() {
  const pct = Math.round(wsCorrectCount / wsWords.length * 100);
  const score = wsCorrectCount * 10;
  saveGameScore('scramble', score);
  document.getElementById('wsResult').style.display = '';
  document.getElementById('wsResult').innerHTML = `
    <div style="font-size:48px;margin-bottom:8px">${pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div>
    <div style="font-size:22px;font-weight:900;color:var(--green)">%${pct}</div>
    <div style="font-size:14px;color:var(--muted);margin:6px 0 12px">${wsCorrectCount}/${wsWords.length} doğru</div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="startWordScramble()" style="padding:10px 18px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🔄 Tekrar</button>
      <button onclick="backToGamesMenu()" style="padding:10px 18px;background:var(--bg3);color:var(--sub);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">← Menü</button>
    </div>`;
}

// ── TRUE / FALSE ──
let tfWords = [], tfIdx = 0, tfCorrectCount2 = 0, tfWrongCount2 = 0;
let tfTimerInterval = null, tfSeconds = 0, tfCurrentAnswer = false;

function startTrueFalse() {
  const pool = getGameWords(4);
  if (!pool) { alert('⚠️ En az 4 kelime gerekli!'); return; }

  document.getElementById('gamesMenu').style.display = 'none';
  document.getElementById('trueFalseGame').style.display = '';
  document.getElementById('tfResult').style.display = 'none';

  tfWords = pool.slice(0, 15);
  tfIdx = 0;
  tfCorrectCount2 = 0;
  tfWrongCount2 = 0;
  tfSeconds = 0;

  document.getElementById('tfCorrect').textContent = '0';
  document.getElementById('tfWrong').textContent = '0';
  document.getElementById('tfTimer').textContent = '0';
  document.getElementById('tfFeedback').textContent = '';

  clearInterval(tfTimerInterval);
  tfTimerInterval = setInterval(() => {
    tfSeconds++;
    document.getElementById('tfTimer').textContent = tfSeconds;
  }, 1000);

  showTfQuestion();
}

function showTfQuestion() {
  if (tfIdx >= tfWords.length) { showTfResult(); return; }

  const item = tfWords[tfIdx];
  document.getElementById('tfProgress').textContent = (tfIdx + 1) + '/15';
  document.getElementById('tfWord').textContent = item.word;
  document.getElementById('tfFeedback').textContent = '';

  // %50 ihtimalle yanlış çeviri göster
  const showCorrect = Math.random() > 0.5;
  tfCurrentAnswer = showCorrect;

  if (showCorrect) {
    document.getElementById('tfTranslation').textContent = item.tr;
  } else {
    // Rastgele başka bir çeviri
    const wrong = tfWords.find(w => w.word !== item.word);
    document.getElementById('tfTranslation').textContent = wrong ? wrong.tr : item.tr + '?';
  }

  // Butonları aktif et
  document.getElementById('tfTrueBtn').disabled = false;
  document.getElementById('tfFalseBtn').disabled = false;
}

function tfAnswer(userSaysTrue) {
  const correct = userSaysTrue === tfCurrentAnswer;
  document.getElementById('tfTrueBtn').disabled = true;
  document.getElementById('tfFalseBtn').disabled = true;

  const fb = document.getElementById('tfFeedback');
  if (correct) {
    tfCorrectCount2++;
    document.getElementById('tfCorrect').textContent = tfCorrectCount2;
    fb.textContent = '✅ Doğru!';
    fb.style.color = 'var(--green)';
  } else {
    tfWrongCount2++;
    document.getElementById('tfWrong').textContent = tfWrongCount2;
    fb.textContent = '❌ Yanlış! Doğru: ' + (tfCurrentAnswer ? 'DOĞRU' : 'YANLIŞ');
    fb.style.color = 'var(--red)';
  }

  tfIdx++;
  setTimeout(showTfQuestion, 700);
}

function showTfResult() {
  clearInterval(tfTimerInterval);
  const total = tfCorrectCount2 + tfWrongCount2;
  const pct = total > 0 ? Math.round(tfCorrectCount2 / total * 100) : 0;
  const score = Math.max(0, tfCorrectCount2 * 10 - tfWrongCount2 * 5);
  saveGameScore('trueFalse', score);

  document.getElementById('tfResult').style.display = '';
  document.getElementById('tfResult').innerHTML = `
    <div style="font-size:48px;margin-bottom:8px">${pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div>
    <div style="font-size:22px;font-weight:900;color:var(--green)">%${pct}</div>
    <div style="font-size:14px;color:var(--muted);margin:6px 0 4px">✅ ${tfCorrectCount2} • ❌ ${tfWrongCount2} • ⏱ ${tfSeconds}s</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:12px">${score} puan</div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="startTrueFalse()" style="padding:10px 18px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🔄 Tekrar</button>
      <button onclick="backToGamesMenu()" style="padding:10px 18px;background:var(--bg3);color:var(--sub);border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">← Menü</button>
    </div>`;
}
// ══════════════════════════════════════════════════════════
// EKRANLAR AÇILINCA INIT
// ══════════════════════════════════════════════════════════
// (Podcast, Offline, Rooms, Accent initleri showScreen içinde çağrılır)

// 9. Otomatik Ses Toggle
