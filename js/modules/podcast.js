/* ════════════════════════════════════════════════════════════════
   WordMode — modül: podcast.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const podcastDatabase = [
  {
    id: 'daily-english-1',
    title: 'Daily English Conversations',
    source: 'Daily English',
    duration: '5:00',
    level: 'Beginner',
    audioUrl: '#',
    transcript: `Welcome to Daily English Conversations!

Today we'll practice everyday conversations that you can use in real life.

Let's start with greetings. When you meet someone, you can say:
"Hi, how are you?"
"I'm good, thanks. How about you?"
"I'm doing well, thank you!"

Now let's practice ordering food:
"Can I have a coffee, please?"
"What size would you like?"
"A medium, please."
"Anything else?"
"No, that's all. Thank you!"

These simple phrases will help you in daily situations. Practice them every day!`,
    keywords: ['greetings', 'conversation', 'ordering', 'daily', 'practice']
  },
  {
    id: 'business-english-1',
    title: 'Business English Essentials',
    source: 'Business English',
    duration: '7:00',
    level: 'Intermediate',
    audioUrl: '#',
    transcript: `Welcome to Business English Essentials!

In today's episode, we'll learn essential phrases for professional communication.

Email Writing:
When writing business emails, always start with a clear subject line. Use phrases like:
"I am writing to inquire about..."
"I would like to follow up on..."
"Thank you for your prompt response."

Meetings:
In meetings, use these professional expressions:
"I'd like to add something..."
"Could you please clarify that point?"
"Let's schedule a follow-up meeting."

Phone Calls:
"May I speak with Mr. Johnson, please?"
"I'm calling regarding the project proposal."
"Could you please hold for a moment?"

Remember, professional communication is about being clear, polite, and respectful.`,
    keywords: ['business', 'professional', 'email', 'meeting', 'communication']
  },
  {
    id: 'science-tech-1',
    title: 'Science & Technology Talk',
    source: 'Tech Talk',
    duration: '8:00',
    level: 'Advanced',
    audioUrl: '#',
    transcript: `Welcome to Science & Technology Talk!

Today's topic: Artificial Intelligence and Machine Learning.

Artificial Intelligence has transformed our world dramatically. From smartphones to autonomous vehicles, AI is everywhere.

Machine learning algorithms can now recognize patterns in data, make predictions, and even create art. Deep learning, a subset of machine learning, uses neural networks inspired by the human brain.

Natural Language Processing enables computers to understand human language. This technology powers virtual assistants like Siri and Alexa.

However, AI also raises ethical concerns. Privacy, bias in algorithms, and job displacement are serious challenges we must address.

The future of AI depends on responsible development. We need regulations that balance innovation with safety and ethics.

Remember: technology is a tool. How we use it determines whether it benefits humanity or creates new problems.`,
    keywords: ['artificial intelligence', 'machine learning', 'technology', 'algorithms', 'innovation']
  },
  {
    id: 'bbc-6min-1',
    title: '6 Minute English - Learning Languages',
    source: 'BBC Learning English',
    duration: '6:00',
    level: 'Intermediate',
    audioUrl: 'https://www.bbc.co.uk/programmes/p0jf9n8q/download',
    transcript: `Welcome to 6 Minute English! Today we're talking about learning languages.

Did you know that learning a new language can actually make your brain stronger? Studies show that bilingual people are better at multitasking and problem-solving.

When you learn a language, you're not just memorizing words. You're understanding culture, thinking differently, and opening doors to new opportunities.

Some experts say the best way to learn is through immersion - surrounding yourself with the language every day. Others recommend focusing on grammar first.

What's your learning style? Do you prefer apps, textbooks, or conversation practice?

Remember: practice makes perfect! Even 10 minutes a day can make a big difference.`,
    keywords: ['artificial intelligence', 'machine learning', 'technology', 'algorithms', 'innovation']
  }
];

let currentPodcast = null;
let extractedPodcastWords = [];

// Podcast listesini göster
// Podcast ekranını aç (ayarlar göster)
function openPodcastScreen() {
  showScreen('sc-podcast');
  // Ayarlar kartını göster, player'ı gizle
  document.getElementById('podcastSettings').style.display = 'block';
  document.getElementById('podcastPlayerCard').style.display = 'none';
}

let selectedPodcastLevel = "A2";
let currentPodcastText = "";
let podcastSpeechRate = 1.0;

function setPodcastLevel(level) {
  selectedPodcastLevel = level;
  document.querySelectorAll('[data-podcast-level]').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelector('[data-podcast-level="' + level + '"]').classList.add('active');
}

// Podcast oluştur
async function generatePodcast() {
  // Seçimleri al
  const topic = document.getElementById('podcastTopic').value;
  const topicText = document.getElementById('podcastTopic').options[document.getElementById('podcastTopic').selectedIndex].text;
  const level = selectedPodcastLevel;
  const model = document.getElementById('podcastAIModel').value;
  
  // Seviye konfigürasyonları
  const levelConfigs = {
    "A1": {
      name: "A1 - Başlangıç",
      wordCount: "200-250",
      speed: 0.75,
      instructions: "Çok basit kelimeler ve kısa cümleler (5-7 kelime). Sadece Present Simple ve Past Simple. Günlük hayat kelimeleri. Her cümle net ve anlaşılır."
    },
    "A2": {
      name: "A2 - Temel",
      wordCount: "250-300",
      speed: 0.85,
      instructions: "Basit kelimeler ve orta uzunlukta cümleler (7-10 kelime). Present, Past, Future kullan. Temel bağlaçlar (and, but, because). Günlük konuşma dili."
    },
    "B1": {
      name: "B1 - Orta",
      wordCount: "300-350",
      speed: 0.9,
      instructions: "Orta seviye kelime haznesi. Farklı zamanları karıştır. Bağlaçlar ve ara cümleler. Akıcı ve doğal konuşma."
    },
    "B2": {
      name: "B2 - Orta-İleri",
      wordCount: "350-400",
      speed: 0.95,
      instructions: "Zengin kelime haznesi. Karmaşık yapılar ve bağlaçlar. Deyimler ve phrasal verbs. Profesyonel ama anlaşılır dil."
    },
    "C1": {
      name: "C1 - İleri",
      wordCount: "400-500",
      speed: 1.0,
      instructions: "İleri seviye kelimeler ve karmaşık cümle yapıları. İdiomatik ifadeler. Nüanslı dil kullanımı. Ana dili İngilizce olan biri gibi konuş."
    }
  };
  
  const config = levelConfigs[level] || levelConfigs["A2"];
  podcastSpeechRate = config.speed;
  
  // Ayarlar kartını gizle, player kartını göster
  document.getElementById('podcastSettings').style.display = 'none';
  document.getElementById('podcastPlayerCard').style.display = 'block';
  
  // Player başlığını güncelle
  document.getElementById('ppTitle').textContent = topicText;
  document.getElementById('ppMeta').textContent = `📊 ${config.name} • 🤖 AI Generated`;
  document.getElementById('transcriptText').innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">⏳</div><p>Podcast oluşturuluyor...</p></div>';
  
  // Custom prompt kullan
  const promptTemplate = getPrompt('podcast');
  const systemPrompt = fillPromptTemplate(promptTemplate.system, {
    levelName: config.name
  });
  
  const userPrompt = fillPromptTemplate(promptTemplate.user, {
    topicText: topicText,
    levelName: config.name,
    wordCount: config.wordCount,
    instructions: config.instructions
  });
  
  try {
    const savedModel = model || 'groq';
    const aiResponse = await callGroqAPI(systemPrompt, userPrompt, 1000);
    const podcastText = String(aiResponse.content || aiResponse);
    currentPodcastText = podcastText;
    
    // Transkripti göster
    document.getElementById('transcriptText').innerHTML = formatAIResponse(highlightEnglishWords(podcastText));
    
    // Ses butonlarını göster
    document.getElementById('btnSpeakPodcast').style.display = 'block';
    document.getElementById('btnStopPodcast').style.display = 'none';
    
    showToast('✅ Podcast Hazır', `${topicText} podcast'i oluşturuldu!`);
    
  } catch(error) {
    document.getElementById('transcriptText').innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:12px">❌</div>
        <p style="color:var(--red)">${error.message}</p>
        <button onclick="resetPodcast()" class="btn btn-ghost" style="margin-top:16px">🔄 Tekrar Dene</button>
      </div>`;
  }
}

// Podcast'i seslendir
function speakPodcast() {
  if (!currentPodcastText) return;
  
  // Buton durumlarını güncelle
  document.getElementById('btnSpeakPodcast').style.display = 'none';
  document.getElementById('btnStopPodcast').style.display = 'block';
  
  // Seslendirme
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentPodcastText);
  utterance.lang = 'en-US';
  utterance.rate = podcastSpeechRate;
  
  // Okuma bittiğinde butonları sıfırla
  utterance.onend = function() {
    document.getElementById('btnSpeakPodcast').style.display = 'block';
    document.getElementById('btnStopPodcast').style.display = 'none';
  };
  
  speechSynthesis.speak(utterance);
}

// Podcast'i durdur
function stopPodcast() {
  speechSynthesis.cancel();
  document.getElementById('btnSpeakPodcast').style.display = 'block';
  document.getElementById('btnStopPodcast').style.display = 'none';
}

// Hız ayarla
function setPodcastSpeed(speed, element) {
  podcastSpeechRate = speed;
  document.querySelectorAll('.speed-chip').forEach(chip => chip.classList.remove('active'));
  element.classList.add('active');
  
  // Eğer şu an okunuyorsa, yeniden başlat
  if (speechSynthesis.speaking) {
    stopPodcast();
    setTimeout(speakPodcast, 100);
  }
}

// Podcast kapat ve yeni oluştur
function resetPodcast() {
  stopPodcast();
  document.getElementById('podcastSettings').style.display = 'block';
  document.getElementById('podcastPlayerCard').style.display = 'none';
  currentPodcastText = "";
}

// Podcast kapat
function closePodcast() {
  resetPodcast();
}

// ESKİ FONKSİYONLAR - Geriye dönük uyumluluk
function loadPodcastList() {
  // Artık kullanılmıyor
  showToast('ℹ️ Bilgi', 'Podcast artık AI ile oluşturuluyor');
}

function initPodcastList() {
  openPodcastScreen();
}

function openPodcast(podcastId) {
  // Eski podcast database sistemi artık kullanılmıyor
  showToast('ℹ️ Bilgi', 'Yeni podcast sistemi kullanılıyor');
}

// Podcast'ten kelimeleri çıkar
function extractWordsFromPodcast() {
  if (!currentPodcast) return;
  
  // B2-C1 seviyesi kelimeler (örnek liste)
  const advancedWords = ['bilingual', 'multitasking', 'immersion', 'algorithm', 'innovation', 
                         'regulation', 'artificial', 'technology', 'genuine', 'approachable',
                         'conversation', 'relationship', 'commute', 'routine', 'potential'];
  
  const transcript = currentPodcast.transcript.toLowerCase();
  extractedPodcastWords = [];
  
  advancedWords.forEach(word => {
    if (transcript.includes(word.toLowerCase())) {
      extractedPodcastWords.push(word);
    }
  });
  
  // Kelime kartlarını göster
  const wordsEl = document.getElementById('extractedWords');
  wordsEl.innerHTML = '';
  
  extractedPodcastWords.forEach(word => {
    const chip = document.createElement('div');
    chip.style.cssText = 'padding:8px 14px;background:var(--green);color:#fff;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s';
    chip.textContent = word;
    chip.onclick = () => explainWord(word, 'extractedWords');
    chip.onmouseover = () => chip.style.transform = 'scale(1.05)';
    chip.onmouseout = () => chip.style.transform = 'scale(1)';
    wordsEl.appendChild(chip);
  });
  
  document.getElementById('extractedWordsSection').style.display = 'block';
  showToast('✅ Kelimeler Çıkarıldı', `${extractedPodcastWords.length} kelime bulundu`);
}

// Podcast'i kütüphaneye ekle
async function addPodcastToLibrary() {
  if (!currentPodcast || extractedPodcastWords.length === 0) {
    showToast('⚠️ Önce Kelimeleri Çıkar', 'Kütüphaneye eklemek için önce kelimeleri çıkarmalısın');
    return;
  }
  
  // Kelimeleri words dizisine ekle
  for (const word of extractedPodcastWords) {
    // Eğer kelime zaten yoksa ekle
    if (!words.some(w => w.word.toLowerCase() === word.toLowerCase())) {
      // AI'dan örnek cümle al
      const prompt = `"${word}" kelimesi için basit bir örnek cümle ver (İngilizce) ve Türkçe çevirisini yaz.
      
Format:
Cümle: [İngilizce cümle]
Türkçe: [Türkçe çeviri]`;
      
      try {
        const response = await callGroqAPI("Sen bir İngilizce öğretmenisin.", prompt);
        const sentenceMatch = response.match(/Cümle:(.+)/i);
        const trMatch = response.match(/Türkçe:(.+)/i);
        
        const sentence = sentenceMatch ? sentenceMatch[1].trim() : `This is an example with ${word}.`;
        const tr = trMatch ? trMatch[1].trim() : `${word} ile örnek cümle`;
        
        words.push({
          word: word,
          tr: 'podcast kelimesi',
          sentence: sentence,
          sentenceTr: tr,
          learned: false,
          source: `Podcast: ${currentPodcast.title}`
        });
      } catch (e) {
        words.push({
          word: word,
          tr: 'podcast kelimesi',
          sentence: `This is an example with ${word}.`,
          sentenceTr: `${word} ile örnek cümle`,
          learned: false,
          source: `Podcast: ${currentPodcast.title}`
        });
      }
    }
  }
  
  saveWordsLocal();
  updateStats();
  showToast('💾 Kütüphaneye Eklendi', `${extractedPodcastWords.length} kelime eklendi`);
}

// Podcast kelimelerini test et
function testPodcastWords() {
  if (!currentPodcast || extractedPodcastWords.length === 0) {
    showToast('⚠️ Önce Kelimeleri Çıkar', 'Test yapmak için önce kelimeleri çıkarmalısın');
    return;
  }
  
  showToast('🎮 Test Hazırlanıyor', 'Challenge mode açılıyor...');
  
  // Challenge mode'u aç (varsa)
  setTimeout(() => {
    showScreen('sc-challenge');
  }, 1000);
}

// Podcast'i kapat
function closePodcast() {
  document.getElementById('podcastContent').style.display = 'none';
  currentPodcast = null;
  extractedPodcastWords = [];
}


function speakStory(){
  if(!currentStory) return;
  
  // Türkçe kısmı çıkar, sadece İngilizce oku
  const englishPart = currentStory.split("Türkçe")[0].trim();
  
  // Buton durumlarını güncelle
  document.getElementById('btnSpeakStory').style.display = 'none';
  document.getElementById('btnStopStory').style.display = 'block';
  
  // Seviyeye göre okuma hızı
  let rate = 0.85; // Varsayılan
  if (selectedStoryLevel === 'beginner') {
    rate = 0.75; // Yavaş
  } else if (selectedStoryLevel === 'advanced') {
    rate = 0.95; // Hızlı
  }
  
  // Seslendirme
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(englishPart);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  
  // Okuma bittiğinde butonları sıfırla
  utterance.onend = function() {
    document.getElementById('btnSpeakStory').style.display = 'block';
    document.getElementById('btnStopStory').style.display = 'none';
  };
  
  speechSynthesis.speak(utterance);
}

function stopStory() {
  // Seslendirmeyi durdur
  speechSynthesis.cancel();
  
  // Buton durumlarını güncelle
  document.getElementById('btnSpeakStory').style.display = 'block';
  document.getElementById('btnStopStory').style.display = 'none';
}

let currentFilter = 'all';

function filterByCategory(category){
  currentFilter = category;
  
  // Aktif butonu güncelle
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Listeyi yeniden render et
  renderWordList();
}

// Virtual scrolling'i güncelle - kategori filtresi ekle
function getFilteredWords(){
  const now = Date.now();
  
  switch(currentFilter){
    case 'learned':
      return allWords.filter(w => learnedSet.has(w.word));
    case 'failed':
      return allWords.filter(w => {
        const st = wordStatus[w.word];
        return st && st.attempts > 0 && st.correct === 0;
      });
    case 'unseen':
      return allWords.filter(w => !wordStatus[w.word]);
    case 'review':
      return allWords.filter(w => {
        const srs = spacedRepetition[w.word];
        return srs && srs.nextReview <= now;
      });
    default:
      return allWords;
  }
}

let currentSearchQuery = '';

function filterWordsBySentence(query) {
  currentSearchQuery = query.toLowerCase().trim();
  renderWordList();
  
  // İstatistikleri ve kontrolleri güncelle
  const filteredWords = getFilteredWords();
  const searchFiltered = currentSearchQuery ? 
    filteredWords.filter(w => {
      const sentence = w.sentence || '';
      return sentence.toLowerCase().includes(currentSearchQuery);
    }) : filteredWords;
  
  const stats = document.getElementById('listStats');
  const controls = document.getElementById('filteredListControls');
  
  if (currentSearchQuery && searchFiltered.length > 0) {
    // Sonuç sayısını göster
    if (stats) {
      stats.innerHTML = `
        <div style="padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:12px;text-align:center">
          <span style="font-size:13px;color:var(--muted)">
            🔍 <span style="color:var(--text);font-weight:700">${searchFiltered.length}</span> sonuç bulundu
          </span>
        </div>
      `;
    }
    
    // Liste oluşturma butonunu göster
    if (controls && !isFilteredMode) {
      controls.style.display = '';
      controls.innerHTML = `
        <div style="display:flex;gap:8px">
          <button onclick="createFilteredWorkList()" style="flex:1;padding:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='translateY(0)'">
            📝 Bu ${searchFiltered.length} Kelimeyle Çalış
          </button>
        </div>
      `;
    }
  } else if (isFilteredMode && filteredWorkList.length > 0) {
    // Filtrelenmiş modda kontroller
    if (stats) {
      stats.innerHTML = `
        <div style="padding:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;color:#fff">
            <div>
              <div style="font-size:14px;font-weight:800;margin-bottom:2px">📝 Filtrelenmiş Liste Modu</div>
              <div style="font-size:12px;opacity:0.9">${filteredWorkList.length} kelime ile çalışıyorsun</div>
            </div>
            <button onclick="cancelFilteredMode()" style="padding:8px 14px;background:rgba(255,255,255,0.2);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:800;cursor:pointer;transition:all 0.2s" onmouseenter="this.style.background='rgba(255,255,255,0.3)'" onmouseleave="this.style.background='rgba(255,255,255,0.2)'">
              ✕ İptal Et
            </button>
          </div>
        </div>
      `;
    }
    if (controls) controls.style.display = 'none';
  } else {
    if (stats) stats.innerHTML = '';
    if (controls) controls.style.display = 'none';
  }
}

function createFilteredWorkList() {
  const filteredWords = getFilteredWords();
  const searchFiltered = currentSearchQuery ? 
    filteredWords.filter(w => {
      const sentence = w.sentence || '';
      return sentence.toLowerCase().includes(currentSearchQuery);
    }) : filteredWords;
  
  if (searchFiltered.length === 0) {
    showToast('⚠️ Hata', 'Filtrelenmiş kelime bulunamadı');
    return;
  }
  
  // Orijinal listeyi SADECE İLK DEFA yedekle
  if (!isFilteredMode && allWords.length > 0) {
    originalAllWords = [...allWords];
  }
  
  // Filtrelenmiş listeyi tam kopyala
  filteredWorkList = searchFiltered.map(w => ({...w}));
  isFilteredMode = true;
  
  // Ana çalışma listelerini değiştir
  allWords = [...filteredWorkList];
  words = [...filteredWorkList];
  idx = 0;
  
  // Göstergeyi güncelle
  updateFilteredModeIndicator();
  
  // Ekranı kapat ve Word ekranına dön
  showScreen('sc-word');
  
  // showWord varsa çağır
  if (typeof showWord === 'function') {
    showWord();
  }
  
  showToast('✅ Liste Hazır', `${filteredWorkList.length} kelime ile çalışma başladı`);
  
  // İstatistikleri güncelle
  filterWordsBySentence('');
}

function cancelFilteredMode() {
  isFilteredMode = false;
  
  // Orijinal listeye dön
  if (originalAllWords.length > 0) {
    allWords = [...originalAllWords];
    words = [...originalAllWords];
  }
  
  filteredWorkList = [];
  idx = 0;
  
  // Göstergeyi gizle
  updateFilteredModeIndicator();
  
  if (typeof showWord === 'function') {
    showWord();
  }
  
  showToast('🔄 Normal Mod', 'Tüm kelimelerle çalışmaya devam');
  
  // Kontrolleri temizle
  const stats = document.getElementById('listStats');
  if (stats) stats.innerHTML = '';
}

function updateFilteredModeIndicator() {
  const indicator = document.getElementById('filteredModeIndicator');
  const count = document.getElementById('filteredModeCount');
  
  if (!indicator) return;
  
  if (isFilteredMode && filteredWorkList.length > 0) {
    indicator.style.display = 'flex';
    if (count) count.textContent = `${filteredWorkList.length} kelime`;
  } else {
    indicator.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// FLASHCARD MODE
// ══════════════════════════════════════════════════════════
let podcastAudio = null;
let currentEpisode = null;
let podcastSpeedRate = 0.75;

// Podcast konu havuzu — her açılışta rastgele seçilir
const PODCAST_TOPICS = [
  {emoji:'🌍', title:'Daily Conversations',     level:'Beginner',     topic:'two friends meeting and talking about their day, weekend plans, and hobbies'},
  {emoji:'💼', title:'Business English',         level:'Intermediate', topic:'a business meeting discussing project updates, deadlines, and team performance'},
  {emoji:'🔬', title:'Science & Tech',           level:'Advanced',     topic:'a podcast about artificial intelligence, its benefits and ethical concerns'},
  {emoji:'✈️', title:'Travel English',           level:'Beginner',     topic:'a tourist asking for directions and help at an airport or train station'},
  {emoji:'🍽️', title:'Food & Restaurants',      level:'Beginner',     topic:'ordering food at a restaurant, asking about the menu, and giving feedback'},
  {emoji:'🏥', title:'Health & Medicine',        level:'Intermediate', topic:'a doctor-patient conversation about symptoms, diagnosis, and treatment'},
  {emoji:'🎓', title:'Academic English',         level:'Advanced',     topic:'a university lecture about climate change and environmental solutions'},
  {emoji:'💰', title:'Money & Finance',          level:'Intermediate', topic:'a financial advisor explaining investment strategies and saving tips'},
  {emoji:'🎬', title:'Movies & Entertainment',   level:'Beginner',     topic:'two people discussing their favorite movies, actors, and TV shows'},
  {emoji:'🌿', title:'Nature & Environment',     level:'Intermediate', topic:'a nature documentary style narration about rainforests and wildlife'},
  {emoji:'🏋️', title:'Health & Fitness',        level:'Beginner',     topic:'a fitness trainer giving advice about exercise routines and healthy habits'},
  {emoji:'📱', title:'Social Media & Internet',  level:'Intermediate', topic:'discussing the impact of social media on society and mental health'},
  {emoji:'🚀', title:'Space Exploration',        level:'Advanced',     topic:'scientists discussing Mars missions and the future of space travel'},
  {emoji:'🎨', title:'Art & Culture',            level:'Intermediate', topic:'an art critic explaining the meaning behind famous paintings and artists'},
  {emoji:'⚽', title:'Sports & Games',           level:'Beginner',     topic:'sports commentators discussing a football match and player performance'},
];

let PODCAST_EPISODES = [];
let podcastGenerating = false;
let podcastLevel = 'B1';

// ESKİ PODCAST SİSTEMİ KALDIRILDI - Artık AI ile oluşturuluyor

function renderDailyTasks() {
  const learned = learnedSet.size;
  const total = allWords.length;
  const dueCount = getDueWords ? getDueWords().length : 0;

  const tasks = [
    { id: 'learn5', icon: '📖', title: '5 yeni kelime öğren', desc: `${Math.min(learned, 5)}/5 tamamlandı`, xp: 25, done: learned >= 5, action: () => switchTab('word') },
    { id: 'review', icon: '🔄', title: 'Tekrar zamanı gelenler', desc: dueCount > 0 ? dueCount + ' kelime bekliyor' : 'Tüm tekrarlar tamam ✓', xp: 30, done: dueCount === 0 && learned > 0, action: () => startDueReview() },
    { id: 'game', icon: '🎮', title: 'Bir oyun oyna', desc: 'Memory, Hız Testi veya Karıştır', xp: 20, done: dailyTasksDone.game, action: () => switchTab('games') },
    { id: 'shadow', icon: '👥', title: 'Shadowing yap', desc: '3 cümle taklit et', xp: 20, done: dailyTasksDone.shadow, action: () => openShadowMode() },
    { id: 'story', icon: '📖', title: 'AI hikaye oku', desc: 'Öğrendiğin kelimelerle hikaye', xp: 15, done: dailyTasksDone.story, action: () => openStoryScreen() },
    { id: 'sleep', icon: '🌙', title: 'Gece tekrarı yap', desc: '10 kelimeyi gece modunda gözden geçir', xp: 15, done: dailyTasksDone.sleep, action: () => startSleepMode() }
  ];

  document.getElementById('dailyTasks').innerHTML = tasks.map(t => `
    <div class="daily-task ${t.done ? 'done' : ''}" onclick="${t.done ? '' : 'doDailyTask(\'' + t.id + '\')'}">
      <div class="dt-icon">${t.icon}</div>
      <div class="dt-body">
        <div class="dt-title">${t.title}</div>
        <div class="dt-desc">${t.desc}</div>
      </div>
      <div class="dt-xp">+${t.xp} XP</div>
      <div class="dt-check">✓</div>
    </div>`).join('');

  // Toplam tamamlanan
  const doneCount = tasks.filter(t => t.done).length;
  if (doneCount === tasks.length) {
    showToast('🏆 Tüm görevler tamam!', 'Bugün mükemmel bir çalışma!');
  }
}

function doDailyTask(taskId) {
  const today = new Date().toISOString().slice(0,10);
  dailyTasksDone[taskId] = true;
  localStorage.setItem('dailyTasks_' + today, JSON.stringify(dailyTasksDone));

  const xpMap = { learn5:25, review:30, game:20, shadow:20, story:15, sleep:15 };
  addXP(xpMap[taskId] || 10, 'Görev tamamlandı!');
  renderDailyTasks();

  // Görevi yap
  const actions = {
    learn5: () => switchTab('word'),
    review: () => startDueReview(),
    game: () => switchTab('games'),
    shadow: () => openShadowMode(),
    story: () => openStoryScreen(),
    sleep: () => startSleepMode()
  };
  if (actions[taskId]) setTimeout(actions[taskId], 300);
}

function checkDueWords() {
  if (!getDueWords) return;
  const due = getDueWords();
  const section = document.getElementById('dailyDueSection');
  if (!section) return;
  if (due.length > 0) {
    section.style.display = '';
    document.getElementById('dailyDueCount').textContent = due.length;
  } else {
    section.style.display = 'none';
  }
}

function startDueReview() {
  if (!getDueWords) return;
  const due = getDueWords();
  if (due.length === 0) { showToast('✅', 'Tüm tekrarlar tamam!'); return; }
  words = due;
  idx = 0;
  switchTab('word');
}

function updateDailyStreak() {
  const today = new Date().toISOString().slice(0,10);
  const lastActive = localStorage.getItem('wm_lastActive');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);

  if (lastActive === today) return; // Zaten güncellendi
  if (lastActive === yesterday) {
    // Seriyi artır
    const streak = parseInt(localStorage.getItem('wm_streak') || '0') + 1;
    localStorage.setItem('wm_streak', streak);
  } else if (lastActive !== today) {
    // Seri kırıldı
    localStorage.setItem('wm_streak', '1');
  }
  localStorage.setItem('wm_lastActive', today);
}

function refreshDailyPlan() {
  initDailyDashboard();
  showToast('🔄', 'Plan güncellendi!');
}

// ══════════════════════════════════════════════════════════
// 📊 ANALİTİK DASHBOARD
// ══════════════════════════════════════════════════════════

// Öğrenme zamanı kaydı
