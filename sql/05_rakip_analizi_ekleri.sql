-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Apify rakip analizi (10.09.2026)
-- sonrası eklenen 4 özellik. Kullanıcı kararı: "tedarikçi sisteme girmesin,
-- alt yapısı hazır olsun" — bu yüzden tedarikçi PORTALI/girişi YAZILMADI,
-- yalnız reçete kaleminde tedarikçi adını kaydedecek bir alan eklendi
-- (ileride gerçek portal/hesap bağlanırsa bu alan referans noktası olur).
--
-- Eklenenler:
-- 1) urun_receteler.tedarikci_adi — hammadde tedarikçisi (serbest metin,
--    PORTAL YOK, yalnız bilgi amaçlı).
-- 2) urun_spesifikasyonlari.onaylayan_rol — onay imza zincirine unvan/rol
--    eklendi (SoftSpec/FoodLogiQ'daki çok rollü onay ihtiyacının sade
--    karşılığı — ayrı bir onay tablosu yerine mevcut versiyon geçmişine
--    otomatik yazılıyor).
-- 3) urun_spesifikasyonlari.ozel_alanlar (jsonb) — ürün kategorisine göre
--    değişen serbest ek bilgi alanları (SoftSpec'in "koşullu özel alan"
--    ihtiyacının, ayrı şema tablosu olmadan sade karşılığı).
-- 4) urun_sertifikalari — ürün bazında sertifika (Helal/Organik/BRCGS/IFS/
--    Kosher/Diğer) geçerlilik takibi.
--
-- 03_brcgs_kod_pdf.sql'deki iki trigger fonksiyonu (urun_spec_kaydet_trg,
-- urun_spec_versiyon_kaydet_trg) CREATE OR REPLACE ile genişletiliyor —
-- spec_kodu/versiyon/neler_degisti mantığı 03'teki HALİYLE AYNEN korunuyor,
-- yalnız onaylayan_rol + ozel_alanlar eklendi.
-- ============================================================================
set search_path = public;

-- ---------------------------------------------------------------------------
-- 1) Reçete kalemine tedarikçi adı (serbest metin, portal YOK)
-- ---------------------------------------------------------------------------
alter table public.urun_receteler
  add column if not exists tedarikci_adi text not null default '';

-- ---------------------------------------------------------------------------
-- 2) Onay imza zincirine unvan/rol + 3) esnek özel alanlar
-- ---------------------------------------------------------------------------
alter table public.urun_spesifikasyonlari
  add column if not exists onaylayan_rol text not null default '',
  add column if not exists ozel_alanlar jsonb not null default '[]'::jsonb;

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
    -- onaylayan_rol istemciden normal alan olarak gelir (ör. "Kalite Müdürü"),
    -- burada dokunulmaz — yalnız Taslak'a dönüşte temizlenir (aşağıda).
  elsif new.durum = 'Taslak' then
    new.onaylayan_ad := '';
    new.onay_tarihi := null;
    new.onaylayan_rol := '';
  end if;

  return new;
end
$$;

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
-- 4) Sertifika takibi (Helal/Organik/BRCGS/IFS/Kosher/Diğer), ürün başına çoklu
-- ---------------------------------------------------------------------------
create table if not exists public.urun_sertifikalari (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null default public.current_tenant_id() references public.tenants(id),
  kk                 text not null,
  urun_id            uuid not null references public.urun_urunler(id) on delete cascade,
  sertifika_turu     text not null default 'Diğer' check (sertifika_turu in ('Helal','Organik','BRCGS','IFS','Kosher','ISO 22000','Diğer')),
  sertifika_no       text not null default '',
  veren_kurum        text not null default '',
  gecerlilik_baslangic date,
  gecerlilik_bitis   date,
  dosya_url          text not null default '',
  notlar             text not null default '',
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists urun_sertifikalari_urun_idx on public.urun_sertifikalari(urun_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'urun_sertifikalari_stamp') then
    create trigger urun_sertifikalari_stamp before insert or update on public.urun_sertifikalari
      for each row execute function public.urun_stamp();
  end if;
  execute 'alter table public.urun_sertifikalari enable row level security';
  if not exists (select 1 from pg_policies where tablename='urun_sertifikalari' and policyname='urun_sertifikalari read') then
    create policy "urun_sertifikalari read" on public.urun_sertifikalari for select to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
  if not exists (select 1 from pg_policies where tablename='urun_sertifikalari' and policyname='urun_sertifikalari insert') then
    create policy "urun_sertifikalari insert" on public.urun_sertifikalari for insert to authenticated
      with check (tenant_id = public.current_tenant_id() and public.has_modul('urun') and public.is_editor());
  end if;
  if not exists (select 1 from pg_policies where tablename='urun_sertifikalari' and policyname='urun_sertifikalari update') then
    create policy "urun_sertifikalari update" on public.urun_sertifikalari for update to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun') and public.is_editor())
      with check (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
  if not exists (select 1 from pg_policies where tablename='urun_sertifikalari' and policyname='urun_sertifikalari delete') then
    create policy "urun_sertifikalari delete" on public.urun_sertifikalari for delete to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun') and public.is_editor());
  end if;
end $$;

-- ============================================================================
-- BİTTİ. Eklenen: urun_receteler.tedarikci_adi (portal YOK, yalnız bilgi),
-- urun_spesifikasyonlari.onaylayan_rol + ozel_alanlar, urun_sertifikalari
-- (yeni tablo, standart RLS). Etiket metni özelliği DB gerektirmiyor (URS.html
-- içinde istemci tarafında mevcut veriden türetiliyor).
-- ============================================================================
