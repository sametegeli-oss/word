/* ════════════════════════════════════════════════════════════════
   WordMode — modül: grammar.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const grammarDatabase = [
  {
    id: 'present-simple',
    title: 'Present Simple',
    category: 'tenses',
    level: 'Beginner',
    description: `Present Simple, alışkanlıklar ve genel gerçekleri anlatır.<br><br><strong>Yapısı:</strong> Subject + V1 (+s/es 3. tekil şahıs)<br><strong>Kullanım:</strong> Alışkanlıklar, genel gerçekler`,
    examples: [
      { en: 'I play tennis every weekend.', tr: 'Her hafta sonu tenis oynarım.' },
      { en: 'She works at a bank.', tr: 'O bir bankada çalışır.' }
    ]
  },
  {
    id: 'present-continuous',
    title: 'Present Continuous',
    category: 'tenses',
    level: 'Beginner',
    description: `Şu an devam eden eylemler.<br><br><strong>Yapısı:</strong> am/is/are + V-ing<br><strong>Kullanım:</strong> Şu an olan, geçici durumlar`,
    examples: [
      { en: 'I am reading a book now.', tr: 'Şu an kitap okuyorum.' },
      { en: 'They are playing football.', tr: 'Futbol oynuyorlar.' }
    ]
  },
  {
    id: 'past-simple',
    title: 'Past Simple',
    category: 'tenses',
    level: 'Beginner',
    description: `Geçmişte tamamlanmış eylemler.<br><br><strong>Yapısı:</strong> Subject + V2<br><strong>Kullanım:</strong> Geçmiş olaylar`,
    examples: [
      { en: 'I watched a movie yesterday.', tr: 'Dün film izledim.' },
      { en: 'She didn\'t go to work.', tr: 'İşe gitmedi.' }
    ]
  },
  {
    id: 'prepositions-time',
    title: 'Prepositions of Time',
    category: 'prepositions',
    level: 'Beginner',
    description: `Zaman edatları.<br><br><strong>IN:</strong> Aylar, yıllar (in January)<br><strong>ON:</strong> Günler (on Monday)<br><strong>AT:</strong> Saatler (at 3 PM)`,
    examples: [
      { en: 'I was born in 1990.', tr: '1990\'da doğdum.' },
      { en: 'The meeting is on Friday.', tr: 'Toplantı Cuma.' }
    ]
  },
  {
    id: 'modal-can',
    title: 'Modal: Can',
    category: 'modals',
    level: 'Beginner',
    description: `Yetenek, izin, olasılık.<br><br><strong>Yapısı:</strong> can + V1<br><strong>Kullanım:</strong> I can swim (yetenek)`,
    examples: [
      { en: 'I can speak three languages.', tr: 'Üç dil konuşabilirim.' },
      { en: 'Can you help me?', tr: 'Yardım eder misin?' }
    ]
  }
];

function initGrammar() {
  renderGrammarTopics('all');
}

function renderGrammarTopics(category) {
  const container = document.getElementById('grammarTopicsList');
  if (!container) return;
  
  const filtered = category === 'all' ? grammarDatabase : grammarDatabase.filter(t => t.category === category);
  
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.cat === category) btn.classList.add('active');
  });
  
  const html = filtered.map(topic => `
    <div class="card" onclick="showGrammarDetail('${topic.id}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between">
        <div>
          <h3 style="color:var(--purple)">${topic.title}</h3>
          <div style="color:var(--muted);font-size:13px">${topic.description.split('<br>')[0].substring(0, 80)}...</div>
        </div>
        <span class="level-chip" style="background:var(--blue);color:#fff">${topic.level}</span>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

function filterGrammar(category) {
  renderGrammarTopics(category);
}

function showGrammarDetail(id) {
  const topic = grammarDatabase.find(t => t.id === id);
  if (!topic) return;
  
  document.getElementById('grammarDetailTitle').textContent = topic.title;
  document.getElementById('grammarDetailContent').innerHTML = topic.description;
  
  const examplesHtml = topic.examples.map(ex => `
    <div style="margin-bottom:12px;padding:12px;background:var(--bg2);border-radius:8px;border-left:4px solid var(--green)">
      <div style="font-weight:700">"${ex.en}"</div>
      <div style="color:var(--muted)">${ex.tr}</div>
    </div>
  `).join('');
  
  document.getElementById('grammarExamples').innerHTML = examplesHtml;
  document.getElementById('grammarDetailPanel').style.display = 'block';
}

async function practiceGrammar() {
  showScreen('sc-teacher');
  const title = document.getElementById('grammarDetailTitle').textContent;
  setTimeout(() => {
    const teacherInput = document.getElementById('teacherInput');
    if (teacherInput) {
      teacherInput.value = `"${title}" konusuyla pratik yapmak istiyorum`;
      sendTeacher();
    }
  }, 500);
}

// ══════════════════════════════════════════════════════════
// VIDEO LEARNING
// ══════════════════════════════════════════════════════════
const GRAMMAR_TOPICS = {
  a1: [
    "Present Simple (Geniş Zaman)",
    "To Be (am/is/are)",
    "Personal Pronouns (Ben, Sen...)",
    "Articles (a/an/the)",
    "Plural Nouns (Çoğul)",
    "There is/There are",
    "This/That/These/Those",
    "Possessive Adjectives (my, your...)",
    "Can/Can't (Yetenek)",
    "Simple Commands (Emir Cümleleri)",
    "Prepositions of Place (in, on, at)",
    "Question Words (What, Where, Who)",
    "Have/Has Got",
    "Some/Any",
    "How much/How many"
  ],
  a2: [
    "Past Simple (Geçmiş Zaman)",
    "Future (will/going to)",
    "Present Continuous (Şimdiki Zaman)",
    "Past Continuous",
    "Comparatives & Superlatives",
    "Should/Shouldn't (Tavsiye)",
    "Must/Mustn't (Zorunluluk)",
    "Countable/Uncountable Nouns",
    "Adverbs of Frequency (always, never...)",
    "Present Perfect (temel)",
    "Too/Enough",
    "Both/Either/Neither",
    "Reflexive Pronouns (myself, yourself...)",
    "Imperative (Let's...)",
    "Would like"
  ],
  b1: [
    "Present Perfect vs Past Simple",
    "Present Perfect Continuous",
    "Modal Verbs (can, could, may, might)",
    "Conditional Type 1 (If I study...)",
    "Conditional Type 2 (If I were...)",
    "Used to / Be used to",
    "Passive Voice (Edilgen Çatı) - Temel",
    "Relative Clauses (who, which, that)",
    "Reported Speech - Temel",
    "Question Tags (isn't it?, don't you?)",
    "So/Such/Too/Enough",
    "Make vs Do",
    "Say vs Tell",
    "Like/Would like/Look like",
    "Gerunds & Infinitives"
  ],
  b2: [
    "Past Perfect (Geçmişin geçmişi)",
    "Past Perfect Continuous",
    "Conditional Type 3 (If I had known...)",
    "Mixed Conditionals",
    "Reported Speech - İleri",
    "Passive Voice - İleri",
    "Causative (have/get something done)",
    "Wish/If only",
    "Inversion",
    "Subjunctive Mood",
    "Cleft Sentences (It is... that)",
    "Participle Clauses",
    "Advanced Relative Clauses",
    "Linking Words & Discourse Markers",
    "Emphatic Structures"
  ],
  c1: [
    "Advanced Conditionals & Mixed Types",
    "Sophisticated Passive Structures",
    "Participle Clauses (Advanced)",
    "Nominalization",
    "Fronting & Inversion",
    "Ellipsis & Substitution",
    "Cleft Sentences (Advanced)",
    "Discourse Markers",
    "Advanced Modal Verbs (nuances)",
    "Hedging Language",
    "Cohesion & Coherence",
    "Register & Formality",
    "Complex Noun Phrases",
    "Academic Writing Structures",
    "Reduced Adverb Clauses"
  ],
  c2: [
    "Sophisticated Inversion Patterns",
    "Advanced Participle Constructions",
    "Subjunctive in Formal Contexts",
    "Arcane & Literary Structures",
    "Nuanced Modal Combinations",
    "Complex Hypothetical Structures",
    "Advanced Cohesive Devices",
    "Stylistic Variations",
    "Rhetorical Devices",
    "Fine-grained Aspect & Tense",
    "Evaluative Language",
    "Metadiscourse Markers",
    "Academic Hedging & Boosting",
    "Pragmatic Competence",
    "Native-like Idiomatic Structures"
  ]
};

function showGrammarLevel(level) {
  // Aktif butonu değiştir
  document.querySelectorAll('[data-glevel]').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelector('[data-glevel="' + level + '"]').classList.add('active');
  
  const topics = GRAMMAR_TOPICS[level] || GRAMMAR_TOPICS.b1;
  const levelNames = {
    a1: 'A1 - Başlangıç',
    a2: 'A2 - Temel', 
    b1: 'B1 - Orta',
    b2: 'B2 - Orta-İleri',
    c1: 'C1 - İleri',
    c2: 'C2 - Profesyonel'
  };
  
  let html = '<div class="card"><div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px">';
  html += '📚 ' + levelNames[level] + ' (' + topics.length + ' Konu)</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  
  topics.forEach(function(topic, index) {
    html += '<div style="background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;transition:all 0.2s" ';
    html += 'onclick="learnGrammarTopic(\'' + level + '\', ' + index + ')" ';
    html += 'onmouseenter="this.style.borderColor=\'var(--purple)\';this.style.transform=\'translateX(4px)\'" ';
    html += 'onmouseleave="this.style.borderColor=\'var(--border)\';this.style.transform=\'translateX(0)\'">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<div style="font-size:20px;width:30px;text-align:center">📖</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-size:14px;font-weight:800;color:var(--text)">' + topic + '</div>';
    html += '<div style="font-size:11px;color:var(--muted);margin-top:2px">Konu ' + (index + 1) + ' / ' + topics.length + '</div>';
    html += '</div>';
    html += '<div style="color:var(--purple);font-size:18px">→</div>';
    html += '</div></div>';
  });
  
  html += '</div></div>';
  document.getElementById('grammarTopicsList').innerHTML = html;
}

function learnGrammarTopic(level, index) {
  const topics = GRAMMAR_TOPICS[level];
  const topic = topics[index];
  
  // AI Öğretmenim ekranına geç
  showScreen('sc-teacher');
  
  // Ekran değişimi için kısa bekleme
  setTimeout(function() {
    // Gramer konusu için özel mesaj
    const grammarPrompt = "🎓 Gramer Konusu: " + topic + "\n\nSeviye: " + level.toUpperCase() + "\n\n" +
      "Bu gramer konusunu bana öğret. Şu formatta açıkla:\n\n" +
      "1️⃣ TANIM: Konu ne işe yarar, ne zaman kullanılır\n" +
      "2️⃣ YAPISI: Gramer yapısı/formül\n" +
      "3️⃣ ÖRNEKLER: 5-6 örnek cümle (İngilizce + Türkçe)\n" +
      "4️⃣ DİKKAT: Sık yapılan hatalar\n" +
      "5️⃣ İPUÇLARI: Hatırlatıcı püf noktaları\n\n" +
      "Açıklama sonunda bana 3 alıştırma sorusu sor.";
    
    // Chat input'a yaz ve gönder
    const inputEl = document.getElementById('teacherInput');
    if (inputEl) {
      inputEl.value = grammarPrompt;
      // Otomatik gönder
      sendTeacherMsg();
    }
  }, 300);
}

// Gramer ekranı açıldığında A1 seviyesini göster
if (document.getElementById('sc-grammar')) {
  showGrammarLevel('a1');
}

console.log("✅ Özellik 8-16 yüklendi!");




/* ===== extracted script block ===== */


// Inline Service Worker
// Service Worker disabled - PWA için gerekirse manifest.json ile aktif edilebilir
// if ('serviceWorker' in navigator) { ... }


// ══════════════════════════════════════════════════════════
// PROMPT EDITOR SYSTEM
// ══════════════════════════════════════════════════════════

