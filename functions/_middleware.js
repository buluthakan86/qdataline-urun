// 17.09.2026 pentest bulgusu: _redirects statik dosyaları override edemiyor
// (Cloudflare Pages kısıtı). Bu middleware, iç geliştirme dosyalarına
// (CLAUDE.md, sql/, supabase/, vb.) gelen istekleri statik dosya
// sunumundan ÖNCE yakalayıp 404 döndürür.
const BLOCKED_EXACT = new Set([
  '/CLAUDE.md',
]);
const BLOCKED_PREFIXES = ['/sql/', '/supabase/'];

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED_EXACT.has(pathname) || BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return new Response('Not Found', { status: 404 });
  }
  return context.next();
}
