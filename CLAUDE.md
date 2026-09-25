# CLAUDE.md — Reçete ve Spesifikasyon Yönetimi (URS)

## ⚡ EK (14.09.2026) — Faz 1 "Görünürlük": sürüm damgası + tarayıcı hata toplama

Platform-geneli. Ayrıntı ve gerekçeler: `_platform-ortak/README.md` → "Faz 1 — Görünürlük",
SQL: `_platform-ortak/sql/02_qdl_gorunurluk.sql` (14.09.2026 canlıya uygulandı).

Bu modülde değişen:
- **Yayın kökünde `qdl-version.json`** — `{modul, surum, commit, built_at}`. Supabase
  içindeki `qdl_deploy_check()` işi (günde 4 kez) bunu okuyor; site erişilemiyorsa ya da
  **push sonrası Cloudflare build tetiklenmediği için eski sürüm yayındaysa** durum sabah
  06:50 UTC'deki tek günlük özet e-postasına düşüyor. Sürüm damgası **elle düzenlenmez**:
  `node _platform-ortak/istemci/surum-damgala.cjs <kod>` üretir, push sonrası
  `select public.qdl_modul_surum_bekle('<kod>','<surum>');` çalıştırılır.
- **Yayın kökünde `qdl-hata.js`** + ana HTML dosyalarının `</head>` öncesine
  `<script src="/qdl-hata.js"></script>`. Bağımlılıksız; `window.onerror` ve
  `unhandledrejection` yakalanıp `qdl_log_client_error(...)` RPC'sine yazılıyor.
  Modül kodu/sürümü `/qdl-version.json` dosyasından okunur — **bu dosyada modüle özel
  yapılandırma yok**. Sayfa sağlıklıyken sıfır ağ isteği; oturum başına en fazla 10
  gönderim; IP başına saatte 40 çağrı sunucu tarafı hız sınırı; hata mesajı/stack hem
  istemcide hem sunucuda maskeleniyor; form değerleri **asla** gönderilmiyor.
- Giriş yapmamış ziyaretçi de hata bildirebilir (login ekranındaki hata da önemli), ama
  `tenant_id` ve kullanıcı kimliği **istemciden alınmaz** — sunucuda oturumdan türetilir.
- 3. parti hata toplayıcı (Sentry/LogRocket vb.) **bilinçli olarak kullanılmadı**: her
  biri KVKK anlamında ayrı bir alt-işleyen doğurur ve sözleşmede beyan gerektirir.

**`qdl-hata.js` bu klasörde düzenlenmez.** Tek doğru kopya `_platform-ortak/istemci/`
altındadır; buradaki dosya onun birebir kopyasıdır.


> **BU DOSYA PROJENİN TEK HAFIZASIDIR.** Yeni oturumda önce bu dosya okunmalı.

## 13.09.2026 — E-posta ile tek-tıkla Onay/Red (platform-geneli özelliğin URS'ye yayılması) — CANLI + TEST EDİLDİ

MOC'ta pilot olarak kurulup canlıda test edilmiş paylaşımlı (`qdl_` önekli,
modüle özel olmayan) e-posta onay linki altyapısı bu modüle de eklendi. Bu
modülde tedarikçi/üst-yönetici **giriş portalı bilinçli olarak yok**
([[project_urun_rakip_analizi]]) — e-posta linkiyle giriş yapmadan onay tam da
bu boşluğu dolduruyor, özellikle bu modül için iyi bir uyum.

