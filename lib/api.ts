import type { ForgePayload, GenerateResponse } from "@/types/forge";

/** genera STL llamando al proxy interno del API */
export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  try {
    const res = await fetch("/api/forge/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", message: text || `HTTP ${res.status}` };
    }
    const data = await res.json();
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
