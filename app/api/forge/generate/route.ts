// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(json: any, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    },
  });
}

export async function OPTIONS() {
  return cors({ ok: true });
}

function getSupabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) throw new Error("Faltan credenciales de Supabase");
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug: string = (body?.slug || body?.model || "").trim();
    const params = body?.params ?? null;
    // 👇 IMPORTANTE: preservar agujeros del UI (admite top-level o dentro de params)
    const holes = body?.holes ?? body?.params?.holes ?? null;

    if (!slug) return cors({ error: "Missing 'slug' in body" }, 400);

    const API_BASE = (
      process.env.NEXT_PUBLIC_FORGE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ""
    ).replace(/\/+$/, "");
    if (!API_BASE) return cors({ error: "Backend no configurado" }, 500);

    // 1) Generar en backend — reenviamos también `holes`
    const r = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, params, holes }),
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) return cors({ error: j?.detail || j?.error || "Forge API error" }, r.status || 500);

    const key = j?.object_key || j?.key || j?.file || j?.path;
    if (j?.url && !key) return cors({ ok: true, url: j.url });

    // 2) Firmar URL si el bucket es privado
    const supabase = getSupabaseServer();
    const BUCKET =
      process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(key, 60 * 10);
    if (signed.error || !signed.data?.signedUrl) {
      return cors({ error: signed.error?.message || "No se pudo firmar URL" }, 500);
    }
    return cors({ ok: true, url: signed.data.signedUrl });
  } catch (e: any) {
    return cors({ error: e?.message || "Unexpected error" }, 500);
  }
}
