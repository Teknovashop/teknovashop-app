// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
const GENERATE_PATH = process.env.BACKEND_GENERATE_PATH || "/generate";

export async function POST(req: Request) {
  if (!BACKEND_URL) {
    return NextResponse.json({ status: "error", message: "Backend URL no configurada" }, { status: 500 });
  }

  let incoming: any = {};
  try {
    incoming = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "JSON inválido" }, { status: 400 });
  }

  // Retro-compat: si vienen 'holes' planos, duplicamos en left/right neutro (el backend ya es tolerant)
  if (incoming?.params?.holes && !incoming?.params?.holes_left && !incoming?.params?.holes_right) {
    incoming.params.holes_left = incoming.params.holes;
    incoming.params.holes_right = [];
  }

  const url = `${BACKEND_URL}${GENERATE_PATH}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(incoming),
      cache: "no-store",
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e?.message || "Fallo de conexión con backend" }, { status: 502 });
  }
}
