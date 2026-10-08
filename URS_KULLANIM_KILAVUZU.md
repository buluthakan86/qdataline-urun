# Reçete ve Spesifikasyon Yönetimi — Kullanım Kılavuzu

Bu kılavuz, Reçete ve Spesifikasyon Yönetimi (URS) modülünü (urun.qdataline.com) ilk kez kullanan biri için hazırlanmıştır. Gıda üreticileri için ürün, reçete, ürün spesifikasyonu, alerjen bilgisi, sertifika ve Ar-Ge çalışmalarını tek yerde tutar.

## 1. Giriş, roller ve menü

- Firma hesabınızla giriş yapıp merkezden **Reçete ve Spesifikasyon** modülünü açın. Veriler yalnız firmanıza aittir.
- **ADMIN** ve **EDITOR** kayıt ekler ve değiştirir; **VIEWER** yalnız görüntüler. Spesifikasyon onayı için bir **ADMIN** yönetici gerekir (bkz. bölüm 5).
- Sol menü:
  - **Genel:** Anasayfa
  - **Ürün Yönetimi:** Ürünler, Reçeteler, Spesifikasyonlar, Alerjen Matrisi, Sertifikalar, Ar-Ge Projeleri
  - **Sistem:** Ayarlar
- Menüdeki sayaçlar (taslak spesifikasyon sayısı, süresi yaklaşan sertifika sayısı, Ar-Ge proje sayısı) dikkat isteyen kayıtları gösterir.
- Sağ üstten dil (TR/EN) ve açık/koyu tema değiştirilebilir.

## 2. Önerilen başlangıç sırası

1. **Ayarlar:** firma adı, adres, logo ve üst yönetici bilgilerini girin. Spesifikasyon PDF'lerinin üst bilgisinde ve onay e-postalarında kullanılır.
2. **Ürünler:** ürünlerinizi ekleyin.
3. **Reçeteler:** her ürünün hammadde kalemlerini girin.
4. **Spesifikasyonlar:** ürün için spesifikasyon hazırlayıp onaya gönderin.
5. **Sertifikalar:** Helal, BRCGS, IFS gibi belgelerinizin geçerlilik tarihlerini girin.

## 3. Ürünler ve Reçeteler

- **Ürünler:** **Yeni Ürün** ile ad, kod ve temel bilgiler girilir.
- **Reçeteler:** her ürün için kalemler (hammadde, oran %) eklenir. Kalem formunda isteğe bağlı **Tedarikçi** adı yazılabilir. Hammaddedeki alerjenler işaretlenir; **Alerjen Matrisi** bu işaretlerden hesaplanır.
- Onay sırasında reçete toplamı %100'den belirgin biçimde farklıysa sistem **uyarı** verir.

## 4. Spesifikasyonlar

**Yeni Spesifikasyon** ile ürüne bağlı bir spesifikasyon açılır. Başlıca bölümler:
- **Fiziksel-kimyasal** ve **mikrobiyolojik** limitler: parametre, minimum, maksimum, birim satırları.
- **Duyusal kriterler:** varsayılan olarak Tat, Koku, Doku, Görünüş satırları gelir; her birine açıklama yazılır.
- **Beslenme bildirimi (100 g/ml başına):** yağ altındaki doymuş yağ ve karbonhidrat altındaki şeker gibi alt kalemler girintili gösterilir.
- **Yasal dayanaklar:** mevzuat listesi; sık kullanılan Türk Gıda Kodeksi yönetmelikleri tek tıkla eklenir.
- **Gramaj / palet seçenekleri:** aynı ürünün farklı gramajları ve her birinin palet ölçüsü ve adedi tek spesifikasyonda tutulur.
- **Ambalaj seçenekleri:** malzeme etiketleri ve boyut/katman notu.
- **Özel alanlar:** ürüne özgü ek bilgi için serbest "ad–değer" satırları.
- **Ürün görselleri** ve **katkı belgeleri** (dosya eki) yüklenebilir.

### 🏷 Etiket Metni
Spesifikasyon detayındaki **Etiket Metni** düğmesi, reçete ve spesifikasyon verisinden Türk Gıda Kodeksi biçiminde içindekiler, alerjen (büyük harfle vurgulu) ve beslenme metnini üretir. Kopyalanabilir ve yazdırılabilir.

