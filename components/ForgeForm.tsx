"use client";

import React, { useEffect, useMemo, useState } from "react";

type ForgeModel = {
  slug: string;       // kebab-case
  label: string;      // texto del dropdown
  defaults?: {
    length_mm?: number;
    width_mm?: number;
    height_mm?: number;
    thickness_mm?: number;
    fillet_mm?: number;
  };
};

type TextMode = "engrave" | "emboss";

export interface ForgeFormProps {
  /** slug en kebab-case (ej: "router-mount") */
  initialModel?: string;
  /** objeto de params iniciales {length_mm,width_mm,height_mm,thickness_mm,fillet_mm} */
  initialParams?: Partial<{
    length_mm: number;
    width_mm: number;
    height_mm: number;
    thickness_mm: number;
    fillet_mm: number;
  }>;
  /** callback cuando el backend devuelve una URL firmada */
  onGenerated?: (url: string) => void;
}

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

function kebabToTitle(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}
function parseNumber(v: string | number): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : 0;
}
function parseHoles(input: string): { x: number; y: number; diam_mm: number }[] {
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
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(d)) {
      out.push({ x, y, diam_mm: d });
    }
  }
  return out;
}

export default function ForgeForm(props: ForgeFormProps) {
  // estado base
  const [model, setModel] = useState<string>(props.initialModel || MODELS[0].slug);
  const [lengthMM, setLengthMM] = useState<number>(props.initialParams?.length_mm ?? 120);
  const [widthMM, setWidthMM] = useState<number>(props.initialParams?.width_mm ?? 60);
  const [heightMM, setHeightMM] = useState<number>(props.initialParams?.height_mm ?? 8);
  const [thicknessMM, setThicknessMM] = useState<number>(props.initialParams?.thickness_mm ?? 2.4);
  const [filletMM, setFilletMM] = useState<number>(props.initialParams?.fillet_mm ?? 2);
  const [holesText, setHolesText] = useState<string>(""); // x,y,diam ...
  const [text, setText] = useState<string>("");
  const [textMode, setTextMode] = useState<TextMode>("engrave");
  const [busy, setBusy] = useState(false);

  // sincroniza si cambian props desde la página
  useEffect(() => {
    if (props.initialModel) setModel(props.initialModel);
  }, [props.initialModel]);
  useEffect(() => {
    if (props.initialParams) {
      if (props.initialParams.length_mm != null) setLengthMM(props.initialParams.length_mm);
      if (props.initialParams.width_mm != null) setWidthMM(props.initialParams.width_mm);
      if (props.initialParams.height_mm != null) setHeightMM(props.initialParams.height_mm);
      if (props.initialParams.thickness_mm != null) setThicknessMM(props.initialParams.thickness_mm);
      if (props.initialParams.fillet_mm != null) setFilletMM(props.initialParams.fillet_mm);
    }
  }, [props.initialParams]);

  const current = useMemo(
    () => MODELS.find(m => m.slug === model) ?? MODELS[0],
    [model]
  );

  async function handleGenerate() {
    try {
      setBusy(true);

      const holes = parseHoles(holesText);
      const body: any = {
        slug: model, // kebab; backend mapea a snake
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
            pos: [0, 0, 0],
            rot: [0, 0, 0],
          },
        ];
      }

      const url = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/forge/generate";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.detail || "Error");
        return;
      }

      const signed = data?.signed_url || data?.url || "";
      if (!signed) {
        // evita alertar "{}"
        alert("Generado (sin URL).");
      } else {
        props.onGenerated?.(signed);
        // Puedes abrir la descarga directa si quieres:
        // window.open(signed, "_blank");
        alert("Generado ✅");
      }
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

      {/* tu visor 3D existente va en el panel derecho */}
      <div className="rounded border min-h-[560px]" />
    </div>
  );
}
