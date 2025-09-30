"use client";

import { useState } from "react";
import ForgeForm from "@/components/ForgeForm";
import STLViewerPro from "@/components/STLViewerPro";

export default function ForgePage() {
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  return (
    <div className="relative mx-auto max-w-[1600px] px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm onGenerated={(url: string) => setStlUrl(url)} />
        </div>

        {/* Columna derecha: visor */}
        <div className="w-full">
          {stlUrl ? (
            <STLViewerPro url={stlUrl} className="h-[650px] rounded-2xl" />
          ) : (
            <div className="flex items-center justify-center h-[650px] rounded-2xl bg-neutral-900 text-neutral-400">
              Genera un STL para previsualizarlo aquí
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
