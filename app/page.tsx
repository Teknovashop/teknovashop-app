// app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_STL_API;
      if (!apiBase) {
        throw new Error("Falta NEXT_PUBLIC_STL_API en variables de entorno");
      }

      const res = await fetch(`${apiBase}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          order_id: "test-order-123",
          model_slug: "vesa-adapter",
          params: {
            width: 180,
            height: 180,
            thickness: 6,
            pattern: "100x100",
          },
          license: "personal",
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      // tu backend devuelve { status: "ok", stl_url: "..." }
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Teknovashop Forge</h1>

      <button onClick={handleGenerate} disabled={loading} style={{ padding: 8 }}>
        {loading ? "Generando..." : "Generar STL"}
      </button>

      {error && (
        <pre style={{ marginTop: 16, color: "crimson", whiteSpace: "pre-wrap" }}>
          Error: {error}
        </pre>
      )}

      {result && (
        <pre style={{ marginTop: 16, color: "#222", whiteSpace: "pre-wrap" }}>
          {result}
        </pre>
      )}
    </main>
  );
}