### PDF / Yazdırma
Spesifikasyon, firma adı ve logosu üst bilgisiyle yazdırılır. Oluşturulma, son revizyon ve sonraki inceleme tarihleri gösterilir.

## 5. Onay ve sürümler

Spesifikasyon durumları: **Taslak → Onaylı**.
- **Onayla ve Kaydet:** onaylayan kişinin **unvanı/rolü** (ör. "Kalite Müdürü") zorunludur; onaylayan adı ve tarihi sistem tarafından kaydedilir.
- **Görev ayrılığı:** spesifikasyonu hazırlayan kişi **kendi spesifikasyonunu onaylayamaz**; onay başka bir ADMIN yöneticiye aittir. Bu kural veritabanında da uygulanır.
- **E-postadan onay:** Taslak kaydedildikten sonra **Onay İçin E-posta Gönder** ile Ayarlar'daki üst yönetici e-postasına bağlantı gider; alıcı giriş yapmadan **Onayla** veya **Reddet** diyebilir.
- **Sürümler:** Taslak'tan Onaylı'ya her geçişte sürüm numarası artar ve sürüm geçmişine kayıt düşer ("… unvanıyla onaylandı"). Onaylı'dan Taslak'a dönüşte onay bilgileri sıfırlanır.
- **Yıllık gözden geçirme:** onay tarihinden **365 gün sonrası** sonraki inceleme tarihi olarak atanır; tarih yaklaşınca e-posta hatırlatması gelir.

## 6. Alerjen Matrisi

Tüm ürünlerin alerjen içeriğini tek tabloda gösterir. Reçetelerdeki işaretlerden **canlı hesaplanır**, ayrıca veri girilmez. Çapraz bulaşma değerlendirmesi ve müşteri talepleri için kullanılır.

## 7. Sertifikalar

Helal, Organik, BRCGS, IFS, Kosher, ISO 22000 ve diğer belgeler tarih aralığıyla kaydedilir. Geçerlilik bitişine **60 gün** kala **Süresi Yaklaşıyor** rozeti çıkar; menü sayacı da bunu gösterir.

## 8. Ar-Ge Projeleri

Yeni ürün geliştirme çalışmalarını fikirden ürüne taşır. Proje kartında sorumlu, başlangıç ve hedef tarihi bulunur. Proje detayında dört sekme vardır:
- **Zaman Çizelgesi:** projenin olayları.
- **Denemeler:** her deneme için reçete (hammadde ve oran) ve durum kaydedilir.
- **Testler:** denemelerin test sonuçları.
- **Karar:** proje **aşaması** seçilir: Fikir, Formülasyon, Deneme Üretimi, Duyusal/Lab, Raf Ömrü, Onay, Ürüne Dönüştürüldü, İptal. Kazanan deneme işaretlenir.

**Ürüne Dönüştür:** Kazanan deneme seçiliyse bu düğme, denemenin reçetesiyle yeni bir **ürün ve reçete** oluşturur. İşlem tek adımda ve birlikte yapılır (yarım kalmaz). Spesifikasyonu daha sonra ürün kartından başlatırsınız.

## 9. Ayarlar

Firma adı, adres, logo, üst yönetici adı ve e-postası. Logo PDF'lerin üst bilgisinde, üst yönetici e-postası onay bağlantılarında kullanılır.

## 10. Sık karşılaşılan durumlar

| Durum | Neden / çözüm |
|---|---|
| Kendi spesifikasyonumu onaylayamıyorum | Görev ayrılığı: onay başka bir ADMIN yöneticiye aittir. |
| Onayla'ya basınca unvan istiyor | Onaylayan rol/unvan zorunludur (ör. Kalite Müdürü). |
| Reçete toplamı uyarısı | Kalem oranları %100'ü vermiyor; kontrol edin. |
| Ürüne Dönüştür görünmüyor | Önce Karar sekmesinde kazanan denemeyi seçin. |
| Onay e-postası gitmiyor | Ayarlar'da üst yönetici e-postasını girin. |
| Aynı ürün birden fazla oluştu | Kaydet düğmesine art arda basmayın; çift tıklama korumalıdır ama listeyi kontrol edin. |
