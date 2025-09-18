"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { generateSTL, pingHealth } from "@/lib/api";
import type { GenerateResponse, HoleSpec, ModelKind } from "@/types/forge";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

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
  holeDiameter: 5,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ForgeForm() {
  // Estado general
  const [backendUp, setBackendUp] = useState<"ok" | "down">("down");
  const [model, setModel] = useState<ModelKind>("cable_tray");
  const [cfg, setCfg] = useState<CableTrayState>({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [holesMode, setHolesMode] = useState(true);

  // Health check (no bloqueante)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await pingHealth();
      if (mounted) setBackendUp(s);
    })();
    const id = setInterval(async () => {
      const s = await pingHealth();
      setBackendUp(s);
    }, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const update = (patch: Partial<CableTrayState>) => setCfg((s) => ({ ...s, ...patch }));

  const statusText = useMemo(() => {
    return `${cfg.length} × ${cfg.height} × ${cfg.width} mm · grid 50 mm`;
  }, [cfg]);

  const onAddHole = (h: HoleSpec) => {
    update({ holes: [...cfg.holes, h] });
  };

  const clearHoles = () => update({ holes: [] });

  const onGenerate = async () => {
    setBusy(true);
    setToast("Generando STL…");
    setStlUrl(null);
    setResp(null);

    try {
      if (model !== "cable_tray") {
        setToast("De momento está activo el modelo Cable Tray.");
        setBusy(false);
        setTimeout(() => setToast(null), 1600);
        return;
      }

      const payload = {
        model: "cable_tray" as const,
        width_mm: clamp(cfg.width, 30, 1000),
        height_mm: clamp(cfg.height, 10, 600),
        length_mm: clamp(cfg.length, 60, 4000),
        thickness_mm: clamp(cfg.thickness, 1, 20),
        ventilated: !!cfg.ventilated,
        ...(cfg.holes.length ? { holes: cfg.holes } : {}),
      };

      const res = await generateSTL(payload as any);
      setResp(res);
      if (res.status === "ok") {
        setStlUrl(res.stl_url);
        setToast("STL listo ✅");
      } else {
        setToast(res.message || "Error generando STL");
      }
    } catch (e: any) {
      setToast(e?.message || "Error inesperado");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 1800);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px,1fr]">
      {/* Panel IZQ: Formulario */}
      <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Header pequeño */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            {backendUp === "ok" ? (
              <span className="inline-flex items-center gap-1.5 text-green-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Backend: OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-red-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                Backend: no disponible
              </span>
            )}
          </div>
        </div>

        {/* Tabs modelos */}
        <div className="mb-4 inline-flex rounded-xl border border-gray-200 p-1">
          {[
            { id: "cable_tray", label: "Cable Tray" },
            { id: "vesa_adapter", label: "VESA (próximamente)", disabled: true },
            { id: "router_mount", label: "Router (próx.)", disabled: true },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setModel(t.id as ModelKind)}
              className={`mx-0.5 rounded-lg px-3 py-1.5 text-sm ${
                model === t.id ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
              } ${t.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Parámetros Cable Tray */}
        <div className="space-y-4">
          {[
            { k: "width", label: "Ancho (mm)", min: 30, max: 200, value: cfg.width },
            { k: "height", label: "Alto (mm)", min: 10, max: 80, value: cfg.height },
            { k: "length", label: "Longitud (mm)", min: 60, max: 600, value: cfg.length },
            { k: "thickness", label: "Espesor (mm)", min: 1, max: 10, value: cfg.thickness },
          ].map((f) => (
            <div key={f.k}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm text-gray-700">{f.label}</label>
                <span className="text-sm tabular-nums text-gray-600">{f.value}</span>
              </div>
              <input
                type="range"
                className="w-full"
                min={f.min}
                max={f.max}
                value={f.value}
                onChange={(e) => update({ [f.k]: Number(e.target.value) } as any)}
              />
            </div>
          ))}
          <label className="inline-flex select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.ventilated}
              onChange={(e) => update({ ventilated: e.target.checked })}
            />
            Con ranuras de ventilación
          </label>
        </div>

        {/* Agujeros personalizados */}
        <div className="mt-5 rounded-xl border border-gray-200 p-3">
          <div className="mb-2 text-sm font-medium text-gray-800">Agujeros personalizados</div>
          <label className="inline-flex select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={holesMode}
              onChange={(e) => setHolesMode(e.target.checked)}
            />
            Modo “agujeros” (click en el visor)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-gray-700">Ø a añadir (mm)</span>
            <input
              type="number"
              value={cfg.holeDiameter}
              min={2}
              max={30}
              step={0.5}
              onChange={(e) => update({ holeDiameter: Number(e.target.value) || 5 })}
              className="w-20 rounded border px-2 py-1 text-sm"
            />
            <button
              onClick={clearHoles}
              className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
            >
              Borrar agujeros
            </button>
          </div>
          {cfg.holes.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">No hay agujeros todavía. Activa el modo y haz click sobre el modelo.</p>
          ) : (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-600">Ver lista ({cfg.holes.length})</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px]">
                {JSON.stringify(cfg.holes, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={busy || backendUp !== "ok"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-50"
          >
            {busy ? "Generando…" : "Generar STL"}
          </button>
          <a
            href={stlUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className={`rounded-xl border px-3 py-2 text-sm ${
              stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
            }`}
          >
            Descargar STL
          </a>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-gray-700">Ver respuesta JSON</summary>
          <textarea
            readOnly
            value={JSON.stringify(resp ?? {}, null, 2)}
            className="mt-2 h-40 w-full rounded-xl border p-2 font-mono text-xs"
          />
        </details>
      </section>

      {/* Panel DCHO: Visor enmarcado */}
      <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <STLViewer
          url={stlUrl || undefined}
          height={560}
          background="#ffffff"
          modelColor="#3f444c"
          holesMode={holesMode}
          holeDiameter={cfg.holeDiameter}
          holes={cfg.holes}
          onAddHole={onAddHole}
          statusText={statusText}
        />
        <p className="px-1 pt-2 text-xs text-gray-500">
          Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan ·
          Click para añadir agujeros (si el modo está activo)
        </p>
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
