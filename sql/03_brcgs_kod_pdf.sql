-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Faz 1 devamı (2026-09-09, aynı gün)
-- Kullanıcı isteği: BRCGS/gıda güvenliği ek alanları + otomatik bağımsız spec
-- kodu + revizyon değişiklik notu.
--
-- BRCGS Packaging/Food Global Standard'ın ürün spesifikasyonlarında istediği,
-- TGK'nın zorunlu KILMADIĞI ama gıda güvenliği denetimlerinde sık aranan alanlar:
-- hedef tüketici grubu (ör. genel tüketici/bebek-çocuk/alerjik hassas grup),
-- taşıma koşulları (depolama koşulundan AYRI — sevkiyat sıcaklığı vb.),
-- yazılı alerjen beyanı (yalnız reçeteden hesaplanan liste değil, resmi bir
-- cümle: "süt ve gluten içerir; aynı hatta yerfıstığı işlenir" gibi),
-- çapraz bulaşma riski notu.
-- ============================================================================
set search_path = public;

alter table public.urun_spesifikasyonlari
  add column if not exists spec_kodu text,
  add column if not exists hedef_tuketici_grubu text not null default '',
  add column if not exists tasima_kosullari text not null default '',
  add column if not exists alerjen_beyani text not null default '',
  add column if not exists capraz_bulasma_riski text not null default '',
  -- "Bu kaydetmede ne değişti?" — istemcinin her UPDATE'te normal bir alan
  -- olarak gönderdiği serbest metin (Doküman Yönetimi'ndeki degisiklik_notu
  -- ile aynı fikir). Ayrı bir RPC/oturum değişkeni GEREKMEDİ — trigger bunu
  -- doğrudan NEW'den okuyup versiyon geçmişine kopyalar.
  add column if not exists kaydetme_notu text not null default '';

alter table public.urun_spesifikasyon_versiyonlari
  add column if not exists neler_degisti text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname='urun_spesifikasyonlari_spec_kodu_uniq') then
    alter table public.urun_spesifikasyonlari
      add constraint urun_spesifikasyonlari_spec_kodu_uniq unique (tenant_id, spec_kodu);
  end if;
end $$;

-- Otomatik bağımsız spec kodu (SPEC-0001, SPEC-0002, ...) — tenant başına atomik
-- sayaç, editör hiçbir zaman elle girmez/değiştiremez (yalnız INSERT'te atanır).
create or replace function public.urun_spec_kaydet_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
  v_sonraki int;
begin
  if tg_op = 'INSERT' then
    new.versiyon_no := 1;
    select coalesce(max(nullif(regexp_replace(spec_kodu, '\D', '', 'g'), '')::int), 0) + 1
      into v_sonraki
      from public.urun_spesifikasyonlari
     where tenant_id = new.tenant_id;
    new.spec_kodu := 'SPEC-' || lpad(v_sonraki::text, 4, '0');
  else
    new.versiyon_no := coalesce(old.versiyon_no, 0) + 1;
    new.spec_kodu := old.spec_kodu; -- istemci ne gönderirse göndersin değişmez
  end if;

  if new.durum = 'Onaylı' and (tg_op = 'INSERT' or old.durum is distinct from 'Onaylı') then
    if auth.uid() is not null then
      select full_name into v_ad from public.profiles where id = auth.uid();
      new.onaylayan_ad := coalesce(v_ad, '');
    end if;
    new.onay_tarihi := now();
  elsif new.durum = 'Taslak' then
    new.onaylayan_ad := '';
    new.onay_tarihi := null;
  end if;

  return new;
end
$$;

-- Versiyon geçmişine "neler değişti" — istemcinin normal bir alan olarak
-- gönderdiği serbest metin (kaydetme_notu) + otomatik alan-bazlı özet birlikte
-- yazılır.
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
    if old.mikrobiyolojik_limitler is distinct from new.mikrobiyolojik_limitler
       or old.fiziksel_kimyasal_limitler is distinct from new.fiziksel_kimyasal_limitler
       or old.duyusal_kriterler is distinct from new.duyusal_kriterler then
      v_ozet := v_ozet || 'Teknik limitler güncellendi. ';
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
-- BİTTİ. Eklenen: spec_kodu (otomatik, SPEC-0001...), hedef_tuketici_grubu,
-- tasima_kosullari, alerjen_beyani, capraz_bulasma_riski, versiyon geçmişine
-- neler_degisti (otomatik alan-bazlı özet). DEĞİŞTİRİLEN/SİLİNEN mevcut nesne
-- YOKTUR — yalnızca CREATE OR REPLACE ile önceki trigger fonksiyonları
-- genişletildi.
-- ============================================================================
