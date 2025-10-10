"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

// ---------------- Types ----------------
type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

type Hole = { x_mm: number; y_mm: number; d_mm: number };

// Operaciones universales (tipado flexible y tolerante a campos opcionales)
type OpBase = { id: string; type: string; title?: string };
type OpCutout = OpBase & {
  type: "cutout";
  shape: "circle" | "rect";
  x_mm?: number;
  y_mm?: number;
  d_mm?: number; // circle
  w_mm?: number; // rect
  h_mm?: number; // rect
  depth_mm?: number;
};
type OpText = OpBase & {
  type: "text";
  text: string;
  x_mm?: number;
  y_mm?: number;
  size_mm?: number;
  depth_mm?: number;
  engrave?: boolean; // true=grabar, false=añadir
};
type OpRound = OpBase & { type: "round" | "fillet"; r_mm?: number; radius_mm?: number };
type OpChamfer = OpBase & { type: "chamfer"; r_mm?: number; radius_mm?: number };
type OpArray = OpBase & {
  type: "array";
  shape: "circle" | "rect";
  start_x_mm?: number;
  start_y_mm?: number;
  nx?: number;
  ny?: number;
  dx_mm?: number;
  dy_mm?: number;
  d_mm?: number; // circle
  w_mm?: number; // rect
  h_mm?: number; // rect
  depth_mm?: number;
};
type Operation = OpCutout | OpText | OpRound | OpChamfer | OpArray;

type Props = {
  initialModel?: string;
  initialParams?: Params;
  initialHoles?: Hole[];
  onGenerated?: (url: string) => void;
};

const STATIC_MODEL_OPTIONS = [
  { value: "cable_tray", label: "Cable Tray (bandeja)" },
  { value: "vesa_adapter", label: "VESA Adapter" },
  { value: "router_mount", label: "Router Mount (L)" },
  { value: "cable_clip", label: "Cable Clip" },
  { value: "headset_stand", label: "Headset Stand" },
  { value: "phone_dock", label: "Phone Dock (USB-C)" },
  { value: "tablet_stand", label: "Tablet Stand" },
];

