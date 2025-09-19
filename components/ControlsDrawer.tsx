"use client";

import { useEffect } from "react";

type Slider = { key: string; label: string; min: number; max: number; step?: number; value: number };

type Props = {
  open: boolean;
  onClose: () => void;

  modelLabel: string;
  sliders: Slider[];
  onChange: (k: string, v: number) => void;

  ventilated: boolean;
  onToggleVentilated: (v: boolean) => void;

  holesEnabled: boolean;
  onToggleHoles: (v: boolean) => void;
  holeDiameter: number;
  onHoleDiameter: (v: number) => void;
  snapStep: number;
  onSnapStep: (v: number) => void;
  onClearHoles: () => void;
  onUndo: () => void;
  onRedo: () => void;

  onGenerate: () => void;
  busy?: boolean;
  stlUrl?: string | null;
  error?: string | null;
};

export default function ControlsDrawer({
  open, onClose,
  modelLabel, sliders, onChange,
  ventilated, onToggleVentilated,
  holesEnabled, onToggleHoles, holeDiameter, onHoleDiameter, snapStep, onSnapStep, onClearHoles, onUndo, onRedo,
  onGenerate, busy, stlUrl, error
}: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose} />
      <aside className={`fixed right-0 top-0 z-50 h-svh w-[380px] max-w-[90vw] transform border-l border-gray-200 bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Configuración · {modelLabel}</h3>
          <button onClick={onClose} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">Cerrar</button>
        </div>

        <div className="h-[calc(100svh-48px)] overflow-y-auto p-4 space-y-6">
          {/* Dimensiones */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Dimensiones</h4>
            {sliders.map((s) => (
              <div key={s.key} className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium">{s.label}</label>
                  <span className="text-sm tabular-nums text-gray-600">{s.value}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step ?? 1} value={s.value} onChange={(e) => onChange(s.key, Number(e.target.value))} className="w-full" />
              </div>
            ))}
          </section>

          {/* Funciones */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Funciones</h4>
            <label className="inline-flex select-none items-center gap-2 text-sm">
              <input type="checkbox" checked={ventilated} onChange={(e) => onToggleVentilated(e.target.checked)} />
              Con ranuras de ventilación
            </label>
          </section>

          {/* Agujeros */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Agujeros</h4>
            <label className="mb-2 inline-flex select-none items-center gap-2 text-sm">
              <input type="checkbox" checked={holesEnabled} onChange={(e) => onToggleHoles(e.target.checked)} />
              Modo agujeros (click en el visor)
            </label>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm">Diámetro (mm)</label>
                <span className="text-sm tabular-nums text-gray-600">{holeDiameter}</span>
              </div>
              <input type="range" min={2} max={16} step={0.5} value={holeDiameter} onChange={(e) => onHoleDiameter(Number(e.target.value))} className="w-full" />
            </div>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm">Snap (mm)</label>
                <span className="text-sm tabular-nums text-gray-600">{snapStep}</span>
              </div>
              <input type="range" min={0} max={5} step={0.5} value={snapStep} onChange={(e) => onSnapStep(Number(e.target.value))} className="w-full" />
            </div>

            <div className="flex gap-2">
              <button onClick={onUndo} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Deshacer</button>
              <button onClick={onRedo} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Rehacer</button>
              <button onClick={onClearHoles} className="ml-auto rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Borrar todos</button>
            </div>
          </section>

          {/* Exportar */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Exportar</h4>
            <div className="flex gap-2">
              <button onClick={onGenerate} disabled={!!busy} className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Generando..." : "Generar STL"}</button>
              {stlUrl && <a href={stlUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm">Descargar STL</a>}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </section>

          <p className="text-xs text-gray-500">Consejo: coloca los agujeros; el visor usa snap y una vista que no se resetea al editar.</p>
        </div>
      </aside>
    </>
  );
}
