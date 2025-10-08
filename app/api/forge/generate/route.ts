// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // evita edge-cache en Vercel
export const dynamic = "force-dynamic";

function getSupabaseServer() {
  // Preferimos credenciales de servidor; si no están, caemos a públicas
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) {
    throw new Error("Supabase URL/KEY no configurados");
  }
  return createClient(url, key);
}

const BUCKET =
  process.env.SUPABASE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  "forge-stl";

// CORS básico por si algún día sirves desde subdominio distinto
function cors(json: any, status = 200) {
  return new NextResponse(JSON.stringify(json), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function OPTIONS() {
  return cors({ ok: true });
}

/**
 * Espera un body:
 * {
 *   "slug": "cable-tray",   // obligatorio
 *   "params": {...}         // opcional (por ahora lo ignoramos)
 * }
 * Devuelve: { url: "https://signed-url" }
 */
export async function POST(req: Request) {
  try {
    const { slug } = await req.json().catch(() => ({} as any));
    if (!slug || typeof slug !== "string") {
      return cors({ error: "Missing 'slug' in body" }, 400);
    }

    // El STL “resultado” lo estamos guardando como forge-output.stl dentro de cada carpeta
    const key = `${slug}/forge-output.stl`;

    const supabase = getSupabaseServer();

    // (Opcional) Comprobación rápida de existencia
    const pathStem = slug.replace(/^\/+/, "");
    const list = await supabase.storage.from(BUCKET).list(pathStem, { limit: 100 });
    const exists = list.data?.some((f) => f.name === "forge-output.stl");
    if (!exists) {
      return cors({ error: `No existe '${key}' en bucket '${BUCKET}'` }, 404);
    }

    // Firmamos URL temporal (5 min)
    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60 * 5);

    if (signed.error || !signed.data?.signedUrl) {
      return cors({ error: signed.error?.message || "No se pudo firmar URL" }, 500);
    }

    return cors({ url: signed.data.signedUrl });
  } catch (err: any) {
    return cors({ error: err?.message || "Unexpected error" }, 500);
  }
}
