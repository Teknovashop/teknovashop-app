// components/ForgeForm.tsx
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

/** Operaciones universales */
type OpBase = { id: string; type: "cutout" | "text" | "round" | "array"; title?: string };
type OpCutout = OpBase & {
  type: "cutout";
  shape: "circle" | "rect";
  x_mm: number;
  y_mm: number;
  /** circle */
  d_mm?: number;
  /** rect */
  w_mm?: number;
  h_mm?: number;
  /** profundidad (penetra) */
  depth_mm: number;
};
type OpText = OpBase & {
  type: "text";
  text: string;
  x_mm: number;
  y_mm: number;
  size_mm: number;
  depth_mm: number;
  engrave?: boolean;
  force?: boolean;
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
  d_mm?: number;
  w_mm?: number;
  h_mm?: number;
};
type Operation = OpCutout | OpText | OpRound | OpArray;

type Hole = { x_mm: number; y_mm: number; d_mm: number };

type Props = {
  initialModel?: string;
  initialParams?: Params;
  initialHoles?: Hole[];
  onGenerated?: (url: string) => void;
};

const STATIC_MODELS = [
  { value: "cable_tray",    label: "Cable Tray (bandeja)" },
  { value: "vesa_adapter",  label: "VESA Adapter" },
  { value: "router_mount",  label: "Router Mount (L)" },
  { value: "cable_clip",    label: "Cable Clip" },
  { value: "headset_stand", label: "Headset Stand" },
  { value: "phone_dock",    label: "Phone Dock (USB-C)" },
  { value: "tablet_stand",  label: "Tablet Stand" },
];

