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
  const common = {
    width: 120,
    height: 90,
    thickness: 8,
    corner_radius: 5,
    chamfer: 1,
  };

  try {
    const stlResponse = await fetch(`${CAD_BACKEND}/v2/plate/design/stl`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...common,
        operations: [
          { type: "hole", x: 25, y: 0, diameter_mm: 6 },
          { type: "slot", x: -25, y: 0, length_mm: 24, width_mm: 6 },
          {
            type: "counterbore",
            x: 0,
            y: 24,
            through_diameter_mm: 5,
            bore_diameter_mm: 10,
            bore_depth_mm: 2,
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    const stl = await stlResponse.arrayBuffer();
    if (!stlResponse.ok || stl.byteLength < 100) {
      throw new Error(`STL smoke failed: HTTP ${stlResponse.status}, ${stl.byteLength} bytes`);
    }

    const stepResponse = await fetch(`${CAD_BACKEND}/v2/plate/design/step`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...common,
        operations: [
          { type: "vesa_pattern", x: 0, y: 0, pitch_mm: 50, diameter_mm: 5 },
          { type: "boss", x: 0, y: 34, diameter_mm: 12, height_mm: 3 },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });

    const step = await stepResponse.arrayBuffer();
    const stepHead = new TextDecoder().decode(step.slice(0, 64));
    if (
      !stepResponse.ok ||
      step.byteLength < 100 ||
      !stepHead.includes("ISO-10303")
    ) {
      throw new Error(
        `STEP smoke failed: HTTP ${stepResponse.status}, ${step.byteLength} bytes`
      );
    }

    return NextResponse.json({
      ok: true,
      engine: "cad-v2",
      stlBytes: stl.byteLength,
      stepBytes: step.byteLength,
      stepHeader: "ISO-10303",
      latencyMs: Date.now() - started,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CAD_SMOKE_FAILED",
        detail: error?.message || String(error),
        latencyMs: Date.now() - started,
      },
      { status: 502 }
    );
  }
}
