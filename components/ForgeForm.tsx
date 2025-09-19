"use client";

import { useMemo, useState } from "react";
import STLViewer, { type Marker } from "@/components/STLViewer";
import ControlsDrawer from "@/components/ControlsDrawer";

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
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [model, setModel] = useState<ModelKind>("cable_tray");
  const [cfg, setCfg] = useState<CableTrayState>({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<CableTrayState>) =>
    setCfg((s) => ({ ...s, ...patch }));

  const addMarker = (m: Marker) => setCfg((s) => ({ ...s, holes: [...s.holes, m] }));
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

  const sliders = [
    { key: "width", label: "Ancho (mm)", min: 40, max: 200, step: 1, value: cfg.width },
    { key: "height", label: "Alto (mm)", min: 15, max: 120, step: 1, value: cfg.height },
    { key: "length", label: "Longitud (mm)", min: 80, max: 300, step: 1, value: cfg.length },
    { key: "thickness", label: "Espesor (mm)", min: 2, max: 8, step: 0.5, value: cfg.thickness },
  ];

  return (
    <div className="relative h-[calc(100svh-140px)] w-full">
      {/* Botonera flota */}
      <div className="pointer-events-auto absolute left-4 top-4 z-30 flex gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-xl bg-white/90 px-3 py-2 text-sm font-medium shadow ring-1 ring-gray-200 backdrop-blur hover:bg-white"
        >
          Controles
        </button>
        <button
          onClick={clearMarkers}
          className="rounded-xl bg-white/90 px-3 py-2 text-sm shadow ring-1 ring-gray-200 backdrop-blur hover:bg-white"
        >
          Borrar agujeros
        </button>
        {stlUrl && (
          <a
            href={stlUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-white/90 px-3 py-2 text-sm shadow ring-1 ring-gray-200 backdrop-blur hover:bg-white"
          >
            Descargar STL
          </a>
        )}
      </div>

      {/* Visor a pantalla casi completa */}
      <div className="absolute inset-0">
        <STLViewer
          height={undefined}          // usa el alto del contenedor
          background="#ffffff"
          box={box}
          markers={cfg.holes}
          holesMode={true}
          addDiameter={5}
          snapStep={1}
          onAddMarker={addMarker}
        />
      </div>

      {/* Drawer de controles */}
      <ControlsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sliders={sliders}
        onChange={(k, v) => update({ [k]: v } as any)}
        ventilated={cfg.ventilated}
        onToggleVentilated={(v) => update({ ventilated: v })}
        onClearHoles={clearMarkers}
        onGenerate={onGenerate}
        busy={busy}
        stlUrl={stlUrl}
        error={error}
      />

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
