-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Faz 1 (MVP) kurulumu
-- (2026-09-09) — platformun 11. modülü.
--
-- >>> ORTAK PROJE (yeni proje AÇILMAZ) <<<
--   Ekipman projesi (ref: bbltvuxxtacrpgrqnfoh) — diğer tüm Qdataline
--   modülleriyle aynı proje. Modül kodu: 'urun'.
--
-- KAPSAM (kullanıcı kararı, 09.09.2026): Tedarikçi Yönetim Sistemi'nin
-- COA/belge modülünden BİLİNÇLİ OLARAK AYRI bir modül — kullanıcı bunu
-- reçete/formülasyon yönetimiyle birlikte, kendi başına büyüyebilecek bir
-- modül olarak istedi (araştırma raporu "Tedarikçi'ye eklenti" önermişti,
-- kullanıcı bilinçli olarak ayrı modülü seçti).
--
-- 1) urun_urunler       — ürün ana kaydı
-- 2) urun_receteler     — bir ürünün reçetesi/formülasyonu (hammadde + oran% +
--                         alerjen bayrakları), sıra_no = TGK'nın istediği
--                         "azalan ağırlık sırası" (editör bu sırada girer)
-- 3) urun_spesifikasyonlari — ürün başına 1-1 spec sheet: TGK Madde 9 zorunlu
--                         bilgiler + Madde 35 beslenme bildirimi + teknik
--                         limitler (fiziksel-kimyasal/mikrobiyolojik/duyusal)
--                         + ambalaj spesifikasyonu. Kaynak: TGK Gıda Etiketleme
--                         ve Tüketicileri Bilgilendirme Yönetmeliği madde 9/35
--                         (09.09.2026'da resmi/birincil kaynaklardan doğrulandı).
-- 4) urun_spesifikasyon_versiyonlari — APPEND-ONLY versiyon geçmişi (Doküman
--                         Yönetimi'ndeki ggd_sablon_versiyonlari ile AYNI
--                         desen) — her kayıtta trigger'la otomatik snapshot.
--
-- Alerjen matrisi AYRI BİR TABLO DEĞİL — `urun_receteler.alerjenler` alanından
-- istemci tarafında canlı hesaplanır (her zaman güncel, çift veri girişi yok).
-- ============================================================================

do $$
begin
  if to_regclass('public.tenants') is null then raise exception 'public.tenants YOK — yanlış proje?'; end if;
  if to_regprocedure('public.current_tenant_id()') is null then raise exception 'current_tenant_id() YOK.'; end if;
  if to_regprocedure('public.is_editor()') is null then raise exception 'is_editor() YOK.'; end if;
  if to_regprocedure('public.has_modul(text)') is null then raise exception 'has_modul() YOK.'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0) ORTAK STAMP FONKSİYONU (bu modüle özel, diğer modüllerin *_stamp() ile
--    aynı desen — created_by/updated_at otomatik)
-- ---------------------------------------------------------------------------
create or replace function public.urun_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := coalesce(new.created_at, now());
  end if;
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) ÜRÜNLER
-- ---------------------------------------------------------------------------
create table if not exists public.urun_urunler (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null default public.current_tenant_id() references public.tenants(id),
  kk           text not null,
  ad           text not null default '',
  kategori     text not null default '',
  aciklama     text not null default '',
  durum        text not null default 'Aktif' check (durum in ('Aktif','Pasif')),
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (tenant_id, kk)
);

