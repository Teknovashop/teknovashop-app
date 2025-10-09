import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.NEXT_PUBLIC_FORGE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

// interruptor rápido de demo (1 = paywall ON, 0 = OFF)
const PAYWALL_PREVIEW = (process.env.PAYWALL_PREVIEW ?? "1") === "1";

function cors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-user-email",
    },
  });
}
export async function OPTIONS() { return cors({ ok: true }); }

function toMessage(err: any): string {
  if (!err) return "Error";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) return err.map(toMessage).join(" · ");
  if (err?.message) return String(err.message);
  if (err?.detail) return toMessage(err.detail);
  try { return JSON.stringify(err); } catch { return String(err); }
}

// ---------------- Normalización de parámetros ----------------
type Dict = Record<string, any>;
const n = (v: any): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const num = Number(String(v).trim().replace(",", "."));
  return isFinite(num) ? num : undefined;
};
function setIfMissing(out: Dict, dst: string, candidates: string[], src: Dict) {
  if (out[dst] == null) {
    for (const key of candidates) { if (src[key] != null) { out[dst] = n(src[key]); break; } }
  } else { out[dst] = n(out[dst]); }
}
function ensureNumber(out: Dict, key: string, fallback?: number) {
  const v = n(out[key]); out[key] = v == null ? (fallback ?? 1) : v;
}
function normalizeParams(model: string, raw: Dict = {}) {
  const src: Dict = {}; for (const k of Object.keys(raw)) src[k] = n(raw[k]) ?? raw[k];
  const out: Dict = { ...src };

  setIfMissing(out, "length_mm",   ["length_mm","length","base_w","ancho_mm","ancho","width","largo","drive_l","hub_w"], src);
  setIfMissing(out, "width_mm",    ["width_mm","width","depth","fondo_mm","fondo","base_d","drive_w","hub_d"], src);
  setIfMissing(out, "height_mm",   ["height_mm","height","base_h","alto_mm","alto","altura","stem_h","hub_h","board_h"], src);
  setIfMissing(out, "thickness_mm",["thickness_mm","thickness","grosor_mm","grosor","wall","clip_t"], src);
  setIfMissing(out, "fillet_mm",   ["fillet_mm","fillet","round","radio","hook_r"], src);

  ensureNumber(out, "length_mm",  out.length_mm  ?? n(src.base_w) ?? n(src.width)  ?? n(src.drive_l));
  ensureNumber(out, "width_mm",   out.width_mm   ?? n(src.base_d) ?? n(src.depth)  ?? n(src.drive_w));
  ensureNumber(out, "height_mm",  out.height_mm  ?? n(src.base_h) ?? n(src.height) ?? n(src.stem_h) ?? n(src.wall) ?? 1);
  ensureNumber(out, "thickness_mm", out.thickness_mm ?? n(src.wall) ?? n(src.clip_t) ?? 2);

  const ensure = (k: string, v?: number) => { if (out[k] == null && v != null) out[k] = v; };

  switch (model) {
    case "headset_stand":
      ensure("length_mm", n(src.base_w)); ensure("width_mm", n(src.base_d));
      ensure("height_mm", n(src.stem_h)); ensure("thickness_mm", n(src.wall)); ensure("fillet_mm", n(src.hook_r)); break;
    case "phone_dock":    ensure("height_mm", out.thickness_mm ?? n(src.wall) ?? 4); break;
    case "tablet_stand":  ensure("height_mm", n(src.lip_h) ?? out.thickness_mm ?? 4); break;
    case "ssd_holder":
      ensure("length_mm", n(src.drive_l) ?? 100); ensure("width_mm", n(src.drive_w) ?? 70);
      ensure("height_mm", out.thickness_mm ?? n(src.wall) ?? 2); break;
    case "cable_clip":    ensure("height_mm", out.thickness_mm ?? n(src.wall) ?? 2); break;
    case "raspi_case":    ensure("length_mm", n(src.board_w)); ensure("width_mm", n(src.board_l)); ensure("height_mm", n(src.board_h) ?? (n(src.wall) ?? 2)); break;
    case "go_pro_mount":  ensure("height_mm", out.thickness_mm ?? n(src.wall) ?? 3); break;
    case "wall_hook":     ensure("height_mm", n(src.base_h) ?? out.thickness_mm ?? 3); break;
    case "laptop_stand":  ensure("height_mm", n(src.lip_h) ?? out.thickness_mm ?? 4); break;
    case "mic_arm_clip":  ensure("height_mm", out.thickness_mm ?? n(src.wall) ?? 3); break;
    case "hub_holder":    ensure("length_mm", n(src.hub_w)); ensure("width_mm", n(src.hub_d)); ensure("height_mm", n(src.hub_h) ?? out.thickness_mm ?? 3); break;
    default: break;
  }
  return out;
}
// ------------------------------------------------------------

