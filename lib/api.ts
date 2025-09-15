// teknovashop-app/lib/api.ts
import type { ForgePayload, GenerateResponse } from "@/types/forge";

// Llama SIEMPRE al proxy interno de Next (mismo dominio) → adiós CORS
export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  // Precalentamos el backend a través del proxy (no bloquea)
  fetch("/api/forge/health").catch(() => {});

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000); // 90s
  try {
    const res = await fetch("/api/forge/generate", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: "error", message: data?.detail || data?.message || `HTTP ${res.status}` };
    }
    return data as GenerateResponse;
  } catch (e: any) {
    return {
      status: "error",
      message: e?.name === "AbortError" ? "Timeout esperando al backend" : (e?.message || "Fallo de red"),
    };
  } finally {
    clearTimeout(t);
  }
}
