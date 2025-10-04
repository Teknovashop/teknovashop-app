"use client";

import { useState } from "react";

export default function DownloadButton({
  path,
  fileName,
  className,
}: {
  path: string;
  fileName: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Normaliza "public/foo.stl" -> "foo.stl" y quita barras iniciales
  function normalizeKey(p: string) {
    return p.replace(/^\/+/, "").replace(/^public\//, "");
  }

  const onClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      const key = normalizeKey(path);
      const res = await fetch(`/api/sign-stl?key=${encodeURIComponent(key)}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "No se pudo firmar la URL");
      }

      // Disparar descarga
      const a = document.createElement("a");
      a.href = json.url as string;
      a.download = fileName || key.split("/").pop() || "modelo.stl";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setErr(e?.message || "Error al descargar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? "Preparando…" : "Descargar STL"}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
