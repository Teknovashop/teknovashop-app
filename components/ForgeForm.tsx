"use client";

import React, { useEffect, useMemo, useState } from "react";
import { forgeGenerate } from "@/lib/forge-config";

type TextMode = "engrave" | "emboss";
type Anchor = "front" | "back" | "left" | "right" | "top" | "bottom";
type Hole = { x: number; y: number; diameter_mm: number };

type ForgeFormProps = {
  initialModel?: string;
  initialParams?: any;
  onGenerated?: (url: string) => void;
};

/** Fallback local por si el backend no responde */
const FALLBACK_MODELS: { slug: string; label: string }[] = [
  { slug: "vesa-adapter", label: "Adaptador VESA 75/100 -> 100/200" },
  { slug: "router-mount", label: "Soporte de Router" },
  { slug: "cable-tray", label: "Bandeja de Cables" },
  { slug: "tablet-stand", label: "Soporte de Tablet" },
  { slug: "monitor-stand", label: "Elevador de Monitor" },
  { slug: "laptop-stand", label: "Soporte Laptop" },
  { slug: "phone-dock", label: "Dock para Móvil (USB-C)" },
  { slug: "phone-stand", label: "Soporte Móvil" },
  { slug: "ssd-holder", label: "Caddy SSD 2.5 a 3.5" },
  { slug: "raspi-case", label: "Caja Raspberry Pi" },
  { slug: "go-pro-mount", label: "Soporte GoPro" },
  { slug: "mic-arm-clip", label: "Clip Brazo Mic" },
  { slug: "camera-plate", label: "Placa para Cámara" },
  { slug: "wall-hook", label: "Colgador de Pared" },
  { slug: "wall-bracket", label: "Escuadra de Pared" },
  { slug: "cable-clip", label: "Clip de Cable" },
  { slug: "hub-holder", label: "Soporte Hub USB" },
  { slug: "headset-stand", label: "Soporte Auriculares" },
  { slug: "vesa-shelf", label: "Bandeja VESA" },
  { slug: "enclosure-ip65", label: "Caja IP65" },
];

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

/** “Nombre bonito” para slugs que vengan del backend */
const NICE: Record<string, string> = {
  "vesa-adapter": "Adaptador VESA 75/100 -> 100/200",
  "router-mount": "Soporte de Router",
  "cable-tray": "Bandeja de Cables",
  "tablet-stand": "Soporte de Tablet",
  "monitor-stand": "Elevador de Monitor",
  "ssd-holder": "Caddy SSD 2.5 a 3.5",
  "raspi-case": "Caja Raspberry Pi",
  "go-pro-mount": "Soporte GoPro",
  "mic-arm-clip": "Clip Brazo Mic",
  "camera-plate": "Placa para Cámara",
  "wall-hook": "Colgador de Pared",
  "wall-bracket": "Escuadra de Pared",
  "phone-dock": "Dock para Móvil (USB-C)",
  "qr-plate": "Placa (QR/Texto)",
  "cable-clip": "Clip de Cable",
  "laptop-stand": "Soporte Laptop",
  "phone-stand": "Soporte Móvil",
  "vesa-shelf": "Bandeja VESA",
  "enclosure-ip65": "Caja IP65",
  "headset-stand": "Soporte Auriculares",
};

