"use client";

import { useEffect, useMemo, useState } from "react";

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
  onGeneratedTheme?: (theme: "dark" | "light") => void;
};

type Hole = { x_mm: number; d_mm: number };

type ModelKey =
  | "cable_tray"
  | "vesa_adapter"
  | "router_mount"
  | "wall_bracket"
  | "desk_hook"
  | "fan_guard";

const MODEL_KEY_MAP: Record<string, ModelKey> = {
  cable_tray: "cable_tray",
  "cable-tray": "cable_tray",

  vesa_adapter: "vesa_adapter",
  "vesa-adapter": "vesa_adapter",

  router_mount: "router_mount",
  "router-mount": "router_mount",

  wall_bracket: "wall_bracket",
  "wall-bracket": "wall_bracket",

  desk_hook: "desk_hook",
  "desk-hook": "desk_hook",

  fan_guard: "fan_guard",
  "fan-guard": "fan_guard",
};

export default function ForgeForm({ onGenerated, onGeneratedTheme }: ForgeFormProps) {
  const [model, setModel] = useState<ModelKey>("cable_tray");
  const [length, setLength] = useState(200);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(60);
  const [thickness, setThickness] = useState(3);
  const [filletR, setFilletR] = useState(0);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const base = (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  // normaliza SIEMPRE a guion_bajo
  const normalizedModel: ModelKey = useMemo(() => {
    const raw = String(model).toLowerCase();
    return MODEL_KEY_MAP[raw] ?? (raw.replace("-", "_") as ModelKey);
  }, [model]);

  function addHole() {
    setHoles((prev) => [...prev, { x_mm: Math.round(length / 2), d_mm: 4 }]);
  }
  function updateHole(idx: number, patch: Partial<Hole>) {
    setHoles((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }
  function removeHole(idx: number) {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ALT + clic (evento emitido por el visor)
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as Partial<Hole> | undefined;
      if (!detail) return;
      setHoles((prev) => [
        ...prev,
        {
          x_mm: Math.max(0, Math.min(Number(detail.x_mm ?? length / 2), length)),
          d_mm: Number(detail.d_mm ?? 4),
        },
      ]);
    };
    window.addEventListener("forge:add-hole", handler as EventListener);
    return () => window.removeEventListener("forge:add-hole", handler as EventListener);
  }, [length]);

  async function handleGenerate(downloadAfter = false) {
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
            fillet_r_mm: filletR,
          },
          holes, // [{x_mm, d_mm}]
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const data: { stl_url: string } = await res.json();
      setLastUrl(data.stl_url);
      onGenerated?.(data.stl_url);
      onGeneratedTheme?.(theme);

      if (downloadAfter && data.stl_url) {
        const name = `${String(normalizedModel).replace("_", "-")}-${length}x${width}x${height}.stl`;
        const a = document.createElement("a");
        a.href = data.stl_url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      console.error("Error generando STL", err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-white mb-2">Configuración del modelo</h2>

      {/* Tema del visor y modelo */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 w-full">
          <label className="block text-sm text-neutral-400">Tema del visor</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "dark" | "light")}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          >
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
          </select>
        </div>

        <div className="space-y-1 w-full">
          <label className="block text-sm text-neutral-400">Modelo</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelKey)}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          >
            <option value="cable_tray">Cable Tray</option>
            <option value="vesa_adapter">VESA Adapter</option>
            <option value="router_mount">Router Mount</option>
            <option value="wall_bracket">Wall Bracket (L)</option>
            <option value="desk_hook">Desk Hook</option>
            <option value="fan_guard">Fan Guard</option>
          </select>
        </div>
      </div>

      {/* Parámetros */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Largo (mm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Ancho (mm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Alto (mm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Grosor (mm)</label>
          <input
            type="number"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
            min={0.6}
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Redondeo bordes (mm)</label>
          <input
            type="number"
            value={filletR}
            onChange={(e) => setFilletR(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
            min={0}
            step={0.5}
          />
        </div>
      </div>

      {/* Agujeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-neutral-400">Agujeros (vista superior)</label>
          <button
            type="button"
            onClick={addHole}
            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 rounded-md"
          >
            + Añadir agujero
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          Consejo: en el visor, pulsa <kbd className="px-1 py-0.5 bg-neutral-800 rounded">ALT</kbd> + clic para añadir
          un agujero en esa <strong>X</strong> (se usará Ø 4 mm por defecto).
        </p>

        {holes.length === 0 ? (
          <div className="text-neutral-500 text-sm">No hay agujeros. Pulsa “+ Añadir agujero” o usa ALT+clic en el visor.</div>
        ) : (
          <div className="space-y-2">
            {holes.map((h, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="block text-xs text-neutral-500">x (mm)</label>
                  <input
                    type="number"
                    value={h.x_mm}
                    onChange={(e) => updateHole(idx, { x_mm: Number(e.target.value) })}
                    className="w-full rounded-md bg-neutral-800 text-white p-2"
                    min={0}
                    max={length}
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">Ø (mm)</label>
                  <input
                    type="number"
                    value={h.d_mm}
                    onChange={(e) => updateHole(idx, { d_mm: Number(e.target.value) })}
                    className="w-full rounded-md bg-neutral-800 text-white p-2"
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeHole(idx)}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-md"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Previsualizar STL"}
        </button>

        <button
          onClick={() => handleGenerate(true)}
          disabled={loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Descargar STL"}
        </button>
      </div>

      {lastUrl && (
        <div className="text-xs text-neutral-400 break-all">
          URL:{" "}
          <a className="underline" href={lastUrl} target="_blank" rel="noreferrer">
            {lastUrl}
          </a>
        </div>
      )}

      {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
    </div>
  );
}
