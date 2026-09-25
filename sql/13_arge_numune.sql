alter table public.urun_arge_olaylar drop constraint if exists urun_arge_olaylar_tur_check;
alter table public.urun_arge_olaylar add constraint urun_arge_olaylar_tur_check check (tur in ('Not','Duyusal','Lab','Raf Ömrü','Numune','Karar','Aşama'));
select 'ok';
