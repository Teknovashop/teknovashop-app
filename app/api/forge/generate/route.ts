import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
const GENERATE_PATH = process.env.BACKEND_GENERATE_PATH || "/generate";

export async function POST(req: NextRequest) {
  if (!BACKEND_URL) {
    return new NextResponse("Backend URL no configurada", { status: 500 });
  }
  try {
    const body = await req.json(); // {model, params, holes?}
    const r = await fetch(`${BACKEND_URL}${GENERATE_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 2 minutos por si el backend tarda un poco más
      cache: "no-store",
    });
    if (!r.ok) {
      const t = await r.text();
      return new NextResponse(t || "Error generando STL", { status: r.status });
    }
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Error inesperado", { status: 500 });
  }
}
