import type { ForgePayload, GenerateResponse } from "@/types/forge";

function backendUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Quitamos doble barra si el usuario pone / al final
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function health(): Promise<boolean> {
  try {
    const res = await fetch(backendUrl("/health"), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateSTL(payload: ForgePayload): Promise<GenerateResponse> {
  try {
    const res = await fetch(backendUrl("/generate"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=>"");
      return { status: "error", message: txt || `HTTP ${res.status}` };
    }
    // puede venir application/json o texto JSON
    const data = (await res.json().catch(async () => JSON.parse(await res.text()))) as any;

    if (data?.status === "ok" && typeof data?.stl_url === "string") {
      return data as GenerateResponse;
    }
    if (data?.detail || data?.message) {
      return { status: "error", message: String(data.detail || data.message) };
    }
    return { status: "_" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Network error" };
  }
}
