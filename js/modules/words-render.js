/* ════════════════════════════════════════════════════════════════
   WordMode — modül: words-render.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function highlightEnglishWords(text) {
  if (!text) return '';
  
  // ADIM 0: **bold** → <b>bold</b> dönüşümü
  text = text.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
  
  // ADIM 1: Tüm CSS/inline style kalıntılarını temizle
  let result = String(text)
    .replace(/color:\s*#[a-fA-F0-9]{3,6}\s*;?\s*/gi, '')
    .replace(/font-weight:\s*\d{1,3}\s*;?\s*/gi, '')
    .replace(/background:\s*[^;]+;?\s*/gi, '')
    .replace(/border[^;]+;?\s*/gi, '')
    .replace(/margin[^;]+;?\s*/gi, '')
    .replace(/padding[^;]+;?\s*/gi, '')
    .replace(/display:\s*[^;]+;?\s*/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/style='[^']*'/gi, '')
    .replace(/<color[^>]*>/gi, '')
    .replace(/<\/color>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<b[^>]*>/gi, '')
    .replace(/<\/b>/gi, '')
    .replace(/<strong[^>]*>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<i[^>]*>/gi, '')
    .replace(/<\/i>/gi, '')
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<[^>]+>/g, '');
  
  // ADIM 2: Fazla boşlukları temizle
  result = result.replace(/\s+/g, ' ').trim();
  
  // ADIM 3: HTML karakterlerini escape et (güvenlik)
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // ADIM 4: Satır sonlarını <br> yap
  result = result.replace(/\n/g, '<br>');
  
  // ADIM 5: SADECE TIRNAK İÇLERİNİ YEŞİL YAP
  // Düz çift tırnak "..." → <q>...</q>
  result = result.replace(/"([^"]+)"/g, '<q>$1</q>');
  // Düz tek tırnak '...' → <q>...</q>
  result = result.replace(/'([^']+)'/g, '<q>$1</q>');
  // Akıllı çift tırnaklar “...” ve ”...”
  result = result.replace(/[“”"]([^“”"]+)[“”"]/g, '<q>$1</q>');
  // Akıllı tek tırnaklar ‘...’ ve ’...’
  result = result.replace(/[‘’']([^‘’']+)[‘’']/g, '<q>$1</q>');
  
  // ADIM 6: TÜM KELİMELERİ TIKLANABİLİR YAP (RENK EKLEMEDEN)
  const commonWords = ['the', 'and', 'are', 'for', 'was', 'with', 'you', 'that', 'this', 
                       'have', 'from', 'not', 'but', 'can', 'will', 'she', 'her', 'his', 
                       'him', 'they', 'them', 'their', 'had', 'has', 'been', 'were', 'said', 
                       'did', 'all', 'one', 'would', 'could', 'should', 'what', 'when', 
                       'where', 'which', 'who', 'how', 'its', 'our', 'your', 'into', 'than', 
                       'then', 'more', 'some', 'such', 'each', 'most', 'very', 'just', 'any', 
                       'only', 've', 'ile', 'ki', 'de', 'da', 'bir', 'bu', 'şu', 'o', 'ben', 
                       'sen', 'onlar', 'biz', 'siz'];
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = result;
  
  function makeWordsClickable(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      
      words.forEach(word => {
        const trimmed = word.trim();
        // 2+ harfli kelimeler ve yaygın değilse tıklanabilir yap
        if (trimmed && /^[A-Za-z]{2,}$/.test(trimmed) && !commonWords.includes(trimmed.toLowerCase())) {
          const span = document.createElement('span');
          span.className = 'clickable-word';
          // RENK VERMİYORUZ - sadece tıklanabilir
          span.style.color = '';  // Renk ekleme
          span.style.fontWeight = '';  // Kalınlık ekleme
          span.textContent = word;
          span.setAttribute('data-word', trimmed);
          span.onclick = (e) => {
            e.stopPropagation();
            if (typeof explainWord === 'function') {
              explainWord(trimmed, 'chatMessages');
            }
          };
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(word));
        }
      });
      
      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // q etiketi içindeki kelimeleri de tıklanabilir yap (YEŞİL KALIR)
      if (node.tagName === 'Q') {
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const words = child.textContent.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
              const trimmed = word.trim();
              if (trimmed && /^[A-Za-z]{2,}$/.test(trimmed) && !commonWords.includes(trimmed.toLowerCase())) {
                const span = document.createElement('span');
                span.className = 'clickable-word';
                // q içindeki kelimeler RENKLİ KALIR (CSS'te q span renk alır)
                span.textContent = word;
                span.setAttribute('data-word', trimmed);
                span.onclick = (e) => {
                  e.stopPropagation();
                  if (typeof explainWord === 'function') {
                    explainWord(trimmed, 'chatMessages');
                  }
                };
                fragment.appendChild(span);
              } else {
                fragment.appendChild(document.createTextNode(word));
              }
            });
            
            child.parentNode.replaceChild(fragment, child);
          }
        });
        return;
      }
      node.childNodes.forEach(makeWordsClickable);
    }
  }
  
  try {
    tempDiv.childNodes.forEach(makeWordsClickable);
    return tempDiv.innerHTML;
  } catch(e) {
    console.warn('HTML işleme hatası, fallback kullanılıyor:', e);
    return result;
  }
}


// ══════════════════════════════════════════════════════════
// YARDIMCI FONKSİYON - AI Yanıtını Temizle (ÖN İŞLEME)
// ══════════════════════════════════════════════════════════

