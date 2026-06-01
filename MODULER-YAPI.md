# WordMode — Modüler Yapı

`app.js` (35.988 satır, tek dosya) **39 modüle** bölündü. Kod birebir korundu; birleştirildiğinde orijinalle byte-byte aynıdır.

## Yükleme sırası (index.html içinde bu sırayla yüklenir)

| # | Modül | Satır | İçerik |
|---|-------|------:|--------|
| 1 | `js/modules/core-bootstrap.js` | 656 | Açılış yamaları, güvenlik/performans, standalone telaffuz init |
| 2 | `js/modules/config.js` | 449 | PROMPTS/GROQ ayarları, quiz sayısı, debug bayrağı |
| 3 | `js/modules/state.js` | 515 | Global durum (state) değişkenleri |
| 4 | `js/modules/storage.js` | 747 | localStorage/IndexedDB, WMStore, sıkıştırma, kota, bellek izleme |
| 5 | `js/modules/navigation.js` | 591 | showScreen, utils, ileri/geri navigasyon |
| 6 | `js/modules/user-profile.js` | 800 | Kullanıcı profili ve AI kişiselleştirme |
| 7 | `js/modules/words-render.js` | 1467 | Kelime vurgulama, tıklanabilir kelime, markLearned |
| 8 | `js/modules/words-detect.js` | 184 | Global kelime algılama, uzun-bas (long press) |
| 9 | `js/modules/session.js` | 268 | Oturum, skor barı, render learn |
| 10 | `js/modules/fileupload.js` | 537 | Dosya yükleme/ayrıştırma, PDF/TXT yükleme |
| 11 | `js/modules/tts.js` | 301 | Metin-okuma (TTS), Google Translate, garantili durdurma |
| 12 | `js/modules/ai-core.js` | 731 | Token tracker, dinamik AI API, hata/retry, token ayarları |
| 13 | `js/modules/ai-chat.js` | 855 | Groq chat + çoklu anahtar rotasyonu |
| 14 | `js/modules/ai-features.js` | 3261 | Telaffuz koçu, ses klonlama, bağlam analizi, konuşma simülasyonu/partneri, shadowing, accent coach, cümle düzeltici |
| 15 | `js/modules/learned-words.js` | 354 | Öğrenilen kelimeler sistemi |
| 16 | `js/modules/quiz.js` | 829 | Quiz, flashcard, done, konuşma tanıma, cümle görseli, tab |
| 17 | `js/modules/sentence-mode.js` | 294 | Cümle modu, harf modu |
| 18 | `js/modules/sentence-features.js` | 338 | Özellik 1-7 (bağlam cümleleri, spelling, el yazısı vb.) |
| 19 | `js/modules/grammar.js` | 321 | Gramer rehberi ve ekranı |
| 20 | `js/modules/video.js` | 91 | Video öğrenme |
| 21 | `js/modules/podcast.js` | 766 | Podcast öğrenme sistemi |
| 22 | `js/modules/stats.js` | 80 | İstatistik ve günlük takip |
| 23 | `js/modules/dashboard.js` | 2015 | Analitik dashboard, gece tekrar, kelime şarkısı, çoklu liste, bulut yedek |
| 24 | `js/modules/word-graph.js` | 1520 | Kelime ilişki grafiği (D3) |
| 25 | `js/modules/prompt-editor.js` | 489 | Prompt editör sistemi |
| 26 | `js/modules/reminder.js` | 233 | Hatırlatma sistemi |
| 27 | `js/modules/notifications.js` | 369 | Bildirim handler (SW ile iletişim) |
| 28 | `js/modules/ocr.js` | 95 | Kamera OCR |
| 29 | `js/modules/camera-coach.js` | 3409 | Kamera koçu (ses kaydı, telaffuz puanı, dalga, ghost overlay) |
| 30 | `js/modules/context-teacher.js` | 5343 | AI bağlam öğretmeni + kelime aile ağacı (en büyük modül) |
| 31 | `js/modules/sentence-family.js` | 434 | Cümle ailesi prompt editörü (WM v33) |
| 32 | `js/modules/dictionary.js` | 906 | Sözlük hazırlayıcı, bootstrap, veri klasörü |
| 33 | `js/modules/ask-ai.js` | 103 | Yapay zekaya sor (serbest prompt) |
| 34 | `js/modules/misc-features.js` | 563 | Swipe, streak/rozet, dinleme testi, zayıf nokta |
| 35 | `js/modules/screens-init.js` | 438 | Ekran initleri, dark mode, challenge, motivasyon |
| 36 | `js/modules/backup.js` | 1731 | Manuel/otomatik yedekleme, Google Drive, prompt yedek/geri yükleme |
| 37 | `js/modules/pwa.js` | 84 | PWA desteği (manifest & SW kaydı) |
| 38 | `js/modules/app-init.js` | 469 | Sayfa yükleme initleri, API key yükleme, app logic |
| 39 | `js/modules/nextgen.js` | 3353 | Next-gen modüller (genişletme bloğu) |

**Toplam:** 35989 satır, 39 dosya.

## Neden bu sıra önemli?

Modüller ES module değil; hepsi **global scope** paylaşır (eski `app.js` gibi). Fonksiyon bildirimleri hoisting ile çalışır, ama birkaç modül yüklenir yüklenmez (top-level) bir fonksiyon çağırır. Bu çağrıların hepsi kendi modülü içinde tanımlı olduğu doğrulandı, dolayısıyla sıra güvenli. Yine de index.html'deki script sırasını **değiştirme** — bağımlılık dostu sırada (config/state/storage önce) dizildi.

## Yeni özellik nasıl eklenir?

1. İlgili modül dosyasını aç (ör. quiz özelliği → `js/modules/quiz.js`). Artık 36 bin satır değil, 100-3000 satırlık bir dosyayla çalışırsın.
2. Tamamen yeni bir alan için `js/modules/yeni-ozellik.js` oluştur, sonra index.html'deki modül listesine ekle (genelde `nextgen`den önce).
3. Fonksiyonları yine global tanımla (`function ad(){}`) — diğer modüller ve HTML'deki `onclick`'ler erişebilsin.

## Sonraki adımlar (opsiyonel)

- **646 inline `onclick`** hâlâ HTML'de. İleride event delegation'a geçilirse HTML/JS bağı kopar ve gerçek modül sistemine (import/export) geçiş mümkün olur.
- `sw.js` cache listesindeki yollar (`./js/app.js`) artık geçersiz — offline çalışacaksa modül yolları eklenmeli.
