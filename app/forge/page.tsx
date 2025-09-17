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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Hole = { x_mm: number; z_mm: number; diameter_mm: number };

export default function ForgePage() {
  // ------------ modelo activo ------------
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // ------------ parámetros (cable tray) ------------
  const [width, setWidth] = useState(140);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // ------------ VESA ------------
  const [vesa, setVesa] = useState(100);
  const [vesaThk, setVesaThk] = useState(4);
  const [vesaClear, setVesaClear] = useState(1);
  const [vesaHole, setVesaHole] = useState(5);

  // ------------ Router ------------
  const [rWidth, setRWidth] = useState(120);
  const [rDepth, setRDepth] = useState(80);
  const [rThk, setRThk] = useState(4);
  const [rSlots, setRSlots] = useState(true);
  const [rHole, setRHole] = useState(4);

  // ------------ visor/UI ------------
  const [mode, setMode] = useState<"preview" | "stl">("preview");
  const [color, setColor] = useState("#3f444c");
  const [quality, setQuality] = useState<"low" | "high">("high");

  // Agujeros (solo CableTray)
  const [holeMode, setHoleMode] = useState(false);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [holes, setHoles] = useState<Hole[]>([]);

  // ------------ estado petición ------------
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse>({ status: "_" });

  // Enlace STL si OK
  const stlUrl = useMemo(() => (result && result.status === "ok" ? (result as any).stl_url : undefined), [result]);

  const preview = useMemo(() => {
    if (model === "cable_tray") {
      return {
        kind: "cable_tray" as const,
        params: { width_mm: width, height_mm: height, length_mm: length, thickness_mm: thickness, ventilated },
      };
    }
    if (model === "vesa_adapter") {
      return {
        kind: "vesa_adapter" as const,
        params: { vesa_mm: vesa, thickness_mm: vesaThk, clearance_mm: vesaClear },
      };
    }
    return {
      kind: "router_mount" as const,
      params: { router_width_mm: rWidth, router_depth_mm: rDepth, thickness_mm: rThk },
    };
  }, [model, width, height, length, thickness, ventilated, vesa, vesaThk, vesaClear, rWidth, rDepth, rThk]);

  const applyPreset = (k: "S" | "M" | "L") => {
    if (k === "S") { setWidth(40); setHeight(20); setLength(120); setThickness(2); }
    else if (k === "M") { setWidth(60); setHeight(25); setLength(180); setThickness(3); }
    else { setWidth(80); setHeight(35); setLength(240); setThickness(4); }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setResult({ status: "_" });

    let payload: ForgePayload;

    if (model === "cable_tray") {
      // validaciones simples + payload
      payload = {
        model: "cable_tray",
        width_mm: clamp(width, 10, 500),
        height_mm: clamp(height, 5, 300),
        length_mm: clamp(length, 30, 2000),
        thickness_mm: clamp(thickness, 1, 20),
        ventilated,
        // si tu tipo todavía no contempla "holes", casteamos a any para no romper el build
        ...(holes.length ? { holes } : {}),
      } satisfies CableTrayPayload as any;
    } else if (model === "vesa_adapter") {
      payload = {
        model: "vesa_adapter",
        vesa_mm: clamp(vesa, 50, 400),
        thickness_mm: clamp(vesaThk, 2, 10),
        hole_diameter_mm: clamp(vesaHole, 3, 10),
        clearance_mm: clamp(vesaClear, 0, 5),
      } satisfies VesaAdapterPayload;
    } else {
      payload = {
        model: "router_mount",
        router_width_mm: clamp(rWidth, 50, 400),
        router_depth_mm: clamp(rDepth, 30, 300),
        thickness_mm: clamp(rThk, 2, 10),
        strap_slots: rSlots,
        hole_diameter_mm: clamp(rHole, 3, 10),
      } satisfies RouterMountPayload;
    }

    const res = await generateSTL(payload);
    setResult(res);
    setBusy(false);
    setJsonOpen(true);
  };

  const Label = (p: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-gray-800">{p.children}</label>
  );
  const Number = (p: {
    value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; className?: string;
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

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">Teknovashop Forge</div>
          <nav className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Inicio</a>
            <a
              href="https://github.com/Teknovashop/teknovashop-app"
              target="_blank"
              className="text-sm text-gray-600 hover:text-gray-900"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px,1fr]">
          {/* Panel de configuración */}
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6">
            {/* tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "cable_tray", label: "Cable Tray" },
                { id: "vesa_adapter", label: "VESA Adapter" },
                { id: "router_mount", label: "Router Mount" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModel(t.id as ModelKind)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    model === t.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* parámetros */}
            <div className="space-y-4">
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

                  <div className="space-y-3">
                    <div>
                      <Label>Ancho (mm)</Label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={10} max={500} value={width} onChange={(e) => setWidth(+e.target.value)} className="w-full" />
                        <span className="w-12 text-right tabular-nums">{width}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Alto (mm)</Label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={5} max={300} value={height} onChange={(e) => setHeight(+e.target.value)} className="w-full" />
                        <span className="w-12 text-right tabular-nums">{height}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Longitud (mm)</Label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={30} max={2000} value={length} onChange={(e) => setLength(+e.target.value)} className="w-full" />
                        <span className="w-12 text-right tabular-nums">{length}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Espesor (mm)</Label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={1} max={20} value={thickness} onChange={(e) => setThickness(+e.target.value)} className="w-full" />
                        <span className="w-12 text-right tabular-nums">{thickness}</span>
                      </div>
                    </div>
                    <label className="inline-flex select-none items-center gap-2 text-sm">
                      <input type="checkbox" checked={ventilated} onChange={(e) => setVentilated(e.target.checked)} />
                      Con ranuras de ventilación
                    </label>
                  </div>

                  {/* Agujeros personalizados */}
                  <div className="mt-4 rounded-xl border border-gray-200 p-3">
                    <h3 className="text-sm font-semibold">Agujeros personalizados</h3>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={holeMode} onChange={(e) => setHoleMode(e.target.checked)} />
                      Click en el modelo para añadir
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <Label>Ø a añadir (mm)</Label>
                      <Number value={holeDiameter} onChange={setHoleDiameter} min={2} max={20} step={0.5} />
                    </div>

                    {holes.length === 0 ? (
                      <p className="mt-2 text-xs text-gray-500">No hay agujeros. Activa el modo y haz clic sobre el modelo.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {holes.map((h, i) => (
                          <li key={`${h.x_mm}-${h.z_mm}-${i}`} className="flex items-center justify-between rounded-lg border px-2 py-1 text-xs">
                            <span>({h.x_mm.toFixed(1)}, {h.z_mm.toFixed(1)}) · Ø {h.diameter_mm.toFixed(1)} mm</span>
                            <button
                              onClick={() => setHoles((arr) => arr.filter((_, j) => j !== i))}
                              className="rounded-md px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                            >
                              Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {model === "vesa_adapter" && (
                <div className="grid grid-cols-2 gap-3">
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
                  <p className="col-span-2 text-xs text-gray-500">Preview: placa con patrón VESA.</p>
                </div>
              )}

              {model === "router_mount" && (
                <div className="grid grid-cols-2 gap-3">
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
                  <label className="col-span-2 inline-flex select-none items-center gap-2 text-sm">
                    <input type="checkbox" checked={rSlots} onChange={(e) => setRSlots(e.target.checked)} />
                    Ranuras para bridas/velcro
                  </label>
                  <p className="col-span-2 text-xs text-gray-500">Preview: escuadra básica.</p>
                </div>
              )}
            </div>

            {/* Apariencia & acciones */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <Label>Color</Label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded-md border" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Calidad</Label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="rounded-lg border px-2 py-1 text-sm"
                  >
                    <option value="high">Alta (sombras)</option>
                    <option value="low">Media</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
                >
                  {busy ? "Generando…" : "Generar STL"}
                </button>

                <a
                  href={stlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
                  }`}
                >
                  Descargar STL
                </a>
              </div>

              <details
                open={jsonOpen}
                onToggle={(e) => setJsonOpen((e.target as HTMLDetailsElement).open)}
                className="mt-2"
              >
                <summary className="cursor-pointer text-sm text-gray-700">
                  Ver respuesta JSON
                </summary>
                <textarea
                  readOnly
                  value={JSON.stringify(result ?? {}, null, 2)}
                  className="mt-2 w-full h-40 rounded-xl border p-2 font-mono text-xs"
                />
              </details>
            </div>
          </section>

          {/* Visor */}
          <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
            {/* barra de vista */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border">
                <button
                  onClick={() => setMode("preview")}
                  className={`px-3 py-1.5 text-sm ${mode === "preview" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
                >
                  Vista: Preview
                </button>
                <button
                  onClick={() => setMode("stl")}
                  disabled={!stlUrl}
                  className={`px-3 py-1.5 text-sm ${mode === "stl" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"} disabled:opacity-50`}
                >
                  Vista: STL generado
                </button>
              </div>

              {model === "cable_tray" && (
                <label className="ml-auto inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={holeMode}
                    onChange={(e) => setHoleMode(e.target.checked)}
                  />
                  Modo “agujeros”
                </label>
              )}
            </div>

            {/* marco del visor */}
            <div className="relative rounded-xl border border-gray-200 bg-[radial-gradient(circle_at_50%_0,rgba(0,0,0,0.02),transparent_40%)]">
              <STLViewer
                url={stlUrl}
                preview={preview as any}
                mode={mode}
                height={560}
                background="#ffffff"
                modelColor={color}
                quality={quality}
                showAxes
                showGrid
                allowHolePlacement={model === "cable_tray" && holeMode}
                holeRadiusMm={holeDiameter}
                onAddHole={(p) => {
                  setHoles((h) => [...h, { x_mm: +p.x.toFixed(1), z_mm: +p.z.toFixed(1), diameter_mm: holeDiameter }]);
                }}
                watermark="Teknovashop Forge"
              />
            </div>

            <p className="px-2 py-2 text-xs text-gray-500">
              Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan ·
              {model === "cable_tray" ? " Activa “agujeros” y haz click para añadir marcadores." : ""}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
