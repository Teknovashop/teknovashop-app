"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ForgeForm from "@/components/ForgeForm";
import STLViewerPro from "@/components/STLViewerPro";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 3 19 6v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6l7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.6-4" />
    </svg>
  );
}

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
    <main className="min-h-screen bg-[#eef3f9] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071321]/95 text-white backdrop-blur-xl">
        <nav aria-label="Navegación del configurador" className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-cyan-300">Forge</span>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/account" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10">
              Mis compras
            </Link>
            <Link href="/catalog" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10">
              ← Catálogo
            </Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="home-eyebrow">Mesa de diseño paramétrico</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              Configura. Valida. Fabrica.
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <ShieldIcon /> Vista previa 3D
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">Unidades reales · mm</span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">Descarga con licencia</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:items-start lg:py-7">
        <aside className="lg:sticky lg:top-[86px]">
          <ForgeForm
            initialModel={model}
            initialParams={initialParams}
            onGenerated={setStlUrl}
            onModelChange={() => setStlUrl(null)}
          />
        </aside>

        <section aria-label="Vista previa 3D" className="min-w-0">
          <div className="overflow-hidden rounded-[1.7rem] border border-[#18314f] bg-[#071321] shadow-[0_28px_80px_rgba(7,19,33,.24)]">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Forge 3D Preview</div>
                <div className="mt-1 text-sm font-bold text-slate-100">
                  {stlUrl ? "Diseño generado · comprueba cotas y orientación" : "Vista previa a escala real"}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                <span className={"h-2 w-2 rounded-full " + (stlUrl ? "bg-emerald-400" : "bg-amber-300")} />
                {stlUrl ? "Preview listo" : "Esperando generación"}
              </div>
            </div>

            <STLViewerPro
              url={stlUrl ?? undefined}
              className="h-[610px] border-0 bg-[#071321] shadow-none lg:h-[680px]"
            />

            <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
              {[
                ["1", "Ajusta parámetros", "Solo controles con efecto geométrico real."],
                ["2", "Valida en 3D", "Cotas, vistas y medición antes de comprar."],
                ["3", "Descarga autorizada", "El paquete final se entrega con la licencia correspondiente."],
              ].map(([n, title, copy]) => (
                <div key={n} className="bg-[#071321] px-4 py-4">
                  <div className="text-[10px] font-black text-cyan-300">0{n}</div>
                  <div className="mt-1 text-xs font-black text-white">{title}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">{copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
