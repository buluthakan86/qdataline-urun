// Cloudflare Pages Function — POST /api/onay-consume
//
// AMAÇ: urun-onay.html sayfasındaki Onayla/Reddet kararını, tarayıcının kendi
// beyan ettiği (güvenilmez) IP yerine Cloudflare'in gördüğü GERÇEK ziyaretçi
// IP'siyle sunucu tarafında Supabase RPC'sine (qdl_consume_approval_token)
// iletir. Böylece qdl_approval_rate_limit ve qdl_approval_tokens.used_from_ip
// gerçek bir değer taşır. Bu dosya MOC modülündeki (moc.qdataline.com)
// functions/api/onay-consume.js ile BİREBİR aynıdır — platform-geneli
// qdl_ onay altyapısının Pages Function katmanı her modülde bu şekilde
// tekrarlanır (paylaşımlı bir Worker yerine, her modülün kendi Cloudflare
// Pages projesi olduğu için).
//
// GÜVENLİK NOTU: Burada Supabase SERVICE_ROLE anahtarı KULLANILMIYOR — bilinçli
// bir tercih. anon/publishable anahtar zaten URS.html/urun-onay.html içinde
// açıkça yayında; qdl_consume_approval_token zaten SECURITY DEFINER + tek
// kullanımlık atomik tüketim + kendi rate-limit'i ile korunuyor. Bu fonksiyonun
// tek görevi gerçek IP/UA'yı sunucu tarafında okuyup RPC gövdesine eklemek —
// bu nedenle ek bir gizli anahtar (service_role) saklamaya GEREK YOK ve bu
// modülde eklenmedi.
const SUPABASE_URL = 'https://bbltvuxxtacrpgrqnfoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3UUYAbeaA4tJahYiAAGhLQ_AtDfHkq4';

export async function onRequestPost(context) {
  const { request } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, reason: 'invalid' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const decision = body.decision === 'APPROVED' || body.decision === 'REJECTED' ? body.decision : '';
  if (!token || !decision) {
    return json({ ok: false, reason: 'invalid' }, 400);
  }

  // Gerçek ziyaretçi IP'si: Cloudflare her isteğe bunu ekler, sahtelenemez
  // (tarayıcıdan gönderilen herhangi bir header'ın aksine).
  const ip = request.headers.get('CF-Connecting-IP')
    || request.headers.get('x-forwarded-for')
    || null;
  const ua = request.headers.get('user-agent') || null;

  let upstream;
  try {
    upstream = await fetch(`${SUPABASE_URL}/rest/v1/rpc/qdl_consume_approval_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_token: token, p_decision: decision, p_ip: ip, p_ua: ua }),
    });
  } catch (e) {
    return json({ ok: false, reason: 'invalid' }, 502);
  }

  if (!upstream.ok) {
    return json({ ok: false, reason: 'invalid' }, 502);
  }
  const data = await upstream.json();
  return json(data, 200);
}

export async function onRequestGet() {
  return json({ ok: false, reason: 'invalid' }, 405);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