function cleanAIResponse(rawResponse) {
  if (!rawResponse) return '';
  
  let cleaned = String(rawResponse);
  
  // Tüm CSS/HTML kalıntılarını yok et
  cleaned = cleaned
    .replace(/#[a-fA-F0-9]{3,6}\s*;?/gi, '')
    .replace(/color:\s*[a-z]+/gi, '')
    .replace(/color:\s*#[a-fA-F0-9]{3,6}/gi, '')
    .replace(/font-weight:\s*\d+/gi, '')
    .replace(/font-size:\s*[\d.]+px/gi, '')
    .replace(/font-family:[^;]+/gi, '')
    .replace(/display:\s*[^;]+/gi, '')
    .replace(/background:[^;]+/gi, '')
    .replace(/border[^:]+:[^;]+/gi, '')
    .replace(/margin[^:]+:[^;]+/gi, '')
    .replace(/padding[^:]+:[^;]+/gi, '')
    .replace(/<\/?[a-z]+[^>]*>/gi, '')
    .replace(/&lt;\/?[a-z]+[^&]*&gt;/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  cleaned = cleaned
    .replace(/\*\*([^*]+?)\*\*/g, '**$1**')
    .replace(/\*([^*]+?)\*/g, '*$1*');
  
  return cleaned;
}


// ══════════════════════════════════════════════════════════
// KELİME TIKLAMA - AI AÇIKLAMA
// ══════════════════════════════════════════════════════════

function makeWordsClickable(htmlText, containerId) {
  if (!enableWordClick) return htmlText;
  
  // HTML tagları içinde değil, sadece metin içindeki kelimeleri tıklanabilir yap
  // Basit yaklaşım: > ile < arasındaki metinleri işle
  
  const parts = htmlText.split(/(<[^>]+>)/g);
  
  return parts.map(part => {
    // HTML tag ise dokunma
    if (part.startsWith('<')) return part;
    
    // Metin ise kelimeleri tıklanabilir yap
    return part.replace(/\b([A-Za-z]{3,})\b/g, (match) => {
      // Çok yaygın kelimeler hariç
      const commonWords = ['the', 'and', 'are', 'for', 'was', 'with', 'you', 'that', 'this', 'have', 'from', 'not', 'but', 'can', 'will'];
      if (commonWords.includes(match.toLowerCase())) return match;
      
      return `<span class="clickable-word" onclick="explainWord('${match.replace(/'/g, "\\'")}', '${containerId}')">${match}</span>`;
    });
  }).join('');
}

// Panodan kelime aç
async function openWordFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const word = text.trim().replace(/[^a-zA-Z]/g, '');
    
    if (!word || word.length < 2) {
      showToast('⚠️ Hata', 'Panoda geçerli kelime yok. Web\'de kelime seç ve kopyala (Ctrl+C)');
      return;
    }
    
    // AI ekranına geç ve kelimeyi açıkla
    switchTab('ai');
    setTimeout(() => {
      _explainWordImpl(word, 'chatMessages');
      showToast('📖 Kelime Açıldı', `"${word}" panodansıldı`);
    }, 300);
    
  } catch (error) {
    showToast('❌ Hata', 'Panoya erişim izni gerekli. Tarayıcı ayarlarından izin ver.');
    console.error('Clipboard error:', error);
  }
}

// Kelime açıklama cache'i
const _wordExplainCache = (() => {
  const STORAGE_KEY = 'wm_word_explain_cache';
  const MAX = 500; // maksimum 500 kelime sakla
  let mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { mem = {}; }
    return mem;
  }

  return {
    get(word) {
      return load()[word.toLowerCase()] || null;
    },
    set(word, data) {
      const cache = load();
      cache[word.toLowerCase()] = data;
      // Sınırı aşarsa en eski girişleri sil
      const keys = Object.keys(cache);
      if (keys.length > MAX) {
        keys.slice(0, keys.length - MAX).forEach(k => delete cache[k]);
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch(e) {}
    }
  };
})();

// Kelime ilişkileri cache'i (aynı desen)
const _wordRelationsCache = (() => {
  const STORAGE_KEY = 'wm_word_relations_cache';
  const MAX = 500;
  let mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { mem = {}; }
    return mem;
  }

  return {
    get(word) {
      return load()[word.toLowerCase()] || null;
    },
    set(word, data) {
      const cache = load();
      cache[word.toLowerCase()] = data;
      const keys = Object.keys(cache);
      if (keys.length > MAX) {
        keys.slice(0, keys.length - MAX).forEach(k => delete cache[k]);
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch(e) {}
    },
    // Bellek cache'ini sıfırla (restore sonrası yeniden okutmak için)
    _reset() { mem = null; }
  };
})();

// ─────────────────────────────────────────────────────────
// Generic AI Cache (OCR, Visual, Examples, Pronunciation, Accent, Linguistics)
// Tek depo, tip prefix'iyle ayırt edilir: "type:key" formatında
// Örn: "visual:apple", "examples:run", "ocr:dog"
// ─────────────────────────────────────────────────────────
const _aiCache = (() => {
  const STORAGE_KEY = 'wm_ai_cache';
  const MAX = 1000; // tüm tipler paylaşır
  let mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { mem = {}; }
    return mem;
  }

  function makeKey(type, key) {
    return String(type) + ':' + String(key).toLowerCase().trim();
  }

  return {
    get(type, key) {
      const k = makeKey(type, key);
      return load()[k] || null;
    },
    set(type, key, data) {
      const cache = load();
      const k = makeKey(type, key);
      cache[k] = { data, savedAt: Date.now() };
      const keys = Object.keys(cache);
      if (keys.length > MAX) {
        keys.slice(0, keys.length - MAX).forEach(key2 => delete cache[key2]);
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch(e) {}
    },
    clear() {
      mem = {};
      try { localStorage.setItem(STORAGE_KEY, '{}'); } catch(e) {}
    },
    size() {
      return Object.keys(load()).length;
    },
    _reset() { mem = null; }
  };
})();

// ─────────────────────────────────────────────────────────
// Tüm AI cache'lerini temizle (Settings butonu için)
// ─────────────────────────────────────────────────────────
function clearAllAICaches() {
  // Sayım
  let total = 0;
  try { total += Object.keys(JSON.parse(localStorage.getItem('wm_word_explain_cache') || '{}')).length; } catch(e) {}
  try { total += Object.keys(JSON.parse(localStorage.getItem('wm_word_relations_cache') || '{}')).length; } catch(e) {}
  try { total += Object.keys(JSON.parse(localStorage.getItem('wm_ai_cache') || '{}')).length; } catch(e) {}

  if (total === 0) {
    if (typeof showToast === 'function') showToast('ℹ️ Boş', 'Temizlenecek cache yok');
    else alert('Temizlenecek cache yok.');
    return;
  }

  if (!confirm(`🗑️ Tüm AI cache'leri silinecek (${total} kayıt).\n\nKelime Açıklama, Kelime İlişkileri, OCR, Görsel, Örnek cümleler ve Linguistik verileri silinecek.\n\nDevam edilsin mi?`)) return;

  try { localStorage.removeItem('wm_word_explain_cache'); } catch(e) {}
  try { localStorage.removeItem('wm_word_relations_cache'); } catch(e) {}
  try { localStorage.removeItem('wm_ai_cache'); } catch(e) {}
  try { if (typeof _wordRelationsCache !== 'undefined' && _wordRelationsCache._reset) _wordRelationsCache._reset(); } catch(e) {}
  try { if (typeof _aiCache !== 'undefined' && _aiCache._reset) _aiCache._reset(); } catch(e) {}
  // wgRelCache (Word Graph in-memory) sıfırla
  try { if (typeof wgRelCache !== 'undefined') wgRelCache = {}; } catch(e) {}

  if (typeof showToast === 'function') showToast('🗑️ Temizlendi', total + ' AI cache kaydı silindi');
  else alert(total + ' AI cache kaydı silindi.');
  console.log('🗑️ Tüm AI cache temizlendi:', total, 'kayıt');
}

// ─────────────────────────────────────────────────────────
// Telaffuz Puanlamasında AI Analizi - ayar
// Varsayılan: KAPALI (her denemede token harcamamak için)
// ─────────────────────────────────────────────────────────
function isPronunAIAnalysisEnabled() {
  try { return localStorage.getItem('wm_pronun_ai_analysis_enabled') === '1'; }
  catch(e) { return false; }
}
function savePronunAIAnalysisSetting() {
  const el = document.getElementById('pronunAIAnalysis');
  if (!el) return;
  try { localStorage.setItem('wm_pronun_ai_analysis_enabled', el.checked ? '1' : '0'); } catch(e) {}
}
// Sayfa açılışında checkbox'ı senkronla
try {
  document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById('pronunAIAnalysis');
    if (el) el.checked = isPronunAIAnalysisEnabled();
    // Sözlük durum kutusunu da güncelle
    setTimeout(updateDictionaryStatusBox, 300);
  });
} catch(e) {}

