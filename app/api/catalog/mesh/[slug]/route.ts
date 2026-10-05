import { NextResponse } from "next/server";
import { MODELS } from "@/data/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.RENDER_FORGE_API_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

const allowed = new Set(MODELS.map((model) => model.slug));

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!allowed.has(slug)) {
    return NextResponse.json({ error: "MODEL_NOT_FOUND" }, { status: 404 });
  }

  try {
    const response = await fetch(
      `${BACKEND}/catalog/mesh/${encodeURIComponent(slug)}.stl`,
      {
        cache: "force-cache",
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "CATALOG_MESH_UNAVAILABLE" },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength <= 84) {
      return NextResponse.json({ error: "CATALOG_MESH_INVALID" }, { status: 502 });
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "model/stl",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "CATALOG_MESH_UNAVAILABLE" }, { status: 502 });
  }
}
