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
    try {
      data = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      return {
        status: "error",
        message: data?.message || text || `HTTP ${res.status}`,
      };
    }
    const url = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Backend no devolvió stl_url" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}

export default function ForgeForm() {
  const [model, setModel] = useState<ModelId>("cable_tray");

  // Estado por modelo desde defaults del registry
  const initialState = useMemo(() => {
    const m: Record<ModelId, any> = {} as any;
    (Object.keys(MODELS) as ModelId[]).forEach((id) => {
      m[id] = { ...(MODELS[id] as any).defaults };
    });
    return m;
  }, []);
  const [state, setState] = useState<Record<ModelId, any>>(initialState);

  // Parámetros comunes (UI)
  const [holeDiameter, setHoleDiameter] = useState<number>(5);
  const [snapStep, setSnapStep] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];
  const cur = state[model];

  // Caja para el visor (centra cámara/guías)
  const box = useMemo(() => def.toBox(cur), [def, cur]);

  // Marcadores visibles (auto + libres)
  const markers: Marker[] = useMemo(() => {
    const auto = def.autoMarkers ? def.autoMarkers(cur) : [];
    const free: Marker[] =
      "extraHoles" in cur ? cur.extraHoles :
      "holes" in cur ? cur.holes : [];
    // preferimos que free pise a auto si coinciden
    const key = (m: Marker) => `${m.x_mm}|${m.y_mm ?? 0}|${m.z_mm}|${m.d_mm ?? holeDiameter}`;
    const seen = new Set<string>();
    const out: Marker[] = [];
    [...auto, ...free].forEach((m) => {
      const k = key(m);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(m);
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, cur, holeDiameter]);

  // El visor Pro devuelve SIEMPRE la lista completa de marcadores visibles.
  // Aquí retenemos únicamente los "libres" (descartando los automáticos).
  const handleMarkersChange = (nextMarkers: Marker[]) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };

      const auto = def.autoMarkers ? def.autoMarkers(cur) : [];
      const key = (m: Marker) => `${m.x_mm}|${m.y_mm ?? 0}|${m.z_mm}|${m.d_mm ?? holeDiameter}`;
      const autoSet = new Set(auto.map(key));

      // Tomamos los que no están en los auto (son los libres)
      const free = nextMarkers
        .filter((m) => !autoSet.has(key(m)))
        .map((m) => ({
          ...m,
          // Asegura Ø por si el visor no lo puso
          d_mm: m.d_mm ?? holeDiameter,
        }));

      if ("extraHoles" in s) s.extraHoles = free;
      else if ("holes" in s) s.holes = free;

      copy[model] = s;
      return copy;
    });
  };

  // Borrar todos los libres
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

  // Sliders dinámicos
  const sliders = useMemo(() => {
    return def.sliders.map((s) => ({
      ...s,
      value: cur[s.key],
    }));
  }, [def.sliders, cur]);

  const updateSlider = (key: string, v: number) => {
    setState((prev) => ({ ...prev, [model]: { ...prev[model], [key]: v } }));
  };

  // Toggle ventilated (si aplica al modelo)
  const ventilated = "ventilated" in cur ? !!cur.ventilated : true;
  const toggleVentilated = (v: boolean) => {
    if (!("ventilated" in cur)) return;
    setState((prev) => ({ ...prev, [model]: { ...prev[model], ventilated: v } }));
  };

  // Edición numérica de agujeros (lista en panel)
  const holesList: Marker[] = useMemo(() => {
    if ("extraHoles" in cur) return cur.extraHoles || [];
    if ("holes" in cur) return cur.holes || [];
    return [];
  }, [cur]);

  const updateHole = (idx: number, patch: Partial<Marker>) => {
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };
      const list: Marker[] =
        "extraHoles" in s ? [...(s.extraHoles || [])] :
        "holes" in s ? [...(s.holes || [])] : [];
      if (!list[idx]) return prev;
      list[idx] = {
        ...list[idx],
        ...patch,
      };
      if ("extraHoles" in s) s.extraHoles = list;
      else if ("holes" in s) s.holes = list;
      copy[model] = s;
      return copy;
    });
  };

  const removeHole = (idx: number) => {
    setState((prev) => {
      const copy = { ...prev };
      const s = { ...copy[model] };
      const list: Marker[] =
        "extraHoles" in s ? [...(s.extraHoles || [])] :
        "holes" in s ? [...(s.holes || [])] : [];
      if (idx < 0 || idx >= list.length) return prev;
      list.splice(idx, 1);
      if ("extraHoles" in s) s.extraHoles = list;
      else if ("holes" in s) s.holes = list;
      copy[model] = s;
      return copy;
    });
  };

  // Generar STL
  async function onGenerate() {
    setBusy(true);
    setError(null);
    setStlUrl(null);

    // El payload lo define cada modelo (incluye agujeros "libres")
    const payload = def.toPayload(state[model]);
    const res = await generateSTL(payload);
    if (res.status === "ok") setStlUrl(res.stl_url);
    else setError(res.message);

    setBusy(false);
  }

  const allowFree = def.allowFreeHoles;

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr,380px]">
      {/* VISOR */}
      <section className="h-[calc(100svh-160px)] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <ModelSelector value={model} onChange={setModel} />
        <STLViewerPro
          key={model}
          box={box}
          markers={markers}
          onMarkersChange={handleMarkersChange}
          snapMM={snapStep}
          // El Pro ya incluye:
          // - bloqueo por ejes (X/Y/Z y libre)
          // - plano de clipping (slider)
          // - reglas 3D con ticks y texto
          // - creación de agujeros con ALT/Shift + clic
        />
      </section>

      {/* PANEL DERECHA */}
      <ControlsPanel
        modelLabel={def.label}
        sliders={sliders}
        onChange={updateSlider}
        ventilated={ventilated}
        onToggleVentilated={toggleVentilated}
        holesEnabled={allowFree}
        onToggleHoles={() => {}} // El Pro ya controla la creación; dejamos el switch como indicador
        holeDiameter={holeDiameter}
        onHoleDiameter={setHoleDiameter}
        snapStep={snapStep}
        onSnapStep={setSnapStep}
        onClearHoles={clearMarkers}
        onGenerate={onGenerate}
        busy={busy}
        stlUrl={stlUrl}
        error={error}
        // NUEVO: lista editable de agujeros (x/y/z/Ø + borrar)
        holes={holesList}
        onUpdateHole={updateHole}
        onRemoveHole={removeHole}
      />
    </div>
  );
}
