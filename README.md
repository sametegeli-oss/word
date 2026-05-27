# WordMode Production Modular Build

GitHub Pages için modüler paket.

## Dosya Yapısı
- `index.html` ana giriş
- `css/style.css` tüm stiller
- `js/app.js` tüm JavaScript modülleri
- `data/sozluk.json` kişisel sözlük verisi
- `data/firatkaya_simple.json` geniş sözlük verisi varsa burada durur

## GitHub'a Yükleme
Bu klasörün içindeki dosyaları repo köküne yükleyin.
Ana dosya adı `index.html` olarak hazırdır.

## Önemli
Dosyayı `file://` ile değil GitHub Pages veya küçük local server ile açmak daha doğru olur:

```bash
python -m http.server 8000
```

Sonra:
`http://localhost:8000`
