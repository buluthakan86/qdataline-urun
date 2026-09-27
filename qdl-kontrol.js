/* qdl-kontrol.js — Platform geneli dil (TR|EN) ve tema (☀/☾) kontrollerinin tek tip yerleşimi. 27.09.2026
 * Standart = Q-Kalite (Şikayet ve DÖF Yönetimi):
 *   - Dil: sol menü altında, kullanıcı/Çıkış'ın hemen üstünde, yan yana iki eşit düğme (TR | EN), seçili dolgulu.
 *   - Tema: sağ üst çubukta 32x32 kare düğme, ☀ (açık) / ☾ (koyu).
 * Modülün kendi düğmeleri GİZLENİR ama silinmez; yeni düğmeler tıklamayı onlara aktarır
 * (modülün dil/tema mantığına dokunulmaz).
 * Kullanım (script etiketinin data-* nitelikleri; hepsi CSS seçicisi):
 *   data-lang      modülün kendi dil düğmesi (tek düğme, üzerinde geçilecek dil yazar: "EN"/"TR")
 *   data-lang-yer  dil grubunun ekleneceği kap (başına eklenir). Yoksa orijinal düğmenin yerine konur.
 *   data-theme     modülün kendi tema düğmesi
 *   data-tema-yer  tema düğmesinin ekleneceği kap (sonuna; varsa data-tema-once öğesinin önüne). Yoksa orijinalin yerine.
 *   data-tema-once kap içinde önüne eklenecek öğe (ör. "#btnAdd")
 */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me) return;
  var cfg = {
    lang: me.getAttribute('data-lang'),
    langYer: me.getAttribute('data-lang-yer'),
    theme: me.getAttribute('data-theme'),
    temaYer: me.getAttribute('data-tema-yer'),
    temaOnce: me.getAttribute('data-tema-once')
  };

  var css = [
    '.qdlk-lang{display:flex;flex-wrap:wrap;gap:4px;width:100%;margin:0 0 8px}',
    '.qdlk-lang button{flex:1 1 40px;font:inherit;font-size:11px;padding:5px 0;border-radius:6px;cursor:pointer;',
    'border:1px solid rgba(140,160,150,.35);background:transparent;color:inherit;font-weight:500;line-height:1.2}',
    '.qdlk-lang button[aria-pressed="true"]{background:linear-gradient(135deg,#10B981,#0E9F6E);border-color:transparent;color:#06140E;font-weight:800}',
    '.qdlk-tema{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;',
    'border-radius:8px;cursor:pointer;font:inherit;font-size:15px;line-height:1;padding:0;margin:0 4px;',
    'border:1px solid rgba(140,160,150,.35);background:transparent;color:inherit;transition:.13s}',
    '.qdlk-tema:hover{border-color:#10B981;color:#10B981}'
  ];
  // Gizleme kuralı yeni düğmeleri (.qdlk-*) asla kapsamaz (seçici "tema" gibi ortak bir başlıkla eşleşebilir).
  if (cfg.lang) css.push(':is(' + cfg.lang + '):not(.qdlk-tema):not(.qdlk-lang *){display:none!important}');
  if (cfg.theme) css.push(':is(' + cfg.theme + '):not(.qdlk-tema):not(.qdlk-lang *){display:none!important}');
  var st = document.createElement('style');
  st.textContent = css.join('');
  (document.head || document.documentElement).appendChild(st);

  // Seçiciye uyan ilk öğe; betiğin kendi düğmeleri hariç.
  function q(sel) {
    if (!sel) return null;
    try {
      var l = document.querySelectorAll(sel);
      for (var i = 0; i < l.length; i++) if (!l[i].closest('.qdlk-lang,.qdlk-tema')) return l[i];
    } catch (e) { /* geçersiz seçici */ }
    return null;
  }

  // Şu anki dil: tek düğme "geçilecek" dili gösterir ("EN" yazıyorsa sayfa Türkçedir).
  function aktifDil() {
    var o = q(cfg.lang);
    if (o) {
      var t = (o.textContent || '').trim().toUpperCase();
      if (/^EN\b|ENGLISH/.test(t)) return 'tr';
      if (/^TR\b|TÜRKÇE/.test(t)) return 'en';
    }
    var h = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    return h === 'en' ? 'en' : 'tr';
  }

  // Açık/koyu: sayfa zemininin parlaklığından (her modül farklı işaret kullandığı için en güvenilir yol).
  function acikMi() {
    var els = [document.querySelector('main'), document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      var c = getComputedStyle(els[i]).backgroundColor;
      var m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      if (!m || (m[4] !== undefined && +m[4] === 0)) continue;
      return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 > 0.5;
    }
    return false;
  }

  var dilGrup = null, temaBtn = null;

  // 'cikis': sol menüdeki Çıkış düğmesinin kabı (kullanıcı adı + Çıkış bloğu); dil grubu bu bloğun başına girer.
  function cikisKabi() {
    var bs = document.querySelectorAll('aside button, aside a, nav button');
    for (var i = 0; i < bs.length; i++) {
      if (/Çıkış|Log ?out|Sign ?out/i.test(bs[i].textContent || '') && bs[i].offsetParent) return bs[i].parentNode;
    }
    return null;
  }
  function ayarla(el, ad, deger) { if (el.getAttribute(ad) !== deger) el.setAttribute(ad, deger); }

  function dilKur() {
    var o = q(cfg.lang);
    if (!o) return;
    if (!dilGrup) {
      dilGrup = document.createElement('div');
      dilGrup.className = 'qdlk-lang';
      dilGrup.setAttribute('role', 'group');
      ['tr', 'en'].forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = k.toUpperCase();
        b.setAttribute('data-k', k);
        b.addEventListener('click', function () {
          if (aktifDil() === k) return;
          var org = q(cfg.lang);
          if (org) org.click();
          setTimeout(guncelle, 60);
        });
        dilGrup.appendChild(b);
      });
    }
    if (!dilGrup.isConnected) {
      var yer = cfg.langYer === 'cikis' ? cikisKabi() : q(cfg.langYer);
      if (yer) yer.insertBefore(dilGrup, yer.firstChild);
      else if (o.parentNode) o.parentNode.insertBefore(dilGrup, o);
    }
  }

  function temaKur() {
    var o = q(cfg.theme);
    if (!o) return;
    if (!temaBtn) {
      temaBtn = document.createElement('button');
      temaBtn.type = 'button';
      temaBtn.className = 'qdlk-tema';
      temaBtn.addEventListener('click', function () {
        var org = q(cfg.theme);
        if (org) org.click();
        setTimeout(guncelle, 60);
      });
    }
    if (!temaBtn.isConnected) {
      var yer = q(cfg.temaYer);
      if (yer) {
        var once = cfg.temaOnce ? yer.querySelector(cfg.temaOnce) : null;
        yer.insertBefore(temaBtn, once && once.parentNode === yer ? once : null);
      } else if (o.parentNode) o.parentNode.insertBefore(temaBtn, o);
    }
  }

  function guncelle() {
    if (dilGrup) {
      var d = aktifDil();
      ayarla(dilGrup, 'aria-label', d === 'en' ? 'Language selection' : 'Dil seçimi');
      [].forEach.call(dilGrup.children, function (b) { ayarla(b, 'aria-pressed', b.getAttribute('data-k') === d ? 'true' : 'false'); });
    }
    if (temaBtn) {
      var acik = acikMi(), en = aktifDil() === 'en';
      var ik = acik ? '☀' : '☾';
      if (temaBtn.textContent !== ik) temaBtn.textContent = ik;
      var t = acik ? (en ? 'Switch to dark theme' : 'Koyu temaya geç') : (en ? 'Switch to light theme' : 'Açık temaya geç');
      ayarla(temaBtn, 'title', t);
      ayarla(temaBtn, 'aria-label', t);
    }
  }

  var bekleyen = false;
  function tur() {
    bekleyen = false;
    dilKur(); temaKur(); guncelle();
  }
  function planla() { if (!bekleyen) { bekleyen = true; requestAnimationFrame(tur); } }

  function basla() {
    tur();
    new MutationObserver(planla).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'data-theme', 'lang'] });
    new MutationObserver(planla).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla);
  else basla();
})();
