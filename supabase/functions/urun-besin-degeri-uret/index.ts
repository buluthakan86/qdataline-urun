// urun-besin-degeri-uret — Ürün Reçete ve Spesifikasyon Yönetimi modülü
//
// Reçetedeki hammadde adı + oran (%) listesinden Claude'a TGK Madde 35 zorunlu
// beslenme bildirimi (100 g/ml başına enerji/yağ/doymuş yağ/karbonhidrat/
// şeker/protein/tuz) TAHMİNİ ürettirir. BİLİNÇLİ OLARAK PASİF: Vault'ta
// 'anthropic_api_key' secret'ı yoksa nazik bir "devre dışı" yanıtı döner
// (BOY/SDR ile AYNI platform-geneli paylaşımlı anahtar deseni).
//
// ÖNEMLİ SINIR (kullanıcıya arayüzde de gösterilir): bu bir TAHMİNDİR, resmi
// laboratuvar analizinin yerini TUTMAZ — kullanıcı sonucu her zaman gözden
// geçirip elle düzeltebilir/onaylayabilir, hiçbir zaman sessizce kaydedilmez.
//
// Güvenlik: çağıranın JWT'si doğrulanır, hesaplama yalnız KENDİ tenant'ının
// reçetesi üzerinden yapılır (urun_id çağıranın tenant'ına ait mi kontrol edilir).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?qdataline\.com$/;
function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN_RE.test(origin) ? origin : "https://qdataline.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const CORS = corsHeadersFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ hata: "Yetkisiz." }, 401);

    const { urunId } = await req.json().catch(() => ({}));
    if (!urunId) return json({ hata: "urunId zorunludur." }, 400);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ hata: "Oturum doğrulanamadı." }, 401);

    const { data: profile } = await callerClient.from("profiles").select("tenant_id").eq("id", userData.user.id).single();
    if (!profile) return json({ hata: "Profil bulunamadı." }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Reçete gerçekten bu çağıranın tenant'ına mı ait — cross-tenant sızıntı engeli.
    const { data: urun } = await admin.from("urun_urunler").select("id, ad, tenant_id").eq("id", urunId).maybeSingle();
    if (!urun || urun.tenant_id !== profile.tenant_id) return json({ hata: "Ürün bulunamadı." }, 404);

    const { data: recete } = await admin.from("urun_receteler").select("hammadde_adi, oran_yuzde")
      .eq("urun_id", urunId).is("deleted_at", null).order("sira_no");
    if (!recete || recete.length === 0) return json({ hata: "Bu ürünün reçetesi (hammadde listesi) boş — önce reçete girin." }, 400);

    const apiKey = await admin.rpc("urun_ai_anahtar_getir").then((r) => r.data as string | null);
    if (!apiKey) {
      return json({ devre_disi: true, mesaj: "AI ile besin değeri oluşturma bu hesapta henüz aktif değil. Aktivasyon için yöneticinizle iletişime geçin." });
    }

    const receteMetni = recete.map((r: any) => `${r.hammadde_adi}: %${r.oran_yuzde ?? "?"}`).join(", ");
    const prompt = `Aşağıdaki reçeteye (hammadde ve yüzde oranları) sahip bir gıda ürünü için ` +
      `100 gram/ml başına TAHMİNİ beslenme değerlerini hesapla. Bu resmi bir laboratuvar analizi ` +
      `DEĞİLDİR, yalnızca kaba bir tahmindir — kullanıcı bunu gözden geçirip düzeltecek.\n\n` +
      `Reçete: ${receteMetni}\n\n` +
      `Yalnız şu JSON formatında yanıt ver, başka hiçbir açıklama ekleme: ` +
      `{"enerji_kcal":<sayı>,"yag_g":<sayı>,"doymus_yag_g":<sayı>,"karbonhidrat_g":<sayı>,` +
      `"seker_g":<sayı>,"protein_g":<sayı>,"tuz_g":<sayı>,"trans_yag_g":<sayı veya null>}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      console.error("[urun-besin-degeri-uret] Anthropic hata:", await aiRes.text());
      return json({ hata: "AI servisi şu anda yanıt vermiyor. Lütfen değerleri elle girin." }, 502);
    }
    const aiJson = await aiRes.json();
    const metin: string = aiJson?.content?.[0]?.text ?? "";

    const inputTokens = aiJson?.usage?.input_tokens ?? 0;
    const outputTokens = aiJson?.usage?.output_tokens ?? 0;
    const { data: fiyat } = await admin.from("qdl_ai_fiyatlari")
      .select("input_usd_per_mtok, output_usd_per_mtok").eq("model", "claude-haiku-4-5-20251001").maybeSingle();
    const maliyet = fiyat
      ? (inputTokens / 1_000_000) * Number(fiyat.input_usd_per_mtok) + (outputTokens / 1_000_000) * Number(fiyat.output_usd_per_mtok)
      : 0;
    try {
      await admin.from("urun_ai_kullanim_log").insert({
        tenant_id: profile.tenant_id, ozellik: "besin_degeri",
        input_tokens: inputTokens, output_tokens: outputTokens, tahmini_maliyet_usd: maliyet,
      });
    } catch (e) { console.error("[urun-besin-degeri-uret] maliyet kaydı yazılamadı:", e); }

    let ayristirilmis: any = null;
    try {
      const eslesme = metin.match(/\{[\s\S]*\}/);
      if (eslesme) ayristirilmis = JSON.parse(eslesme[0]);
    } catch (_e) { /* aşağıda hata dönecek */ }

    if (!ayristirilmis || typeof ayristirilmis.enerji_kcal !== "number") {
      return json({ hata: "Besin değeri hesaplanamadı. Lütfen değerleri elle girin.", ham_yanit: metin }, 502);
    }

    return json({
      tahmini: true,
      enerji_kcal: ayristirilmis.enerji_kcal, yag_g: ayristirilmis.yag_g, doymus_yag_g: ayristirilmis.doymus_yag_g,
      karbonhidrat_g: ayristirilmis.karbonhidrat_g, seker_g: ayristirilmis.seker_g, protein_g: ayristirilmis.protein_g,
      tuz_g: ayristirilmis.tuz_g, trans_yag_g: ayristirilmis.trans_yag_g ?? null,
    });
  } catch (e) {
    console.error("[urun-besin-degeri-uret] beklenmeyen hata:", e);
    return json({ hata: "Beklenmeyen bir hata oluştu." }, 500);
  }
});
