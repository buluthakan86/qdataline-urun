# CLAUDE.md — Reçete ve Spesifikasyon Yönetimi (URS)

> **BU DOSYA PROJENİN TEK HAFIZASIDIR.** Yeni oturumda önce bu dosya okunmalı.

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
