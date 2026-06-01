/* ════════════════════════════════════════════════════════════════
   WordMode — modül: reminder.js
   Bu dosya app.js'ten otomatik bölündü. Kod birebir korunmuştur.
   Yükleme sırası index.html içinde tanımlıdır (global scope).
   ════════════════════════════════════════════════════════════════ */

function initReminder(){
  loadReminderSettings();
  updateNotifStatus();
  scheduleReminder();
  // SRS kontrolü her 5 dakikada bir
  setInterval(checkSRSReminder, 5 * 60 * 1000);
}

function updateNotifStatus(){
  const el = document.getElementById('notifStatus');
  const btn = document.getElementById('notifPermBtn');
  if(!el) return;
  if(!('Notification' in window)){
    el.innerHTML = '<span style="color:var(--red)">❌ Tarayıcınız bildirimleri desteklemiyor</span>';
    if(btn) btn.style.display = 'none';
    return;
  }
  // Her zaman güncel izin durumunu oku
  const perm = Notification.permission;
  if(perm === 'granted'){
    el.innerHTML = '<span style="color:var(--green)">✅ Bildirim izni verildi</span>';
    if(btn) btn.style.display = 'none';
  } else if(perm === 'denied'){
    el.innerHTML = '<span style="color:var(--red)">❌ İzin reddedildi — tarayıcı site ayarlarından açın</span>';
    if(btn) btn.style.display = 'none';
  } else {
    el.innerHTML = '<span style="color:var(--orange)">⏳ Bildirim izni verilmedi</span>';
    if(btn) btn.style.display = '';
  }
}

async function requestNotifPermission(){
  if(!('Notification' in window)){
    showToast('❌ Desteklenmiyor', 'Tarayıcınız bildirim desteklemiyor');
    return false;
  }
  if(Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  updateNotifStatus();
  if(permission === 'granted'){
    showToast('✅ Bildirimler Aktif!', 'Artık hatırlatmalar alacaksınız');
    loadReminderSettings();
    updateToggleUI();
    scheduleReminder();
    const btn = document.getElementById('notifPermBtn');
    if(btn) btn.style.display = 'none';
    return true;
  } else {
    showToast('⚠️ Bildirim Engellendi', 'Ayarlardan izin verebilirsiniz');
    return false;
  }
}

function saveReminderSettings(){
  const settings = {
    dailyActive: document.getElementById('dailyReminderToggle')?.checked || false,
    time: document.getElementById('reminderTime')?.value || '09:00',
    msg: document.getElementById('reminderMsg')?.value || '📚 Bugün kelime çalışma zamanı!',
    srsActive: document.getElementById('srsReminderToggle')?.checked || false,
    savedAt: Date.now()
  };
  localStorage.setItem('reminderSettings', JSON.stringify(settings));
  updateToggleUI();
  scheduleReminder();

  // Toggle açıkken izin yoksa kullanıcıyı uyar
  const needsPermission = (settings.dailyActive || settings.srsActive) &&
                          ('Notification' in window) &&
                          Notification.permission !== 'granted';
  if (needsPermission) {
    showToast('⚠️ Bildirim izni yok', 'Ayar kaydedildi ama bildirim gelmez — yukarıdaki "Bildirim İznini Ver" butonuna basın');
  } else {
    showToast('💾 Kaydedildi', 'Hatırlatma ayarları güncellendi');
  }
}

function loadReminderSettings(){
  try {
    const raw = localStorage.getItem('reminderSettings');
    if(!raw) return;
    const s = JSON.parse(raw);
    const toggle = document.getElementById('dailyReminderToggle');
    const timeEl = document.getElementById('reminderTime');
    const msgEl = document.getElementById('reminderMsg');
    const srsToggle = document.getElementById('srsReminderToggle');
    if(toggle) toggle.checked = s.dailyActive || false;
    if(timeEl) timeEl.value = s.time || '09:00';
    if(msgEl) msgEl.value = s.msg || '📚 Bugün kelime çalışma zamanı!';
    if(srsToggle) srsToggle.checked = s.srsActive || false;
    updateToggleUI();
  } catch(e){}
}

function updateToggleUI(){
  // CSS :checked ile hallediyor — JS sadece checked state'i ayarlar
  const raw = localStorage.getItem('reminderSettings');
  if(!raw) return;
  const s = JSON.parse(raw);
  const toggle = document.getElementById('dailyReminderToggle');
  if(toggle) toggle.checked = !!s.dailyActive;
  const srsToggle = document.getElementById('srsReminderToggle');
  if(srsToggle) srsToggle.checked = !!s.srsActive;
}

// ====================== DÜZELTİLMİŞ GÜNLÜK BİLDİRİM ======================
let reminderTimer = null;

function scheduleReminder() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }

  const raw = localStorage.getItem('reminderSettings');
  if (!raw) return;
  
  const settings = JSON.parse(raw);
  if (!settings.dailyActive || Notification.permission !== 'granted') return;

  const [targetHour, targetMinute] = (settings.time || '09:00').split(':').map(Number);

  // Sonraki bildirim zamanını göster
  const target = new Date();
  target.setHours(targetHour, targetMinute, 0, 0);
  if(target <= new Date()) target.setDate(target.getDate() + 1);
  const nextInfo = document.getElementById('reminderNextInfo');
  if(nextInfo) nextInfo.textContent = '⏰ Sonraki: ' + target.toLocaleString('tr-TR');

  function checkAndSendReminder() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayKey = `reminder_sent_${now.getFullYear()}_${now.getMonth()+1}_${now.getDate()}`;

    if (localStorage.getItem(todayKey)) return;

    const isTargetTime = (currentHour === targetHour && currentMinute === targetMinute);
    const justMissed = (currentHour === targetHour && currentMinute > targetMinute && currentMinute <= targetMinute + 10);

    if (isTargetTime || justMissed) {
      localStorage.setItem(todayKey, 'true');

      const message = {
        type: 'SHOW_NOTIFICATION',
        title: '📚 Günlük Kelime Zamanı',
        body: settings.msg || 'Bugün kelime çalışma zamanı! 🌱',
        tag: 'daily-reminder'
      };

      if (false && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
      } else {
        new Notification(message.title, {
          body: message.body,
          icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
          tag: message.tag
        });
      }
      console.log('📢 Günlük bildirim gönderildi:', new Date().toLocaleTimeString());
    }
  }

  reminderTimer = setInterval(checkAndSendReminder, 30 * 1000);
  setTimeout(checkAndSendReminder, 1000);

  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'visible') checkAndSendReminder();
  });
}


