// app/page.tsx
export const dynamic = 'force-dynamic';

import HeroPreview from '@/components/HeroPreview';
import ModelGrid from '@/components/ModelGrid';
import Pricing from '@/components/Pricing';
import Link from 'next/link';

const CONFIGURATOR_HREF = '/configurator'; // ⬅️ cambia si tu ruta es otra

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Tinte superior suave */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-[38rem] bg-gradient-to-b from-[#f4f7fb] to-transparent dark:from-neutral-900/50" />
        </div>

        <div className="relative container mx-auto px-4 max-w-6xl py-6 md:py-10">
          {/* Botón arriba a la derecha (como la captura) */}
          <div className="flex justify-end mb-6">
            <Link
              href={CONFIGURATOR_HREF}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[#2663EB] hover:bg-[#1f55c8] text-white shadow-md transition"
            >
              Abrir Configurador
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Copy izquierdo */}
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#0b1526] dark:text-white">
                Genera <span className="text-[#2663EB]">STL paramétricos</span> en segundos
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#4a5568] dark:text-neutral-300">
                Ajusta parámetros, previsualiza en 3D y descarga tu diseño. Diseñado para makers y empresas.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href={CONFIGURATOR_HREF}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-[#2663EB] hover:bg-[#1f55c8] text-white font-medium shadow-lg transition"
                >
                  Empezar ahora
                </Link>
                <a
                  href="#ejemplos"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-white hover:bg-[#f6f8fb] text-[#0b1526] dark:bg-neutral-900 dark:text-white border border-[#e6eaf2] dark:border-neutral-800 shadow-sm transition"
                >
                  Ver ejemplos
                </a>
              </div>

              {/* Píldoras de valor */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Rápido</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">STL al vuelo, optimizado para impresión.</p>
                </div>
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Pro</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">Visor 3D con controles tipo CAD.</p>
                </div>
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Escalable</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">Listo para licencias y packs.</p>
                </div>
              </div>
            </div>

            {/* Tu preview existente (no lo toco) */}
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* EJEMPLOS */}
      <section id="ejemplos" className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-[#0b1526] dark:text-white">Ejemplos de piezas</h2>
          <ModelGrid />
        </div>
      </section>

      {/* PRECIOS */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-[#0b1526] dark:text-white">Precios</h2>
          <Pricing />
        </div>
      </section>
    </main>
  );
}
