-- ============================================================================
-- Reçete ve Spesifikasyon — yıllık gözden geçirme e-posta bildirimi (25.09.2026)
-- Onaylı spesifikasyonun sonraki_inceleme_tarihi (onayda +365 gün) yaklaşınca
-- firma bilgisindeki ust_yonetici_eposta adresine özet e-posta (qdl_send_email).
-- Günlük spam olmaması için: yalnız bir spesifikasyon 30 / 7 / 0 gün kala
-- eşiğine GİRDİĞİ gün, ya da vadesi geçmiş kayıt varsa her PAZARTESİ gönderilir.
-- Mailde o gün tetiklenenle birlikte 30 gün içindeki/geçmiş TÜM kayıtlar listelenir.
-- ============================================================================
set search_path = public;

create or replace function public.urun_yillik_inceleme_notify()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f        record;
  bugun    date := current_date;
  tetik    boolean;
  gecmis   text; yaklasan text;
  n_g int; n_y int;
  govde text;
begin
  for f in
    select tenant_id, btrim(ust_yonetici_eposta) eposta, coalesce(nullif(btrim(ust_yonetici_ad),''),'') ad, coalesce(firma_adi,'') firma
      from public.urun_firma_bilgileri
     where coalesce(btrim(ust_yonetici_eposta),'') <> ''
  loop
    select bool_or((s.sonraki_inceleme_tarihi - bugun) in (30,7,0))
             or (extract(isodow from bugun) = 1 and bool_or(s.sonraki_inceleme_tarihi < bugun)),
           count(*) filter (where s.sonraki_inceleme_tarihi < bugun),
           string_agg(case when s.sonraki_inceleme_tarihi < bugun then
             '<li><b>' || coalesce(nullif(s.spec_kodu,''),'—') || '</b> — ' || coalesce(nullif(s.gida_adi,''), u.ad, '') ||
             ' · vadesi geçti: ' || to_char(s.sonraki_inceleme_tarihi,'DD.MM.YYYY') || '</li>' end, '' order by s.sonraki_inceleme_tarihi),
           count(*) filter (where s.sonraki_inceleme_tarihi >= bugun),
           string_agg(case when s.sonraki_inceleme_tarihi >= bugun then
             '<li><b>' || coalesce(nullif(s.spec_kodu,''),'—') || '</b> — ' || coalesce(nullif(s.gida_adi,''), u.ad, '') ||
             ' · inceleme: ' || to_char(s.sonraki_inceleme_tarihi,'DD.MM.YYYY') ||
             ' (' || (s.sonraki_inceleme_tarihi - bugun) || ' gün)</li>' end, '' order by s.sonraki_inceleme_tarihi)
      into tetik, n_g, gecmis, n_y, yaklasan
      from public.urun_spesifikasyonlari s
      left join public.urun_urunler u on u.id = s.urun_id
     where s.tenant_id = f.tenant_id
       and s.deleted_at is null
       and s.durum = 'Onaylı'
       and s.sonraki_inceleme_tarihi is not null
       and s.sonraki_inceleme_tarihi <= bugun + 30;

    if not coalesce(tetik,false) or coalesce(n_g,0) + coalesce(n_y,0) = 0 then continue; end if;

    govde := '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b2620">'
          || '<p>Merhaba' || case when f.ad <> '' then ' ' || f.ad else '' end || ',</p>'
          || '<p>' || case when f.firma <> '' then f.firma || ' — ' else '' end
          || 'Reçete ve Spesifikasyon sisteminde yıllık gözden geçirmesi yaklaşan veya geçmiş spesifikasyonlar var:</p>';
    if coalesce(n_g,0) > 0 then govde := govde || '<h3>Gözden geçirme vadesi geçmiş (' || n_g || ')</h3><ul>' || gecmis || '</ul>'; end if;
    if coalesce(n_y,0) > 0 then govde := govde || '<h3>30 gün içinde gözden geçirilecek (' || n_y || ')</h3><ul>' || yaklasan || '</ul>'; end if;
    govde := govde
          || '<p style="margin-top:18px"><a href="https://urun.qdataline.com">Reçete ve Spesifikasyon''u aç</a></p>'
          || '<p style="color:#7c8c81;font-size:12px">Bu e-posta Qdataline tarafından otomatik gönderilmiştir. '
          || 'Almak istemiyorsanız Ayarlar &gt; Firma Bilgileri''ndeki "Üst yönetici e-posta" alanını boşaltın.</p></div>';
    perform public.qdl_send_email(f.eposta, 'Spesifikasyon yıllık gözden geçirme — ' || to_char(bugun,'DD.MM.YYYY'), govde);
  end loop;
end
$$;

revoke all on function public.urun_yillik_inceleme_notify() from public, anon, authenticated;

select cron.unschedule('urun_yillik_inceleme_notify') where exists (select 1 from cron.job where jobname='urun_yillik_inceleme_notify');
select cron.schedule('urun_yillik_inceleme_notify', '0 7 * * *', 'select public.urun_yillik_inceleme_notify();');

select has_function_privilege('authenticated','public.urun_yillik_inceleme_notify()','execute') auth_exec,
       (select schedule from cron.job where jobname='urun_yillik_inceleme_notify') zamanlama;
