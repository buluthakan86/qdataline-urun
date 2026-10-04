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
