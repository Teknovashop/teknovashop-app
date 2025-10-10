// app/forge/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MODELS } from "@/data/models";

export const dynamicParams = true;
export const revalidate = 0;

// Carga diferida de tus componentes Three si los usas
const STLViewerPro = dynamic(() => import("@/components/STLViewerPro"), { ssr: false });
const ForgeForm = dynamic(() => import("@/components/ForgeForm"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

/** Renombrado para evitar colisiones con tipos de ForgeForm */
type UrlParams = {
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  thickness_mm?: number;
  fillet_mm?: number;
  // añade aquí otros campos opcionales que envíes al backend
};

function parseParams(q: string | null): UrlParams | null {
  if (!q) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(q));
    if (typeof obj === "object" && obj) return obj as UrlParams;
  } catch {}
  return null;
}

// Convierte slug kebab-case -> snake_case para el backend/forma si hace falta
const toBackendId = (slug: string) => slug.replace(/-/g, "_");

export default function ForgePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const defaultModel = MODELS[0]?.slug ?? "vesa-adapter";
  const queryModel = (searchParams?.model as string) || defaultModel;

  // Garantiza que sea uno de los modelos que existen
  const model = MODELS.some((m) => m.slug === queryModel) ? queryModel : defaultModel;

  // Lee parámetros desde ?params=<json-encodeURI>
  const params = useMemo(
    () => parseParams(searchParams?.params as string | null),
    [searchParams]
  );
  const autogen = (searchParams?.generate as string) === "1";

  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // Auto-generar STL si vienen model+params y generate=1
  useEffect(() => {
    if (!API_BASE || !params || !autogen) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // el backend espera snake_case en `model`
          body: JSON.stringify({ model: toBackendId(model), params, holes: [] }),
        });
        const json = await res.json();
        if (res.ok && json?.stl_url) setStlUrl(json.stl_url);
      } catch {
        // silencio: el usuario siempre puede generar desde el formulario
      }
    })();
  }, [model, params, autogen]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm
            initialModel={toBackendId(model)}             // ✅ normalizamos a snake_case para el form
            initialParams={(params ?? undefined) as any}   // evitar choque de tipos con ForgeForm
            onGenerated={(url: string) => setStlUrl(url)}
          />
        </div>

        {/* Columna derecha: visor(es) */}
        <div className="grid gap-6">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-900/2 p-3">
            <STLViewerPro url={stlUrl} className="h-[480px] w-full rounded-xl bg-black/90" />
          </div>
        </div>
      </div>
    </div>
  );
}
