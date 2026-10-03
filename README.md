# Arc Agent Trust

Arc Testnet için ajan kimliği ve on-chain kanıtları inceleyen bir araştırma ve karar destek uygulaması. Sonuçlar otomatik güvenlik garantisi veya dolandırıcılık kanıtı değildir; `UNKNOWN` kanıtlar güven puanını düşürmez, güven düzeyini düşürür ve kararın `REVIEW` olmasına yol açar.

## Gereksinimler

- Node.js 18 veya üzeri
- npm
- Arc Testnet RPC ve ArcScan erişimi

## Yerel kurulum

```sh
npm ci
cp .env.example .env
npm start
```

Gösterge paneli `http://localhost:3000`, analiz API’si `http://localhost:3100` adresindedir. Windows PowerShell’de `cp` yerine `Copy-Item .env.example .env` kullanabilirsiniz. `.env` içindeki RPC, registry ve port ayarlarını dağıtımınıza göre düzenleyin.

Tek bir ajanı analiz etmek için:

```sh
curl "http://localhost:3100/api/live-agent?id=845265"
```

## Özellikler

- Canlı Identity Registry, ArcScan ve sahip hesabı verisi toplama
- Kanıt ağırlıkları, bilinen kanıt kapsamı ve güven/risk açıklama dökümü
- Tekrarlanan istekleri birleştirme, kısa süreli cache, istek sınırlama
- Rapor geçmişi ve ajan karşılaştırması
- İlişki grafiği özeti ve aşamalı registry ajan kataloğu
- Yerel dashboard/API, Docker ve Vercel dağıtım yolları

## API

| Yol | Açıklama |
| --- | --- |
| `GET /api/live-agent?id=<id>` | Canlı ajan değerlendirmesi |
| `GET /api/history?id=<id>` | Yerel rapor geçmişi |
| `GET /api/compare?ids=<id1>,<id2>` | En çok 10 ajanın son rapor özeti |
| `GET /api/graph?id=<id>` | İlişki grafiği veya rapordan türetilen sınırlı görünüm |
| `GET /api/network-agents?page=1&limit=50` | Kayıtlı katalog sayfası |
| `GET /api/network-agents?refresh=1` | Registry taramasında bir sonraki blok parçasını işle |
| `GET /health` | Yerel servis sağlık durumu |

Vercel dağıtımında aynı işlevler `/api/...` yollarındadır; sağlık yolu `/api/health` olur. `DATABASE_URL` Vercel’in Production, Preview ve Development ortamlarına eklenmelidir. Rapor geçmişi PostgreSQL’de kalıcıdır; ağ kataloğu checkpoint’i `/tmp` altında kalır ve instance değişince sıfırlanabilir.

## Puanlama ve kararlar

Puanlayıcı, yalnızca `POSITIVE` ve `NEGATIVE` ağırlıklı kanıtları puana katar. `riskScore`, bilinen ağırlıklar içindeki negatif paydır; hiç bilinen kanıt yoksa risk puanı `0`, güven puanı `0` ve kapsama `0` olur. Bu durum düşük risk anlamına gelmez; karar `REVIEW` kalır.

Varsayılan politika `arc-default-v1`:

- Negatif sinyal varsa ve güven puanı 55’in altındaysa `HIGH_RISK`
- Güven puanı en az 80, güven düzeyi en az 70 ve negatif sinyal yoksa `TRUST`
- Diğer tüm durumlarda `REVIEW`

Eşikler `.env` ile değiştirilebilir. Eşiklerin karar kalitesini temsil ettiği iddiası için etiketli geçmiş veriyle ayrıca kalibrasyon yapılmalıdır. Raporlar şema sürümü, politika kimliği ve algoritma adını taşır.

## Yapılandırma

Önemli `.env` değişkenleri `.env.example` içindedir. Dış kaynak isteklerinde `UPSTREAM_TIMEOUT_MS` ve `MAX_UPSTREAM_BYTES` zaman/yanıt sınırı uygular. Metadata erişiminde yalnızca HTTPS kullanılır; özel/yerel IP hedefleri ve HTTP yönlendirmeleri reddedilir. CORS varsayılan olarak kapalıdır; gerekiyorsa `CORS_ORIGIN` değerini tek bir dashboard kökenine ayarlayın.

`MAX_CONCURRENT_ANALYSES`, `ANALYSIS_CACHE_TTL_MS`, `ARC_CHAIN_ID`, `TRUST_POLICY_ID`, `TRUST_SCORE_THRESHOLD`, `TRUST_CONFIDENCE_THRESHOLD` ve `HIGH_RISK_TRUST_MAX` değerleri dağıtım davranışını belirler. Eşikler değiştiğinde politika kimliğini de güncelleyin.

### PostgreSQL rapor geçmişi

