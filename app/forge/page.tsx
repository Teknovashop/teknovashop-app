// app/forge/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MODELS } from "@/data/models";

export const dynamicParams = true;
export const revalidate = 0;

// ⬇️ Carga diferida (evita SSR en Vercel/Next)
const STLViewerPro = dynamic(() => import("@/components/STLViewerPro"), { ssr: false });
const ForgeForm    = dynamic(() => import("@/components/ForgeForm"),   { ssr: false });

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

// Convierte slug kebab-case -> snake_case para backend
const toBackendId = (slug: string) => slug.replace(/-/g, "_");

type UrlParams = {
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  thickness_mm?: number;
  fillet_mm?: number;
  // otros campos opcionales si los usas
};

function parseParams(q: string | null): UrlParams | null {
  if (!q) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(q));
    if (typeof obj === "object" && obj) return obj as UrlParams;
  } catch {}
  return null;
}

/** Toolbar compacta anclada al panel del visor (no toca el header) */
function ViewerToolbar() {
  const emit = (name: string, detail?: any) => {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <button
        className="rounded-md border px-2 py-1 text-xs"
        onClick={() => emit("forge:toggle-shadows")}
        title="Sombras ON/OFF"
      >
        Sombras
      </button>

      <label className="flex items-center gap-2 text-xs">
        Tone
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={50}
          onChange={(e) => emit("forge:tone", { value: Number(e.target.value) })}
        />
      </label>

      <select
        className="rounded-md border bg-white px-2 py-1 text-xs"
        onChange={(e) => emit("forge:studio", { preset: e.target.value })}
        defaultValue="studio"
        title="Iluminación"
      >
        <option value="studio">studio</option>
        <option value="hdr1">hdr 1</option>
        <option value="hdr2">hdr 2</option>
      </select>

      <button
        className="rounded-md border px-2 py-1 text-xs"
        onClick={() => emit("forge:toggle-clipping")}
        title="Clipping ON/OFF"
      >
        Clipping
      </button>

      <label className="inline-flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          defaultChecked
          onChange={(e) => emit("forge:bg", { light: e.target.checked })}
        />
        Fondo claro
      </label>

      <button
        className="rounded-md border px-2 py-1 text-xs"
        onClick={() => emit("forge:download-stl")}
        title="Descargar STL"
      >
        Descargar STL
      </button>
    </div>
  );
}

export default function ForgePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Modelo por defecto desde tu tabla de modelos
  const defaultModel = MODELS[0]?.slug ?? "vesa-adapter";
  const queryModel   = (searchParams?.model as string) || defaultModel;
  const model        = MODELS.some((m) => m.slug === queryModel) ? queryModel : defaultModel;

  // Lee parámetros desde ?params=<json-encodeURI>
  const params   = useMemo(() => parseParams(searchParams?.params as string | null), [searchParams]);
  const autogen  = (searchParams?.generate as string) === "1";
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // Auto-generar STL si vienen model+params y generate=1
  useEffect(() => {
    if (!API_BASE || !params || !autogen) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: toBackendId(model), params, holes: [] }),
        });
        const json = await res.json();
        if (res.ok && json?.stl_url) setStlUrl(json.stl_url);
      } catch {
        // silencio: el usuario puede generar desde el formulario
      }
    })();
  }, [model, params, autogen]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm
            initialModel={toBackendId(model)}            // normalizamos a snake_case para el backend
            initialParams={(params ?? undefined) as any}
            onGenerated={(url: string) => setStlUrl(url)}
          />
        </div>

        {/* Columna derecha: visor + toolbar (no toca el header ni el logo) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <ViewerToolbar />
          <STLViewerPro
            url={stlUrl}
            className="h-[520px] w-full rounded-xl bg-black/90"
          />
        </div>
      </div>
    </div>
  );
}