export default function ForgeForm({
  initialModel,
  initialParams,
  onGenerated,
}: ForgeFormProps) {
  const normalizedInitial =
    (initialModel || "").toLowerCase().replace(/_/g, "-");

  const [catalog, setCatalog] = useState<{ slug: string; label: string }[]>(
    FALLBACK_MODELS
  );

  // Carga dinámica desde el backend (si falla, se queda el fallback)
  useEffect(() => {
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_FORGE_URL || "";
        if (!base) return;
        const res = await fetch(`${base}/debug/models`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        const slugs: string[] = (j?.models || []).map((s: string) =>
          String(s || "").trim().toLowerCase().replace(/_/g, "-")
        );
        const uniq = Array.from(new Set(slugs));
        if (uniq.length) {
          setCatalog(
            uniq
              .map((slug) => ({
                slug,
                label:
                  NICE[slug] ||
                  slug
                    .split("-")
                    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                    .join(" "),
              }))
              .sort((a, b) => a.label.localeCompare(b.label, "es"))
          );
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  const [slug, setSlug] = useState<string>(() => {
    const all = [...FALLBACK_MODELS];
    const found =
      all.find((m) => m.slug === normalizedInitial)?.slug || "vesa-adapter";
    return found;
  });

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
  const [anchor, setAnchor] = useState<Anchor>("front");
  const [textSize, setTextSize] = useState<number>(8);   // NUEVO
  const [textDepth, setTextDepth] = useState<number>(1.2); // NUEVO
  const [textX, setTextX] = useState<number>(0);         // NUEVO
  const [textY, setTextY] = useState<number>(0);         // NUEVO

  // ------- Agujeros: UI avanzada -------
  const [holes, setHoles] = useState<Hole[]>([]);
  const [bulk, setBulk] = useState("");

  function addHole() {
    setHoles((prev) => [...prev, { x: 0, y: 0, diameter_mm: 4 }]);
  }
  function updateHole(i: number, key: keyof Hole, val: number) {
    setHoles((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, [key]: val } : h))
    );
  }
  function removeHole(i: number) {
    setHoles((prev) => prev.filter((_, idx) => idx !== i));
  }
  function clearHoles() {
    setHoles([]);
    setBulk("");
  }
  function importBulk() {
    const list = bulk
      .trim()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((triple) => triple.split(/[;,]/).map((s) => s.trim()))
      .filter((p) => p.length >= 3)
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
    if (list.length) setHoles(list);
  }

  const params = useMemo(() => {
    const L = n(lengthMm, DEFAULTS.length_mm);
    const W = n(widthMm, DEFAULTS.width_mm);
    const H = n(heightMm, DEFAULTS.height_mm);
    const T = n(thicknessMm, DEFAULTS.thickness_mm);
    const Rraw = n(filletMm, DEFAULTS.fillet_mm);
    const R = Math.max(0, Math.min(Rraw, Math.min(L, W) * 0.25));
    return { length_mm: L, width_mm: W, height_mm: H, thickness_mm: T, fillet_mm: R };
  }, [lengthMm, widthMm, heightMm, thicknessMm, filletMm]);

  const text_ops = useMemo(() => {
    if (!text?.trim()) return undefined;
    return [
      {
        text: text.trim(),
        size: n(textSize, 8),
        depth: n(textDepth, 1.2),
        mode: textMode as TextMode,
        anchor,
        pos: [n(textX, 0), n(textY, 0), 0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
      },
    ];
  }, [text, textMode, anchor, textSize, textDepth, textX, textY]);

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
          {catalog.map((m) => (
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

        <div>
          <label className="block text-sm font-medium mb-1">Anclar texto</label>
          <select
            className="w-full rounded border p-2"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value as Anchor)}
          >
            <option value="front">Frente</option>
            <option value="back">Dorso</option>
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
            <option value="top">Arriba</option>
            <option value="bottom">Abajo</option>
          </select>
        </div>

        <NumberField label="Text Size (mm)" value={textSize} onChange={setTextSize} />
        <NumberField label="Text Depth (mm)" value={textDepth} onChange={setTextDepth} />
        <NumberField label="Text X (mm)" value={textX} onChange={setTextX} />
        <NumberField label="Text Y (mm)" value={textY} onChange={setTextY} />
      </div>

      {/* Agujeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Agujeros</label>
        </div>

        {holes.length === 0 && (
          <p className="text-xs text-neutral-500">
            No hay agujeros. Pulsa “Añadir” o usa el pegado rápido.
          </p>
        )}

        {holes.map((h, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 items-center">
            <span className="text-xs col-span-1">#{i + 1}</span>
            <NumberSmall label="x" value={h.x} onChange={(v) => updateHole(i, "x", v)} />
            <NumberSmall label="y" value={h.y} onChange={(v) => updateHole(i, "y", v)} />
            <NumberSmall
              label="Ø (mm)"
              value={h.diameter_mm}
              onChange={(v) => updateHole(i, "diameter_mm", v)}
            />
            <div className="col-span-2" />
            <button
              type="button"
              className="px-2 py-1 border rounded text-sm"
              onClick={() => removeHole(i)}
            >
              Quitar
            </button>
          </div>
        ))}

        <div className="mt-2">
          <p className="text-xs text-neutral-500">
            Pegado rápido (x,y,Ø en mm). Ej.: <code>5,5,5 30,5,3.2</code> ó{" "}
            <code>5;5;5 30;5;3.2</code>
          </p>
          <div className="flex gap-2">
            <input
              className="w-full rounded border p-2"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder='Formato: "x,y,d x,y,d" o "x;y;d x;y;d"'
            />
            <button type="button" className="px-3 py-2 rounded border" onClick={importBulk}>
              Importar
            </button>
            <button type="button" className="px-3 py-2 rounded border" onClick={addHole}>
              + Añadir
            </button>
            <button type="button" className="px-3 py-2 rounded border" onClick={clearHoles}>
              Limpiar
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

function NumberSmall({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="text-xs flex items-center gap-1">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        className="w-24 rounded border p-1 text-sm"
        value={Number.isFinite(value as any) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
