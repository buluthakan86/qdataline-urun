-- ============================================================================
-- Ürün Reçete ve Spesifikasyon Yönetimi — Kullanıcıya 'urun' MODÜL YETKİSİ ver
-- ORTAK PROJE. Profile/tenant'a DOKUNULMAZ (SDR/BOY ile aynı desen).
-- ============================================================================

insert into public.modul_yetki (user_id, modul)
select u.id, 'urun' from auth.users u where u.email = 'buluthakan86@gmail.com'
on conflict (user_id, modul) do nothing;

select u.email,
       (p.id  is not null)                     as profil_var,
       t.name                                  as firma,
       (my.user_id is not null)                as urun_yetkisi
from auth.users u
left join public.profiles    p  on p.id = u.id
left join public.tenants     t  on t.id = p.tenant_id
left join public.modul_yetki my on my.user_id = u.id and my.modul = 'urun'
where u.email = 'buluthakan86@gmail.com';
