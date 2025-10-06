// app/api/generate/route.ts
import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL; // p.ej. https://teknovashop-forge.onrender.com

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.model) {
      return NextResponse.json({ error: "Missing 'model'" }, { status: 400 });
    }
    const r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await r.json();
    return NextResponse.json(json, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Proxy error" }, { status: 500 });
  }
}
