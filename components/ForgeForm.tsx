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
  // NUEVO: el backend ya lo soporta
  arrayOps?: ArrayOp[];
  textOps?: TextOp[];
};

type Hole = { x_mm: number; y_mm: number; d_mm: number };

// Operaciones
type ArrayOp = {
  count: number;   // nº de copias (incluye original implícitamente)
  dx: number;      // desplazamiento por copia en X (mm)
  dy: number;      // desplazamiento por copia en Y (mm)
};

type TextOp = {
  text: string;
  size: number;    // mm
  depth: number;   // mm (extrusión)
  x: number;
  y: number;
  z: number;
  // en el backend es placeholder seguro (sin romper si no hay tipografías)
};

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
  { value: "ssd_holder",    label: 'SSD Holder (2.5")' },
  { value: "raspi_case",    label: "Raspberry Pi Case" },
  { value: "go_pro_mount",  label: "GoPro Mount" },
  { value: "wall_hook",     label: "Wall Hook" },
  { value: "monitor_stand", label: "Monitor Stand" },
  { value: "laptop_stand",  label: "Laptop Stand" },
  { value: "mic_arm_clip",  label: "Mic Arm Clip" },
  { value: "camera_plate",  label: 'Camera Plate 1/4"' },
  { value: "hub_holder",    label: "USB Hub Holder" }
];

