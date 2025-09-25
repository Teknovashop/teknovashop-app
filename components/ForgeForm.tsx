"use client";

import { useMemo, useState } from "react";
import STLViewerPro, { type Marker } from "@/components/STLViewerPro";
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
    if (!res.ok) {
      return { status: "error", message: data?.message || text || `HTTP ${res.status}` };
    }
    // Respetamos tu backend: usamos la URL que ya devuelve
    const url = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Backend no devolvió stl_url" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}

export default function ForgeForm() {
  const [model, setModel] = useState<ModelId>("cable_tray");

  // estado inicial por modelo
  const initialState = useMemo(() => {
    const m: Record<ModelId, any> = {} as any;
    (Object.keys(MODELS) as ModelId[]).forEach((id) => {
      m[id] = { ...(MODELS[id] as any).defaults };
    });
    return m;
  }, []);
  const [state, setState] = useState<Record<ModelId, any>>(initialState);

  // agujeros: diámetro default y snap
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];
  const cur = state[model];

  // caja para que el visor no quede vacío nunca
  const box = useMemo(() => def.toBox(cur), [def, cur]);

  // markers visibles = auto + libres (libres pisan a auto si coinciden)
  const markers: Marker[] = useMemo(() => {
    const auto: Marker[] = def.autoMarkers ? def.autoMarkers(cur) : [];
    const free: Marker[] =
      "extraHoles" in cur ? (cur.extraHoles as Marker[]) :
      "holes"      in cur ? (cur.holes as Marker[])      : [];
    const k = (m: Marker) => `${m.x_mm}|${m.y_mm ?? 0}|${m.z_mm}|${m.d_mm ?? holeDiameter}`;
    const seen = new Set<string>();
    const out: Marker[] = [];
    for (const m of auto)  { const kk = k(m); if (!seen.has(kk)) { seen.add(kk); out.push(m); } }
    for (const m of free)  { const kk = k(m); const i = out.findIndex(o => k(o) === kk); if (i >= 0) out[i] = m; else { out.push(m); seen.add(kk); } }
    return out;
  }, [def, cur, holeDiameter]);

  // el visor devuelve la lista completa => guardamos SOLO los libres (auto se recalcula)
  const handleMarkersChange = (nextMarkers: Marker[]) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };
      const auto = def.autoMarkers ? def.autoMarkers(cur) : [];
      const key = (m: Marker) => `${m.x_mm}|${m.y_mm ?? 0}|${m.z_mm}|${m.d_mm ?? holeDiameter}`;
      const autoSet = new Set(auto.map(key));
      const free = nextMarkers.filter((m) => !autoSet.has(key(m)));
      if ("extraHoles" in s) s.extraHoles = free;
      else if ("holes" in s) s.holes = free;
      copy[model] = s;
      return copy;
    });
  };

  // lista editable para el panel
  const holesList: Marker[] =
    "extraHoles" in cur ? (cur.extraHoles as Marker[]) :
    "holes"      in cur ? (cur.holes as Marker[])      : [];

  const updateHole = (idx: number, patch: Partial<Marker>) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };
      const list: Marker[] =
        "extraHoles" in s ? [...(s.extraHoles as Marker[])] :
        "holes"      in s ? [...(s.holes as Marker[])]      : [];
      if (!list[idx]) return prev;
      list[idx] = {
        x_mm: list[idx].x_mm,
        y_mm: list[idx].y_mm ?? 0,
        z_mm: list[idx].z_mm,
        d_mm: list[idx].d_mm ?? holeDiameter,
        ...patch,
      };
      if ("extraHoles" in s) s.extraHoles = list;
      else if ("holes" in s) s.holes = list;
      copy[model] = s;
      return copy;
    });
  };

  const removeHole = (idx: number) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };
      const list: Marker[] =
        "extraHoles" in s ? [...(s.extraHoles as Marker[])] :
        "holes"      in s ? [...(s.holes as Marker[])]      : [];
      list.splice(idx, 1);
      if ("extraHoles" in s) s.extraHoles = list;
      else if ("holes" in s) s.holes = list;
      copy[model] = s;
      return copy;
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
  const sliders = useMemo(() => def.sliders.map((s) => ({ ...s, value: cur[s.key] })), [def.sliders, cur]);
  const updateSlider = (key: string, v: number) => {
    setState((prev) => ({ ...prev, [model]: { ...prev[model], [key]: v } }));
  };

  async function onGenerate() {
    setBusy(true); setError(null); setStlUrl(null);
    const payload = def.toPayload(state[model]);
    const res = await generateSTL(payload);
    if (res.status === "ok") setStlUrl(res.stl_url);
    else setError(res.message);
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
        <STLViewerPro
          key={model}
          box={box}
          markers={markers}
          onMarkersChange={handleMarkersChange}
          snapMM={snapStep}
          addDiameter={holeDiameter}
        />
      </section>

      {/* Panel */}
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
        stlUrl={stlUrl}
        error={error}
        // edición numérica sin panel flotante:
        holes={holesList}
        onUpdateHole={(idx, patch) => updateHole(idx, patch)}
        onRemoveHole={removeHole}
      />
    </div>
  );
}