function checkSRSReminder(){
  try {
    const raw = localStorage.getItem('reminderSettings');
    if(!raw) return;
    const s = JSON.parse(raw);
    if(!s.srsActive) return;
    if(Notification.permission !== 'granted') return;
    const due = getDueWords();
    if(due.length === 0) return;
    // Aynı gün tekrar bildirim gönderme
    const lastKey = 'srsNotifDate';
    const lastDate = localStorage.getItem(lastKey);
    const today = new Date().toDateString();
    if(lastDate === today) return;
    localStorage.setItem(lastKey, today);
    fireNotification(
      '🔄 Tekrar Zamanı!',
      `${due.length} kelime tekrar seni bekliyor`,
      '🧠'
    );
  } catch(e){}
}

async function fireNotification(title, body){
  if(Notification.permission !== 'granted') return;
  try {
    // Service Worker devre dışı, doğrudan Notification API kullan
    new Notification(title, {
      body: body || '',
      icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/5968/5968890.png',
      tag: 'word-mode',
      renotify: true
    });
  } catch(e){
    console.error('Notification error:', e);
  }
}

async function sendTestNotification(){
  if(Notification.permission !== 'granted'){
    await requestNotifPermission();
    return;
  }
  fireNotification('🧪 Test Bildirimi', 'PWA bildirim sistemi çalışıyor!');
  showToast('📨 Test gönderildi!', 'Bildirimi görüyor musun?');
}

// sc-reminder açılınca yükle
function openReminderScreen(){
  showScreen('sc-reminder');
  loadReminderSettings();
  updateNotifStatus();
  scheduleReminder();
}


// ══════════════════════════════════════════════════════════
// GLOBAL KELIME ALGILAMA FONKSİYONLARI
// ══════════════════════════════════════════════════════════

// sm-word zaten kendi sistemi var, onları atla
