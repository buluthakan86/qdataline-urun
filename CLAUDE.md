# CLAUDE.md — Reçete ve Spesifikasyon Yönetimi (URS)

> **BU DOSYA PROJENİN TEK HAFIZASIDIR.** Yeni oturumda önce bu dosya okunmalı.

## 10.09.2026 — FAZ 2: RAKİP ANALİZİ SONRASI 4 ÖZELLİK EKLENDİ

Apify google-search-scraper ile SoftSpec/Trustwell-FoodLogiQ/beCPG (BRCGS spec-
yönetim pazarındaki gerçek oyuncular) birincil kaynaklarından karşılaştırma
yapıldı, 5 eksik bulundu. Kullanıcı kararı: madde 1 (tedarikçi portalı) için
**yalnızca alt yapı** istendi, tedarikçiye giriş/hesap AÇILMADI; diğer 4 madde
uygulandı. SQL: `sql/05_rakip_analizi_ekleri.sql` (canlıda çalıştırıldı, doğrulandı).

1. **Tedarikçi bilgisi (alt yapı, portal YOK)** — `urun_receteler.tedarikci_adi`
   (serbest metin) eklendi, reçete kalemi formunda "Tedarikçi (opsiyonel)" alanı.
   Gerçek bir tedarikçi girişi/portalı BİLİNÇLİ OLARAK yazılmadı — kullanıcı
   "sisteme girmesin, alt yapısı hazır olsun" dedi. İleride gerçek portal
   istenirse bu kolon referans noktası olur.
2. **Onay imza zinciri** — `urun_spesifikasyonlari.onaylayan_rol` (unvan/rol,
   ör. "Kalite Müdürü") eklendi; Onayla ve Kaydet'te ZORUNLU. Mevcut
   `onaylayan_ad`/`onay_tarihi` server-stamp mantığına ek, versiyon geçmişinde
   de görünür ("X unvanıyla onaylandı").
3. **Esnek özel alanlar** — `urun_spesifikasyonlari.ozel_alanlar` (jsonb dizi,
   `{ad,deger}`), spesifikasyon formunda dinamik satır ekle/çıkar arayüzü.
   Ürün kategorisine göre değişen ek bilgi (ör. "Glüten Testi Yöntemi") için
   ayrı şema tablosu KURULMADI — sade jsonb yeterli görüldü.
4. **Etiket metni üretimi** — yeni "🏷 Etiket Metni" butonu (Spesifikasyon
   detayında), DB değişikliği GEREKMEDİ — mevcut reçete+spesifikasyon
   verisinden istemci tarafında TGK formatında içindekiler/alerjen/beslenme
   metni türetilir (alerjenler BÜYÜK HARF vurgulu), kopyalanabilir/yazdırılabilir.
5. **Sertifika süre takibi** — yeni tablo `urun_sertifikalari` (Helal/Organik/
   BRCGS/IFS/Kosher/ISO 22000/Diğer), yeni "Sertifikalar" ekranı, geçerlilik
   bitişine 60 gün kala "Süresi Yaklaşıyor" rozeti, Anasayfa/sidebar sayaç
   (`cntSertBitiyor`). Doküman Yönetimi ile entegrasyon YAPILMADI (ayrı,
   bağımsız tablo) — kapsam basit tutuldu.

**Test durumu:** SQL canlıda çalıştırılıp doğrulandı (yeni kolonlar/tablo
`information_schema` ile teyit edildi). `URS.html` `node --check` ile sözdizimi
doğrulandı. Playwright bu oturumda bağlanamadığı için tarayıcı testi
YAPILAMADI — kullanıcının canlı test etmesi gerekiyor.

**11.09.2026 — Backend uçtan uca doğrulama (Management API ile, gerçek tarayıcı
girişi olmadan):** Playwright/chrome-devtools bağlanamadığı için tarayıcı
tıklama testi yapılamadı, onun yerine gerçek tenant'ta (Deneme Firması) geçici
test verisiyle backend mantığı uçtan uca doğrulandı, sonra TAMAMEN silindi:
- Ürün + 3 reçete kalemi (tedarikçi adı + alerjen dahil) → doğru kaydedildi.
- Spesifikasyon oluşturma → `spec_kodu` otomatik `SPEC-0001` üretildi.
- Taslak→Onaylı geçişi (`onaylayan_rol='Kalite Müdürü'`) → `versiyon_no` 1→2,
  `onay_tarihi` damgalandı, versiyon geçmişinde `neler_degisti`
  ("Durum: Taslak → Onaylı. Kalite Müdürü unvanıyla onaylandı.") ve
  `degisiklik_notu` doğru yazıldı.
