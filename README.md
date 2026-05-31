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
