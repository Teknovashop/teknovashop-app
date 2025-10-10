import { NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/,"");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r = await fetch(`${BACKEND}/v2/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    return NextResponse.json(json, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "v2 proxy error" }, { status: 500 });
  }
}
