"use client";

import { useMemo, useState } from "react";

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
};

// Modelos disponibles (ids en snake_case tal y como los expone el backend)
const MODEL_OPTIONS = [
  { id: "cable_tray", label: "Cable Tray" },
  { id: "vesa_adapter", label: "VESA Adapter" },
  { id: "router_mount", label: "Router Mount" },
  { id: "phone_stand", label: "Phone Stand" },
  { id: "qr_plate", label: "QR Plate" },
  { id: "enclosure_ip65", label: "Enclosure IP65" },
  { id: "cable_clip", label: "Cable Clip" },
  { id: "vesa_shelf", label: "VESA Shelf" },
];

type HoleRow = { x_mm: number; y_mm: number; z_mm: number; d_mm: number; axis: "x" | "y" | "z" };
type CutRow = { cx_mm: number; cy_mm: number; cz_mm: number; sx_mm: number; sy_mm: number; sz_mm: number };

export default function ForgeForm({ onGenerated }: ForgeFormProps) {
  // Estado básico
  const [model, setModel] = useState<string>("cable_tray");
  const [length, setLength] = useState<number>(200);
  const [width, setWidth] = useState<number>(100);
  const [height, setHeight] = useState<number>(60);
  const [thickness, setThickness] = useState<number>(3);

  // Operaciones
  const [roundRadius, setRoundRadius] = useState<number>(0); // fillet simple
  const [holes, setHoles] = useState<HoleRow[]>([]);
  const [cuts, setCuts] = useState<CutRow[]>([]);

  // UX
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usa tu variable EXISTENTE en Vercel (o proxy local)
  const base =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  // Normalizador por si llega “legacy” con guiones (sin usar replaceAll)
  const normalizedModel = useMemo(
    () => model.split("-").join("_"),
    [model]
  );

  function addHole() {
    setHoles((prev) => [
      ...prev,
      { x_mm: 0, y_mm: 0, z_mm: height, d_mm: 5, axis: "z" },
    ]);
  }
  function removeHole(idx: number) {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateHole(idx: number, patch: Partial<HoleRow>) {
    setHoles((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function addCut() {
    setCuts((prev) => [
      ...prev,
      { cx_mm: 0, cy_mm: 0, cz_mm: height / 2, sx_mm: 10, sy_mm: 10, sz_mm: 5 },
    ]);
  }
  function removeCut(idx: number) {
    setCuts((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateCut(idx: number, patch: Partial<CutRow>) {
    setCuts((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        model: normalizedModel,
        params: {
          length_mm: length || undefined,
          width_mm: width || undefined,
          height_mm: height || undefined,
          thickness_mm: thickness || undefined,
        },
        ops: {
          round_radius_mm: roundRadius || 0,
          holes: holes.map((h) => ({
            x_mm: Number(h.x_mm),
            y_mm: Number(h.y_mm),
            z_mm: Number(h.z_mm),
            d_mm: Number(h.d_mm),
            axis: h.axis,
          })),
          cuts: cuts.map((c) => ({
            cx_mm: Number(c.cx_mm),
            cy_mm: Number(c.cy_mm),
            cz_mm: Number(c.cz_mm),
            sx_mm: Number(c.sx_mm),
            sy_mm: Number(c.sy_mm),
            sz_mm: Number(c.sz_mm),
          })),
        },
      };

      const res = await fetch(`${base}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}: ${res.statusText} ${txt}`);
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

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Configuración del modelo
      </h2>

      {/* Selector de modelo */}
      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-1">
          ID backend: <code>{normalizedModel}</code>
        </p>
      </div>

      {/* Parámetros básicos */}
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

      {/* Fillet simple */}
      <div>
        <label className="block text-sm text-neutral-400">
          Fillet / Redondeo (mm)
        </label>
        <input
          type="number"
          value={roundRadius}
          min={0}
          onChange={(e) => setRoundRadius(Number(e.target.value))}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Redondeo sencillo de caja. Para piezas no prismáticas puede no aplicar.
        </p>
      </div>

      {/* Agujeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Agujeros</h3>
          <button
            type="button"
            onClick={addHole}
            className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white"
          >
            + Añadir agujero
          </button>
        </div>
        {holes.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin agujeros.</p>
        ) : (
          <div className="space-y-2">
            {holes.map((h, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-2 items-end bg-neutral-800 p-2 rounded-md"
              >
                <div>
                  <label className="block text-xs text-neutral-400">X</label>
                  <input
                    type="number"
                    value={h.x_mm}
                    onChange={(e) => updateHole(i, { x_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">Y</label>
                  <input
                    type="number"
                    value={h.y_mm}
                    onChange={(e) => updateHole(i, { y_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">Z</label>
                  <input
                    type="number"
                    value={h.z_mm}
                    onChange={(e) => updateHole(i, { z_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">Ø (mm)</label>
                  <input
                    type="number"
                    value={h.d_mm}
                    onChange={(e) => updateHole(i, { d_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">Eje</label>
                  <select
                    value={h.axis}
                    onChange={(e) => updateHole(i, { axis: e.target.value as HoleRow["axis"] })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  >
                    <option value="x">X</option>
                    <option value="y">Y</option>
                    <option value="z">Z</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeHole(i)}
                    className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cortes rectangulares */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Cortes / Ranuras</h3>
          <button
            type="button"
            onClick={addCut}
            className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white"
          >
            + Añadir corte
          </button>
        </div>
        {cuts.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin cortes.</p>
        ) : (
          <div className="space-y-2">
            {cuts.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-7 gap-2 items-end bg-neutral-800 p-2 rounded-md"
              >
                <div>
                  <label className="block text-xs text-neutral-400">CX</label>
                  <input
                    type="number"
                    value={c.cx_mm}
                    onChange={(e) => updateCut(i, { cx_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">CY</label>
                  <input
                    type="number"
                    value={c.cy_mm}
                    onChange={(e) => updateCut(i, { cy_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">CZ</label>
                  <input
                    type="number"
                    value={c.cz_mm}
                    onChange={(e) => updateCut(i, { cz_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">SX</label>
                  <input
                    type="number"
                    value={c.sx_mm}
                    onChange={(e) => updateCut(i, { sx_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">SY</label>
                  <input
                    type="number"
                    value={c.sy_mm}
                    onChange={(e) => updateCut(i, { sy_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400">SZ</label>
                  <input
                    type="number"
                    value={c.sz_mm}
                    onChange={(e) => updateCut(i, { sz_mm: Number(e.target.value) })}
                    className="w-full rounded bg-neutral-900 text-white p-1"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeCut(i)}
                    className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
      >
        {loading ? "Generando..." : "Generar STL"}
      </button>

      {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
    </div>
  );
}
