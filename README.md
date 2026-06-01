# Sentence Mode v1

Bu paket, eski Word Mode işlevlerini bozmadan cümle tabanlı yapıya geçiş için hazırlandı.

## Yüklenecek dosyalar

Repo köküne `index.html` dosyasını koyun. `js` klasöründeki üç dosyayı birlikte yükleyin:

- `js/legacy-app.js` — eski büyük uygulama kodu, aynen korunur
- `js/sentence-mode-core.js` — cümle tabanlı güvenli köprü katmanı
- `js/app.js` — küçük başlatıcı

## Neden böyle?

Eski `app.js` çok büyüdüğü ve çok sayıda yama içerdiği için doğrudan silinmedi. Önce güvenli geçiş yapıldı. Bu sürümde eski fonksiyonlar korunur, cümle tabanlı yeni fonksiyonlar tek bir köprü katmanından yönetilir.

## Düzeltilen kritik sorunlar

- `index.html` içindeki `missing ) after argument list` hatası düzeltildi.
- `navNextWord`, `navPrevWord`, `goToWord`, `updateWordCounter` global güvenli hale getirildi.
- `highlights` metin/liste/boş gelse de hata vermeyecek hale getirildi.
- Aktif liste başlığının cümleyle değişmesi engellendi.
- Öğrenme/SRS ana mantığı cümle anahtarı üzerinden çalışacak şekilde köprü katmanı eklendi.

## Sonraki adım

Bu geçiş sürümü stabil çalışınca, `legacy-app.js` parçalanarak gerçek modüllere ayrılabilir:

- storage.js
- sentence-list.js
- sentence-screen.js
- sentence-srs.js
- sentence-family.js
- books.js
- ai.js
- ui.js
