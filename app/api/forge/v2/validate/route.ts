import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const pilots = new Set(["cable-tray", "vesa-adapter", "enclosure-ip65"]);
  const slug = String(body?.slug || "").trim().toLowerCase();
  if (!pilots.has(slug)) {
    return NextResponse.json({ ok: false, error: "FORGE_V2_PRODUCT_NOT_ENABLED" }, { status: 404 });
  }

  try {
    const response = await fetch(`${BACKEND}/v2/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        engine_version: "mesh-v2",
        schema_version: 2,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "FORGE_V2_VALIDATION_UNAVAILABLE",
        detail: error?.message || String(error),
      },
      { status: 502 }
    );
  }
}
