FABRİKA AI Dosya Paketi

Bu ZIP gerçek dosyalardan oluşturuldu.

GitHub'a şu isimlerle yükle:

1) index.html
   - Kaynak: fabrika_platform_yz_gt.html
   - Ana uygulama dosyası.

2) sorgular.json
   - Kaynak: sorgular(3).json
   - Kayıtlı sorgular kataloğu.
   - İçindeki gerçek query sayısı: 530

3) intent.json
   - Bu paket içinde gerçek sorgular.json üzerinden üretildi.
   - Intent sayısı: 532
   - Her intent, doğal dil ifadelerini queryName veya sistem tool'a bağlar.

4) intent-engine.js
   - intent.json + sorgular.json eşleştirme motoru.
   - FabrikaIntentEngine.initFabrikaIntentEngine() ile yüklenir.

5) ai-tools.js
   - queryCount ve queryList sistem araçlarını ekler.
   - Mevcut AI_TOOLS nesnesini ezmez.

Önerilen GitHub kök dizini:

/
├── index.html
├── sorgular.json
├── intent.json
├── intent-engine.js
└── ai-tools.js

HTML entegrasyonu için </body> kapanışından önce şunlar eklenmeli:

<script src="intent-engine.js"></script>
<script src="ai-tools.js"></script>

Not:
Bu paket HTML içine otomatik entegrasyon yapmaz; dosyaları doğru adla verir.
