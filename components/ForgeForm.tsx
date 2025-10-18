"use client";

import React, { useEffect, useMemo, useState } from "react";

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

const DEFAULTS = { length_mm: 120, width_mm: 60, height_mm: 8, thickness_mm: 2.4, fillet_mm: 2 };

const FORGE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ||
  "https://teknovashop-forge.onrender.com";

export default function ForgeForm({
  initialModel,
  initialParams,
  onGenerated,
}: ForgeFormProps) {
  const [slug, setSlug] = useState<string>(
    () =>
      (initialModel &&
        MODELS.find((m) => m.slug === initialModel.toLowerCase())?.slug) ||
      "vesa-adapter"
  );

  const [lengthMm, setLengthMm] = useState<number>(initialParams?.length_mm ?? DEFAULTS.length_mm);
  const [widthMm, setWidthMm] = useState<number>(initialParams?.width_mm ?? DEFAULTS.width_mm);
  const [heightMm, setHeightMm] = useState<number>(initialParams?.height_mm ?? DEFAULTS.height_mm);
  const [thicknessMm, setThicknessMm] = useState<number>(initialParams?.thickness_mm ?? DEFAULTS.thickness_mm);
  const [filletMm, setFilletMm] = useState<number>(initialParams?.fillet_mm ?? DEFAULTS.fillet_mm);

  const [text, setText] = useState<string>(initialParams?.text ?? "");
  const [textMode, setTextMode] = useState<TextMode>((initialParams?.text_mode ?? "engrave") as TextMode);

  // Agujeros: cadena "x,y,d x,y,d …" o "x;y;d; x;y;d"
  const [holesStr, setHolesStr] = useState<string>("");

  // Normaliza y valida agujeros
  const holes: Hole[] = useMemo(() => {
    if (!holesStr.trim()) return [];
    // Admitimos separadores por espacio entre pares, y coma/espacio/puntoycoma dentro
    return holesStr
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((triple) => triple.split(/[;,]/).map((s) => s.trim()))
      .filter((parts) => parts.length >= 3)
      .map(([xs, ys, ds]) => ({
        x: parseFloat(xs.replace(",", ".")),
        y: parseFloat(ys.replace(",", ".")),
        diameter_mm: parseFloat(ds.replace(",", ".")),
      }))
      .filter((h) => Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isFinite(h.diameter_mm));
  }, [holesStr]);

  // Construir params para el back
  const params = useMemo(() => {
    return {
      length_mm: Number(lengthMm),
      width_mm: Number(widthMm),
      height_mm: Number(heightMm),
      thickness_mm: Number(thicknessMm),
      fillet_mm: Number(filletMm),
    };
  }, [lengthMm, widthMm, heightMm, thicknessMm, filletMm]);

  const text_ops = useMemo(() => {
    if (!text?.trim()) return undefined;
    return [
      {
        text: text.trim(),
        size: 6,
        depth: 1.2,
        mode: textMode, // "engrave" | "emboss"
        pos: [0, 0, 0],
        rot: [0, 0, 0],
      },
    ];
  }, [text, textMode]);

  async function handleGenerate() {
    try {
      const body = {
        slug,              // <- el backend acepta kebab o snake
        params,
        holes,
        text_ops,
      };

      const res = await fetch(`${FORGE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.detail || d?.message || res.statusText);
        return;
      }

      const data = await res.json();
      // El server devuelve: { ok, path, url, signed_url, ... }
      const link = data?.signed_url || data?.url || null;
      if (!link) {
        alert(JSON.stringify(data || {}));
        return;
      }
      onGenerated?.(link);
    } catch (e: any) {
      alert(e?.message || "Error generando STL");
    }
  }

  // Render
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

      <div>
        <label className="block text-sm font-medium mb-1">
          Agujeros (x,y,diámetro en mm; …)
        </label>
        <input
          className="w-full rounded border p-2"
          value={holesStr}
          onChange={(e) => setHolesStr(e.target.value)}
          placeholder='Formato: "x,y,d x,y,d". Ej.: 5,5,5 30,5,3.2'
        />
        <p className="text-xs text-neutral-500 mt-1">
          Separe con espacios los agujeros y use coma o punto y coma entre valores.
        </p>
      </div>

      <button
        className="px-4 py-2 rounded bg-blue-600 text-white"
        onClick={handleGenerate}
      >
        Generar STL
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
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
