import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
  }

  try {
    const target = `${BACKEND}/catalog/thumbnail/${encodeURIComponent(slug)}.png`;
    let response: Response | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(target, {
        cache: "no-store",
        signal: AbortSignal.timeout(attempt === 0 ? 12000 : 18000),
      }).catch(() => null);

      if (response?.ok || response?.status === 404) break;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
    }

    if (!response?.ok) {
      return NextResponse.json(
        { error: "THUMBNAIL_NOT_FOUND" },
        { status: response?.status === 404 ? 404 : 502 }
      );
    }

    const bytes = await response.arrayBuffer();
    const signature = new Uint8Array(bytes.slice(0, 8));
    const png = [137, 80, 78, 71, 13, 10, 26, 10];
    if (signature.length !== png.length || !png.every((v, i) => signature[i] === v)) {
      return NextResponse.json({ error: "INVALID_THUMBNAIL" }, { status: 502 });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "THUMBNAIL_UNAVAILABLE" },
      { status: 502 }
    );
  }
}
