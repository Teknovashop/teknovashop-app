// teknovashop-app/app/forge/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { generateSTL } from "@/lib/api";
import type {
  GenerateResponse,
  ModelKind,
  CableTrayPayload,
  VesaAdapterPayload,
  RouterMountPayload,
  ForgePayload,
} from "@/types/forge";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

type Hole = { x_mm: number; z_mm: number; d_mm: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ForgePage() {
  /** -------- Modelo activo -------- */
  const [model, setModel] = useState<ModelKind>("cable_tray");

  /** -------- Parámetros por modelo -------- */
  // Cable tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // VESA
  const [vesa, setVesa] = useState(100);
  const [vesaThk, setVesaThk] = useState(4);
  const [vesaClear, setVesaClear] = useState(1);
  const [vesaHole, setVesaHole] = useState(5);

  // Router mount
  const [rWidth, setRWidth] = useState(120);
  const [rDepth, setRDepth] = useState(80);
  const [rThk, setRThk] = useState(4);
  const [rSlots, setRSlots] = useState(true);
  const [rHole, setRHole] = useState(4);

  /** -------- Apariencia visor -------- */
  const [modelColor, setModelColor] = useState("#3f444c");
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [viewMode, setViewMode] = useState<"preview" | "stl">("preview");

  /** -------- Edición de agujeros -------- */
  const [holes, setHoles] = useState<Hole[]>([]);
  const [addingHoles, setAddingHoles] = useState(false);
  const [holeD, setHoleD] = useState(5);

  /** -------- Compra -------- */
  const [plan, setPlan] = useState<"oneoff" | "maker" | "commercial">("oneoff");
  const [buyerEmail, setBuyerEmail] = useState("");

  /** -------- Estado API -------- */
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const stlUrl = useMemo(
    () => (result?.status === "ok" ? (result as any).stl_url : undefined),
    [result]
  );

  /** -------- Preview paramétrico -------- */
  const preview = useMemo(() => {
    if (model === "cable_tray") {
      return {
        kind: "cable_tray",
        params: {
          width_mm: width,
          height_mm: height,
          length_mm: length,
          thickness_mm: thickness,
          ventilated,
        },
      } as const;
    }
    if (model === "vesa_adapter") {
      return {
        kind: "vesa_adapter",
        params: { vesa_mm: vesa, thickness_mm: vesaThk, clearance_mm: vesaClear },
      } as const;
    }
    return {
      kind: "router_mount",
      params: { router_width_mm: rWidth, router_depth_mm: rDepth, thickness_mm: rThk },
    } as const;
  }, [
    model,
    width,
    height,
    length,
    thickness,
    ventilated,
    vesa,
    vesaThk,
    vesaClear,
    rWidth,
    rDepth,
    rThk,
  ]);

  /** -------- Presets rápidos (solo cable tray) -------- */
  const applyPreset = (k: "S" | "M" | "L") => {
    if (k === "S") {
      setWidth(40);
      setHeight(20);
      setLength(120);
      setThickness(2);
    } else if (k === "M") {
      setWidth(60);
      setHeight(25);
      setLength(180);
      setThickness(3);
    } else {
      setWidth(80);
      setHeight(35);
      setLength(240);
      setThickness(4);
    }
  };

  /** -------- Generación STL -------- */
  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);
    setJsonOpen(false);

    try {
      let payload: any;

      if (model === "cable_tray") {
        payload = {
          model: "cable_tray",
          width_mm: clamp(width, 10, 500),
          height_mm: clamp(height, 5, 300),
          length_mm: clamp(length, 30, 2000),
          thickness_mm: clamp(thickness, 1, 20),
          ventilated,
          holes, // ← NUEVO (el backend puede ignorarlo si aún no lo soporta)
        } satisfies CableTrayPayload as any;
      } else if (model === "vesa_adapter") {
        payload = {
          model: "vesa_adapter",
          vesa_mm: clamp(vesa, 50, 400),
          thickness_mm: clamp(vesaThk, 2, 10),
          hole_diameter_mm: clamp(vesaHole, 3, 10),
          clearance_mm: clamp(vesaClear, 0, 5),
          holes, // ← NUEVO
        } satisfies VesaAdapterPayload as any;
      } else {
        payload = {
          model: "router_mount",
          router_width_mm: clamp(rWidth, 50, 400),
          router_depth_mm: clamp(rDepth, 30, 300),
          thickness_mm: clamp(rThk, 2, 10),
          strap_slots: rSlots,
          hole_diameter_mm: clamp(rHole, 3, 10),
          holes, // opcional
        } satisfies RouterMountPayload as any;
      }

      const res = await generateSTL(payload as ForgePayload);
      setResult(res);
      setJsonOpen(true);
      // dejamos la vista en "preview" por defecto
    } catch (e: any) {
      alert(`Error inesperado: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  /** -------- Helpers UI -------- */
  const Label = (p: { children: React.ReactNode }) => (
    <label className="block text-sm text-gray-700">{p.children}</label>
  );
  const Number = (p: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
  }) => (
    <input
      type="number"
      value={p.value}
      min={p.min}
      max={p.max}
      step={p.step ?? 1}
      onChange={(e) => p.onChange(parseFloat(e.target.value))}
      className={`w-28 rounded-lg border px-2 py-1 text-sm ${p.className || ""}`}
    />
  );

  /** -------- UI -------- */
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">Teknovashop Forge</div>
          <nav className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </a>
            <a
              href="https://github.com/Teknovashop/teknovashop-app"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[430px,1fr]">
          {/* Panel izquierdo */}
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              {[
                { id: "cable_tray", label: "Cable Tray" },
                { id: "vesa_adapter", label: "VESA Adapter" },
                { id: "router_mount", label: "Router Mount" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModel(t.id as ModelKind)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    model === t.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Parámetros por modelo */}
            {model === "cable_tray" && (
              <>
                <div className="flex gap-2">
                  {["S", "M", "L"].map((k) => (
                    <button
                      key={k}
                      onClick={() => applyPreset(k as any)}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-4">
                  {[
                    {
                      label: "Ancho (mm)",
                      val: width,
                      set: setWidth,
                      min: 10,
                      max: 500,
                    },
                    {
                      label: "Alto (mm)",
                      val: height,
                      set: setHeight,
                      min: 5,
                      max: 300,
                    },
                    {
                      label: "Longitud (mm)",
                      val: length,
                      set: setLength,
                      min: 30,
                      max: 2000,
                    },
                    {
                      label: "Espesor (mm)",
                      val: thickness,
                      set: setThickness,
                      min: 1,
                      max: 20,
                    },
                  ].map((f) => (
                    <div key={f.label}>
                      <Label>
                        {f.label}
                      </Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={f.min}
                          max={f.max}
                          value={f.val}
                          onChange={(e) => f.set(+e.target.value)}
                          className="w-full"
                        />
                        <span className="w-12 text-right tabular-nums">{f.val}</span>
                      </div>
                    </div>
                  ))}

                  <label className="inline-flex select-none items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ventilated}
                      onChange={(e) => setVentilated(e.target.checked)}
                    />
                    Con ranuras de ventilación
                  </label>
                </div>
              </>
            )}

            {model === "vesa_adapter" && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Tamaño VESA (mm)</Label>
                  <Number value={vesa} onChange={setVesa} min={50} max={400} step={25} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Espesor (mm)</Label>
                  <Number value={vesaThk} onChange={setVesaThk} min={2} max={10} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Holgura adicional (mm)</Label>
                  <Number value={vesaClear} onChange={setVesaClear} min={0} max={5} step={0.5} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ø agujero (mm)</Label>
                  <Number value={vesaHole} onChange={setVesaHole} min={3} max={10} step={0.5} />
                </div>
              </div>
            )}

            {model === "router_mount" && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Ancho router (mm)</Label>
                  <Number value={rWidth} onChange={setRWidth} min={50} max={400} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Fondo router (mm)</Label>
                  <Number value={rDepth} onChange={setRDepth} min={30} max={300} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Espesor (mm)</Label>
                  <Number value={rThk} onChange={setRThk} min={2} max={10} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ø agujero anclaje (mm)</Label>
                  <Number value={rHole} onChange={setRHole} min={3} max={8} step={0.5} />
                </div>
                <label className="inline-flex select-none items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rSlots}
                    onChange={(e) => setRSlots(e.target.checked)}
                  />
                  Ranuras para bridas/velcro
                </label>
              </div>
            )}

            {/* Edición de agujeros (para todos los modelos que lo soporten) */}
            <div className="mt-6 rounded-xl border bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800">Agujeros personalizados</h3>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addingHoles}
                    onChange={(e) => setAddingHoles(e.target.checked)}
                  />{" "}
                  Click en el modelo para añadir
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Label>Ø agujero al añadir (mm)</Label>
                <Number value={holeD} onChange={setHoleD} min={2} max={20} step={0.5} />
              </div>
              <div className="mt-3">
                {holes.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No hay agujeros. Activa el modo y haz clic sobre el modelo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {holes.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs"
                      >
                        <span>
                          #{i + 1} · x:{Math.round(h.x_mm)} · z:{Math.round(h.z_mm)} · Ø:
                          {h.d_mm}
                        </span>
                        <button
                          onClick={() => setHoles((arr) => arr.filter((_, j) => j !== i))}
                          className="rounded border px-2 py-0.5 hover:bg-gray-50"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setHoles([])}
                      className="mt-1 w-full rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Limpiar todos
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Apariencia y compra */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <Label>Color</Label>
                <input
                  type="color"
                  value={modelColor}
                  onChange={(e) => setModelColor(e.target.value)}
                  className="h-9 w-full rounded-lg border p-1"
                />
              </div>
              <div>
                <Label>Calidad</Label>
                <select
                  value={quality}
                  onChange={(e) => (setQuality(e.target.value as any))}
                  className="w-full rounded-lg border px-2 py-1.5 text-sm"
                >
                  <option value="high">Alta (sombras)</option>
                  <option value="low">Baja (rápida)</option>
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Plan</Label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as any)}
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                  >
                    <option value="oneoff">STL individual</option>
                    <option value="maker">Suscripción Maker</option>
                    <option value="commercial">Licencia Comercial</option>
                  </select>
                </div>
                <div>
                  <Label>Email (licencia / recibo)</Label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full rounded-lg border px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
              >
                {busy ? "Generando…" : "Generar STL"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={stlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-xl border px-3 py-2 text-center text-sm ${
                    stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
                  }`}
                >
                  Descargar STL
                </a>
                <button
                  onClick={async () => {
                    if (stlUrl) await navigator.clipboard.writeText(stlUrl);
                  }}
                  disabled={!stlUrl}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Copiar enlace
                </button>
              </div>

              <details
                open={jsonOpen}
                onToggle={(e) => setJsonOpen((e.target as HTMLDetailsElement).open)}
                className="mt-1"
              >
                <summary className="cursor-pointer text-sm text-gray-700">
                  Ver respuesta JSON
                </summary>
                <textarea
                  readOnly
                  value={JSON.stringify(result ?? {}, null, 2)}
                  className="mt-2 h-40 w-full rounded-xl border p-2 font-mono text-xs"
                />
              </details>
            </div>
          </section>

          {/* Visor pro */}
          <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
            {/* Conmutador de vista */}
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setViewMode("preview")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === "preview"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Vista: Preview
              </button>
              <button
                onClick={() => setViewMode("stl")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === "stl"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={!stlUrl}
              >
                Vista: STL generado
              </button>
            </div>

            <div className="rounded-xl border border-gray-200">
              <STLViewer
                url={stlUrl}
                preview={preview as any}
                mode={viewMode}
                height={560}
                background="#ffffff"
                modelColor={modelColor}
                quality={quality}
                watermark="Teknovashop Forge"
                rulers
                showAxes
                markers={holes.map((h) => ({ x: h.x_mm, z: h.z_mm, d: h.d_mm }))}
                editing={
                  addingHoles
                    ? {
                        enabled: true,
                        onPick: (p) =>
                          setHoles((arr) => [...arr, { x_mm: p.x, z_mm: p.z, d_mm: holeD }]),
                      }
                    : { enabled: false }
                }
              />
            </div>
            <p className="px-2 py-2 text-xs text-gray-500">
              Arrastra para rotar · rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan · Click
              (modo “agujeros”) para añadir marcadores
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
