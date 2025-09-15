// /components/ForgeForm.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import STLViewer from "@/components/STLViewer";

// Tipos desde "@/types/forge"; la API sólo exporta la función
import { generateSTL } from "@/lib/api";
import type { GenerateResponse, ModelKind } from "@/types/forge";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CableTrayState = {
  width: number;
  height: number;
  length: number;
  thickness: number;
  ventilated: boolean;
};

const DEFAULTS: CableTrayState = {
  width: 60,
  height: 25,
  length: 180,
  thickness: 3,
  ventilated: true,
};

function useURLState(model: ModelKind, state: CableTrayState) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("model", model);
    params.set("width", String(state.width));
    params.set("height", String(state.height));
    params.set("length", String(state.length));
    params.set("thickness", String(state.thickness));
    params.set("ventilated", state.ventilated ? "1" : "0");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [model, state, router, pathname]);
}

// ⬇️ Acepta ReadonlyURLSearchParams (de Next) o URLSearchParams
function readFromQuery(
  sp: URLSearchParams | ReadonlyURLSearchParams
): {
  model: ModelKind;
  state: CableTrayState;
} {
  const model = (sp.get("model") as ModelKind) || "cable_tray";
  const num = (k: string, d: number) => {
    const v = Number(sp.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
    };
  const bool = (k: string, d: boolean) => {
    const v = sp.get(k);
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
    return d;
  };
  return {
    model,
    state: {
      width: num("width", DEFAULTS.width),
      height: num("height", DEFAULTS.height),
      length: num("length", DEFAULTS.length),
      thickness: num("thickness", DEFAULTS.thickness),
      ventilated: bool("ventilated", DEFAULTS.ventilated),
    },
  };
}

export default function ForgeForm() {
  const searchParams = useSearchParams();
  const initial = useMemo(() => readFromQuery(searchParams), [searchParams]);

  const [model, setModel] = useState<ModelKind>(initial.model);
  const [cfg, setCfg] = useState<CableTrayState>(initial.state);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useURLState(model, cfg);

  const update = (patch: Partial<CableTrayState>) =>
    setCfg((s) => ({ ...s, ...patch }));

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
    });
    setResp(res);
    if (res.status === "ok") {
      setStlUrl(res.stl_url);
      setToast("STL listo ✅");
    } else {
      setToast(res.detail || res.message || "Error generando STL");
    }
    setBusy(false);
    setTimeout(() => setToast(null), 1800);
  }, [cfg]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
      {/* Panel izquierdo */}
      <div className="space-y-6">
        {/* Tabs de modelos */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
          {[
            { id: "cable_tray", label: "Cable Tray" },
            { id: "vesa_adapter", label: "VESA (próximamente)" },
            { id: "router_mount", label: "Router Mount (próx.)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setModel(t.id as ModelKind)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition
              ${model === t.id ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Formulario según modelo */}
        {model === "cable_tray" ? (
          <div className="bg-white/70 backdrop-blur border border-gray-200 rounded-xl p-4 space-y-4">
            {[
              {
                k: "width",
                label: "Ancho (mm)",
                min: 30,
                max: 120,
                step: 1,
                value: cfg.width,
              },
              {
                k: "height",
                label: "Alto (mm)",
                min: 10,
                max: 60,
                step: 1,
                value: cfg.height,
              },
              {
                k: "length",
                label: "Longitud (mm)",
                min: 80,
                max: 400,
                step: 1,
                value: cfg.length,
              },
              {
                k: "thickness",
                label: "Espesor (mm)",
                min: 2,
                max: 8,
                step: 1,
                value: cfg.thickness,
              },
            ].map((f) => (
              <div key={f.k}>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {f.label}
                  </label>
                  <span className="text-sm tabular-nums text-gray-600">
                    {f.value}
                  </span>
                </div>
                <input
                  type="range"
                  className="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={f.value}
                  onChange={(e) =>
                    update({ [f.k]: Number(e.target.value) } as any)
                  }
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

            <div className="flex items-center gap-3 pt-1">
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
                  stlUrl
                    ? "border-gray-300 hover:bg-gray-50"
                    : "border-dashed border-gray-300 text-gray-400 pointer-events-none"
                }`}
              >
                Descargar STL (en Supabase)
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
        ) : (
          <div className="bg-white/70 backdrop-blur border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              Este modelo estará disponible muy pronto. Déjame el formulario
              cable tray listo y, en cuanto el backend esté, activamos el botón.
            </p>
            <div className="mt-3">
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500 text-sm cursor-not-allowed"
              >
                Generar STL (próximamente)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho (visor) */}
      <div className="bg-white/60 backdrop-blur border border-gray-200 rounded-xl p-3">
        {!stlUrl ? (
          <div
            className="rounded-xl border border-gray-200 animate-pulse"
            style={{
              height: 520,
              background:
                "linear-gradient(180deg, #f8fafc, #eff2f6 40%, #e8ecf3 60%, #e5e7eb)",
            }}
          />
        ) : (
          <STLViewer url={stlUrl} height={520} background="#ffffff" />
        )}

        <p className="text-xs text-gray-500 mt-2">
          Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan
        </p>
      </div>

      {/* Toast minimal */}
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
