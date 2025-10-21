// app/forge/page.tsx
"use client";

import { useMemo, useState } from "react";
import ForgeForm from "@/components/ForgeForm";
import STLViewerPro from "@/components/STLViewerPro";

/**
 * Esta página admite query `?model=<slug>&params=<json>`
 * y al generar recibe una URL firmada del backend que se pasa al visor.
 */
export default function ForgePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  const model = useMemo(() => {
    const m = (searchParams?.model as string) || "";
    return (m || "vesa-adapter").toLowerCase();
  }, [searchParams]);

  const initialParams = useMemo(() => {
    try {
      const p = searchParams?.params as string;
      return p ? JSON.parse(p) : undefined;
    } catch {
      return undefined;
    }
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-7xl p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <ForgeForm
          initialModel={model}
          initialParams={(initialParams ?? undefined) as any}
          onGenerated={(url: string) => setStlUrl(url)}
        />
      </div>

      <div className="lg:col-span-8">
        {stlUrl ? (
          <div className="text-sm text-green-700 mb-2 break-all">
            STL generado:{" "}
            <a className="underline" href={stlUrl} target="_blank" rel="noreferrer">
              abrir en pestaña
            </a>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 mb-2">
            Genera un STL para verlo aquí. El visor muestra rejilla/reglas aunque no haya modelo.
          </p>
        )}

        {/* 👉 Aquí se monta el visor real */}
        <STLViewerPro url={stlUrl ?? undefined} className="h-[540px] bg-white" />
      </div>
    </div>
  );
}
