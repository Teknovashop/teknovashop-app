// app/forge/[slug]/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ForgeModelSlug } from "@/lib/forge-spec";
import { DEFAULT_PARAMS, FIELDS } from "@/lib/forge-config";

export default function ForgeConfigurator({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const slug = params.slug as ForgeModelSlug;

  const schema = FIELDS[slug] || {};
  const initial = useMemo(() => {
    // usa DEFAULT_PARAMS si existe; si no, genera a partir del schema
    if (DEFAULT_PARAMS[slug]) return { ...DEFAULT_PARAMS[slug] };
    return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.defaultValue]));
  }, [slug, schema]);

  const [values, setValues] = useState<Record<string, any>>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onChange = (k: string, v: string) => {
    const n = Number(v);
    setValues((s) => ({ ...s, [k]: isNaN(n) ? s[k] : n }));
  };

  const generate = async () => {
    if (!Object.keys(schema).length && !DEFAULT_PARAMS[slug]) return;

    setErr(null);
    setDownloadUrl(null);
    setLoading(true);
    try {
      const res = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: slug, params: values }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(json?.detail || json?.error || "No se pudo generar el STL");
      }
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
      <h1 className="text-2xl font-bold mb-4 capitalize">Configurar: {String(slug).replaceAll("-", " ")}</h1>

      {Object.keys(schema).length === 0 ? (
        <p className="text-neutral-600">Este modelo aún no tiene configurador visual. Puedes generar con los parámetros por defecto.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(schema).map(([key, cfg]) => (
            <label key={key} className="text-sm">
              <span className="block mb-1">{cfg.label}</span>
              <input
                type="number"
                defaultValue={Number(values[key] ?? cfg.defaultValue)}
                step={cfg.step}
                min={cfg.min}
                max={cfg.max}
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
          disabled={loading}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Generando…" : "Generar STL"}
        </button>

        {downloadUrl && (
          <a
            className="rounded-lg border px-4 py-2"
            href={downloadUrl}
            download={`${slug}.stl`}
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
