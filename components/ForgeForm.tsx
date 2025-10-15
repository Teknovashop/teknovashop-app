// components/ForgeForm.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MODELS } from "@/data/models";

/**
 * API base: respeta tus variables ya existentes.
 * (sin barras finales duplicadas)
 */
const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

// ---------------- Tipos ----------------
type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

type Hole = { x_mm: number; y_mm: number; d_mm: number };

type OpBase = { id: string; type: "cutout" | "text" | "round" | "array"; title: string };
type OpCutout = OpBase & {
  type: "cutout";
  shape: "circle" | "rect";
  x_mm: number;
  y_mm: number;
  d_mm?: number;        // circle
  w_mm?: number;        // rect
  h_mm?: number;        // rect
  depth_mm?: number;    // profundidad (default passthrough)
};
type OpText = OpBase & {
  type: "text";
  text: string;
  x_mm: number;
  y_mm: number;
  size_mm: number;
  depth_mm: number;
  engrave?: boolean;
};
type OpRound = OpBase & { type: "round"; r_mm: number };
type OpArray = OpBase & {
  type: "array";
  shape: "circle" | "rect";
  start_x_mm: number;
  start_y_mm: number;
  nx: number;
  ny: number;
  dx_mm: number;
  dy_mm: number;
  d_mm?: number;        // circle
  w_mm?: number;        // rect
  h_mm?: number;        // rect
};
type Operation = OpCutout | OpText | OpRound | OpArray;

type Props = {
  /** Identificador del modelo para el backend (snake_case). Si no se pasa, se toma el primero de MODELS. */
  initialModel?: string;
  initialParams?: Params;
  initialHoles?: Hole[];
  onGenerated?: (url: string) => void;
};

