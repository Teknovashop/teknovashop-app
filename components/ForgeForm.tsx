"use client";

import { useState } from "react";

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
};

export default function ForgeForm({ onGenerated }: ForgeFormProps) {
  const [model, setModel] = useState("cable-tray");
  const [length, setLength] = useState(200);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);
  const [thickness, setThickness] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usa tu variable EXISTENTE en Vercel
  const base =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          params: {
            length_mm: length,
            width_mm: width,
            height_mm: height,
            thickness_mm: thickness,
          },
          holes: [],
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      onGenerated?.(data.stl_url);
    } catch (err: any) {
      console.error("Error generando STL", err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
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
          <option value="cable-tray">Cable Tray</option>
          <option value="vesa-adapter">VESA Adapter</option>
          <option value="router-mount">Router Mount</option>
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

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
      >
        {loading ? "Generando..." : "Generar STL"}
      </button>

      {error && <div className="text-red-400 text-sm mt-2">Error {error}</div>}
    </div>
  );
}
