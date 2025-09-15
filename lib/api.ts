// teknovashop-app/lib/api.ts
import type { ForgePayload, GenerateResponse } from "@/types/forge";

const BASE =
  process.env.NEXT_PUBLIC_FORGE_API_URL?.replace(/\/+$/, "") ||
  "https://TU-SERVICIO.onrender.com"; // <--- cambia si quieres un fallback

async function fetchJSON(url: string, opts: RequestInit, ms = 60000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        ...(opts.headers || {})
      },
      mode: "cors",
      credentials: "omit"
    });
    const isJSON = res.headers.get("content-type")?.includes("application/json");
    const data = isJSON ? await res.json() : null;
    if (!res.ok) {
      return {
        status: "error",
        message: data?.detail || data?.message || `HTTP ${res.status}`
      } as GenerateResponse;
    }
    return data as GenerateResponse;
  } catch (e: any) {
    return {
      status: "error",
      message:
        e?.name === "AbortError"
          ? "Timeout esperando al backend"
          : e?.message || "Fallo de red / CORS"
    } as GenerateResponse;
  } finally {
    clearTimeout(to);
  }
}

export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  // Precalentamos instancia free (no bloqueante)
  try { fetch(`${BASE}/health`, { method: "GET", mode: "cors" }).catch(() => {}); } catch {}
  return fetchJSON(`${BASE}/generate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
