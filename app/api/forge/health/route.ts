// app/api/forge/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 45;

const BACKEND = (
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

    const raw = await r.text();
    let backendBody: any = raw;
    try {
      backendBody = raw ? JSON.parse(raw) : null;
    } catch {}

    return NextResponse.json(
      {
        ok: r.ok,
        frontend: "ok",
        backend: r.ok ? "ok" : "error",
        backendUrl: BACKEND,
        backendStatus: r.status,
        latencyMs: Date.now() - started,
        backendBody,
      },
      { status: r.ok ? 200 : 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        frontend: "ok",
        backend: "unreachable",
        backendUrl: BACKEND,
        latencyMs: Date.now() - started,
        error: e?.message || String(e),
      },
      { status: 502 }
    );
  }
}
