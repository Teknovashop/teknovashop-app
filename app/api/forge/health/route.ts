// teknovashop-app/app/api/forge/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBase(): string {
  // Usamos TU variable actual
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return raw.replace(/\/+$/, "");
}

export async function GET() {
  const base = getBase();
  if (!base) {
    return NextResponse.json(
      { status: "error", message: "NEXT_PUBLIC_BACKEND_URL no definido" },
      { status: 500 }
    );
  }
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message || "Fallo al conectar con backend" },
      { status: 502 }
    );
  }
}
