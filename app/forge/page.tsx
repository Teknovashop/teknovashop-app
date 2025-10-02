"use client";

import { useState } from "react";
import nextDynamic from "next/dynamic";

// Evita prerender/ISR en esta ruta
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Cargamos componentes que usan Three con SSR desactivado
const ForgeForm = nextDynamic(() => import("@/components/ForgeForm"), { ssr: false });
const STLViewerPro = nextDynamic(() => import("@/components/STLViewerPro"), { ssr: false });

export default function ForgePage() {
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6 text-neutral-100">Forge</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: formulario */}
        <div className="w-full">
          <ForgeForm onGenerated={(url: string) => setStlUrl(url)} />
        </div>

        {/* Columna derecha: visor */}
        <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-2">
          <STLViewerPro
            url={stlUrl}
            className="h-[70vh] w-full bg-black rounded-lg overflow-hidden"
          />
        </div>
      </div>
    </main>
  );
}
