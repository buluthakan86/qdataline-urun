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
/* qdl-destek-link.js — "Sorun bildir" penceresine "Asistanla görüş" bağlantısı ekler (04.10.2026).
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-destek-link.js — modül yayın köküne birebir kopyalanır.
 * Kullanım: <script src="/qdl-destek-link.js?v=20261004" data-modul="boy" defer></script>   (data-modul = qdl_modul_katalog.kod)
 * Pencere her modülde farklı şablonla kurulduğu için içeriğe dokunulmaz: açıklama kutusu (#sbAciklama ya da bilinen
 * yer tutucu metinli textarea) DOM'a girince bağlantı kutunun hemen üstüne bir kez eklenir. Bağlantı qdataline.com/destek
 * sayfasını yeni sekmede açar (SSO çerezi sayesinde oturum açık gelir).
 */
(function () {
  'use strict';
  var me = document.currentScript;
  var modul = (me && me.getAttribute('data-modul')) || 'core';
  var SEC = '#sbAciklama,textarea[placeholder^="Örn: bu ekrandaki"],textarea[placeholder^="e.g. this number"],textarea[placeholder^="Ne fark ettiniz"],textarea[placeholder^="What did you notice"]';
  function dil() {
    try { var l = (localStorage.getItem('qd_lang') || document.documentElement.lang || 'tr'); return String(l).slice(0, 2) === 'en' ? 'en' : 'tr'; } catch (e) { return 'tr'; }
  }
  function ekle() {
    var tas = document.querySelectorAll(SEC);
    for (var i = 0; i < tas.length; i++) {
      var ta = tas[i];
      if (ta.getAttribute('data-qd-destek')) continue;
      ta.setAttribute('data-qd-destek', '1');
      var en = dil() === 'en';
      var a = document.createElement('a');
      a.href = 'https://qdataline.com/destek?modul=' + encodeURIComponent(modul);
      a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('data-qd-destek-link', '1');
      a.style.cssText = 'display:block;margin:0 0 8px;font-size:12.5px;font-weight:600;color:var(--leaf,var(--acc,var(--primary,#10B981)));text-decoration:underline';
      a.textContent = (en ? 'Talk to the support assistant — it asks a few questions and sends a complete request' : 'Destek asistanıyla görüşün — birkaç soru sorar, talebi eksiksiz iletir') + ' →';
      var onceki = ta.previousElementSibling;
      var hedef = onceki && onceki.tagName === 'LABEL' ? onceki : ta;
      if (hedef.parentNode) hedef.parentNode.insertBefore(a, hedef);
    }
  }
  var bekliyor = false;
  function planla() {
    if (bekliyor) return; bekliyor = true;
    (window.requestAnimationFrame || setTimeout)(function () { bekliyor = false; ekle(); });
  }
  function baslat() {
    ekle();
    try { new MutationObserver(planla).observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
