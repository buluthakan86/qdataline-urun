-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Faz 3: gelişmiş spesifikasyon alanları
-- (11.09.2026, kullanıcı geri bildirimi sonrası)
--
-- Eklenenler:
-- 1) Fiziksel-Kimyasal ve Mikrobiyolojik limitler artık serbest metin yerine
--    YAPILANDIRILMIŞ satırlar (parametre/min/max/birim) olarak girilebiliyor.
--    ESKİ metin kolonları (fiziksel_kimyasal_limitler, mikrobiyolojik_limitler)
--    SİLİNMEDİ — "Ek Not" olarak arayüzde kalmaya devam ediyor (geriye dönük
--    uyumluluk, mevcut demo veri kaybolmasın diye).
-- 2) Duyusal kriterler artık varsayılan olarak Tat/Koku/Doku/Görünüş 4 satırı
--    ile geliyor, her birine açıklama yazılabiliyor (yapılandırılmış jsonb).
-- 3) Yasal dayanak/mevzuat listesi (çoğaltılabilir).
-- 4) Gramaj + palet seçenekleri (aynı üründe farklı gramaj/palet kombinasyonu).
-- 5) Ambalaj malzeme seçenekleri (OPP-CPP, PE gibi, çoklu etiket).
-- 6) Ürün görselleri için Storage bucket (urun-belgeler, İSG/BOY/MOC ile aynı
--    private+tenant-klasörlü RLS deseni) + spesifikasyona görsel yolu listesi.
-- ============================================================================
set search_path = public;

alter table public.urun_spesifikasyonlari
  add column if not exists fiziksel_kimyasal_parametreler jsonb not null default '[]'::jsonb,
  add column if not exists mikrobiyolojik_parametreler jsonb not null default '[]'::jsonb,
  add column if not exists duyusal_kriterler_yapilandirilmis jsonb not null default '[]'::jsonb,
  add column if not exists yasal_dayanaklar jsonb not null default '[]'::jsonb,
  add column if not exists gramaj_secenekleri jsonb not null default '[]'::jsonb,
  add column if not exists ambalaj_secenekleri jsonb not null default '[]'::jsonb,
  add column if not exists gorsel_yollari jsonb not null default '[]'::jsonb;

-- Versiyon geçmişi özetine yeni alanları da ekle (03/05'teki fonksiyonun devamı).
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

-- ---------------------------------------------------------------------------
-- Ürün görselleri Storage bucket'ı (private, tenant-klasörlü) — İSG/BOY/MOC
-- ile birebir aynı desen.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('urun-belgeler', 'urun-belgeler', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='urun belgeler read') then
    create policy "urun belgeler read" on storage.objects for select to authenticated
      using (bucket_id = 'urun-belgeler' and public.has_modul('urun') and (storage.foldername(name))[1] = (public.current_tenant_id())::text);
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='urun belgeler insert') then
    create policy "urun belgeler insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'urun-belgeler' and public.has_modul('urun') and public.is_editor() and (storage.foldername(name))[1] = (public.current_tenant_id())::text);
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='urun belgeler delete') then
    create policy "urun belgeler delete" on storage.objects for delete to authenticated
      using (bucket_id = 'urun-belgeler' and public.has_modul('urun') and public.is_editor() and (storage.foldername(name))[1] = (public.current_tenant_id())::text);
  end if;
end $$;

-- ============================================================================
-- BİTTİ. Eklenen: 7 yeni jsonb kolon (urun_spesifikasyonlari), Storage bucket
-- urun-belgeler + 3 RLS politikası. Hiçbir mevcut kolon SİLİNMEDİ/DEĞİŞMEDİ.
-- ============================================================================
