import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 45;

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

export async function GET() {
  const started = Date.now();

  try {
    const r = await fetch(`${BACKEND}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(35000),
    });

    return NextResponse.json(
      {
        ok: r.ok,
        frontend: "ok",
        backend: r.ok ? "ok" : "error",
        backendStatus: r.status,
        latencyMs: Date.now() - started,
      },
      {
        status: r.ok ? 200 : 502,
        headers: { "cache-control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        frontend: "ok",
        backend: "unreachable",
        latencyMs: Date.now() - started,
      },
      {
        status: 502,
        headers: { "cache-control": "no-store" },
      }
    );
  }
}
