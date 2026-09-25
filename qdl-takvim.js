/* =========================================================================
 * qdl-takvim.js — QDATALINE ortak takvim (tarih seçici)
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-takvim.js
 * Modüllerin yayın kökünde birebir kopyası durur (qdl-hata.js ile aynı yöntem).
 *
 * KARAR (kullanıcı, 24.09.2026): 13 modülde tek tip takvim — gg.aa.yyyy,
 * hafta Pazartesi başlar, modül renginde.
 *
 * NASIL ÇALIŞIR: Sayfadaki <input type="date"> / "datetime-local" alanlarına
 * DOKUNMAZ (tür, name, value aynı kalır → mevcut kod ve React değişmeden
 * çalışır). Yalnız tarayıcının kendi açılır takvimini gizler, alana
 * tıklanınca bu takvimi açar. Seçilen gün input'a yerel value setter'ı ile
 * yazılır ve input+change olayları tetiklenir (React kontrollü alanlar dahil).
 * Klavyeyle yazma aynen çalışır.
 *
 * RENK: <script src="/qdl-takvim.js" data-renk="#0F766E"> → yoksa CSS
 * değişkeni --qdl-renk → --leaf (modüllerin ana rengi) → --primary → #2563EB.
 * Bir alanı hariç tutmak için: <input type="date" data-qdl-takvim="yok">
 * ========================================================================= */
