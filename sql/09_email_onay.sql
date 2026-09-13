-- ============================================================================
-- URS (Reçete ve Spesifikasyon Yönetimi) — E-posta ile tek-tıkla Onay/Red
-- (13.09.2026) — MOC'ta canlıda test edilmiş platform-geneli qdl_ altyapısının
-- ikinci modüle yayılması. Paylaşımlı tablo/fonksiyonlar (qdl_approval_tokens,
-- qdl_approval_rate_limit, qdl_create_approval_token, qdl_approval_token_preview,
-- qdl_consume_approval_token, qdl_send_email) YENİDEN OLUŞTURULMADI — yalnız
-- qdl_consume_approval_token'a bu modül için yeni bir dispatch dalı eklendi.
--
-- Hedeflenen onay akışı: urun_spesifikasyonlari.durum 'Taslak' -> 'Onaylı'.
-- Bu modülde tedarikçi/üst-yönetici portalı YOK (proje kararı, bilinçli) —
-- e-posta linkiyle giriş yapmadan onay tam da bu boşluğu dolduruyor. Alıcı:
-- urun_firma_bilgileri.ust_yonetici_eposta (zaten var, yıllık gözden geçirme
-- bildirimi için ayrılmıştı — bu iş için de doğrudan kullanılabilir).
--
-- ÖNEMLİ: Bu dosya idempotent'tir (create or replace / add column if not exists).
-- ============================================================================
set search_path = public;

