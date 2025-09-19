"use client";

type Slider = { key: string; label: string; min: number; max: number; step?: number; value: number };

type Props = {
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

  onGenerate: () => void;
  busy?: boolean;
  stlUrl?: string | null;
  error?: string | null;
};

export default function ControlsPanel({
  modelLabel, sliders, onChange,
  ventilated, onToggleVentilated,
  holesEnabled, onToggleHoles, holeDiameter, onHoleDiameter, snapStep, onSnapStep, onClearHoles,
  onGenerate, busy, stlUrl, error,
}: Props) {
  return (
    <aside className="h-[calc(100svh-140px)] w-full max-w-[380px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Configuración · {modelLabel}</h3>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Dimensiones</h4>
        {sliders.map((s) => (
          <div key={s.key} className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">{s.label}</label>
              <span className="text-sm tabular-nums text-gray-600">{s.value}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step ?? 1}
              value={s.value} onChange={(e) => onChange(s.key, Number(e.target.value))} className="w-full" />
          </div>
        ))}
      </section>

      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Funciones</h4>
        <label className="inline-flex select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={ventilated} onChange={(e) => onToggleVentilated(e.target.checked)} />
          Con ranuras de ventilación
        </label>
      </section>

      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Agujeros</h4>
        <label className="mb-2 inline-flex select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={holesEnabled} onChange={(e) => onToggleHoles(e.target.checked)} />
          Modo agujeros (usa <b>Shift/Alt + clic</b>)
        </label>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm">Diámetro (mm)</label>
            <span className="text-sm tabular-nums text-gray-600">{holeDiameter}</span>
          </div>
          <input type="range" min={2} max={16} step={0.5} value={holeDiameter}
            onChange={(e) => onHoleDiameter(Number(e.target.value))} className="w-full" />
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm">Snap (mm)</label>
            <span className="text-sm tabular-nums text-gray-600">{snapStep}</span>
          </div>
          <input type="range" min={0} max={5} step={0.5} value={snapStep}
            onChange={(e) => onSnapStep(Number(e.target.value))} className="w-full" />
        </div>

        <button onClick={onClearHoles} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          Borrar todos
        </button>
      </section>

      <section className="mt-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Exportar</h4>
        <div className="flex gap-2">
          <button onClick={onGenerate} disabled={!!busy} className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "Generando..." : "Generar STL"}
          </button>
          {stlUrl && <a href={stlUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm">Descargar STL</a>}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>

      <p className="mt-4 text-xs text-gray-500">
        Consejo: mantén <b>Shift</b> o <b>Alt</b> para colocar agujeros sin perder el control de la cámara.
      </p>
    </aside>
  );
}
