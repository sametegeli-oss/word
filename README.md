# WordMode — Cümle Tabanlı Koç v21

Bu sürüm cümle tabanlı çalışma sisteminin üstüne gelişmiş koç özellikleri ekler.

## Ana veri yapısı
`word | translation | phonetic | sentence | sentenceTr | highlights | sentenceLevel | grammarStructure`

Ana öğrenme birimi **sentence** alanıdır. `word` yalnızca hedef kelime/etiket olarak kullanılır.

## v21 eklenenler
- Cümle Ailesi Sistemi
- Gramer Haritası
- Seviye Haritası
- Konuşmada otomatik gerçek kullanım tespiti
- Günlük görev sistemi
- Unutma riski haritası
- Telaffuz skorunu cümleye bağlama yardımcısı
- Son 30 gün raporu

## Kurulum
Klasörü GitHub Pages repo köküne yükleyin. Ana dosya `index.html`.


## v23
- Büyük listeler artık localStorage’a yazılmaz; IndexedDB kullanılır.
- Eski büyük localStorage kayıtları taşınıp temizlenir.
- multiList_words / lastFileData kota hataları giderildi.
- Liste istatistiklerinde NaN düzeltildi.
