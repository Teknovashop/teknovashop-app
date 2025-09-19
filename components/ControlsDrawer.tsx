"use client";

import { useEffect } from "react";

type Slider = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sliders: Slider[];
  onChange: (k: string, v: number) => void;
  ventilated: boolean;
  onToggleVentilated: (v: boolean) => void;
  onClearHoles: () => void;
  onGenerate: () => void;
  busy?: boolean;
  stlUrl?: string | null;
  error?: string | null;
};

export default function ControlsDrawer({
  open,
  onClose,
  sliders,
  onChange,
  ventilated,
  onToggleVentilated,
  onClearHoles,
  onGenerate,
  busy,
  stlUrl,
  error,
}: Props) {
  // cerrar con ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-svh w-[380px] max-w-[90vw] transform border-l border-gray-200 bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Configuración</h3>
          <button onClick={onClose} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
            Cerrar
          </button>
        </div>

        <div className="h-[calc(100svh-48px)] overflow-y-auto p-4">
          {/* Sliders */}
          {sliders.map((s) => (
            <div key={s.key} className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">{s.label}</label>
                <span className="text-sm tabular-nums text-gray-600">{s.value}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step ?? 1}
                value={s.value}
                onChange={(e) => onChange(s.key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}

          <label className="mt-2 inline-flex select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ventilated}
              onChange={(e) => onToggleVentilated(e.target.checked)}
            />
            Con ranuras de ventilación
          </label>

          <div className="mt-4 flex gap-2">
            <button onClick={onClearHoles} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Borrar agujeros
            </button>
            <button
              onClick={onGenerate}
              disabled={!!busy}
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Generando..." : "Generar STL"}
            </button>
          </div>

          {stlUrl && (
            <a
              href={stlUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm"
            >
              Descargar STL
            </a>
          )}

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <p className="mt-6 text-xs text-gray-500">
            Consejo: activa “modo agujeros”, haz click en la placa para colocar pasantes. Usamos snap a 1&nbsp;mm.
          </p>
        </div>
      </aside>
    </>
  );
}
