"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ForgeForm from "@/components/ForgeForm";
import STLViewerPro from "@/components/STLViewerPro";

export default function ForgeWorkspace({ model, params }: { model: string; params?: string }) {
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const initialParams = useMemo(() => {
    try {
      const parsed = params ? JSON.parse(params) : undefined;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [params]);

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#07111f]">
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="Navegación del configurador" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="font-black tracking-tight">Teknovashop <span className="text-blue-600">Forge</span></Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/account" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50">Mis compras</Link>
            <Link href="/catalog" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50">← Ver catálogo</Link>
          </div>
        </nav>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 lg:grid-cols-12 lg:py-8">
        <div className="lg:col-span-4">
          <ForgeForm initialModel={model} initialParams={initialParams} onGenerated={setStlUrl} onModelChange={() => setStlUrl(null)} />
        </div>
        <section aria-label="Vista previa 3D" className="min-w-0 lg:col-span-8">
          <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" role="status">
            {stlUrl ? "Vista previa actualizada. Revisa las medidas antes de imprimir." : "Ajusta las medidas y pulsa «Generar y actualizar visor» para ver tu pieza en 3D."}
          </div>
          <STLViewerPro url={stlUrl ?? undefined} className="h-[540px] rounded-2xl border border-slate-200 bg-white" />
        </section>
      </div>
    </main>
  );
}
