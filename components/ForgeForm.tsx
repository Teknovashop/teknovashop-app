"use client";

import { useState } from "react";
import { generateSTL, type GenerateResponse } from "@/lib/api";
import STLViewer from "@/components/STLViewer";

export default function ForgeForm() {
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [loading, setLoading] = useState(false);
  const [json, setJson] = useState<GenerateResponse | null>(null);
  const [stlUrl, setStlUrl] = useState<string | undefined>(undefined);

  async function onSubmit() {
    setLoading(true);
    setStlUrl(undefined);
    setJson(null);
    try {
      const payload = {
        model: "cable_tray" as const,
        width_mm: width,
        height_mm: height,
        length_mm: length,
        thickness_mm: thickness,
        ventilated,
      };
      const out = await generateSTL(payload);
      setJson(out);
      if (out.status === "ok") setStlUrl(out.stl_url);
    } catch (err: any) {
      setJson({ status: "error", detail: err?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[420px,1fr]">
      <div className="rounded-2xl border border-gray-200 p-5 space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium">Modelo</label>
          <select className="w-full rounded-lg border-gray-300" value="cable_tray" disabled>
            <option value="cable_tray">Cable Tray</option>
          </select>
          <p className="text-xs text-gray-500">VESA y Router Mount llegan en el siguiente paso.</p>
        </div>

        <Range label={`Ancho (mm): ${width}`} min={30} max={120} step={1} value={width} onChange={setWidth} />
        <Range label={`Alto (mm): ${height}`} min={15} max={60} step={1} value={height} onChange={setHeight} />
        <Range label={`Longitud (mm): ${length}`} min={120} max={400} step={5} value={length} onChange={setLength} />
        <Range label={`Espesor (mm): ${thickness}`} min={2} max={10} step={1} value={thickness} onChange={setThickness} />

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={ventilated} onChange={(e) => setVentilated(e.target.checked)} className="size-4" />
          <span className="text-sm">Con ranuras de ventilación</span>
        </label>

        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-gray-900 text-white py-3 font-medium hover:bg-black disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar STL"}
        </button>

        {stlUrl && (
          <a href={stlUrl} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline">
            Descargar STL (en Supabase)
          </a>
        )}

        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer select-none">Ver respuesta JSON</summary>
          <pre className="mt-2 rounded-lg bg-gray-50 p-3 overflow-auto">
{JSON.stringify(json ?? {}, null, 2)}
          </pre>
        </details>
      </div>

      <div className="rounded-2xl">
        <STLViewer url={stlUrl} />
      </div>
    </div>
  );
}

function Range(props: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{props.label}</label>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-gray-900"
      />
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>{props.min}</span><span>{props.max}</span>
      </div>
    </div>
  );
}
