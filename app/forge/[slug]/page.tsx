// app/forge/[slug]/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Fields = Record<string, { label: string; type: "number"; step?: number; min?: number; defaultValue: number }>;

const FIELDS: Record<string, Fields> = {
  "vesa-adapter": {
    width: { label: "Ancho placa (mm)", type: "number", step: 1, min: 60, defaultValue: 120 },
    height:{ label: "Alto placa (mm)",  type: "number", step: 1, min: 60, defaultValue: 120 },
    thickness:{ label: "Grosor (mm)", type: "number", step: 0.5, min: 2, defaultValue: 5 },
    pattern_from:{ label: "Patrón desde (mm)", type: "number", step: 25, min: 50, defaultValue: 75 },
    pattern_to:{ label: "Patrón hasta (mm)", type: "number", step: 25, min: 75, defaultValue: 100 },
    hole_d:{ label: "Ø agujero (mm)", type: "number", step: 0.5, min: 3, defaultValue: 5 },
  },
  "router-mount": {
    base_w:{ label: "Ancho base (mm)", type: "number", step: 1, min: 40, defaultValue: 80 },
    base_h:{ label: "Alto placa (mm)", type: "number", step: 1, min: 60, defaultValue: 100 },
    depth:{ label: "Fondo repisa (mm)", type: "number", step: 1, min: 30, defaultValue: 60 },
    thickness:{ label: "Grosor (mm)", type: "number", step: 0.5, min: 3, defaultValue: 4 },
    hole_d:{ label: "Ø tornillo (mm)", type: "number", step: 0.5, min: 3, defaultValue: 4 },
  },
  "cable-tray": {
    width:{ label: "Ancho (mm)", type: "number", step: 1, min: 100, defaultValue: 220 },
    depth:{ label: "Fondo (mm)", type: "number", step: 1, min: 40, defaultValue: 80 },
    height:{ label: "Altura (mm)", type: "number", step: 1, min: 30, defaultValue: 50 },
    wall:{ label: "Espesor pared (mm)", type: "number", step: 0.5, min: 3, defaultValue: 4 },
  },
};

export default function ForgeConfigurator({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const schema = FIELDS[params.slug] || {};
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.defaultValue]))
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onChange = (k: string, v: string) => {
    const n = Number(v);
    setValues((s) => ({ ...s, [k]: isNaN(n) ? s[k] : n }));
  };

  const generate = async () => {
    setErr(null); setDownloadUrl(null); setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: params.slug, params: values }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Error generando STL");
      setDownloadUrl(json.url);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-sm text-neutral-500 mb-3">← Volver</button>
      <h1 className="text-2xl font-bold mb-4 capitalize">Configurar: {params.slug.replace("-", " ")}</h1>

      {Object.keys(schema).length === 0 ? (
        <p className="text-neutral-600">Este modelo aún no tiene configurador. Próximamente. 🙂</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(schema).map(([key, cfg]) => (
            <label key={key} className="text-sm">
              <span className="block mb-1">{cfg.label}</span>
              <input
                type="number"
                defaultValue={cfg.defaultValue}
                step={cfg.step}
                min={cfg.min}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading || Object.keys(schema).length === 0}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Generando…" : "Generar STL"}
        </button>

        {downloadUrl && (
          <a
            className="rounded-lg border px-4 py-2"
            href={downloadUrl}
            download={`${params.slug}.stl`}
            rel="noopener"
          >
            Descargar resultado
          </a>
        )}
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
  );
}
