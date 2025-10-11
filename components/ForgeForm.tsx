"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

/* =========================
      Tipos
========================= */

type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

type Hole = { x_mm: number; y_mm: number; d_mm: number };

// 🔹 Definimos un Operation flexible que cubra todas las herramientas comunes
type OperationType = "cutout" | "text" | "round" | "array" | "chamfer";
type CutoutShape = "circle" | "rect" | "polygon";

type Operation = {
  id: string;
  type: OperationType;
  title?: string;

  // Posición/medidas comunes
  x_mm?: number;
  y_mm?: number;
  z_mm?: number;
  depth_mm?: number;
  size_mm?: number;

  // cutout
  shape?: CutoutShape;
  d_mm?: number;
  w_mm?: number;
  h_mm?: number;
  r_mm?: number;

  // text
  text?: string;
  font?: string;
  engrave?: boolean;

  // array
  start_x_mm?: number;
  start_y_mm?: number;
  nx?: number;
  ny?: number;
  dx_mm?: number;
  dy_mm?: number;
};

type Props = {
  initialModel?: string;
  initialParams?: Params;
  initialHoles?: Hole[];
  initialOperations?: Operation[];
  onGenerated?: (url: string) => void;
};

/* =========================
      Modelos
========================= */

const MODEL_OPTIONS = [
  { value: "cable_tray", label: "Cable Tray (bandeja)" },
  { value: "vesa_adapter", label: "VESA Adapter" },
  { value: "router_mount", label: "Router Mount (L)" },
  { value: "cable_clip", label: "Cable Clip" },
  { value: "headset_stand", label: "Headset Stand" },
  { value: "phone_dock", label: "Phone Dock (USB-C)" },
  { value: "tablet_stand", label: "Tablet Stand" },
  // añade aquí más opciones si quieres mostrarlas estáticas
];

/* =========================
      Helpers
========================= */

