/* ════════════════════════════════════════════════════════════════
   WordMode — modül: video.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

const videoDatabase = {
  beginner: [
    { id: 'RpXg3LwxgqU', title: 'Basic English Conversation', description: 'Learn everyday English phrases', keywords: ['hello', 'goodbye', 'thank you'], duration: '5:30', channel: 'English Class' },
    { id: 'MvvPy9eumDc', title: 'English Pronunciation', description: 'Practice common sounds', keywords: ['pronunciation', 'practice'], duration: '8:00', channel: 'Speak English' }
  ],
  intermediate: [
    { id: 'dQw4w9WgXcQ', title: 'Business English', description: 'Professional communication', keywords: ['business', 'meeting', 'email'], duration: '10:00', channel: 'Business English' }
  ],
  advanced: [
    { id: 'jNQXAC9IVRw', title: 'Advanced Grammar', description: 'Complex structures', keywords: ['grammar', 'advanced'], duration: '15:00', channel: 'English Expert' }
  ]
};

let currentVideo = null;

function loadVideos(level) {
  const videos = videoDatabase[level] || [];
  
  document.querySelectorAll('[data-vlevel]').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.vlevel === level) btn.classList.add('active');
  });
  
  const html = videos.map(video => `
    <div class="card" onclick="playVideo('${video.id}', '${level}')" style="cursor:pointer">
      <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" style="width:100%;border-radius:8px;margin-bottom:12px">
      <h3>${video.title}</h3>
      <p style="color:var(--muted);font-size:13px">${video.description}</p>
      <div style="color:var(--muted);font-size:12px">📺 ${video.channel} • ${video.duration}</div>
    </div>
  `).join('');
  
  document.getElementById('videosList').innerHTML = html || '<div class="card">Yakında videolar eklenecek!</div>';
}

function playVideo(videoId, level) {
  const videos = videoDatabase[level];
  currentVideo = videos.find(v => v.id === videoId);
  if (!currentVideo) return;
  
  document.getElementById('youtubePlayer').src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  document.getElementById('videoTitle').textContent = currentVideo.title;
  document.getElementById('videoDescription').textContent = currentVideo.description;
  document.getElementById('videoPlayerModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeVideoPlayer() {
  document.getElementById('videoPlayerModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('youtubePlayer').src = '';
}

function extractVideoWords() {
  if (!currentVideo) return;
  const words = currentVideo.keywords;
  const wordsHtml = words.map(word => 
    `<div style="background:var(--green);color:#fff;padding:8px 16px;border-radius:20px;cursor:pointer;font-weight:700" onclick="explainVideoWord('${word}')">${word}</div>`
  ).join('');
  
  document.getElementById('videoWords').innerHTML = wordsHtml;
  document.getElementById('videoWordsSection').style.display = 'block';
  showToast('✅ Kelimeler Çıkarıldı', `${words.length} kelime bulundu`);
}

function explainVideoWord(word) {
  showScreen('sc-teacher');
  setTimeout(() => {
    const teacherInput = document.getElementById('teacherInput');
    if (teacherInput) {
      teacherInput.value = `"${word}" kelimesini açıkla`;
      sendTeacher();
    }
  }, 500);
}

async function askAboutVideo() {
  if (!currentVideo) return;
  showScreen('sc-teacher');
  setTimeout(() => {
    const teacherInput = document.getElementById('teacherInput');
    if (teacherInput) {
      teacherInput.value = `"${currentVideo.title}" videosu hakkında bilgi ver`;
      sendTeacher();
    }
  }, 500);
}

// ══════════════════════════════════════════════════════════
// DEBUG MODE (Console log'ları açmak için true yap)
// ══════════════════════════════════════════════════════════
