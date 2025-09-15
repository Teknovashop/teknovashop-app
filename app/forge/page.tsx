// /app/forge/page.tsx
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

// Cargamos el visor 3D solo en cliente
const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

// Utilidad para clamped sliders
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ForgePage() {
  /** ----------------- Selección de modelo ----------------- */
  const [model, setModel] = useState<ModelKind>("cable_tray");

  /** ----------------- Parámetros por modelo ----------------- */
  // Cable tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // VESA
  const [vesa, setVesa] = useState(100);             // 75 / 100 / 200 ...
  const [vesaThk, setVesaThk] = useState(4);
  const [vesaHole, setVesaHole] = useState(5);
  const [vesaClear, setVesaClear] = useState(1);

  // Router mount
  const [rWidth, setRWidth] = useState(120);
  const [rDepth, setRDepth] = useState(80);
  const [rThk, setRThk] = useState(4);
  const [rSlots, setRSlots] = useState(true);
  const [rHole, setRHole] = useState(4);

  /** ----------------- Estado de la llamada ----------------- */
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Enlace STL si OK
  const stlUrl = useMemo(() => {
    return result && result.status === "ok" ? result.stl_url : undefined;
  }, [result]);

  /** ----------------- Presets rápidos (solo cable_tray) ----------------- */
  const applyPreset = (kind: "S" | "M" | "L") => {
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
  };

  /** ----------------- Construcción del payload y llamada ----------------- */
  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);

    let payload: ForgePayload;

    if (model === "cable_tray") {
      const w = clamp(width, 10, 500);
      const h = clamp(height, 5, 300);
      const l = clamp(length, 30, 2000);
      const t = clamp(thickness, 1, 20);

      payload = {
        model: "cable_tray",
        width_mm: w,
        height_mm: h,
        length_mm: l,
        thickness_mm: t,
        ventilated,
      } satisfies CableTrayPayload;
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

  const copyLink = async () => {
    if (!stlUrl) return;
    try {
      await navigator.clipboard.writeText(stlUrl);
      alert("Enlace copiado al portapapeles ✅");
    } catch {
      alert("No se pudo copiar el enlace");
    }
  };

  /** ----------------- UI auxiliares ----------------- */
  const Label = (p: { children: React.ReactNode }) => (
    <label className="block text-sm text-gray-600">{p.children}</label>
  );
  const Number = (p: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type="number"
      value={p.value}
      min={p.min}
      max={p.max}
      step={p.step ?? 1}
      onChange={(e) => p.onChange(parseFloat(e.target.value))}
      className="w-28 rounded-lg border px-2 py-1 text-sm"
    />
  );

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
            {/* Selector de modelo */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium text-gray-900">Parámetros</h2>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelKind)}
                className="rounded-lg border px-3 py-1.5 text-sm"
                aria-label="Selecciona el tipo de pieza"
              >
                <option value="cable_tray">Cable tray</option>
                <option value="vesa_adapter">VESA adapter</option>
                <option value="router_mount">Router mount</option>
              </select>
            </div>

            {/* ---- Cable tray ---- */}
            {model === "cable_tray" && (
              <>
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
                    <Label>
                      Ancho <span className="text-gray-400">(mm)</span>
                    </Label>
