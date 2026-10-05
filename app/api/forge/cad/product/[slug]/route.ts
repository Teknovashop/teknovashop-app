import { NextResponse } from "next/server";
import { isCadV2Product } from "@/lib/forge-v2/cad-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAD_BACKEND = (
  process.env.CAD_API_URL ||
  process.env.NEXT_PUBLIC_CAD_API_URL ||
  "https://teknovashop-cad-v2.onrender.com"
).replace(/\/+$/, "");

function experimentalCadEnabled() {
  return (
    process.env.VERCEL_ENV !== "production" ||
    process.env.ENABLE_CAD_PRODUCT_ADAPTER === "1"
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!experimentalCadEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const { slug } = await params;
  if (!isCadV2Product(slug)) {
    return NextResponse.json(
      { ok: false, error: "CAD_PRODUCT_NOT_ENABLED" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const format = body.format === "step" ? "step" : "stl";
  const operations = Array.isArray(body.operations)
    ? body.operations.slice(0, 24).map((op: any) => ({
        type: String(op?.type || ""),
        x: Number(op?.placement?.x || 0),
        y: Number(op?.placement?.y || 0),
        rotation_deg: Number(op?.placement?.rotation_deg || 0),
        enabled: op?.enabled !== false,
        ...Object.fromEntries(
          Object.entries(op?.params || {}).filter(
            ([, value]) =>
              typeof value === "number" ||
              typeof value === "string" ||
              typeof value === "boolean"
          )
        ),
      }))
    : [];

  const paramsPayload =
    body.params && typeof body.params === "object" ? body.params : {};

  try {
    const response = await fetch(
      `${CAD_BACKEND}/v2/product/${encodeURIComponent(slug)}/design/${format}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          params: paramsPayload,
          operations,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "CAD_PRODUCT_GENERATION_FAILED",
          detail: detail.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 100) {
      return NextResponse.json(
        { ok: false, error: "CAD_PRODUCT_ARTIFACT_INVALID" },
        { status: 502 }
      );
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": format === "step" ? "application/step" : "model/stl",
        "content-disposition": `inline; filename="${slug}.${format}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CAD_BACKEND_UNAVAILABLE",
        detail: error?.message || String(error),
      },
      { status: 502 }
    );
  }
}