- Onaylı→Taslak geri dönüşü → `onaylayan_ad/onaylayan_rol/onay_tarihi` doğru
  temizlendi, `versiyon_no` 3'e çıktı.
- Süresi geçmiş sertifika kaydı (5 gün önce bitmiş) doğru eklendi.
- (`onaylayan_ad` bu testte boş kaldı — beklenen, çünkü Management API
  `postgres` rolüyle çalışıyor, `auth.uid()` NULL dönüyor; gerçek kullanıcı
  girişinde `profiles.full_name`'den dolacak.)
**Doğrulanamayan tek şey:** gerçek tarayıcıda buton tıklama/form doldurma
deneyimi (CSS/JS DOM etkileşimi) — bu hâlâ kullanıcının kendi testini
gerektiriyor, özellikle mobil responsive görünüm.

---

## 09.09.2026 — FAZ 1 KODLANDI, CANLI TEST BEKLİYOR

### Kapsam kararı
Kullanıcı önce "spesifikasyon yönetimi" fikrini Tedarikçi modülüne eklenti olarak
önerdiğimde reddetti: **ayrı bir modül** olarak, reçete/formülasyonun yönetici
ekranında (Anasayfa) öne çıkması şartıyla istedi. Ardından ekleme turunda:
İngilizce/Türkçe dil seçimi, BRCGS+TGK'nın istediği tüm bilgiler (hedef tüketici
grubu, taşıma koşulları, alerjen bildirimi, depolama koşulları, beslenme
bildirimi), her spesifikasyona otomatik bağımsız kod, PDF+revizyon takibi,
API anahtarıyla AI besin değeri üretimi istendi — hepsi Faz 1'e dahil edildi.

**Ayrı, henüz kararlaştırılmamış madde:** "dış kaynaklı doküman takip sistemi" —
bu modüle mi yoksa Doküman Yönetimi'ne mi ekleneceği kullanıcıyla netleşmedi.

### Mimari (platformun 11 modülüyle aynı kilitli desenler)
- **Ortak Supabase projesi** `bbltvuxxtacrpgrqnfoh`, tablo öneki `urun_`.
- `has_modul('urun')` + `is_editor()` RLS deseni, `urun_stamp()` trigger.
- SSO: `qdlCookieAuthStorage()` birebir diğer modüllerden kopyalandı.
- Vurgu rengi: **Lime yeşili** `#65A30D`/`#84CC16` — ilk seçim Fuşyaydı, BOY ile
  çakıştığı fark edilince 09.09.2026'da Lime'a değiştirildi (platformdaki 10
  modülün hiçbirinde kullanılmamış). Tüm CSS token'ları + iki logo SVG'si +
  favicon/theme-color + rep-inner (PDF/yazdırma) renkleri güncellendi.

### Veri modeli
- `urun_urunler` — ürün ana kaydı (ad/kategori/durum).
- `urun_receteler` — hammadde satırları (oran %, alerjenler jsonb, sıra no).
  **Alerjen matrisi ayrı tablo DEĞİL** — canlı olarak buradan hesaplanır.
