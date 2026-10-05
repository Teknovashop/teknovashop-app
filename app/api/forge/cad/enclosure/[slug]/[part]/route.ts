import { NextResponse } from "next/server";
import { isCadV2Enclosure } from "@/lib/forge-v2/cad-enclosures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAD_BACKEND = (
  process.env.CAD_API_URL ||
  process.env.NEXT_PUBLIC_CAD_API_URL ||
  "https://teknovashop-cad-v2.onrender.com"
).replace(/\/+$/, "");

function enabled() {
  return (
    process.env.VERCEL_ENV !== "production" ||
    process.env.ENABLE_CAD_PRODUCT_ADAPTER === "1"
  );
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string; part: string }>;
  }
) {
  if (!enabled()) return new NextResponse(null, { status: 404 });

  const { slug, part } = await params;
  if (!isCadV2Enclosure(slug)) {
    return NextResponse.json(
      { ok: false, error: "CAD_ENCLOSURE_NOT_ENABLED" },
      { status: 404 }
    );
  }

  const validParts = new Set(["body-stl", "lid-stl", "lid-step"]);
  if (!validParts.has(part)) {
    return NextResponse.json(
      { ok: false, error: "CAD_ENCLOSURE_PART_INVALID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

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

  const endpoint =
    part === "body-stl"
      ? "body/stl"
      : part === "lid-step"
        ? "lid/step"
        : "lid/stl";

  try {
    const response = await fetch(
      `${CAD_BACKEND}/v2/enclosure/${encodeURIComponent(slug)}/${endpoint}`,
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
          error: "CAD_ENCLOSURE_GENERATION_FAILED",
          detail: detail.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 100) {
      return NextResponse.json(
        { ok: false, error: "CAD_ENCLOSURE_ARTIFACT_INVALID" },
        { status: 502 }
      );
    }

    const isStep = part === "lid-step";
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": isStep ? "application/step" : "model/stl",
        "content-disposition": `inline; filename="${slug}-${part}.${isStep ? "step" : "stl"}"`,
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
