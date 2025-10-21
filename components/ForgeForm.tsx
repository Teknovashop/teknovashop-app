"use client";

import React, { useMemo, useState } from "react";
import { forgeGenerate } from "@/lib/forge-config";

type TextMode = "engrave" | "emboss";

type ForgeFormProps = {
  initialModel?: string;
  initialParams?: any;
  onGenerated?: (url: string) => void;
};

type Hole = { x: number; y: number; diameter_mm: number };

const MODELS: { slug: string; label: string }[] = [
  { slug: "vesa-adapter", label: "Adaptador VESA 75/100 -> 100/200" },
  { slug: "router-mount", label: "Soporte de Router" },
  { slug: "cable-tray", label: "Bandeja de Cables" },
  { slug: "tablet-stand", label: "Soporte de Tablet" },
  { slug: "monitor-stand", label: "Elevador de Monitor" },
  { slug: "ssd-holder", label: "Caddy SSD 2.5 a 3.5" },
  { slug: "raspi-case", label: "Caja Raspberry Pi" },
  { slug: "go-pro-mount", label: "Soporte GoPro" },
  { slug: "mic-arm-clip", label: "Clip Brazo Mic" },
  { slug: "camera-plate", label: "Placa para Cámara" },
  { slug: "wall-hook", label: "Colgador de Pared" },
  { slug: "wall-bracket", label: "Escuadra de Pared" },
  { slug: "phone-dock", label: "Dock para Móvil (USB-C)" },
];

// Defaults genéricos
const DEFAULTS = {
  length_mm: 120,
  width_mm: 60,
  height_mm: 8,
  thickness_mm: 2.4,
  fillet_mm: 2,
};

function n(v: any, fb: number) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
}