function n(v: any, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}
function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}
function emit<T = any>(name: string, detail?: T) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ForgeForm({
  initialModel = "vesa_adapter",
  initialParams,
  initialHoles = [],
  onGenerated,
}: Props) {
  const [model, setModel] = useState<string>((initialModel || "vesa_adapter").replace(/-/g, "_"));
  const [length_mm, setLength] = useState<number>(initialParams?.length_mm ?? 120);
  const [width_mm, setWidth] = useState<number>(initialParams?.width_mm ?? 100);
  const [height_mm, setHeight] = useState<number>(initialParams?.height_mm ?? 60);
  const [thickness_mm, setThickness] = useState<number>(initialParams?.thickness_mm ?? 3);
  const [fillet_mm, setFillet] = useState<number>(initialParams?.fillet_mm ?? 0);

  const [holes, setHoles] = useState<Hole[]>(initialHoles);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exportSVG, setExportSVG] = useState<boolean>(false);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // Debounce para no saturar el visor
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEmit = useCallback((fn: () => void, ms = 120) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }, []);

  // Sincroniza modelo/params/holes/ops al visor
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:refresh", { reason: "model-change" });
  }, [model]);
  useEffect(() => {
    debouncedEmit(() =>
      emit("forge:set-params", { params: { length_mm, width_mm, height_mm, thickness_mm, fillet_mm } })
    );
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, debouncedEmit]);
  useEffect(() => {
    debouncedEmit(() => emit("forge:set-holes", { holes }));
  }, [holes, debouncedEmit]);
  useEffect(() => {
    debouncedEmit(() => emit("forge:set-operations", { operations }));
  }, [operations, debouncedEmit]);

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
    emit("forge:set-operations", { operations });
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGenerate = !!API_BASE;

  /** --------- helpers operaciones ---------- */
  const addCutout = () =>
    setOperations((ops) => [
      ...ops,
      { id: uid(), type: "cutout", title: "CUTOUT", shape: "circle", x_mm: 10, y_mm: 10, d_mm: 6, depth_mm: 999 },
    ]);
  const addText = () =>
    setOperations((ops) => [
      ...ops,
      { id: uid(), type: "text", title: "TEXT", text: "TEK", x_mm: 10, y_mm: 10, size_mm: 10, depth_mm: 1, engrave: true },
    ]);
  const addRound = () =>
    setOperations((ops) => [...ops, { id: uid(), type: "round", title: "ROUND", r_mm: 2 }]);
  const addArray = () =>
    setOperations((ops) => [
      ...ops,
      {
        id: uid(),
        type: "array",
        title: "ARRAY",
        shape: "rect",
        start_x_mm: 10,
        start_y_mm: 10,
        nx: 3,
        ny: 2,
        dx_mm: 20,
        dy_mm: 20,
        w_mm: 6,
        h_mm: 10,
      },
    ]);

  const removeOp = (id: string) => setOperations((ops) => ops.filter((o) => o.id !== id));
  const patchOp = <K extends keyof Operation>(id: string, key: K, value: any) =>
    setOperations((ops) => ops.map((o) => (o.id === id ? ({ ...o, [key]: value } as Operation) : o)));

  /** --------- generar ---------- */
  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    setWarnings([]);
    setSvgUrl(null);

    try {
      // filtramos texto si no está “forzado”
      const ops = operations.filter((op) => {
        if (op.type !== "text") return true;
        return (op as OpText).force; // si no marcas Forzar, no viaja (evita warning del backend)
      });

      const payload: any = {
        model: model.replace(/-/g, "_"),
        params,
        holes,
        operations: ops,
      };
      if (exportSVG) payload.outputs = ["stl", "svg"];

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error generando");

      // URL STL
      const url = json?.stl_url as string;
      if (url) {
        onGenerated?.(url);
        emit("forge:stl-url", { url });
      }

      // URL SVG (si lo hay)
      if (json?.svg_url) {
        setSvgUrl(json.svg_url);
        emit("forge:svg-url", { url: json.svg_url });
      }

      if (Array.isArray(json?.warnings) && json.warnings.length) {
        setWarnings(json.warnings);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar");
    } finally {
      setBusy(false);
    }
  };

  /** ---------- UI ---------- */
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Configurador</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm">
          <span className="mb-1 block text-neutral-600">Modelo</span>
          <select
            className="w-full rounded-md border bg-white px-3 py-2"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {STATIC_MODELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Largo (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border px-3 py-2"
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
            className="w-full rounded-md border px-3 py-2"
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
            className="w-full rounded-md border px-3 py-2"
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
            className="w-full rounded-md border px-3 py-2"
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
            className="w-full rounded-md border px-3 py-2"
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
            className="rounded-md border px-2 py-1 text-sm"
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
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
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
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
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
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
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
                className="rounded-md border px-2 py-1 text-xs"
                onClick={() => setHoles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Operaciones */}
      <div className="mt-6 rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Operaciones</span>
          <div className="flex gap-2">
            <button className="rounded-md border px-2 py-1 text-sm" onClick={addCutout}>+ Cutout</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={addText}>+ Text</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={addRound}>+ Round</button>
            <button className="rounded-md border px-2 py-1 text-sm" onClick={addArray}>+ Array</button>
          </div>
        </div>

        {operations.length === 0 && (
          <p className="text-sm text-neutral-500">No hay operaciones. Añade una con los botones de arriba.</p>
        )}

        <div className="grid gap-3">
          {operations.map((op) => {
            if (op.type === "cutout") {
              const o = op as OpCutout;
              return (
                <div key={op.id} className="rounded-md border p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border bg-white px-2 py-1 text-sm"
                        value={o.type}
                        onChange={() => {}}
                        disabled
                      >
                        <option value="cutout">cutout</option>
                      </select>
                      <span className="text-sm font-semibold">{op.title ?? "CUTOUT"}</span>
                    </div>
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => removeOp(op.id)}>
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2 text-xs">
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Shape</span>
                      <select
                        className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                        value={o.shape}
                        onChange={(e) => patchOp(op.id, "shape", e.target.value)}
                      >
                        <option value="circle">circle</option>
                        <option value="rect">rect</option>
                      </select>
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.x_mm}
                        onChange={(e) => patchOp(op.id, "x_mm", n(e.target.value, o.x_mm))}
                      />
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.y_mm}
                        onChange={(e) => patchOp(op.id, "y_mm", n(e.target.value, o.y_mm))}
                      />
                    </label>
                    {o.shape === "circle" ? (
                      <label>
                        <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          value={o.d_mm ?? 6}
                          onChange={(e) => patchOp(op.id, "d_mm", n(e.target.value, o.d_mm ?? 6))}
                        />
                      </label>
                    ) : (
                      <>
                        <label>
                          <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                          <input
                            type="number"
                            className="w-full rounded-md border px-2 py-1.5 text-sm"
                            value={o.w_mm ?? 6}
                            onChange={(e) => patchOp(op.id, "w_mm", n(e.target.value, o.w_mm ?? 6))}
                          />
                        </label>
                        <label>
                          <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                          <input
                            type="number"
                            className="w-full rounded-md border px-2 py-1.5 text-sm"
                            value={o.h_mm ?? 10}
                            onChange={(e) => patchOp(op.id, "h_mm", n(e.target.value, o.h_mm ?? 10))}
                          />
                        </label>
                      </>
                    )}
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.depth_mm}
                        onChange={(e) => patchOp(op.id, "depth_mm", n(e.target.value, o.depth_mm))}
                      />
                    </label>
                  </div>
                </div>
              );
            }

            if (op.type === "text") {
              const o = op as OpText;
              return (
                <div key={op.id} className="rounded-md border p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select className="rounded-md border bg-white px-2 py-1 text-sm" value="text" disabled>
                        <option value="text">text</option>
                      </select>
                      <span className="text-sm font-semibold">{op.title ?? "TEXT"}</span>
                    </div>
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => removeOp(op.id)}>
                      Quitar
                    </button>
                  </div>

                  <div className="mb-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                    Tu backend ha indicado que <strong>TEXT no está disponible</strong> (faltan
                    dependencias de <code>trimesh.path/shapely</code>). Puedes “Forzar envío” para que
                    viaje en el payload, pero no se aplicará hasta que instales esas deps.
                  </div>

                  <div className="grid grid-cols-6 gap-2 text-xs">
                    <label className="col-span-3">
                      <span className="mb-0.5 block text-neutral-600">Texto</span>
                      <input
                        type="text"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.text}
                        onChange={(e) => patchOp(op.id, "text", e.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">X (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.x_mm}
                        onChange={(e) => patchOp(op.id, "x_mm", n(e.target.value, o.x_mm))}
                      />
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Y (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.y_mm}
                        onChange={(e) => patchOp(op.id, "y_mm", n(e.target.value, o.y_mm))}
                      />
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Size (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.size_mm}
                        onChange={(e) => patchOp(op.id, "size_mm", n(e.target.value, o.size_mm))}
                      />
                    </label>
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Prof. (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.depth_mm}
                        onChange={(e) => patchOp(op.id, "depth_mm", n(e.target.value, o.depth_mm))}
                      />
                    </label>
                    <label className="col-span-2 mt-5 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!o.engrave}
                        onChange={(e) => patchOp(op.id, "engrave", e.target.checked)}
                      />
                      Engrave
                    </label>
                    <label className="col-span-2 mt-5 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!o.force}
                        onChange={(e) => patchOp(op.id, "force", e.target.checked)}
                      />
                      Forzar envío
                    </label>
                  </div>
                </div>
              );
            }

            if (op.type === "round") {
              const o = op as OpRound;
              return (
                <div key={op.id} className="rounded-md border p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select className="rounded-md border bg-white px-2 py-1 text-sm" value="round" disabled>
                        <option value="round">round</option>
                      </select>
                      <span className="text-sm font-semibold">{op.title ?? "ROUND"}</span>
                    </div>
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => removeOp(op.id)}>
                      Quitar
                    </button>
                  </div>

                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Radio (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.r_mm}
                      min={0}
                      step={0.5}
                      onChange={(e) => patchOp(op.id, "r_mm", n(e.target.value, o.r_mm))}
                    />
                  </label>
                </div>
              );
            }

            // array
            const o = op as OpArray;
            return (
              <div key={op.id} className="rounded-md border p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select className="rounded-md border bg-white px-2 py-1 text-sm" value="array" disabled>
                      <option value="array">array</option>
                    </select>
                    <span className="text-sm font-semibold">{op.title ?? "ARRAY"}</span>
                  </div>
                  <button className="rounded-md border px-2 py-1 text-sm" onClick={() => removeOp(op.id)}>
                    Quitar
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2 text-xs">
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Shape</span>
                    <select
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                      value={o.shape}
                      onChange={(e) => patchOp(op.id, "shape", e.target.value)}
                    >
                      <option value="rect">rect</option>
                      <option value="circle">circle</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Start X (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.start_x_mm}
                      onChange={(e) => patchOp(op.id, "start_x_mm", n(e.target.value, o.start_x_mm))}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">Start Y (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.start_y_mm}
                      onChange={(e) => patchOp(op.id, "start_y_mm", n(e.target.value, o.start_y_mm))}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">nx</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.nx}
                      onChange={(e) => patchOp(op.id, "nx", n(e.target.value, o.nx))}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">ny</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.ny}
                      onChange={(e) => patchOp(op.id, "ny", n(e.target.value, o.ny))}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">dx (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.dx_mm}
                      onChange={(e) => patchOp(op.id, "dx_mm", n(e.target.value, o.dx_mm))}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-600">dy (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      value={o.dy_mm}
                      onChange={(e) => patchOp(op.id, "dy_mm", n(e.target.value, o.dy_mm))}
                    />
                  </label>
                  {o.shape === "circle" ? (
                    <label>
                      <span className="mb-0.5 block text-neutral-600">Ø (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        value={o.d_mm ?? 5}
                        onChange={(e) => patchOp(op.id, "d_mm", n(e.target.value, o.d_mm ?? 5))}
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">W (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          value={o.w_mm ?? 5}
                          onChange={(e) => patchOp(op.id, "w_mm", n(e.target.value, o.w_mm ?? 5))}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-neutral-600">H (mm)</span>
                        <input
                          type="number"
                          className="w-full rounded-md border px-2 py-1.5 text-sm"
                          value={o.h_mm ?? 8}
                          onChange={(e) => patchOp(op.id, "h_mm", n(e.target.value, o.h_mm ?? 8))}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
          onClick={handleGenerate}
          disabled={busy || !canGenerate}
        >
          {busy ? "Generando…" : "Generar STL"}
        </button>

        <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={exportSVG} onChange={(e) => setExportSVG(e.target.checked)} />
          Export SVG (láser)
        </label>

        {svgUrl && (
          <a href={svgUrl} target="_blank" rel="noreferrer" className="text-sm underline">
            Descargar SVG
          </a>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Advertencias del backend:</strong>
          <ul className="ml-4 list-disc">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
