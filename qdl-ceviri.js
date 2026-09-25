/* =========================================================================
 * qdl-ceviri.js — QDATALINE ortak "eksik İngilizce" tamamlayıcı
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-ceviri.js
 *
 * NEDEN (25.09.2026, E2E B-22/B-23): modüllerin kendi t() sözlükleri arayüzün
 * yalnız bir kısmını kapsıyordu; EN modunda KPI başlıkları, liste başlıkları,
 * butonlar Türkçe kalıyordu. Her metni koda tek tek sarmak yerine: EN modunda
 * ekrandaki metin düğümleri modülün sözlüğüne (window.QDL_EN, modül kökündeki
 * qdl-en.js) bakılarak çevrilir. Yalnız sözlükte BİREBİR bulunan arayüz metinleri
 * değişir — kullanıcı verisi (firma/kişi adı, açıklamalar) sözlükte olmadığı
 * için dokunulmaz. TR'ye dönüşte orijinal metin geri yazılır.
 *
 * Dil: <html lang="en"> ise çevirir. Modüller dil değiştirince html lang'ı
 * günceller (MutationObserver bunu da izler).
 * Sözlük: window.QDL_EN = { 'Türkçe metin': 'English', ... }
 *         window.QDL_EN_RE = [ [/^Plan Dışı \((\d+)\)$/, 'Unplanned ($1)'], ... ]
 * ========================================================================= */
(function () {
  'use strict';
  if (window.__qdlCeviri) return;
  window.__qdlCeviri = true;

  var ATTR = ['placeholder', 'title', 'aria-label'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

  function en() { return (document.documentElement.getAttribute('lang') || '').slice(0, 2) === 'en'; }
  function sozluk() { return window.QDL_EN || {}; }

  function cevir(tr) {
    var d = sozluk();
    if (Object.prototype.hasOwnProperty.call(d, tr)) return d[tr];
    var re = window.QDL_EN_RE || [];
    for (var i = 0; i < re.length; i++) { if (re[i][0].test(tr)) return tr.replace(re[i][0], re[i][1]); }
    return null;
  }

  function metinDugumu(n) {
    var p = n.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-qdl-ceviri="yok"],[contenteditable="true"]'))) return;
    var raw = n.nodeValue; if (!raw) return;
    if (en()) {
      var t = raw.trim(); if (!t || t.length > 200) return;
      if (n.__qdlEn === raw) return; // zaten bizim \u00e7evirimiz
      var c = cevir(t); if (c == null) return;
      n.__qdlTr = raw; n.__qdlEn = raw.replace(t, c); n.nodeValue = n.__qdlEn;
    } else if (n.__qdlTr != null && n.nodeValue === n.__qdlEn) {
      n.nodeValue = n.__qdlTr; delete n.__qdlTr; delete n.__qdlEn;
    }
  }
  function nitelikler(el) {
    for (var i = 0; i < ATTR.length; i++) {
      var a = ATTR[i], v = el.getAttribute(a); if (!v) continue;
      var k = '__qdlA_' + a;
      if (en()) { if (el[k] && el[k].en === v) continue; var c = cevir(v.trim()); if (c != null) { el[k] = { tr: v, en: c }; el.setAttribute(a, c); } }
      else if (el[k] && el[k].en === v) { el.setAttribute(a, el[k].tr); delete el[k]; }
    }
  }
  function tara(kok) {
    if (!kok) return;
    if (kok.nodeType === 3) { metinDugumu(kok); return; }
    if (kok.nodeType !== 1 || SKIP[kok.nodeName]) return;
    if (kok.hasAttribute && (kok.hasAttribute('placeholder') || kok.hasAttribute('title') || kok.hasAttribute('aria-label'))) nitelikler(kok);
    var w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) metinDugumu(n);
      else if (n.hasAttribute('placeholder') || n.hasAttribute('title') || n.hasAttribute('aria-label')) nitelikler(n);
    }
  }

  var bekleyen = [], zamanli = false;
  function isle() {
    zamanli = false;
    var liste = bekleyen; bekleyen = [];
    gozlemci.disconnect();
    try { for (var i = 0; i < liste.length; i++) tara(liste[i]); }
    finally { gozlemci.observe(document.documentElement, SECENEK); }
  }
  function kuyruk(n) { bekleyen.push(n); if (!zamanli) { zamanli = true; (window.requestAnimationFrame || setTimeout)(isle); } }

  var SECENEK = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['lang', 'placeholder', 'title'] };
  var gozlemci = new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === 'attributes' && m.attributeName === 'lang' && m.target === document.documentElement) { kuyruk(document.body); continue; }
      if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) kuyruk(m.addedNodes[j]); }
      else kuyruk(m.target);
    }
  });

  function baslat() { gozlemci.observe(document.documentElement, SECENEK); if (en()) tara(document.body); }
  if (document.body) baslat(); else document.addEventListener('DOMContentLoaded', baslat);
  window.qdlCeviriYenile = function () { tara(document.body); };
})();
