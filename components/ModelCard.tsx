// components/ModelCard.tsx (nuevo)
"use client";
import { useState } from "react";
import Link from "next/link";

export default function ModelCard({ model }: { model: { slug: string; name: string; thumbnail: string; description: string } }) {
  const [busy, setBusy] = useState(false);

  async function quickDownload() {
    try {
      setBusy(true);
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: model.slug, params: null }) // null -> server usará DEFAULT_PARAMS
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "No se pudo generar");
      window.location.href = json.url; // descarga directa
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <img src={model.thumbnail} alt={model.name} className="w-full rounded-xl mb-3" />
      <h3 className="text-lg font-semibold">{model.name}</h3>
      <p className="text-sm text-neutral-600 mb-4">{model.description}</p>
      <div className="flex gap-2">
        <Link href={`/forge/${model.slug}`} className="px-3 py-2 rounded-lg bg-black text-white">
          Configurar y descargar
        </Link>
        <button onClick={quickDownload} disabled={busy} className="px-3 py-2 rounded-lg border">
          {busy ? "Generando…" : "Descarga rápida"}
        </button>
      </div>
    </div>
  );
}