// ─────────────────────────────────────────────────────────
// Yerel Sözlük yönetimi (Settings → Yerel Sözlük kartı)
// ─────────────────────────────────────────────────────────
function updateDictionaryStatusBox() {
  const box = document.getElementById('dictStatusBox');
  if (!box) return;
  const dict = window.WM_Dictionary || {};
  const count = Object.keys(dict).length;
  const src = window.WM_DictionarySource || 'unknown';
  const srcLabels = {
    'fetch': '🌐 Server\'dan (sozluk.json)',
    'user': '💾 Kullanıcı yüklemesi (localStorage)',
    'empty': '⚠️ Sözlük yüklenmedi',
    'unknown': '❓ Bilinmiyor'
  };
  const srcLabel = srcLabels[src] || src;
  const userExists = !!localStorage.getItem('wm_user_dictionary');
  box.innerHTML = `
    <div><b>Kaynak:</b> ${srcLabel}</div>
    <div><b>Kelime sayısı:</b> ${count.toLocaleString('tr-TR')}</div>
    ${userExists ? '<div style="margin-top:6px;color:#4ade80">✓ Kullanıcı sözlüğü localStorage\'da kayıtlı</div>' : ''}
  `;
}

function handleDictionaryUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('❌ Çok büyük', 'Sözlük dosyası 5 MB üzerinde');
    else alert('Sözlük dosyası 5 MB üzerinde, yüklenemedi.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Yapı uygun değil');
      const keys = Object.keys(data);
      if (keys.length === 0) throw new Error('Boş sözlük');
      // Bir örnek kayıt kontrol et: { tr_pron, meanings, cefr } yapısı
      const sample = data[keys[0]];
      if (!sample || typeof sample !== 'object') throw new Error('Kayıt yapısı hatalı');
      // Yükle
      localStorage.setItem('wm_user_dictionary', JSON.stringify(data));
      window.WM_Dictionary = data;
      window.WM_DictionarySource = 'user';
      console.log('📚 Kullanıcı sözlüğü yüklendi:', keys.length, 'kelime');
      updateDictionaryStatusBox();
      if (typeof showToast === 'function') showToast('✅ Yüklendi', keys.length + ' kelime aktif');
      else alert('Sözlük yüklendi: ' + keys.length + ' kelime');
    } catch(err) {
      console.error('Sözlük yükleme hatası:', err);
      if (typeof showToast === 'function') showToast('❌ Hata', 'Geçersiz sözlük: ' + err.message);
      else alert('Geçersiz sözlük dosyası: ' + err.message);
    } finally {
      // Input'u sıfırla ki aynı dosyayı tekrar seçebilsin
      event.target.value = '';
    }
  };
  reader.onerror = function() {
    if (typeof showToast === 'function') showToast('❌ Hata', 'Dosya okunamadı');
    else alert('Dosya okunamadı');
  };
  reader.readAsText(file, 'utf-8');
}

