"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import STLViewer from "@/components/STLViewer";
import { generateSTL, health } from "@/lib/api";
import type { GenerateResponse, ModelKind, HoleSpec } from "@/types/forge";

type CableTrayState = {
  width: number;
  height: number;
  length: number;
  thickness: number;
  ventilated: boolean;
  holes: HoleSpec[];
  holeDiameter: number;
};

const DEFAULTS: CableTrayState = {
  width: 60,
  height: 25,
  length: 180,
  thickness: 3,
  ventilated: true,
  holes: [],
  holeDiameter: 5
};

function useURLState(model: ModelKind, state: CableTrayState) {
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("model", model);
    params.set("width", String(state.width));
    params.set("height", String(state.height));
    params.set("length", String(state.length));
    params.set("thickness", String(state.thickness));
    params.set("ventilated", state.ventilated ? "1" : "0");
    if (state.holes.length) params.set("holes", String(state.holes.length));
    history.replaceState(null, "", `?${params.toString()}`);
  }, [model, state]);
}

export default function ForgeForm() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { health().then(setOk); }, []);

  const [model, setModel] = useState<ModelKind>("cable_tray");
  const [cfg, setCfg] = useState<CableTrayState>(DEFAULTS);
  const [holeMode, setHoleMode] = useState(true);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useURLState(model, cfg);

  const update = (patch: Partial<CableTrayState>) =>
    setCfg((s) => ({ ...s, ...patch }));

  const onPick = (x_mm: number, z_mm: number) => {
    const d = Math.max(2, Math.min(30, cfg.holeDiameter));
    setCfg((s) => ({ ...s, holes: [...s.holes, { x_mm, z_mm, d_mm: d }] }));
  };

  const clearHoles = () => update({ holes: [] });

  const genCableTray = useCallback(async () => {
    setBusy(true);
    setToast("Generando STL…");
    setResp(null);
    setStlUrl(null);

    const res = await generateSTL({
      model: "cable_tray",
      width_mm: cfg.width,
      height_mm: cfg.height,
      length_mm: cfg.length,
      thickness_mm: cfg.thickness,
      ventilated: cfg.ventilated,
      ...(cfg.holes.length ? { holes: cfg.holes } : {})
    } as any);

    setResp(res);

    if (res && res.status === "ok" && (res as any).stl_url) {
      setStlUrl((res as any).stl_url ?? null);
      setToast("STL listo ✅");
    } else {
      const anyRes = res as any;
      const msg =
        (anyRes && typeof anyRes === "object" && (anyRes.detail as string)) ||
        (anyRes && typeof anyRes === "object" && (anyRes.message as string)) ||
        "Error generando STL";
      setToast(msg);
    }
    setBusy(false);
    setTimeout(() => setToast(null), 2000);
  }, [cfg]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6">
      {/* Panel izquierdo */}
      <div className="space-y-6">
        {/* Estado backend */}
        <div className="text-xs text-gray-600">
          Backend:{" "}
          {ok === null ? "comprobando…" : ok ? "OK" : "no disponible"}
        </div>

        {/* Tabs de modelos */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
          {[
            { id: "cable_tray", label: "Cable Tray" },
            { id: "vesa_adapter", label: "VESA (próximamente)", disabled: true },
            { id: "router_mount", label: "Router Mount (próx.)", disabled: true },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setModel(t.id as ModelKind)}
              disabled={t.disabled}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition
              ${model === t.id ? "bg-gray-900 text-white" : t.disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-100 text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Formulario: Cable Tray */}
        <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-4 space-y-4">
          {[
            { k: "width", label: "Ancho (mm)", min: 30, max: 400, step: 1, value: cfg.width },
            { k: "height", label: "Alto (mm)", min: 10, max: 120, step: 1, value: cfg.height },
            { k: "length", label: "Longitud (mm)", min: 80, max: 2000, step: 1, value: cfg.length },
            { k: "thickness", label: "Espesor (mm)", min: 2, max: 20, step: 1, value: cfg.thickness },
          ].map((f) => (
            <div key={f.k}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <span className="text-sm tabular-nums text-gray-600">{f.value}</span>
              </div>
              <input
                type="range"
                className="w-full"
                min={f.min}
                max={f.max}
                step={f.step}
                value={f.value}
                onChange={(e) => update({ [f.k]: Number(e.target.value) } as any)}
              />
            </div>
          ))}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.ventilated}
              onChange={(e) => update({ ventilated: e.target.checked })}
            />
            Con ranuras de ventilación
          </label>

          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Agujeros personalizados</div>
              <label className="text-xs flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={holeMode}
                  onChange={(e) => setHoleMode(e.target.checked)}
                />
                Modo “agujeros” (click en el visor)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">Ø a añadir (mm)</label>
              <input
                type="number"
                min={2}
                max={30}
                step={0.5}
                value={cfg.holeDiameter}
                onChange={(e) => update({ holeDiameter: Number(e.target.value) })}
                className="w-24 rounded-md border px-2 py-1 text-sm"
              />
              <button
                onClick={clearHoles}
                className="ml-auto px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                Borrar agujeros
              </button>
            </div>
            <div className="text-xs text-gray-600">
              {cfg.holes.length ? `${cfg.holes.length} agujero(s) definidos.` : "No hay agujeros todavía."}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={genCableTray}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black/90 disabled:opacity-60"
            >
              {busy ? "Generando…" : "Generar STL"}
            </button>
            <a
              href={stlUrl ?? "#"}
              target="_blank"
              className={`px-3 py-2 rounded-lg border text-sm ${
                stlUrl ? "border-gray-300 hover:bg-gray-50" : "border-dashed border-gray-300 text-gray-400 pointer-events-none"
              }`}
              rel="noreferrer"
            >
              Descargar STL
            </a>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-600">
              Ver respuesta JSON
            </summary>
            <textarea
              readOnly
              value={JSON.stringify(resp ?? {}, null, 2)}
              className="w-full h-40 mt-2 text-xs bg-gray-50 rounded-md border p-2 font-mono"
            />
          </details>
        </div>
      </div>

      {/* Panel derecho (visor) */}
      <div className="space-y-2">
        <STLViewer
          url={stlUrl || undefined}
          height={560}
          background="#ffffff"
          holes={cfg.holes}
          holeMode={holeMode}
          onPick={onPick}
        />
        <p className="text-xs text-gray-500">
          Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan · Click (modo agujeros) para añadir marcador
        </p>
      </div>

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
