// teknovashop-app/lib/api.ts
export type CableTrayParams = {
  model: "cable_tray";
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated: boolean;
};

export type VesaAdapterParams = {
  model: "vesa_adapter";
  vesa_size_mm: 75 | 100 | 200;
  hole_d_mm: number;
  plate_thickness_mm: number;
  tv_screw_d_mm: number;
  offset_mm: number;
};

export type RouterMountParams = {
  model: "router_mount";
  router_w_mm: number;
  router_d_mm: number;
  router_h_mm: number;
  strap_w_mm: number;
  wall_hole_d_mm: number;
  fillet_r_mm: number;
  thickness_mm: number;
};

export type ForgePayload =
  | CableTrayParams
  | VesaAdapterParams
  | RouterMountParams;

export type GenerateOk = { status: "ok"; stl_url: string };
export type GenerateError = { status: "error"; detail?: string };
export type GenerateResponse = GenerateOk | GenerateError;

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://teknovashop-forge.onrender.com";

/**
 * POST /generate
 */
export async function generateSTL(
  payload: ForgePayload
): Promise<GenerateResponse> {
  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { status: "error", detail: `HTTP ${res.status}: ${txt}` };
    }
    const json = (await res.json()) as GenerateResponse;
    return json;
  } catch (e: any) {
    return { status: "error", detail: e?.message ?? "Network error" };
  }
}
