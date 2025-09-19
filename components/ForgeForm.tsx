"use client";

import { useMemo, useState } from "react";
import STLViewer, { type Marker } from "@/components/STLViewer";
import ControlsPanel from "@/components/ControlsPanel";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

type GenerateOk = { status: "ok"; stl_url: string };
type GenerateErr = { status: "error"; message: string };
type GenerateResponse = GenerateOk | GenerateErr;

async function generateSTL(payload: any): Promise<GenerateResponse> {
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
    const url = data?.stl_url || data?.url || data?.data?.stl_url || null;
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
  const [model] = useState<ModelKind>("cable_tray");
  const [cfg, setCfg] = useState<CableTrayState>({ ...DEFAULTS });

  // agujeros
  const [holesMode, setHolesMode] = useState(true);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  // export
  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<CableTrayState>) => setCfg((s) => ({ ...s, ...patch }));

  const addMarker = (m: Marker) => setCfg((s) => ({ ...s, holes: [...s.holes, m] }));
  const clearMarkers = () => setCfg((s) => ({ ...s, holes: [] }));

  const box = useMemo(() => ({
    length: cfg.length,
    height: cfg.height,
    width: cfg.width,
    thickness: cfg.thickness,
  }), [cfg.length, cfg.height, cfg.width, cfg.thickness]);

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
    if (res.status === "ok") setStlUrl(res.stl_url); else setError(res.message);
    setBusy(false);
  }

  const sliders = [
    { key: "width", label: "Ancho (mm)", min: 40, max: 200, step: 1, value: cfg.width },
    { key: "height", label: "Alto (mm)", min: 15, max: 120, step: 1, value: cfg.height },
    { key: "length", label: "Longitud (mm)", min: 80, max: 300, step: 1, value: cfg.length },
    { key: "thickness", label: "Espesor (mm)", min: 2, max: 8, step: 0.5, value: cfg.thickness },
  ];

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr,380px]">
      {/* Visor a la izquierda */}
      <section className="h-[calc(100svh-160px)] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <STLViewer
          background="#ffffff"
          box={box}
          markers={cfg.holes}
          holesMode={holesMode}        // requiere Shift/Alt para colocar
          addDiameter={holeDiameter}
          snapStep={snapStep}
          onAddMarker={addMarker}
        />
      </section>

      {/* Panel a la derecha */}
      <ControlsPanel
        modelLabel="Cable Tray"
        sliders={sliders}
        onChange={(k, v) => update({ [k]: v } as any)}
        ventilated={cfg.ventilated}
        onToggleVentilated={(v) => update({ ventilated: v })}
        holesEnabled={holesMode}
        onToggleHoles={setHolesMode}
        holeDiameter={holeDiameter}
        onHoleDiameter={setHoleDiameter}
        snapStep={snapStep}
        onSnapStep={setSnapStep}
        onClearHoles={clearMarkers}
        onGenerate={onGenerate}
        busy={busy}
        stlUrl={stlUrl}
        error={error}
      />
    </div>
  );
}
