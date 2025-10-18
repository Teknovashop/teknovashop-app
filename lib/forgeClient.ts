const BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "") ||
  "https://teknovashop-forge.onrender.com";

export async function forgeGenerate(body: any) {
  const r = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d?.detail || d?.message || r.statusText);
  }
  return r.json();
}
