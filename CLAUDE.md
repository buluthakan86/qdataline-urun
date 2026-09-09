# CLAUDE.md — Reçete ve Spesifikasyon Yönetimi (URS)

> **BU DOSYA PROJENİN TEK HAFIZASIDIR.** Yeni oturumda önce bu dosya okunmalı.

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

### Sıradaki adımlar
1. Kullanıcı canlı girişle Ürünler → Reçeteler → Spesifikasyon → AI besin değeri
   → PDF/Yazdır → versiyon geçmişi akışını uçtan uca test etmeli.
2. ~~Fuşya renk çakışması~~ — 09.09.2026'da Lime'a geçirildi, tamamlandı.
3. GitHub reposu açılıp Cloudflare Pages'e bağlanmalı (SDR/İSG deseni), bir
   alt alan adı seçilmeli (öneri: `urun.qdataline.com`).
4. Canlıya çıkınca Ekipman Hub'ındaki modül kartı listesine eklenmeli
   (`eksenpro/index.html`).
5. "Dış kaynaklı doküman takip sistemi" — kullanıcı 09.09.2026'da bunu bilinçli
   olarak beklemede bıraktı ("notlar da kalsın") — bu modül mü, Doküman Yönetimi
   mi olacağı HENÜZ karar verilmedi, ileride ayrıca gündeme gelecek.
