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

export default function ForgePage() {
  // ------------ modelo activo ------------
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // ------------ parámetros ------------
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

  // ------------ estado petición ------------
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // ------------ URL STL y preview ------------
  const stlUrl = useMemo(() => (result?.status === "ok" ? (result as any).stl_url : undefined), [result]);

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
        params: {
          vesa_mm: vesa,
          thickness_mm: vesaThk,
          clearance_mm: vesaClear,
        },
      } as const;
    }
    return {
      kind: "router_mount",
      params: {
        router_width_mm: rWidth,
        router_depth_mm: rDepth,
        thickness_mm: rThk,
      },
    } as const;
  }, [model, width, height, length, thickness, ventilated, vesa, vesaThk, vesaClear, rWidth, rDepth, rThk]);

  // ------------ presets cable tray ------------
  const applyPreset = (k: "S" | "M" | "L") => {
    if (k === "S") { setWidth(40); setHeight(20); setLength(120); setThickness(2); }
    else if (k === "M") { setWidth(60); setHeight(25); setLength(180); setThickness(3); }
    else { setWidth(80); setHeight(35); setLength(240); setThickness(4); }
  };

  // ------------ generar ------------
  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);
    try {
      let payload: ForgePayload;
      if (model === "cable_tray") {
        payload = {
          model: "cable_tray",
          width_mm: clamp(width, 10, 500),
          height_mm: clamp(height, 5, 300),
          length_mm: clamp(length, 30, 2000),
          thickness_mm: clamp(thickness, 1, 20),
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
      setJsonOpen(true);
      if (res.status !== "ok") alert(`Backend: ${res.detail || (res as any).message || "error"}`);
    } catch (e: any) {
      alert(`Error inesperado: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!stlUrl) return;
    try { await navigator.clipboard.writeText(stlUrl); alert("Enlace copiado ✅"); }
    catch { alert("No se pudo copiar el enlace"); }
  };

  // ------------ UI helpers ------------
  const Label = (p: { children: React.ReactNode }) => <label className="block text-sm text-gray-700">{p.children}</label>;
  const Number = (p: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) => (
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
          {/* Lado izquierdo: configurador */}
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {/* tabs */}
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
                    model === t.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* parámetros por modelo */}
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
                  <div>
                    <Label>Ancho (mm)</Label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={10} max={500} value={width} onChange={(e) => setWidth(+e.target.value)} className="w-full" />
                      <span className="w-12 text-right tabular-nums">{width}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Alto (mm)</Label>
                    <div classNa
