-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — AI ile Besin Değeri Oluşturma
-- (2026-09-09) — BOY/SDR'deki AYNI platform-geneli, PAYLAŞIMLI Vault anahtarı
-- deseni. Anahtar tarayıcıya HİÇ gönderilmez, yalnız Edge Function
-- (service_role) okur. Anahtar yoksa nazik "henüz aktif değil" mesajı döner
-- (sessiz sahte veri YOK).
-- ============================================================================
set search_path = public;

create or replace function public.urun_ai_anahtar_getir()
returns text
language sql
security definer
set search_path to 'public'
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'anthropic_api_key'
$$;
-- ⚠️ KRİTİK: Postgres yeni fonksiyonlara varsayılan olarak PUBLIC/anon/
-- authenticated'a da EXECUTE veriyor (bu oturumda canlıda doğrulanıp
-- YAKALANDI — SDR'nin aynı deseni bu grant'a sahip DEĞİLDİ, karşılaştırmayla
-- bulundu). Bu revoke OLMADAN herhangi bir authenticated kullanıcı
-- `sb.rpc('urun_ai_anahtar_getir')` ile paylaşımlı API anahtarını tarayıcıya
-- çekebilirdi. Yalnız postgres/service_role çalıştırabilmeli.
revoke execute on function public.urun_ai_anahtar_getir() from public, anon, authenticated;

create table if not exists public.urun_ai_kullanim_log (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null default public.current_tenant_id() references public.tenants(id),
  ozellik            text not null default 'besin_degeri',
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  tahmini_maliyet_usd numeric,
  created_at         timestamptz not null default now()
);
alter table public.urun_ai_kullanim_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='urun_ai_kullanim_log' and policyname='urun_ai_kullanim_log read') then
    create policy "urun_ai_kullanim_log read" on public.urun_ai_kullanim_log for select to authenticated
      using (tenant_id = public.current_tenant_id() and public.has_modul('urun'));
  end if;
end $$;
-- Yazma yalnız service_role (Edge Function) — authenticated için insert politikası yok.

-- ============================================================================
-- BİTTİ. Eklenen: urun_ai_anahtar_getir() (yalnız service_role RPC ile
-- çağrılabilir — authenticated'a EXECUTE grant edilmedi, bilinçli),
-- urun_ai_kullanim_log (okuma tenant-geneli, yazma yalnız service_role).
-- ============================================================================
