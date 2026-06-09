# YZ — Kod Gerektiren Talepler (Sorgu Motoruyla Çözülemeyenler)

Kendime sorduğum 100+ sorudan 30 tanesi mevcut tek-tablo sorgu motoruyla çözülemiyor.
Bunlar gelecekte programa **özel araç** olarak eklenmeli. Kategorilere ayırdım:

## Çoklu tablo karşılaştırması (en öncelikli)
- **Kullanıcısı olmayan roller** — roles ∖ users.roles karşılaştırması
- **Hiç görevi olmayan kullanıcılar** — users ∖ tasks.assigneeId
- **Hiç talep açmamış kullanıcılar** — users ∖ instances.ownerId
- **Görevi olmayan ama açık talebi olan kullanıcılar** — iki tablo kesişimi
- **Hangi rol hiç talep açmamış** — rol+kullanıcı+talep üçlü

## İsim çözme (id yerine ad gösterme)
- **En uzun süredir bekleyen 5 talep gün cinsinden** — şu an - createdAt hesabı + isim çözme
- **Bir rolün hangi kullanıcılarda olduğu + isimleri** — rol id->ad ve user eşleme
- **En yüklü 3 kişi isimleriyle** — assigneeId->name + sıralama
- **Kullanıcı isimleriyle görev yükü tablosu** — assigneeId->name

## Tarih/zaman hesabı
- **Bu hafta açılan talep sayısı** — tarih: şimdi-7gün hesabı
- **Bu ay açılan talepler** — ay başı epoch hesabı
- **Bugün açılan talepler** — gün başı epoch hesabı
- **Son 24 saatteki görevler** — tarih matematiği
- **Ortalama talep tamamlanma süresi** — createdAt + bitiş farkı, ortalama
- **Geç kalan talepler N günden eski** — tarih eşiği, gecikenTalepler aracı var
- **Bir süreçteki ortalama bekleme süresi** — tarih hesabı + ortalama
- **En aktif gün/saat** — createdAt gruplama+tarih parse
- **Geçen aya göre talep artışı** — iki tarih aralığı karşılaştırma
- **SLA aşan talepler** — eşik + tarih hesabı

## Hesaplama / oran
- **Boştaki (görevsiz) kişilere iş dağıt önerisi** — analiz + iki tablo
- **Bir kullanıcının kaç rolü var** — dizi uzunluğu sayımı
- **Görev tamamlama oranı (kişi bazlı)** — open/done oranı hesabı
- **Talep başına ortalama görev sayısı** — iki tablo + bölme
- **Departman (rol) bazlı iş yükü** — rol->kullanıcı->görev zinciri
- **Boşta kapasitesi olan ekip** — görevsiz kullanıcı analizi

## Çoklu koşul / özel
- **Ahmet ile Mehmet görev karşılaştırması** — iki kişiyi yan yana sayma
- **İzinde olan kullanıcılar bugün** — absences alanı sorgulanamıyor, özel araç var
- **Aynı anda hem yönetici hem işçi olanlar** — dizi içinde çoklu koşul

## Diğer
- **Süreç adıyla talep sayısı (defId yerine ad)** — defId->name çevirisi gerekli sayımda
- **Kişi adıyla görev listesi (id yerine ad)** — assigneeId->name eşleme

## Önerilen öncelik
1. **Çoklu tablo araçları** (kullanılmayan roller, görevsiz kullanıcılar) — kuyruktan da gelen gerçek ihtiyaç.
2. **İsim çözme** — id yerine ad göstermek her sorguda okunabilirliği artırır.
3. **Tarih hesabı** — "bu ay/hafta" çok sık sorulur, model tarih matematiğinde hata yapıyor.

Bu araçlar HTML koduna `AI_TOOLS` içine eklenir (kataloğa değil). Hazır olduğunda söyle, ekleyeyim.