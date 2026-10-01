/* qdl-navsearch.js — sol menüye İSG biçiminde arama kutusu ekler (01.10.2026).
 * Kaynak (TEK DOĞRU KOPYA): _platform-ortak/istemci/qdl-navsearch.js — modül yayın köküne birebir kopyalanır.
 * Menüsü zaten #navSearch içeren modüllerde (İSG, BOY, Tedarikçi, Gıda, Doküman) hiçbir şey yapmaz.
 * Menü yeniden çizilse de (dinamik buildNav) süzme MutationObserver ile korunur. "/" tuşu kutuya odaklanır. */
(function () {
  if (document.getElementById('navSearch')) return;
  function basla() {
    if (document.getElementById('navSearch')) return;
    var nav = document.getElementById('snav') || document.querySelector('aside nav.nav, nav.nav');
    if (!nav) return;
    var en = false;
    try { en = /^en/i.test(document.documentElement.lang || '') || ['qdl_language', 'dsy_lang', 'qd_lang', 'lang'].some(function (k) { return localStorage.getItem(k) === 'en'; }); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = '.side-search{margin:10px 15px 0;display:flex;align-items:center;gap:8px;background:var(--sand,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.1));border-radius:9px;padding:7px 10px}' +
      '.side-search svg{color:var(--muted,#8b90b0);flex-shrink:0}.side-search input{border:none;background:transparent;outline:none;font-size:12.5px;color:var(--ink,inherit);width:100%;font-family:inherit}' +
      '.side.collapsed .side-search{display:none}';
    document.head.appendChild(st);
    var box = document.createElement('div');
    box.className = 'side-search';
    box.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="navSearch" autocomplete="off" placeholder="' + (en ? 'Search… ( / )' : 'Ara… ( / )') + '">';
    nav.parentNode.insertBefore(box, nav);
    var inp = box.querySelector('input'), q = '';
    var ITEM = '.nav-item, .nav-btn';
    function uygula() {
      var t = q.trim().toLocaleLowerCase('tr');
      var gruplar = nav.querySelectorAll('.nav-group');
      var ogeler = nav.querySelectorAll(ITEM);
      Array.prototype.forEach.call(ogeler, function (it) {
        var lbl = ((it.querySelector('.txt,.lbl-txt,.lbl') || it).textContent || '').toLocaleLowerCase('tr');
        it.style.display = (!t || lbl.indexOf(t) !== -1) ? '' : 'none';
      });
      Array.prototype.forEach.call(gruplar, function (g) {
        var var_ = Array.prototype.some.call(g.querySelectorAll(ITEM), function (it) { return it.style.display !== 'none'; });
        g.style.display = var_ ? '' : 'none';
        if (t && var_) g.classList.remove('collapsed');
      });
    }
    inp.addEventListener('input', function () { q = inp.value; uygula(); });
    new MutationObserver(function () { if (q) uygula(); }).observe(nav, { childList: true, subtree: true });
    document.addEventListener('keydown', function (ev) {
      var a = document.activeElement, tag = a && a.tagName;
      if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag || '') && !(a && a.isContentEditable)) { ev.preventDefault(); inp.focus(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
