-- 10 (25.09.2026): Firma bilgilerine işletme kayıt / onay numarası (spesifikasyona otomatik dolar). Canlıya uygulandı.
-- Geri dönüş: alter table public.urun_firma_bilgileri drop column isletme_kayit_no, drop column isletme_onay_no;
alter table public.urun_firma_bilgileri add column if not exists isletme_kayit_no text not null default '', add column if not exists isletme_onay_no text not null default '';
