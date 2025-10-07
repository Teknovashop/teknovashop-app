"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ForgeModel } from "@/data/models";

type Props = { m: ForgeModel };

export default function ModelCard({ m }: Props) {
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  // Comprueba si el slug existe en el backend
  useEffect(() => {
    const API =
      (process.env.NEXT_PUBLIC_FORGE_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "").replace(/\/+$/, "");

    if (!API) return; // si no hay backend definido, no bloqueamos la UI

    (async () => {
      try {
        const res = await fetch(`${API}/models`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!json?.models?.includes?.(m.slug)) setAvailable(false);
      } catch {
        setAvailable(false);
      }
    })();
  }, [m.slug]);

  // Descarga rápida: genera con defaults en el servidor y baja el STL
  async function quickDownload() {
    try {
      setBusy(true);
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // el proxy del front acepta { model, params } o { slug, params }
        body: JSON.stringify({ model: m.slug, params: null }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || json?.detail || "No se pudo generar");
      }
      window.location.href = json.url;
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition">
      <img
        src={m.thumbnail}
        alt={m.name}
        className="w-full rounded-xl mb-3 aspect-square object-cover bg-neutral-100"
      />
      <h3 className="text-lg font-semibold mb-1">{m.name}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{m.description}</p>

      <div className="flex gap-2">
        <Link
          href={`/forge/${m.slug}`}
          className="flex-1 px-3 py-2 rounded-lg bg-[#0b1526] dark:bg-white text-white dark:text-black text-center hover:opacity-90"
        >
          Configurar y descargar
        </Link>

        <button
          onClick={quickDownload}
          disabled={busy || !available}
          className={`flex-1 px-3 py-2 rounded-lg border text-center ${
            !available ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={!available ? "Próximamente" : "Generar con parámetros por defecto"}
        >
          {busy ? "Generando…" : available ? "Descarga rápida" : "Próximamente"}
        </button>
      </div>
    </div>
  );
}
