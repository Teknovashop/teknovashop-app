// /app/page.tsx
"use client";

import ExamplesGrid from "@/components/ExamplesGrid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Genera <span className="text-blue-600">STL</span> paramétricos en segundos
            </h1>
            <p className="mt-4 text-neutral-700">
              Ajusta parámetros, previsualiza en 3D y descarga. Diseñado para makers y empresas que
              buscan piezas a medida sin perder tiempo.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="/forge"
                className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                Abrir Configurador
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium">Rápido</p>
                <p className="text-sm text-neutral-600">STL al vuelo, optimizado para impresión.</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium">Pro</p>
                <p className="text-sm text-neutral-600">Visor 3D con controles tipo CAD.</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="font-medium">Escalable</p>
                <p className="text-sm text-neutral-600">Listo para licencias y packs.</p>
              </div>
            </div>
          </div>

          {/* Panel de preview puramente visual */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="w-full aspect-[16/9] rounded-xl border border-neutral-200 bg-neutral-100 grid place-items-center">
              <div className="w-2/3 h-2/3 rounded-xl border-4 border-neutral-300 bg-neutral-200 grid place-items-center">
                <div className="w-1/2 h-1/2 rounded-lg border-4 border-neutral-300 bg-neutral-100" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid dinámico de ejemplos */}
      <ExamplesGrid />
    </main>
  );
}
