// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS helper simple
function cors(json: any, status: number = 200) {
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
  };
  return NextResponse.json(json, { status, headers });
}

export async function OPTIONS() {
  return cors({ ok: true });
}

function getSupabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) throw new Error("Faltan credenciales de Supabase");
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const { slug, model, params } = await req.json();

    const API_BASE = (process.env.NEXT_PUBLIC_FORGE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
    if (!API_BASE) return cors({ error: "Backend no configurado" }, 500);

    const finalSlug = (slug || model || "").trim();
    if (!finalSlug) return cors({ error: "Missing 'slug' in body" }, 400);

    // 1) Generar en backend (devuelve object_key / url pública si has puesto PUBLIC_READ=true)
    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: finalSlug, params: params || null }),
      cache: "no-store",
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      return cors({ error: j?.detail || j?.error || "Forge API error" }, res.status || 500);
    }

    const key = j?.object_key || j?.key || j?.file || j?.path;
    if (!key) {
      // si el backend devolvió url pública, úsala tal cual
      if (j?.url) return cors({ ok: true, url: j.url });
      return cors({ error: "Forge API no devolvió 'object_key' ni 'url'" }, 500);
    }

    // 2) Firmar URL temporal (si tu bucket es privado)
    const supabase = getSupabaseServer();
    const BUCKET = process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(key, 60 * 10);

    if (signed.error || !signed.data?.signedUrl) {
      return cors({ error: signed.error?.message || "No se pudo firmar URL" }, 500);
    }

    return cors({ ok: true, url: signed.data.signedUrl });
  } catch (err: any) {
    return cors({ error: err?.message || "Unexpected error" }, 500);
  }
}
