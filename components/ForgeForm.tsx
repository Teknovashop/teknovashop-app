"use client";

import { useMemo, useState } from "react";
import STLViewer, { type Marker } from "@/components/STLViewer";
import ControlsPanel from "@/components/ControlsPanel";
import ModelSelector from "@/components/ModelSelector";
import {
  MODELS,
  type ModelId,
  type AnyState,
  CableTray,
  VesaAdapter,
  RouterMount,
  type CableTrayState,
  type VesaAdapterState,
  type RouterMountState,
} from "@/models/registry";

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
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) return { status: "error", message: data?.message || text || `HTTP ${res.status}` };
    const url = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Backend no devolvió stl_url" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}

export default function ForgeForm() {
  const [model, setModel] = useState<ModelId>("cable_tray");

  // estado por modelo (se conserva al cambiar de tab)
  const [cable, setCable]  = useState<CableTrayState>({ ...CableTray.defaults });
  const [vesa, setVesa]    = useState<VesaAdapterState>({ ...VesaAdapter.defaults });
  const [router, setRouter]= useState<RouterMountState>({ ...RouterMount.defaults });

  // agujeros libres
  const [holesMode, setHolesMode] = useState(true);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];

  // ✅ FIX: usa funciones del modelo concreto para evitar el error de tipos
  const box = useMemo(() => {
    switch (model) {
      case "cable_tray":
        return CableTray.toBox(cable);
      case "vesa_adapter":
        return VesaAdapter.toBox(vesa);
      case "router_mount":
        return RouterMount.toBox(router);
      default:
        return { length: 100, height: 3, width: 60, thickness: 3 };
    }
  }, [model, cable, vesa, router]);

  const markers: Marker[] = useMemo(() => {
    if (model === "vesa_adapter") {
      const auto = VesaAdapter.autoMarkers!(vesa);
      return [...auto, ...vesa.extraHoles];
    }
    if (model === "cable_tray") return cable.holes;
    if (model === "router_mount") return router.holes;
    return [];
  }, [model, cable.holes, router.holes, vesa.extraHoles, vesa.pattern, vesa.holeDiameter]);

  const onAddMarker = (m: Marker) => {
    if (!def.allowFreeHoles) return;
    if (model === "vesa_adapter") setVesa((s) => ({ ...s, extraHoles: [...s.extraHoles, m] }));
    if (model === "cable_tray")  setCable((s) => ({ ...s, holes: [...s.holes, m] }));
    if (model === "router_mount")setRouter((s) => ({ ...s, holes: [...s.holes, m] }));
  };

  const clearMarkers = () => {
    if (model === "vesa_adapter") setVesa((s) => ({ ...s, extraHoles: [] }));
    if (model === "cable_tray")  setCable((s) => ({ ...s, holes: [] }));
    if (model === "router_mount")setRouter((s) => ({ ...s, holes: [] }));
  };

  // sliders dinámicos
  const sliders = useMemo(() => {
    return def.sliders.map((s) => {
      const value =
        model === "cable_tray"   ? (cable as any)[s.key] :
        model === "vesa_adapter" ? (vesa as any)[s.key]  :
                                   (router as any)[s.key];
      return { ...s, value };
    });
  }, [def.sliders, model, cable, vesa, router]);

  const updateSlider = (key: string, v: number) => {
    if (model === "cable_tray")   setCable((s) => ({ ...s, [key]: v } as any));
    if (model === "vesa_adapter") setVesa((s)  => ({ ...s, [key]: v } as any));
    if (model === "router_mount") setRouter((s)=> ({ ...s, [key]: v } as any));
  };

  async function onGenerate() {
    setBusy(true); setError(null); setStlUrl(null);
    let payload: any;
    if (model === "cable_tray")   payload = CableTray.toPayload({ ...cable });
    if (model === "vesa_adapter") payload = VesaAdapter.toPayload({ ...vesa });
    if (model === "router_mount") payload = RouterMount.toPayload({ ...router });

    const res = await generateSTL(payload);
    if (res.status === "ok") setStlUrl(res.stl_url); else setError(res.message);
    setBusy(false);
  }

  const allowFree = def.allowFreeHoles;

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr,380px]">
      {/* Visor */}
      <section className="h-[calc(100svh-160px)] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <ModelSelector value={model} onChange={setModel} />
        <STLViewer
          background="#ffffff"
          box={box}
          markers={markers}
          holesMode={allowFree && true}
          addDiameter={holeDiameter}
          snapStep={snapStep}
          onAddMarker={onAddMarker}
        />
      </section>

      {/* Panel */}
      <ControlsPanel
        modelLabel={def.label}
        sliders={sliders}
        onChange={updateSlider}
        ventilated={model === "cable_tray" ? cable.ventilated : true}
        onToggleVentilated={(v) => model === "cable_tray" && setCable((s) => ({ ...s, ventilated: v }))}
        holesEnabled={allowFree && true}
        onToggleHoles={() => { /* Shift/Alt ya requerido; mantenemos activo si allowFree */ }}
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

      {/* Extra específico VESA (selector patrón) */}
      {model === "vesa_adapter" && (
        <div className="lg:col-span-2 -mt-4 px-4">
          <div className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Patrón VESA</span>
              {[75, 100, 200].map((p) => (
                <button
                  key={p}
                  onClick={() => setVesa((s) => ({ ...s, pattern: p as 75 | 100 | 200 }))}
                  className={`rounded-md border px-2 py-1 ${vesa.pattern === p ? "bg-black text-white border-black" : "bg-white"}`}
                >
                  {p} × {p}
                </button>
              ))}
              <span className="text-gray-500">Los 4 agujeros del patrón se generan automáticamente.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
