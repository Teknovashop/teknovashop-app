"use client";

import { useMemo, useState } from "react";
import ForgeForm from "@/components/ForgeForm";

/**
 * Esta página admite query `?model=<slug>&params=<json>`
 * pero si no vienen, usa defaults. El back espera `slug` en kebab o snake.
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
      if (!p) return undefined;
      return JSON.parse(p);
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
        {/* El visor que ya tienes (Three.js/Canvas) debería leer el STL desde `stlUrl` si lo usas.
           Aquí solo lo conservamos para no tocar tu visor. */}
        {stlUrl ? (
          <div className="text-sm text-green-700 mb-2">
            STL generado: <a className="underline" href={stlUrl} target="_blank" rel="noreferrer">{stlUrl}</a>
          </div>
        ) : null}
        <div id="forge-viewer" className="w-full min-h-[520px] rounded border border-neutral-200" />
      </div>
    </div>
  );
}