function n(v: any, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

// emitir eventos para el visor
function emit<T = any>(name: string, detail?: T) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

// pequeño generador id local
const rid = () => Math.random().toString(36).slice(2, 9);

// --------- UI helpers para operaciones ---------
const NumberInput = ({
  label,
  value,
  onChange,
  step = 0.5,
  min,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) => (
  <label className="text-xs">
    <span className="mb-0.5 block text-neutral-600">{label}</span>
    <input
      type="number"
      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(n(e.target.value, value ?? 0))}
      step={step}
      {...(min !== undefined ? { min } : {})}
    />
  </label>
);

const TextInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="text-xs">
    <span className="mb-0.5 block text-neutral-600">{label}</span>
    <input
      type="text"
      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

export default function ForgeForm({
  initialModel = "cable_tray",
  initialParams,
  initialHoles = [],
  onGenerated,
}: Props) {
  // ✅ Modelo (normalizado a snake_case)
  const [model, setModel] = useState<string>(
    (initialModel || "cable_tray").replace(/-/g, "_")
  );

  // (Opcional) lista de modelos dinámica desde backend /health
  const [modelsFromApi, setModelsFromApi] = useState<string[] | null>(null);
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.models?.length) setModelsFromApi(j.models);
      })
      .catch(() => {});
  }, []);

  const MODEL_OPTIONS = useMemo(() => {
    if (modelsFromApi && modelsFromApi.length) {
      return modelsFromApi.map((m: string) => ({
        value: m,
        label:
          m
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) || m,
      }));
    }
    return STATIC_MODEL_OPTIONS;
  }, [modelsFromApi]);

  // Parámetros base
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Export SVG (láser)
  const [exportSVG, setExportSVG] = useState<boolean>(false);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // 🔹 Operaciones universales
  const [operations, setOperations] = useState<Operation[]>([]);

  // debounce peque para el visor
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEmit = useCallback((fn: () => void, ms = 120) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }, []);

  // Sync modelo al visor
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:refresh", { reason: "model-change" });
  }, [model]);

  // Sync params al visor con debounce
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

  // Handshake inicial
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:set-params", { params });
    emit("forge:set-holes", { holes });
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGenerate = !!API_BASE;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        model: model.replace(/-/g, "_"),
        params,
        holes,
      };

      if (exportSVG) payload.outputs = ["stl", "svg"];
      if (operations.length) {
        // quitamos claves UI como id/title
        payload.operations = operations.map(({ id, title, ...rest }) => rest);
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

  // Helpers holes
  const addHole = () =>
    setHoles((prev) => [...prev, { x_mm: 0, y_mm: 0, d_mm: 5 }]);
  const removeHole = (idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  };

  // -------- Helpers Operaciones ----------
  const addOperation = (kind: Operation["type"]) => {
    const id = rid();
    if (kind === "cutout") {
      setOperations((prev) => [
        ...prev,
        {
          id,
          type: "cutout",
          title: "Cutout",
          shape: "circle",
          x_mm: 10,
          y_mm: 10,
          d_mm: 6,
          depth_mm: 50,
        } as OpCutout,
      ]);
    } else if (kind === "text") {
      setOperations((prev) => [
        ...prev,
        {
          id,
          type: "text",
          title: "Text",
          text: "TEK",
          x_mm: 10,
          y_mm: 10,
          size_mm: 10,
          depth_mm: 1,
          engrave: true,
        } as OpText,
      ]);
    } else if (kind === "round" || kind === "fillet") {
      setOperations((prev) => [
        ...prev,
        { id, type: "round", title: "Round", r_mm: 2 } as OpRound,
      ]);
    } else if (kind === "chamfer") {
      setOperations((prev) => [
        ...prev,
        { id, type: "chamfer", title: "Chamfer", r_mm: 1 } as OpChamfer,
      ]);
    } else if (kind === "array") {
      setOperations((prev) => [
        ...prev,
        {
          id,
          type: "array",
          title: "Array",
          shape: "rect",
          start_x_mm: 10,
          start_y_mm: 10,
          nx: 3,
          ny: 2,
          dx_mm: 15,
          dy_mm: 15,
          w_mm: 6,
          h_mm: 8,
          depth_mm: 80,
        } as OpArray,
      ]);
    }
  };

  const removeOperation = (id: string) =>
    setOperations((prev) => prev.filter((o) => o.id !== id));

  const patchOperation = <K extends keyof Operation>(
    id: string,
    key: K,
    value: any
  ) =>
    setOperations((prev) =>
      prev.map((o) => (o.id === id ? ({ ...o, [key]: value } as Operation) : o))
    );

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
        <NumberInput
          label="Largo (mm)"
          value={length_mm}
          onChange={setLength}
          min={1}
          step={0.5}
        />
        <NumberInput
          label="Ancho (mm)"
          value={width_mm}
          onChange={setWidth}
          min={1}
          step={0.5}
        />
        <NumberInput
          label="Alto (mm)"
          value={height_mm}
          onChange={setHeight}
          min={1}
          step={0.5}
        />
        <NumberInput
          label="Grosor (mm)"
          value={thickness_mm}
          onChange={setThickness}
          min={0.2}
          step={0.2}
        />
        <NumberInput
          label="Fillet (mm)"
          value={fillet_mm}
          onChange={setFillet}
          min={0}
          step={0.5}
        />
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
              <NumberInput
                label="X (mm)"
                value={h.x_mm}
                onChange={(v) =>
                  setHoles((prev) =>
                    prev.map((hh, idx) =>
                      idx === i ? { ...hh, x_mm: v } : hh
                    )
                  )
                }
                min={0}
              />
              <NumberInput
                label="Y (mm)"
                value={h.y_mm}
                onChange={(v) =>
                  setHoles((prev) =>
                    prev.map((hh, idx) =>
                      idx === i ? { ...hh, y_mm: v } : hh
                    )
                  )
                }
                min={0}
              />
              <NumberInput
                label="Ø (mm)"
                value={h.d_mm}
                onChange={(v) =>
                  setHoles((prev) =>
                    prev.map((hh, idx) =>
                      idx === i ? { ...hh, d_mm: v } : hh
                    )
                  )
                }
                min={0.5}
              />
              <button
                type="button"
                className="h-[36px] rounded-md border border-neutral-300 px-2 py-1 text-xs"
                onClick={() => removeHole(i)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Operaciones Universales ---------------- */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Operaciones</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              onClick={() => addOperation("cutout")}
            >
              + Cutout
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              onClick={() => addOperation("text")}
            >
              + Text
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              onClick={() => addOperation("round")}
            >
              + Round
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              onClick={() => addOperation("chamfer")}
            >
              + Chamfer
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              onClick={() => addOperation("array")}
            >
              + Array
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {operations.map((op) => {
            if (op.type === "cutout") {
              const o = op as OpCutout;
              return (
                <div
                  key={op.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Cutout</span>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => removeOperation(op.id)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs">
                      <span className="mb-0.5 block text-neutral-600">
                        Forma
                      </span>
                      <select
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                        value={o.shape}
                        onChange={(e) =>
                          patchOperation(op.id, "shape", e.target.value)
                        }
                      >
                        <option value="circle">Circle</option>
                        <option value="rect">Rect</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <NumberInput
                      label="X (mm)"
                      value={o.x_mm}
                      onChange={(v) => patchOperation(op.id, "x_mm", v)}
                    />
                    <NumberInput
                      label="Y (mm)"
                      value={o.y_mm}
                      onChange={(v) => patchOperation(op.id, "y_mm", v)}
                    />
                    {o.shape === "circle" ? (
                      <NumberInput
                        label="Ø (mm)"
                        value={o.d_mm}
                        onChange={(v) => patchOperation(op.id, "d_mm", v)}
                        min={0.5}
                      />
                    ) : (
                      <>
                        <NumberInput
                          label="Ancho (mm)"
                          value={o.w_mm}
                          onChange={(v) => patchOperation(op.id, "w_mm", v)}
                          min={0.5}
                        />
                        <NumberInput
                          label="Alto (mm)"
                          value={o.h_mm}
                          onChange={(v) => patchOperation(op.id, "h_mm", v)}
                          min={0.5}
                        />
                      </>
                    )}
                    <NumberInput
                      label="Profundidad (mm)"
                      value={o.depth_mm}
                      onChange={(v) => patchOperation(op.id, "depth_mm", v)}
                      min={0.5}
                    />
                  </div>
                </div>
              );
            }

            if (op.type === "text") {
              const o = op as OpText;
              return (
                <div
                  key={op.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Text</span>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => removeOperation(op.id)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <TextInput
                      label="Texto"
                      value={o.text}
                      onChange={(v) => patchOperation(op.id, "text", v)}
                    />
                    <NumberInput
                      label="X (mm)"
                      value={o.x_mm}
                      onChange={(v) => patchOperation(op.id, "x_mm", v)}
                    />
                    <NumberInput
                      label="Y (mm)"
                      value={o.y_mm}
                      onChange={(v) => patchOperation(op.id, "y_mm", v)}
                    />
                    <NumberInput
                      label="Tamaño (mm)"
                      value={o.size_mm}
                      onChange={(v) => patchOperation(op.id, "size_mm", v)}
                      min={1}
                    />
                    <NumberInput
                      label="Profundidad (mm)"
                      value={o.depth_mm}
                      onChange={(v) => patchOperation(op.id, "depth_mm", v)}
                      min={0.1}
                      step={0.1}
                    />
                    <label className="col-span-2 mt-5 inline-flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!o.engrave}
                        onChange={(e) =>
                          patchOperation(op.id, "engrave", e.target.checked)
                        }
                      />
                      Grabar (Quitar material). Si lo desmarcas, añade relieve.
                    </label>
                  </div>
                </div>
              );
            }

            if (op.type === "round" || op.type === "fillet") {
              const o = op as OpRound;
              return (
                <div
                  key={op.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Round (fillet)</span>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => removeOperation(op.id)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <NumberInput
                      label="Radio (mm)"
                      value={o.r_mm ?? o.radius_mm}
                      onChange={(v) => patchOperation(op.id, "r_mm", v)}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Nota: requiere <code>manifold3d</code> en el backend; si no
                    está, se ignora sin romper.
                  </p>
                </div>
              );
            }

            if (op.type === "chamfer") {
              const o = op as OpChamfer;
              return (
                <div
                  key={op.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Chamfer</span>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => removeOperation(op.id)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <NumberInput
                      label="Radio (mm)"
                      value={o.r_mm ?? o.radius_mm}
                      onChange={(v) => patchOperation(op.id, "r_mm", v)}
                      min={0}
                      step={0.5}
                    />
                  </div>
                </div>
              );
            }

            if (op.type === "array") {
              const o = op as OpArray;
              return (
                <div
                  key={op.id}
                  className="rounded-lg border border-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Array</span>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => removeOperation(op.id)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs">
                      <span className="mb-0.5 block text-neutral-600">
                        Forma
                      </span>
                      <select
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                        value={o.shape}
                        onChange={(e) =>
                          patchOperation(op.id, "shape", e.target.value)
                        }
                      >
                        <option value="rect">Rect</option>
                        <option value="circle">Circle</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <NumberInput
                      label="Inicio X (mm)"
                      value={o.start_x_mm}
                      onChange={(v) => patchOperation(op.id, "start_x_mm", v)}
                    />
                    <NumberInput
                      label="Inicio Y (mm)"
                      value={o.start_y_mm}
                      onChange={(v) => patchOperation(op.id, "start_y_mm", v)}
                    />
                    <NumberInput
                      label="Nx"
                      value={o.nx}
                      onChange={(v) =>
                        patchOperation(op.id, "nx", Math.max(1, Math.round(v)))
                      }
                      step={1}
                      min={1}
                    />
                    <NumberInput
                      label="Ny"
                      value={o.ny}
                      onChange={(v) =>
                        patchOperation(op.id, "ny", Math.max(1, Math.round(v)))
                      }
                      step={1}
                      min={1}
                    />
                    <NumberInput
                      label="Paso X (mm)"
                      value={o.dx_mm}
                      onChange={(v) => patchOperation(op.id, "dx_mm", v)}
                    />
                    <NumberInput
                      label="Paso Y (mm)"
                      value={o.dy_mm}
                      onChange={(v) => patchOperation(op.id, "dy_mm", v)}
                    />
                    {o.shape === "circle" ? (
                      <NumberInput
                        label="Ø (mm)"
                        value={o.d_mm}
                        onChange={(v) => patchOperation(op.id, "d_mm", v)}
                        min={0.5}
                      />
                    ) : (
                      <>
                        <NumberInput
                          label="Ancho (mm)"
                          value={o.w_mm}
                          onChange={(v) => patchOperation(op.id, "w_mm", v)}
                          min={0.5}
                        />
                        <NumberInput
                          label="Alto (mm)"
                          value={o.h_mm}
                          onChange={(v) => patchOperation(op.id, "h_mm", v)}
                          min={0.5}
                        />
                      </>
                    )}
                    <NumberInput
                      label="Profundidad (mm)"
                      value={o.depth_mm}
                      onChange={(v) => patchOperation(op.id, "depth_mm", v)}
                      min={0.5}
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex items-center gap-3">
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
      <div className="mt-3 text-sm text-neutral-700">
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
