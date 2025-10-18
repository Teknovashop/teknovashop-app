// components/ForgeForm.tsx
"use client";

import React, { useMemo, useState } from "react";

type ForgeModel = {
  slug: string;       // kebab-case
  label: string;      // mostrado en el select
  defaults?: {
    length_mm?: number;
    width_mm?: number;
    height_mm?: number;
    thickness_mm?: number;
    fillet_mm?: number;
  };
};

const MODELS: ForgeModel[] = [
  { slug: "vesa-adapter", label: "Adaptador VESA 75/100 -> 100/200" },
  { slug: "router-mount", label: "Soporte de Router" },
  { slug: "cable-tray", label: "Bandeja de Cables" },
  { slug: "phone-dock", label: "Dock para Móvil (USB-C)" },
  { slug: "tablet-stand", label: "Soporte de Tablet" },
  { slug: "monitor-stand", label: "Elevador de Monitor" },
  { slug: "raspi-case", label: "Caja Raspberry Pi" },
  { slug: "go-pro-mount", label: "Soporte GoPro" },
  { slug: "mic-arm-clip", label: "Clip Brazo Mic" },
  { slug: "ssd-holder", label: "Caddy SSD 2.5 a 3.5" },
  { slug: "camera-plate", label: "Placa Cámara" },
  { slug: "wall-hook", label: "Gancho de Pared" },
  { slug: "wall-bracket", label: "Soporte de Pared" },
];

type TextMode = "engrave" | "emboss";

function kebabToTitle(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

function parseNumber(v: string | number): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : 0;
}

function parseHoles(input: string): { x: number; y: number; diam_mm: number }[] {
  // Formatos admitidos: "x,y,d x,y,d" o "x,y,d; x,y,d"
  // Ejemplo: "5,5,5  10,5,3.2"  -> [{x:5,y:5,d:5},{x:10,y:5,d:3.2}]
  if (!input?.trim()) return [];
  const chunks = input
    .replace(/;/g, " ")
    .split(/\s+/)
    .map(c => c.trim())
    .filter(Boolean);

  const out: { x: number; y: number; diam_mm: number }[] = [];
  for (const c of chunks) {
    const parts = c.split(",").map(p => p.trim());
    if (parts.length < 3) continue;
    const x = parseNumber(parts[0]);
    const y = parseNumber(parts[1]);
    const d = parseNumber(parts[2]);
    if (x || y || d) {
      out.push({ x, y, diam_mm: d });
    }
  }
  return out;
}

export default function ForgeForm() {
  const [model, setModel] = useState<string>(MODELS[0].slug);
  const [lengthMM, setLengthMM] = useState<number>(120);
  const [widthMM, setWidthMM] = useState<number>(60);
  const [heightMM, setHeightMM] = useState<number>(8);
  const [thicknessMM, setThicknessMM] = useState<number>(2.4);
  const [filletMM, setFilletMM] = useState<number>(2);
  const [holesText, setHolesText] = useState<string>(""); // x,y,d ...
  const [text, setText] = useState<string>("");
  const [textMode, setTextMode] = useState<TextMode>("engrave");
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => MODELS.find(m => m.slug === model) ?? MODELS[0],
    [model]
  );

  async function handleGenerate() {
    try {
      setBusy(true);

      const holes = parseHoles(holesText);
      const body: any = {
        slug: model, // kebab-case; el backend lo mapea a snake
        params: {
          length_mm: lengthMM,
          width_mm: widthMM,
          height_mm: heightMM,
          thickness_mm: thicknessMM,
          fillet_mm: filletMM,
        },
        holes,
      };

      if (text?.trim()) {
        body.text_ops = [
          {
            text: text.trim(),
            mode: textMode, // "engrave" | "emboss"
            size: Math.max(6, Math.min(widthMM * 0.5, 20)),
            depth: Math.max(0.6, thicknessMM * 0.5),
            pos: [0, 0, 0], // los builders suelen centrar; el backend hace el merge sin romper
            rot: [0, 0, 0],
          },
        ];
      }

      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL || "/api/forge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.detail || "Error");
        return;
      }

      // Esperamos { ok, path, signed_url }
      if (!data?.signed_url && !data?.path) {
        alert(JSON.stringify(data || {}));
        return;
      }

      // Descarga directa si el visor no auto-carga:
      // window.open(data.signed_url ?? "", "_blank");

      alert("Generado ✅");
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[360px,1fr] gap-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Modelo</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label || kebabToTitle(m.slug)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Length (mm)</label>
            <input className="w-full border rounded px-2 py-1"
              value={lengthMM} onChange={(e)=>setLengthMM(parseNumber(e.target.value))}/>
          </div>
          <div>
            <label className="block text-sm">Width (mm)</label>
            <input className="w-full border rounded px-2 py-1"
              value={widthMM} onChange={(e)=>setWidthMM(parseNumber(e.target.value))}/>
          </div>
          <div>
            <label className="block text-sm">Height (mm)</label>
            <input className="w-full border rounded px-2 py-1"
              value={heightMM} onChange={(e)=>setHeightMM(parseNumber(e.target.value))}/>
          </div>
          <div>
            <label className="block text-sm">Thickness (mm)</label>
            <input className="w-full border rounded px-2 py-1"
              value={thicknessMM} onChange={(e)=>setThicknessMM(parseNumber(e.target.value))}/>
          </div>
          <div>
            <label className="block text-sm">Fillet (mm)</label>
            <input className="w-full border rounded px-2 py-1"
              value={filletMM} onChange={(e)=>setFilletMM(parseNumber(e.target.value))}/>
          </div>
        </div>

        <div>
          <label className="block text-sm">Texto (opcional)</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="VESA"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm">Modo texto</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={textMode}
            onChange={(e) => setTextMode(e.target.value as TextMode)}
          >
            <option value="engrave">Engrave (grabar)</option>
            <option value="emboss">Emboss (relieve)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Agujeros (x,y,diámetro en mm; …)</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="5,5,5  30,5,3.2"
            value={holesText}
            onChange={(e) => setHolesText(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: "x,y,d x,y,d" ó "x,y,d; x,y,d". Ej.: <code>5,5,5 30,5,3.2</code>
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {busy ? "Generando..." : "Generar STL"}
        </button>
      </div>

      {/* El visor existente queda como estaba en tu proyecto */}
      <div className="rounded border min-h-[560px]">
        {/* Aquí renderizas tu visor actual (THREE/React-Three-Fiber, etc.) */}
      </div>
    </div>
  );
}
