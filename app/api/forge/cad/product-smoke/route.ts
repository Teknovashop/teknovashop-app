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
    const vesa = await fetch(
      `${CAD_BACKEND}/v2/product/vesa-adapter/design/stl`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          params: {
            width: 140,
            height: 140,
            thickness: 6,
          },
          operations: [
            {
              type: "vesa_pattern",
              x: 0,
              y: 0,
              pitch_mm: 75,
              diameter_mm: 5,
            },
            {
              type: "vent_hex",
              x: 0,
              y: 0,
              rows: 2,
              cols: 3,
              radius_mm: 3,
              gap_mm: 2,
            },
          ],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    const stl = await vesa.arrayBuffer();
    if (!vesa.ok || stl.byteLength < 100) {
      throw new Error(
        `VESA STL failed: HTTP ${vesa.status}, ${stl.byteLength} bytes`
      );
    }

    const camera = await fetch(
      `${CAD_BACKEND}/v2/product/camera-plate/design/step`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          params: {
            width: 55,
            depth: 65,
            thickness: 7,
            chamfer: 1,
          },
          operations: [
            {
              type: "slot",
              x: 0,
              y: 0,
              length_mm: 22,
              width_mm: 6,
            },
            {
              type: "counterbore",
              x: 15,
              y: 10,
              through_diameter_mm: 5,
              bore_diameter_mm: 10,
              bore_depth_mm: 2,
            },
          ],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    const step = await camera.arrayBuffer();
    const stepHead = new TextDecoder().decode(step.slice(0, 80));
    if (
      !camera.ok ||
      step.byteLength < 100 ||
      !stepHead.includes("ISO-10303")
    ) {
      throw new Error(
        `Camera STEP failed: HTTP ${camera.status}, ${step.byteLength} bytes`
      );
    }

    return NextResponse.json({
      ok: true,
      family: "planar-cad-v2",
      vesaStlBytes: stl.byteLength,
      cameraStepBytes: step.byteLength,
      stepHeader: "ISO-10303",
      latencyMs: Date.now() - started,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "CAD_PRODUCT_SMOKE_FAILED",
        detail: error?.message || String(error),
        latencyMs: Date.now() - started,
      },
      { status: 502 }
    );
  }
}
