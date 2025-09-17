// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export async function POST(req: Request) {
  if (!BACKEND) {
    return NextResponse.json(
      { status: "error", message: "Backend URL no configurada" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await r
      .json()
      .catch(() => ({ status: "error", message: "Respuesta no válida del backend" }));

    return NextResponse.json(data, { status: r.ok ? 200 : r.status });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Fallo conectando con el backend" },
      { status: 502 }
    );
  }
}
