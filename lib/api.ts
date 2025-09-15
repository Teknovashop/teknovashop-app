// teknovashop-app/lib/api.ts
import type { GeneratePayload, GenerateResponse } from "@/types/forge";

const baseURL =
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  "https://TU-SERVICE.onrender.com";

export async function generateSTL(payload: GeneratePayload): Promise<GenerateResponse> {
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
