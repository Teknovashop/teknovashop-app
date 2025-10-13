// app/forge/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MODELS } from "@/data/models";

export const dynamicParams = true;
export const revalidate = 0;

// Carga diferida (sin SSR)
const STLViewerPro = dynamic(() => import("@/components/STLViewerPro"), { ssr: false });
const ForgeForm    = dynamic(() => import("@/components/ForgeForm"),   { ssr: false });

const API_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "").replace(/\/+$/, "");

// kebab-case -> snake_case
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

/** Toolbar que queremos mantener (panel derecho, sobre el visor) */
function ViewerToolbar() {
  const emit = (name: string, detail?: any) => {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  };
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <button className="rounded-md border px-2 py-1 text-xs" onClick={() => emit("forge:toggle-shadows")} title="Sombras ON/OFF">
        Sombras
      </button>

      <label className="flex items-center gap-2 text-xs">
        Tone
        <input type="range" min={0.3} max={1.8} step={0.05} defaultValue={1.0}
               onChange={(e) => emit("forge:tone", { value: Number(e.target.value) })} />
      </label>

      <select className="rounded-md border bg-white px-2 py-1 text-xs"
              onChange={(e) => emit("forge:studio", { preset: e.target.value })}
              defaultValue="studio" title="Iluminación">
        <option value="studio">studio</option>
        <option value="neutral">neutral</option>
        <option value="night">night</option>
      </select>

      <button className="rounded-md border px-2 py-1 text-xs" onClick={() => emit("forge:toggle-clipping")} title="Clipping ON/OFF">
        Clipping
      </button>

      <label className="inline-flex items-center gap-1 text-xs">
        <input type="checkbox" defaultChecked onChange={(e) => emit("forge:bg", { light: e.target.checked })} />
        Fondo claro
      </label>

      <button className="rounded-md border px-2 py-1 text-xs" onClick={() => emit("forge:download-stl")} title="Descargar STL">
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
  const defaultModel = MODELS[0]?.slug ?? "vesa-adapter";
  const queryModel   = (searchParams?.model as string) || defaultModel;
  const model        = MODELS.some((m) => m.slug === queryModel) ? queryModel : defaultModel;

  const params   = useMemo(() => parseParams(searchParams?.params as string | null), [searchParams]);
  const autogen  = (searchParams?.generate as string) === "1";
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // Autogeneración opcional
  useEffect(() => {
    if (!API_BASE || !params || !autogen) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: toBackendId(model), params, holes: [], operations: [] }),
        });
        const json = await res.json();
        if (res.ok && json?.stl_url) setStlUrl(json.stl_url);
      } catch (e) {
        console.warn("Autogenerate failed:", e);
      }
    })();
  }, [model, params, autogen]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <div className="w-full">
          <ForgeForm
            initialModel={toBackendId(model)}
            initialParams={(params ?? undefined) as any}
            onGenerated={(url: string) => setStlUrl(url)}
          />
        </div>

        {/* Panel visor */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <ViewerToolbar />
          <STLViewerPro
            url={stlUrl}
            className="h-[520px] w-full rounded-xl bg-black/90"
            showHud={false}   // 🔕 desactiva HUD superpuesto del visor
          />
        </div>
      </div>
    </div>
  );
}
