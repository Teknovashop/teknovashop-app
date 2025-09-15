// teknovashop-app/app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBase(): string {
  // Usamos TU variable actual
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  return raw.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  const base = getBase();
  if (!base) {
    return NextResponse.json(
      { status: "error", message: "NEXT_PUBLIC_BACKEND_URL no definido" },
      { status: 500 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "JSON inválido" },
      { status: 400 }
    );
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000); // 90s para cubrir cold start

  try {
    const res = await fetch(`${base}/generate`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });

    const isJSON = res.headers.get("content-type")?.includes("application/json");
    const data = isJSON ? await res.json() : null;

    return NextResponse.json(
      data ?? { status: "error", message: `HTTP ${res.status}` },
      { status: res.status }
    );
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Timeout esperando al backend" : (e?.message || "Error de red");
    return NextResponse.json({ status: "error", message: msg }, { status: 504 });
  } finally {
    clearTimeout(t);
  }
}
