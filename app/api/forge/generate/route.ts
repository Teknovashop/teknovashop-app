// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

function cors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}

export async function OPTIONS() {
  return cors({ ok: true });
}

export async function POST(req: Request) {
  try {
    if (!BACKEND) {
      return cors({ error: "BACKEND URL missing" }, 500);
    }
    const payload = await req.json();
    const r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    return cors(json, r.status);
  } catch (e: any) {
    return cors({ error: e?.message || "proxy error" }, 500);
  }
}
