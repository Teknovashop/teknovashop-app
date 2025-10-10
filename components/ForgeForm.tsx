"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

type Hole = { x_mm: number; y_mm: number; d_mm: number };

type Props = {
  initialModel?: string;
  initialParams?: Params;
  initialHoles?: Hole[];
  onGenerated?: (url: string) => void;
};

const MODEL_OPTIONS = [
  { value: "cable_tray",    label: "Cable Tray (bandeja)" },
  { value: "vesa_adapter",  label: "VESA Adapter" },
  { value: "router_mount",  label: "Router Mount (L)" },
  { value: "cable_clip",    label: "Cable Clip" },
  { value: "headset_stand", label: "Headset Stand" },
  { value: "phone_dock",    label: "Phone Dock (USB-C)" },
  { value: "tablet_stand",  label: "Tablet Stand" },
  // ... (el resto de tus modelos)
];

function n(v: any, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

// helper para emitir eventos
function emit<T = any>(name: string, detail?: T) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

export default function ForgeForm({
  initialModel = "cable_tray",
  initialParams,
  initialHoles = [],
  onGenerated,
}: Props) {
  // ✅ Normalizamos por si entra kebab-case (e.g. "cable-tray")
  const [model, setModel] = useState<string>((initialModel || "cable_tray").replace(/-/g, "_"));

  const [length_mm, setLength] = useState<number>(initialParams?.length_mm ?? 120);
  const [width_mm, setWidth] = useState<number>(initialParams?.width_mm ?? 100);
  const [height_mm, setHeight] = useState<number>(initialParams?.height_mm ?? 60);
  const [thickness_mm, setThickness] = useState<number>(initialParams?.thickness_mm ?? 3);
  const [fillet_mm, setFillet] = useState<number>(initialParams?.fillet_mm ?? 0);

  const [holes, setHoles] = useState<Hole[]>(initialHoles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 NUEVO: pedir SVG (láser) opcional
  const [exportSVG, setExportSVG] = useState<boolean>(false);
  // 🔹 NUEVO: guardar la URL del SVG devuelta por el backend
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // debounce pequeño para no spamear el visor al teclear
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEmit = useCallback((fn: () => void, ms = 120) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }, []);

  // Sincroniza modelo al visor
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:refresh", { reason: "model-change" });
  }, [model]);

  // Sincroniza parámetros al visor con debounce
  useEffect(() => {
    debouncedEmit(() => emit("forge:set-params", { params: { length_mm, width_mm, height_mm, thickness_mm, fillet_mm } }));
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);

  // Parámetros normalizados
  const params: Params = useMemo(() => {
    const p: Params = {
      length_mm: clamp(Number(length_mm) || 0, 1, 5000),
      width_mm: clamp(Number(width_mm) || 0, 1, 5000),
      height_mm: clamp(Number(height_mm) || 0, 1, 5000),
      thickness_mm: clamp(Number(thickness_mm) || 1, 0.2, 100),
      fillet_mm: clamp(Number(fillet_mm) || 0, 0, 200),
    };
    // sincroniza al visor con debounce
    debouncedEmit(() => emit("forge:set-params", { params: p }));
    return p;
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);

  // ---- HANDSHAKE INICIAL (forzamos refresco) ----
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:set-params", { params });
    emit("forge:set-holes", { holes });
    // fuerza al visor a reconstruir nada más cargar
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const canGenerate = !!API_BASE;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      // payload base
      const payload: any = {
        model: model.replace(/-/g, "_"), // ✅ aseguramos snake_case al backend
        params,
        holes,
      };
      // 🔹 NUEVO: si el usuario marca "Export SVG (láser)", pedimos también SVG (retrocompatible)
      if (exportSVG) {
        payload.outputs = ["stl", "svg"];
      }

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error generando STL");
      const url = json?.stl_url as string;
      onGenerated?.(url);
      emit("forge:stl-url", { url });

      // 🔹 NUEVO: si el backend devolvió svg_url, lo guardamos y lo emitimos
      if (json?.svg_url) {
        setSvgUrl(json.svg_url);
        emit("forge:svg-url", { url: json.svg_url });
      } else {
        setSvgUrl(null);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el STL");
    } finally {
      setBusy(false);
    }
  };

  // Helpers UI (añadir/eliminar holes)
  const addHole = () => setHoles((prev) => [...prev, { x_mm: 0, y_mm: 0, d_mm: 5 }]);
  const removeHole = (idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Configurador</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Modelo */}
        <label className="col-span-2 text-sm">
          <span className="mb-1 block text-neutral-600">Modelo</span>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Parámetros */}
        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Largo (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={length_mm}
            onChange={(e) => setLength(n(e.target.value, length_mm))}
            min={1}
            step={0.5}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Ancho (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={width_mm}
            onChange={(e) => setWidth(n(e.target.value, width_mm))}
            min={1}
            step={0.5}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Alto (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={height_mm}
            onChange={(e) => setHeight(n(e.target.value, height_mm))}
            min={1}
            step={0.5}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Grosor (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={thickness_mm}
            onChange={(e) => setThickness(n(e.target.value, thickness_mm))}
            min={0.2}
            step={0.2}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Fillet (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={fillet_mm}
            onChange={(e) => setFillet(n(e.target.value, fillet_mm))}
            min={0}
            step={0.5}
          />
        </label>
      </div>

      {/* Agujeros */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Agujeros</span>
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            onClick={addHole}
          >
            + Añadir
          </button>
        </div>
        <div className="grid gap-2">
          {holes.map((h, i) => (
            <div key={i} className="grid grid-cols-4 items-end gap-2">
              <label className="text-xs">
                <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  value={h.x_mm}
                  onChange={(e) =>
                    setHoles((prev) =>
                      prev.map((hh, idx) => (idx === i ? { ...hh, x_mm: n(e.target.value, hh.x_mm) } : hh))
                    )
                  }
                  min={0}
                  step={0.5}
                />
              </label>
              <label className="text-xs">
                <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  value={h.y_mm}
                  onChange={(e) =>
                    setHoles((prev) =>
                      prev.map((hh, idx) => (idx === i ? { ...hh, y_mm: n(e.target.value, hh.y_mm) } : hh))
                    )
                  }
                  min={0}
                  step={0.5}
                />
              </label>
              <label className="text-xs">
                <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  value={h.d_mm}
                  onChange={(e) =>
                    setHoles((prev) =>
                      prev.map((hh, idx) => (idx === i ? { ...hh, d_mm: n(e.target.value, hh.d_mm) } : hh))
                    )
                  }
                  min={0.5}
                  step={0.5}
                />
              </label>
              <button
                type="button"
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                onClick={() => removeHole(i)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="rounded-md bg-black px-4 py-2 text-white"
          onClick={handleGenerate}
          disabled={busy || !canGenerate}
        >
          {busy ? "Generando…" : "Generar STL"}
        </button>
        {!canGenerate && (
          <span className="text-xs text-neutral-500">
            Configura <code>NEXT_PUBLIC_FORGE_API_URL</code> para generar.
          </span>
        )}
      </div>

      {/* 🔹 NUEVO: toggle Export SVG (láser) */}
      <div className="mt-2 text-sm text-neutral-700">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={exportSVG}
            onChange={(e) => setExportSVG(e.target.checked)}
          />
          Export SVG (láser)
        </label>

        {/* 🔹 NUEVO: enlace visible si el backend devolvió svg_url */}
        {svgUrl && (
          <div className="mt-2">
            <a
              href={svgUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Descargar SVG
            </a>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
