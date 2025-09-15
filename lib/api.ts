// /lib/api.ts
import type { ForgePayload, GenerateResponse } from "@/types/forge";

/**
 * Llama al backend /generate con el payload del modelo seleccionado.
 * Mantiene compatibilidad con el cable_tray actual y deja listos los demás.
 */
export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = `${base}/generate`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Si el backend aún no soporta el modelo, probablemente devuelva error.
    const data = (await res.json()) as GenerateResponse;
    // Normalizamos respuesta mínima
    if (!data || !("status" in data)) {
      return { status: "error", message: "Respuesta inesperada del backend" };
    }
    return data;
  } catch (err) {
    return {
      status: "error",
      message:
        (err as Error)?.message ||
        "No se pudo contactar con el servicio de generación",
    };
  }
}
