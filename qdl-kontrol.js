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
 *   data-tema-anahtar  modülün kendi tema düğmesi YOKSA: temayı bu betik yönetir (html[data-theme] + localStorage
 *                      anahtarı). Titreme olmasın diye bu durumda etiket <head> içine konur. (27.09: BOY, İSG)
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
    temaOnce: me.getAttribute('data-tema-once'),
    temaAnahtar: me.getAttribute('data-tema-anahtar')
  };

  // Kendi tema düğmesi olmayan modül: kayıtlı temayı HEMEN uygula (sayfa boyanmadan).
  function temaOku() { try { return localStorage.getItem(cfg.temaAnahtar) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function temaUygula(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }
  if (cfg.temaAnahtar) temaUygula(temaOku());

  var css = [
    '.qdlk-lang{display:flex;flex-wrap:wrap;gap:4px;width:100%;margin:0 0 8px}',
    '.qdlk-lang button{flex:1 1 40px;font:inherit;font-size:11px;padding:5px 0;border-radius:6px;cursor:pointer;',
    'border:1px solid rgba(140,160,150,.35);background:transparent;color:inherit;font-weight:500;line-height:1.2}',
    '.qdlk-lang button[aria-pressed="true"]{background:var(--qdlk-vurgu);border-color:transparent;color:var(--qdlk-vurgu-yazi);font-weight:800}',
    '.qdlk-tema{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;',
    'border-radius:8px;cursor:pointer;font:inherit;font-size:15px;line-height:1;padding:0;margin:0 4px;',
    'border:1px solid rgba(140,160,150,.35);background:transparent;color:inherit;transition:.13s}',
    '.qdlk-tema:hover{border-color:var(--qdlk-vurgu);color:var(--qdlk-vurgu)}'
  ];
  // Gizleme kuralı yeni düğmeleri (.qdlk-*) asla kapsamaz (seçici "tema" gibi ortak bir başlıkla eşleşebilir).
  if (cfg.lang) css.push(':is(' + cfg.lang + '):not(.qdlk-tema):not(.qdlk-lang *){display:none!important}');
  if (cfg.theme) css.push(':is(' + cfg.theme + '):not(.qdlk-tema):not(.qdlk-lang *){display:none!important}');
  // Seçili dil rengi = modülün kendi vurgu rengi (--leaf; Q-Kalite'de de modül rengi). Yazı rengi zeminin açıklığına göre.
  function vurguAyarla() {
    var v = (getComputedStyle(document.documentElement).getPropertyValue('--leaf') || '').trim() || '#10B981';
    var m = v.match(/^#([0-9a-f]{6})$/i), yazi = '#fff';
    if (m) {
      var n = parseInt(m[1], 16), l = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
      if (l > 0.55) yazi = '#1a1405';
    }
    document.documentElement.style.setProperty('--qdlk-vurgu', v);
    document.documentElement.style.setProperty('--qdlk-vurgu-yazi', yazi);
  }
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
      // Yalnız sol menüdeki (ekranın sol kenarındaki) Çıkış düğmesi; içerikteki başka "Çıkış" düğmeleri sayılmaz.
      if (/Çıkış|Log ?out|Sign ?out/i.test(bs[i].textContent || '') && bs[i].offsetParent && bs[i].getBoundingClientRect().left < 200) return bs[i].parentNode;
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
    if (cfg.langYer) {
      // Hedef yer belirtilmişse yalnız oraya konur (sayfa hazır olmadan yedek konuma düşmesin); hazır olunca taşınır.
      var yer = cfg.langYer === 'cikis' ? cikisKabi() : q(cfg.langYer);
      if (yer && dilGrup.parentNode !== yer) yer.insertBefore(dilGrup, yer.firstChild);
    } else if (!dilGrup.isConnected && o.parentNode) {
      // Orijinalin yerine konunca onun yatay kenar boşluklarını al (ör. Gıda'da düğme 14px içerideydi).
      var cs = getComputedStyle(o), ml = cs.marginLeft, mr = cs.marginRight;
      if (o.style.margin) dilGrup.style.margin = o.style.margin; // "auto 14px 14px" gibi (menü altına itme dahil)
      if (ml !== '0px' || mr !== '0px') {
        dilGrup.style.marginLeft = ml; dilGrup.style.marginRight = mr;
        dilGrup.style.width = 'calc(100% - ' + ml + ' - ' + mr + ')';
      }
      o.parentNode.insertBefore(dilGrup, o);
    }
  }

  function temaKur() {
    var o = cfg.temaAnahtar ? null : q(cfg.theme);
    if (!o && !cfg.temaAnahtar) return;
    if (!temaBtn) {
      temaBtn = document.createElement('button');
      temaBtn.type = 'button';
      temaBtn.className = 'qdlk-tema';
      temaBtn.addEventListener('click', function () {
        if (cfg.temaAnahtar) {
          var yeni = temaOku() === 'light' ? 'dark' : 'light';
          try { localStorage.setItem(cfg.temaAnahtar, yeni); } catch (e) { /* yoksay */ }
          temaUygula(yeni);
        }
        var org = cfg.temaAnahtar ? null : q(cfg.theme);
        if (org) org.click();
        setTimeout(guncelle, 60);
      });
    }
    if (cfg.temaYer) {
      var yer = q(cfg.temaYer);
      if (yer && temaBtn.parentNode !== yer) {
        var once = cfg.temaOnce ? yer.querySelector(cfg.temaOnce) : null;
        yer.insertBefore(temaBtn, once && once.parentNode === yer ? once : null);
      }
    } else if (!temaBtn.isConnected && o && o.parentNode) o.parentNode.insertBefore(temaBtn, o);
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
    vurguAyarla(); // açık/koyu temada --leaf değişebilir
    dilKur(); temaKur(); guncelle();
  }
  function planla() { if (!bekleyen) { bekleyen = true; requestAnimationFrame(tur); } }

  function basla() {
    vurguAyarla();
    tur();
    new MutationObserver(planla).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'data-theme', 'lang'] });
    new MutationObserver(planla).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla);
  else basla();
})();
