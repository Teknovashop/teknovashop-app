"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import STLViewerPro from "./STLViewerPro";

type Hole = {
  x_mm: number;
  y_mm: number;
  d_mm: number;
};

type GenerateReq = {
  model: string;
  params: {
    length_mm: number;
    width_mm: number;
    height_mm: number;
    thickness_mm: number;
    fillet_mm: number;
  };
  holes: Hole[];
};

type GenerateRes = {
  stl_url: string;
  object_key: string;
};

const MODELOS: { value: string; label: string }[] = [
  { value: "cable_tray", label: "Cable Tray" },
  { value: "vesa_adapter", label: "VESA Adapter" },
  { value: "router_mount", label: "Router Mount" },
  { value: "camera_mount", label: "Camera Mount" },
  { value: "wall_bracket", label: "Wall Bracket" },
  { value: "desk_hook", label: "Desk Hook" }, // ✅ nuevo
  { value: "fan_guard", label: "Fan Guard" }, // ✅ nuevo
];

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "http://localhost:10000";

export default function ForgeForm() {
  // UI
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [model, setModel] = useState<string>("cable_tray");

  // Parámetros geométricos
  const [lengthMM, setLengthMM] = useState<number>(200);
  const [widthMM, setWidthMM] = useState<number>(100);
  const [heightMM, setHeightMM] = useState<number>(60);
  const [thicknessMM, setThicknessMM] = useState<number>(3);
  const [filletMM, setFilletMM] = useState<number>(0);

  // Agujeros
  const [holes, setHoles] = useState<Hole[]>([]);
  const addHoleBtnRef = useRef<HTMLButtonElement>(null);

  // Resultado
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [lastObjectKey, setLastObjectKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evento desde el visor: ALT+clic añade agujero con x_mm,y_mm
  useEffect(() => {
    const onAddHole = (ev: Event) => {
      const custom = ev as CustomEvent;
      const detail = (custom?.detail ?? {}) as Partial<Hole>;
      const x = clampNumber(detail.x_mm ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const y = clampNumber(detail.y_mm ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const d = clampNumber(detail.d_mm ?? 4, 0, Number.MAX_SAFE_INTEGER);

      setHoles((prev) => [...prev, { x_mm: x, y_mm: y, d_mm: d }]);
      // pequeño “flash” en el botón para feedback
      addHoleBtnRef.current?.classList.add("ring-2", "ring-sky-500");
      setTimeout(() => addHoleBtnRef.current?.classList.remove("ring-2", "ring-sky-500"), 250);
    };

    window.addEventListener("forge:add-hole", onAddHole as any);
    return () => window.removeEventListener("forge:add-hole", onAddHole as any);
  }, []);

  // Construcción de payload
  const buildPayload = useCallback((): GenerateReq => {
    return {
      model,
      params: {
        length_mm: toMM(lengthMM),
        width_mm: toMM(widthMM),
        height_mm: toMM(heightMM),
        thickness_mm: toMM(thicknessMM),
        fillet_mm: toMM(filletMM),
      },
      holes: holes.map((h) => ({
        x_mm: toMM(h.x_mm),
        y_mm: toMM(h.y_mm),
        d_mm: toMM(h.d_mm),
      })),
    };
  }, [model, lengthMM, widthMM, heightMM, thicknessMM, filletMM, holes]);

  // Llamada al backend
  const generate = useCallback(
    async (): Promise<GenerateRes> => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`${API_BASE}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
        }
        const data = (await res.json()) as GenerateRes;
        setStlUrl(data.stl_url);
        setLastObjectKey(data.object_key);
        return data;
      } catch (e: any) {
        setErrorMsg(e?.message || "Error desconocido");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [buildPayload]
  );

  const onPreview = async () => {
    try {
      await generate();
    } catch {
      /* errorMsg ya seteado */
    }
  };

  const onDownload = async () => {
    try {
      const out = await generate();
      if (out?.stl_url) {
        // Abrimos la URL firmada en nueva pestaña
        window.open(out.stl_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* errorMsg ya seteado */
    }
  };

  const onAddHoleRow = () => {
    setHoles((prev) => [...prev, { x_mm: 0, y_mm: 0, d_mm: 4 }]);
  };

  const onRemoveHole = (idx: number) => {
    setHoles((prev) => prev.filter((_, i) => i !== idx));
  };

  const leftPanel = (
    <div className="space-y-5">
      {/* Tema del visor */}
      <div className="grid gap-2">
        <label className="text-sm text-neutral-300">Tema del visor</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as "light" | "dark")}
          className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-md px-3 py-2"
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Modelo */}
      <div className="grid gap-2">
        <label className="text-sm text-neutral-300">Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-md px-3 py-2"
        >
          {MODELOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-2 gap-4">
        <FieldNumber
          label="Largo (mm)"
          value={lengthMM}
          onChange={(v) => setLengthMM(v)}
        />
        <FieldNumber
          label="Ancho (mm)"
          value={widthMM}
          onChange={(v) => setWidthMM(v)}
        />
        <FieldNumber
          label="Alto (mm)"
          value={heightMM}
          onChange={(v) => setHeightMM(v)}
        />
        <FieldNumber
          label="Grosor (mm)"
          value={thicknessMM}
          onChange={(v) => setThicknessMM(v)}
        />
      </div>

      <FieldNumber
        label="Redondeo bordes (mm)"
        value={filletMM}
        onChange={(v) => setFilletMM(v)}
      />

      {/* Agujeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-300">Agujeros (vista superior)</div>
          <button
            ref={addHoleBtnRef}
            onClick={onAddHoleRow}
            className="text-xs px-2 py-1 rounded-md bg-neutral-800 text-neutral-100 border border-neutral-700"
          >
            + Añadir agujero
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Consejo: en el visor, pulsa <kbd className="px-1 py-0.5 bg-neutral-800 rounded border border-neutral-700">ALT</kbd> + clic
          para añadir un agujero en esa posición (en mm). Puedes editar diámetro y posición aquí.
        </p>

        {holes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay agujeros. Pulsa “+ Añadir agujero” o usa ALT+clic en el visor.
          </p>
        ) : (
          <div className="space-y-2">
            {holes.map((h, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <SmallNumber
                    label="x (mm)"
                    value={h.x_mm}
                    onChange={(v) => updateHole(i, { ...h, x_mm: v })}
                  />
                </div>
                <div className="col-span-4">
                  <SmallNumber
                    label="y (mm)"
                    value={h.y_mm}
                    onChange={(v) => updateHole(i, { ...h, y_mm: v })}
                  />
                </div>
                <div className="col-span-3">
                  <SmallNumber
                    label="Ø (mm)"
                    value={h.d_mm}
                    onChange={(v) => updateHole(i, { ...h, d_mm: v })}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => onRemoveHole(i)}
                    className="w-full text-xs px-2 py-2 rounded-md bg-neutral-800 text-neutral-100 border border-neutral-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-4">
        <button
          onClick={onPreview}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium"
        >
          {loading ? "Generando…" : "Previsualizar STL"}
        </button>
        <button
          onClick={onDownload}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium"
        >
          {loading ? "Generando…" : "Descargar STL"}
        </button>
      </div>

      {/* Info/errores */}
      <div className="space-y-2">
        {stlUrl && (
          <div className="text-xs break-all text-neutral-400">
            URL: <span className="underline">{stlUrl}</span>
          </div>
        )}
        {errorMsg && <div className="text-sm text-red-400">Error: {errorMsg}</div>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-5">
        <h2 className="text-neutral-100 text-lg font-semibold mb-4">Teknovashop Forge</h2>
        {leftPanel}
      </div>

      <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-2">
        <STLViewerPro
          url={stlUrl ?? null}
          className={theme === "light" ? "h-[70vh] w-full bg-white" : "h-[70vh] w-full bg-black"}
        />
      </div>
    </div>
  );

  // Helpers locales
  function updateHole(index: number, next: Hole) {
    setHoles((prev) => prev.map((h, i) => (i === index ? sanitizeHole(next) : h)));
  }
}

// ---- Componentes de inputs ----

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm text-neutral-300">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        className="w-full bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-md px-3 py-2"
        value={isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseNum(e.target.value))}
      />
    </div>
  );
}

function SmallNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        className="w-full bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1 text-sm"
        value={isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseNum(e.target.value))}
      />
    </div>
  );
}

// ---- Utilidades ----

function parseNum(s: string): number {
  const v = Number(String(s).replace(",", "."));
  return isFinite(v) ? v : 0;
}

function toMM(n: number): number {
  const v = Number(n);
  return isFinite(v) ? v : 0;
}

function clampNumber(n: number, min: number, max: number): number {
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function sanitizeHole(h: Hole): Hole {
  return {
    x_mm: toMM(h.x_mm),
    y_mm: toMM(h.y_mm),
    d_mm: Math.max(0, toMM(h.d_mm)),
  };
}
