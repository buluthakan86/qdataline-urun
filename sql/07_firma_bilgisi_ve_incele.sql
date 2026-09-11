-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Faz 4 (11.09.2026, aynı gün ikinci tur)
--
-- 1) urun_firma_bilgileri — tenant başına 1 satır: firma adı/adres/logo/üst
--    yönetici e-postası. PDF üst bilgisinde ve yıllık gözden geçirme
--    bildiriminde kullanılacak.
-- 2) urun_spesifikasyonlari.sonraki_inceleme_tarihi — onay tarihinden +365 gün
--    otomatik hesaplanır (trigger), Anasayfa'da "gözden geçirme zamanı gelen
--    spesifikasyonlar" paneli için.
-- 3) urun_receteler.proses_talimati — hammaddenin prosese NASIL eklendiği
--    (aşama/koşul/sıvı-katı çözünme/karıştırma süresi) serbest metin.
-- ============================================================================
set search_path = public;

create table if not exists public.urun_firma_bilgileri (
  tenant_id       uuid primary key references public.tenants(id),
  firma_adi       text not null default '',
  adres           text not null default '',
  logo_url        text not null default '',
  telefon         text not null default '',
  eposta          text not null default '',
  ust_yonetici_ad text not null default '',
  ust_yonetici_eposta text not null default '',
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'urun_firma_bilgileri_stamp') then
    create trigger urun_firma_bilgileri_stamp before insert or update on public.urun_firma_bilgileri
      for each row execute function public.urun_stamp();
  end if;
  execute 'alter table public.urun_firma_bilgileri enable row level security';
  if not exists (select 1 from pg_policies where tablename='urun_firma_bilgileri' and policyname='urun_firma_bilgileri read') then
    create policy "urun_firma_bilgileri read" on public.urun_firma_bilgileri for select to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
  if not exists (select 1 from pg_policies where tablename='urun_firma_bilgileri' and policyname='urun_firma_bilgileri insert') then
    create policy "urun_firma_bilgileri insert" on public.urun_firma_bilgileri for insert to authenticated
      with check (tenant_id = public.current_tenant_id() and public.has_modul('urun') and public.is_editor());
  end if;
  if not exists (select 1 from pg_policies where tablename='urun_firma_bilgileri' and policyname='urun_firma_bilgileri update') then
    create policy "urun_firma_bilgileri update" on public.urun_firma_bilgileri for update to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun') and public.is_editor())
      with check (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
end $$;

alter table public.urun_spesifikasyonlari
  add column if not exists sonraki_inceleme_tarihi date;

alter table public.urun_receteler
  add column if not exists proses_talimati text not null default '';

-- Onaya geçişte "sonraki inceleme tarihi" = onay tarihinden +365 gün otomatik.
-- Taslak'a dönüşte temizlenir (03/05'teki trigger'ın devamı).
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
    new.spec_kodu := old.spec_kodu;
  end if;

  if new.durum = 'Onaylı' and (tg_op = 'INSERT' or old.durum is distinct from 'Onaylı') then
    if auth.uid() is not null then
      select full_name into v_ad from public.profiles where id = auth.uid();
      new.onaylayan_ad := coalesce(v_ad, '');
    end if;
    new.onay_tarihi := now();
    new.sonraki_inceleme_tarihi := (now() + interval '365 days')::date;
  elsif new.durum = 'Taslak' then
    new.onaylayan_ad := '';
    new.onay_tarihi := null;
    new.onaylayan_rol := '';
    new.sonraki_inceleme_tarihi := null;
  end if;

  return new;
end
$$;

-- ============================================================================
-- BİTTİ. Eklenen: urun_firma_bilgileri (yeni tablo), sonraki_inceleme_tarihi
-- (otomatik +365 gün), urun_receteler.proses_talimati. Yıllık gözden geçirme
-- HATIRLATMA E-POSTASI bu migration'a DAHİL DEĞİL — ayrı bir Edge Function +
-- zamanlama gerektiriyor, CLAUDE.md'de "sıradaki iş" olarak not edildi.
-- ============================================================================