// ---------- Comprobación de derecho (entitlement) ----------
type EntitlementRow = {
  id: string;
  email: string;
  plan: "oneoff" | "maker" | "commercial";
  model_slug: string | null;
  status: "active" | "canceled" | "expired";
  expires_at: string | null; // ISO
};

async function hasEntitlement(email: string, model: string) {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // 1) suscripción activa (maker/commercial)
  const nowIso = new Date().toISOString();
  const sub = await supabase
    .from<EntitlementRow>("entitlements")
    .select("*")
    .eq("email", email)
    .in("plan", ["maker", "commercial"])
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .limit(1)
    .maybeSingle();

  if (!sub.error && sub.data) return true;

  // 2) compra única del modelo
  const one = await supabase
    .from<EntitlementRow>("entitlements")
    .select("*")
    .eq("email", email)
    .eq("plan", "oneoff")
    .eq("status", "active")
    .eq("model_slug", model)
    .limit(1)
    .maybeSingle();

  return !one.error && !!one.data;
}

// -------------------------- Handler -------------------------
/**
 * Body: { model: string, params: object, holes?: Array<{x_mm,y_mm,d_mm}>, email?: string }
 * Header opcional: x-user-email
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { model, params, holes } = body || {};
    if (!model) return cors({ ok: false, error: "Missing 'model'" }, 400);
    if (!BACKEND) return cors({ ok: false, error: "Backend URL not configured" }, 500);

    // --- PAYWALL duro ---
    if (PAYWALL_PREVIEW) {
      // 1) obtenemos el email del header o del body
      const email =
        req.headers.get("x-user-email")?.trim().toLowerCase() ||
        (typeof body?.email === "string" ? body.email.trim().toLowerCase() : "");

      if (!email) {
        return cors({ ok: false, error: "No autorizado: falta email (x-user-email)." }, 401);
      }
      const entitled = await hasEntitlement(email, String(model));
      if (!entitled) {
        return cors({ ok: false, error: "No tienes una compra o suscripción activa para este modelo." }, 403);
      }
    }
    // ---------------------------------------------------------

    const normalized = normalizeParams(String(model), params || {});

    // 1) Generar en backend
    const gen = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, params: normalized, holes: Array.isArray(holes) ? holes : [] }),
      cache: "no-store",
    });
    const genJson = await gen.json().catch(() => ({} as any));
    if (!gen.ok || !genJson?.object_key) {
      return cors({ ok: false, error: toMessage(genJson?.detail || genJson?.error || "Generation failed") }, gen.status || 500);
    }

    // 2) Firmar URL con Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const url = SUPABASE_URL || "";
    const key = SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(url, key);

    const keyPath = genJson.object_key as string;
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(keyPath, 60 * 5);
    if (signed.error || !signed.data?.signedUrl) {
      return cors({ ok: false, error: toMessage(signed.error?.message || "Failed to sign URL") }, 500);
    }

    return cors({ ok: true, url: signed.data.signedUrl, object_key: keyPath, thumb_url: genJson?.thumb_url });
  } catch (err: any) {
    return cors({ ok: false, error: toMessage(err) }, 500);
  }
}
