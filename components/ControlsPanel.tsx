"use client";

type Slider = { key: string; label: string; min: number; max: number; step?: number; value: number };

type Hole = { x_mm: number; y_mm?: number; z_mm: number; d_mm?: number };

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

  // NUEVO (opcionales): edición numérica de agujeros
  holes?: Hole[];
  onUpdateHole?: (idx: number, patch: Partial<Hole>) => void;
  onRemoveHole?: (idx: number) => void;
};

export default function ControlsPanel({
  modelLabel, sliders, onChange,
  ventilated, onToggleVentilated,
  holesEnabled, onToggleHoles, holeDiameter, onHoleDiameter, snapStep, onSnapStep, onClearHoles,
  onGenerate, busy, stlUrl, error,
  holes, onUpdateHole, onRemoveHole,
}: Props) {
  return (
    <aside className="h-[calc(100svh-140px)] w-full max-w-[380px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-y-auto">
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

        {/* Lista editable de agujeros (si se provee) */}
        {holes && holes.length > 0 && (
          <div className="mt-4">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Agujeros ({holes.length})</h5>
            <div className="flex max-h-64 flex-col gap-2 overflow-auto pr-1">
              {holes.map((h, i) => (
                <div key={i} className="rounded-lg border p-2">
                  <div className="mb-2 text-xs font-semibold">#{i + 1}</div>
                  <div className="grid grid-cols-4 gap-2">
                    <label className="text-xs">
                      X (mm)
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={Number.isFinite(h.x_mm) ? h.x_mm : 0}
                        onChange={(e) => onUpdateHole?.(i, { x_mm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-xs">
                      Y (mm)
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={Number.isFinite(h.y_mm ?? 0) ? (h.y_mm ?? 0) : 0}
                        onChange={(e) => onUpdateHole?.(i, { y_mm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-xs">
                      Z (mm)
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={Number.isFinite(h.z_mm) ? h.z_mm : 0}
                        onChange={(e) => onUpdateHole?.(i, { z_mm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-xs">
                      Ø (mm)
                      <input
                        type="number"
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        value={Number.isFinite(h.d_mm ?? 0) ? (h.d_mm ?? 0) : 0}
                        onChange={(e) => onUpdateHole?.(i, { d_mm: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => onRemoveHole?.(i)}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
