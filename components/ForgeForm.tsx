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

    // IMPORTANT: devolvemos una URL estable de descarga (proxy)
    // evitamos abrir directamente la firmada de supabase para no caer en "requested path is invalid"
    const key = data?.key || data?.path || data?.stl_path; // el backend devuelve la clave guardada (p.e. "cable_tray/xxxx.stl")
    const stableUrl = key ? `/api/forge/download?p=${encodeURIComponent(key)}` : null;

    // fallback por si solo viniera stl_url
    const direct = data?.stl_url || data?.url || data?.data?.stl_url || null;
    const url = stableUrl ?? direct;

    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Backend no devolvió ruta del STL" };
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

  // agujeros: diámetro default (cuando añades con ALT/Shift+clic) y snap
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];
  const cur = state[model];

  // caja para dibujar la pieza aunque aún no haya STL
  const box = useMemo(() => def.toBox(cur), [def, cur]);

  // lista visible de marcadores = auto (si el modelo define) + libres (del estado)
  const markers: Marker[] = useMemo(() => {
    const auto: Marker[] = def.autoMarkers ? def.autoMarkers(cur) : [];
    const free: Marker[] =
      "extraHoles" in cur ? (cur.extraHoles as Marker[]) :
      "holes"      in cur ? (cur.holes as Marker[])      : [];
    // dejamos que los libres pisen a los auto si coinciden
    const k = (m: Marker) => `${m.x_mm}|${m.y_mm ?? 0}|${m.z_mm}|${m.d_mm ?? holeDiameter}`;
    const seen = new Set<string>();
    const out: Marker[] = [];
    for (const m of auto)  { const kk = k(m); if (!seen.has(kk)) { seen.add(kk); out.push(m); } }
    for (const m of free)  { const kk = k(m); if (seen.has(kk)) { const i = out.findIndex(o => k(o) === kk); if (i >= 0) out[i] = m; } else { out.push(m); seen.add(kk); } }
    return out;
  }, [def, cur, holeDiameter]);

  // cuando el visor devuelve los marcadores editados: guardamos solo los "libres"
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

  // lista “editable” para el panel derecho
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
  const sliders = useMemo(() => {
    return def.sliders.map((s) => ({ ...s, value: cur[s.key] }));
  }, [def.sliders, cur]);

  const updateSlider = (key: string, v: number) => {
    setState((prev) => ({ ...prev, [model]: { ...prev[model], [key]: v } }));
  };

  // generar STL con el estado actual (incluye agujeros libres)
  async function onGenerate() {
    setBusy(true); setError(null); setStlUrl(null);
    // IMPORTANT: el backend debe devolver también "key" (ruta dentro del bucket)
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
          // mostrar siempre el sólido “paramétrico” para que no haya lienzo vacío
          box={box}
          // cámara/UX mejoradas por defecto
          defaultAxis="free"
          defaultClipping={false}
          defaultClipMM={0}
          // agujeros visibles y editables
          markers={markers}
          onMarkersChange={handleMarkersChange}
          // interacción
          snapMM={snapStep}
          addDiameter={holeDiameter}
        />
      </section>

      {/* Panel derecho */}
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
        // NUEVO: edición numérica de agujeros en el panel (profesional y sin tapar el visor)
        holes={holesList}
        onUpdateHole={(idx, patch) => updateHole(idx, patch)}
        onRemoveHole={removeHole}
      />
    </div>
  );
}
