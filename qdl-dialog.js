/* =========================================================================
 * qdl-dialog.js — QDATALINE ortak onay penceresi + "kaydedilmemiş değişiklik" kontrolü
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-dialog.js
 * Modüllerin yayın kökünde birebir kopyası durur (qdl-hata.js / qdl-takvim.js ile aynı yöntem).
 *
 * KARAR (kullanıcı, 24.09.2026): tarayıcının gri confirm() kutusu yerine modül
 * renginde pencere; form kapatılırken YALNIZ gerçekten değişiklik yapıldıysa
 * sorulur (Ekipman'daki qdlDialog/qdlCloseOverlay deseni, platform geneline).
 *
 * API:
 *   qdlDialog({title, text, ok, cancel, tone:'warn'}) → Promise<boolean>
 *   qdlKirliMi(kok)   → kök eleman içinde kullanıcının elle değiştirdiği alan var mı
 *   qdlKapatSor(kok)  → Promise<boolean>: değişiklik yoksa hemen true; varsa sorar
 *
 * Değişiklik takibi: kullanıcının GERÇEK (isTrusted) input/change olayları ve
 * ortak takvimden yapılan seçimler işaretlenir. Form programla doldurulurken
 * (düzenleme açılışı) olay tetiklenmediği için "değişti" sayılmaz. Modal içeriği
 * yeniden çizildiğinde yeni elemanlar temiz başlar.
 * ========================================================================= */
(function () {
  'use strict';
  if (window.qdlKapatSor) return;

  var dokunulan = new WeakSet();
  var liste = []; // WeakSet dolaşılamadığı için zayıf olmayan kısa liste (kopuk olanlar temizlenir)
  function isaretle(el) {
    if (!el || !el.tagName) return;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) return;
    if (el.type === 'file' && !(el.files && el.files.length)) return;
    if (!dokunulan.has(el)) { dokunulan.add(el); liste.push(el); }
  }
  ['input', 'change'].forEach(function (t) {
    document.addEventListener(t, function (e) {
      if (e.isTrusted || (e.target && e.target.__qdlTk)) isaretle(e.target);
    }, true);
  });

  function kirliMi(kok) {
    if (!kok) return false;
    liste = liste.filter(function (el) { return el.isConnected; });
    for (var i = 0; i < liste.length; i++) if (kok.contains(liste[i])) return true;
    return false;
  }

  var EN = false;
  try { EN = (localStorage.getItem('qs_lang') || localStorage.getItem('lang') || document.documentElement.lang || '').slice(0, 2) === 'en'; } catch (e) {}

  function renk() {
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

  var st = document.createElement('style');
  st.textContent =
    '.qdl-dg-arka{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.qdl-dg{width:100%;max-width:420px;border-radius:14px;padding:20px 20px 16px;box-shadow:0 20px 60px rgba(0,0,0,.45);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;border:1px solid rgba(127,127,127,.28)}' +
    '.qdl-dg h3{margin:0 0 8px;font:700 16px/1.3 system-ui,sans-serif;display:flex;align-items:center;gap:10px}' +
    '.qdl-dg .ic{width:26px;height:26px;flex:0 0 26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}' +
    '.qdl-dg p{margin:0 0 18px;opacity:.85}' +
    '.qdl-dg .ak{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}' +
    '.qdl-dg button{border-radius:9px;padding:9px 16px;font:600 13.5px system-ui,sans-serif;cursor:pointer}' +
    '.qdl-dg .vz{background:transparent;border:1px solid rgba(127,127,127,.45)}' +
    '.qdl-dg .tm{border:none;color:#fff}';
  (document.head || document.documentElement).appendChild(st);

  function dialog(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var ana = renk(), bg = '#fff', fg = '#1f2937';
      try {
        var b = getComputedStyle(document.body);
        if (b.backgroundColor && b.backgroundColor !== 'rgba(0, 0, 0, 0)' && b.backgroundColor !== 'transparent') { bg = b.backgroundColor; fg = b.color || fg; }
      } catch (e) {}
      var arka = document.createElement('div'); arka.className = 'qdl-dg-arka';
      var kutu = document.createElement('div'); kutu.className = 'qdl-dg'; kutu.setAttribute('role', 'alertdialog'); kutu.setAttribute('aria-modal', 'true');
      kutu.style.background = bg; kutu.style.color = fg;
      var h = document.createElement('h3');
      var ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = o.tone === 'warn' ? '!' : 'i'; ic.style.background = ana;
      var tt = document.createElement('span'); tt.textContent = o.title || '';
      h.appendChild(ic); h.appendChild(tt);
      var p = document.createElement('p'); p.textContent = o.text || '';
      var ak = document.createElement('div'); ak.className = 'ak';
      var vz = document.createElement('button'); vz.type = 'button'; vz.className = 'vz'; vz.style.color = fg;
      vz.textContent = o.cancel || (EN ? 'Cancel' : 'Vazgeç');
      var tm = document.createElement('button'); tm.type = 'button'; tm.className = 'tm'; tm.style.background = ana;
      tm.textContent = o.ok || (EN ? 'OK' : 'Tamam');
      ak.appendChild(vz); ak.appendChild(tm);
      kutu.appendChild(h); kutu.appendChild(p); kutu.appendChild(ak); arka.appendChild(kutu);
      // Olaylar arkadaki modalın "dışarı tıklandı" mantığına ulaşmasın.
      ['click', 'mousedown', 'pointerdown', 'touchstart'].forEach(function (t) { arka.addEventListener(t, function (e) { e.stopPropagation(); }); });
      function bitir(v) { document.removeEventListener('keydown', tus, true); arka.remove(); resolve(v); }
      function tus(e) {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); bitir(false); }
        else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === vz ? tm : vz).focus(); }
      }
      vz.addEventListener('click', function () { bitir(false); });
      tm.addEventListener('click', function () { bitir(true); });
      arka.addEventListener('mousedown', function (e) { if (e.target === arka) bitir(false); });
      document.addEventListener('keydown', tus, true);
      document.body.appendChild(arka);
      setTimeout(function () { vz.focus(); }, 30);
    });
  }

  function kapatSor(kok) {
    if (!kirliMi(kok)) return Promise.resolve(true);
    return dialog({
      tone: 'warn',
      title: EN ? 'Unsaved changes' : 'Kaydedilmemiş değişiklikler',
      text: EN ? 'You have changes in this form that are not saved. If you close it, they will be lost.'
               : 'Bu formda kaydetmediğiniz değişiklikler var. Kapatırsanız kaybolacak.',
      ok: EN ? 'Close without saving' : 'Kaydetmeden kapat',
      cancel: EN ? 'Keep editing' : 'Düzenlemeye dön'
    });
  }

  window.qdlDialog = window.qdlDialog || dialog;
  window.qdlKirliMi = kirliMi;
  window.qdlKapatSor = kapatSor;
})();
