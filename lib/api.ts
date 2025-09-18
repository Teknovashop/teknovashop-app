import type { ForgePayload, GenerateResponse } from "@/types/forge";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/** genera STL en el backend y devuelve {status, stl_url} */
export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  if (!BASE) {
    return { status: "error", message: "BACKEND_URL no configurado" };
  }
  try {
    const res = await fetch(`${BASE.replace(/\/+$/,"")}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", message: text || `HTTP ${res.status}` };
    }
    const data = await res.json();
    // normalizamos por si backend devolviera otras keys
    if (data?.stl_url) return { status: "ok", stl_url: data.stl_url };
    if (data?.url)     return { status: "ok", stl_url: data.url };
    if (data?.status === "ok" && data?.data?.stl_url) {
      return { status: "ok", stl_url: data.data.stl_url };
    }
    return { status: "error", message: "Respuesta inesperada del backend" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}
