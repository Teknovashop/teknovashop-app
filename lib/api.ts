import type { ForgePayload, GenerateResponse } from "@/types/forge";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/** Ping no-bloqueante: devuelve "ok" si el backend responde 200, si no "down" */
export async function pingHealth(): Promise<"ok" | "down"> {
  if (!BASE) return "down";
  try {
    const r = await fetch(`${BASE.replace(/\/$/, "")}/health`, { cache: "no-store" });
    return r.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

/** POST /generate */
export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  if (!BASE) {
    return { status: "error", message: "Backend no configurado (NEXT_PUBLIC_BACKEND_URL)" };
  }
  try {
    const r = await fetch(`${BASE.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (data && (data.detail || data.message)) || `HTTP ${r.status}`;
      return { status: "error", message: String(msg) };
    }
    // normalizamos: si backend manda {status:"ok", stl_url:"..."}
    if (data && data.status === "ok" && typeof data.stl_url === "string") {
      return { status: "ok", stl_url: data.stl_url };
    }
    if (data && data.status === "error") {
      return { status: "error", message: String(data.message || "Error generando STL") };
    }
    return { status: "_" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Error de red" };
  }
}
