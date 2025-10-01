"use client";

import { useCallback, useMemo, useState } from "react";

type Hole = { x_mm: number; y_mm: number; d_mm: number };

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
};

type ModelKey =
  | "cable_tray"
  | "vesa_adapter"
  | "router_mount";
// añade aquí más claves cuando sumemos modelos

const MODEL_LABELS: Record<ModelKey, string> = {
  cable_tray: "Cable Tray",
  vesa_adapter: "VESA Adapter",
  router_mount: "Router Mount",
};

export default function ForgeForm({ onGenerated }: ForgeFormProps) {
  // modelo seleccionado
  const [model, setModel] = useState<ModelKey>("cable_tray");

  // parámetros geométricos
  const [lenX, setLenX] = useState(200);
  const [widY, setWidY] = useState(100);
  const [heiZ, setHeiZ] = useState(60);
  const [thk, setThk] = useState(3);

  // opcional: redondeo/chaflán
  const [fillet, setFillet] = useState<number>(0);

  // agujeros
  const [holes, setHoles] = useState<Hole[]>([{ x_mm: 10, y_mm: 10, d_mm: 4 }]);

  // URL resultante
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // estado UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Base de API
  const base =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";

  const normalizedModel = useMemo(() => model, [model]); // ya usamos guiones_bajos

  const handleAddHole = useCallback(() => {
    setHoles((prev) => [...prev, { x_mm: 10, y_mm: 10, d_mm: 4 }]);
  }, []);

  const handleRemoveHole = useCallback((idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleChangeHole = useCallback((idx: number, patch: Partial<Hole>) => {
    setHoles((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }, []);

  async function generate(kind: "preview" | "download") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: normalizedModel,
          params: {
            length_mm: Number(lenX),
            width_mm: Number(widY),
            height_mm: Number(heiZ),
            thickness_mm: Number(thk),
            fillet_mm: Number(fillet) || 0,
          },
          holes: holes.map((h) => ({
            x_mm: Number(h.x_mm),
            y_mm: Number(h.y_mm),
            d_mm: Number(h.d_mm),
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const url: string = data?.stl_url;
      if (!url) throw new Error("Respuesta sin stl_url");

      setStlUrl(url);
      onGenerated?.(url);

      if (kind === "download") {
        // slug seguro sin replaceAll (TS friendly)
        const modelSlug = String(normalizedModel).replace(/_/g, "-");
        const fileName = `${modelSlug}-${lenX}x${widY}x${heiZ}.stl`;

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName; // si el backend define Content-Disposition, prevalece ese nombre
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

  const disabled = loading;

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Configuración del modelo
      </h2>

      {/* selector de modelo */}
      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as ModelKey)}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
        >
          {Object.entries(MODEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* dimensiones */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Largo X (mm)</label>
          <input
            type="number"
            value={lenX}
            onChange={(e) => setLenX(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Ancho Y (mm)</label>
          <input
            type="number"
            value={widY}
            onChange={(e) => setWidY(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Alto Z (mm)</label>
          <input
            type="number"
            value={heiZ}
            onChange={(e) => setHeiZ(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Grosor (mm)</label>
          <input
            type="number"
            value={thk}
            onChange={(e) => setThk(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
      </div>

      {/* redondeo/chaflán */}
      <div>
        <label className="block text-sm text-neutral-400">
          Redondeo/Chaflán (mm)
        </label>
        <input
          type="number"
          value={fillet}
          onChange={(e) => setFillet(Number(e.target.value))}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
          placeholder="0 = sin redondeo"
        />
      </div>

      {/* agujeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-400">
            Agujeros (cara superior, pasantes)
          </span>
          <button
            type="button"
            onClick={() =>
              setHoles((prev) => [...prev, { x_mm: 10, y_mm: 10, d_mm: 4 }])
            }
            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded-md"
          >
            + Añadir agujero
          </button>
        </div>

        {holes.map((h, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-2 items-center">
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400">X (mm)</label>
              <input
                type="number"
                value={h.x_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) =>
                      i === idx ? { ...hh, x_mm: Number(e.target.value) } : hh
                    )
                  )
                }
                className="w-full rounded-md bg-neutral-800 text-white p-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400">Y (mm)</label>
              <input
                type="number"
                value={h.y_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) =>
                      i === idx ? { ...hh, y_mm: Number(e.target.value) } : hh
                    )
                  )
                }
                className="w-full rounded-md bg-neutral-800 text-white p-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400">Ø (mm)</label>
              <input
                type="number"
                value={h.d_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) =>
                      i === idx ? { ...hh, d_mm: Number(e.target.value) } : hh
                    )
                  )
                }
                className="w-full rounded-md bg-neutral-800 text-white p-2"
              />
            </div>
            <div className="col-span-1 flex">
              <button
                type="button"
                onClick={() =>
                  setHoles((prev) => prev.filter((_, i) => i !== idx))
                }
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm px-2 rounded-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* acciones */}
      <div className="flex gap-3">
        <button
          onClick={() => generate("preview")}
          disabled={disabled}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Generar STL"}
        </button>

        <button
          onClick={() => generate("download")}
          disabled={disabled}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg"
        >
          Descargar STL
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}

      {/* stlUrl actual: {stlUrl ?? "—"} */}
    </div>
  );
}
