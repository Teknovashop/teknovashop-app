import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAD_BACKEND = (
  process.env.CAD_API_URL ||
  process.env.NEXT_PUBLIC_CAD_API_URL ||
  "https://teknovashop-cad-v2.onrender.com"
).replace(/\/+$/, "");

type Format = "stl" | "step";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const format: Format = body.format === "step" ? "step" : "stl";
  const payload = {
    width: Number(body.width),
    height: Number(body.height),
    thickness: Number(body.thickness),
    corner_radius: Number(body.corner_radius),
    chamfer: Number(body.chamfer),
  };

  if (
    !Number.isFinite(payload.width) ||
    !Number.isFinite(payload.height) ||
    !Number.isFinite(payload.thickness) ||
    !Number.isFinite(payload.corner_radius) ||
    !Number.isFinite(payload.chamfer)
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_PARAMETERS" }, { status: 400 });
  }

  try {
    const response = await fetch(`${CAD_BACKEND}/v2/plate/${format}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "CAD_GENERATION_FAILED", detail: detail.slice(0, 1000) },
        { status: response.status }
      );
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 100) {
      return NextResponse.json({ ok: false, error: "CAD_ARTIFACT_INVALID" }, { status: 502 });
    }

    const media =
      format === "step" ? "application/step" : "model/stl";
    const extension = format === "step" ? "step" : "stl";

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": media,
        "content-disposition": `inline; filename="teknovashop-cad-plate.${extension}"`,
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
