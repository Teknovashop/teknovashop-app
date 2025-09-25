// components/ControlsPanel.tsx
"use client";

type Slider = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
};

export type HoleMarker = {
  x_mm: number;
  y_mm?: number | null;
  z_mm: number;
  d_mm?: number | null;
};

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

  // NUEVO (opcionales): edición de agujeros
  holes?: HoleMarker[];
  onUpdateHole?: (idx: number, patch: Partial<HoleMarker>) => void;
  onRemoveHole?: (idx: number) => void;
};

export default function ControlsPanel({
  modelLabel,
  sliders,
  onChange,
  ventilated,
  onToggleVentilated,
  holesEnabled,
  onToggleHoles,
  holeDiameter,
  onHoleDiameter,
  snapStep,
  onSnapStep,
  onClearHoles,
  onGenerate,
  busy,
  stlUrl,
  error,
  holes,
  onUpdateHole,
  onRemoveHole,
}: Props) {
  return (
    <aside className="h-[calc(100svh-140px)] w-full max-w-[380px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Configuración · {modelLabel}</h3>

      {/* Dimensiones */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Dimensiones
        </h4>
        {sliders.map((s) => (
          <div key={s.key} className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">{s.label}</label>
              <span className="text-sm tabular-nums text-gray-600">
                {Math.round(s.value * 100) / 100}
              </span>
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
      </section>

      {/* Funciones */}
      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Funciones
        </h4>
        <label className="inline-flex select-none items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ventilated}
            onChange={(e) => onToggleVentilated(e.target.checked)}
          />
          Con ranuras de ventilación
        </label>
      </section>

      {/* Agujeros */}
      <section className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Agujeros
        </h4>

        <label className="mb-2 inline-flex select-none items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={holesEnabled}
            onChange={(e) => onToggleHoles(e.target.checked)}
          />
          Modo agujeros (usa <b>Shift/Alt + clic</b>)
        </label>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm">Diámetro (mm)</label>
            <span className="text-sm tabular-nums text-gray-600">{holeDiameter}</span>
          </div>
          <input
            type="range"
            min={2}
            max={16}
            step={0.5}
            value={holeDiameter}
            onChange={(e) => onHoleDiameter(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm">Snap (mm)</label>
            <span className="text-sm tabular-nums text-gray-600">{snapStep}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={snapStep}
            onChange={(e) => onSnapStep(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={onClearHoles}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Borrar todos
        </button>

        {/* Lista editable de agujeros (solo si llega por props) */}
        {holes && (onUpdateHole || onRemoveHole) && (
          <div className="mt-3 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-3 py-2">
              <strong className="text-sm">Agujeros ({holes.length})</strong>
            </div>

            {holes.length === 0 ? (
              <p className="px-3 pb-3 text-xs text-gray-500">
                No hay agujeros. Usa ALT/Shift + clic en el visor para añadir.
              </p>
            ) : (
              <div className="max-h-56 overflow-auto px-3 pb-3">
                <table className="w-full text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-1 text-left">X</th>
                      <th className="py-1 text-left">Y</th>
                      <th className="py-1 text-left">Z</th>
                      <th className="py-1 text-left">Ø</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {holes.map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="pr-2">
                          <input
                            type="number"
                            className="w-20 rounded-md border px-2 py-1"
                            value={Number(h.x_mm ?? 0)}
                            onChange={(e) =>
                              onUpdateHole?.(i, { x_mm: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="pr-2">
                          <input
                            type="number"
                            className="w-20 rounded-md border px-2 py-1"
                            value={Number(h.y_mm ?? 0)}
                            onChange={(e) =>
                              onUpdateHole?.(i, { y_mm: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="pr-2">
                          <input
                            type="number"
                            className="w-20 rounded-md border px-2 py-1"
                            value={Number(h.z_mm ?? 0)}
                            onChange={(e) =>
                              onUpdateHole?.(i, { z_mm: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="pr-2">
                          <input
                            type="number"
                            className="w-20 rounded-md border px-2 py-1"
                            value={Number(h.d_mm ?? 0)}
                            onChange={(e) =>
                              onUpdateHole?.(i, { d_mm: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => onRemoveHole?.(i)}
                            className="rounded-md border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Exportar */}
      <section className="mt-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Exportar
        </h4>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={!!busy}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Generando..." : "Generar STL"}
          </button>
          {stlUrl && (
            <a
              href={stlUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Descargar STL
            </a>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </section>

      <p className="mt-4 text-xs text-gray-500">
        Consejo: mantén <b>Shift</b> o <b>Alt</b> para colocar agujeros sin perder el control de la cámara.
      </p>
    </aside>
  );
}
