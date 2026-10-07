/*QDL-DOCK-BEGIN v20261008*/
/* Q-AI + "Sorun bildir" ortak yüzen düğme yığını (08.10.2026). Kaynak: _platform-ortak/istemci/qdl-ajan.js ile qdl-destek-link.js içinde
 * BİREBİR aynı blok durur (ikisi de aynı sonucu verir; window.__qdlDock ile bir kez çalışır).
 * Kural: iki küçük yuvarlak simge sağ altta alt alta durur (çakışmaz); altta sabit çubuk/düğme varsa üstüne çıkar; tam ekran pencere/menü
 * açıkken gizlenir; yazdırmada gizli; kullanıcı küçültebilir (tercih tarayıcıda saklanır). */
(function () {
  'use strict';
  if (window.__qdlDock) return;
  window.__qdlDock = true;
  var ANAHTAR = 'qdl_dock_kapali', ARA = 44, TABAN = 14, KOLON = 56;
  var kok = document.documentElement;
  var en = function () { try { return (localStorage.getItem('qd_lang') || kok.lang || '').slice(0, 2) === 'en'; } catch (e) { return false; } };
  function kapaliMi() { try { return localStorage.getItem(ANAHTAR) === '1'; } catch (e) { return false; } }
  function kapaliYaz(v) { try { localStorage.setItem(ANAHTAR, v ? '1' : '0'); } catch (e) {} }

  var SB = ['#sorunBildirBtn', '#qdlSorunBtn', '#qk-tour-sorunbildir'];
  var BS = SB.concat(['#qaiBtn']);
  var L = function (arr, pre, tail) { return arr.map(function (x) { return (pre || '') + x + (tail || ''); }).join(','); };
  var ALT = ' + env(safe-area-inset-bottom,0px))!important}';
  var css =
    L(BS) + '{position:fixed!important;left:auto!important;right:10px!important;width:36px!important;height:36px!important;min-width:0!important;padding:0!important;margin:0!important;' +
    'border-radius:50%!important;justify-content:center!important;align-items:center!important;gap:0!important;z-index:190!important;font-size:0!important;line-height:0!important;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.28)!important;transform:none!important;opacity:.92;transition:opacity .15s,box-shadow .15s;' +
    'background:#343852!important;color:#E4E8F2!important;border:1px solid rgba(255,255,255,.22)!important}' +
    '#qaiBtn{background:#5B45A8!important;color:#fff!important;border:1px solid rgba(255,255,255,.24)!important}' +
    L(SB, 'html[data-qd-tema="a"] ') + '{background:#fff!important;color:#475069!important;border:1px solid #B8C0D4!important}' +
    L(BS, '', ' svg') + '{width:18px!important;height:18px!important;margin:0!important}' +
    L(SB, '', ' span') + ',#qaiBtn .l{display:none!important}' +
    L(SB) + '{bottom:calc(var(--qd-b,' + TABAN + 'px)' + ALT +
    '#qaiBtn{bottom:calc(var(--qd-q,' + (TABAN + ARA) + 'px)' + ALT +
    L(BS, '', ':hover') + ',' + L(BS, '', ':focus-visible') + '{opacity:1;box-shadow:0 4px 14px rgba(0,0,0,.4)!important}' +
    '#qaiPanel{right:10px!important;bottom:calc(var(--qd-t,' + (TABAN + ARA * 2) + 'px) + 6px + env(safe-area-inset-bottom,0px))!important;max-height:calc(100vh - var(--qd-t,' + (TABAN + ARA * 2) + 'px) - 24px)!important}' +
    '#qdlDockTg{position:fixed;right:17px;bottom:calc(var(--qd-t,' + (TABAN + ARA * 2) + 'px) + env(safe-area-inset-bottom,0px));z-index:190;width:22px;height:22px;padding:0;border-radius:50%;' +
    'display:none;align-items:center;justify-content:center;cursor:pointer;background:#343852;color:#E4E8F2;border:1px solid rgba(255,255,255,.22);font:700 13px/1 system-ui,sans-serif;opacity:.7}' +
    '#qdlDockTg.on{display:flex}#qdlDockTg:hover,#qdlDockTg:focus-visible{opacity:1}' +
    'html[data-qd-tema="a"] #qdlDockTg{background:#fff;color:#475069;border-color:#B8C0D4}' +
    L(BS, 'html.qd-dock-kapali ') + '{display:none!important}' +
    'html.qd-dock-kapali #qdlDockTg{bottom:calc(var(--qd-b,' + TABAN + 'px) + env(safe-area-inset-bottom,0px));opacity:.55}' +
    L(BS, 'html.qd-dock-modal ') + ',html.qd-dock-modal #qdlDockTg{opacity:0!important;pointer-events:none!important}' +
    '@media print{' + L(BS) + ',#qdlDockTg,#qaiPanel{display:none!important}}';
  var st = document.createElement('style'); st.id = 'qdlDockCss'; st.textContent = css; (document.head || kok).appendChild(st);

  var tg = null;
  var BIZIM = { sorunBildirBtn: 1, qdlSorunBtn: 1, 'qk-tour-sorunbildir': 1, qaiBtn: 1, qdlDockTg: 1, qaiPanel: 1 };
  function tgYap() {
    if (tg || !document.body) return;
    tg = document.createElement('button'); tg.id = 'qdlDockTg'; tg.type = 'button';
    tg.addEventListener('click', function () { var k = !kok.classList.contains('qd-dock-kapali'); kok.classList.toggle('qd-dock-kapali', k); kapaliYaz(k); yaz(); });
    document.body.appendChild(tg);
  }
  function yaz() {
    tgYap(); if (!tg) return;
    var sb = null, i;
    for (i = 0; i < SB.length && !sb; i++) sb = document.querySelector(SB[i]);
    var qa = document.getElementById('qaiBtn');
    var kapali = kok.classList.contains('qd-dock-kapali');
    // düğmeler kapalıyken display:none!important olur; "var mı" kararı satır içi/sınıf durumundan verilir
    var sv = !!sb && sb.style.display !== 'none', qv = !!qa && qa.classList.contains('on');
    var tr = en() ? { k: 'Minimize help buttons', a: 'Show help buttons', s: 'Report a problem' } : { k: 'Yardım düğmelerini küçült', a: 'Yardım düğmelerini göster', s: 'Sorun bildir' };
    if (sb && !sb.title) { sb.title = tr.s; if (!sb.getAttribute('aria-label')) sb.setAttribute('aria-label', tr.s); }
    var W = innerWidth, H = innerHeight, tum = document.body.querySelectorAll('*'), bar = 0, modal = false, n = Math.min(tum.length, 4000);
    for (i = 0; i < n; i++) {
      var e = tum[i]; if (BIZIM[e.id]) continue;
      var s = getComputedStyle(e); if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden') continue;
      var r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
      // alt kenara yaslı çubuk ya da sağ alttaki başka sabit düğme: dock onun üstüne çıkar
      if (r.top < H && r.bottom >= H - 120 && r.right > W - KOLON && r.height <= 170) bar = Math.max(bar, H - r.top);
      // tam ekran pencere/menü perdesi
      var z = parseInt(s.zIndex, 10);
      if (z >= 50 && r.width >= W * 0.9 && r.height >= H * 0.9 && !/tour|onboard|intro|spotlight|toast|loading|splash/i.test(e.id + ' ' + (typeof e.className === 'string' ? e.className : ''))) modal = true;
    }
    var b = TABAN + (bar ? bar - 0 + 4 : 0);
    var q = b + (sv ? ARA : 0), t = q + (qv ? ARA : 0);
    kok.style.setProperty('--qd-b', b + 'px'); kok.style.setProperty('--qd-q', q + 'px'); kok.style.setProperty('--qd-t', t + 'px');
    tg.classList.toggle('on', sv || qv);
    tg.textContent = kapali ? '+' : '–'; tg.title = kapali ? tr.a : tr.k; tg.setAttribute('aria-label', tg.title);
    kok.classList.toggle('qd-dock-modal', modal);
    try {
      var bg = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || [];
      if (bg.length > 3 && +bg[3] === 0) bg = getComputedStyle(kok).backgroundColor.match(/[\d.]+/g) || [255, 255, 255];
      var lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
      if (lum > 0.6) kok.setAttribute('data-qd-tema', 'a'); else kok.removeAttribute('data-qd-tema');
    } catch (x) {}
  }
  function basla() {
    if (kapaliMi()) kok.classList.add('qd-dock-kapali');
    try { yaz(); } catch (e) {}
    setInterval(function () { if (!document.hidden) { try { yaz(); } catch (e) {} } }, 1500);
    addEventListener('resize', function () { try { yaz(); } catch (e) {} });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
/*QDL-DOCK-END*/
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
  var ACCENT = '#5B45A8';

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
    'background:' + ACCENT + ';color:#fff;border:1px solid rgba(255,255,255,.25);box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer;font:700 13px/1 system-ui,sans-serif}' +
    '#qaiBtn.on{display:flex}#qaiBtn svg{width:20px;height:20px}' +
    '@media (max-width:640px){#qaiBtn{padding:0;width:44px;justify-content:center}#qaiBtn .l{display:none}}' +
    '#qaiPanel{position:fixed;right:18px;bottom:calc(' + (ALT + 54) + 'px + env(safe-area-inset-bottom,0px));z-index:9991;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - ' + (ALT + 80) + 'px));display:none;flex-direction:column;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(127,127,127,.35);font:14px/1.5 system-ui,sans-serif}' +
    '#qaiPanel.on{display:flex}' +
    '#qaiPanel .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:' + ACCENT + ';color:#fff}' +
    '#qaiPanel .hd b{font-size:15px}#qaiPanel .hd small{display:block;font-size:11.5px;opacity:.8;font-weight:500}#qaiPanel .hd .x{margin-left:auto;background:transparent;border:0;color:inherit;font-size:20px;cursor:pointer;line-height:1}' +
    '#qaiLog{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-height:120px}' +
    '#qaiLog .m{max-width:88%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}' +
    '#qaiLog .u{align-self:flex-end;background:' + ACCENT + ';color:#fff}' +
    '#qaiLog .b{align-self:flex-start;background:rgba(127,127,127,.16)}' +
    '#qaiLog .k{display:block;margin-top:5px;font-size:11.5px;opacity:.7}' +
    '#qaiLog .tb{align-self:flex-start;border:1px solid ' + ACCENT + ';background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font:600 12.5px system-ui,sans-serif;cursor:pointer}' +
    '#qaiTalep{display:none;padding:10px 14px;border-top:1px solid rgba(127,127,127,.3)}#qaiTalep.on{display:block}' +
    '#qaiTalep textarea{width:100%;box-sizing:border-box;min-height:70px;border-radius:8px;padding:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit}' +
    '#qaiTalep label{display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:6px 0}' +
    '#qaiTalep .ak{display:flex;gap:8px;justify-content:flex-end}' +
    '#qaiPanel button.p{border-radius:8px;padding:7px 14px;font:700 13px system-ui,sans-serif;cursor:pointer;background:' + ACCENT + ';color:#fff;border:0}' +
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
