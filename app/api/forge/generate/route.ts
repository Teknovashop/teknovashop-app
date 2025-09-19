// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server-only (no expongas el backend CAD al cliente)
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const GENERATE_PATH = process.env.BACKEND_GENERATE_PATH || "/generate";

export async function POST(req: Request) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { status: "error", message: "Backend URL no configurada (env BACKEND_URL)" },
      { status: 500 }
    );
  }

  // 1) payload desde el cliente
  let incoming: any = {};
  try {
    incoming = await req.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Body inválido (JSON requerido)" },
      { status: 400 }
    );
  }

  // 2) Normaliza por si el front antiguo envía model_id
  const payload = { ...incoming };
  if (!payload.model && payload.model_id) {
    payload.model = payload.model_id;
    delete payload.model_id;
  }

  try {
    // 3) Llama al backend CAD
    const url = `${BACKEND_URL}${GENERATE_PATH}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // 4) Lee texto y trata de parsear JSON (para poder propagar mensajes de error)
    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // si no es JSON, dejamos text para el mensaje
    }

    if (!r.ok) {
      const message =
        data?.message ||
        data?.detail ||
        text ||
        `Backend error HTTP ${r.status}`;
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }

    // 5) Normaliza salida: esperamos una URL firmada
    const stl_url = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (!stl_url) {
      return NextResponse.json(
        { status: "error", message: "El backend no devolvió 'stl_url'." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok", stl_url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Fallo conectando con el backend" },
      { status: 502 }
    );
  }
}
