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
    try {
      data = JSON.parse(text);
    } catch {}
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

  // Estado por modelo en un diccionario (desde registry.defaults)
  const initialState = useMemo(() => {
    const m: Record<ModelId, any> = {} as any;
    (Object.keys(MODELS) as ModelId[]).forEach((id) => {
      m[id] = { ...(MODELS[id] as any).defaults };
    });
    return m;
  }, []);
  const [state, setState] = useState<Record<ModelId, any>>(initialState);

  // parámetros comunes para agujeros (UI)
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  const [busy, setBusy] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = MODELS[model];
  const cur = state[model];

  // caja del visor (fallback)
  const box = useMemo(() => def.toBox(cur), [def, cur]);

  // shape por modelo (preview). Seguro y opcional.
  const shape = useMemo(() => {
    switch (model) {
      case "vesa_adapter":
        return { kind: "plate", L: box.length, W: box.width, T: box.height } as const;
      case "qr_plate":
        return { kind: "plate_chamfer", L: box.length, W: box.width, T: box.height } as const;
      case "cable_tray":
        return {
          kind: "u_channel",
          L: box.length,
          W: box.width,
          H: box.height + (cur.height ?? box.height),
          wall: cur.thickness ?? box.thickness ?? 3,
        } as const;
      case "router_mount":
        return { kind: "l_bracket", W: cur.width, D: cur.depth, flange: cur.flange, T: cur.thickness } as const;
      case "phone_stand":
        return { kind: "phone_stand", W: cur.width, D: cur.support_depth, angleDeg: cur.angle_deg, T: cur.thickness } as const;
      case "enclosure_ip65":
        return { kind: "box_hollow", L: cur.length, W: cur.width, H: cur.height, wall: cur.wall } as const;
      case "cable_clip":
        return { kind: "clip_c", diameter: cur.diameter, width: cur.width, T: cur.thickness } as const;
      default:
        return { kind: "unknown" } as const;
    }
  }, [model, cur, box]);

  // marcadores visibles (auto + libres)
  const markers: Marker[] = useMemo(() => {
    const auto = def.autoMarkers ? def.autoMarkers(cur) : [];
    const free: Marker[] =
      "extraHoles" in cur ? cur.extraHoles :
      "holes" in cur ? cur.holes :
      [];
    return [...auto, ...free];
  }, [def, cur]);

  // añadir / borrar marcadores libres
  const onAddMarker = (m: Marker) => {
    if (!def.allowFreeHoles) return;
    setState((prev) => {
      const next = { ...prev };
      const s = { ...next[model] };
      if ("extraHoles" in s) s.extraHoles = [...(s.extraHoles || []), m];
      else if ("holes" in s) s.holes = [...(s.holes || []), m];
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
    return def.sliders.map((s) => ({
      ...s,
      value: cur[s.key],
    }));
  }, [def.sliders, cur]);

  const updateSlider = (key: string, v: number) => {
    setState((prev) => ({ ...prev, [model]: { ...prev[model], [key]: v } }));
  };

  // generar STL (inyectamos holes y model garantizados)
  async function onGenerate() {
    setBusy(true);
    setError(null);
    setStlUrl(null);

    // Payload base desde el registro del modelo
    const base = def.toPayload(cur) || {};

    // Agujeros libres: para VESA suelen ser "extraHoles"; en resto "holes"
    const freeHoles: Marker[] =
      "extraHoles" in cur ? (cur.extraHoles || []) :
      "holes" in cur ? (cur.holes || []) :
      [];

    // Montamos payload final para backend
    const payload = {
      ...base,
      model,              // nos aseguramos de enviar el modelo
      holes: freeHoles,   // SIEMPRE mandamos holes (aunque sea [])
    };

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
        <STLViewer
          key={model}
          background="#ffffff"
          box={box}
          shape={shape as any}
          markers={markers}
          holesMode={allowFree}
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
      />
    </div>
  );
}
