/* =========================================================================
 * qdl-hata.js — QDATALINE platform ortak istemci hata toplayıcı
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-hata.js
 * 11 modülün yayın kökünde birebir aynı kopya durur (bkz. surum-damgala.ps1).
 *
 * Neden 3. parti yok: Sentry/LogRocket vb. her biri KVKK anlamında ayrı bir
 * alt-işleyen demek ve müşteri sözleşmesinde beyan gerektirir. Bu yüzden hata
 * toplama zaten kullandığımız Supabase projesinin içinde.
 *
 * TASARIM:
 *  - Bağımlılık yok, modül başına yapılandırma yok. Modül kodu ve sürüm
 *    /qdl-version.json'dan okunur — yani rapordaki sürüm, GERÇEKTEN yayında
 *    olan sürümdür (HTML'e elle yazılan bir sürüm etiketi yalan söyleyebilir).
 *  - Sayfa sağlıklıyken SIFIR ağ isteği: version.json yalnız ilk hatada okunur.
 *  - Hata handler'ının kendisi asla hata fırlatmaz ve asla döngüye girmez.
 *  - Form değerleri, input içerikleri, localStorage ASLA gönderilmez.
 *    Gönderilen: hata mesajı, stack, yol (query değerleri sunucuda da maskeli),
 *    user-agent, modül, sürüm.
 * ========================================================================= */
(function () {
  'use strict';
  if (window.__qdlHata) return;
  window.__qdlHata = true;

  var URL_ = 'https://bbltvuxxtacrpgrqnfoh.supabase.co/rest/v1/rpc/qdl_log_client_error';
  var KEY_ = 'sb_publishable_3UUYAbeaA4tJahYiAAGhLQ_AtDfHkq4';

  var MAX_OTURUM = 10;     // sayfa ömrü boyunca en çok bu kadar gönderim
  var MIN_ARALIK = 2000;   // ms
  var gonderilen = 0, sonGonderim = 0, mesgul = false;
  var gorulen = {};        // oturum içi tekilleştirme
  var kimlik = null, kimlikDenendi = false, kuyruk = [];

  function modulTahmin() {
    try {
      var h = (location.hostname || '').split('.')[0];
      return h && h !== 'www' ? h : 'hub';
    } catch (e) { return 'bilinmeyen'; }
  }

  function kimlikAl(cb) {
    if (kimlik) { cb(kimlik); return; }
    kuyruk.push(cb);
    if (kimlikDenendi) return;
    kimlikDenendi = true;
    var bitir = function (k) {
      kimlik = k;
      var q = kuyruk; kuyruk = [];
      for (var i = 0; i < q.length; i++) { try { q[i](kimlik); } catch (e) {} }
    };
    try {
      fetch('/qdl-version.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          bitir({ modul: (j && j.modul) || modulTahmin(), surum: (j && j.surum) || null });
        })
        .catch(function () { bitir({ modul: modulTahmin(), surum: null }); });
    } catch (e) { bitir({ modul: modulTahmin(), surum: null }); }
  }

  function kirp(s, n) {
    try { return String(s == null ? '' : s).slice(0, n); } catch (e) { return ''; }
  }

  function gonder(tur, mesaj, stack) {
    // --- DÖNGÜ KORUMASI: handler içinde oluşan hata handler'ı tekrar tetiklemez
    if (mesgul) return;
    mesgul = true;
    try {
      mesaj = kirp(mesaj, 1000);
      if (!mesaj) return;
      if (gonderilen >= MAX_OTURUM) return;

      var anahtar = tur + '|' + mesaj + '|' + kirp(stack, 120);
      if (gorulen[anahtar]) return;

      var simdi = Date.now();
      if (simdi - sonGonderim < MIN_ARALIK) return;

      gorulen[anahtar] = 1;
      gonderilen++;
      sonGonderim = simdi;

      kimlikAl(function (k) {
        var govde;
        try {
          govde = JSON.stringify({
            p_modul: k.modul,
            p_surum: k.surum,
            // query string'i BURADA da atıyoruz; sunucu ayrıca maskeliyor.
            p_sayfa: kirp((location.pathname || '') + (location.hash || ''), 300),
            p_tur: tur,
            p_mesaj: mesaj,
            p_stack: kirp(stack, 4000),
            p_ua: kirp(navigator.userAgent, 300)
          });
        } catch (e) { return; }
        try {
          fetch(URL_, {
            method: 'POST',
            headers: { 'apikey': KEY_, 'Content-Type': 'application/json' },
            body: govde,
            keepalive: true,     // sayfa kapanırken de gitsin
            mode: 'cors'
          }).catch(function () {});   // loglama başarısız olsa bile SESSİZ
        } catch (e) {}
      });
    } catch (e) {
      /* loglayıcı hiçbir koşulda sayfayı bozmaz */
    } finally {
      mesgul = false;
    }
  }

  window.addEventListener('error', function (ev) {
    try {
      var m = (ev && ev.message) || 'Bilinmeyen hata';
      var st = (ev && ev.error && ev.error.stack) || '';
      if (!st && ev && ev.filename) st = ev.filename + ':' + ev.lineno + ':' + ev.colno;
      gonder('onerror', m, st);
    } catch (e) {}
  }, true);

  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var r = ev && ev.reason;
      var m = (r && (r.message || r.error_description || r.msg)) ||
              (typeof r === 'string' ? r : 'İşlenmemiş promise reddi');
      gonder('unhandledrejection', m, (r && r.stack) || '');
    } catch (e) {}
  }, true);

  // İsteğe bağlı elle çağrı: qdlHataBildir(err) / qdlHataBildir('metin')
  window.qdlHataBildir = function (e) {
    try {
      gonder('manual', (e && e.message) || String(e), (e && e.stack) || '');
    } catch (x) {}
  };
})();
