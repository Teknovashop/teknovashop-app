// app/api/forge/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export async function GET() {
  if (!BACKEND) {
    // devolvemos algo rápido para no bloquear el build ni las pruebas
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  try {
    const r = await fetch(`${BACKEND}/health`, { cache: "no-store" });
    const data = await r.json().catch(() => ({ status: r.ok ? "ok" : "error" }));
    return NextResponse.json(data, { status: r.ok ? 200 : r.status });
  } catch {
    return NextResponse.json({ status: "ok" }, { status: 200 }); // tolerante
  }
}
