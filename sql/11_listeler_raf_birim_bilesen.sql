-- 11 (25.09.2026) — Kullanıcı notları: ayarlardan yönetilen listeler (birim, ambalaj tipi, paket/palet ölçüsü),
-- raf ömrü birimi (gün/ay/yıl), opsiyonel ürün ölçüsü, reçetede bileşik hammadde (alt bileşen + oran).
-- Geri dönüş: ilgili sütunları drop column ile kaldırın (veri kaybı yalnız bu yeni alanlarda).
alter table public.urun_firma_bilgileri add column if not exists listeler jsonb not null default '{}'::jsonb;
alter table public.urun_spesifikasyonlari add column if not exists raf_omru_birim text not null default 'ay';
alter table public.urun_spesifikasyonlari add column if not exists urun_olcusu text not null default '';
alter table public.urun_receteler add column if not exists alt_bilesenler jsonb not null default '[]'::jsonb;
alter table public.urun_spesifikasyonlari drop constraint if exists urun_spes_raf_omru_birim_chk;
alter table public.urun_spesifikasyonlari add constraint urun_spes_raf_omru_birim_chk check (raf_omru_birim in ('gün','ay','yıl'));
notify pgrst, 'reload schema';
