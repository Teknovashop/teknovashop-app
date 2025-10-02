// app/forge/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

export const dynamicParams = true;
export const revalidate = 0;

// Carga diferida de tus componentes Three si los usas
const STLViewerPro = dynamic(() => import("@/components/STLViewerPro"), { ssr: false });
const ForgeForm = dynamic(() => import("@/components/ForgeForm"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

function parseParams(q: string | null): Params | null {
  if (!q) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(q));
    if (typeof obj === "object" && obj) return obj as Params;
  } catch {}
  return null;
}

export default function ForgePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const model = (searchParams?.model as string) || "cable_tray";
  const params = useMemo(() => parseParams(searchParams?.params as string | null), [searchParams]);
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
          body: JSON.stringify({ model, params, holes: [] }),
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
      <h1 className="sr-only">Forge</h1>
      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm
            initialModel={model}
            initialParams={params ?? undefined}
            onGenerated={(url: string) => setStlUrl(url)}
          />
        </div>

        {/* Columna derecha: visor(es) */}
        <div className="grid gap-6">
          {/* Vista izquierda: (si tienes doble visor, mantenlo) */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-900/2 p-3">
            <STLViewerPro url={stlUrl} className="h-[480px] w-full rounded-xl bg-black/90" />
          </div>
        </div>
      </div>
    </div>
  );
}
