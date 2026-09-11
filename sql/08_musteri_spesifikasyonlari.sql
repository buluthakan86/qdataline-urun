-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Müşteri Spesifikasyonları (11.09.2026)
--
-- Müşterinin kendi gönderdiği spesifikasyon/istek dosyalarının (PDF/Word/Excel)
-- ürün spesifikasyonuna eklenip saklanabilmesi. Mevcut `urun-belgeler` bucket'ı
-- kullanılıyor (yeni bucket YOK), yalnız yeni bir yol öneki (`musteri-spec/`).
-- ============================================================================
set search_path = public;

alter table public.urun_spesifikasyonlari
  add column if not exists musteri_spesifikasyonlari jsonb not null default '[]'::jsonb;

create or replace function public.urun_spec_versiyon_kaydet_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
  v_ozet text := '';
begin
  if auth.uid() is not null then
    select full_name into v_ad from public.profiles where id = auth.uid();
  end if;

  if tg_op = 'UPDATE' then
    if old.durum is distinct from new.durum then v_ozet := v_ozet || 'Durum: ' || old.durum || ' → ' || new.durum || '. '; end if;
    if old.gida_adi is distinct from new.gida_adi then v_ozet := v_ozet || 'Gıda adı değişti. '; end if;
    if old.net_miktar is distinct from new.net_miktar then v_ozet := v_ozet || 'Net miktar değişti. '; end if;
    if old.enerji_kcal is distinct from new.enerji_kcal or old.yag_g is distinct from new.yag_g
       or old.doymus_yag_g is distinct from new.doymus_yag_g or old.karbonhidrat_g is distinct from new.karbonhidrat_g
       or old.seker_g is distinct from new.seker_g or old.protein_g is distinct from new.protein_g
       or old.tuz_g is distinct from new.tuz_g or old.trans_yag_g is distinct from new.trans_yag_g then
      v_ozet := v_ozet || 'Beslenme bildirimi güncellendi. ';
    end if;
    if old.alerjen_beyani is distinct from new.alerjen_beyani then v_ozet := v_ozet || 'Alerjen beyanı güncellendi. '; end if;
    if old.fiziksel_kimyasal_parametreler is distinct from new.fiziksel_kimyasal_parametreler
       or old.mikrobiyolojik_parametreler is distinct from new.mikrobiyolojik_parametreler
       or old.fiziksel_kimyasal_limitler is distinct from new.fiziksel_kimyasal_limitler
       or old.mikrobiyolojik_limitler is distinct from new.mikrobiyolojik_limitler then
      v_ozet := v_ozet || 'Teknik limitler güncellendi. ';
    end if;
    if old.duyusal_kriterler_yapilandirilmis is distinct from new.duyusal_kriterler_yapilandirilmis then
      v_ozet := v_ozet || 'Duyusal kriterler güncellendi. ';
    end if;
    if old.yasal_dayanaklar is distinct from new.yasal_dayanaklar then v_ozet := v_ozet || 'Yasal dayanaklar güncellendi. '; end if;
    if old.gramaj_secenekleri is distinct from new.gramaj_secenekleri then v_ozet := v_ozet || 'Gramaj/palet seçenekleri güncellendi. '; end if;
    if old.ambalaj_secenekleri is distinct from new.ambalaj_secenekleri then v_ozet := v_ozet || 'Ambalaj seçenekleri güncellendi. '; end if;
    if old.gorsel_yollari is distinct from new.gorsel_yollari then v_ozet := v_ozet || 'Ürün görselleri güncellendi. '; end if;
    if old.musteri_spesifikasyonlari is distinct from new.musteri_spesifikasyonlari then v_ozet := v_ozet || 'Müşteri spesifikasyonu dosyaları güncellendi. '; end if;
    if old.ozel_alanlar is distinct from new.ozel_alanlar then v_ozet := v_ozet || 'Özel alanlar güncellendi. '; end if;
    if old.onaylayan_rol is distinct from new.onaylayan_rol and new.onaylayan_rol <> '' then
      v_ozet := v_ozet || new.onaylayan_rol || ' unvanıyla onaylandı. ';
    end if;
    if v_ozet = '' then v_ozet := 'Küçük alan güncellemesi.'; end if;
  else
    v_ozet := 'İlk oluşturma.';
  end if;

  insert into public.urun_spesifikasyon_versiyonlari (tenant_id, spesifikasyon_id, versiyon_no, icerik, olusturan_ad, degisiklik_notu, neler_degisti)
  values (new.tenant_id, new.id, new.versiyon_no, to_jsonb(new), coalesce(v_ad, ''), coalesce(new.kaydetme_notu, ''), v_ozet);
  return new;
end
$$;

-- ============================================================================
-- BİTTİ. Eklenen: urun_spesifikasyonlari.musteri_spesifikasyonlari (jsonb dizi).
-- ============================================================================