export default function ForgeForm({
  initialModel,
  initialParams,
  onGenerated,
}: ForgeFormProps) {
  const normalizedInitial =
    (initialModel || "").toLowerCase().replace(/_/g, "-");

  const [slug, setSlug] = useState<string>(
    () =>
      MODELS.find((m) => m.slug === normalizedInitial)?.slug || "vesa-adapter"
  );

  const [lengthMm, setLengthMm] = useState<number>(
    n(initialParams?.length_mm, DEFAULTS.length_mm)
  );
  const [widthMm, setWidthMm] = useState<number>(
    n(initialParams?.width_mm, DEFAULTS.width_mm)
  );
  const [heightMm, setHeightMm] = useState<number>(
    n(initialParams?.height_mm, DEFAULTS.height_mm)
  );
  const [thicknessMm, setThicknessMm] = useState<number>(
    n(initialParams?.thickness_mm, DEFAULTS.thickness_mm)
  );
  const [filletMm, setFilletMm] = useState<number>(
    n(initialParams?.fillet_mm, DEFAULTS.fillet_mm)
  );

  const [text, setText] = useState<string>(initialParams?.text ?? "");
  const [textMode, setTextMode] = useState<TextMode>(
    (initialParams?.text_mode ?? "engrave") as TextMode
  );

  // ---- Agujeros: editor de filas + pegado rápido ----
  const [holes, setHoles] = useState<Hole[]>([]);
  const [paste, setPaste] = useState<string>("");

  function addHole() {
    setHoles((h) => [...h, { x: 0, y: 0, diameter_mm: 4 }]);
  }
  function removeHole(i: number) {
    setHoles((h) => h.filter((_, idx) => idx !== i));
  }
  function updateHole(i: number, key: keyof Hole, val: number) {
    setHoles((h) =>
      h.map((row, idx) => (idx === i ? { ...row, [key]: val } : row))
    );
  }
  function importFromPaste() {
    const txt = paste.trim();
    if (!txt) return;
    // Acepta: "x,y,d x,y,d"  o  "x;y;d x;y;d"  (con comas o puntos)
    const parsed: Hole[] = txt
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((tri) => tri.split(/[;,]/).map((s) => s.trim()))
      .filter((parts) => parts.length >= 3)
      .map(([xs, ys, ds]) => ({
        x: parseFloat(xs.replace(",", ".")),
        y: parseFloat(ys.replace(",", ".")),
        diameter_mm: parseFloat(ds.replace(",", ".")),
      }))
      .filter(
        (h) =>
          Number.isFinite(h.x) &&
          Number.isFinite(h.y) &&
          Number.isFinite(h.diameter_mm)
      );
    if (parsed.length) {
      setHoles(parsed);
    }
  }
  function clearHoles() {
    setHoles([]);
    setPaste("");
  }

  // Construir params
  const params = useMemo(() => {
    const L = n(lengthMm, DEFAULTS.length_mm);
    const W = n(widthMm, DEFAULTS.width_mm);
    const H = n(heightMm, DEFAULTS.height_mm);
    const T = n(thicknessMm, DEFAULTS.thickness_mm);
    const Rraw = n(filletMm, DEFAULTS.fillet_mm);
    const R = Math.max(0, Math.min(Rraw, Math.min(L, W) * 0.25));
    return {
      length_mm: L,
      width_mm: W,
      height_mm: H,
      thickness_mm: T,
      fillet_mm: R,
    };
  }, [lengthMm, widthMm, heightMm, thicknessMm, filletMm]);

  // Operación de texto
  const text_ops = useMemo(() => {
    if (!text?.trim()) return undefined;
    return [
      {
        text: text.trim(),
        size: 6,
        depth: 1.2,
        mode: textMode,
        pos: [0, 0, 0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
      },
    ];
  }, [text, textMode]);

  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);
      const payload = { slug, params, holes, text_ops };
      const data = await forgeGenerate(payload);
      const link = data?.signed_url || data?.url || "";
      if (!link) {
        alert(JSON.stringify(data || {}));
        return;
      }
      onGenerated?.(link);
    } catch (e: any) {
      alert(e?.message || "Error generando STL");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Modelo</label>
        <select
          className="w-full rounded border p-2"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Length (mm)" value={lengthMm} onChange={setLengthMm} />
        <NumberField label="Width (mm)" value={widthMm} onChange={setWidthMm} />
        <NumberField label="Height (mm)" value={heightMm} onChange={setHeightMm} />
        <NumberField label="Thickness (mm)" value={thicknessMm} onChange={setThicknessMm} />
        <NumberField label="Fillet (mm)" value={filletMm} onChange={setFilletMm} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Texto (opcional)</label>
        <input
          className="w-full rounded border p-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej.: VESA"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Modo texto</label>
        <select
          className="w-full rounded border p-2"
          value={textMode}
          onChange={(e) => setTextMode(e.target.value as TextMode)}
        >
          <option value="engrave">Engrave (grabar)</option>
          <option value="emboss">Emboss (relieve)</option>
        </select>
      </div>

      {/* ---- Editor de agujeros ---- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Agujeros</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addHole}
              className="px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300"
            >
              + Añadir
            </button>
            <button
              type="button"
              onClick={clearHoles}
              className="px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300"
            >
              Limpiar
            </button>
          </div>
        </div>

        {holes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay agujeros. Pulsa “Añadir” o usa el pegado rápido.
          </p>
        ) : (
          <div className="space-y-2">
            {holes.map((h, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  className="col-span-3 rounded border p-2"
                  value={h.x}
                  onChange={(e) => updateHole(i, "x", parseFloat(e.target.value))}
                  placeholder="x (mm)"
                />
                <input
                  type="number"
                  step="0.1"
                  className="col-span-3 rounded border p-2"
                  value={h.y}
                  onChange={(e) => updateHole(i, "y", parseFloat(e.target.value))}
                  placeholder="y (mm)"
                />
                <input
                  type="number"
                  step="0.1"
                  className="col-span-4 rounded border p-2"
                  value={h.diameter_mm}
                  onChange={(e) =>
                    updateHole(i, "diameter_mm", parseFloat(e.target.value))
                  }
                  placeholder="Ø (mm)"
                />
                <button
                  type="button"
                  onClick={() => removeHole(i)}
                  className="col-span-2 px-2 py-1 rounded bg-red-100 hover:bg-red-200"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs text-neutral-600">
            Pegado rápido (x,y,Ø en mm). Ej.: <code>5,5,5 30,5,3.2</code> ó{" "}
            <code>5;5;5 30;5;3.2</code>
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border p-2"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder='Formato: "x,y,d x,y,d" o "x;y;d x;y;d"'
            />
            <button
              type="button"
              onClick={importFromPaste}
              className="px-3 py-2 rounded bg-neutral-200 hover:bg-neutral-300"
            >
              Importar
            </button>
          </div>
        </div>
      </div>

      <button
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generando…" : "Generar STL"}
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="number"
        step="any"
        className="w-full rounded border p-2"
        value={Number.isFinite(value as any) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
