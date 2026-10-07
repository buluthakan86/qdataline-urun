-- URS: spesifikasyonu hazırlayan kişi kendi spesifikasyonunu onaylayamaz (görev ayrılığı).
-- Karar (Eğitim 0034/0042 ile aynı): firmada başka aktif ADMIN/EDITOR YOKSA kendi onayı serbest ve
-- kendi_onayi=true işlenir. E-posta onay linki (auth.uid() boş) etkilenmez.
-- Geri dönüş: eski gövde sql/urs_onay_unvani_zorunlu.sql'deki fonksiyon; kolon bırakılabilir.
alter table public.urun_spesifikasyonlari add column if not exists kendi_onayi boolean not null default false;

create or replace function public.urun_spec_kaydet_trg()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_ad text;
  v_sonraki int;
  v_baska int;
begin
  if tg_op = 'INSERT' then
    new.versiyon_no := 1;
    select coalesce(max(nullif(regexp_replace(spec_kodu, '\D', '', 'g'), '')::int), 0) + 1
      into v_sonraki from public.urun_spesifikasyonlari where tenant_id = new.tenant_id;
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
    new.kendi_onayi := false;
    if auth.uid() is not null then
      if new.created_by is not null and new.created_by = auth.uid() then
        select count(*) into v_baska from public.profiles p
         where p.tenant_id = new.tenant_id and p.id <> auth.uid()
           and p.role in ('ADMIN','EDITOR') and coalesce(p.is_active, true);
        if v_baska > 0 then
          raise exception 'URS_KENDI_ONAY_YASAK'
            using hint = 'Spesifikasyonu hazirlayan kisi onaylayamaz; firmadaki baska bir yetkili onaylamalidir.';
        end if;
        new.kendi_onayi := true;
      end if;
      select full_name into v_ad from public.profiles where id = auth.uid();
      new.onaylayan_ad := coalesce(v_ad, '');
    end if;
    new.onay_tarihi := now();
    new.sonraki_inceleme_tarihi := (now() + interval '365 days')::date;
  elsif new.durum = 'Taslak' then
    new.onaylayan_ad := ''; new.onay_tarihi := null; new.onaylayan_rol := '';
    new.sonraki_inceleme_tarihi := null; new.kendi_onayi := false;
  end if;
  return new;
end
$function$;