- `urun_spesifikasyonlari` — TGK Madde 9 (13 zorunlu alan) + Madde 35 (beslenme
  bildirimi) + BRCGS ek alanları (hedef tüketici grubu, taşıma koşulları,
  alerjen beyanı, çapraz bulaşma riski) + teknik limitler. `spec_kodu` otomatik
  (`SPEC-0001`, tenant bazlı sıralı, trigger'da üretiliyor).
- `urun_spesifikasyon_versiyonlari` — append-only, her INSERT/UPDATE'te otomatik
  snapshot + `neler_degisti` (alan bazlı otomatik fark özeti) + `degisiklik_notu`
  (kullanıcının elle yazdığı not).

### TGK/BRCGS kaynak doğrulaması
`mevzuat.gov.tr`/`resmigazete.gov.tr` TLS sertifika hatası verdiği için birincil
kaynağa ulaşılamadı; içerik `ufukkimya.com`'daki güncel alıntıdan doğrulandı
(Madde 9: 13 zorunlu bilgi; Madde 35: enerji/yağ/doymuş yağ/karbonhidrat/şeker/
protein/tuz zorunlu, trans yağ duruma göre; Ek-1: 14 alerjen grubu — AB 1169/2011
Ek II ile birebir aynı). **Resmi PDF'in doğrudan doğrulanması önerilir** ama bu
liste gıda sektöründe evrensel/değişmeyen bir standart olduğu için risk düşük.

### ⚠️ Güvenlik olayı ve düzeltmesi (aynı gün, canlıya çıkmadan yakalandı)
`urun_ai_anahtar_getir()` (Vault okuyucu) oluşturulduğunda EXECUTE varsayılan
olarak `PUBLIC, anon, authenticated`e de açık geldi — SDR'deki birebir aynı desen
GÜVENLİYDİ ama bu YENİ fonksiyon değildi. `revoke execute ... from public, anon,
authenticated` ile düzeltildi, canlıda `information_schema.routine_privileges`
ile yalnız `postgres/service_role` kaldığı doğrulandı. Detay: proje hafızasında
`feedback_postgres_default_execute_grant`. **Ders: her yeni Vault-okuyan fonksiyon
için bu kontrol artık standart adım olmalı.**

### AI besin değeri (bilinçli sınırlı)
`urun-besin-degeri-uret` Edge Function deploy edildi ve `401` ile doğrulandı
(auth zorunlu). Paylaşımlı `anthropic_api_key` Vault secret'ı yoksa nazikçe
"henüz aktif değil" döner. Sonuç HER ZAMAN `tahmini:true` etiketiyle gelir,
kullanıcı gözden geçirip elle kaydetmeden hiçbir şey veritabanına yazılmaz.

### Dosyalar
| Dosya | Ne işe yarar |
|---|---|
| `URS.html` | Tek dosya ana uygulama (Anasayfa/Ürünler/Reçeteler/Spesifikasyonlar/Alerjen Matrisi) |
| `sql/01_kurulum.sql` | Temel 3 tablo + versiyon geçmişi + RLS |
| `sql/02_kullanici.sql` | Kullanıcıya `'urun'` modül yetkisi |
| `sql/03_brcgs_kod_pdf.sql` | spec_kodu otomatik üretimi + BRCGS alanları + neler_degisti |
| `sql/04_ai_besin_degeri.sql` | Vault anahtar okuyucu (güvenlik düzeltmesi dahil) + kullanım log |
| `supabase/functions/urun-besin-degeri-uret/index.ts` | AI besin değeri Edge Function |

### Test durumu (09.09.2026)
- SQL dosyalarının tümü canlı veritabanında çalıştırıldı ve doğrulandı.
- Edge Function deploy edildi, auth-enforcement doğrulandı (401).
- `URS.html`: JS sözdizimi `node --check` ile doğrulandı (bir kaçış karakteri
  hatası ve iki `||` operatör önceliği hatası bu turda yakalanıp düzeltildi).
- Yerel statik sunucu + Playwright ile giriş ekranı ve TR/EN dil değişimi
  görsel olarak doğrulandı. **Kimlik doğrulama gerektiren ekranlar (Ürünler,
  Reçeteler, Spesifikasyonlar, Alerjen Matrisi) HENÜZ kullanıcı tarafından
  canlı test edilmedi** — gerçek girişle bir sonraki adım budur.

### Yayın (09.09.2026 — TAMAMLANDI)
- GitHub reposu: `github.com/buluthakan86/qdataline-urun` (public), `URS.html`+`sql/`+
  `supabase/`+`CLAUDE.md`+`_redirects` push edildi.
- Cloudflare Pages projesi `qdataline-urun` GitHub'a bağlı, otomatik deploy aktif.
- Custom domain **`urun.qdataline.com` CANLI ve SSL'li** (CNAME + Pages domain
  doğrulaması tamamlandı, `curl` ile HTTP 200 doğrulandı).
- **Ekipman Hub'ına (`eksenpro/index.html`, ayrı repo `qdataline`) 11. modül kartı
  eklendi** — `MODULES` dizisine `id:'urun', code:'urun'` girişi + `I18N`'e
  `mod_urun_tag/title/desc` (TR/EN) + `MOD_CODE`'a `urun:'URS'` kayıt künyesi.
  Yalnızca `eksenpro/index.html` commit edildi (o repoda ilgisiz bekleyen başka
  değişiklikler vardı, onlara dokunulmadı — daha önceki modüllerde de aynı
  disiplin uygulanmıştı). Canlıda `qdataline.com` üzerinden doğrulandı.

### Sıradaki adımlar
1. **Kullanıcının canlı testi** — tek kalan gerçek iş: giriş yapıp Ürünler →
   Reçeteler → Spesifikasyon → AI besin değeri → PDF/Yazdır → versiyon geçmişi
   akışını uçtan uca denemesi.
2. "Dış kaynaklı doküman takip sistemi" — kullanıcı 09.09.2026'da bunu bilinçli
   olarak beklemede bıraktı ("notlar da kalsın") — bu modül mü, Doküman Yönetimi
   mi olacağı HENÜZ karar verilmedi, ileride ayrıca gündeme gelecek.