function n(v: any, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

// emitir eventos al visor
function emit<T = any>(name: string, detail?: T) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

// ids simples para operaciones
const rid = () => Math.random().toString(36).slice(2);

/* =========================
      Componente
========================= */

export default function ForgeForm({
  initialModel = "cable_tray",
  initialParams,
  initialHoles = [],
  initialOperations = [],
  onGenerated,
}: Props) {
  // ✅ Normalizamos por si entra kebab-case (e.g. "cable-tray")
  const [model, setModel] = useState<string>(
    (initialModel || "cable_tray").replace(/-/g, "_")
  );

  const [length_mm, setLength] = useState<number>(
    initialParams?.length_mm ?? 120
  );
  const [width_mm, setWidth] = useState<number>(
    initialParams?.width_mm ?? 100
  );
  const [height_mm, setHeight] = useState<number>(
    initialParams?.height_mm ?? 60
  );
  const [thickness_mm, setThickness] = useState<number>(
    initialParams?.thickness_mm ?? 3
  );
  const [fillet_mm, setFillet] = useState<number>(
    initialParams?.fillet_mm ?? 0
  );

  const [holes, setHoles] = useState<Hole[]>(initialHoles);

  // 🔹 Estado de Operaciones
  const [operations, setOperations] = useState<Operation[]>(
    initialOperations.length
      ? initialOperations
      : [
          // ejemplo vacío por defecto (puedes dejarlo [])
        ]
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Export SVG opcional
  const [exportSVG, setExportSVG] = useState<boolean>(false);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // debounce pequeño
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
    debouncedEmit(() =>
      emit("forge:set-params", {
        params: { length_mm, width_mm, height_mm, thickness_mm, fillet_mm },
      })
    );
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
    debouncedEmit(() => emit("forge:set-params", { params: p }));
    return p;
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);

  // ---- HANDSHAKE INICIAL ----
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:set-params", { params });
    emit("forge:set-holes", { holes });
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const canGenerate = !!API_BASE;

  // ====== Operaciones: helpers ======

  const addOperation = (kind: OperationType) => {
    const base: Operation = { id: rid(), type: kind, title: kind.toUpperCase() };
    // inicializamos campos típicos por tipo
    if (kind === "cutout") {
      Object.assign(base, {
        shape: "circle" as CutoutShape,
        x_mm: 10,
        y_mm: 10,
        d_mm: 6,
        depth_mm: 5,
      });
    } else if (kind === "text") {
      Object.assign(base, {
        text: "TEK",
        x_mm: 10,
        y_mm: 10,
        size_mm: 10,
        depth_mm: 1,
        engrave: true,
        font: "sans",
      });
    } else if (kind === "round") {
      Object.assign(base, { r_mm: 2 });
    } else if (kind === "chamfer") {
      Object.assign(base, { r_mm: 1 });
    } else if (kind === "array") {
      Object.assign(base, {
        shape: "rect",
        start_x_mm: 10,
        start_y_mm: 10,
        nx: 3,
        ny: 2,
        dx_mm: 15,
        dy_mm: 15,
        w_mm: 6,
        h_mm: 10,
        depth_mm: 3,
      });
    }
    setOperations((prev) => [base, ...prev]);
  };

  const removeOperation = (id: string) =>
    setOperations((prev) => prev.filter((op) => op.id !== id));

  // 🔧 Parche genérico — admite cualquier key de Operation (incluye `shape`)
  function patchOperation<K extends keyof Operation>(
    id: string,
    key: K,
    value: Operation[K]
  ) {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, [key]: value } : op))
    );
  }

  // ====== Generar ======

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        model: model.replace(/-/g, "_"), // snake_case al backend
        params,
        holes,
      };

      // Incluir operations si hay
      if (operations.length) {
        // limpiamos títulos para no mandar UI-only
        const cleanOps = operations.map(({ title, ...rest }) => rest);
        payload.operations = cleanOps;
      }

      // pedir también SVG si se marca
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
  const addHole = () =>
    setHoles((prev) => [...prev, { x_mm: 0, y_mm: 0, d_mm: 5 }]);
  const removeHole = (idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* =========================
        Render
  ========================= */

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
                      prev.map((hh, idx) =>
                        idx === i ? { ...hh, x_mm: n(e.target.value, hh.x_mm) } : hh
                      )
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
                      prev.map((hh, idx) =>
                        idx === i ? { ...hh, y_mm: n(e.target.value, hh.y_mm) } : hh
                      )
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
                      prev.map((hh, idx) =>
                        idx === i ? { ...hh, d_mm: n(e.target.value, hh.d_mm) } : hh
                      )
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

      {/* =========================
            Operaciones (Pro)
      ========================= */}
      <div className="mt-6 rounded-xl border border-neutral-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Operaciones</span>
          <div className="flex gap-2">
            <button
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => addOperation("cutout")}
            >
              + Cutout
            </button>
            <button
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => addOperation("text")}
            >
              + Text
            </button>
            <button
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => addOperation("round")}
            >
              + Round
            </button>
            <button
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => addOperation("array")}
            >
              + Array
            </button>
          </div>
        </div>

        {operations.length === 0 && (
          <p className="text-xs text-neutral-500">
            No hay operaciones. Añade una con los botones de arriba.
          </p>
        )}

        <div className="grid gap-3">
          {operations.map((op) => (
            <div key={op.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border px-2 py-1 text-xs"
                    value={op.type}
                    onChange={(e) =>
                      patchOperation(op.id, "type", e.target.value as OperationType)
                    }
                  >
                    <option value="cutout">cutout</option>
                    <option value="text">text</option>
                    <option value="round">round</option>
                    <option value="array">array</option>
                    <option value="chamfer">chamfer</option>
                  </select>
                  <input
                    className="w-52 rounded-md border px-2 py-1 text-xs"
                    placeholder="Título (opcional)"
                    value={op.title || ""}
                    onChange={(e) => patchOperation(op.id, "title", e.target.value)}
                  />
                </div>

                <button
                  className="rounded-md border px-2 py-1 text-xs"
                  onClick={() => removeOperation(op.id)}
                >
                  Quitar
                </button>
              </div>

              {/* Campos por tipo */}
              {op.type === "cutout" && (
                <div className="grid grid-cols-6 gap-2 text-xs">
                  <label className="col-span-2">
                    <span className="mb-0.5 block text-neutral-600">Forma</span>
                    <select
                      className="w-full rounded-md border px-2 py-1"
                      value={op.shape || "circle"}
                      onChange={(e) =>
                        patchOperation(op.id, "shape", e.target.value as CutoutShape)
                      }
                    >
                      <option value="circle">circle</option>
                      <option value="rect">rect</option>
                      <option value="polygon">polygon</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.x_mm ?? 0}
                      onChange={(e) =>
                        patchOperation(op.id, "x_mm", n(e.target.value, op.x_mm ?? 0))
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.y_mm ?? 0}
                      onChange={(e) =>
                        patchOperation(op.id, "y_mm", n(e.target.value, op.y_mm ?? 0))
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.depth_mm ?? 1}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "depth_mm",
                          n(e.target.value, op.depth_mm ?? 1)
                        )
                      }
                      step={0.5}
                    />
                  </label>

                  {/* Dimensiones según forma */}
                  {op.shape === "circle" && (
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1"
                        value={op.d_mm ?? 6}
                        onChange={(e) =>
                          patchOperation(op.id, "d_mm", n(e.target.value, op.d_mm ?? 6))
                        }
                        step={0.5}
                      />
                    </label>
                  )}

                  {op.shape === "rect" && (
                    <>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1"
                          value={op.w_mm ?? 6}
                          onChange={(e) =>
                            patchOperation(
                              op.id,
                              "w_mm",
                              n(e.target.value, op.w_mm ?? 6)
                            )
                          }
                          step={0.5}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1"
                          value={op.h_mm ?? 6}
                          onChange={(e) =>
                            patchOperation(
                              op.id,
                              "h_mm",
                              n(e.target.value, op.h_mm ?? 6)
                            )
                          }
                          step={0.5}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">
                          Esquinas R (mm)
                        </span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1"
                          value={op.r_mm ?? 0}
                          onChange={(e) =>
                            patchOperation(
                              op.id,
                              "r_mm",
                              n(e.target.value, op.r_mm ?? 0)
                            )
                          }
                          step={0.5}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {op.type === "text" && (
                <div className="grid grid-cols-6 gap-2 text-xs">
                  <label className="col-span-3">
                    <span className="mb-0.5 block text-neutral-600">Texto</span>
                    <input
                      className="w-full rounded-md border px-2 py-1"
                      value={op.text || ""}
                      onChange={(e) => patchOperation(op.id, "text", e.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.x_mm ?? 0}
                      onChange={(e) =>
                        patchOperation(op.id, "x_mm", n(e.target.value, op.x_mm ?? 0))
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.y_mm ?? 0}
                      onChange={(e) =>
                        patchOperation(op.id, "y_mm", n(e.target.value, op.y_mm ?? 0))
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Size (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.size_mm ?? 10}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "size_mm",
                          n(e.target.value, op.size_mm ?? 10)
                        )
                      }
                      step={0.5}
                    />
                  </label>

                  <label>
                    <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.depth_mm ?? 1}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "depth_mm",
                          n(e.target.value, op.depth_mm ?? 1)
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label className="col-span-2 mt-[22px] inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!op.engrave}
                      onChange={(e) => patchOperation(op.id, "engrave", e.target.checked)}
                    />
                    <span>Engrave</span>
                  </label>
                </div>
              )}

              {(op.type === "round" || op.type === "chamfer") && (
                <div className="grid grid-cols-6 gap-2 text-xs">
                  <label className="col-span-2">
                    <span className="mb-0.5 block text-neutral-600">
                      {op.type === "round" ? "Radio (mm)" : "Chaflán (mm)"}
                    </span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.r_mm ?? 1}
                      onChange={(e) =>
                        patchOperation(op.id, "r_mm", n(e.target.value, op.r_mm ?? 1))
                      }
                      step={0.5}
                    />
                  </label>
                </div>
              )}

              {op.type === "array" && (
                <div className="grid grid-cols-6 gap-2 text-xs">
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Forma</span>
                    <select
                      className="w-full rounded-md border px-2 py-1"
                      value={op.shape || "rect"}
                      onChange={(e) =>
                        patchOperation(op.id, "shape", e.target.value as CutoutShape)
                      }
                    >
                      <option value="rect">rect</option>
                      <option value="circle">circle</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Start X</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.start_x_mm ?? 10}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "start_x_mm",
                          n(e.target.value, op.start_x_mm ?? 10)
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Start Y</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.start_y_mm ?? 10}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "start_y_mm",
                          n(e.target.value, op.start_y_mm ?? 10)
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">nx</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.nx ?? 3}
                      onChange={(e) =>
                        patchOperation(op.id, "nx", n(e.target.value, op.nx ?? 3))
                      }
                      step={1}
                      min={1}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">ny</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.ny ?? 2}
                      onChange={(e) =>
                        patchOperation(op.id, "ny", n(e.target.value, op.ny ?? 2))
                      }
                      step={1}
                      min={1}
                    />
                  </label>

                  <label>
                    <span className="mb-0.5 block text-neutral-600">dx (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.dx_mm ?? 15}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "dx_mm",
                          n(e.target.value, op.dx_mm ?? 15)
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">dy (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.dy_mm ?? 15}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "dy_mm",
                          n(e.target.value, op.dy_mm ?? 15)
                        )
                      }
                      step={0.5}
                    />
                  </label>

                  {/* Dimensiones de cada instancia */}
                  {op.shape === "rect" ? (
                    <>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1"
                          value={op.w_mm ?? 6}
                          onChange={(e) =>
                            patchOperation(
                              op.id,
                              "w_mm",
                              n(e.target.value, op.w_mm ?? 6)
                            )
                          }
                          step={0.5}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1"
                          value={op.h_mm ?? 10}
                          onChange={(e) =>
                            patchOperation(
                              op.id,
                              "h_mm",
                              n(e.target.value, op.h_mm ?? 10)
                            )
                          }
                          step={0.5}
                        />
                      </label>
                    </>
                  ) : (
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1"
                        value={op.d_mm ?? 6}
                        onChange={(e) =>
                          patchOperation(
                            op.id,
                            "d_mm",
                            n(e.target.value, op.d_mm ?? 6)
                          )
                        }
                        step={0.5}
                      />
                    </label>
                  )}

                  <label>
                    <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1"
                      value={op.depth_mm ?? 3}
                      onChange={(e) =>
                        patchOperation(
                          op.id,
                          "depth_mm",
                          n(e.target.value, op.depth_mm ?? 3)
                        )
                      }
                      step={0.5}
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Acciones principales */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
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

        {/* Export SVG (láser) */}
        <div className="flex items-center gap-4 text-sm text-neutral-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={exportSVG}
              onChange={(e) => setExportSVG(e.target.checked)}
            />
            Export SVG (láser)
          </label>

          {svgUrl && (
            <a
              href={svgUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Descargar SVG
            </a>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
