// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-only (no expongas el backend CAD al cliente)
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const GENERATE_PATH = process.env.BACKEND_GENERATE_PATH || "/generate";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

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
    try { data = JSON.parse(text); } catch {}

    if (!r.ok) {
      const message = data?.message || data?.detail || text || `Backend error HTTP ${r.status}`;
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }

    let stl_url: string | null = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (!stl_url) {
      return NextResponse.json(
        { status: "error", message: "El backend no devolvió 'stl_url'." },
        { status: 500 }
      );
    }

    // 👇 FIX: si el backend devolvió una ruta relativa de Storage, la completamos
    if (stl_url.startsWith("/object/")) {
      if (!SUPABASE_URL) {
        return NextResponse.json(
          { status: "error", message: "SUPABASE_URL no configurada para reescribir la URL firmada" },
          { status: 500 }
        );
      }
      stl_url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1${stl_url}`;
    }

    return NextResponse.json({ status: "ok", stl_url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Fallo conectando con el backend" },
      { status: 502 }
    );
  }
}
