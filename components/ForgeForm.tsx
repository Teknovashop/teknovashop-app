"use client";

import { useMemo, useState } from "react";
import STLViewer, { type Marker } from "@/components/STLViewer";
import ControlsPanel from "@/components/ControlsPanel";
import ModelSelector from "@/components/ModelSelector";
import { MODELS, type ModelId } from "@/models/registry";

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

  // estado por modelo desde defaults del registry
  const initialState = useMemo(() => {
    const m: Record<ModelId, any> = {} as any;
    (Object.keys(MODELS) as ModelId[]).forEach((id) => {
      m[id] = { ...(MODELS[id] as any).defaults };
    });
    return m;
  }, []);
  const [state, setState] = useState<Record<ModelId, any>>(initialState);

  // agujeros
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  // export
  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];
  const cur = state[model];

  // caja del visor (en mm)
  const box = useMemo(() => def.toBox(cur), [def, cur]);

  // marcadores visibles (auto + libres)
  const markers: Marker[] = useMemo(() => {
    const auto = def.autoMarkers ? def.autoMarkers(cur) : [];
    const free: Marker[] =
      "extraHoles" in cur ? cur.extraHoles :
      "holes"      in cur ? cur.holes      : [];
    return [...auto, ...free];
  }, [def, cur]);

  // añadir marcador libre
  const onAddMarker = (m: Marker) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const next = { ...prev };
      const s = { ...next[model] };
      const hole: Marker = {
        x_mm: m.x_mm,
        y_mm: m.y_mm ?? 0,
        z_mm: m.z_mm,
        d_mm: m.d_mm ?? holeDiameter,
        axis: m.axis ?? "auto",
      };
      if ("extraHoles" in s) s.extraHoles = [...(s.extraHoles || []), hole];
      else if ("holes" in s) s.holes = [...(s.holes || []), hole];
      next[model] = s;
      return next;
    });
  };

  // editar / eliminar agujeros (lista en panel)
  const holesList: Marker[] =
    ("extraHoles" in cur && Array.isArray(cur.extraHoles)) ? cur.extraHoles :
    ("holes" in cur && Array.isArray(cur.holes)) ? cur.holes : [];

  const updateHole = (idx: number, patch: Partial<Marker>) => {
    setState((prev) => {
      const next = { ...prev };
      const s = { ...next[model] };
      const key = ("extraHoles" in s) ? "extraHoles" : ( "holes" in s ? "holes" : "" );
      if (!key) return prev;
      const arr = [...(s as any)[key]];
      arr[idx] = { ...arr[idx], ...patch };
      (s as any)[key] = arr;
      next[model] = s;
      return next;
    });
  };

  const removeHole = (idx: number) => {
    setState((prev) => {
      const next = { ...prev };
      const s = { ...next[model] };
      const key = ("extraHoles" in s) ? "extraHoles" : ( "holes" in s ? "holes" : "" );
      if (!key) return prev;
      (s as any)[key] = (s as any)[key].filter((_: any, i: number) => i !== idx);
      next[model] = s;
      return next;
    });
  };

  const clearMarkers = () => {
    setState((prev) => {
      const next = { ...prev };
      const s = { ...next[model] };
      if ("extraHoles" in s) s.extraHoles = [];
      if ("holes" in s) s.holes = [];
      next[model] = s;
      return next;
    });
  };

  // sliders dinámicos
  const sliders = useMemo(() => {
    return def.sliders.map((s) => ({ ...s, value: cur[s.key] }));
  }, [def.sliders, cur]);

  const updateSlider = (key: string, v: number) => {
    setState((prev) => ({ ...prev, [model]: { ...prev[model], [key]: v } }));
  };

  // generar STL (el backend acepta holes como (x, y, d) ó (x, y, z, d); él ignora z si no aplica)
  async function onGenerate() {
    setBusy(true); setError(null); setStlUrl(null);
    const payload = def.toPayload(state[model]);
    const res = await generateSTL(payload);
    if (res.status === "ok") setStlUrl(res.stl_url); else setError(res.message);
    setBusy(false);
  }

  const allowFree = def.allowFreeHoles;
  const ventilated = "ventilated" in cur ? !!cur.ventilated : true;
  const toggleVentilated = (v: boolean) => {
    if (!("ventilated" in cur)) return;
    setState((prev) => ({ ...prev, [model]: { ...prev[model], ventilated: v } }));
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr,380px]">
      {/* Visor */}
      <section className="h-[calc(100svh-160px)] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <ModelSelector value={model} onChange={setModel} />
        <STLViewer
          key={model}
          background="#ffffff"
          box={box}
          markers={markers}
          holesMode={allowFree}
          addDiameter={holeDiameter}
          snapStep={snapStep}
          onAddMarker={onAddMarker}
        />
      </section>

      {/* Panel + lista de agujeros simple */}
      <div>
        <ControlsPanel
          modelLabel={def.label}
          sliders={sliders}
          onChange={updateSlider}
          ventilated={ventilated}
          onToggleVentilated={toggleVentilated}
          holesEnabled={allowFree}
          onToggleHoles={() => {}}
          holeDiameter={holeDiameter}
          onHoleDiameter={setHoleDiameter}
          snapStep={snapStep}
          onSnapStep={setSnapStep}
          onClearHoles={clearMarkers}
          onGenerate={onGenerate}
          busy={busy}
          stlUrl={stlUrl || undefined}
          error={error || undefined}
        />

        {/* Agujeros (lista editable, no tapa el visor) */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Agujeros ({holesList.length})</h4>
          </div>
          {holesList.length === 0 ? (
            <p className="text-sm text-gray-500">No hay agujeros.</p>
          ) : (
            <div className="grid gap-2">
              {holesList.map((h, i) => (
                <div key={i} className="grid grid-cols-[repeat(5,1fr)_auto] items-center gap-2">
                  <label className="text-xs">X</label>
                  <input className="rounded border px-2 py-1 text-sm"
                    type="number" step={1} value={h.x_mm}
                    onChange={(e) => updateHole(i, { x_mm: Number(e.target.value) })}/>
                  <label className="text-xs">Y</label>
                  <input className="rounded border px-2 py-1 text-sm"
                    type="number" step={1} value={h.y_mm ?? 0}
                    onChange={(e) => updateHole(i, { y_mm: Number(e.target.value) })}/>
                  <label className="text-xs">Z</label>
                  <input className="rounded border px-2 py-1 text-sm"
                    type="number" step={1} value={h.z_mm}
                    onChange={(e) => updateHole(i, { z_mm: Number(e.target.value) })}/>
                  <label className="text-xs">Ø</label>
                  <input className="rounded border px-2 py-1 text-sm"
                    type="number" step={0.5} value={h.d_mm ?? holeDiameter}
                    onChange={(e) => updateHole(i, { d_mm: Number(e.target.value) })}/>
                  <button onClick={() => removeHole(i)}
                    className="justify-self-end rounded border px-2 py-1 text-sm hover:bg-gray-50">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
