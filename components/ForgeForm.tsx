// components/ForgeForm.tsx
"use client";

import React, { useMemo, useState } from "react";
import STLViewer from "@/components/STLViewer";
import { generateSTL, type GenerateResponse } from "@/lib/api";

export default function ForgeForm() {
  // Parámetros (cable tray)
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prettyJSON = useMemo(() => {
    const obj = stlUrl
      ? { status: "ok", stl_url: stlUrl }
      : error
      ? { status: "error", detail: error }
      : { status: "idle" };
    return JSON.stringify(obj, null, 2);
  }, [stlUrl, error]);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    setStlUrl(null);

    const payload = {
      model: "cable_tray" as const,
      width_mm: width,
      height_mm: height,
      length_mm: length,
      thickness_mm: thickness,
      ventilated,
    };

    const res: GenerateResponse = await generateSTL(payload);
    if (res.status === "ok") {
      setStlUrl(res.stl_url);
    } else {
      setError(res.detail || res.message || "Failed to generate STL");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Teknovashop Forge
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount llegan en el siguiente paso.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de control */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-700">Parámetros</h2>

          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Ancho (mm): {width}
              </label>
              <input
                type="range"
                min={40}
                max={120}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="range w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Alto (mm): {height}
              </label>
              <input
                type="range"
                min={15}
                max={60}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="range w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Longitud (mm): {length}
              </label>
              <input
                type="range"
                min={100}
                max={400}
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="range w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Espesor (mm): {thickness}
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={thickness}
                onChange={(e) => setThickness(parseInt(e.target.value))}
                className="range w-full"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                checked={ventilated}
                onChange={(e) => setVentilated(e.target.checked)}
              />
              Con ranuras de ventilación
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onGenerate}
                disabled={busy}
                className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && (
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                )}
                Generar STL
              </button>

              {stlUrl && (
                <a
                  href={stlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Descargar STL (en Supabase)
                </a>
              )}
            </div>

            <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              <summary className="cursor-pointer select-none text-gray-800">
                Ver respuesta JSON
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2">
                {prettyJSON}
              </pre>
            </details>
          </div>
        </div>

        {/* Visor */}
        <div>
          <STLViewer
            url={stlUrl || undefined}   // importante: pasar undefined si no hay
            height={520}
            background="#ffffff"
            modelColor="#3f444c"
          />
        </div>
      </div>
    </div>
  );
}