function downloadCurrentDictionary() {
  const dict = window.WM_Dictionary || {};
  if (Object.keys(dict).length === 0) {
    if (typeof showToast === 'function') showToast('⚠️ Boş', 'İndirilecek sözlük yok');
    else alert('İndirilecek sözlük yok.');
    return;
  }
  try {
    const blob = new Blob([JSON.stringify(dict, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sozluk.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    if (typeof showToast === 'function') showToast('💾 İndirildi', 'sozluk.json');
  } catch(e) {
    alert('İndirme hatası: ' + e.message);
  }
}

// Sözlükte olmayan bir kelimeyi AI ile analiz edip kullanıcı sözlüğüne kalıcı ekler
async function addWordToUserDictionary(word, btnEl) {
  if (!word) return;
  const w = String(word).toLowerCase().trim();
  if (!w) return;

  // Buton durumunu güncelle
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ AI analiz ediyor...';
    btnEl.style.opacity = '0.6';
  }

  try {
    // Mevcut sözlüğü oku (kullanıcı veya gömülü)
    const currentDict = window.WM_Dictionary || {};

    // AI'a sor
    const prompt = `Word: "${w}"
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "tr_pron": "Türkçe okunuşu (örn: Ebılıti)",
  "meanings": ["anlam1 [i./s./f./zf.]", "anlam2 [i./s./f./zf.]", "anlam3 [i./s./f./zf.]"],
  "cefr": "A1/A2/B1/B2/C1/C2"
}
Kurallar:
- tr_pron: kelimenin Türkçe fonetik okunuşu (IPA değil)
- meanings: 1-3 Türkçe anlam, her birinde tür kısaltması: [i.]=isim, [s.]=sıfat, [f.]=fiil, [zf.]=zarf, [ed.]=edat
- cefr: kelimenin tahmini CEFR seviyesi`;

    const r = await callAI('Sen bir İngilizce sözlük asistanısın. Sadece geçerli JSON döndür.', prompt, 'explain');
    const raw = (r.content || r || '').replace(/```json|```/g, '').trim();
    const data = JSON.parse(raw);

    // Doğrulama
    if (!data.tr_pron || !Array.isArray(data.meanings) || data.meanings.length === 0) {
      throw new Error('AI cevabı eksik');
    }

    // Zipf frequency tahmini (cefr bazlı)
    const cefrZipf = { 'A1': 5.5, 'A2': 5.0, 'B1': 4.5, 'B2': 4.0, 'C1': 3.5, 'C2': 3.0 };
    const newEntry = {
      tr_pron: data.tr_pron,
      meanings: data.meanings,
      cefr: data.cefr || 'B1',
      zipf: cefrZipf[data.cefr] || 4.0
    };

    // Sözlüğe ekle (mevcut sözlüğü kopyalayıp yeni kelimeyi koy)
    const newDict = Object.assign({}, currentDict);
    newDict[w] = newEntry;

    // localStorage'a kaydet
    localStorage.setItem('wm_user_dictionary', JSON.stringify(newDict));
    window.WM_Dictionary = newDict;
    window.WM_DictionarySource = 'user';

    console.log('➕ Sözlüğe eklendi:', w, newEntry);

    if (typeof showToast === 'function') showToast('✅ Eklendi', `"${w}" sözlüğe kaydedildi`);

    // Popup'ı kapatıp tekrar aç ki yeni anlamları göstersin
    if (typeof WM_Pronunciation !== 'undefined' && WM_Pronunciation.closePopup) {
      WM_Pronunciation.closePopup();
      setTimeout(() => WM_Pronunciation.showPronunciationPopup(w, null), 200);
    }

    // Settings durum kutusu varsa güncelle
    if (typeof updateDictionaryStatusBox === 'function') updateDictionaryStatusBox();

  } catch(e) {
    console.error('Sözlüğe ekleme hatası:', e);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '❌ Hata, tekrar dene';
      btnEl.style.opacity = '1';
    }
    if (typeof showToast === 'function') showToast('❌ Hata', e.message);
  }
}

async function resetToEmbeddedDictionary() {
  if (!localStorage.getItem('wm_user_dictionary')) {
    if (typeof showToast === 'function') showToast('ℹ️ Bilgi', 'Zaten gömülü/server sözlüğü kullanılıyor');
    else alert('Zaten gömülü/server sözlüğü kullanılıyor.');
    return;
  }
  if (!confirm('🔄 Kullanıcı sözlüğü silinecek ve server/gömülü sözlüğe dönülecek. Devam edilsin mi?')) return;
  try {
    localStorage.removeItem('wm_user_dictionary');
    // Sözlüğü yeniden yükle (fetch'i tekrar dene)
    window.WM_Dictionary = null;
    window.WM_DictionarySource = null;
    try {
      const res = await fetch('sozluk.json', { cache: 'reload' });
      if (res.ok) {
        const data = await res.json();
        window.WM_Dictionary = data;
        window.WM_DictionarySource = 'fetch';
        console.log('📚 Server sözlüğüne dönüldü:', Object.keys(data).length);
      } else throw new Error('Server sözlüğü bulunamadı');
    } catch(e) {
      window.WM_Dictionary = {};
      window.WM_DictionarySource = 'empty';
      console.warn('Server sözlüğü de yok, boş kaldı:', e.message);
    }
    updateDictionaryStatusBox();
    if (typeof showToast === 'function') showToast('🔄 Sıfırlandı', 'Sözlük yeniden yüklendi');
  } catch(e) {
    alert('Sıfırlama hatası: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────
// explainWord: dispatcher
// Tek tık = telaffuz popup'ı (içinde Kelime Açıklama ve Kelime İlişkileri butonları var)
// Tüm onclick="explainWord(...)" çağrıları aynı kalır.
// Programatik (uzun-basma, clipboard, vs.) yerler doğrudan _explainWordImpl çağırıyor.
// ─────────────────────────────────────────────────────────

function _findWordTr(word){
  if (!word) return '';
  const w = String(word).toLowerCase();
  try {
    const a = (typeof allWords !== 'undefined' && allWords) ? allWords : [];
    const b = (typeof words !== 'undefined' && words) ? words : [];
    const hit = a.find(x => x && x.word && x.word.toLowerCase() === w)
             || b.find(x => x && x.word && x.word.toLowerCase() === w);
    if (hit) return hit.tr || '';
  } catch(e){}
  return '';
}
function _findWordSentence(word){
  if (!word) return '';
  const w = String(word).toLowerCase();
  try {
    const a = (typeof allWords !== 'undefined' && allWords) ? allWords : [];
    const b = (typeof words !== 'undefined' && words) ? words : [];
    const hit = a.find(x => x && x.word && x.word.toLowerCase() === w)
             || b.find(x => x && x.word && x.word.toLowerCase() === w);
    if (hit) return hit.sentence || '';
  } catch(e){}
  return '';
}

function explainWord(word, containerId) {
  // ✋ Scroll/kaydırma sırasında tetikleme
  if (window._scrollGuardActive) {
    console.log('⏸️ explainWord scroll nedeniyle iptal:', word);
    return;
  }
  // Tıklama: telaffuz popup'ını aç
  if (typeof WM_Pronunciation !== 'undefined' && typeof WM_Pronunciation.showPronunciationPopup === 'function') {
    try {
      WM_Pronunciation.showPronunciationPopup(word, null);
      return;
    } catch(e) {
      console.warn('Pronunciation popup açılamadı, açıklamaya geçiliyor:', e);
    }
  }
  // Fallback: popup sistemi yoksa eski davranış
  _explainWordImpl(word, containerId);
}

async function _explainWordImpl(word, containerId) {
  const cacheKey = word.toLowerCase();

  // Cache'de var mı?
  const cached = _wordExplainCache.get(cacheKey);
  if (cached) {
    console.log("📦 Cache'den gösteriliyor:", word);
    showWordExplanationModal(word, cached.content, containerId, 'explain', cached.model, cached.tokenLimit);
    return;
  }

  // Cache'de yok — AI'dan iste
  showToast('🤔 Düşünüyor...', `"${word}" açıklanıyor`);
  
  const prompt = `Explain the English word "${word}" in Turkish. Include:
1. Turkish translation (Türkçe anlamı)
2. Part of speech (Kelime türü: isim, fiil, sıfat vb)
3. 2 simple example sentences in English with Turkish translations
4. Common phrases or collocations with this word

Keep it concise and beginner-friendly.`;

  try {
    const systemPrompt = "You are an English teacher. Explain words clearly and provide examples.";
    const response = await callAI(systemPrompt, prompt, 'explain');
    window._contextRawText = response;
    
    if (!response || !response.content) {
      showToast('❌ Hata', 'Yanıt alınamadı');
      return;
    }
    
    const contentString = String(response.content);

    // Cache'e kaydet
    _wordExplainCache.set(cacheKey, {
      content: contentString,
      model: response.model,
      tokenLimit: response.tokenLimit,
      savedAt: Date.now()
    });

    showWordExplanationModal(word, contentString, containerId, 'explain', response.model, response.tokenLimit);
    
  } catch (error) {
    console.error('❌ Word explanation error:', error);
    showToast('❌ Hata', error.message || 'Açıklama alınamadı');
  }
}

function showWordExplanationModal(word, explanation, containerId, aiType = 'explain', actualModel = null, actualTokenLimit = null) {
  // Geçmişe ekle
  explanationHistory.push({ word, explanation, containerId, aiType, actualModel, actualTokenLimit });
  explanationHistoryIndex = explanationHistory.length - 1;
  
  renderWordExplanationModal();
}

function renderWordExplanationModal() {
  if (explanationHistoryIndex < 0 || explanationHistoryIndex >= explanationHistory.length) return;
  
  const current = explanationHistory[explanationHistoryIndex];
  const { word, explanation, containerId, aiType, actualModel, actualTokenLimit } = current;
  
  const usedModel = actualModel || getAIModel(aiType);
  const usedTokenLimit = actualTokenLimit || getAITokenLimit(aiType);
  
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
  
  // Eski modal varsa kaldır
  const oldModal = document.getElementById('wordExplanationModal');
  if (oldModal) oldModal.remove();
  
  // Modal oluştur
  const modal = document.createElement('div');
  modal.id = 'wordExplanationModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  `;
  
  // Kelime mevcut kelimelerde var mı kontrol et
  const wordExists = allWords && allWords.some(w => w.word.toLowerCase() === word.toLowerCase());
  
  modal.innerHTML = `
    <div style="
      background: var(--bg2);
      border-radius: 20px;
      padding: 24px;
      max-width: 440px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      border: 1px solid var(--border);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5); ">
      <!-- Üst başlık -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="font-size: 24px; font-weight: 900; color: var(--green);">${word}</div>
        <button onclick="closeWordExplanation()" style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: var(--bg3);
          color: var(--muted);
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center; ">×</button>
      </div>
      
      <!-- Model badge -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0,0,0,0.4);
          border: 2px solid ${modelColor};
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          color: ${modelColor};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); ">
          🤖 <span style="color: var(--text)">${modelName}</span> <span style="opacity:0.7">• ${usedTokenLimit} token</span>
        </div>
        ${_wordExplainCache.get(word) ? '<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(34,197,94,.15);border:1px solid #22c55e;border-radius:8px;font-size:11px;font-weight:800;color:#22c55e">📦 Önbellekten</div>' : ''}
      </div>
      
      <!-- Açıklama -->
      <div id="modalExplanationContent" style="
        font-size: var(--ai-text-size, 15px);
        line-height: 1.9;
        color: var(--text);
        white-space: pre-wrap;
        margin-bottom: 16px; ">${highlightEnglishWords(explanation)}</div>
      
      <!-- İleri/Geri Navigasyon -->
      ${explanationHistory.length > 1 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; padding: 12px; background: var(--bg3); border-radius: 12px;">
        <button onclick="explanationNavigate(-1)" ${explanationHistoryIndex <= 0 ? 'disabled' : ''} style="
          flex: 1;
          padding: 10px;
          background: ${explanationHistoryIndex <= 0 ? 'var(--bg2)' : 'var(--blue)'};
          color: ${explanationHistoryIndex <= 0 ? 'var(--muted)' : '#fff'};
          border: none;
          border-radius: 10px;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: ${explanationHistoryIndex <= 0 ? 'not-allowed' : 'pointer'};
          opacity: ${explanationHistoryIndex <= 0 ? '0.5' : '1'}; ">← Önceki</button>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 800;
          color: var(--muted);
          white-space: nowrap; ">${explanationHistoryIndex + 1}/${explanationHistory.length}</div>
        <button onclick="explanationNavigate(1)" ${explanationHistoryIndex >= explanationHistory.length - 1 ? 'disabled' : ''} style="
          flex: 1;
          padding: 10px;
          background: ${explanationHistoryIndex >= explanationHistory.length - 1 ? 'var(--bg2)' : 'var(--blue)'};
          color: ${explanationHistoryIndex >= explanationHistory.length - 1 ? 'var(--muted)' : '#fff'};
          border: none;
          border-radius: 10px;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: ${explanationHistoryIndex >= explanationHistory.length - 1 ? 'not-allowed' : 'pointer'};
          opacity: ${explanationHistoryIndex >= explanationHistory.length - 1 ? '0.5' : '1'}; ">Sonraki →</button>
      </div>
      ` : ''}
      
      <!-- Aksiyon butonları -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${!wordExists ? `
        <button onclick="addToLearnList('${word.replace(/'/g, "\\'")}'); showToast('✅ Eklendi', 'Ezberlenecekler listesine eklendi')" style="
          width: 100%;
          padding: 12px;
          background: var(--green);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer; ">📌 Ezberleneceklere Ekle</button>
        ` : `
        <div style="
          width: 100%;
          padding: 12px;
          background: rgba(34, 197, 94, 0.2);
          color: var(--green);
          border: 1.5px solid var(--green);
          border-radius: 12px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
          text-align: center; ">✅ Bu kelime zaten listenizde</div>
        `}
        
        <button onclick="speak('${word.replace(/'/g, "\\'")}', 'en-US')" style="
          width: 100%;
          padding: 12px;
          background: var(--blue);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer; ">🔊 Telaffuz Konuş</button>
        
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="startContextWithWord('${word.replace(/'/g,"\\'")}');document.querySelector('.modal-overlay')?.remove()" style="
            flex: 1;
            padding: 12px;
            background: var(--purple);
            color: white;
            border: none;
            border-radius: 12px;
            font-family: 'Nunito', sans-serif;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer; ">📝 Bağlamda Çalış</button>
          
          <button onclick="startSentenceModeWithWord('${word.replace(/'/g,"\\'")}');document.querySelector('.modal-overlay')?.remove()" style="
            flex: 1;
            padding: 12px;
            background: var(--blue);
            color: white;
            border: none;
            border-radius: 12px;
            font-family: 'Nunito', sans-serif;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer; ">🔤 Cümle Sırala</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Modal içindeki kelimelere tıklama desteği
  const modalContent = modal.querySelector('#modalExplanationContent');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation(); // Modal kapatma ile çakışma önlenir
      
      // Global getWord fonksiyonunu kullan
      const clickedWord = getWord(e.target);
      
      if (clickedWord && clickedWord.length >= 2) {
        const cleaned = clickedWord.replace(/[^a-zA-Z]/g,'').toLowerCase();
        if (cleaned && cleaned.length >= 2) {
          navigator.vibrate && navigator.vibrate(30);
          explainWord(cleaned, 'modalExplanationContent');
        }
      }
    });
    
    // Her kelimeyi span ile wrap et (daha güvenilir tıklama)
    wrapWordsInModal(modalContent);
  }
  
  // Dışarıya tıkla kapat
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWordExplanation();
  });
}

