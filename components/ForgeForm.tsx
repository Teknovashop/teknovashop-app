"use client";

import { useMemo, useState } from "react";

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
};

type Hole = { x_mm: number; d_mm: number };

const MODELS: { value: string; label: string }[] = [
  { value: "cable_tray", label: "Cable Tray" },
  { value: "vesa_adapter", label: "VESA Adapter" },
  { value: "router_mount", label: "Router Mount" },
  // nuevos
  { value: "pcb_standoff", label: "PCB Standoff" },
  { value: "wall_bracket", label: "Wall Bracket" },
  { value: "duct_adapter", label: "Duct Adapter" },
  { value: "fan_grill", label: "Fan Grill" },
  { value: "raspberry_mount", label: "Raspberry Mount" },
  { value: "camera_mount", label: "Camera Mount" },
  { value: "cable_clip", label: "Cable Clip" },
  { value: "hinge", label: "Hinge" },
  { value: "knob", label: "Knob" },
];

export default function ForgeForm({ onGenerated }: ForgeFormProps) {
  const [model, setModel] = useState("cable_tray");
  const [length, setLength] = useState(200);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);
  const [thickness, setThickness] = useState(3);
  const [fillet, setFillet] = useState(0);
  const [holes, setHoles] = useState<Hole[]>([{ x_mm: 10, d_mm: 4 }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  // Usa tu variable EXISTENTE en Vercel
  const base =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  const normalizedModel = useMemo(() => model.replace("-", "_"), [model]);

  function addHole() {
    setHoles((prev) => [...prev, { x_mm: 10, d_mm: 4 }]);
  }
  function updateHole(i: number, patch: Partial<Hole>) {
    setHoles((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function removeHole(i: number) {
    setHoles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function doGenerate(downloadAfter = false) {
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
            fillet_mm: fillet,
          },
          holes,
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setLastUrl(data.stl_url as string);
      onGenerated?.(data.stl_url);

      if (downloadAfter && data?.stl_url) {
        const a = document.createElement("a");
        // nombre descriptivo (evitamos replaceAll para compat)
        const nice = normalizedModel.split("_").join("-");
        a.href = data.stl_url;
        a.download = `${nice}-${length}x${width}x${height}.stl`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      console.error("Error generando STL", err);
      setError(err?.message || "Error desconocido");
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
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Largo X (mm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Ancho Y (mm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Alto Z (mm)</label>
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
        <div className="col-span-2">
          <label className="block text-sm text-neutral-400">Redondeo/Fillet (mm)</label>
          <input
            type="number"
            value={fillet}
            onChange={(e) => setFillet(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
      </div>

      {/* Agujeros */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-neutral-300 text-sm">Agujeros (cara superior, pasantes)</div>
          <button
            onClick={addHole}
            className="px-3 py-1 rounded bg-neutral-700 text-white text-sm"
          >
            + Añadir agujero
          </button>
        </div>

        {holes.map((h, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 items-center mb-2">
            <div className="col-span-2">
              <label className="block text-xs text-neutral-500">X (mm)</label>
              <input
                type="number"
                value={h.x_mm}
                onChange={(e) => updateHole(i, { x_mm: Number(e.target.value) })}
                className="w-full rounded-md bg-neutral-800 text-white p-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-500">Ø (mm)</label>
              <input
                type="number"
                value={h.d_mm}
                onChange={(e) => updateHole(i, { d_mm: Math.max(0, Number(e.target.value)) })}
                className="w-full rounded-md bg-neutral-800 text-white p-2"
              />
            </div>
            <div className="col-span-3 flex items-end">
              <button
                onClick={() => removeHole(i)}
                className="px-3 py-2 rounded bg-red-600 text-white text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => doGenerate(false)}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Generar STL"}
        </button>

        <button
          onClick={() => doGenerate(true)}
          disabled={loading}
          className="w-44 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Descargar STL
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}

      {lastUrl && (
        <div className="text-xs text-neutral-400">
          Último STL: <a className="underline" href={lastUrl} target="_blank">{lastUrl}</a>
        </div>
      )}
    </div>
  );
}
