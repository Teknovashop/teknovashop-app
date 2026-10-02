import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAD_BACKEND = (
  process.env.CAD_API_URL ||
  process.env.NEXT_PUBLIC_CAD_API_URL ||
  "https://teknovashop-cad-v2.onrender.com"
).replace(/\/+$/, "");

export async function GET() {
  const started = Date.now();
  try {
    const response = await fetch(`${CAD_BACKEND}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(
      {
        ok: response.ok && data?.ok === true,
        backendStatus: response.status,
        latencyMs: Date.now() - started,
        engine: data?.engine || null,
        cadqueryVersion: data?.cadquery_version || null,
        operations: Array.isArray(data?.operations) ? data.operations : [],
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CAD_BACKEND_UNAVAILABLE",
        detail: error?.message || String(error),
        latencyMs: Date.now() - started,
      },
      { status: 502 }
    );
  }
}
