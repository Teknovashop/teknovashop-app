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
};

function parseParams(q: string | null): UrlParams | null {
  if (!q) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(q));
    if (typeof obj === "object" && obj) return obj as UrlParams;
  } catch {}
  return null;
}

export default function ForgePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const defaultModel = MODELS[0]?.slug ?? "vesa-adapter";
  const queryModel   = (searchParams?.model as string) || defaultModel;
  const model        = MODELS.some((m) => m.slug === queryModel) ? queryModel : defaultModel;

  const params   = useMemo(() => parseParams(searchParams?.params as string | null), [searchParams]);
  const autogen  = (searchParams?.generate as string) === "1";
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // Auto-generar STL
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
      } catch {}
    })();
  }, [model, params, autogen]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm
            initialModel={toBackendId(model)}
            initialParams={(params ?? undefined) as any}
            onGenerated={(url: string) => setStlUrl(url)}
          />
        </div>

        {/* Columna derecha: visor (HUD ya está dentro de STLViewerPro) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <STLViewerPro
            url={stlUrl}
            className="h-[520px] w-full rounded-xl bg-black/90"
          />
        </div>
      </div>
    </div>
  );
}
