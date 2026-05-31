# WordMode v17 — AI Senaryodan Cümle Listesi Fix

Bu sürümde Konuşma Simülasyonu içindeki “Seçilen Senaryodan Çalışma Listesi Oluştur” bölümü kelime listesi yerine cümle tabanlı liste üretir.

Üretilen/veri şeması:
`word | translation | phonetic | sentence | sentenceTr | highlights | sentenceLevel | grammarStructure`

Oluşan liste otomatik aktif liste yapılır ve program kapatılıp açıldığında boş gelmeden yeniden yüklenir.


## v18 Seviye & Gramer Çalışma Sistemi
- sentenceLevel alanına göre çalışma filtresi eklendi.
- grammarStructure alanına göre çalışma filtresi eklendi.
- Liste ekranından seçilen seviye/gramer ile doğrudan çalışma oturumu başlatılır.
- Ana veri yapısı cümle tabanlıdır; word sadece hedef kelime etiketi olarak kalır.


## v19 Bugün Çalış / Akıllı Koç
- sentenceLevel + grammarStructure verilerine göre en zayıf çalışma alanını otomatik bulur.
- Cümle bazlı sentenceStatus kayıtlarını okur: yeni, tekrar bekleyen, kullanılan ve otomatikleşen cümleleri dikkate alır.
- Liste ekranında “Bugün Çalış” paneli gösterir.
- Tek tıkla önerilen seviye + gramer oturumunu başlatır.
- İstatistik ekranında küçük günlük çalışma kartı gösterir.

## v20 fix
- sentenceLevel ve grammarStructure Excel'den okunur ve kalıcı saklanır.
- Eski kayıtlarda boşsa cümleden otomatik tahmin edilir.
- Seviye & Gramer dropdown seçenekleri runtime/aktif liste değişiminden sonra yeniden oluşturulur.