(function () {
  'use strict';
  if (window.__qdlTakvim) return;
  window.__qdlTakvim = true;

  var scriptEl = document.currentScript;
  var AYLAR = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
  var GUNLER = ['Pt', 'Sa', '\u00c7a', 'Pe', 'Cu', 'Ct', 'Pz'];
  var EN = false;
  try { EN = (localStorage.getItem('qs_lang') || localStorage.getItem('lang') || document.documentElement.lang || '').slice(0, 2) === 'en'; } catch (e) {}
  if (EN) {
    AYLAR = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    GUNLER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  }
  var TXT = EN ? { bugun: 'Today', temizle: 'Clear', onceki: 'Previous month', sonraki: 'Next month' }
               : { bugun: 'Bug\u00fcn', temizle: 'Temizle', onceki: '\u00d6nceki ay', sonraki: 'Sonraki ay' };

  function renk() {
    var r = scriptEl && scriptEl.getAttribute('data-renk');
    if (r) return r;
    try {
      var cs = getComputedStyle(document.documentElement), bcs = getComputedStyle(document.body);
      var adlar = ['--qdl-renk', '--leaf', '--primary'];
      for (var i = 0; i < adlar.length; i++) {
        var v = (cs.getPropertyValue(adlar[i]) || bcs.getPropertyValue(adlar[i])).trim();
        if (v) return v;
      }
    } catch (e) {}
    return '#2563EB';
  }

  function hedefMi(el) {
    return el && el.tagName === 'INPUT' && (el.type === 'date' || el.type === 'datetime-local')
      && !el.disabled && !el.readOnly && el.getAttribute('data-qdl-takvim') !== 'yok';
  }

  // Taray\u0131c\u0131n\u0131n kendi takvim simgesini gizle (alan yine yaz\u0131labilir).
  var st = document.createElement('style');
  st.textContent =
    'input[type=date]:not([data-qdl-takvim=yok])::-webkit-calendar-picker-indicator,' +
    'input[type=datetime-local]:not([data-qdl-takvim=yok])::-webkit-calendar-picker-indicator{display:none}' +
    'input[type=date]:not([data-qdl-takvim=yok]),input[type=datetime-local]:not([data-qdl-takvim=yok]){cursor:pointer}' +
    '.qdl-tk{position:fixed;z-index:2147483000;width:272px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:12px;border-radius:12px;' +
    'box-shadow:0 12px 36px rgba(0,0,0,.28);font:13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;user-select:none}' +
    '.qdl-tk *{box-sizing:border-box}' +
    '.qdl-tk-bas{display:flex;align-items:center;gap:6px;margin-bottom:10px}' +
    '.qdl-tk-bas select{flex:1;min-width:0;padding:5px 4px;border-radius:7px;font:600 13px system-ui,sans-serif;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer}' +
    '.qdl-tk-bas select option{color:#111;background:#fff}' +
    '.qdl-tk-ok{width:28px;height:28px;flex:0 0 28px;border:none;border-radius:7px;background:transparent;color:inherit;font-size:17px;cursor:pointer}' +
    '.qdl-tk-ok:hover,.qdl-tk-g:hover:not(:disabled){background:rgba(127,127,127,.16)}' +
    '.qdl-tk-izgara{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}' +
    '.qdl-tk-gb{text-align:center;font-size:11px;font-weight:700;opacity:.55;padding:4px 0}' +
    '.qdl-tk-g{height:32px;border:none;border-radius:8px;background:transparent;color:inherit;font:500 13px system-ui,sans-serif;cursor:pointer}' +
    '.qdl-tk-g.dis{opacity:.35}.qdl-tk-g:disabled{opacity:.18;cursor:not-allowed}' +
    '.qdl-tk-g.hs{font-weight:700;opacity:.8}' +
    '.qdl-tk-alt{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid rgba(127,127,127,.2)}' +
    '.qdl-tk-alt button{border:none;background:transparent;font:600 12.5px system-ui,sans-serif;cursor:pointer;padding:6px 8px;border-radius:7px}' +
    '.qdl-tk-alt button:hover{background:rgba(127,127,127,.14)}';
  (document.head || document.documentElement).appendChild(st);

  var pano = null, aktif = null, gorunenAy = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isoOku(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function degerYaz(el, gunIso) {
    var yeni = gunIso;
    if (gunIso && el.type === 'datetime-local') {
      var saat = /T(\d{2}:\d{2})/.exec(el.value || '');
      var n = new Date();
      yeni = gunIso + 'T' + (saat ? saat[1] : pad(n.getHours()) + ':' + pad(n.getMinutes()));
    }
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, yeni);
    el.__qdlTk = true; // qdl-dialog.js: takvimden secim de "degisiklik" sayilir
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renkleri() {
    var bg = '#fff', fg = '#1f2937';
    try {
      var b = getComputedStyle(document.body);
      var c = b.backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        bg = c; fg = b.color || fg;
      }
    } catch (e) {}
    return { bg: bg, fg: fg };
  }

  function kapat() {
    if (pano) { pano.remove(); pano = null; }
    aktif = null;
  }

  function konumla() {
    if (!pano || !aktif) return;
    var r = aktif.getBoundingClientRect();
    var w = pano.offsetWidth, h = pano.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    pano.style.left = left + 'px';
    pano.style.top = Math.max(8, top) + 'px';
  }

  function ciz() {
    var ana = renk(), rk = renkleri();
    var secili = isoOku(aktif.value);
    var min = isoOku(aktif.min), max = isoOku(aktif.max);
    var bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    var y = gorunenAy.getFullYear(), m = gorunenAy.getMonth();

    pano.style.background = rk.bg;
    pano.style.color = rk.fg;
    pano.style.border = '1px solid rgba(127,127,127,.28)';
    pano.innerHTML = '';

    var bas = document.createElement('div'); bas.className = 'qdl-tk-bas';
    var geri = document.createElement('button'); geri.type = 'button'; geri.className = 'qdl-tk-ok'; geri.textContent = '\u2039'; geri.setAttribute('aria-label', TXT.onceki);
    var ileri = document.createElement('button'); ileri.type = 'button'; ileri.className = 'qdl-tk-ok'; ileri.textContent = '\u203a'; ileri.setAttribute('aria-label', TXT.sonraki);
    var aySel = document.createElement('select');
    AYLAR.forEach(function (a, i) { var o = document.createElement('option'); o.value = i; o.textContent = a; if (i === m) o.selected = true; aySel.appendChild(o); });
    var yilSel = document.createElement('select');
    var y0 = min ? min.getFullYear() : bugun.getFullYear() - 80, y1 = max ? max.getFullYear() : bugun.getFullYear() + 20;
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (var yy = y1; yy >= y0; yy--) { var o = document.createElement('option'); o.value = yy; o.textContent = yy; if (yy === y) o.selected = true; yilSel.appendChild(o); }
    geri.onclick = function () { gorunenAy = new Date(y, m - 1, 1); ciz(); };
    ileri.onclick = function () { gorunenAy = new Date(y, m + 1, 1); ciz(); };
    aySel.onchange = function () { gorunenAy = new Date(y, +aySel.value, 1); ciz(); };
    yilSel.onchange = function () { gorunenAy = new Date(+yilSel.value, m, 1); ciz(); };
    bas.appendChild(geri); bas.appendChild(aySel); bas.appendChild(yilSel); bas.appendChild(ileri);
    pano.appendChild(bas);

    var iz = document.createElement('div'); iz.className = 'qdl-tk-izgara';
    GUNLER.forEach(function (g) { var d = document.createElement('div'); d.className = 'qdl-tk-gb'; d.textContent = g; iz.appendChild(d); });
    var ilk = new Date(y, m, 1);
    var kay = (ilk.getDay() + 6) % 7; // Pazartesi = 0
    var d0 = new Date(y, m, 1 - kay);
    for (var i = 0; i < 42; i++) {
      var gun = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'qdl-tk-g';
      b.textContent = gun.getDate();
      if (gun.getMonth() !== m) b.className += ' dis';
      var hg = (gun.getDay() + 6) % 7; if (hg >= 5) b.className += ' hs';
      if ((min && gun < min) || (max && gun > max)) b.disabled = true;
      if (gun.getTime() === bugun.getTime()) { b.style.boxShadow = 'inset 0 0 0 1.5px ' + ana; }
      if (secili && gun.getTime() === secili.getTime()) { b.style.background = ana; b.style.color = '#fff'; b.style.opacity = '1'; b.style.fontWeight = '700'; }
      (function (gIso) { b.onclick = function () { var el = aktif; degerYaz(el, gIso); kapat(); try { el.focus(); } catch (e) {} }; })(iso(gun));
      iz.appendChild(b);
    }
    pano.appendChild(iz);

    var alt = document.createElement('div'); alt.className = 'qdl-tk-alt';
    var tmz = document.createElement('button'); tmz.type = 'button'; tmz.textContent = TXT.temizle; tmz.style.color = rk.fg; tmz.style.opacity = '.7';
    tmz.onclick = function () { var el = aktif; degerYaz(el, ''); kapat(); };
    if (aktif.required) tmz.style.visibility = 'hidden';
    var bgn = document.createElement('button'); bgn.type = 'button'; bgn.textContent = TXT.bugun; bgn.style.color = ana;
    if ((min && bugun < min) || (max && bugun > max)) bgn.disabled = true, bgn.style.opacity = '.35';
    bgn.onclick = function () { var el = aktif; degerYaz(el, iso(bugun)); kapat(); };
    alt.appendChild(tmz); alt.appendChild(bgn);
    pano.appendChild(alt);
    konumla();
  }

  function ac(el) {
    if (aktif === el && pano) return;
    kapat();
    aktif = el;
    var s = isoOku(el.value) || isoOku(el.min && new Date() < isoOku(el.min) ? el.min : '') || new Date();
    gorunenAy = new Date(s.getFullYear(), s.getMonth(), 1);
    pano = document.createElement('div');
    pano.className = 'qdl-tk';
    pano.setAttribute('role', 'dialog');
    pano.addEventListener('mousedown', function (e) { if (e.target.tagName !== 'SELECT') e.preventDefault(); });
    // Modal pencerelerin i\u00e7indeysek o pencerenin "d\u0131\u015far\u0131 t\u0131kland\u0131" mant\u0131\u011f\u0131n\u0131 tetiklememek i\u00e7in
    // olaylar panoda kal\u0131r.
    ['click', 'mousedown', 'pointerdown', 'touchstart'].forEach(function (t) {
      pano.addEventListener(t, function (e) { e.stopPropagation(); });
    });
    document.body.appendChild(pano);
    ciz();
  }

  document.addEventListener('click', function (e) {
    var el = e.target;
    if (hedefMi(el)) {
      e.preventDefault(); // Firefox kendi takvimini t\u0131klamada a\u00e7ar
      ac(el);
      return;
    }
    if (pano && !pano.contains(el)) kapat();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (!pano) return;
    if (e.key === 'Escape') { e.stopPropagation(); kapat(); }
    else if (e.key === 'Tab') kapat();
  }, true);

  // Klavyeyle de\u011fi\u015ftirilirse a\u00e7\u0131k takvim g\u00fcncellensin.
  document.addEventListener('input', function (e) {
    if (pano && e.target === aktif) { var d = isoOku(aktif.value); if (d) { gorunenAy = new Date(d.getFullYear(), d.getMonth(), 1); ciz(); } }
  }, true);

  window.addEventListener('resize', kapat);
  window.addEventListener('scroll', function (e) {
    if (!pano) return;
    if (pano.contains(e.target)) return;
    if (aktif && !document.contains(aktif)) { kapat(); return; }
    konumla();
  }, true);

  // Programla a\u00e7\u0131lan taray\u0131c\u0131 takvimi (el.showPicker()) de bizimkine y\u00f6nlensin.
  try {
    var orj = HTMLInputElement.prototype.showPicker;
    if (orj) {
      HTMLInputElement.prototype.showPicker = function () {
        if (hedefMi(this)) { ac(this); return; }
        return orj.apply(this, arguments);
      };
    }
  } catch (e) {}
})();
