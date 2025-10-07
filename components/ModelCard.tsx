"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Model {
  slug: string;
  name: string;
  thumbnail: string;
  description: string;
}

export default function ModelCard({ model }: { model: Model }) {
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  // Comprobar si el modelo está disponible en el backend
  useEffect(() => {
    async function checkAvailability() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_FORGE_API_URL}/models`
        );
        const json = await res.json();
        if (!json?.models?.includes(model.slug)) {
          setAvailable(false);
        }
      } catch {
        setAvailable(false);
      }
    }
    checkAvailability();
  }, [model.slug]);

  // Descarga rápida sin pasar por el visor
  async function quickDownload() {
    try {
      setBusy(true);
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: model.slug, params: null }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "Error al generar");
      window.location.href = json.url;
    } catch (e: any) {
      alert(e.message || "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 shadow-sm hover:shadow-lg transition">
      <img
        src={model.thumbnail}
        alt={model.name}
        className="w-full rounded-xl mb-3 aspect-square object-cover bg-neutral-100"
      />
      <h3 className="text-lg font-semibold mb-1">{model.name}</h3>
      <p className="text-sm text-neutral-600 mb-4">{model.description}</p>

      <div className="flex gap-2">
        <Link
          href={`/forge/${model.slug}`}
          className="flex-1 px-3 py-2 rounded-lg bg-black text-white text-center"
        >
          Configurar y descargar
        </Link>

        <button
          onClick={quickDownload}
          disabled={busy || !available}
          className={`flex-1 px-3 py-2 rounded-lg border text-center ${
            !available ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {busy ? "Generando…" : available ? "Descarga rápida" : "Próximamente"}
        </button>
      </div>
    </div>
  );
}
