// /app/forge/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { generateSTL, type GenerateResponse } from "@/lib/api";
import dynamic from "next/dynamic";

// Cargamos el visor 3D solo en cliente
const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

// Utilidad para clamped sliders
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

export default function ForgePage() {
  // Modelo seleccionado
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Parámetros del modelo (unidades en mm)
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // Estado de llamada
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Enlace STL si OK
  const stlUrl = useMemo(() => {
    if (result && result.status === "ok") return result.stl_url;
    return undefined;
  }, [result]);

  // Presets rápidos (por ahora solo Cable Tray)
  const applyPreset = (kind: "S" | "M" | "L") => {
    if (model === "cable_tray") {
      if (kind === "S") {
        setWidth(40);
        setHeight(20);
        setLength(120);
        setThickness(2);
      } else if (kind === "M") {
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
    } else {
      // Cuando activemos VESA/Router definimos sus presets aquí
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);

    // Si el modelo no está soportado aún, mostramos respuesta amigable
    if (model !== "cable_tray") {
      setResult({
        status: "error",
        // @ts-expect-error (permitimos un detail informativo para la UI)
        detail:
          "Este modelo aún no está disponible en el backend. Próximamente activaremos VESA y Router Mount.",
      } as any);
      setBusy(false);
      setJsonOpen(true);
      return;
    }

    // Validaciones simples
    const w = clamp(width, 10, 500);
    const h = clamp(height, 5, 300);
    const l = clamp(length, 30, 2000);
    const t = clamp(thickness, 1, 20);

    const payload = {
      model: "cable_tray" as const,
      width_mm: w,
      height_mm: h,
      length_mm: l,
      thickness_mm: t,
      ventilated,
    };

    const res = await generateSTL(payload);
    setResult(res);
    setBusy(false);
    setJsonOpen(true);
  };

  const copyLink = async () => {
    if (!stlUrl) return;
    try {
      await navigator.clipboard.writeText(stlUrl);
      alert("Enlace copiado al portapapeles ✅");
    } catch {
      alert("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 pb-16">
      <h1 className="text-3xl md:text-4xl font-serif tracking-tight mt-8">Configurador</h1>
      <p className="text-gray-600 mt-2">
        Ajusta los parámetros y genera el STL.{" "}
        <span className="text-gray-500">
          Arrastra para rotar · rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan.
        </span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Panel parámetros */}
        <section className="lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 p-4 md:p-5 shadow-sm">
            <h2 className="font-medium text-gray-900">Parámetros</h2>

            {/* Selector de modelo */}
            <div className="mt-3">
              <label className="block text-sm text-gray-600 mb-1">Modelo</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModel("cable_tray")}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    model === "cable_tray" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  Cable Tray
                </button>
                <button
                  disabled
                  title="Próximamente"
                  className="px-3 py-1.5 rounded-lg border text-sm opacity-50 cursor-not-allowed"
                >
                  VESA (pronto)
                </button>
                <button
                  disabled
                  title="Próximamente"
                  className="px-3 py-1.5 rounded-lg border text-sm opacity-50 cursor-not-allowed"
                >
                  Router Mount (pronto)
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => applyPreset("S")}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                S
              </button>
              <button
                onClick={() => applyPreset("M")}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                M
              </button>
              <button
                onClick={() => applyPreset("L")}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                L
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-sm text-gray-600">
                  Ancho <span className="text-gray-400">(mm)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={500}
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                    className="range"
                  />
                  <span className="w-12 text-right tabular-nums">{width}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Alto <span className="text-gray-400">(mm)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={300}
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                    className="range"
                  />
                  <span className="w-12 text-right tabular-nums">{height}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Longitud <span className="text-gray-400">(mm)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={30}
                    max={2000}
                    value={length}
                    onChange={(e) => setLength(parseInt(e.target.value, 10))}
                    className="range"
                  />
                  <span className="w-12 text-right tabular-nums">{length}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600">
                  Espesor <span className="text-gray-400">(mm)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={thickness}
                    onChange={(e) => setThickness(parseInt(e.target.value, 10))}
                    className="range"
                  />
                  <span className="w-12 text-right tabular-nums">{thickness}</span>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  checked={ventilated}
                  onChange={(e) => setVentilated(e.target.checked)}
                />
                Con ranuras de ventilación
              </label>

              {/* Acciones */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 hover:bg-black disabled:opacity-60"
                >
                  {busy ? "Generando…" : "Generar STL"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={stlUrl}
                    target="_blank"
                    className={`rounded-lg border px-3 py-2 text-center text-sm ${
                      stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
                    }`}
                    rel="noreferrer"
                  >
                    Descargar STL
                  </a>
                  <button
                    onClick={copyLink}
                    disabled={!stlUrl}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Copiar enlace
                  </button>
                </div>
              </div>

              {/* JSON */}
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
                  className="mt-2 w-full h-40 rounded-lg border p-2 font-mono text-xs"
                />
              </details>
            </div>
          </div>
        </section>

        {/* Visor */}
        <section className="lg:col-span-8">
          <div className="rounded-2xl border border-gray-200 p-2 md:p-3 shadow-sm">
            <div className="h-[520px]">
              <STLViewer
                url={stlUrl}
                height={520}
                background="#ffffff"
                modelColor="#3f444c"
              />
            </div>
            <p className="text-xs text-gray-500 px-2 py-2">
              Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
