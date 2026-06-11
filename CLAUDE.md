# Proje: Sentence Mode (İngilizce öğrenme PWA)

## Önemli dosyalar
- index.html — ana uygulama, tüm ekranlar burada (~4400 satır)
- yol.html — ayrı sayfa (Dil Haritası/sözlük), kendi inline stilleri var
- css/style.css — tüm stiller; en sonda "PRO UI LAYER" bloğu var
- js/fixes.js — sözlük motoru (WM_lookupDict) ve düzeltmeler
- js/legacy-app.js — 3.2 MB, ÇOK BÜYÜK: asla tamamını okuma, grep/arama kullan
- data/sozluk.json — sözlük; alanlar: "Kelime", "anlam1", "anlam2", "anlam3"

## Kurallar
- Düzenlemeleri cerrahi yap; tüm dosyayı yeniden yazma.
- Büyük dosyalarda önce ara (grep), sonra sadece ilgili satırları oku.
- Emoji yerine index.html body başındaki SVG sprite ikonlarını kullan (#i-book, #i-mic, #i-chart, #i-cog ...).
- Türkçe açıkla.
