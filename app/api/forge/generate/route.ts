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

/**
 * Espera body:
 * { model: string, params: object, holes?: Array<{x_mm,y_mm,d_mm}> }
 * Llama al backend /generate y devuelve URL firmada del STL.
 */
export async function POST(req: Request) {
  try {
    const { model, params, holes } = await req.json().catch(() => ({} as any));
    if (!model) return cors({ error: "Missing 'model'" }, 400);

    if (!BACKEND) return cors({ error: "Backend URL not configured" }, 500);

    // 1) Generar en backend
    const gen = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, params, holes: Array.isArray(holes) ? holes : [] }),
      cache: "no-store",
    });

    const genJson = await gen.json().catch(() => ({} as any));
    if (!gen.ok || !genJson?.object_key) {
      return cors({ error: genJson?.detail || genJson?.error || "Generation failed" }, gen.status || 500);
    }

    // 2) Firmar URL con Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const url = SUPABASE_URL || "";
    const key = SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(url, key);

    const keyPath = genJson.object_key as string;
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(keyPath, 60 * 5);
    if (signed.error || !signed.data?.signedUrl) {
      return cors({ error: signed.error?.message || "Failed to sign URL" }, 500);
    }

    return cors({ url: signed.data.signedUrl, object_key: keyPath, thumb_url: genJson?.thumb_url });
  } catch (err: any) {
    return cors({ error: err?.message || "Unexpected error" }, 500);
  }
}