// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-only (no expongas el backend CAD al cliente)
const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const GENERATE_PATH = process.env.BACKEND_GENERATE_PATH || "/generate";
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

/**
 * Normaliza cualquier URL firmada que venga del backend para que siempre
 * sea una URL absoluta válida de Supabase Storage:
 * - Si llega relativa: /object/sign/...  ->  https://.../storage/v1/object/sign/...
 * - Si llega absoluta pero sin /storage/v1: https://xxx.supabase.co/object/sign/... -> añade /storage/v1
 */
function normalizeSignedUrl(inputUrl: string, baseSupabaseUrl: string): string {
  const base = baseSupabaseUrl.replace(/\/$/, "");

  // Caso 1: ruta relativa devuelta por el backend
  if (inputUrl.startsWith("/object/sign/")) {
    return `${base}/storage/v1${inputUrl}`;
  }

  // Caso 2: URL absoluta (intentar parsear)
  try {
    const u = new URL(inputUrl);

    // Solo tocamos URLs de Supabase
    if (u.hostname.includes(".supabase.co")) {
      // Muchas implementaciones devuelven /object/sign/... sin /storage/v1
      if (u.pathname.startsWith("/object/sign/")) {
        return `${u.origin}/storage/v1${u.pathname}${u.search}`;
      }
      // Si por algún motivo viene sin /storage/v1 pero con solo /object/..., también lo arreglamos
      if (u.pathname.startsWith("/object/") && !u.pathname.startsWith("/storage/v1/object/")) {
        return `${u.origin}/storage/v1${u.pathname}${u.search}`;
      }
    }
  } catch {
    // Si no es una URL válida, no hacemos nada y devolvemos tal cual;
    // el caller decidirá si es aceptable o no.
  }

  return inputUrl;
}

export async function POST(req: Request) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { status: "error", message: "Backend URL no configurada (env BACKEND_URL)" },
      { status: 500 }
    );
  }

  // payload
  let incoming: any = {};
  try {
    incoming = await req.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Body inválido (JSON requerido)" },
      { status: 400 }
    );
  }

  // Normaliza por si aún llega model_id
  const payload = { ...incoming };
  if (!payload.model && payload.model_id) {
    payload.model = payload.model_id;
    delete payload.model_id;
  }

  try {
    const url = `${BACKEND_URL}${GENERATE_PATH}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // si no es JSON pero r.ok es false, abajo retornamos el texto crudo
    }

    if (!r.ok) {
      const message = data?.message || data?.detail || text || `Backend error HTTP ${r.status}`;
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }

    // El backend nos puede devolver { stl_url } o { url } o { data: { stl_url } }
    let stl_url: string | null =
      data?.stl_url || data?.url || data?.data?.stl_url || null;

    if (!stl_url) {
      return NextResponse.json(
        { status: "error", message: "El backend no devolvió 'stl_url'." },
        { status: 500 }
      );
    }

    // Normalización robusta para Supabase Storage
    if (!SUPABASE_URL) {
      // Si no tenemos SUPABASE_URL solo podemos devolver la que vino
      // (pero normalmente sí lo tenemos configurado).
      return NextResponse.json({ status: "ok", stl_url }, { status: 200 });
    }

    stl_url = normalizeSignedUrl(stl_url, SUPABASE_URL);

    return NextResponse.json({ status: "ok", stl_url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Fallo conectando con el backend" },
      { status: 502 }
    );
  }
}
