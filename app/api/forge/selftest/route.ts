import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

function authorized(req: Request) {
  const expected = process.env.FORGE_DIAGNOSTICS_TOKEN || "";
  if (!expected) return false;
  return req.headers.get("x-diagnostics-token") === expected;
}

export async function GET(req: Request) {
  // Disabled by default in production. Enable only by configuring a private
  // diagnostics token and sending it in x-diagnostics-token.
  if (!process.env.FORGE_DIAGNOSTICS_TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!authorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

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

    const hasPreview = !!body?.preview_url;
    return NextResponse.json(
      {
        ok: r.ok && hasPreview,
        stage: r.ok
          ? hasPreview
            ? "generation-storage-and-preview-ok"
            : "generation-ok-but-safe-preview-missing"
          : "backend-generation-error",
        backendStatus: r.status,
        latencyMs: Date.now() - started,
        testModel: "vesa-adapter",
        designId: body?.design_id || null,
        previewPrecisionMm: body?.preview_precision_mm || null,
      },
      {
        status: r.ok && hasPreview ? 200 : 502,
        headers: { "cache-control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        stage: "backend-unreachable-during-generation",
        latencyMs: Date.now() - started,
      },
      {
        status: 502,
        headers: { "cache-control": "no-store" },
      }
    );
  }
}
