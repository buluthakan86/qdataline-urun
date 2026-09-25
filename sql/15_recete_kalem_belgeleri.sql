-- Reçete kalemi (hammadde/katkı) belge ekleri + raf ömrü (25.09.2026, backlog: "katkının spec/MSDS dosyası kendi kaydında")
-- dosyalar: [{yol, ad, tur}] — bucket urun-belgeler, <tenant>/recete/<urun_id>/… ; tur: Teknik Föy / MSDS / Sertifika / Diğer
alter table public.urun_receteler add column if not exists dosyalar jsonb not null default '[]'::jsonb;
alter table public.urun_receteler add column if not exists raf_omru text not null default '';
select count(*) from information_schema.columns where table_name='urun_receteler' and column_name in ('dosyalar','raf_omru');
