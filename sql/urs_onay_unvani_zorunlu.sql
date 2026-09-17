-- FAZ (17.09.2026) — "Onaylayan Unvanı" DB SEVİYESİNDE ZORUNLU (P1)
--
-- SORUN: Spesifikasyonu "Onaylı" yaparken "Onaylayan Unvanı" zorunluluğu
-- yalnız istemci tarafında kontrol ediliyordu (URS.html:1399-1400).
-- urun_spec_kaydet_trg() durum='Onaylı' olduğunda onaylayan_ad/onay_tarihi/
-- sonraki_inceleme_tarihi alanlarını otomatik dolduruyordu ama
-- onaylayan_rol boş bırakılsa bile durumu 'Onaylı' yapmaya engel olmuyordu.
-- Doğrudan bir REST/PostgREST çağrısı bu kontrolü tamamen atlayabilirdi —
-- "istemci-tarafı iş kuralı tuzağı" deseni. 17.09.2026 bağımsız denetim
-- raporu P1-1.
--
-- ÇÖZÜM: Trigger'a, durum 'Onaylı'ya geçerken onaylayan_rol boşsa
-- RAISE EXCEPTION eklendi. Mevcut fonksiyon gövdesi aynen korunup yalnız
-- bu kontrol eklendi (CREATE OR REPLACE, DROP gerekmez).

create or replace function public.urun_spec_kaydet_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    if coalesce(trim(new.onaylayan_rol), '') = '' then
      raise exception 'URS_ONAYLAYAN_UNVAN_GEREKLI'
        using hint = 'Spesifikasyon onaylanmadan once onaylayan unvani girilmelidir.';
    end if;
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
$function$;

-- ---------------------------------------------------------------------------
-- DOĞRULAMA (uygulamadan sonra çalıştırın)
-- ---------------------------------------------------------------------------
-- select prosrc from pg_proc where proname='urun_spec_kaydet_trg';
-- -- URS_ONAYLAYAN_UNVAN_GEREKLI metnini içermeli
