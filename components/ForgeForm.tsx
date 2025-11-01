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

type CatalogItem = { slug: string; label: string };

/** Slugs alias/adaptadores → consolidan al canónico (para evitar duplicados) */
const CANONICAL: Record<string, string> = {
  "tablet-stand": "laptop-stand",
  "phone-dock": "phone-stand",
  "monitor-stand": "cable-tray",
};
const HIDE_SLUGS = new Set<string>(Object.keys(CANONICAL));

/** Etiquetas “bonitas” */
const NICE: Record<string, string> = {
  "vesa-adapter": "Adaptador VESA 75/100 -> 100/200",
  "router-mount": "Soporte de Router",
  "cable-tray": "Bandeja de Cables",
  "laptop-stand": "Soporte Laptop / Tablet",
  "phone-stand": "Soporte / Dock Móvil (USB-C)",
  "ssd-holder": "Caddy SSD 2.5 a 3.5",
  "raspi-case": "Caja Raspberry Pi",
  "go-pro-mount": "Soporte GoPro",
  "mic-arm-clip": "Clip Brazo Mic",
  "camera-plate": "Placa para Cámara",
  "wall-hook": "Colgador de Pared",
  "wall-bracket": "Escuadra de Pared",
  "cable-clip": "Clip de Cable",
  "hub-holder": "Soporte Hub USB",
  "headset-stand": "Soporte Auriculares",
  "vesa-shelf": "Bandeja VESA",
  "enclosure-ip65": "Caja IP65",
  "qr-plate": "Placa (QR/Texto)",
};

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

function kebab(s?: string) {
  return (s || "").trim().toLowerCase().replace(/_/g, "-");
}
function canonicalize(s?: string) {
  const k = kebab(s);
  return CANONICAL[k] || k;
}

/** Fallback (sin duplicados ya canónicos) */
const FALLBACK_MODELS: CatalogItem[] = [
  "vesa-adapter",
  "router-mount",
  "cable-tray",
  "laptop-stand",
  "phone-stand",
  "ssd-holder",
  "raspi-case",
  "go-pro-mount",
  "mic-arm-clip",
  "camera-plate",
  "wall-hook",
  "wall-bracket",
  "cable-clip",
  "hub-holder",
  "headset-stand",
  "vesa-shelf",
  "enclosure-ip65",
  "qr-plate",
].map((slug) => ({
  slug,
  label:
    NICE[slug] ||
    slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
}));

export default function ForgeForm({
  initialModel,
  initialParams,
  onGenerated,
}: ForgeFormProps) {
  // Normaliza initialModel (snake->kebab) y consolida a canónico
  const normalizedInitial = canonicalize(initialModel);

  // Catálogo: arranca con fallback
  const [catalog, setCatalog] = useState<CatalogItem[]>(
    [...FALLBACK_MODELS].sort((a, b) => a.label.localeCompare(b.label, "es"))
  );

  // Slug seleccionado
  const [slug, setSlug] = useState<string>(() => {
    const found = FALLBACK_MODELS.find((m) => m.slug === normalizedInitial)?.slug;
    return found || "vesa-adapter";
  });

  // Carga dinámica desde backend (tipado explícito para evitar 'unknown[]')
  useEffect(() => {
    (async () => {
      try {
        const base = (
          process.env.NEXT_PUBLIC_FORGE_API_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_FORGE_URL ||
          ""
        ).replace(/\/+$/, "");
        if (!base) return;

        const res = await fetch(`${base}/debug/models`, { cache: "no-store" });
        if (!res.ok) return;

        const j: { models?: unknown } = await res.json();

        // Aseguramos string[]
        const rawModels: string[] = Array.isArray(j?.models)
          ? (j!.models as unknown[]).map((x) => String(x))
          : [];

        const uniqCanon: string[] = Array.from(
          new Set(
            rawModels
              .map((s) => kebab(s))
              .filter((s) => !!s && !HIDE_SLUGS.has(s))
              .map(canonicalize)
          )
        );

        if (!uniqCanon.length) return;

        const mapped: CatalogItem[] = uniqCanon
          .map((s: string) => ({
            slug: s,
            label:
              NICE[s] ||
              s
                .split("-")
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" "),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es"));

        setCatalog(mapped);

        // Selección: prioriza initialModel si existe; si no, mantiene actual; si no, el primero
        setSlug((prev) => {
          const prefer = normalizedInitial && uniqCanon.includes(normalizedInitial)
            ? normalizedInitial
            : prev;
          return uniqCanon.includes(prefer) ? prefer : mapped[0].slug;
        });
      } catch {
        /* noop: quedarse en fallback */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Parámetros base ---
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

  // Texto
  const [text, setText] = useState<string>(initialParams?.text ?? "");
  const [textMode, setTextMode] = useState<TextMode>(
    (initialParams?.text_mode ?? "engrave") as TextMode
  );
  const [anchor, setAnchor] = useState<Anchor>("front");
  const [textSize, setTextSize] = useState<number>(8);
  const [textDepth, setTextDepth] = useState<number>(1.2);
  const [textX, setTextX] = useState<number>(10);
  const [textY, setTextY] = useState<number>(10);

  // Agujeros
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
        size: textSize,
        depth: textDepth,
        mode: textMode as TextMode,
        anchor,
        pos: [textX, textY, 0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
      },
    ];
  }, [text, textMode, anchor, textSize, textDepth, textX, textY]);

  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);
      const finalSlug = canonicalize(slug);
      const model = finalSlug.replace(/-/g, "_"); // compat con builders
      const payload = { slug: finalSlug, model, params, holes, text_ops };
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

      <div className="grid grid-cols-2 gap-3">
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
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 rounded border" onClick={addHole}>
              + Añadir
            </button>
            <button type="button" className="px-3 py-1 rounded border" onClick={clearHoles}>
              Limpiar
            </button>
          </div>
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
