-- URS: Ar-Ge "Ürüne dönüştür" tek işlemde (atomik) — 07.10.2026
-- Önceki istemci akışı 4 ayrı yazma yapıyordu; reçete eklenemezse boş ürün kalıyor, proje güncellemesi başarısızsa
-- tekrar denemede ikinci ürün oluşuyordu. Geri dönüş: fonksiyonu drop et, istemciyi eski akışa döndür (commit revert).
create or replace function public.urs_arge_urune_donustur(p_proje uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare p public.urun_arge_projeleri%rowtype; d public.urun_arge_denemeleri%rowtype; v_urun uuid; k jsonb; i int := 0;
begin
  if auth.uid() is null or not (public.has_modul('urun') and public.is_editor()) then raise exception 'URS_YETKI_YOK'; end if;
  select * into p from public.urun_arge_projeleri where id = p_proje and tenant_id = public.current_tenant_id() and deleted_at is null for update;
  if not found then raise exception 'URS_KAYIT_YOK'; end if;
  if p.donusen_urun_id is not null then raise exception 'URS_ZATEN_DONUSTU'; end if;
  select * into d from public.urun_arge_denemeleri where id = p.kazanan_deneme_id and proje_id = p.id and deleted_at is null;
  if not found then raise exception 'URS_KAZANAN_YOK'; end if;
  insert into public.urun_urunler(tenant_id, kk, ad, kategori, aciklama, durum)
  values (p.tenant_id, 'URN-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), p.ad, coalesce(p.kategori,''),
          coalesce(p.aciklama,'') || case when coalesce(p.aciklama,'') <> '' then E'\n' else '' end || 'Ar-Ge projesinden: ' || p.kk, 'Aktif')
  returning id into v_urun;
  for k in select * from jsonb_array_elements(case when jsonb_typeof(d.recete) = 'array' then d.recete else '[]'::jsonb end) loop
    insert into public.urun_receteler(tenant_id, kk, urun_id, hammadde_adi, oran_yuzde, alerjenler, sira_no)
    values (p.tenant_id, 'REC-' || substr(md5(random()::text || clock_timestamp()::text || i::text), 1, 10), v_urun, k->>'hammadde_adi',
            nullif(k->>'oran_yuzde','')::numeric, coalesce(k->'alerjenler','[]'::jsonb), i);
    i := i + 1;
  end loop;
  update public.urun_arge_projeleri set donusen_urun_id = v_urun, asama = 'Ürüne Dönüştürüldü' where id = p.id;
  insert into public.urun_arge_olaylar(tenant_id, proje_id, deneme_id, tur, baslik, detay)
  values (p.tenant_id, p.id, d.id, 'Aşama', p.asama || ' → Ürüne Dönüştürüldü', 'Ürün oluşturuldu: ' || p.ad);
  return v_urun;
end $$;
revoke execute on function public.urs_arge_urune_donustur(uuid) from public, anon;
grant execute on function public.urs_arge_urune_donustur(uuid) to authenticated;