**Hedeflenen akış:** `urun_spesifikasyonlari.durum` `'Taslak' → 'Onaylı'`
(mevcut, gerçek onay alanı — `onaylayan_ad`/`onaylayan_rol`/`onay_tarihi`,
10.09.2026'da "onay imza zinciri" olarak eklenmişti). Editör bir spesifikasyonu
Taslak'ta kaydettikten sonra detay ekranındaki yeni **"📧 Onay İçin E-posta
Gönder"** butonuna basar; link `urun_firma_bilgileri.ust_yonetici_eposta`'ya
gider (bu alan zaten vardı, yıllık gözden geçirme bildirimi için ayrılmıştı —
onay linki için de doğrudan kullanıldı, yeni bir alan eklenmedi). Link sahibi
giriş yapmadan Onayla/Reddet kararı verir.

**Yeni dosyalar:**
- `sql/09_email_onay.sql` — canlıda uygulandı. Yeni: `public.
  urun_onay_email_gonder(p_spec_id uuid)` RPC (client'tan `sb.rpc(...)` ile
  çağrılır; `auth.uid()`+`has_modul('urun')`+`is_editor()` kontrolü var, yalnız
  Taslak durumundaki spesifikasyonlar için çalışır, alıcı e-postası boşsa
  `no_recipient` döner). `public.qdl_consume_approval_token`'a
  `urun_spesifikasyonlari` dalı eklendi (MOC/İSG dallarından SONRA — bu
  fonksiyon artık **3 modülü** dispatch ediyor: `moc_approvals`,
  `isg_kimyasallar`, `urun_spesifikasyonlari`; ayrıca test sırasında GÖRÜLDÜ Kİ
  Doküman Yönetimi de eş zamanlı olarak kendi `ggd_sablonlar` dalını aynı
  fonksiyona ekliyordu — bkz. aşağıdaki "eşzamanlı düzenleme" notu).
  `public.qdl_approval_token_preview`'a da aynı şekilde salt-okunur önizleme
  dalı eklendi (spec_kodu/gida_adi/durum döner).
- `urun-onay.html` — bağımsız iniş sayfası, URS.html ile aynı Lime yeşili
  (`#65A30D`/`#84CC16`) koyu tema, kendi küçük TR/EN `t()` sözlüğü (URS.html'in
  büyük I18N sözlüğünden AYRI — bu sayfa `buildNav()`/login akışının tamamen
  dışında, bağımsız statik bir sayfa, modülün kimlik doğrulamalı nav'ına hiç
  girmiyor). Supabase-js CDN'i yüklemek yerine doğrudan `fetch()` ile anon
  RPC'ye (`qdl_approval_token_preview`) gidiyor — sayfa daha hafif, ekstra
  bağımlılık yok.
- `functions/api/onay-consume.js` (repo KÖKÜNDE, MOC'taki dosyanın BİREBİR
  kopyası) — gerçek ziyaretçi IP'sini `CF-Connecting-IP`'den okuyup
  `qdl_consume_approval_token`'a sunucu tarafında iletiyor; `urun-onay.html`
  RPC'yi doğrudan değil bu endpoint üzerinden çağırıyor (IP sahteleme
  boşluğu MOC'taki gibi baştan kapatıldı, ayrı bir "ikinci tur" gerekmedi).

**⚠️ Eşzamanlı düzenleme bulundu (test sırasında yakalandı, gerçek bir risk):**
`qdl_consume_approval_token` platform-geneli paylaşımlı bir fonksiyon —
test sırasında BAŞKA BİR OTURUM (muhtemelen Doküman Yönetimi'ne aynı özelliği
ekleyen paralel bir ajan/oturum) aynı fonksiyonu AYNI ANDA `CREATE OR REPLACE`
ile güncelliyordu. Bir consume testinde (senaryo D, aşağıda) bu yüzden geçici
olarak `unsupported_record` döndü — benim dalım o anki canlı tanımda yoktu,
çünkü öbür oturum kendi `ggd_sablonlar` dalını benim eklentimden ÖNCEKİ bir
sürüm üzerine yazmıştı. Token bu sırada tüketilip "used" olarak damgalandı
(atomik UPDATE zaten kararı vermeden önce token'ı tüketiyor) — bu yüzden aynı
token'la tekrar denenemedi, taze bir token'la test tekrarlandı ve doğru sonuç
alındı. **Son durumda fonksiyon hem `urun_spesifikasyonlari` hem
`ggd_sablonlar` dalını içeriyor — ikisi de doğrulandı, veri kaybı/bozulma
olmadı.** **Ders:** `qdl_consume_approval_token` gibi paylaşımlı bir
fonksiyonu birden fazla modül eşzamanlı genişletirken, `CREATE OR REPLACE`
öncesi mutlaka en güncel canlı tanımı çekip onun üzerine dal eklemek gerekiyor
— bu turda kazara üstüne yazma riski somut olarak yaşandı, ileride bu tür
platform-geneli fonksiyonlara dokunan her modül bunu bilmeli.

**CANLI DOĞRULAMA (13.09.2026, Management API ile, gerçek tenant/gerçek demo
kaydı SPEC-0003 "Klasik Domates Sosu" üzerinde, sonunda TAMAMEN pristine
duruma geri alındı — `versiyon_no` dahil, trigger'lar geçici devre dışı
bırakılıp elle 1'e döndürüldü, `urun_spesifikasyon_versiyonlari`'nda yalnız
orijinal "İlk oluşturma" (v1) satırı kaldı):**
- `information_schema`/`pg_proc` ile üç fonksiyon (`urun_onay_email_gonder`,
  güncellenmiş `qdl_consume_approval_token`, güncellenmiş
  `qdl_approval_token_preview`) canlıda `SECURITY DEFINER` olarak doğrulandı.
- `urun_onay_email_gonder` gerçek bir editör kimliğiyle (`set_config
  ('request.jwt.claims', …)` ile RLS/auth simülasyonu, tıpkı 11.09.2026'daki
  demo-yetki testinde olduğu gibi) çağrıldı → `{"ok":true,"sent_to":
  "buluthakan86@gmail.com"}`. `net._http_response`'ta **status_code=200**
  (Resend) doğrulandı.
- **4 senaryo da beklendiği gibi çalıştı, kanıtlarıyla:**
  - **A — ilk kullanım:** `qdl_consume_approval_token(...,'APPROVED',...)` →
    `{"ok":true,"decision":"APPROVED","spec_kodu":"SPEC-0003","gida_adi":
    "Klasik Domates Sosu"}`; sonrasında satır kontrol edildi: `durum='Onaylı'`,
    `onaylayan_ad='E-posta linki (buluthakan86@gmail.com)'`,
    `onaylayan_rol='Üst Yönetici (e-posta onayı)'`, `onay_tarihi` damgalandı,
    `versiyon_no` 1→2, `sonraki_inceleme_tarihi` onay tarihinden +365 gün
    doğru hesaplandı (mevcut `urun_spec_kaydet_trg` BEFORE trigger'ı hiç
    değiştirilmeden, kendiliğinden tetiklendi), `kaydetme_notu`'na
    "[E-posta linki ile onaylandı]" eklendi, versiyon geçmişine otomatik
    snapshot düştü (mevcut AFTER trigger, dokunulmadı).
  - **B — aynı token'ı tekrar kullanma:** aynı token ile ikinci çağrı →
    `{"ok":false,"reason":"already_used"}`.
  - **C — süresi dolmuş token:** `p_ttl_hours=>0` ile üretilip birkaç saniye
    beklenip tüketildi → `{"ok":false,"reason":"expired"}`.
  - **D — kayıt token'dan sonra değişmiş (expected_status uyuşmazlığı):**
    token üretildikten sonra `durum` Taslak→Onaylı yapıldı, sonra token
    tüketildi → `{"ok":false,"reason":"state_changed"}` (yukarıdaki eşzamanlı
    düzenleme olayından sonra taze bir token'la tekrarlanıp doğrulandı).
- Test için geçici olarak eklenen `urun_firma_bilgileri` satırı (test
  tenant'ı `11111111-…`) ve tüm test token'ları/rate-limit sayaçları test
  sonunda silindi; SPEC-0003 kaydı içerik olarak da (`durum`, `onaylayan_*`,
  `onay_tarihi`, `kaydetme_notu`, `sonraki_inceleme_tarihi`, `versiyon_no`)
  test öncesi haline dönüldü.
- **Doğrulanamayan tek şey:** gerçek tarayıcıda "📧 Onay İçin E-posta Gönder"
  butonuna tıklama ve `urun-onay.html`'i gerçek bir e-postadaki linkten açıp
  Onayla/Reddet'e tıklama deneyimi — bu hâlâ kullanıcının kendi testini
  gerektiriyor.

**⚠️ Ek güvenlik düzeltmesi (aynı gün, `information_schema.routine_privileges`
ile denetlenirken bulundu):** yeni `urun_onay_email_gonder` fonksiyonu
`revoke all ... from public` sonrasında bile `anon`'a EXECUTE açık geliyordu —
tam olarak [[feedback_postgres_default_execute_grant]]'te uyarılan tuzak
(`revoke ... from public` tek başına `anon`/`authenticated`'a önceden verilmiş
PUBLIC-kaynaklı grant'i geri almıyor). `revoke execute ... from anon` ile
canlıda düzeltildi ve doğrulandı (`anon` artık listede yok, yalnız
`postgres`/`authenticated`/`service_role` kaldı); `sql/09_email_onay.sql`
dosyasına da işlendi. Fonksiyon zaten kendi içinde `auth.uid() is null` kontrolü
yaptığı için pratikte anon bir şey yapamıyordu, ama GRANT seviyesinde de
kapatılması standart kural.

**Yayın durumu:** `URS.html`, `sql/09_email_onay.sql`, `urun-onay.html`,
`functions/api/onay-consume.js` `qdataline-urun` reposuna commit edilip
push edildi. Cloudflare Pages'in bu push'u otomatik build'lediği bir
sonraki oturumda `curl` ile doğrulanmalı — Ekipman/URS modülünde daha önce
webhook'un bazen tetiklenmediği görülmüştü ([[feedback_cloudflare_webhook_calismadi]]),
tetiklenmezse Cloudflare API ile manuel deploy tetiklenmeli.

---

## 11.09.2026 — FAZ 5: BÜYÜK KULLANICI GERİ BİLDİRİMİ TURU

Kullanıcı canlı testte spesifikasyon oluşturmayı denedi, "aynı makarna spesifikasyonu
3 kez oluştu, hata mı yoksa fazla mı tıkladım" diye sordu + uzun bir liste halinde
10'dan fazla iyileştirme istedi. `sql/06_gelismis_spec_alanlari.sql` ve
`sql/07_firma_bilgisi_ve_incele.sql` canlıda çalıştırıldı.

### 🔴 Bulunan gerçek bug: çift-tıklama/çoklu-gönderim koruması YOKTU
`urun_urunler` tablosunda 3 "Makarna" kaydı bulundu, `created_at` zaman damgaları
birbirinden yalnızca **3 milisaniye** farklıydı — bu insan tepki hızıyla açıklanamaz,
gerçek bir bug: hiçbir Kaydet butonunda çift-gönderim koruması yoktu, hızlı art arda
tıklama (veya dokunmatik ekranda çift dokunma) eşzamanlı birden fazla INSERT
isteği açabiliyordu. **Düzeltme:** global `_kayitKilit` bayrağı + `kilitliMi()`/
`kilitAc()` yardımcıları eklendi, `urunKaydet`/`receteKalemKaydet`/`specKaydet`/
`sertKaydet` fonksiyonlarının hepsine uygulandı — ikinci tıklama sessizce yok
sayılıyor. Bu, platformun diğer modüllerinde de (BOY'da "çift tıklama koruması"
notu var) bilinen bir tuzak — [[feedback_istemci_tarafi_kural_tuzagi]] ile aynı
kategori.

### Yapılan diğer değişiklikler
1. **Fiziksel-Kimyasal / Mikrobiyolojik limitler** artık boş kutuya serbest yazı
   değil, parametre/min/max/birim satırları (`fiziksel_kimyasal_parametreler`,
   `mikrobiyolojik_parametreler` jsonb). Eski metin kolonu "Ek Not" olarak kaldı.
2. **Duyusal Kriterler** varsayılan Tat/Koku/Doku/Görünüş 4 satırıyla geliyor,
   her birine açıklama yazılabiliyor (`duyusal_kriterler_yapilandirilmis`).
3. **Yasal Dayanaklar** — çoğaltılabilir mevzuat listesi + sık kullanılan TGK
   yönetmelikleri için tek tıkla ekleme butonları (`yasal_dayanaklar`).
4. **Gramaj/Palet Seçenekleri** — aynı ürünün farklı gramajları (ve her birinin
   kendi palet ölçüsü/adedi) TEK spesifikasyon içinde listelenebiliyor
   (`gramaj_secenekleri`) — kullanıcının "aynı ürünün farklı gramajı, farklı
   palet miktarı" isteği.
5. **Ambalaj Seçenekleri** — OPP-CPP, PE gibi birden fazla malzeme etiketi
   (`ambalaj_secenekleri`), ayrıca boyut/katman detayı için serbest metin kaldı.
6. **Ürün Görselleri** — yeni private Storage bucket `urun-belgeler` (İSG/BOY/MOC
   ile aynı tenant-klasörlü RLS deseni), spesifikasyona çoklu görsel yükleme.
7. **Ayarlar ekranı (yeni)** — firma adı/adres/logo/üst yönetici bilgisi
   (`urun_firma_bilgileri`, tenant başına 1 satır). Logo Storage'a yükleniyor,
   yol (imzalı URL değil) saklanıyor, görüntülenirken/PDF'te anlık imzalı URL
   üretiliyor (imzalı URL'nin süresi dolmasın diye).
8. **PDF/Yazdırma**: firma adı+logo üst bilgi (letterhead) olarak eklendi;
   oluşturulma/son revizyon/sonraki inceleme tarihleri gösteriliyor; TGK
   formatına uygun olarak Doymuş Yağ/Şeker/Trans Yağ artık "- " ile girintili
   ALT KALEM olarak (Yağ/Karbonhidrat'ın altında) gösteriliyor; tüm yeni
   yapılandırılmış bölümler (parametreler, duyusal, yasal dayanaklar, gramaj/
   palet, ambalaj seçenekleri) PDF'e eklendi. **Ürün görselleri PDF'e
   eklenmedi** (imzalı URL senkron HTML üretimiyle uyumsuz, bilinçli kapsam dışı).
9. **Reçete ekranı**: her hammaddeye "Proses Talimatı" (hangi aşamada/nasıl
   eklenir, sıvı/katı çözünme, karıştırma süresi) serbest metin alanı
   (`proses_talimati`) + tabloda **"1 Ton İçin" otomatik kg hesaplaması**
   (`oran_yüzde * 10` — %1 = 1000 kg ürün için 10 kg) eklendi.
10. **Yıllık gözden geçirme tarihi** — spesifikasyon onaylanınca
    `sonraki_inceleme_tarihi` otomatik onay_tarihi+365 gün olarak hesaplanıyor
    (trigger), spec detayında ve PDF'te gösteriliyor. **BİLİNÇLİ KAPSAM DIŞI:**
    bu tarihe göre üst yöneticiye OTOMATİK E-POSTA gönderimi bu turda
    YAPILMADI — ayrı bir Edge Function + zamanlama (pg_cron veya benzeri)
    gerektiriyor, platformun paylaşımlı Resend altyapısına
    ([[project_otomatik_bildirim_resend]]) bağlanabilir. `urun_firma_bilgileri.
    ust_yonetici_eposta` alanı bu iş için hazır bekliyor.

### 11.09.2026 (aynı gün, üçüncü tur) — Müşteri Spesifikasyonları + platform-geneli overlay bug'ı
- **Müşteri Spesifikasyonları**: spesifikasyon detayına yeni bölüm — müşterinin
  gönderdiği PDF/Word/Excel dosyaları (`musteri_spesifikasyonlari` jsonb,
  mevcut `urun-belgeler` bucket'ında `musteri-spec/` yol öneki) yüklenip
  açıklama eklenip indirilebiliyor, PDF'te referans olarak listeleniyor.
- **🔴 Platform-geneli kritik bug bulundu ve TÜM 11 modülde düzeltildi**:
  modal dışındaki karartılmış arka plana (overlay) tıklanınca form HİÇ
  ONAY SORMADAN kapanıp içindeki her şey siliniyordu. URS dahil 9 modülde
  (İSG/SDR/Doküman/BOY/Gıda Güvenliği/Ekipman/Tedarikçi/MOC) düzeltildi,
  Eğitim Platformu ve Q-Kalite zaten güvenliydi. Detay: proje hafızasında
  `feedback_overlay_click_veri_kaybi`.

### Backlog'a eklenen (henüz yapılmadı, kullanıcı "notlara ekle" dedi)
- Reçete kalemi (katkı maddesi) eklerken doküman eki: spec/MSDS dosyası
  yükleme, raf ömrü, alerjen durumu gibi temel bilgilerin doğrudan o katkının
  kendi kaydında (ayrı bir "sertifikasyon/doküman" alt bölümü olarak)
  tutulabilmesi. Şu an yalnız serbest metin `notlar` + checkbox alerjen var.

### Test durumu
`node --check` ile sözdizimi doğrulandı. Canlıda cache-busting ile yeni alanların
(fkParamWrap/gramajWrap/yasalWrap/gorselWrap/firmaKaydet) varlığı doğrulandı.
**Gerçek tarayıcı tıklama/form testi YAPILAMADI** (Playwright bağlanamadı) —
kullanıcının canlı test etmesi hâlâ gerekiyor, özellikle: logo yükleme, ürün
görseli yükleme, gramaj/parametre satırı ekleme/kaldırma, PDF çıktısının görsel
doğruluğu.

---

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

### Demo veri (11.09.2026, kalıcı — silinmedi)
Kullanıcı isteğiyle "Deneme Firması" tenant'ına 3 gerçekçi kurgusal ürün +
tam reçete + spesifikasyon + sertifika eklendi (`kk` önekleri `DEMO-`):
- **Ev Tipi Ekmek Unu Karışımı** — 6 hammaddeli reçete (gluten alerjeni),
  Onaylı spesifikasyon (SPEC-0001, onaylayan "Ayşe Yılmaz — Kalite Müdürü"),
  2 sertifika (BRCGS geçerli, Helal süresi yaklaşıyor — ~20 gün).
- **Bitkisel Süt İçeceği (Badem)** — 5 hammaddeli reçete (sert kabuklu meyve
  alerjeni), Onaylı spesifikasyon (SPEC-0002), 2 sertifika (Organik süresi
  bu ay doluyor ~9 gün, ISO 22000 geçerli).
- **Klasik Domates Sosu** — 6 hammaddeli reçete (alerjensiz), Taslak
  spesifikasyon (SPEC-0003, onaysız) — onay akışının denenmesi için
  bilinçli olarak Taslak bırakıldı.

Amaç: kullanıcının modülü ilk açtığında boş ekranlarla değil, alerjen
matrisi/sertifika uyarı paneli/onay akışının hepsinin gerçek örneklerle
dolu görünmesi. **Bu veri TEST verisi değildir, silinmeyecektir** — gerçek
kullanım öncesi kullanıcı isterse Ürünler ekranından kendisi kaldırabilir.

### ⚠️ Bulunan gerçek eksik: demo hesaplarında `urun` yetkisi yoktu (11.09.2026)
Kullanıcı "yönetici ve kullanıcı için oluşturduğumuz hesaplar bütün modüller
için geçerli" dedi — kontrol edilince bu YANLIŞ çıktı: `demo.kullanici@
qdataline.com` (EDITOR) ve `demo.yonetici@qdataline.com` (ADMIN), URS
modülünden ÖNCE oluşturuldukları için `modul_yetki`'de `'urun'` satırı hiç
yoktu. **Düzeltildi** — ikisine de `'urun'` yetkisi eklendi. Aynı 3 ürünlük
demo veri seti (DEMO- önekli) bu hesapların kendi tenant'ına (`675ac400-...`,
"Deneme Firması") da eklendi — buluthakan86@gmail.com'un tenant'ından
(`11111111-...`) AYRI bir tenant, ikisi karıştırılmamalı.

**Ders:** yeni bir modül canlıya alınırken hub kartı gibi, bu iki "genel
demo hesabı"na modül yetkisi eklemek de AYRI, unutulması kolay bir adım —
checklist'e eklenmeli (bkz. [[project_isg_yonetimi_modulu]]'daki "Ortak Demo
Kullanıcı Hesapları" notu, aynı iki hesap orada da her modül eklendiğinde
elle güncellenmesi gerektiği belirtilmişti).

**Süreç doğrulaması (RLS ile, gerçek yetki simülasyonu):** `demo.kullanici`
kimliğiyle (`set local request.jwt.claims`) reçete oluşturma, taslak
spesifikasyon açma ve KENDİ oluşturduğu spesifikasyonu onaylama uçtan uca
test edildi — hepsi başarılı, `onaylayan_ad` trigger'ı doğru şekilde
`auth.uid()`'den `profiles.full_name`'i çekip "QDATALINE Demo Kullanıcı"
yazdı (gerçek oturumda böyle çalışacağının kanıtı). Yetkisiz bir kullanıcı
(`modul_yetki`'de kaydı olmayan) ile aynı işlem denendiğinde RLS doğru
şekilde `42501` hatasıyla REDDETTİ — güvenlik ve işlevsellik ikisi de
doğrulandı. Tüm test işlemleri `begin;`+`set local` içinde yapılıp hiç
`commit` edilmedi (Management API'nin her çağrısı ayrı bağlantı olduğu için
otomatik geri alınıyor) — gerçek veriye hiç dokunulmadı.

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

## Faz 3 — `has_modul()` artık FİRMA seviyesinde de kontrol ediyor (15.09.2026)

**Bu modülün RLS policy'lerini doğrudan etkiler.** `public.has_modul('<kod>')`
eskiden yalnız `public.modul_yetki`'ye (kullanıcı bazlı) bakıyordu. Artık **VE**
kuralı işliyor:

1. kullanıcının `modul_yetki` satırı var (eski kural, korundu), **ve**
2. kullanıcının firması `public.tenant_modules`'ta o modüle sahip ve `enabled`.

Yani bir kullanıcıya modül yetkisi vermek **tek başına yetmez** — firmasının da o
modülü satın almış olması gerekir. Bir kullanıcı "yetkisi olduğu hâlde veri
göremiyorsa" önce şuna bakılır:

```sql
select * from public.tenant_modules
 where tenant_id = (select tenant_id from public.profiles where id = '<user_id>');
```

Yeni firma açarken `public.qdl_yeni_firma(...)`, var olan firmaya kullanıcı
eklerken `public.qdl_firmaya_kullanici_ekle(...)` kullanılır (ikincisi firmanın
satın aldığı tüm modülleri otomatik verir). Modül satışı/iptali:
`public.qdl_firma_modul_ayarla(tenant, modul, aktif)`.

Ayrıntı, geri alma SQL'i ve regresyon kanıtı: `_platform-ortak/README.md` →
"Faz 3 — Satılabilirlik" ve `_platform-ortak/sql/05_*`, `06_*`.


---

## 15.09.2026 — Paylaşımlı onay fonksiyonları MERKEZİLEŞTİRİLDİ

`qdl_consume_approval_token` / `qdl_approval_token_preview` artık **modül dalı
içermiyor**. Dağıtım `public.qdl_approval_handlers` kayıt tablosundan yapılıyor;
her modül **kendi** handler fonksiyonunu yönetiyor.

**Bu depodaki eski SQL dosyası ETKİSİZLEŞTİRİLDİ** (silinmedi, yoruma alındı):
`sql/09_email_onay.sql`
Çalıştırılsaydı diğer modüllerin dallarını **sessizce silecekti** (7 daldan 4'ü).

**Bu modülün onay mantığı artık:** `public.urun_spec_onay_uygula()`
(kaynak: `_platform-ortak/sql/09_qdl_onay_dagitim_kaydi.sql`)

> Paylaşımlı bir fonksiyonu değiştirmen gerekirse **önce**
> `_platform-ortak/README.md` > "Paylaşımlı bir fonksiyon nasıl değiştirilir"
> bölümündeki 5 adımlı prosedürü uygula. Değişiklik sonrası
> `_platform-ortak/sql/10_qdl_onay_nobetci.sql` **0 satır** vermeli.

7 onay dalının tamamı (MOC, İSG, Q-Kalite, GGD, Doküman, Tedarikçi, URS)
gerçek token'larla uçtan uca test edildi; onay ve red yolları değişiklikten
önce ve sonra **birebir aynı** sonucu verdi.

---

## 16.09.2026 — Sessiz veri kırpılması denetimi (Faz 2 kapsamı dışı kalmıştı)

Platform genelinde Faz 2'de İSG/GGD/BOY'da düzeltilen "PostgREST 1000 satır
sınırı sessizce listeyi kısaltıyor" sorunu bu modülde **atlanmıştı**, yalnız
deploy ve FK düzeltmesi almıştı. Bu turda tamamlandı.

`URS.html` içindeki tüm `.select()` çağrıları (8 adet) sınıflandırıldı:
- 5'i zaten `tumSatirlar()` sayfalama yardımcısı ile sınırsızdı (ürünler,
  reçeteler, spesifikasyonlar, sertifikalar + 1 tanesi hatalıydı, aşağıda)
- 1'i tek satır (`profiles`), 1'i tek satır (`urun_firma_bilgileri`), 1'i
  yaz-sonra-getir (`insert().select().maybeSingle()`) — hepsi olduğu gibi
  bırakıldı, sorun yok.

**Gerçek bug bulundu:** `urun_spesifikasyon_versiyonlari` sorgusu
`tumSatirlar()` içindeyken ayrıca `.limit(500)` de taşıyordu. PostgREST bu
ikisini birleştirince ilk sayfa 500 satırla kesiliyor, 500 < sayfalama adımı
(1000) olduğu için döngü "bitti" sanıp duruyordu — spesifikasyon versiyon
geçmişi 500'ün üzerindeki her kayıtta **sessizce** kırpılıyordu. `.limit(500)`
kaldırıldı, artık yalnız `tumSatirlar()` yönetiyor.

**Kanıt (Deneme Firması, gerçek satırlarla):** 1200 test satırı eklenip
toplam 1203'e çıkarıldı. Eski sorgu deseni 500/1203 döndürüyordu (703 satır
sessizce kayıp); düzeltmeden sonra 1203/1203 tam geliyor. Test satırları
silindi, satır sayısı 3'e (özgün durum) geri döndü.

**Gelecek için not:** `urun_spesifikasyon_versiyonlari` yıllar içinde
onbinlerce satıra ulaşabilecek tek ekran — bugün `tumSatirlar()` yeterli ama
gerçek sunucu-taraflı sayfalama (arama + sayfa parametreli) gerekirse ~1 günlük
iş olarak işaretlendi, şu an yapılmadı.

Nöbetçiler bu turda da temiz: `qdl_nobetci_anon_execute()` → 0,
`qdl_nobetci_onay()` → 0.

### 16.09.2026 — Prod/staging config split (qdl-env.json)
BOY'daki desen (`_platform-ortak/README.md` > "Test ortamı") bu modüle taşındı.
`URS.html`: `SUPABASE_URL`/`SUPABASE_ANON_KEY` artık senkron XHR ile
`/qdl-env.json`'dan okunuyor, okunamazsa sessizce prod'da kalıyor.
`urun-onay.html` BİLİNÇLİ OLARAK dışarıda bırakıldı — o sayfa yalnızca prod'da
üretilen e-posta onay token'larını tüketiyor (ham `fetch` ile prod'a sabit),
bir staging ortamında anlamlı bir kullanım senaryosu yok. `master` branch
`qdl-env.json` prod'u işaret ediyor, yeni `staging` branch staging'i.
Commit: `c176b7e` (env-split), `dbcfb7e` (sürüm damgası), staging branch
`b51c103`. Cloudflare'in bu depodaki native Git entegrasyonu bilinen sebeple
(bkz. yukarıdaki "Cloudflare↔GitHub" notu) `staging` dalını otomatik
derlemedi; Management API ile elle `branch=staging` dağıtımı tetiklendi
(`3321ffa4`, build+deploy `success`). `.github/workflows/cloudflare-deploy.yml`
yalnız `master`'ı dinliyor — staging dalı için otomatik tetikleyici YOK,
gelecekte staging'e sık push olacaksa iş akışına `staging` dalı da eklenmeli.
Kanıt: `https://urun.qdataline.com/` → 200, `qdl-version.json` →
`2026.09.16-4`, `qdl-env.json` → prod URL. Staging: staging anon key ile
gerçek REST sorgusu 200 döndü.

## "Sorun bildir" — kullanıcı tetiklemeli bildirim (16.09.2026)

BOY'daki tek-modüllük pilot (bkz. BOY CLAUDE.md, commit `865d0cd`/`50d6457`/
`7fc5f84`) `URS.html`'e uyarlandı — URS'nin BOY'a en yakın yapısı (aynı
`LANG`/`I18N`/`t()`/`applyLangStatic()` deseni, aynı `openModal(html,genis)`/
`closeModal()` deseni) sayesinde neredeyse birebir taşındı. Sağ altta sabit
düğme, yalnız giriş sonrası görünür. Renk: modülün kendi `--leaf`(#65A30D)/
`--leaf-d`(#84CC16) lime marka gradyanı (zaten `.btn-leaf` sınıfında
kullanılıyordu — TASARIM_STANDARDI'ye göre platformdaki hiçbir başka modülle
çakışmıyor). Modül kodu `MODUL_KODU='urun'` — canlı `qdl_modul_katalog` ile
doğrulandı. Arka uç aynı: `public.qdl_musteri_bildirim_gonder`. ÖNEMLİ:
çalışma kopyası yalnız `C:\temp\qdataline-urun` — Drive'daki "Reçete ve
Spesifikasyon Yönetimi" klasörü bayat bir ayna, ona dokunulmadı.

## 16.09.2026 (ek) — Onboarding turu eklendi

Laboratuvar Ekipman Bakım Programı'ndaki spotlight+ipucu onboarding turu deseni URS'ye
port edildi. `URS.html` içine `URS_TOUR_STEPS`/`startUrsTour()` eklendi (6 adım: Menü,
Ürünler, Reçeteler, Spesifikasyonlar, Alerjen Matrisi, Sorun Bildir). `localStorage`
anahtarı `urun.tourDone`. Giriş sonrası (`afterLogin`) ilk kez otomatik açılır; sol
menüdeki "🧭 Turu göster" düğmesinden istenildiğinde tekrar başlatılabilir. Sürüm damgası
`node .../_platform-ortak/istemci/surum-damgala.cjs urun` ile 2026.09.16-7 olarak
yenilendi.

## 16.09.2026 (ek) — Standart boş-durum (empty state) bileşeni

Satışa hazırlık denetiminde bulunan eksik kapatıldı: liste ekranlarında sade
"Henüz ... yok" metni yerine standart `emptyState(title, desc, ctaLabel,
ctaOnclick)` yardımcı fonksiyonu eklendi (ikon + başlık + açıklama + CTA
butonu, `.empty-state` CSS sınıfı). Uygulanan 4 ekran: Ürünler (`+ Yeni
Ürün`), Reçeteler (Ürünler'e Git), Spesifikasyonlar (Ürünler'e Git),
Sertifikalar (`+ Sertifika Ekle`). Sürüm damgası 2026.09.16-8.

## 17.09.2026 — Bağımsız denetim: P1 onay unvanı DB kısıtı + hata mesajı

Platformdaki 6 modül için paralel ajanla yaptırılan bağımsız güvenlik/kalite
denetiminde URS'de P0 bulunmadı (RLS tüm `urun_*` tablolarında sağlam,
storage bucket tenant-kilitli, e-posta onay akışı atomik). 2 P1 bulundu,
ikisi de düzeltildi:

**P1-1 — DÜZELTİLDİ:** "Onaylayan Unvanı" zorunluluğu yalnız istemci
tarafında kontrol ediliyordu (`URS.html:1399-1400`); doğrudan bir REST/
PostgREST çağrısı unvan boşken spesifikasyonu "Onaylı" yapabilirdi.
`urun_spec_kaydet_trg()`'e, `durum='Onaylı'` geçişinde `onaylayan_rol`
boşsa `URS_ONAYLAYAN_UNVAN_GEREKLI` reddi eklendi
(`sql/urs_onay_unvani_zorunlu.sql`). Canlı Supabase'e uygulandı,
rollback'li bir test işlemiyle (2/2 PASS, kalıntı 0) doğrulandı.

**P1-2 — DÜZELTİLDİ:** `gorselYukle()`, `musteriSpecYukle()`,
`aiBesinDegeriUret()`, `firmaLogoYukle()` fonksiyonlarında ham `e.message`
doğrudan ekrana yazılıyordu (Storage/Edge Function hatalarının iç detayı
sızabilir). Dördü de mevcut `ursHata()` çevirmenine yönlendirildi.

Commit `be18eb5`, `git push` sonrası Cloudflare Pages otomatik deploy'u
ile canlıya yansıdı (`urun.qdataline.com`), curl ile teyit edildi.

**Önemli hatırlatma:** Google Drive'daki `Reçete ve Spesifikasyon
Yönetimi\` klasörü ESKİ/senkronize olmayan bir kopya — bu depo
(`C:\temp\qdataline-urun`) GERÇEK çalışma kopyasıdır. Bkz.
`_OKU-BURASI-GIT-DEPOSU-DEGIL.md`.

Rapor: proje hafızası `project_6_modul_denetim_turu_2026_09_17`.


## EK (24.09.2026) — E2E test turu düzeltmeleri
- EDITOR kısıtı: ürün/sertifika/spesifikasyon silme ve firma ayarları (urun_firma_bilgileri) yalnız ADMIN (DB: _platform-ortak/sql/25_editor_kisitlari.sql); urun_receteler = reçete KALEMİ, kapsam dışı (düzenleyici kalem silebilir). Arayüzde [data-urunsil]/[data-sertsil]/Ayarlar menüsü editöre gizli.


## EK (25.09.2026) — Platform geneli turu (takvim, uyarı, KPI, İngilizce, E2E P2, demo veri)
- **Ortak istemci dosyaları** (kaynak: `_platform-ortak/istemci/`, modül kökünde birebir kopya, qdl-hata.js ile aynı yöntem):
  - `qdl-takvim.js` — tüm `input[type=date|datetime-local]` için modül renginde (CSS `--leaf`) takvim, Pazartesi başlangıç. Alan türüne/değerine dokunmaz. Hariç: `data-qdl-takvim="yok"`.
  - `qdl-dialog.js` — `qdlDialog()`, `qdlKirliMi(kok)`, `qdlKapatSor(kok)`: form dışına tıklama / Vazgeç / ✕ → YALNIZ gerçek değişiklik varsa modül renkli "Kaydedilmemiş değişiklikler" penceresi.
  - `qdl-ceviri.js` + modüle özel `qdl-en.js` — `<html lang="en">` iken ekrandaki Türkçe arayüz metinlerini (ve placeholder/title) sözlükten çevirir; TR'ye dönünce geri yazar. Dil değişiminde `document.documentElement.lang` güncellenmeli. Yeni arayüz metni eklenince `qdl-en.js`'e de eklenmeli (tarama aracı: `C:/temp/pw/entara2.js`).
- **Tıklanabilir KPI**: ana sayfa kartları ilgili listeyi (gerekirse süzülmüş, üstte "Filtre: … ✕ Filtreyi kaldır" şeridi) açar; menüden geçişte filtre sıfırlanır.
- **Sayı alanları** yeni kayıtta 0 yerine boş başlar (kayıtta boş = 0/varsayılan).
- **Test araçları**: `C:/temp/pw/kpitest.js`, `entara2.js`, `final.js` (puppeteer-core + Edge; service_role ile demo.yonetici magic link → SSO; yerel HTML canlı adrese enjekte edilerek yayından önce test). CSP: `cspsync.js` (HEAD~1→HEAD), `cspadd.js` (eksik hash ekle), `cspcheck.js`.
- URS: KPI → ürünler (aktif/reçeteli/alerjenli), spesifikasyonlar (Onaylı/Taslak), sertifikalar (uyarı). Menü sayaçları buildNav sonrası 0'a düşmüyor (B-25). Vazgeç/✕ qdlKapatSor, boş ürün adında vurgu, html lang. urun-onay.html hash eksikti → eklendi. E2E ürün+spec silindi.
- ✔ TAMAMLANDI (kullanıcı notları 25.09, hepsi canlı): ürün satırı tıklanabilir detay, yazdırmada arka plan, spec alanları büyük, işletme kayıt/onay no, birim listesi+ayarlar, çoklu net miktar/palet/ambalaj (+dökme), raf ömrü birimi, ürün ölçüsü, bileşik hammadde, reçeteden yalnız ad (azalan), EN/tema/tur standardı, Ar-Ge deneme modülü.
- ✔ AR-GE PROJELERİ (25.09 canlı, commit 6be9d67/4e0a073/6556ef3; geri dönüş: 6be9d67^): menü "Ar-Ge Projeleri" (sayaç = açık proje). Tablolar sql/12_arge_projeleri.sql: urun_arge_projeleri (aşama: Fikir→Formülasyon→Deneme Üretimi→Duyusal/Lab→Raf Ömrü→Onay→Ürüne Dönüştürüldü/İptal, kazanan_deneme_id, donusen_urun_id), urun_arge_denemeleri (recete jsonb, parametreler, sonuc, durum, dosyalar → urun-belgeler/<tenant>/arge/), urun_arge_olaylar (Not/Duyusal[puanlar tat/koku/doku/gorunum 1-9]/Lab/Raf Ömrü[raf_gun, uygun]/Karar/Aşama). RLS standart 4'lü (has_modul urun + is_editor). Proje penceresi 4 sekme: Zaman Çizelgesi (olay+deneme birleşik, tarihe göre), Denemeler (yeni deneme önceki reçeteyi kopyalar, ⇄ önceki ile karşılaştır: +/−/Yeni/Çıkarıldı, ⭐ kazanan), Testler, Karar (aşama değiştir → Aşama olayı; "Ürüne Dönüştür" → urun_urunler + urun_receteler açar, proje aşaması Ürüne Dönüştürüldü). İlk deneme eklenince Fikir/Formülasyon → Deneme Üretimi otomatik. Demo: ARG-2026-DEMO-02 (Duyusal/Lab) + test akışıyla oluşan "Şeker ilavesiz yulaflı bar" (dönüştürülmüş). EN sözlük qdl-en.js'e eklendi. Test: C:/temp/pw/arge-test.js (yerel) ve arge-live.js (canlı, EN). Bilinçli ilk sürüm dışı: maliyet hesabı, müşteri numunesi takibi.
- ✔ AR-GE EK (25.09 canlı, 25ea769): deneme reçetesinde satır başına birim fiyat (₺/kg, ops.) → hammadde maliyeti (Σ oran×fiyat) deneme formunda, deneme listesinde, karşılaştırmada ve Karar sekmesinde; müşteri numunesi takibi = olay türü 'Numune' (başlık=müşteri, geri bildirim: Onaylandı/Reddedildi/bekleniyor), sql/13_arge_numune.sql (tur check). Test: C:/temp/pw/arge-test2.js.
- ✔ YILLIK GÖZDEN GEÇİRME E-POSTASI (25.09 canlı): public.urun_yillik_inceleme_notify() (security definer, authenticated'a EXECUTE yok) + pg_cron 'urun_yillik_inceleme_notify' 0 7 * * * (≈10:00 TR). Alıcı: urun_firma_bilgileri.ust_yonetici_eposta (boşsa gönderilmez). Onaylı spec'in sonraki_inceleme_tarihi'ne 30/7/0 gün kala girdiği gün, vadesi geçmiş varsa her pazartesi; mailde 30 gün içindeki + geçmiş hepsi. Test: DO bloğu içinde sahte adresle çağrılıp net.http_request_queue gövdesi okundu, raise ile geri alındı (gerçek mail gitmedi). Göç öncesi onaylanmış 4 spec'te sonraki_inceleme_tarihi boştu → onay_tarihi+365 ile dolduruldu (tetikleyiciler yalnız işlem içinde kapatıldı; versiyon artmadı). sql/14.
- ✔ REÇETE KALEMİ BELGELERİ (25.09 canlı): urun_receteler.dosyalar jsonb [{yol,ad,tur: Teknik Föy/MSDS/Sertifika/Diğer}] + raf_omru text (sql/15). Hammadde formunda tür seç + yükle (urun-belgeler/<tenant>/recete/<urun>/, 15 MB sınırı), reçete tablosunda 'Proses / Belge' sütununda 📎 sayısı + ⏳ raf ömrü. Test: C:/temp/pw/rk-test.js (demo Buğday Unu'na demo-teknik-foy.pdf eklendi).
