"use client";

import { useMemo, useState } from "react";
import STLViewer, { type Marker } from "@/components/STLViewer";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

type GenerateOk = { status: "ok"; stl_url: string };
type GenerateErr = { status: "error"; message: string };
type GenerateResponse = GenerateOk | GenerateErr;

type Payload = {
  model_id: ModelKind;
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated?: boolean;
  holes?: Marker[];
};

async function generateSTL(payload: Payload): Promise<GenerateResponse> {
  try {
    const res = await fetch("/api/forge/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { status: "error", message: text || `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    const url =
      data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Respuesta inesperada del backend" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}

type CableTrayState = {
  width: number;
  height: number;
  length: number;
  thickness: number;
  ventilated: boolean;
  holes: Marker[];
};

const DEFAULTS: CableTrayState = {
  width: 60,
  height: 25,
  length: 180,
  thickness: 3,
  ventilated: true,
  holes: [],
};

export default function ForgeForm() {
  const [model, setModel] = useState<ModelKind>("cable_tray");
  const [cfg, setCfg] = useState<CableTrayState>({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<CableTrayState>) =>
    setCfg((s) => ({ ...s, ...patch }));

  const addMarker = (m: Marker) => {
    setCfg((s) => ({ ...s, holes: [...s.holes, m] }));
  };

  const clearMarkers = () => setCfg((s) => ({ ...s, holes: [] }));

  const box = useMemo(
    () => ({
      length: cfg.length,
      height: cfg.height,
      width: cfg.width,
      thickness: cfg.thickness, // necesario para extrusión + agujeros en visor
    }),
    [cfg.length, cfg.height, cfg.width, cfg.thickness]
  );

  async function onGenerate() {
    setBusy(true);
    setError(null);
    setStlUrl(null);
    const res = await generateSTL({
      model_id: model,
      width_mm: cfg.width,
      height_mm: cfg.height,
      length_mm: cfg.length,
      thickness_mm: cfg.thickness,
      ventilated: cfg.ventilated,
      holes: cfg.holes,
    });
    if (res.status === "ok") {
      setStlUrl(res.stl_url);
      setToast("STL listo ✅");
    } else {
      setError(res.message);
      setToast("Error al generar");
    }
    setBusy(false);
    setTimeout(() => setToast(null), 1600);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6">
      {/* PANEL IZQUIERDO */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Tabs de módulos */}
        <div className="mb-4 flex gap-2">
          {[
            { id: "cable_tray", label: "Cable Tray" },
            { id: "vesa_adapter", label: "VESA (próximamente)", disabled: true },
            { id: "router_mount", label: "Router (próx.)", disabled: true },
          ].map((t) => (
            <button
              key={t.id}
              disabled={!!t.disabled}
              onClick={() => setModel(t.id as ModelKind)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition
                ${model === t.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                ${t.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sliders */}
        {[
          { k: "width",  label: "Ancho (mm)",     min: 40,  max: 200, step: 1, value: cfg.width },
          { k: "height", label: "Alto (mm)",      min: 15,  max: 120, step: 1, value: cfg.height },
          { k: "length", label: "Longitud (mm)",  min: 80,  max: 300, step: 1, value: cfg.length },
          { k: "thickness", label: "Espesor (mm)",min: 2,   max: 8,   step: 0.5, value: cfg.thickness },
        ].map((f) => (
          <div key={f.k} className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">{f.label}</label>
              <span className="text-sm tabular-nums text-gray-600">{f.value}</span>
            </div>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={f.value}
              onChange={(e) => update({ [f.k]: Number(e.target.value) } as any)}
              className="w-full"
            />
          </div>
        ))}

        {/* Opciones */}
        <label className="inline-flex select-none items-center gap-2 text-sm mb-2">
          <input
            type="checkbox"
            checked={cfg.ventilated}
            onChange={(e) => update({ ventilated: e.target.checked })}
          />
          Con ranuras de ventilación
        </label>

        {/* Agujeros */}
        <div className="mt-4 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Modo “agujeros” (click en el visor)</label>
            <button
              onClick={clearMarkers}
              className="ml-auto rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
            >
              Borrar agujeros
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Los agujeros se añaden haciendo click sobre el plano. Diámetro fijo a 5&nbsp;mm en este MVP.
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onGenerate}
            disabled={busy}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Generando..." : "Generar STL"}
          </button>
          {stlUrl && (
            <a
              href={stlUrl}
              className="rounded-xl border px-4 py-2 text-sm"
              target="_blank"
              rel="noreferrer"
            >
              Descargar STL
            </a>
          )}
        </div>
      </section>

      {/* PANEL DERECHO (visor grande) */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm h-[calc(100svh-160px)]">
        <STLViewer
          background="#ffffff"
          box={box}
          markers={cfg.holes}
          holesMode={true}
          addDiameter={5}
          onAddMarker={addMarker}
        />
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