// Modal içindeki kelimeleri span ile wrap et
function wrapWordsInModal(container) {
  if (!container) return;
  
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Boş veya sadece whitespace olan node'ları atla
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        // Zaten span içindeyse atla
        if (node.parentNode && node.parentNode.classList && 
            (node.parentNode.classList.contains('clickable-word') || 
             node.parentNode.classList.contains('en-word') ||
             node.parentNode.classList.contains('modal-clickable-word'))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  
  textNodes.forEach(node => {
    const text = node.textContent;
    const parts = text.split(/(\s+)/);
    
    if (parts.length > 1) {
      const fragment = document.createDocumentFragment();
      
      parts.forEach(part => {
        if (/\s+/.test(part)) {
          // Boşluk
          fragment.appendChild(document.createTextNode(part));
        } else {
          const cleaned = part.replace(/[^a-zA-Z]/g,'');
          if (cleaned.length >= 2) {
            // Tıklanabilir kelime
            const span = document.createElement('span');
            span.className = 'modal-clickable-word';
            span.textContent = part;
            span.style.cursor = 'pointer';
            span.setAttribute('data-word', cleaned.toLowerCase());
            fragment.appendChild(span);
          } else {
            // Kısa/noktalama
            fragment.appendChild(document.createTextNode(part));
          }
        }
      });
      
      node.parentNode.replaceChild(fragment, node);
    }
  });
}

function explanationNavigate(direction) {
  const newIndex = explanationHistoryIndex + direction;
  if (newIndex >= 0 && newIndex < explanationHistory.length) {
    explanationHistoryIndex = newIndex;
    renderWordExplanationModal();
  }
}

function addToLearnList(word) {
  word=String(word||'').trim().toLowerCase();
  if(!word) return;
  try{
    if(Array.isArray(allWords) && allWords.some(w=>String(w.word||'').toLowerCase()===word)){
      localStorage.setItem('toLearnWords_'+Date.now(), JSON.stringify(allWords.find(w=>String(w.word||'').toLowerCase()===word)));
      return;
    }
  }catch(e){}
  // Excel'e eklemek için basit bir yapı oluştur
  const newWord = {
    word: word,
    tr: '', // Boş - kullanıcı dolduracak
    sentence: '',
    sentenceTr: '',
    phonetic: '',
    colors: ''
  };
  
  // allWords array'ine ekle
  if (!allWords) allWords = [];
  allWords.push(newWord);
  
  // localStorage'a kaydet
  try {
    localStorage.setItem('toLearnWords_' + Date.now(), JSON.stringify(newWord));
  } catch(e) {
    console.warn('localStorage hatası:', e);
  }
  
  // Modal'ı yenile (buton değişsin)
  renderWordExplanationModal();
}

function makeModalWordsClickable(text) {
  // Modal içindeki İngilizce kelimeleri tıklanabilir yap
  // Düz metin ama tıklayınca yeni açıklama geçmişe eklenir
  try {
    return text.replace(/\b([A-Za-z]{3,})\b/g, (match) => {
      const common = ['the','and','are','for','was','with','you','that','this','have','from','not','but','can','will','she','her','his','him','they','them','their','had','has','been','were','said','did','all','one','would','could','should','what','when','where','which','who','how','its','our','your','into','than','then','more','some','such','each','most','very','just','any','only'];
      if(common.includes(match.toLowerCase())) return match;
      // Tıklanabilir yap - onclick ile yeni kelime açıklaması geçmişe eklenecek
      return `<span style="cursor:pointer;color:var(--blue);text-decoration:underline dotted;text-underline-offset:2px" onclick="event.stopPropagation();explainWordInModal('${match.replace(/'/g,"\\'")}')">${match}</span>`;
    });
  } catch(e){ return text; }
}

async function explainWordInModal(word) {
  showToast('🤔 Düşünüyor...', `"${word}" açıklanıyor`);
  
  const prompt = `Explain the English word "${word}" in Turkish. Include:
1. Turkish translation (Türkçe anlamı)
2. Part of speech (Kelime türü: isim, fiil, sıfat vb)
3. 2 simple example sentences in English with Turkish translations
4. Common phrases or collocations with this word

Keep it concise and beginner-friendly.`;

  try {
    const response = await callAI(getPrompt('explain'), prompt, 'explain');
    
    if(!response || !response.content) {
      showToast('❌ Hata', 'Yanıt alınamadı');
      return;
    }
    
    const contentString = String(response.content);
    
    // Yeni açıklamayı geçmişe ekle (modal açmadan)
    explanationHistory.push({
      word: word,
      explanation: contentString,
      containerId: 'modalExplanationContent',
      aiType: 'explain',
      actualModel: response.model,
      actualTokenLimit: response.tokenLimit
    });
    explanationHistoryIndex = explanationHistory.length - 1;
    
    // Modal'ı yenile (yeni kelime gösterilecek)
    renderWordExplanationModal();
    
  } catch (error) {
    console.error('❌ Word explanation error:', error);
    showToast('❌ Hata', error.message || 'Açıklama alınamadı');
  }
}

function closeWordExplanation() {
  const modal = document.getElementById('wordExplanationModal');
  if (modal) modal.remove();
  
  // Geçmişi temizle
  explanationHistory = [];
  explanationHistoryIndex = -1;
}

function toggleFeatures() {
  const actRow = document.getElementById('actRow');
  const arrow = document.getElementById('featuresArrow');
  const btn = document.getElementById('featuresToggleBtn');
  
  if (actRow.style.display === 'none') {
    actRow.style.display = 'flex';
    arrow.textContent = '▲';
    btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  } else {
    actRow.style.display = 'none';
    arrow.textContent = '▼';
    btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
}

// Accordion toggle için yeni fonksiyon
function toggleFeatureCategory(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('.feature-arrow');
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    // Kapat
    content.classList.remove('open');
    arrow.classList.remove('open');
    content.style.maxHeight = '0';
  } else {
    // Aç
    content.classList.add('open');
    arrow.classList.add('open');
    // İçeriğin tam yüksekliğini al
    const innerDiv = content.firstElementChild;
    const height = innerDiv ? innerDiv.scrollHeight : content.scrollHeight;
    content.style.maxHeight = (height + 50) + 'px'; // +50px padding için
  }
}

// ══════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════
function markLearned(){
  const item = words[idx];
  if(!item || !item.word) return false;

  const word = item.word;
  const listNameBefore = getActiveListName();

  // Bu buton toggle yapmasın: görevi kelimeyi öğrenildi yapıp ilerletmek.
  learnedSet.add(word);
  item.learned = true;
  item.isLearned = true;
  item.status = 'learned';

  if(!wordStatus[word]) wordStatus[word] = {attempts:1, correct:1, pronScore:null};
  else wordStatus[word].correct = Math.max(1, wordStatus[word].correct || 0);

  const btn = document.getElementById("btnLearned");
  if(btn){
    btn.textContent = "✓ Öğrenildi";
    btn.classList.add("done");
  }

  try { recordLearningTime(word); } catch(e) {}
  try { updateSRS(word, true); } catch(e) {}
  try { addLearnedWord(word, item.tr || item.translation || '', 'learning'); } catch(e) {}
  try { incrementTodayLearned(); } catch(e) {}

  saveProgress();
  saveCurrentListProgress();
  setActiveListTitle(listNameBefore);
  try { renderWordList(); } catch(e) {}

  // Görünür davranış: Öğrendim'e basınca sıradaki öğrenilmemiş kelimeye geç.
  const nextIndex = words.findIndex((w, i) => i > idx && w && w.word && !learnedSet.has(w.word));
  if(nextIndex !== -1){
    idx = nextIndex;
    renderLearn();
  } else {
    const firstUnlearned = words.findIndex(w => w && w.word && !learnedSet.has(w.word));
    if(firstUnlearned !== -1){
      idx = firstUnlearned;
      renderLearn();
    } else {
      renderLearn();
      try { showToast('🎉 Liste tamamlandı', listNameBefore + ' listesindeki tüm kelimeler öğrenildi'); } catch(e) {}
    }
  }

  setActiveListTitle(listNameBefore);
  return false;
}

// Spaced Repetition güncelleme
function updateSRS(word, isCorrect){
  const now = Date.now();
  
  const ONE_DAY = 24 * 60 * 60 * 1000; // Gerçek: 1 gün
  
  if(!spacedRepetition[word]){
    spacedRepetition[word] = {
      level: 0,
      correctStreak: 0,
      lastReview: now,
      nextReview: now + ONE_DAY
    };
  }
  
  const srs = spacedRepetition[word];
  
  if(isCorrect){
    srs.correctStreak++;
    srs.level = Math.min(srs.correctStreak, SRS_INTERVALS.length - 1);
    const daysUntilNext = SRS_INTERVALS[srs.level];
    srs.nextReview = now + (daysUntilNext * ONE_DAY);
  }else{
    srs.correctStreak = Math.max(0, srs.correctStreak - 1);
    srs.level = Math.max(0, srs.level - 1);
    srs.nextReview = now + ONE_DAY;
  }
  
  srs.lastReview = now;
  const _srsStr = JSON.stringify(spacedRepetition);
  localStorage.setItem("spacedRepetition", _srsStr);
  WMStore.set("spacedRepetition", _srsStr).catch(()=>{});
}

// Tekrar edilmesi gereken kelimeleri getir
function getDueWords(){
  const now = Date.now();
  return allWords.filter(w => {
    const srs = spacedRepetition[w.word];
    return srs && srs.nextReview <= now;
  });
}

// Tekrar modu başlat
function startReviewMode(){
  showScreen("sc-srs");
  showSRSSummary();
}

// ── SRS Oturum Değişkenleri ──
let srsQueue=[], srsQueueIdx=0, srsFlipped=false, srsCorrect=0, srsWrong=0;

function showSRSSummary(){
  const due = getDueWords();
  document.getElementById("srsSummaryCard").style.display="";
  document.getElementById("srsSessionCard").style.display="none";
  document.getElementById("srsFinishCard").style.display="none";
  document.getElementById("srsTotalDue").textContent = due.length + " kelime tekrar bekliyor";
  document.getElementById("srsSubtitle").textContent = due.length===0
    ? "🎉 Harika! Tüm tekrarlar tamamlandı."
    : "Ebbinghaus eğrisine göre akıllı tekrar";
  document.getElementById("srStartBtn").style.display = due.length>0?"":"none";

  // Seviye dağılımı
  const srsLabels = ["🌱","📘","📗","📙","⭐","🌟","🏆"];
  const srsColors = ["#6366f1","#3b82f6","#10b981","#f59e0b","#f97316","#ec4899","#8b5cf6"];
  const levelCounts = {};
  due.forEach(w=>{
    const lvl = spacedRepetition[w.word]?.level||0;
    levelCounts[lvl]=(levelCounts[lvl]||0)+1;
  });
  document.getElementById("srsLevelBreakdown").innerHTML = Object.entries(levelCounts)
    .map(([lvl,cnt])=>`<span style="background:${srsColors[lvl]||"#6366f1"};color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:800">${srsLabels[lvl]||"🏆"} ${cnt}</span>`)
    .join("");

  // Yarın kaç kelime var
  const tomorrow = Date.now() + 24*60*60*1000;
  const upcoming = allWords.filter(w=>{
    const srs=spacedRepetition[w.word];
    return srs && srs.nextReview>Date.now() && srs.nextReview<=tomorrow;
  }).length;
  if(upcoming>0){
    document.getElementById("srsSubtitle").textContent += `  ·  Yarın: ${upcoming} kelime`;
  }
}

function startSRSSession(){
  srsQueue = getDueWords();
  if(srsQueue.length===0){ showSRSSummary(); return; }
  // Shuffle
  srsQueue.sort(()=>Math.random()-.5);
  srsQueueIdx=0; srsCorrect=0; srsWrong=0;
  document.getElementById("srsSummaryCard").style.display="none";
  document.getElementById("srsFinishCard").style.display="none";
  document.getElementById("srsSessionCard").style.display="";
  renderSRSCard();
}

function renderSRSCard(){
  if(srsQueueIdx>=srsQueue.length){ finishSRSSession(); return; }
  srsFlipped=false;
  const item=srsQueue[srsQueueIdx];
  const srsData=spacedRepetition[item.word];
  const srsLabels=["🌱 Yeni","📘 Başlangıç","📗 Orta","📙 İyi","⭐ Güçlü","🌟 Çok Güçlü","🏆 Uzman"];
  const lvl=srsData?.level||0;

  document.getElementById("srsCardWord").textContent=item.word;
  document.getElementById("srsCardPhonetic").textContent=item.phonetic||"";
  document.getElementById("srsCardTr").textContent=item.tr;
  document.getElementById("srsCardSent").textContent=item.sentence||"";
  document.getElementById("srsCardSent").style.display=item.sentence?"":"none";
  document.getElementById("srsCardMeta").textContent=srsLabels[lvl]||"🏆 Uzman";
  document.getElementById("srsCardFront").style.display="";
  document.getElementById("srsCardBack").style.display="none";
  document.getElementById("srsAnswerBtns").style.display="none";
  document.getElementById("srsFlipCard").style.borderColor="var(--border)";

  // İlerleme
  const pct=Math.round(srsQueueIdx/srsQueue.length*100);
  document.getElementById("srsFill").style.width=pct+"%";
  document.getElementById("srsCounter").textContent=(srsQueueIdx+1)+" / "+srsQueue.length;
}

function flipSRSCard(){
  if(srsFlipped) return;
  srsFlipped=true;
  document.getElementById("srsCardFront").style.display="none";
  document.getElementById("srsCardBack").style.display="";
  document.getElementById("srsAnswerBtns").style.display="grid";
  document.getElementById("srsFlipCard").style.borderColor="var(--purple)";
  speak(document.getElementById("srsCardWord").textContent,"en-US");
}

function answerSRS(correct){
  const item=srsQueue[srsQueueIdx];
  updateSRS(item.word, correct);
  if(correct) srsCorrect++; else srsWrong++;
  srsQueueIdx++;
  // Yanlış olanı sona ekle (1 kez daha)
  if(!correct && srsWrong<=3) srsQueue.push(item);
  renderSRSCard();
}

function finishSRSSession(){
  document.getElementById("srsSessionCard").style.display="none";
  document.getElementById("srsFinishCard").style.display="";
  document.getElementById("srsFill").style.width="100%";
  const total=srsCorrect+srsWrong;
  const pct=total>0?Math.round(srsCorrect/total*100):0;
  document.getElementById("srsFinishStats").innerHTML=
    `✅ Doğru: <b style="color:var(--green)">${srsCorrect}</b><br>`+
    `❌ Yanlış: <b style="color:var(--red)">${srsWrong}</b><br>`+
    `📊 Başarı: <b style="color:var(--purple)">${pct}%</b><br>`+
    `🧠 Tekrar edilen: <b>${srsCorrect+srsWrong}</b> kelime`;
  updateReviewCount();
  saveProgress();
}

// Tekrar sayısını güncelle
function updateReviewCount(){
  const dueWords = getDueWords();
  const count = dueWords.length;
  const btn = document.getElementById("btnReview");
  const countEl = document.getElementById("reviewCount");
  
  if(count > 0){
    btn.style.display = "block";
    countEl.textContent = count;
  }else{
    btn.style.display = "none";
  }
}

// Zayıf Noktalar Analizi
function renderWeakPoints(){
  // En çok yanlış yapılan kelimeleri bul
  const weakWords = allWords
    .filter(w => {
      const st = wordStatus[w.word];
      return st && st.attempts > 0 && st.correct === 0;
    })
    .sort((a, b) => {
      const stA = wordStatus[a.word];
      const stB = wordStatus[b.word];
      return (stB.attempts || 0) - (stA.attempts || 0);
    })
    .slice(0, 10); // En kötü 10
  
  const listEl = document.getElementById("weakPointsList");
  const btnEl = document.getElementById("btnPracticeWeak");
  
  if(weakWords.length === 0){
    listEl.innerHTML = `<div style="color:var(--muted);text-align:center;padding:20px">
      🎉 Harika! Henüz zayıf noktanız yok. Devam edin!
    </div>`;
    btnEl.style.display = "none";
    return;
  }
  
  let html = `<div style="color:var(--muted);margin-bottom:8px">En çok zorlandığınız ${weakWords.length} kelime:</div>`;
  
  weakWords.forEach((w, i) => {
    const st = wordStatus[w.word];
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg2);border-radius:8px;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text)">${i + 1}. ${w.word}</div>
          <div style="font-size:11px;color:var(--muted)">${w.tr}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--orange);font-weight:700">${st.attempts} deneme</div>
          <div style="font-size:10px;color:var(--muted)">%0 başarı</div>
        </div>
      </div>`;
  });
  
  listEl.innerHTML = html;
  btnEl.style.display = "block";
}

function practiceWeakWords(){
  // En zayıf 10 kelimeyi pratik listesine ekle
  const weakWords = allWords
    .filter(w => {
      const st = wordStatus[w.word];
      return st && st.attempts > 0 && st.correct === 0;
    })
    .sort((a, b) => {
      const stA = wordStatus[a.word];
      const stB = wordStatus[b.word];
      return (stB.attempts || 0) - (stA.attempts || 0);
    })
    .slice(0, 10);
  
  if(weakWords.length === 0){
    alert("🎉 Zayıf noktanız yok!");
    return;
  }
  
  words = weakWords;
  idx = 0;
  phase = "learn";
  showScreen("sc-word");
  renderLearn();
}

// AI Hikaye Üretici
let currentStory = "";
let selectedStoryLevel = "intermediate"; // Varsayılan seviye

// ══════════════════════════════════════════════════════════
// TOKEN TRACKER SYSTEM - API KEY BAZLI
// ══════════════════════════════════════════════════════════
