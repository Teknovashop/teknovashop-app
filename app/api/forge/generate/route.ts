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

export function OPTIONS() {
  return cors({ ok: true });
}

const n = (v: any): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const s = String(v).trim().replace(",", ".");
  const x = Number(s);
  return isFinite(x) ? x : undefined;
};

type Dict = Record<string, any>;
function clampFillet(p: Dict) {
  // fillet no puede superar ~la mitad del espesor/altura/ancho/alto.
  const candidates = [
    n(p.thickness_mm),
    n(p.height_mm),
    n(p.width_mm),
    n(p.length_mm),
  ].filter((x) => typeof x === "number") as number[];
  const maxR = Math.max(0, Math.min(...(candidates.length ? candidates : [2])) / 2 - 0.05);
  const f = n(p.fillet_mm);
  if (f == null) p.fillet_mm = Math.max(0, Math.min(2, maxR));
  else p.fillet_mm = Math.max(0, Math.min(f, maxR));
}

function toMessage(x: any): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x?.detail) return typeof x.detail === "string" ? x.detail : JSON.stringify(x.detail);
  if (x?.error) return typeof x.error === "string" ? x.error : JSON.stringify(x.error);
  try { return JSON.stringify(x); } catch { return String(x); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug: string | undefined = body?.slug || body?.model;
    if (!slug) return cors({ ok: false, error: "Missing 'slug'" }, 400);
    if (!BACKEND) return cors({ ok: false, error: "Backend URL not configured" }, 500);

    // Normaliza numéricos y clampa fillet
    const params: Dict = { ...(body?.params || {}) };
    
    const model = slug.replace(/-/g, "_");
for (const k of Object.keys(params)) {
      const val = n(params[k]);
      if (val != null) params[k] = val;
    }
    clampFillet(params);

    const holes = Array.isArray(body?.holes) ? body.holes : [];
    const text_ops = Array.isArray(body?.text_ops) ? body.text_ops : [];

    const r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, params, holes, text_ops, model }),
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) return cors({ ok: false, error: toMessage(j) }, r.status);

    // Respetar signed_url/stl_url; si solo viene path, firmamos aquí
    if (j?.signed_url) return cors({ ok: true, url: j.signed_url, source: "backend-signed" });
    if (j?.stl_url)    return cors({ ok: true, url: j.stl_url, source: "backend-public" });

    const objectPath: string | undefined = j?.path || j?.object_key;
    if (!objectPath) {
      if (j?.stl_data_url) return cors({ ok: true, url: j.stl_data_url, source: "data-url" });
      return cors({ ok: false, error: "Generation succeeded but no path/url returned" }, 500);
    }

    const { createClient } = await import("@supabase/supabase-js");
    const url = SUPABASE_URL || "";
    const key = SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(url, key);
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60 * 5);
    if (signed.error || !signed.data?.signedUrl) {
      return cors({ ok: false, error: signed.error?.message || "Failed to sign URL" }, 500);
    }
    return cors({ ok: true, url: signed.data.signedUrl, object_key: objectPath, source: "signed-here" });
  } catch (e: any) {
    return cors({ ok: false, error: toMessage(e) }, 500);
  }
}
