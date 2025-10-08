// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.NEXT_PUBLIC_FORGE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

function cors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}

export async function OPTIONS() {
  return cors({ ok: true });
}

function toMessage(err: any): string {
  if (!err) return "Error";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) return err.map(toMessage).join(" · ");
  if (err.message) return String(err.message);
  if ((err as any).detail) return toMessage((err as any).detail);
  try { return JSON.stringify(err); } catch { return String(err); }
}

// Map various front-end field names to the canonical *_mm keys expected by backend
function normalizeParams(model: string, raw: Record<string, any> = {}) {
  const p: Record<string, any> = { ...raw };
  const out: Record<string, any> = { ...p };

  const setIfMissing = (dst: string, names: string[]) => {
    if (out[dst] == null) {
      for (const n of names) {
        if (p[n] != null) { out[dst] = Number(p[n]); break; }
      }
    } else {
      out[dst] = Number(out[dst]);
    }
  };

  // generic heuristics
  setIfMissing("length_mm",   ["length_mm","length","base_w","ancho_mm","ancho","width"]);
  setIfMissing("width_mm",    ["width_mm","width","depth","fondo_mm","fondo","base_d"]);
  setIfMissing("height_mm",   ["height_mm","height","base_h","alto_mm","alto","altura"]);
  setIfMissing("thickness_mm",["thickness_mm","thickness","grosor_mm","grosor","wall"]);
  setIfMissing("fillet_mm",   ["fillet_mm","fillet","round","radio"]);

  // model-specific tweaks (safe additions; never override if already set)
  const addIfMissing = (k: string, v: any) => { if (out[k] == null && v != null) out[k] = v; };

  if (model === "router_mount") {
    addIfMissing("length_mm", out["length_mm"]);
    addIfMissing("width_mm",  out["width_mm"]);
    addIfMissing("height_mm", out["height_mm"]);
  }

  if (model === "vesa_adapter") {
    addIfMissing("length_mm", out["length_mm"]);
    addIfMissing("width_mm",  out["width_mm"]);
    addIfMissing("height_mm", out["height_mm"]);
  }

  return out;
}

/**
 * Body esperado: { model: string, params: object, holes?: Array<{x_mm,y_mm,d_mm}> }
 * Llama al backend /generate y devuelve URL firmada del STL.
 */
export async function POST(req: Request) {
  try {
    const { model, params, holes } = await req.json().catch(() => ({} as any));
    if (!model) return cors({ ok: false, error: "Missing 'model'" }, 400);
    if (!BACKEND) return cors({ ok: false, error: "Backend URL not configured" }, 500);

    const normalized = normalizeParams(String(model), params || {});

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