function n(v: any, def: number): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
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
  const [model, setModel] = useState<string>(initialModel);

  const [length_mm, setLength] = useState<number>(initialParams?.length_mm ?? 120);
  const [width_mm, setWidth] = useState<number>(initialParams?.width_mm ?? 100);
  const [height_mm, setHeight] = useState<number>(initialParams?.height_mm ?? 60);
  const [thickness_mm, setThickness] = useState<number>(initialParams?.thickness_mm ?? 3);
  const [fillet_mm, setFillet] = useState<number>(initialParams?.fillet_mm ?? 0);

  const [holes, setHoles] = useState<Hole[]>(initialHoles);

  // NUEVO: estado de operaciones
  const [arrayOps, setArrayOps] = useState<ArrayOp[]>(initialParams?.arrayOps ?? []);
  const [textOps, setTextOps] = useState<TextOp[]>(initialParams?.textOps ?? []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // debounce pequeño para no spamear el visor al teclear
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEmit = useCallback((fn: () => void, ms = 120) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fn, ms);
  }, []);

  // Escucha del visor: ALT+click emite "forge:add-hole"
  useEffect(() => {
    const onAdd = (ev: Event) => {
      const det = (ev as CustomEvent).detail || {};
      const x = n(det.x_mm, 0);
      const d = n(det.d_mm, 4);
      const y = Number.isFinite(det.y_mm) ? n(det.y_mm, 0) : width_mm / 2;
      setHoles((prev) => [...prev, { x_mm: x, y_mm: y, d_mm: d }]);
    };
    window.addEventListener("forge:add-hole", onAdd as any);
    return () => window.removeEventListener("forge:add-hole", onAdd as any);
  }, [width_mm]);

  // Parámetros normalizados
  const params: Params = useMemo(() => {
    const p: Params = {
      length_mm: clamp(Number(length_mm) || 0, 1, 5000),
      width_mm: clamp(Number(width_mm) || 0, 1, 5000),
      height_mm: clamp(Number(height_mm) || 0, 1, 5000),
      thickness_mm: clamp(Number(thickness_mm) || 1, 0.2, 100),
      fillet_mm: clamp(Number(fillet_mm) || 0, 0, 200),
      arrayOps,
      textOps,
    };
    // sincroniza al visor con debounce (por si quieres usar overlays)
    debouncedEmit(() => emit("forge:set-params", { params: p }));
    debouncedEmit(() => emit("forge:set-ops", { arrayOps, textOps }));
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, arrayOps, textOps]);

  // ---- HANDSHAKE INICIAL ----
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:set-params", { params });
    emit("forge:set-holes", { holes });
    emit("forge:set-ops", { arrayOps, textOps });
    emit("forge:refresh", { reason: "initial-handshake" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  // Cambio de modelo
  useEffect(() => {
    emit("forge:set-model", { model });
    emit("forge:refresh", { reason: "model-changed" });
  }, [model]);

  // Agujeros -> visor (debounce)
  useEffect(() => {
    debouncedEmit(() => emit("forge:set-holes", { holes }));
  }, [holes, debouncedEmit]);

  const canGenerate = API_BASE.length > 0;

  const handleGenerate = useCallback(async () => {
    setError(null);
    if (!canGenerate) {
      setError(
        "Falta configurar la variable NEXT_PUBLIC_FORGE_API_URL (o NEXT_PUBLIC_BACKEND_URL) en Vercel."
      );
      return;
    }

    emit("forge:generate", { model, params, holes });

    setBusy(true);
    try {
      const payload = {
        model,
        params: {
          length_mm: params.length_mm,
          width_mm: params.width_mm,
          height_mm: params.height_mm,
          thickness_mm: params.thickness_mm,
          fillet_mm: params.fillet_mm,

          // alias (por compatibilidad)
          length: params.length_mm,
          width: params.width_mm,
          height: params.height_mm,
          wall: params.thickness_mm,
          fillet: params.fillet_mm,

          // NUEVO: operaciones
          arrayOps: arrayOps,
          textOps: textOps,
          // y agujeros
          holes: holes.map((h) => ({
            x_mm: Number(h.x_mm),
            y_mm: Number(h.y_mm),
            d_mm: Number(h.d_mm),
          })),
        },
      };

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || `HTTP ${res.status}`);
      }

      const url: string | undefined = json?.stl_url || json?.signed_url || json?.url;
      if (url) {
        onGenerated?.(url);
        emit("forge:generated-url", { url });
      } else if (json?.path) {
        emit("forge:generated-path", { path: json.path });
      } else {
        throw new Error("Respuesta inesperada del backend");
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el STL");
    } finally {
      setBusy(false);
    }
  }, [model, params, holes, onGenerated, canGenerate, arrayOps, textOps]);

  // Auto-generar con ?autogenerate=1 (y agujeros en query)
  useEffect(() => {
    try {
      const usp = new URLSearchParams(window.location.search);
      const auto = usp.get("autogenerate");
      if (auto === "1") {
        const holesStr = usp.get("holes");
        if (holesStr) {
          try {
            const parsed = JSON.parse(decodeURIComponent(holesStr));
            if (Array.isArray(parsed)) setHoles(parsed.filter(Boolean));
          } catch {}
        }
        handleGenerate();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeHole = (idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Helpers para arrays y texto
  const addArrayOp = () =>
    setArrayOps((p) => [...p, { count: 3, dx: 10, dy: 0 }]);

  const removeArrayOp = (i: number) =>
    setArrayOps((p) => p.filter((_, idx) => idx !== i));

  const addTextOp = () =>
    setTextOps((p) => [...p, { text: "Teknovashop", size: 8, depth: 1.2, x: 0, y: 0, z: 0 }]);

  const removeTextOp = (i: number) =>
    setTextOps((p) => p.filter((_, idx) => idx !== i));

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
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Grosor pared (mm)</span>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            value={thickness_mm}
            onChange={(e) => setThickness(n(e.target.value, thickness_mm))}
            min={0.2}
            step={0.5}
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
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Agujeros superiores</h3>
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            onClick={() =>
              setHoles((prev) => [...prev, { x_mm: Math.round(length_mm / 2), y_mm: Math.round(width_mm / 2), d_mm: 4 }])
            }
          >
            + Añadir
          </button>
        </div>

        {holes.length === 0 ? (
          <p className="text-xs text-neutral-600">
            No hay agujeros. Consejo: mantén <kbd>Alt</kbd> y haz clic en el visor para añadir uno donde apuntes.
          </p>
        ) : (
          <div className="space-y-2">
            {holes.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr,1fr,1fr,auto] items-center gap-2">
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
                    step={0.1}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  onClick={() => removeHole(i)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operaciones */}
      <div className="mt-6 space-y-5">
        {/* ARRAY */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Operaciones: Array</h3>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
              onClick={addArrayOp}
            >
              + Array
            </button>
          </div>
          {arrayOps.length === 0 ? (
            <p className="text-xs text-neutral-600">No hay arrays definidos.</p>
          ) : (
            <div className="space-y-2">
              {arrayOps.map((op, i) => (
                <div key={i} className="grid grid-cols-[1fr,1fr,1fr,auto] items-center gap-2">
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Copias</span>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.count}
                      onChange={(e) =>
                        setArrayOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, count: n(e.target.value, o.count) } : o))
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">ΔX (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.dx}
                      onChange={(e) =>
                        setArrayOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, dx: n(e.target.value, o.dx) } : o))
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">ΔY (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.dy}
                      onChange={(e) =>
                        setArrayOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, dy: n(e.target.value, o.dy) } : o))
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    onClick={() => removeArrayOp(i)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TEXTO */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Operaciones: Texto</h3>
            <button
              type="button"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
              onClick={addTextOp}
            >
              + Texto
            </button>
          </div>
          {textOps.length === 0 ? (
            <p className="text-xs text-neutral-600">No hay textos definidos.</p>
          ) : (
            <div className="space-y-2">
              {textOps.map((op, i) => (
                <div key={i} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,auto] items-center gap-2">
                  <label className="text-xs col-span-2">
                    <span className="mb-0.5 block text-neutral-600">Texto</span>
                    <input
                      type="text"
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.text}
                      onChange={(e) =>
                        setTextOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o))
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Tamaño</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.size}
                      onChange={(e) =>
                        setTextOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, size: n(e.target.value, o.size) } : o))
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block text-neutral-600">Profund.</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      value={op.depth}
                      onChange={(e) =>
                        setTextOps((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, depth: n(e.target.value, o.depth) } : o))
                        )
                      }
                      step={0.5}
                    />
                  </label>
                  {(["x","y","z"] as const).map((axis) => (
                    <label className="text-xs" key={axis}>
                      <span className="mb-0.5 block text-neutral-600">{axis.toUpperCase()} (mm)</span>
                      <input
                        type="number"
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                        value={(op as any)[axis]}
                        onChange={(e) =>
                          setTextOps((prev) =>
                            prev.map((o, idx) =>
                              idx === i ? { ...o, [axis]: n(e.target.value, (o as any)[axis]) } : o
                            )
                          )
                        }
                        step={0.5}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    onClick={() => removeTextOp(i)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Generando…" : "Generar STL"}
        </button>
        {!canGenerate && (
          <span className="text-xs text-neutral-500">
            Configura <code>NEXT_PUBLIC_FORGE_API_URL</code> para generar.
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
