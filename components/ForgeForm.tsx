// components/ForgeForm.tsx
"use client";

import { useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";

export type ForgeFormProps = {
  /** slug del modelo en snake_case (p.ej. "vesa_adapter") */
  initialModel?: string;
};

type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  fillet_mm: number;
  holes: { x: number; y: number; r: number }[];
  textOps: { text: string; size: number; depth: number }[];
  arrayOps: { count: number; dx: number; dy: number }[];
};

const API_BASE = (
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/+$/, "");

export default function ForgeForm({ initialModel = "vesa_adapter" }: ForgeFormProps) {
  const [params, setParams] = useState<Params>({
    length_mm: 120,
    width_mm: 100,
    height_mm: 60,
    thickness_mm: 3,
    fillet_mm: 0,
    holes: [],
    textOps: [],
    arrayOps: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  const canGenerate = !!API_BASE;
  const update = (k: keyof Params, v: any) => setParams((p) => ({ ...p, [k]: v }));

  async function generate() {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: initialModel, params }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url = data.url || data.public_url || data.signed_url;
      if (!url) throw new Error("Respuesta sin URL de descarga");
      setStlUrl(url);
    } catch (e: any) {
      setError(e?.message || "Error generando STL");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Columna izquierda: configurador */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white/60 p-4 shadow-sm backdrop-blur md:bg-white/40">
          <h2 className="mb-4 text-xl font-semibold">Configurador</h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-neutral-600">Largo (mm)</label>
            <input className="rounded-lg border px-3 py-2" type="number" value={params.length_mm} onChange={(e)=>update("length_mm", Number(e.target.value))} />
            <label className="text-sm text-neutral-600">Ancho (mm)</label>
            <input className="rounded-lg border px-3 py-2" type="number" value={params.width_mm} onChange={(e)=>update("width_mm", Number(e.target.value))} />
            <label className="text-sm text-neutral-600">Alto (mm)</label>
            <input className="rounded-lg border px-3 py-2" type="number" value={params.height_mm} onChange={(e)=>update("height_mm", Number(e.target.value))} />
            <label className="text-sm text-neutral-600">Grosor (mm)</label>
            <input className="rounded-lg border px-3 py-2" type="number" value={params.thickness_mm} onChange={(e)=>update("thickness_mm", Number(e.target.value))} />
            <label className="text-sm text-neutral-600">Fillet (mm)</label>
            <input className="rounded-lg border px-3 py-2" type="number" value={params.fillet_mm} onChange={(e)=>update("fillet_mm", Number(e.target.value))} />
          </div>

          {/* Operaciones rápidas */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={()=>update("holes", [...params.holes, { x: 0, y: 0, r: 3 }])}>+ Cutout</button>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={()=>update("textOps", [...params.textOps, { text: "FORGE", size: 10, depth: 1 }])}>+ Text</button>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={()=>update("arrayOps", [...params.arrayOps, { count: 3, dx: 10, dy: 0 }])}>+ Array</button>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={()=>update("fillet_mm", Math.max(0, params.fillet_mm + 1))}>+ Round</button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={generate}
              disabled={!canGenerate || busy}
              className="rounded-xl bg-[#2663EB] px-4 py-2 text-white shadow-sm hover:bg-[#1f55c8] disabled:opacity-60"
            >
              {busy ? "Generando…" : "Generar STL"}
            </button>
            {!canGenerate && (
              <span className="text-xs text-neutral-500">
                Configura <code>NEXT_PUBLIC_BACKEND_URL</code> o <code>NEXT_PUBLIC_FORGE_API_URL</code>
              </span>
            )}
            {stlUrl && <a className="text-sm text-[#2663EB] underline" href={stlUrl} target="_blank">Abrir STL</a>}
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Columna derecha: visor */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-900/2 p-3">
          <STLViewerPro url={stlUrl} className="h-[520px] w-full rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}
