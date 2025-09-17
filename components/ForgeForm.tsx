// teknovashop-app/components/ForgeForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import STLViewer from "@/components/STLViewer";
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

type HoleSpec = { x_mm: number; z_mm: number; d_mm: number };

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

/** Lee estado inicial desde la query sin depender del tipo concreto de Next */
function readFromQuery(
  sp: { get(name: string): string | null }
): { model: ModelKind; state: CableTrayState } {
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

  const [holes, setHoles] = useState<HoleSpec[]>([]);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useURLState(model, cfg);

  const update = (patch: Partial<CableTrayState>) =>
    setCfg((s) => ({ ...s, ...patch }));

  // Helpers agujeros
  const addHole = () =>
    setHoles((hs) => [...hs, { x_mm: 0, z_mm: 0, d_mm: 5 }]);
  const removeHole = (i: number) =>
    setHoles((hs) => hs.filter((_, idx) => idx !== i));
  const updateHole = (i: number, patch: Partial<HoleSpec>) =>
    setHoles((hs) => hs.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const copyLink = async () => {
    if (!stlUrl) return;
    try {
      await navigator.clipboard.writeText(stlUrl);
      setToast("Enlace copiado ✅");
    } catch {
      setToast("No se pudo copiar el enlace");
    } finally {
      setTimeout(() => setToast(null), 1400);
    }
  };

  const genCableTray = async () => {
    setBusy(true);
    setToast("Generando STL…");
    setResp(null);
    setStlUrl(null);

    // Construimos el payload (permitimos 'holes' si hay)
    const payload: any = {
      model: "cable_tray",
      width_mm: cfg.width,
      height_mm: cfg.height,
      length_mm: cfg.length,
      thickness_mm: cfg.thickness,
      ventilated: cfg.ventilated,
      ...(holes.length ? { holes } : {}),
    };

    try {
      const res = await generateSTL(payload);
      setResp(res);

      if (res && (res as any).status === "ok" && (res as any).stl_url) {
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
    } catch (e: any) {
      setToast(e?.message || "Error inesperado");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1800);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6">
      {/* Panel izquierdo */}
      <div className="space-y-6">
        {/* Tabs */}
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

        {/* Formulario por modelo */}
        {model === "cable_tray" ? (
          <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-4 space-y-5">
            {/* Presets */}
            <div className="flex items-center gap-2">
              {[
                { k: "S", w: 40, h: 20, l: 120, t: 2 },
                { k: "M", w: 60, h: 25, l: 180, t: 3 },
                { k: "L", w: 80, h: 35, l: 240, t: 4 },
              ].map((p) => (
                <button
                  key={p.k}
                  onClick={() =>
                    setCfg({
                      width: p.w,
                      height: p.h,
                      length: p.l,
                      thickness: p.t,
                      ventilated: cfg.ventilated,
                    })
                  }
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  {p.k}
                </button>
              ))}
            </div>

            {/* Sliders */}
            {[
              {
                k: "width",
                label: "Ancho (mm)",
                min: 30,
                max: 400,
                step: 1,
                value: cfg.width,
              },
              {
                k: "height",
                label: "Alto (mm)",
                min: 10,
                max: 120,
                step: 1,
                value: cfg.height,
              },
              {
                k: "length",
                label: "Longitud (mm)",
                min: 80,
                max: 2000,
                step: 10,
                value: cfg.length,
              },
              {
                k: "thickness",
                label: "Espesor (mm)",
                min: 1,
                max: 20,
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
                  className="w-full"
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

            {/* Agujeros personalizados */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">
                  Agujeros personalizados
                </h4>
                <button
                  type="button"
                  onClick={addHole}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  + Añadir agujero
                </button>
              </div>

              {holes.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No hay agujeros. Añade uno con “+ Añadir agujero”. (Usa
                  coordenadas X/Z en mm respecto al centro de la base.)
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {holes.map((h, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center"
                    >
                      <label className="text-xs text-gray-600">
                        X (mm)
                        <input
                          type="number"
                          value={h.x_mm}
                          onChange={(e) =>
                            updateHole(i, { x_mm: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Z (mm)
                        <input
                          type="number"
                          value={h.z_mm}
                          onChange={(e) =>
                            updateHole(i, { z_mm: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="text-xs text-gray-600">
                        Ø (mm)
                        <input
                          type="number"
                          value={h.d_mm}
                          onChange={(e) =>
                            updateHole(i, { d_mm: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-xs"
                        />
                      </label>
                      <button
                        onClick={() => removeHole(i)}
                        className="self-end rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-gray-500">
                Consejo: mantén los centros dentro de ±{Math.floor(cfg.length / 2)} mm (X) y
                ±{Math.floor(cfg.width / 2)} mm (Z). El backend recorta si es necesario.
              </p>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
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
                rel="noreferrer"
                className={`px-3 py-2 rounded-lg border text-sm ${
                  stlUrl
                    ? "border-gray-300 hover:bg-gray-50"
                    : "border-dashed border-gray-300 text-gray-400 pointer-events-none"
                }`}
              >
                Descargar STL
              </a>

              <button
                onClick={copyLink}
                disabled={!stlUrl}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Copiar enlace
              </button>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-600">
                Ver respuesta JSON
              </summary>
              <textarea
                readOnly
                value={JSON.stringify(resp ?? {}, null, 2)}
                className="w-full h-44 mt-2 text-xs bg-gray-50 rounded-md border p-2 font-mono"
              />
            </details>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              Este modelo estará disponible muy pronto. Dejemos perfecto el
              Cable Tray y activamos el resto.
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
      <div className="bg-white/70 backdrop-blur border border-gray-200 rounded-xl p-3 xl:sticky xl:top-20">
        <div
          className="rounded-xl border border-gray-200 overflow-hidden"
          style={{ minHeight: 520 }}
        >
          {stlUrl ? (
            <STLViewer url={stlUrl} height={520} background="#ffffff" />
          ) : (
            <div
              className="h-[520px] w-full"
              style={{
                background:
                  "linear-gradient(180deg, #f8fafc, #eff2f6 40%, #e8ecf3 60%, #e5e7eb)",
              }}
            />
          )}
        </div>
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
