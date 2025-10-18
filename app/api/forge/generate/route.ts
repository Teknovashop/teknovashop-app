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
export async function OPTIONS() { return cors({ ok: true }); }

function toMessage(err: any): string {
  if (!err) return "Error";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) return err.map(toMessage).join(" · ");
  if (err?.message) return String(err.message);
  if (err?.detail) return toMessage(err.detail);
  try { return JSON.stringify(err); } catch { return String(err); }
}

type Dict = Record<string, any>;
const n = (v: any): number | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const s = String(v).trim().replace(",", ".");
  const num = Number(s);
  return isFinite(num) ? num : undefined;
};
function setIfMissing(out: Dict, dst: string, candidates: string[], src: Dict) {
  for (const k of candidates) {
    if (out[dst] == null && src[k] != null) {
      const v = n(src[k]);
      if (v != null) { out[dst] = v; return; }
    }
  }
}
function ensureNumber(out: Dict, key: string, fallback?: number) {
  const v = n(out[key]);
  out[key] = v == null ? (fallback ?? 1) : v;
}
function normalizeParams(model: string, raw: Dict = {}) {
  const src: Dict = {};
  for (const k of Object.keys(raw)) src[k] = n(raw[k]) ?? raw[k];
  const out: Dict = { ...src };

  setIfMissing(out,"length_mm",["length_mm","length","base_w","drive_l","slot_l","tape_l","strap_l","largo_cinta"],src);
  setIfMissing(out,"width_mm", ["width_mm","width","depth","base_d","drive_w","slot_w","tape_w","strap_w","ancho_cinta","adhesive_w"],src);
  setIfMissing(out,"height_mm",["height_mm","height","base_h","alto_mm","alto","altura","stem_h","hub_h","board_h"],src);
  setIfMissing(out,"thickness_mm",["thickness_mm","thickness","grosor_mm","grosor","wall","clip_t"],src);
  setIfMissing(out,"fillet_mm",["fillet_mm","fillet","round","radio","hook_r"],src);

  ensureNumber(out,"length_mm", out.length_mm ?? n(src.base_w) ?? n(src.width) ?? n(src.drive_l));
  ensureNumber(out,"width_mm",  out.width_mm  ?? n(src.base_d) ?? n(src.depth) ?? n(src.drive_w));
  ensureNumber(out,"height_mm", out.height_mm ?? n(src.base_h) ?? n(src.height) ?? n(src.stem_h) ?? n(src.wall) ?? 1);
  ensureNumber(out,"thickness_mm", out.thickness_mm ?? n(src.wall) ?? n(src.clip_t) ?? 2);

  return out;
}

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
    if (!gen.ok) return cors({ ok: false, error: toMessage(genJson?.detail || genJson?.error || "Generation failed") }, gen.status || 500);

    if (genJson?.signed_url) return cors({ ok: true, url: genJson.signed_url, source: "backend-signed" });
    if (genJson?.stl_url)    return cors({ ok: true, url: genJson.stl_url, source: "backend-public" });

    const objectPath: string | undefined = genJson?.path || genJson?.object_key;
    if (!objectPath) {
      if (genJson?.stl_data_url) return cors({ ok: true, url: genJson.stl_data_url, source: "data-url" });
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
  } catch (err: any) {
    return cors({ ok: false, error: toMessage(err) }, 500);
  }
}
