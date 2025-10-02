// /app/api/examples/route.ts
import { NextResponse } from "next/server";
import { PRESETS } from "@/lib/presets";

export const dynamic = "force-dynamic"; // sin SSG
export const revalidate = 0;

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

async function postJSON(url: string, body: any, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      // ayuda a Vercel a cachear en edge si quisieras
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  if (!BACKEND) {
    return NextResponse.json(
      { error: "Falta NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 }
    );
  }

  const results = await Promise.all(
    PRESETS.map(async (preset) => {
      try {
        const data = await postJSON(`${BACKEND}/generate`, preset.payload);
        return {
          slug: preset.slug,
          title: preset.title,
          caption: preset.caption,
          stl_url: data.stl_url,
          thumb_url: data.thumb_url ?? null,
          object_key: data.object_key,
        };
      } catch (e: any) {
        return {
          slug: preset.slug,
          title: preset.title,
          caption: preset.caption,
          stl_url: null,
          thumb_url: null,
          object_key: null,
          error: String(e?.message || e),
        };
      }
    })
  );

  // cache CDN 6 horas (pero cada request al serverless recalcule si caduca)
  return NextResponse.json(results, {
    headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=60" },
  });
}
