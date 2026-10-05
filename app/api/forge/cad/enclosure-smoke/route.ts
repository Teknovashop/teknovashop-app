import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAD_BACKEND = (
  process.env.CAD_API_URL ||
  process.env.NEXT_PUBLIC_CAD_API_URL ||
  "https://teknovashop-cad-v2.onrender.com"
).replace(/\/+$/, "");

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const started = Date.now();

  try {
    const payload = {
      params: {
        length: 150,
        width: 95,
        height: 50,
        wall: 3,
        lid: 3,
      },
      operations: [
        {
          type: "vent_linear",
          x: 0,
          y: 0,
          count: 5,
          length_mm: 35,
          width_mm: 3,
          spacing_mm: 8,
        },
        {
          type: "hole",
          x: 28,
          y: 18,
          diameter_mm: 5,
        },
      ],
    };

    const bodyRes = await fetch(
      `${CAD_BACKEND}/v2/enclosure/electronics-box/body/stl`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );
    const body = await bodyRes.arrayBuffer();
    if (!bodyRes.ok || body.byteLength < 100) {
      throw new Error(
        `Body STL failed: HTTP ${bodyRes.status}, ${body.byteLength} bytes`
      );
    }

    const lidRes = await fetch(
      `${CAD_BACKEND}/v2/enclosure/electronics-box/lid/step`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );
    const lid = await lidRes.arrayBuffer();
    const head = new TextDecoder().decode(lid.slice(0, 80));
    if (
      !lidRes.ok ||
      lid.byteLength < 100 ||
      !head.includes("ISO-10303")
    ) {
      throw new Error(
        `Lid STEP failed: HTTP ${lidRes.status}, ${lid.byteLength} bytes`
      );
    }

    return NextResponse.json({
      ok: true,
      family: "enclosure-cad-v2",
      bodyStlBytes: body.byteLength,
      lidStepBytes: lid.byteLength,
      stepHeader: "ISO-10303",
      latencyMs: Date.now() - started,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CAD_ENCLOSURE_SMOKE_FAILED",
        detail: error?.message || String(error),
        latencyMs: Date.now() - started,
      },
      { status: 502 }
    );
  }
}
