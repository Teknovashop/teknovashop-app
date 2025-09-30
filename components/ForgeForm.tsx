"use client";

import { useMemo, useState } from "react";

type Hole = {
  id: string;
  x_mm: number;  // posición X en la cara superior (plano XY)
  y_mm: number;  // posición Y en la cara superior (plano XY)
  d_mm: number;  // diámetro
  through: boolean; // siempre true (agujero pasante)
  axis: "z";     // eje por el que atraviesa
};

type ForgeFormProps = {
  onGenerated?: (url: string) => void;
};

export default function ForgeForm({ onGenerated }: ForgeFormProps) {
  // Modelo seleccionado
  const [model, setModel] = useState<"cable-tray" | "vesa-adapter" | "router-mount">("cable-tray");

  // Dimensiones base
  const [length, setLength] = useState(200);   // largo X
  const [width, setWidth]   = useState(100);   // ancho Y
  const [height, setHeight] = useState(60);    // alto Z
  const [thickness, setThickness] = useState(3);

  // Post-procesos
  const [fillet, setFillet] = useState(0);     // chaflán/redondeo general (mm) – lo enviamos si >0

  // Agujeros
  const [holes, setHoles] = useState<Hole[]>([]);

  // Estado red
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // URL del STL generado (para botón Descargar)
  const [stlUrl, setStlUrl]   = useState<string | null>(null);

  // Base de API (Vercel proxy o tu BACKEND_URL)
  const base = useMemo(() => {
    const b = (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "/forge-api";
    return b.replace(/\/+$/, ""); // sin slash final
  }, []);

  function addHole() {
    setHoles(prev => ([
      ...prev,
      { id: crypto.randomUUID(), x_mm: 10, y_mm: 10, d_mm: 4, through: true, axis: "z" }
    ]));
  }

  function updateHole(id: string, patch: Partial<Hole>) {
    setHoles(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
  }

  function removeHole(id: string) {
    setHoles(prev => prev.filter(h => h.id !== id));
  }

  async function handleGenerate(options?: { downloadAfter?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        model,
        params: {
          length_mm: length,
          width_mm: width,
          height_mm: height,
          thickness_mm: thickness,
        },
        // Operaciones opcionales que el backend puede aplicar si las soporta
        ops: {
          holes: holes.map(({ x_mm, y_mm, d_mm, through, axis }) => ({
            x_mm, y_mm, d_mm, through, axis
          })),
          fillet_mm: fillet > 0 ? fillet : undefined,
        },
      };

      const res = await fetch(`${base}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data?.stl_url) throw new Error("Respuesta sin stl_url");

      setStlUrl(data.stl_url);
      onGenerated?.(data.stl_url);

      // Descarga inmediata (si viene del botón Descargar)
      if (options?.downloadAfter) {
        await downloadByUrl(data.stl_url);
      }
    } catch (err: any) {
      console.error("Error generando STL", err);
      setError(err?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!stlUrl) {
      // si aún no hay STL, lo generamos y descargamos al terminar:
      await handleGenerate({ downloadAfter: true });
    } else {
      await downloadByUrl(stlUrl);
    }
  }

  async function downloadByUrl(url: string) {
    try {
      // Mejor manera (Content-Type y tamaño correctos):
      const r = await fetch(url, { credentials: "omit" });
      if (!r.ok) throw new Error(`No se pudo descargar el STL (${r.status})`);
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      // Nombre sugerido (tú puedes inyectar uno desde el backend si prefieres):
      a.download = `${model}-${length}x${width}x${height}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Fallo al descargar:", e);
      alert("No se pudo descargar el STL.");
    }
  }

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-white">Configuración del modelo</h2>

      {/* Selección de modelo */}
      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as any)}
          className="w-full rounded-md bg-neutral-800 text-white p-2"
        >
          <option value="cable-tray">Cable Tray</option>
          <option value="vesa-adapter">VESA Adapter</option>
          <option value="router-mount">Router Mount</option>
          {/* Más modelos llegarán aquí — solo tenemos que exponerlos cuando el backend los soporte */}
        </select>
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Largo X (mm)</label>
          <input
            type="number"
            value={length}
            min={1}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Ancho Y (mm)</label>
          <input
            type="number"
            value={width}
            min={1}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Alto Z (mm)</label>
          <input
            type="number"
            value={height}
            min={1}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400">Grosor (mm)</label>
          <input
            type="number"
            value={thickness}
            min={1}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
      </div>

      {/* Post-proceso simple */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-400">Redondeo/Chaflán (mm)</label>
          <input
            type="number"
            value={fillet}
            min={0}
            onChange={(e) => setFillet(Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800 text-white p-2"
          />
        </div>
      </div>

      {/* Agujeros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-200">Agujeros (cara superior, pasantes)</h3>
          <button
            type="button"
            onClick={addHole}
            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded"
          >
            + Añadir agujero
          </button>
        </div>

        {holes.length === 0 && (
          <div className="text-neutral-400 text-xs">No hay agujeros definidos.</div>
        )}

        {holes.map((h) => (
          <div key={h.id} className="grid grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-xs text-neutral-400">X (mm)</label>
              <input
                type="number"
                value={h.x_mm}
                onChange={(e) => updateHole(h.id, { x_mm: Number(e.target.value) })}
                className="w-full rounded-md bg-neutral-800 text-white p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400">Y (mm)</label>
              <input
                type="number"
                value={h.y_mm}
                onChange={(e) => updateHole(h.id, { y_mm: Number(e.target.value) })}
                className="w-full rounded-md bg-neutral-800 text-white p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400">Ø (mm)</label>
              <input
                type="number"
                value={h.d_mm}
                min={1}
                onChange={(e) => updateHole(h.id, { d_mm: Number(e.target.value) })}
                className="w-full rounded-md bg-neutral-800 text-white p-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => removeHole(h.id)}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-2 rounded w-full"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={() => handleGenerate()}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? "Generando..." : "Generar STL"}
        </button>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg"
          title="Descarga el STL (si no existe, lo genera primero)"
        >
          Descargar STL
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mt-2">Error: {error}</div>}
    </div>
  );
}
