"use client";

import { useEffect, useMemo, useState } from "react";

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
  /** si el padre nos pasa la url, mostramos el botón de descarga */
  stlUrl?: string | null;
};

type HealthRes = { ok: boolean; models: string[] };

export default function ForgeForm({ onGenerated, stlUrl }: ForgeFormProps) {
  const [model, setModel] = useState("cable-tray");
  const [length, setLength] = useState(200);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);
  const [thickness, setThickness] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modelos disponibles (los cargo desde /health para no hardcodear)
  const [available, setAvailable] = useState<string[]>([
    "cable_tray",
    "vesa_adapter",
    "router_mount",
  ]);

  // Usa tu variable EXISTENTE en Vercel
  const base =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  // cargar /health para poblar select con lo que expone el backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${base}/health`, { cache: "no-store" });
        if (!res.ok) return;
        const data: HealthRes = await res.json();
        if (Array.isArray(data?.models) && data.models.length) {
          setAvailable(data.models);
          // si el modelo actual no está, selecciono el primero disponible
          const has = data.models.some((k) => sameKey(k, model));
          if (!has) setModel(data.models[0] ?? "cable-tray");
        }
      } catch {
        /* si falla, seguimos con los 3 por defecto */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // normalizar claves guión/underscore sin usar replaceAll
  const normalizedModel = useMemo(
    () => model.split("-").join("_"),
    [model]
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: normalizedModel,
          params: {
            length_mm: length,
            width_mm: width,
            height_mm: height,
            thickness_mm: thickness,
          },
          holes: [], // en siguiente iteración conectamos el UI de taladros
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      onGenerated?.(data.stl_url);
    } catch (err: any) {
      console.error("Error generando STL", err);
      setError(err?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!stlUrl) return;
    try {
      const res = await fetch(stlUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${normalizedModel}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Aquí puedes llamar a tu endpoint de monetización/registro de descarga:
      // await fetch('/api/track-download', { method:'POST', body: JSON.stringify({ model: normalizedModel }) })
    } catch (e) {
      console.error("Fallo al descargar STL", e);
      alert("No se pudo descargar el STL. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Configuración del modelo
      </h2>

      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
        >
          {available.map((k) => (
            <option key={k} value={toDash(k)}>
              {labelize(k)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Largo (mm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Ancho (mm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Alto (mm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Grosor (mm)</label>
          <input
            type="number"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Generar STL"}
        </button>

        {stlUrl && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            title="Descargar STL"
          >
            Descargar STL
          </button>
        )}
      </div>

      {error && <div className="text-red-400 text-sm mt-2">Error {error}</div>}
    </div>
  );
}

/* ---------- helpers UI ---------- */
function labelize(k: string) {
  const key = k.split("_").join(" ");
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function sameKey(a: string, b: string) {
  return a.split("-").join("_") === b.split("-").join("_");
}
function toDash(k: string) {
  return k.split("_").join("-");
}
