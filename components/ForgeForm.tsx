// components/ForgeForm.tsx
"use client";

import { useState } from "react";
import { MODELS } from "@/data/models";

const API_ROUTE = "/api/forge/generate";

type Params = {
  length_mm?: number; width_mm?: number; height_mm?: number;
  thickness_mm?: number; fillet_mm?: number; [k: string]: any;
};
type TextMode = "engrave" | "emboss";
const num = (v: any, fallback?: number) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number") return isFinite(v) ? v : fallback;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : fallback;
};

const CATALOG = (MODELS as any[]) || [];

export default function ForgeForm({
  initialModel,
  initialParams,
  initialText = "Teknovashop",
  onGenerated,
}: {
  initialModel?: string;
  initialParams?: Params;
  initialText?: string;
  onGenerated?: (url: string) => void;
}) {
  const defaultSlug =
    (initialModel && initialModel.trim()) ||
    (CATALOG[0]?.slug ?? "cable-tray");

  const [model, setModel] = useState<string>(defaultSlug);
  const [params, setParams] = useState<Params>({
    length_mm: 120, width_mm: 60, height_mm: 8, thickness_mm: 2.4, fillet_mm: 2,
    ...(initialParams || {}),
  });
  const [text, setText] = useState<string>(initialText);
  const [textMode, setTextMode] = useState<TextMode>("engrave");
  const [busy, setBusy] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const update = (key: keyof Params) => (e: any) =>
    setParams((p) => ({ ...p, [key]: e?.target?.value }));

  async function handleGenerate() {
    try {
      setBusy(true);
      setDownloadUrl(null);

      const clean: Params = {
        length_mm: num(params.length_mm, 120),
        width_mm: num(params.width_mm, 60),
        height_mm: num(params.height_mm, 8),
        thickness_mm: num(params.thickness_mm, 2.4),
        fillet_mm: num(params.fillet_mm, 2),
      };

      const text_ops =
        text?.trim()
          ? [{ text: text.trim(), size: 8, depth: 1.2, mode: textMode, pos: [0, 0.8, 0], rot: [0, 0, 0] }]
          : [];

      // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
      // MANDAR slug y model (backend requiere 'slug')
      const r = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: model, model, params: clean, text_ops }),
      });
      // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok || !j?.url) throw new Error(j?.error || "forge generate error");

      setDownloadUrl(j.url);
      onGenerated?.(j.url);
      try { window.dispatchEvent(new CustomEvent("stl-generated", { detail: j })); } catch {}
    } catch (e: any) {
      alert(e?.message || "forge generate error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm">Modelo</span>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {CATALOG.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.title ?? m.label ?? m.name ?? m.displayName ?? m.slug}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label><span className="text-sm">Length (mm)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={params.length_mm ?? ""} onChange={update("length_mm")} />
        </label>
        <label><span className="text-sm">Width (mm)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={params.width_mm ?? ""} onChange={update("width_mm")} />
        </label>
        <label><span className="text-sm">Height (mm)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={params.height_mm ?? ""} onChange={update("height_mm")} />
        </label>
        <label><span className="text-sm">Thickness (mm)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={params.thickness_mm ?? ""} onChange={update("thickness_mm")} />
        </label>
        <label><span className="text-sm">Fillet (mm)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={params.fillet_mm ?? ""} onChange={update("fillet_mm")} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2"><span className="text-sm">Texto (opcional)</span>
          <input className="mt-1 w-full rounded border px-3 py-2" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label><span className="text-sm">Modo texto</span>
          <select className="mt-1 w-full rounded border px-3 py-2" value={textMode} onChange={(e) => setTextMode(e.target.value as TextMode)}>
            <option value="engrave">Engrave (grabar)</option>
            <option value="emboss">Emboss (relieve)</option>
          </select>
        </label>
      </div>

      <button className="rounded-xl px-4 py-2 shadow bg-black text-white disabled:opacity-50" onClick={handleGenerate} disabled={busy}>
        {busy ? "Generando..." : "Generar STL"}
      </button>

      {downloadUrl && (
        <div className="text-sm">
          <a className="text-blue-600 underline" href={downloadUrl} target="_blank" rel="noreferrer">Descargar STL</a>
        </div>
      )}
    </div>
  );
}
