"use client";

import { useMemo, useState, useCallback } from "react";
import STLViewer, { type Marker as ViewMarker } from "@/components/STLViewer";
import ControlsPanel from "@/components/ControlsPanel";
import ModelSelector from "@/components/ModelSelector";
import { MODELS, type ModelId, type ModelDef } from "@/models/registry";

// —— util de red (idéntico patrón que ya tenías)
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
    const url = data?.stl_url || data?.url || data?.data?.stl_url || null;
    if (url) return { status: "ok", stl_url: url };
    return { status: "error", message: "Backend no devolvió stl_url" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Fallo de red" };
  }
}

// —— Tipos puente
type RegMarker = { x_mm: number; z_mm: number; d_mm: number };

// Convierte marcadores del estado (x,z,d) al visor (x,y,z,d)
const toViewMarkers = (mm: RegMarker[]): ViewMarker[] =>
  (mm || []).map((m) => ({ x_mm: m.x_mm, y_mm: 0, z_mm: m.z_mm, d_mm: m.d_mm }));

export default function ForgeForm() {
  const [model, setModel] = useState<ModelId>("cable_tray");

  // Estado inicial por modelo a partir de MODELS.defaults
  const initialState = useMemo(() => {
    const m: Record<ModelId, any> = {} as any;
    (Object.keys(MODELS) as ModelId[]).forEach((id) => {
      m[id] = { ...(MODELS[id] as any).defaults };
    });
    return m;
  }, []);
  const [state, setState] = useState<Record<ModelId, any>>(initialState);

  // UI de agujeros / snap
  const [holesEnabled, setHolesEnabled] = useState(true);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  // Export/errores
  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Definición del modelo activo
  const def: ModelDef<any> = MODELS[model];
  const cur = state[model];

  // Markers = automáticos + libres
  const autoMarkers: RegMarker[] = useMemo(() => {
    return def.autoMarkers ? def.autoMarkers(cur) : [];
  }, [def, cur]);

  const freeMarkers: RegMarker[] = useMemo(() => {
    if ("extraHoles" in cur && Array.isArray(cur.extraHoles)) return cur.extraHoles as RegMarker[];
    if ("holes" in cur && Array.isArray(cur.holes)) return cur.holes as RegMarker[];
    return [];
  }, [cur]);

  // Markers visibles en visor
  const viewMarkers: ViewMarker[] = useMemo(() => {
    return toViewMarkers([...autoMarkers, ...freeMarkers]);
  }, [autoMarkers, freeMarkers]);

  // Sliders con sus valores
  const sliders = useMemo(() => {
    return def.sliders.map((s) => ({ ...s, value: cur[s.key] }));
  }, [def.sliders, cur]);

  // Actualiza un slider del estado
  const updateSlider = (key: string, v: number) => {
    setState((prev) => {
      const copy = { ...prev };
      copy[model] = { ...copy[model], [key]: v };
      return copy;
    });
    setStlUrl(null); // obligamos a regenerar con nuevos parámetros
  };

  // Añadir marcador libre (Shift/Alt+Click desde el visor)
  const handleAddMarker = useCallback(
    (m: ViewMarker) => {
      if (!def.allowFreeHoles || !holesEnabled) return;

      // Normalizamos a tipo de estado (x,z,d) — y_mm no se guarda
      const hole: RegMarker = {
        x_mm: m.x_mm,
        z_mm: m.z_mm,
        d_mm: m.d_mm ?? holeDiameter,
      };

      setState((prev) => {
        const copy = { ...prev };
        const s = { ...copy[model] };

        // Evitamos duplicar automáticos
        const autoSet = new Set(autoMarkers.map((a) => `${a.x_mm}|${a.z_mm}|${a.d_mm}`));
        const key = `${hole.x_mm}|${hole.z_mm}|${hole.d_mm}`;
        if (autoSet.has(key)) return prev;

        if ("extraHoles" in s) s.extraHoles = [...(s.extraHoles || []), hole];
        else if ("holes" in s) s.holes = [...(s.holes || []), hole];

        copy[model] = s;
        return copy;
      });
    },
    [autoMarkers, def.allowFreeHoles, holesEnabled, holeDiameter, model]
  );

  // Borrar todos los agujeros libres (no los auto)
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

  // Generar STL
  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    setStlUrl(null);
    try {
      const payload = def.toPayload(state[model]);
      const r = await generateSTL(payload);
      if (r.status === "ok") {
        setStlUrl(r.stl_url);
      } else {
        setError(r.message);
      }
    } finally {
      setBusy(false);
    }
  };

  // Caja guía para el visor (cuando aún no hay STL)
  const box = def.toBox(cur);

  // Etiqueta para el selector de modelo
  const modelLabel = def.label;

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row">
      {/* Panel lateral */}
      <ControlsPanel
        modelLabel={modelLabel}
        sliders={sliders}
        onChange={updateSlider}
        ventilated={!!cur.ventilated}
        onToggleVentilated={(v) => {
          if (!("ventilated" in cur)) return;
          setState((prev) => {
            const copy = { ...prev };
            copy[model] = { ...copy[model], ventilated: v };
            return copy;
          });
          setStlUrl(null);
        }}
        holesEnabled={holesEnabled}
        onToggleHoles={(v) => setHolesEnabled(v)}
        holeDiameter={holeDiameter}
        onHoleDiameter={(v) => setHoleDiameter(v)}
        snapStep={snapStep}
        onSnapStep={(v) => setSnapStep(v)}
        onClearHoles={clearMarkers}
        onGenerate={onGenerate}
        busy={busy}
        stlUrl={stlUrl ?? undefined}
        error={error ?? undefined}
      />

      {/* Visor + selector de modelo encima en móviles */}
      <section className="flex-1">
        <div className="mb-3">
          <ModelSelector value={model} onChange={setModel} />
        </div>

        <STLViewer
          // si hay STL lo enseña; si no, muestra la caja guía
          stlUrl={stlUrl ?? undefined}
          box={box}
          width={920}
          height={560}
          // UX avanzada
          holesMode={holesEnabled}
          addDiameter={holeDiameter}
          snapStep={snapStep}
          // marcadores visibles = automáticos + libres
          markers={viewMarkers}
          // callback al añadir un marcador libre
          onAddMarker={handleAddMarker}
          // empezamos cámara libre; clipping apagado
          defaultAxis="free"
          defaultClipping={false}
          defaultClipMM={0}
        />
      </section>
    </div>
  );
}