Önerilen ücretsiz sağlayıcı [Neon Free](https://neon.com/pricing). Neon’un 2026-10-02 tarihli duyurusuna göre ücretsiz plan proje başına 1 GB depolama ve ayda 100 CU-saat içeriyor; compute 5 dakika boşta kaldığında scale-to-zero oluyor. Ücretsiz kullanım limitleri/planı değişebilir ve ilk bağlantıdan sonra kısa uyanma gecikmesi görülebilir. [Neon plan duyurusu](https://neon.com/blog/neon-free-plan-1-gb-per-project), [bağlantı havuzu belgesi](https://neon.com/docs/connect/connection-pooling).

Neon Console’da proje oluşturduktan sonra **Pooled connection** seçeneğiyle alınan bağlantı metnini yerel `.env` dosyasındaki `DATABASE_URL` değerine koyun. Bu URL veritabanı parolası içerir; sohbete, repoya veya loglara koymayın. Vercel kullanıyorsanız aynı değeri Vercel’in Project Settings → Environment Variables alanında Production/Preview ortamlarına gizli değişken olarak ekleyin. `DATABASE_SSL=require` ve küçük `DATABASE_POOL_MAX` ayarları Neon Free için örnektir.

`pg` havuzu ilk ihtiyaçta açılır; `agent_reports` tablosu ve indeksi idempotent biçimde oluşturulur. Veritabanı kullanıcısına ilk kurulum için tablo oluşturma izni verin. `DATABASE_SSL=require` varsayılandır; yerel PostgreSQL’de bilinçli olarak TLS kullanmıyorsanız `DATABASE_SSL=disable` seçin. Vercel’de her işlev instance’ının havuzu varsayılan olarak iki bağlantıyla sınırlandırılır.

`DATABASE_URL` yokken geliştirme için rapor geçmişi `reports/` dosyalarından okunur. Kalıcı üretim geçmişi için URL’yi dashboard ve API servislerinin ikisine de ekleyin. Yeni analizler PostgreSQL’e yazılır; geçmiş, arşiv ve karşılaştırma uçları PostgreSQL’i esas alır.

İlk etkinleştirmede mevcut JSON raporlarını bir defa içeri almak için bağlantı değişkenini ayarladıktan sonra `npm run db:import-reports` çalıştırın. Komut `reports/agent-live-*.json` ve `agent-trust-*.json` dosyalarını yinelenebilir biçimde ekler/günceller; kaynak dosyaları silmez. Canlı analiz ve history/arşiv/compare uçları DB’de yazıp okur. `/api/graph`, yerel grafik yoksa DB’deki son rapordan sınırlı ilişki grafiği türetir. Sağlık yanıtında `reportStore: postgresql` ve `status: ok` görünce bağlantı doğrulanmıştır.

## Dağıtım

### Docker

```sh
docker build -t arc-agent-trust .
docker run --rm -p 3000:3000 --env-file .env arc-agent-trust
```

Container içindeki katalog checkpoint’i kalıcı değildir; PostgreSQL etkinse rapor geçmişi kalıcıdır. PostgreSQL kullanılmıyorsa raporlar için volume bağlayın.

### Vercel

Repo’yu Vercel’e bağlayın ve framework preset’ini `Other` seçin. Derleme komutu gerekmez. `vercel.json`, canlı analiz ve katalog fonksiyonları için 60 saniyelik üst sınır tanımlar. `DATABASE_URL` değerini Vercel’in kullandığınız ortamlarına ekleyin; uygulama tablo ve indeksi kendisi oluşturur.

## Geliştirme ve kontroller

```sh
npm test
npm run lint
```

Testler puanlama, geçmiş/grafik/katalog yardımcıları, eşzamanlı analiz kimliği izolasyonu, Vercel uçları ve risk matrisi senaryolarını kapsar. `npm run test:arc` gerçek Arc Testnet ağına erişim kontrolüdür.

### Karar eşiği kalibrasyonu

`calibration/labels.template.csv` dosyasını `calibration/labels.csv` olarak kopyalayıp her ajan için bağımsız incelemeyle doğrulanmış `TRUST`, `REVIEW` veya `HIGH_RISK` etiketini ekleyin. Sistemin kendi kararı gerçek etiket değildir. İlgili ajan için güncel `agent-live-<id>-v66.json` raporu `reports/` altında bulunmalı.

```sh
cp calibration/labels.template.csv calibration/labels.csv
npm run calibrate
# İsteğe bağlı: node scripts/calibrate.js <labels.csv> <sonuc.json>
```

PowerShell’de ilk komut için `Copy-Item calibration/labels.template.csv calibration/labels.csv` kullanın.

Araç ajan kimliğinin SHA-256 karmasına göre sabit %80/%20 train/holdout ayrımı yapar, eşikleri yalnızca train verisinde arar ve holdout makro-F1, sınıf precision/recall, karar kapsamı ve karışıklık matrisini raporlar. Her sınıfta train ve holdout için en az beş örnek yoksa eşik önermez. Sonuç `calibration/calibration-result.json` dosyasına yazılır. Etiket CSV’sini ve sonucu repoya eklemeyin.

## Güvenlik sınırları

API varsayılan olarak kimlik doğrulaması istemeyen, herkese açık bir okuma/analiz API’sidir. Üretimde halka açılacaksa reverse proxy/WAF üzerinde erişim ve hız sınırı uygulayın; uygulama içi hız limiti süreç belleğindedir ve çoklu instance arasında paylaşılmaz. Bu sistem testnet araştırması içindir; kararları insan denetimi olmadan kritik varlık yetkilendirmesinde kullanmayın.