-- ---------------------------------------------------------------------------
-- 2) REÇETE / FORMÜLASYON — bir ürünün hammadde kalemleri
-- ---------------------------------------------------------------------------
create table if not exists public.urun_receteler (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null default public.current_tenant_id() references public.tenants(id),
  kk            text not null,
  urun_id       uuid not null references public.urun_urunler(id) on delete cascade,
  hammadde_adi  text not null default '',
  oran_yuzde    numeric,
  alerjenler    jsonb not null default '[]'::jsonb,  -- TGK Ek-1'deki 14 alerjenden seçilenler
  sira_no       int not null default 0,               -- TGK: içindekiler azalan ağırlık sırasıyla listelenir
  notlar        text not null default '',
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists urun_receteler_urun_idx on public.urun_receteler(urun_id);

-- ---------------------------------------------------------------------------
-- 3) SPESİFİKASYON — ürün başına 1-1, TGK Madde 9 + Madde 35 alanları
-- ---------------------------------------------------------------------------
create table if not exists public.urun_spesifikasyonlari (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null default public.current_tenant_id() references public.tenants(id),
  kk                        text not null,
  urun_id                   uuid not null unique references public.urun_urunler(id) on delete cascade,

  -- TGK Madde 9 — zorunlu bilgiler (a-j bentleri)
  gida_adi                  text not null default '',   -- (a) gıdanın adı
  net_miktar                text not null default '',   -- (d) net miktar
  tavsiye_son_tuketim       text not null default '',   -- (e) TETT/SKT ifadesi (metin — "üretimden itibaren 12 ay" gibi)
  muhafaza_kosullari        text not null default '',   -- (f)
  isletme_adi_adres         text not null default '',   -- (g)
  isletme_kayit_no          text not null default '',   -- (ğ)
  mensei_ulke               text not null default '',   -- (h)
  kullanim_talimati         text not null default '',   -- (ı)
  alkol_derecesi            numeric,                     -- (i) yalnız %1,2 üzeri alkollü içeceklerde

  -- TGK Madde 35 — zorunlu beslenme bildirimi (100 g/ml başına)
  enerji_kcal               numeric,
  yag_g                     numeric,
  doymus_yag_g              numeric,
  karbonhidrat_g            numeric,
  seker_g                   numeric,
  protein_g                 numeric,
  tuz_g                     numeric,
  trans_yag_g               numeric,

  -- Teknik spesifikasyon (yönetmelik dışı, firma/müşteri talebi)
  fiziksel_kimyasal_limitler text not null default '',
  mikrobiyolojik_limitler    text not null default '',
  duyusal_kriterler          text not null default '',
  ambalaj_spesifikasyonu     text not null default '',
  raf_omru_ay                int,

  durum          text not null default 'Taslak' check (durum in ('Taslak','Onaylı')),
  versiyon_no    int not null default 1,
  onaylayan_ad   text not null default '',
  onay_tarihi    timestamptz,

  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- 4) VERSİYON GEÇMİŞİ — APPEND-ONLY (Doküman Yönetimi'ndeki desenle aynı)
-- ---------------------------------------------------------------------------
create table if not exists public.urun_spesifikasyon_versiyonlari (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null default public.current_tenant_id() references public.tenants(id),
  spesifikasyon_id  uuid not null references public.urun_spesifikasyonlari(id) on delete cascade,
  versiyon_no       int not null,
  icerik            jsonb not null default '{}'::jsonb,
  degisiklik_notu   text not null default '',
  olusturan_ad      text not null default '',
  created_at        timestamptz not null default now()
);
create index if not exists urun_spec_versiyon_spec_idx on public.urun_spesifikasyon_versiyonlari(spesifikasyon_id);

-- ---------------------------------------------------------------------------
-- 5) OTOMATİK VERSİYONLAMA + ONAY DAMGALAMA TRIGGER'I
--    Her INSERT/UPDATE'te versiyon_no otomatik artar ve tam satır jsonb olarak
--    versiyon geçmişine yazılır — istemci versiyon numarasını hiç göndermez.
-- ---------------------------------------------------------------------------
create or replace function public.urun_spec_kaydet_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
begin
  if tg_op = 'INSERT' then
    new.versiyon_no := 1;
  else
    new.versiyon_no := coalesce(old.versiyon_no, 0) + 1;
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

create or replace function public.urun_spec_versiyon_kaydet_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ad text;
begin
  if auth.uid() is not null then
    select full_name into v_ad from public.profiles where id = auth.uid();
  end if;
  insert into public.urun_spesifikasyon_versiyonlari (tenant_id, spesifikasyon_id, versiyon_no, icerik, olusturan_ad)
  values (new.tenant_id, new.id, new.versiyon_no, to_jsonb(new), coalesce(v_ad, ''));
  return new;
end
$$;

drop trigger if exists urun_spesifikasyonlari_kaydet_trg on public.urun_spesifikasyonlari;
create trigger urun_spesifikasyonlari_kaydet_trg
  before insert or update on public.urun_spesifikasyonlari
  for each row execute function public.urun_spec_kaydet_trg();

drop trigger if exists urun_spesifikasyonlari_versiyon_trg on public.urun_spesifikasyonlari;
create trigger urun_spesifikasyonlari_versiyon_trg
  after insert or update on public.urun_spesifikasyonlari
  for each row execute function public.urun_spec_versiyon_kaydet_trg();

-- ---------------------------------------------------------------------------
-- 6) TRIGGER (stamp) + RLS — standart 4'lü desen, has_modul('urun')+is_editor()
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['urun_urunler','urun_receteler','urun_spesifikasyonlari'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_stamp') then
      execute format('create trigger %I before insert or update on public.%I
                      for each row execute function public.urun_stamp()', t || '_stamp', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || ' read') then
      execute format('create policy %I on public.%I for select to authenticated
        using (tenant_id = public.current_tenant_id() and public.has_modul(''urun''))', t || ' read', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || ' insert') then
      execute format('create policy %I on public.%I for insert to authenticated
        with check (tenant_id = public.current_tenant_id() and public.has_modul(''urun'') and public.is_editor())', t || ' insert', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || ' update') then
      execute format('create policy %I on public.%I for update to authenticated
        using (tenant_id = public.current_tenant_id() and public.has_modul(''urun'') and public.is_editor())
        with check (tenant_id = public.current_tenant_id() and public.has_modul(''urun''))', t || ' update', t);
    end if;
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || ' delete') then
      execute format('create policy %I on public.%I for delete to authenticated
        using (tenant_id = public.current_tenant_id() and public.has_modul(''urun'') and public.is_editor())', t || ' delete', t);
    end if;
  end loop;
end $$;

-- Versiyon geçmişi: yalnız okuma (append-only, insert yalnız trigger'dan/service_role)
alter table public.urun_spesifikasyon_versiyonlari enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='urun_spesifikasyon_versiyonlari' and policyname='urun_spesifikasyon_versiyonlari read') then
    create policy "urun_spesifikasyon_versiyonlari read" on public.urun_spesifikasyon_versiyonlari for select to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
end $$;

-- ============================================================================
-- BİTTİ. Eklenen: urun_urunler, urun_receteler, urun_spesifikasyonlari (+ otomatik
-- versiyonlama trigger'ı), urun_spesifikasyon_versiyonlari (append-only). RLS:
-- has_modul('urun')+is_editor() standart desen. Alerjen matrisi ayrı tablo değil,
-- istemci tarafında urun_receteler.alerjenler'den canlı hesaplanır.
-- ============================================================================
