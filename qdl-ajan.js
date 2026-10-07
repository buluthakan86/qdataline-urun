/* =========================================================================
 * qdl-ajan.js — Q-AI sohbet düğmesi ve penceresi (04.10.2026)
 * Satılabilir yapay zekâ asistanı. Düğme YALNIZ firma "Q-AI" paketini satın almışsa VE kullanıcı yönetici (ADMIN) ya da
 * yöneticinin yetki verdiği biriyse çıkar (karar: SUNUCU — qdl_qai_benim_durumum RPC; buradaki gizleme yalnız kolaylıktır,
 * asıl kapı qai-sohbet Edge Function'ındaki qdl_qai_yetkili kontrolüdür).
 * Kullanım:  <script src="/qdl-ajan.js?v=20261004" data-modul="boy" data-bottom="72" defer></script>
 *   data-modul  = qdl_modul_katalog.kod (varsayılan 'core')
 *   data-bottom = düğmenin alttan uzaklığı px (aynı köşedeki "Sorun bildir" düğmesinin ÜSTÜNE oturması için)
 * Sayfanın global Supabase istemcisini (`db`) kullanır; modül kökünde bu dosyanın BİREBİR kopyası durur.
 * Metin her zaman textContent ile yazılır (innerHTML yok): model çıktısı DOM'a HTML olarak girmez.
 * ========================================================================= */