-- ---------------------------------------------------------------------------
-- 1) Editörün "Onay İçin Gönder" butonuyla tetikleyeceği RPC — token üretir +
--    e-posta gönderir. Trigger yerine doğrudan çağrılan bir RPC seçildi çünkü
--    bu modülde durum geçişi (Taslak->Onaylı) doğrudan client UPDATE'i ile
--    yapılıyor (MOC'taki gibi ayrı bir "onay bekliyor" ara durumu yok) — bu
--    yüzden "gönder" niyeti (spesifikasyon Taslak'ta kalmaya devam ederken,
--    yalnızca bir onay linki e-postayla gönderilsin) trigger'la ayırt edilemez,
--    ayrı bir eylem olarak modellendi.
-- ---------------------------------------------------------------------------
create or replace function public.urun_onay_email_gonder(p_spec_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_spec public.urun_spesifikasyonlari;
  v_fb   public.urun_firma_bilgileri;
  v_token text;
  v_link  text;
begin
  if auth.uid() is null or not public.has_modul('urun') or not public.is_editor() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_spec from public.urun_spesifikasyonlari
   where id = p_spec_id and tenant_id = public.current_tenant_id() and deleted_at is null;
  if v_spec.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_spec.durum <> 'Taslak' then
    return jsonb_build_object('ok', false, 'reason', 'not_draft');
  end if;

  select * into v_fb from public.urun_firma_bilgileri where tenant_id = v_spec.tenant_id;
  if v_fb.tenant_id is null or coalesce(trim(v_fb.ust_yonetici_eposta), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_recipient');
  end if;

  v_token := public.qdl_create_approval_token(
    'urun_spesifikasyonlari', v_spec.id::text, v_fb.ust_yonetici_eposta, 'Taslak', 'urs_spec_approve', 72
  );
  v_link := 'https://urun.qdataline.com/urun-onay.html?token=' || v_token;

  perform public.qdl_send_email(
    v_fb.ust_yonetici_eposta,
    'Spesifikasyon Onayı Bekliyor: ' || coalesce(v_spec.spec_kodu,'') || ' — ' || coalesce(v_spec.gida_adi,''),
    '<p>' || coalesce(v_spec.spec_kodu,'') || ' — <b>' || coalesce(v_spec.gida_adi,'') || '</b> spesifikasyonu onayınızı bekliyor.</p>' ||
    '<p><a href="' || v_link || '">Spesifikasyonu görüntüle ve karar ver</a></p>' ||
    '<p style="color:#888;font-size:12px">Bu link 72 saat geçerlidir ve yalnız bir kez kullanılabilir. Giriş yapmanız gerekmez.</p>'
  );

  return jsonb_build_object('ok', true, 'sent_to', v_fb.ust_yonetici_eposta);
end
$$;
revoke all on function public.urun_onay_email_gonder(uuid) from public;
grant execute on function public.urun_onay_email_gonder(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) qdl_consume_approval_token'a urun_spesifikasyonlari dalı ekle.
--    Mevcut fonksiyon tanımı korunuyor, yalnız yeni bir "if v_row.record_table
--    = 'urun_spesifikasyonlari' then ..." dalı ekleniyor (isg_kimyasallar
--    dalından SONRA, "unsupported_record" satırından ÖNCE).
--    NOT: BEFORE trigger'lar (urun_spec_kaydet_trg — spec_kodu/versiyon_no/
--    onaylayan_ad-tarihi/sonraki_inceleme_tarihi) ve AFTER trigger
--    (urun_spesifikasyonlari_versiyon_trg — versiyon geçmişi snapshot'ı)
--    zaten var ve BU UPDATE ile birlikte otomatik tetiklenir — durum
--    geçişi mantığı burada TEKRAR YAZILMADI, var olan trigger zinciri
--    yeniden kullanıldı (MOC/İSG dallarıyla aynı ilke).
-- ---------------------------------------------------------------------------
create or replace function public.qdl_consume_approval_token(
  p_token    text,
  p_decision text,   -- 'APPROVED' | 'REJECTED'
  p_ip       text,
  p_ua       text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_row  public.qdl_approval_tokens;
  v_appr public.moc_approvals;
  v_moc  public.moc_requests;
  v_isg  public.isg_kimyasallar;
  v_spec public.urun_spesifikasyonlari;
  v_rl   public.qdl_approval_rate_limit;
begin
  if p_ip is not null then
    select * into v_rl from public.qdl_approval_rate_limit where ip = p_ip for update;
    if v_rl.ip is null then
      insert into public.qdl_approval_rate_limit(ip, window_start, attempts) values (p_ip, now(), 1);
    elsif v_rl.window_start < now() - interval '1 hour' then
      update public.qdl_approval_rate_limit set window_start = now(), attempts = 1 where ip = p_ip;
    else
      if v_rl.attempts >= 20 then
        return jsonb_build_object('ok', false, 'reason', 'rate_limited');
      end if;
      update public.qdl_approval_rate_limit set attempts = attempts + 1 where ip = p_ip;
    end if;
  end if;

  if p_decision not in ('APPROVED','REJECTED') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_hash := encode(digest(coalesce(p_token,''), 'sha256'), 'hex');

  update public.qdl_approval_tokens
     set status = 'used', used_at = now(), used_from_ip = p_ip,
         used_user_agent = p_ua, used_decision = p_decision
   where token_hash = v_hash
     and status = 'pending'
     and now() < expires_at
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.qdl_approval_tokens where token_hash = v_hash;
    if v_row.id is null then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    elsif v_row.status = 'used' then
      return jsonb_build_object('ok', false, 'reason', 'already_used');
    elsif now() >= v_row.expires_at then
      return jsonb_build_object('ok', false, 'reason', 'expired');
    else
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
  end if;

  if v_row.record_table = 'moc_approvals' then
    select a.* into v_appr from public.moc_approvals a where a.id = v_row.record_id::bigint;
    if v_appr.id is null then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    select r.* into v_moc from public.moc_requests r where r.id = v_appr.moc_id;
    if v_moc.status is distinct from v_row.expected_status then
      return jsonb_build_object('ok', false, 'reason', 'state_changed');
    end if;
    if v_appr.decision is not null then
      return jsonb_build_object('ok', false, 'reason', 'already_decided');
    end if;

    update public.moc_approvals
       set decision = p_decision, decided_at = now(),
           comment = coalesce(comment,'') ||
             case when p_decision='APPROVED' then '[E-posta linki ile onaylandı]'
                  else '[E-posta linki ile reddedildi]' end
     where id = v_appr.id;

    insert into public.moc_audit_log
      (tenant_id, table_name, record_id, action, changed_by, old_data, new_data)
    values
      (v_appr.tenant_id, 'moc_approvals', v_appr.id,
       case when p_decision='APPROVED' then 'EMAIL_APPROVE' else 'EMAIL_REJECT' end,
       null,
       to_jsonb(v_appr),
       jsonb_build_object('decision', p_decision, 'ip', p_ip, 'user_agent', p_ua, 'via', 'email_link', 'at', now()));

    return jsonb_build_object('ok', true, 'moc_no', v_moc.moc_no, 'decision', p_decision);
  end if;

  if v_row.record_table = 'isg_kimyasallar' then
    select k.* into v_isg from public.isg_kimyasallar k where k.id = v_row.record_id::uuid;
    if v_isg.id is null then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    if v_isg.durum is distinct from v_row.expected_status then
      return jsonb_build_object('ok', false, 'reason', 'state_changed');
    end if;

    update public.isg_kimyasallar
       set durum = case when p_decision = 'APPROVED' then 'Onaylı' else 'Reddedildi' end,
           onaylayan_ad = 'E-posta linki (' || coalesce(v_row.recipient_email,'') || ') ' ||
             case when p_decision='APPROVED' then '[E-posta linki ile onaylandı]'
                  else '[E-posta linki ile reddedildi]' end,
           onay_tarihi = now(),
           red_notu = case when p_decision = 'REJECTED'
                        then coalesce(nullif(trim(v_isg.red_notu),''), 'E-posta linki ile reddedildi')
                        else v_isg.red_notu end
     where id = v_isg.id;

    return jsonb_build_object('ok', true, 'kimyasal_ad', v_isg.ad, 'decision', p_decision);
  end if;

  if v_row.record_table = 'urun_spesifikasyonlari' then
    select s.* into v_spec from public.urun_spesifikasyonlari s
     where s.id = v_row.record_id::uuid and s.deleted_at is null;
    if v_spec.id is null then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    if v_spec.durum is distinct from v_row.expected_status then
      return jsonb_build_object('ok', false, 'reason', 'state_changed');
    end if;

    if p_decision = 'APPROVED' then
      -- durum'u 'Onaylı' yapmak yeterli: urun_spec_kaydet_trg (BEFORE) zaten
      -- versiyon_no/onay_tarihi/sonraki_inceleme_tarihi'ni hesaplar; auth.uid()
      -- burada NULL olduğu için o trigger onaylayan_ad'a dokunmaz, aşağıda
      -- elle verdiğimiz değer korunur.
      update public.urun_spesifikasyonlari
         set durum = 'Onaylı',
             onaylayan_ad = 'E-posta linki (' || coalesce(v_row.recipient_email,'') || ')',
             onaylayan_rol = coalesce(nullif(trim(v_spec.onaylayan_rol),''), 'Üst Yönetici (e-posta onayı)'),
             kaydetme_notu = coalesce(nullif(trim(v_spec.kaydetme_notu),''),'') ||
               case when coalesce(trim(v_spec.kaydetme_notu),'')='' then '' else ' ' end ||
               '[E-posta linki ile onaylandı]'
       where id = v_spec.id;
    else
      update public.urun_spesifikasyonlari
         set kaydetme_notu = coalesce(nullif(trim(v_spec.kaydetme_notu),''),'') ||
               case when coalesce(trim(v_spec.kaydetme_notu),'')='' then '' else ' ' end ||
               '[E-posta linki ile reddedildi]'
       where id = v_spec.id;
    end if;

    return jsonb_build_object('ok', true, 'spec_kodu', v_spec.spec_kodu, 'gida_adi', v_spec.gida_adi, 'decision', p_decision);
  end if;

  return jsonb_build_object('ok', false, 'reason', 'unsupported_record');
end
$$;
revoke all on function public.qdl_consume_approval_token(text,text,text,text) from public;
grant execute on function public.qdl_consume_approval_token(text,text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) qdl_approval_token_preview'a urun_spesifikasyonlari dalı ekle (salt-okunur
--    önizleme, tüketmeden). MOC dalı korunuyor; isg_kimyasallar bu fonksiyona
--    hiç eklenmemiş (önizlemesiz gidiyor) olabilir — kontrol edilip aynı
--    desende genişletildi, mevcut moc dalı bozulmadı.
-- ---------------------------------------------------------------------------
create or replace function public.qdl_approval_token_preview(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_row  public.qdl_approval_tokens;
  v_moc  record;
  v_spec record;
begin
  v_hash := encode(digest(coalesce(p_token,''), 'sha256'), 'hex');
  select * into v_row from public.qdl_approval_tokens where token_hash = v_hash;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;
  if now() >= v_row.expires_at then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if v_row.record_table = 'moc_approvals' then
    select r.moc_no, r.title, r.status into v_moc
      from public.moc_approvals a
      join public.moc_requests r on r.id = a.moc_id
     where a.id = v_row.record_id::bigint;
    return jsonb_build_object(
      'ok', true,
      'moc_no', v_moc.moc_no,
      'title', v_moc.title,
      'current_status', v_moc.status,
      'expected_status', v_row.expected_status,
      'still_relevant', (v_moc.status is not distinct from v_row.expected_status)
    );
  end if;

  if v_row.record_table = 'urun_spesifikasyonlari' then
    select s.spec_kodu, s.gida_adi, s.durum into v_spec
      from public.urun_spesifikasyonlari s
     where s.id = v_row.record_id::uuid and s.deleted_at is null;
    if v_spec.spec_kodu is null then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    return jsonb_build_object(
      'ok', true,
      'spec_kodu', v_spec.spec_kodu,
      'gida_adi', v_spec.gida_adi,
      'current_status', v_spec.durum,
      'expected_status', v_row.expected_status,
      'still_relevant', (v_spec.durum is not distinct from v_row.expected_status)
    );
  end if;

  return jsonb_build_object('ok', true, 'still_relevant', true);
end
$$;
revoke all on function public.qdl_approval_token_preview(text) from public;
grant execute on function public.qdl_approval_token_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- DOĞRULAMA SORGULARI
-- ---------------------------------------------------------------------------
-- select routine_name from information_schema.routines where routine_schema='public' and routine_name='urun_onay_email_gonder';
-- select prosrc from pg_proc where proname='qdl_consume_approval_token';

-- ---------------------------------------------------------------------------
-- TEST SIRASI (öneri, test e-postası buluthakan86@gmail.com)
-- ---------------------------------------------------------------------------
-- 1) Taslak bir spesifikasyon id'si bulun (durum='Taslak'), firma bilgisine
--    geçici olarak ust_yonetici_eposta='buluthakan86@gmail.com' yazın.
-- 2) select public.urun_onay_email_gonder('<spec id>');  -> {"ok":true,...}
-- 3) select * from net._http_response order by created desc limit 3; -- Resend 200
-- 4) qdl_approval_tokens'tan token_hash'i bulup (ham token loglanmaz, test
--    için ayrıca select public.qdl_create_approval_token(...) ile üretip
--    doğrudan onunla devam edin) preview + consume 4 senaryosunu deneyin
--    (A ilk kullanım, B tekrar, C expired, D state_changed).
