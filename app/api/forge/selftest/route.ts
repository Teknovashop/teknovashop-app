// app/api/forge/selftest/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

export async function GET() {
  const started = Date.now();

  const payload = {
    slug: "vesa-adapter",
    model: "vesa_adapter",
    params: {
      vesa_mm: 100,
      thickness: 5,
      clearance: 10,
      hole: 5,
    },
    holes: [],
    text_ops: [],
    user_id: null,
  };

  try {
    const r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    const raw = await r.text();
    let body: any = raw;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {}

    const hasDownload =
      !!body?.signed_url ||
      !!body?.stl_url ||
      !!body?.stl_data_url ||
      !!body?.path ||
      !!body?.object_key;

    return NextResponse.json(
      {
        ok: r.ok && hasDownload,
        stage: r.ok
          ? hasDownload
            ? "generation-and-storage-ok"
            : "generation-ok-but-no-download-reference"
          : "backend-generation-error",
        backendUrl: BACKEND,
        backendStatus: r.status,
        latencyMs: Date.now() - started,
        testModel: "vesa-adapter",
        backendBody: body,
      },
      { status: r.ok && hasDownload ? 200 : 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        stage: "backend-unreachable-during-generation",
        backendUrl: BACKEND,
        latencyMs: Date.now() - started,
        error: e?.message || String(e),
      },
      { status: 502 }
    );
  }
}
