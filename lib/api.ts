// lib/api.ts
export type CableTrayPayload = {
  model: "cable_tray";
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated: boolean;
};

export type VesaAdapterPayload = {
  model: "vesa_adapter";
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  pattern: "75x75" | "100x100" | "200x200";
};

export type RouterMountPayload = {
  model: "router_mount";
  base_width_mm: number;
  base_height_mm: number;
  depth_mm: number;
  thickness_mm: number;
};

export type AnyPayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;

export type GenerateResponse =
  | { status: "ok"; stl_url: string }
  | { status: "error"; detail?: string; message?: string };

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  "https://teknovashop-forge.onrender.com";

export async function generateSTL(payload: AnyPayload): Promise<GenerateResponse> {
  const res = await fetch(`${baseURL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    return { status: "error", detail: `HTTP ${res.status}` };
  }
  return (await res.json()) as GenerateResponse;
}
