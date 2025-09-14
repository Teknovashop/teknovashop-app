// lib/api.ts
export type CableTrayPayload = {
  model: "cable_tray";
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated: boolean;
};

export type GenerateResponse =
  | { status: "ok"; stl_url: string }
  | { status: "error"; detail?: string; message?: string };

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || // <- tu variable en Vercel
  process.env.NEXT_PUBLIC_FORGE_API_URL || // por compatibilidad
  "https://teknovashop-forge.onrender.com";

export async function generateSTL(payload: CableTrayPayload): Promise<GenerateResponse> {
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
