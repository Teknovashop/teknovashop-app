// components/ForgeForm.tsx
"use client";

import { useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

type Params = {
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  thickness_mm?: number;
  fillet_mm?: number;   // redondeo
  round_mm?: number;    // alias aceptado (se normaliza a fillet_mm)
  [k: string]: any;
};

type TextOp = {
  text: string;
  size?: number;
  depth?: number;
  mode?: "engrave" | "emboss";
  pos?: [number, number, number];
  rot?: [number, number, number];
  font?: string | null;
};

type Props = {
  initialModel?: string;          // puede venir en kebab o snake
  initialParams?: Params;
  initialText?: string;
  onGenerated?: (url: string) => void;
};

function toSnakeFromKebab(slug: string) {
  return (slug || "").trim().toLowerCase().replace(/-/g, "_");
}

export default function ForgeForm({
  initialModel = "cable-tray",
  initialParams,
  initialText = "Teknovashop",
  onGenerated,
}: Props) {
  // UI mínima (ajústala a tus controles reales)
  const [slug, setSlug] = useState<string>(initialModel);
  const [params, setParams] = useState<Params>({
    length_mm: 120,
    width_mm: 60,
    height_mm: 8,
    thickness_mm: 2.4,
    fillet_mm: 2.0,
    ...(initialParams || {}),
  });
  const [text, setText] = useState<string>(initialText);
  const [mode, setMode] = useState<"engrave" | "emboss">("engrave");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ url?: string; signed_url?: string } | null>(null);

  async function handleGenerate() {
    try {
      setBusy(true);
      setOut(null);

      // normalizamos slug solo para el backend (acepta kebab/snake)
      const normSlug = slug.includes("_") ? slug.toLowerCase() : toSnakeFromKebab(slug);

      // alias de round_mm -> fillet_mm si procede
      const cleanParams: Params = { ...params };
      if (cleanParams.round_mm != null && cleanParams.fillet_mm == null) {
        cleanParams.fillet_mm = Number(cleanParams.round_mm);
      }

      // text_ops opcional
      const text_ops: TextOp[] =
        text?.trim()
          ? [
              {
                text: text.trim(),
                size: 8,         // alto del texto
                depth: 1.2,      // grosor de extrusión
                mode,            // "engrave" o "emboss"
                pos: [0, 0.8, 0],// y>0 para ir “encima” de placa base (ajusta según modelo)
                rot: [0, 0, 0],
              },
            ]
          : [];

      const r = await fetch(`${API_BASE}/api/forge/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: normSlug,        // el backend internamente mapea alias
          params: cleanParams,
          text_ops,
        }),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || "forge generate error");

      setOut({ url: json?.signed_url || json?.url });
      if (onGenerated) onGenerated(json?.signed_url || json?.url);
      // dispara evento global opcional
      try {
        window.dispatchEvent(new CustomEvent("stl-generated", { detail: json }));
      } catch {}
    } catch (e: any) {
      alert(e?.message || "Error generando STL");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="text-sm">Modelo (slug)</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="cable-tray | vesa-adapter | router-mount ..."
          />
        </label>

        <label>
          <span className="text-sm">Length (mm)</span>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2"
            value={params.length_mm ?? 120}
            onChange={(e) => setParams({ ...params, length_mm: Number(e.target.value) })}
          />
        </label>

        <label>
          <span className="text-sm">Width (mm)</span>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2"
            value={params.width_mm ?? 60}
            onChange={(e) => setParams({ ...params, width_mm: Number(e.target.value) })}
          />
        </label>

        <label>
          <span className="text-sm">Height (mm)</span>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2"
            value={params.height_mm ?? 8}
            onChange={(e) => setParams({ ...params, height_mm: Number(e.target.value) })}
          />
        </label>

        <label>
          <span className="text-sm">Thickness (mm)</span>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2"
            value={params.thickness_mm ?? 2.4}
            onChange={(e) => setParams({ ...params, thickness_mm: Number(e.target.value) })}
          />
        </label>

        <label>
          <span className="text-sm">Fillet (mm)</span>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2"
            value={params.fillet_mm ?? 2}
            onChange={(e) => setParams({ ...params, fillet_mm: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="text-sm">Texto (opcional)</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Texto para emboss/engrave"
          />
        </label>

        <label>
          <span className="text-sm">Modo texto</span>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="engrave">Engrave (grabar)</option>
            <option value="emboss">Emboss (relieve)</option>
          </select>
        </label>
      </div>

      <button
        className="rounded-xl px-4 py-2 shadow bg-black text-white disabled:opacity-50"
        onClick={handleGenerate}
        disabled={busy}
      >
        {busy ? "Generando..." : "Generar STL"}
      </button>

      {out?.signed_url && (
        <div className="text-sm">
          <a className="text-blue-600 underline" href={out.signed_url} target="_blank">
            Descargar STL (signed)
          </a>
        </div>
      )}
    </div>
  );
}