(function () {
  'use strict';
  if (window.__qdlAjan) return;
  window.__qdlAjan = true;

  var me = document.currentScript;
  var MODUL = (me && me.getAttribute('data-modul')) || 'core';
  var ALT = parseInt((me && me.getAttribute('data-bottom')) || '72', 10) || 72;
  var ACCENT = '#C084FC';

  var EN = function () { try { return (localStorage.getItem('qd_lang') || document.documentElement.lang || '').slice(0, 2) === 'en'; } catch (e) { return false; } };
  var T = function () {
    return EN() ? {
      ad: 'Q-AI', alt: 'Ask about how to use the modules', ph: 'Type your question…', gonder: 'Send', kapat: 'Close',
      selam: 'Hello! I’m Q-AI. Ask me how something works in the modules. If what you need isn’t there, I can pass it to our team as a request.',
      yaziyor: 'Q-AI is typing…', hata: 'Could not answer right now. Please try again.', kaynak: 'Source: ',
      gizlilik: 'Personal data in your messages is masked automatically. Please do not write passwords or personal data. Q-AI cannot see your records.',
      talepBtn: 'Send this to the team as a request', talepBaslik: 'Request for the team', talepPh: 'Describe what you need…',
      riza: 'I agree to forward this text to the team.', talepGonder: 'Send request', iptal: 'Cancel', talepOk: 'Your request was forwarded to our team. Thank you.',
      talepHata: 'Could not be sent. Please try again.', kalan: ' messages left this month'
    } : {
      ad: 'Q-AI', alt: 'Modüllerin kullanımı hakkında sorun', ph: 'Sorunuzu yazın…', gonder: 'Gönder', kapat: 'Kapat',
      selam: 'Merhaba! Ben Q-AI. Modüllerde bir işin nasıl yapıldığını sorabilirsiniz. İhtiyacınız olan şey modülde yoksa, bunu ekibimize talep olarak iletebilirim.',
      yaziyor: 'Q-AI yazıyor…', hata: 'Şu an yanıt verilemedi. Lütfen tekrar deneyin.', kaynak: 'Kaynak: ',
      gizlilik: 'Mesajlarınızdaki kişisel bilgiler otomatik maskelenir. Lütfen şifre veya kişisel bilgi yazmayın. Q-AI kayıtlarınızı göremez.',
      talepBtn: 'Bunu ekibe talep olarak ilet', talepBaslik: 'Ekibe iletilecek talep', talepPh: 'İhtiyacınızı kısaca yazın…',
      riza: 'Bu metnin ekibimize iletilmesini onaylıyorum.', talepGonder: 'Talebi ilet', iptal: 'Vazgeç', talepOk: 'Talebiniz ekibimize iletildi. Teşekkürler.',
      talepHata: 'Gönderilemedi. Lütfen tekrar deneyin.', kalan: ' mesaj hakkı kaldı (bu ay)'
    };
  };
  function istemci() { try { if (typeof db !== 'undefined' && db && db.auth) return db; if (typeof sb !== 'undefined' && sb && sb.auth) return sb; if (typeof supa !== 'undefined' && supa && supa.auth) return supa; return null; } catch (e) { return null; } }

  // ---------- Stil ----------
  var st = document.createElement('style');
  st.textContent =
    '#qaiBtn{position:fixed;right:18px;bottom:calc(' + ALT + 'px + env(safe-area-inset-bottom,0px));z-index:9989;display:none;align-items:center;gap:8px;height:44px;padding:0 16px 0 12px;border-radius:22px;' +
    'background:' + ACCENT + ';color:#1b0b2e;border:1px solid rgba(255,255,255,.25);box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer;font:700 13px/1 system-ui,sans-serif}' +
    '#qaiBtn.on{display:flex}#qaiBtn svg{width:20px;height:20px}' +
    '@media (max-width:640px){#qaiBtn{padding:0;width:44px;justify-content:center}#qaiBtn .l{display:none}}' +
    '#qaiPanel{position:fixed;right:18px;bottom:calc(' + (ALT + 54) + 'px + env(safe-area-inset-bottom,0px));z-index:9991;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - ' + (ALT + 80) + 'px));display:none;flex-direction:column;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(127,127,127,.35);font:14px/1.5 system-ui,sans-serif}' +
    '#qaiPanel.on{display:flex}' +
    '#qaiPanel .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:' + ACCENT + ';color:#1b0b2e}' +
    '#qaiPanel .hd b{font-size:15px}#qaiPanel .hd small{display:block;font-size:11.5px;opacity:.8;font-weight:500}#qaiPanel .hd .x{margin-left:auto;background:transparent;border:0;color:inherit;font-size:20px;cursor:pointer;line-height:1}' +
    '#qaiLog{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-height:120px}' +
    '#qaiLog .m{max-width:88%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}' +
    '#qaiLog .u{align-self:flex-end;background:' + ACCENT + ';color:#1b0b2e}' +
    '#qaiLog .b{align-self:flex-start;background:rgba(127,127,127,.16)}' +
    '#qaiLog .k{display:block;margin-top:5px;font-size:11.5px;opacity:.7}' +
    '#qaiLog .tb{align-self:flex-start;border:1px solid ' + ACCENT + ';background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font:600 12.5px system-ui,sans-serif;cursor:pointer}' +
    '#qaiTalep{display:none;padding:10px 14px;border-top:1px solid rgba(127,127,127,.3)}#qaiTalep.on{display:block}' +
    '#qaiTalep textarea{width:100%;box-sizing:border-box;min-height:70px;border-radius:8px;padding:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit}' +
    '#qaiTalep label{display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:6px 0}' +
    '#qaiTalep .ak{display:flex;gap:8px;justify-content:flex-end}' +
    '#qaiPanel button.p{border-radius:8px;padding:7px 14px;font:700 13px system-ui,sans-serif;cursor:pointer;background:' + ACCENT + ';color:#1b0b2e;border:0}' +
    '#qaiPanel button.s{border-radius:8px;padding:7px 14px;font:600 13px system-ui,sans-serif;cursor:pointer;background:transparent;color:inherit;border:1px solid rgba(127,127,127,.45)}' +
    '#qaiPanel button:disabled{opacity:.5;cursor:default}' +
    '#qaiForm{display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(127,127,127,.3)}' +
    '#qaiForm input{flex:1;min-width:0;border-radius:8px;padding:8px 10px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit}' +
    '#qaiInfo{padding:6px 14px 8px;font-size:11.5px;opacity:.7}' +
    '#qaiMsg{padding:0 14px 6px;font-size:12.5px;min-height:0}';
  document.head.appendChild(st);

  // ---------- DOM ----------
  var btn = document.createElement('button');
  btn.id = 'qaiBtn'; btn.type = 'button';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6 10.3 11 6 9.3l4.3-1.7L12 3Z" fill="currentColor"/><path d="M18.5 14l.8 2.1 2.2.9-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.9.8-2.1Z" fill="currentColor"/></svg><span class="l">Q-AI</span>';
  var panel = document.createElement('div');
  panel.id = 'qaiPanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Q-AI');
  panel.innerHTML = '<div class="hd"><div><b>Q-AI</b><small></small></div><button type="button" class="x" aria-label="">×</button></div>' +
    '<div id="qaiLog" aria-live="polite"></div><div id="qaiMsg"></div>' +
    '<div id="qaiTalep"><textarea maxlength="600"></textarea><label><input type="checkbox"><span></span></label><div class="ak"><button type="button" class="s"></button><button type="button" class="p"></button></div></div>' +
    '<form id="qaiForm"><input type="text" maxlength="800" autocomplete="off"><button type="submit" class="p"></button></form><div id="qaiInfo"></div>';
  document.body.appendChild(btn); document.body.appendChild(panel);

  var $ = function (s) { return panel.querySelector(s); };
  var log = $('#qaiLog'), girdi = $('#qaiForm input'), yolla = $('#qaiForm button'), talep = $('#qaiTalep');
  var mesajlar = [], mesgul = false, acildi = false, sonOzet = '', durum = { yetkili: false };

  function metinler() {
    var l = T(), cb = talep.querySelector('input[type=checkbox]');
    btn.title = l.ad; btn.setAttribute('aria-label', l.ad);
    $('.hd small').textContent = l.alt; $('.hd .x').setAttribute('aria-label', l.kapat);
    girdi.placeholder = l.ph; yolla.textContent = l.gonder;
    talep.querySelector('textarea').placeholder = l.talepPh;
    talep.querySelector('label span').textContent = l.riza;
    talep.querySelector('.s').textContent = l.iptal; talep.querySelector('.p').textContent = l.talepGonder;
    $('#qaiInfo').textContent = l.gizlilik + (typeof durum.kalan === 'number' ? ' · ' + durum.kalan + l.kalan : '');
    cb.checked = cb.checked;
  }
  function tema() {
    try {
      var b = getComputedStyle(document.body);
      panel.style.background = (b.backgroundColor && b.backgroundColor !== 'rgba(0, 0, 0, 0)') ? b.backgroundColor : '#fff';
      panel.style.color = b.color || '#111';
    } catch (e) {}
  }
  function balon(rol, metin, kaynaklar) {
    var d = document.createElement('div'); d.className = 'm ' + (rol === 'kullanici' ? 'u' : 'b'); d.textContent = metin;
    if (kaynaklar && kaynaklar.length) { var k = document.createElement('span'); k.className = 'k'; k.textContent = T().kaynak + kaynaklar.join(' · '); d.appendChild(k); }
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function msg(t, renk) { var m = $('#qaiMsg'); m.textContent = t || ''; m.style.color = renk || ''; }

  // ---------- Sunucu çağrısı ----------
  async function cagri(govde) {
    var c = istemci(); if (!c) throw new Error('istemci');
    var s = await c.auth.getSession(); var tk = s.data && s.data.session && s.data.session.access_token; if (!tk) throw new Error('oturum');
    var r = await fetch(c.supabaseUrl + '/functions/v1/qai-sohbet', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk, apikey: c.supabaseKey },
      body: JSON.stringify(Object.assign({ modul: MODUL, lang: EN() ? 'en' : 'tr', sayfa: (location.pathname || '') + (location.hash || '') }, govde))
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(d.error || 'hata'); e.data = d; e.status = r.status; throw e; }
    return d;
  }
  async function durumuYenile() {
    var c = istemci(); if (!c) return;
    try {
      var r = await (typeof c.schema === 'function' ? c.schema('public') : c).rpc('qdl_qai_benim_durumum');
      durum = (r && r.data) || { yetkili: false };
    } catch (e) { durum = { yetkili: false }; }
    btn.classList.toggle('on', durum.yetkili === true);
    if (!durum.yetkili) panel.classList.remove('on');
    metinler();
  }

  async function sor(metin) {
    if (mesgul || !metin.trim()) return;
    mesgul = true; yolla.disabled = true; msg('');
    mesajlar.push({ rol: 'kullanici', metin: metin.trim() }); balon('kullanici', metin.trim());
    var bekle = balon('asistan', T().yaziyor);
    try {
      var d = await cagri({ mesajlar: mesajlar.slice(-6) });
      bekle.remove();
      var el = balon('asistan', d.yanit, d.kaynaklar); mesajlar.push({ rol: 'asistan', metin: d.yanit });
      if (d.bilgi_yok) {
        sonOzet = d.talep_ozeti || '';
        var tb = document.createElement('button'); tb.type = 'button'; tb.className = 'tb'; tb.textContent = T().talepBtn;
        tb.addEventListener('click', talepAc); log.appendChild(tb); log.scrollTop = log.scrollHeight;
      }
    } catch (e) {
      bekle.remove();
      if (e.status === 429 && e.data && e.data.yanit) balon('asistan', e.data.yanit);
      else if (e.status === 403) { btn.classList.remove('on'); panel.classList.remove('on'); }
      else msg(T().hata, '#ef4444');
    }
    mesgul = false; yolla.disabled = false; girdi.focus();
    durumuYenile();
  }

  function talepAc() {
    var ta = talep.querySelector('textarea'); ta.value = sonOzet || (mesajlar.filter(function (m) { return m.rol === 'kullanici'; }).pop() || {}).metin || '';
    talep.querySelector('input[type=checkbox]').checked = false;
    talep.querySelector('.p').disabled = true; talep.classList.add('on'); ta.focus();
  }
  talep.querySelector('input[type=checkbox]').addEventListener('change', function () { talep.querySelector('.p').disabled = !this.checked; });
  talep.querySelector('.s').addEventListener('click', function () { talep.classList.remove('on'); });
  talep.querySelector('.p').addEventListener('click', async function () {
    var b = this, ta = talep.querySelector('textarea'); if (b.disabled) return;
    b.disabled = true; msg('');
    try {
      await cagri({ action: 'talep', riza: true, metin: ta.value });
      talep.classList.remove('on'); balon('asistan', T().talepOk);
    } catch (e) { msg((e.data && e.data.error) || T().talepHata, '#ef4444'); b.disabled = false; }
  });

  function ac() { tema(); metinler(); panel.classList.add('on'); if (!acildi) { acildi = true; balon('asistan', T().selam); } setTimeout(function () { girdi.focus(); }, 40); }
  function kapat() { panel.classList.remove('on'); }
  btn.addEventListener('click', function () { panel.classList.contains('on') ? kapat() : ac(); });
  panel.querySelector('.x').addEventListener('click', kapat);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && panel.classList.contains('on')) kapat(); });
  $('#qaiForm').addEventListener('submit', function (ev) { ev.preventDefault(); var m = girdi.value; girdi.value = ''; sor(m); });

  // ---------- Başlat: oturum açılınca/değişince durumu sunucudan sor ----------
  function baslat() {
    metinler();
    var c = istemci(); if (!c) return;
    durumuYenile();
    try { c.auth.onAuthStateChange(function (olay) { if (olay === 'SIGNED_IN' || olay === 'SIGNED_OUT' || olay === 'USER_UPDATED') setTimeout(durumuYenile, 0); }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
