// teknovashop-app/app/forge/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  generateSTL,
  type GenerateResponse,
  type CableTrayParams,
  type VesaAdapterParams,
  type RouterMountParams,
} from "@/lib/api";
import type { ModelKind } from "@/types/forge";

// Visor 3D solo en cliente
const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

// Utilidad sliders
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ForgePage() {
  // Modelo seleccionado
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Cable Tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // VESA
  const [vesaSize, setVesaSize] = useState<75 | 100 | 200>(100);
  const [vesaHoleD, setVesaHoleD] = useState(5);
  const [vesaPlateT, setVesaPlateT] = useState(3);
  const [vesaTvScrewD, setVesaTvScrewD] = useState(4);
  const [vesaOffset, setVesaOffset] = useState(15);

  // Router Mount
  const [routerW, setRouterW] = useState(120);
  const [routerD, setRouterD] = useState(35);
  const [routerH, setRouterH] = useState(180);
  const [strapW, setStrapW] = useState(15);
  const [wallHoleD, setWallHoleD] = useState(5);
  const [filletR, setFilletR] = useState(4);
  const [routerT, setRouterT] = useState(3);

  // Estado de llamada
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Enlace STL si OK
  const stlUrl = useMemo(() => {
    if (result && result.status === "ok") return result.stl_url;
    return undefined;
  }, [result]);

  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);

    // ⚠️ Mientras el backend solo tenga Cable Tray:
    if (model !== "cable_tray") {
      setResult({
        status: "error",
        detail:
          "Este modelo aún no está activo en el backend. Próximamente se habilitará la generación.",
      });
      setBusy(false);
      setJsonOpen(true);
      return;
    }

    // Cable Tray payload (validado)
    const payload: CableTrayParams = {
      model: "cable_tray",
      width_mm: clamp(width, 10, 500),
      height_mm: clamp(height, 5, 300),
      length_mm: clamp(length, 30, 2000),
      thickness_mm: clamp(thickness, 1, 20),
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

      {/* Selector de modelo */}
      <div className="mt-6">
        <label className="block text-sm text-gray-600 mb-2">Modelo</label>
        <div className="inline-flex rounded-xl border p-1 bg-white">
          <button
            onClick={() => setModel("cable_tray")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              model === "cable_tray" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
            }`}
          >
            Cable Tray
          </button>
          <button
            onClick={() => setModel("vesa_adapter")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              model === "vesa_adapter" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
            }`}
          >
            VESA Adapter
          </button>
          <button
            onClick={() => setModel("router_mount")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              model === "router_mount" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
            }`}
          >
            Router Mount
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Panel parámetros */}
        <section className="lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 p-4 md:p-5 shadow-sm">
            <h2 className="font-medium text-gray-900">Parámetros</h2>

            {/* Cable Tray form */}
            {model === "cable_tray" && (
              <div className="space-y-4 mt-5">
                <Slider
                  label="Ancho (mm)"
                  min={10}
                  max={500}
                  value={width}
                  onChange={setWidth}
                />
                <Slider
                  label="Alto (mm)"
                  min={5}
                  max={300}
                  value={height}
                  onChange={setHeight}
                />
                <Slider
                  label="Longitud (mm)"
                  min={30}
                  max={2000}
                  value={length}
                  onChange={setLength}
                />
                <Slider
                  label="Espesor (mm)"
                  min={1}
                  max={20}
                  value={thickness}
                  onChange={setThickness}
                />
                <label className="inline-flex items-center gap-2 text-sm select-none">
                  <input
                    type="checkbox"
                    checked={ventilated}
                    onChange={(e) => setVentilated(e.target.checked)}
                  />
                  Con ranuras de ventilación
                </label>
              </div>
            )}

            {/* VESA form */}
            {model === "vesa_adapter" && (
              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-sm text-gray-600">Tamaño VESA (mm)</label>
                  <select
                    value={vesaSize}
                    onChange={(e) => setVesaSize(Number(e.target.value) as 75 | 100 | 200)}
                    className="mt-1 w-full rounded-lg border p-2 text-sm"
                  >
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <Slider
                  label="Diámetro agujeros (mm)"
                  min={3}
                  max={10}
                  value={vesaHoleD}
                  onChange={setVesaHoleD}
                />
                <Slider
                  label="Espesor placa (mm)"
                  min={2}
                  max={10}
                  value={vesaPlateT}
                  onChange={setVesaPlateT}
                />
                <Slider
                  label="Tornillo TV Ø (mm)"
                  min={3}
                  max={8}
                  value={vesaTvScrewD}
                  onChange={setVesaTvScrewD}
                />
                <Slider
                  label="Offset separación (mm)"
                  min={0}
                  max={40}
                  value={vesaOffset}
                  onChange={setVesaOffset}
                />
                <CalloutSoon />
              </div>
            )}

            {/* Router form */}
            {model === "router_mount" && (
              <div className="space-y-4 mt-5">
                <Slider label="Router ancho (mm)" min={60} max={300} value={routerW} onChange={setRouterW} />
                <Slider label="Router fondo (mm)" min={20} max={120} value={routerD} onChange={setRouterD} />
                <Slider label="Router alto (mm)" min={80} max={400} value={routerH} onChange={setRouterH} />
                <Slider label="Cinta/Brida ancho (mm)" min={8} max={30} value={strapW} onChange={setStrapW} />
                <Slider label="Agujero pared Ø (mm)" min={3} max={10} value={wallHoleD} onChange={setWallHoleD} />
                <Slider label="Radio chaflán (mm)" min={0} max={12} value={filletR} onChange={setFilletR} />
                <Slider label="Espesor (mm)" min={2} max={10} value={routerT} onChange={setRouterT} />
                <CalloutSoon />
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-3 pt-4">
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
                  rel="noreferrer"
                  className={`rounded-lg border px-3 py-2 text-center text-sm ${
                    stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
                  }`}
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
              <STLViewer url={stlUrl} height={520} background="#ffffff" modelColor="#3f444c" />
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

/* ---------- UI helpers ---------- */

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="range"
        />
        <span className="w-12 text-right tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function CalloutSoon() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Próximamente: generación STL desde el backend.
    </div>
  );
}
