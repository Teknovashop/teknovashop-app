import { useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "test-order-123",
          model_slug: "vesa-adapter",
          params: { width: 180, height: 180, thickness: 6, pattern: "100x100" },
          license: "personal",
        }),
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ status: "error", message: err?.message || "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1>Teknovashop Forge</h1>
      <button onClick={handleClick} disabled={loading} style={{ padding: "8px 14px" }}>
        {loading ? "Generando..." : "Generar STL"}
      </button>
      <pre style={{ marginTop: 24, background: "#f7f7f7", padding: 16, borderRadius: 8 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </main>
  );
}