// ---------------- Utils ----------------
const n = (v: any, fallback = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const emit = <T,>(name: string, detail?: T) => {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
};
const toSnake = (slug: string) => slug.replace(/-/g, "_");

// ---------------- Componente ----------------
export default function ForgeForm({
  initialModel,
  initialParams,
  initialHoles = [],
  onGenerated,
}: Props) {
  // ▶️ Opciones del selector de modelos: vienen de TU data/models.ts
  const modelOptions = useMemo(
    () =>
      MODELS.map((m) => ({
        value: toSnake(m.slug), // lo que espera el backend
        label: m.name,          // lo que ve el usuario
      })),
    []
  );

  const defaultModel = modelOptions[0]?.value ?? "cable_tray";

  // Estado base
  const [model, setModel] = useState<string>((initialModel || defaultModel).replace(/-/g, "_"));

  const [length_mm, setLength] = useState<number>(initialParams?.length_mm ?? 120);
  const [width_mm, setWidth] = useState<number>(initialParams?.width_mm ?? 100);
  const [height_mm, setHeight] = useState<number>(initialParams?.height_mm ?? 60);
  const [thickness_mm, setThickness] = useState<number>(initialParams?.thickness_mm ?? 3);
  const [fillet_mm, setFillet] = useState<number>(initialParams?.fillet_mm ?? 0);

  const [holes, setHoles] = useState<Hole[]>(initialHoles);

  // Operaciones universales
  const [operations, setOperations] = useState<Operation[]>([]);

  // Exportación SVG opcional
  const [exportSVG, setExportSVG] = useState<boolean>(false);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // debounce para no spamear el visor al teclear
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEmit = useCallback((fn: () => void, ms = 120) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }, []);

  // ---- Sincronización con tu visor actual ----
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:refresh", { reason: "model-change" });
  }, [model]);

  useEffect(() => {
    debouncedEmit(() =>
      emit("forge:set-params", {
        params: { length_mm, width_mm, height_mm, thickness_mm, fillet_mm },
      })
    );
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);

  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:set-params", {
      params: { length_mm, width_mm, height_mm, thickness_mm, fillet_mm },
    });
    emit("forge:set-holes", { holes });
    emit("forge:set-operations", { operations });
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  // Parámetros normalizados
  const params: Params = useMemo(() => {
    const p: Params = {
      length_mm: clamp(Number(length_mm) || 0, 1, 5000),
      width_mm: clamp(Number(width_mm) || 0, 1, 5000),
      height_mm: clamp(Number(height_mm) || 0, 1, 5000),
      thickness_mm: clamp(Number(thickness_mm) || 1, 0.2, 100),
      fillet_mm: clamp(Number(fillet_mm) || 0, 0, 200),
    };
    debouncedEmit(() => emit("forge:set-params", { params: p }));
    return p;
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);

  // ---- Helpers de operaciones (tipado “laxo” para evitar errores de TS con keys) ----
  const addOperation = (kind: Operation["type"]) => {
    const id = Math.random().toString(36).slice(2, 9);
    const base: OpBase = { id, type: kind as any, title: kind.toUpperCase() };
    let op: Operation;
    if (kind === "text") {
      op = { ...base, type: "text", text: "TEK", x_mm: 10, y_mm: 10, size_mm: 10, depth_mm: 1, engrave: true };
    } else if (kind === "round") {
      op = { ...base, type: "round", r_mm: 2 };
    } else if (kind === "array") {
      op = { ...base, type: "array", shape: "rect", start_x_mm: 10, start_y_mm: 10, nx: 3, ny: 2, dx_mm: 20, dy_mm: 20, w_mm: 6, h_mm: 10 };
    } else {
      op = { ...base, type: "cutout", shape: "circle", x_mm: 10, y_mm: 10, d_mm: 6, depth_mm: 9999 } as OpCutout;
    }
    setOperations((prev) => {
      const next = [...prev, op];
      debouncedEmit(() => emit("forge:set-operations", { operations: next }));
      return next;
    });
  };
  const patchOp = (id: string, key: string, value: any) => {
    setOperations((prev) => {
      const next = prev.map((op) => (op.id === id ? ({ ...op, [key]: value } as Operation) : op));
      debouncedEmit(() => emit("forge:set-operations", { operations: next }));
      return next;
    });
  };
  const removeOp = (id: string) => {
    setOperations((prev) => {
      const next = prev.filter((op) => op.id !== id);
      debouncedEmit(() => emit("forge:set-operations", { operations: next }));
      return next;
    });
  };

  // ---- Generar STL (y SVG si procede) ----
  const canGenerate = !!API_BASE;
  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        model,        // ya en snake_case
        params,
        holes,
        operations,
      };
      if (exportSVG) payload.outputs = ["stl", "svg"];

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error generando STL");

      const url = json?.stl_url as string;
      if (url) {
        onGenerated?.(url);
        emit("forge:stl-url", { url });
      }
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

  // ---- Render ----
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Configurador</h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Modelo (usa TODOS los que vienen de data/models.ts) */}
        <label className="col-span-2 text-sm">
          <span className="mb-1 block text-neutral-600">Modelo</span>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {modelOptions.map((o) => (
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
            onClick={() => setHoles((prev) => [...prev, { x_mm: 0, y_mm: 0, d_mm: 5 }])}
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
                onClick={() =>
                  setHoles((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Operaciones universales */}
      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium">Operaciones</span>
          <div className="flex gap-2">
            <button className="rounded-md border px-2 py-1 text-sm" onClick={() => addOperation("cutout")}>+ Cutout</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={() => addOperation("text")}>+ Text</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={() => addOperation("round")}>+ Round</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={() => addOperation("array")}>+ Array</button>
          </div>
        </div>

        <div className="grid gap-3">
          {operations.map((op) => (
            <div key={op.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <select
                  className="rounded-md border bg-white px-2 py-1 text-xs"
                  value={op.type}
                  onChange={(e) => {
                    const t = e.target.value as Operation["type"];
                    // Reemplazo rápido conservando la intención: elimino y vuelvo a crear
                    removeOp(op.id);
                    setTimeout(() => addOperation(t), 0);
                  }}
                >
                  <option value="cutout">cutout</option>
                  <option value="text">text</option>
                  <option value="round">round</option>
                  <option value="array">array</option>
                </select>
                <button className="rounded-md border px-2 py-1 text-xs" onClick={() => removeOp(op.id)}>
                  Quitar
                </button>
              </div>

              {/* Específicos por tipo */}
              {op.type === "round" && (
                <label className="text-xs">
                  <span className="mb-0.5 block text-neutral-600">Radio (mm)</span>
                  <input
                    type="number"
                    className="w-full rounded-md border px-2 py-1 text-sm"
                    value={(op as OpRound).r_mm}
                    onChange={(e) => patchOp(op.id, "r_mm", n(e.target.value, (op as OpRound).r_mm))}
                    min={0}
                    step={0.5}
                  />
                </label>
              )}

              {op.type === "text" && (
                <div className="grid grid-cols-4 gap-2">
                  <label className="col-span-4 text-xs">
                    <span className="mb-0.5 block text-neutral-600">Texto</span>
                    <input
                      type="text"
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpText).text}
                      onChange={(e) => patchOp(op.id, "text", e.target.value)}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpText).x_mm} onChange={(e) => patchOp(op.id, "x_mm", n(e.target.value, (op as OpText).x_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpText).y_mm} onChange={(e) => patchOp(op.id, "y_mm", n(e.target.value, (op as OpText).y_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Size (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpText).size_mm} onChange={(e) => patchOp(op.id, "size_mm", n(e.target.value, (op as OpText).size_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpText).depth_mm} onChange={(e) => patchOp(op.id, "depth_mm", n(e.target.value, (op as OpText).depth_mm))} />
                  </label>
                  <label className="col-span-4 mt-1 inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={(op as OpText).engrave ?? true}
                      onChange={(e) => patchOp(op.id, "engrave", e.target.checked)}
                    />
                    Engrave
                  </label>
                </div>
              )}

              {op.type === "cutout" && (
                <div className="grid grid-cols-6 gap-2">
                  <label className="text-xs col-span-2">
                    <span className="mb-0.5 block text-neutral-600">Shape</span>
                    <select
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                      value={(op as OpCutout).shape}
                      onChange={(e) => patchOp(op.id, "shape", e.target.value)}
                    >
                      <option value="circle">circle</option>
                      <option value="rect">rect</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpCutout).x_mm} onChange={(e) => patchOp(op.id, "x_mm", n(e.target.value, (op as OpCutout).x_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpCutout).y_mm} onChange={(e) => patchOp(op.id, "y_mm", n(e.target.value, (op as OpCutout).y_mm))} />
                  </label>

                  {(op as OpCutout).shape === "circle" ? (
                    <label className="text-xs">
                      <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                      <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                        value={(op as OpCutout).d_mm ?? 6}
                        onChange={(e) => patchOp(op.id, "d_mm", n(e.target.value, (op as OpCutout).d_mm ?? 6))} />
                    </label>
                  ) : (
                    <>
                      <label className="text-xs">
                        <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                        <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                          value={(op as OpCutout).w_mm ?? 6}
                          onChange={(e) => patchOp(op.id, "w_mm", n(e.target.value, (op as OpCutout).w_mm ?? 6))} />
                      </label>
                      <label className="text-xs">
                        <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                        <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                          value={(op as OpCutout).h_mm ?? 10}
                          onChange={(e) => patchOp(op.id, "h_mm", n(e.target.value, (op as OpCutout).h_mm ?? 10))} />
                      </label>
                    </>
                  )}

                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpCutout).depth_mm ?? 9999}
                      onChange={(e) => patchOp(op.id, "depth_mm", n(e.target.value, (op as OpCutout).depth_mm ?? 9999))} />
                  </label>
                </div>
              )}

              {op.type === "array" && (
                <div className="grid grid-cols-8 gap-2">
                  <label className="text-xs col-span-2">
                    <span className="mb-0.5 block text-neutral-600">Shape</span>
                    <select
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                      value={(op as OpArray).shape}
                      onChange={(e) => patchOp(op.id, "shape", e.target.value)}
                    >
                      <option value="circle">circle</option>
                      <option value="rect">rect</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Start X</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).start_x_mm}
                      onChange={(e) => patchOp(op.id, "start_x_mm", n(e.target.value, (op as OpArray).start_x_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Start Y</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).start_y_mm}
                      onChange={(e) => patchOp(op.id, "start_y_mm", n(e.target.value, (op as OpArray).start_y_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">nx</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).nx}
                      onChange={(e) => patchOp(op.id, "nx", n(e.target.value, (op as OpArray).nx))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">ny</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).ny}
                      onChange={(e) => patchOp(op.id, "ny", n(e.target.value, (op as OpArray).ny))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">dx (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).dx_mm}
                      onChange={(e) => patchOp(op.id, "dx_mm", n(e.target.value, (op as OpArray).dx_mm))} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">dy (mm)</span>
                    <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                      value={(op as OpArray).dy_mm}
                      onChange={(e) => patchOp(op.id, "dy_mm", n(e.target.value, (op as OpArray).dy_mm))} />
                  </label>

                  {(op as OpArray).shape === "circle" ? (
                    <label className="text-xs">
                      <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                      <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                        value={(op as OpArray).d_mm ?? 6}
                        onChange={(e) => patchOp(op.id, "d_mm", n(e.target.value, (op as OpArray).d_mm ?? 6))} />
                    </label>
                  ) : (
                    <>
                      <label className="text-xs">
                        <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                        <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                          value={(op as OpArray).w_mm ?? 6}
                          onChange={(e) => patchOp(op.id, "w_mm", n(e.target.value, (op as OpArray).w_mm ?? 6))} />
                      </label>
                      <label className="text-xs">
                        <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                        <input type="number" className="w-full rounded-md border px-2 py-1 text-sm"
                          value={(op as OpArray).h_mm ?? 10}
                          onChange={(e) => patchOp(op.id, "h_mm", n(e.target.value, (op as OpArray).h_mm ?? 10))} />
                      </label>
                    </>
                  )}
                </div>
              )}
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

      {/* Export SVG + enlace si existe */}
      <div className="mt-2 text-sm text-neutral-700">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={exportSVG}
            onChange={(e) => setExportSVG(e.target.checked)}
          />
          Export SVG (láser)
        </label>
        {svgUrl && (
          <div className="mt-2">
            <a href={svgUrl} target="_blank" rel="noreferrer" className="underline">
              Descargar SVG
            </a>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
