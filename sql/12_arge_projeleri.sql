-- ============================================================================
-- Reçete ve Spesifikasyon — Ar-Ge / Yeni Ürün Geliştirme Denemeleri (25.09.2026)
-- 1) urun_arge_projeleri  — proje (ürün fikri, aşama, sorumlu, tarihler)
-- 2) urun_arge_denemeleri — her deneme kendi reçete sürümüyle (jsonb) + sonuç
-- 3) urun_arge_olaylar    — zaman çizelgesi: not / duyusal / lab / raf ömrü / karar / aşama
-- "Ürüne dönüştür": istemci kazanan denemenin reçetesiyle urun_urunler +
-- urun_receteler kaydı açar, projeye donusen_urun_id yazılır.
-- ============================================================================
set search_path = public;

create table if not exists public.urun_arge_projeleri (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null default public.current_tenant_id() references public.tenants(id),
  kk              text not null,
  ad              text not null default '',
  aciklama        text not null default '',
  kategori        text not null default '',
  sorumlu         text not null default '',
  baslangic       date,
  hedef_tarih     date,
  asama           text not null default 'Fikir' check (asama in ('Fikir','Formülasyon','Deneme Üretimi','Duyusal/Lab','Raf Ömrü','Onay','Ürüne Dönüştürüldü','İptal')),
  kazanan_deneme_id uuid,
  donusen_urun_id uuid references public.urun_urunler(id) on delete set null,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (tenant_id, kk)
);

create table if not exists public.urun_arge_denemeleri (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null default public.current_tenant_id() references public.tenants(id),
  kk            text not null,
  proje_id      uuid not null references public.urun_arge_projeleri(id) on delete cascade,
  deneme_no     int not null default 1,
  tarih         date,
  recete        jsonb not null default '[]'::jsonb,   -- [{hammadde_adi, oran_yuzde, alerjenler[]}]
  parametreler  text not null default '',
  sonuc         text not null default '',
  durum         text not null default 'Planlandı' check (durum in ('Planlandı','Yapıldı','Başarılı','Başarısız')),
  dosyalar      jsonb not null default '[]'::jsonb,   -- [{yol, ad}] bucket urun-belgeler, arge/ öneki
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists urun_arge_denemeleri_proje_idx on public.urun_arge_denemeleri(proje_id);

create table if not exists public.urun_arge_olaylar (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default public.current_tenant_id() references public.tenants(id),
  proje_id    uuid not null references public.urun_arge_projeleri(id) on delete cascade,
  deneme_id   uuid references public.urun_arge_denemeleri(id) on delete set null,
  tur         text not null default 'Not' check (tur in ('Not','Duyusal','Lab','Raf Ömrü','Karar','Aşama')),
  tarih       date not null default current_date,
  baslik      text not null default '',
  detay       text not null default '',
  puanlar     jsonb not null default '{}'::jsonb,     -- duyusal: {tat,koku,doku,gorunum} 1-9
  raf_gun     int,
  uygun       boolean,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists urun_arge_olaylar_proje_idx on public.urun_arge_olaylar(proje_id);

do $$
declare t text;
begin
  foreach t in array array['urun_arge_projeleri','urun_arge_denemeleri','urun_arge_olaylar'] loop
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
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

select tablename, count(*) from pg_policies where tablename like 'urun_arge%' group by 1;
