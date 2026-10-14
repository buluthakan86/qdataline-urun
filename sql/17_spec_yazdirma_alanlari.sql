-- Spesifikasyon yazdırma düzeninin veri alanları (14.10.2026).
-- Boş alanlar uygunluk veya ürün beyanı olarak yorumlanmaz.
alter table public.urun_spesifikasyonlari
  add column if not exists uretim_metodu text not null default '',
  add column if not exists urun_beyanlari text not null default '',
  add column if not exists uyum_beyanlari jsonb not null default '[]'::jsonb;
