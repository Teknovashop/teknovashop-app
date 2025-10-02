// /app/page.tsx
"use client";

import Link from "next/link";
import HeroPreview from "@/components/HeroPreview";
import ExamplesSection from "@/components/ExamplesSection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Header simple (sin GitHub) */}
      <header className="sticky top-0 z-20 border-b border-neutral-200/80 dark:border-neutral-800/60 bg-white/75 dark:bg-neutral-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="font-semibold">Teknovashop Forge</span>
          <Link
            href="/forge"
            className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Abrir Configurador
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold md:text-5xl">
            Genera <span className="text-blue-600 dark:text-blue-400">STL</span>{" "}
            paramétricos en segundos
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Ajusta parámetros, previsualiza en 3D y descarga. Diseñado para
            makers y empresas que buscan piezas a medida sin perder tiempo.
          </p>
          <div className="flex gap-3">
            <Link
              href="/forge"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Empezar ahora
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="font-medium">Rápido</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                STL al vuelo, optimizado para impresión.
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="font-medium">Pro</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                Visor 3D con controles tipo CAD.
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="font-medium">Escalable</div>
              <div className="text-neutral-500 dark:text-neutral-400">
                Listo para licencias y packs.
              </div>
            </div>
          </div>
        </div>

        {/* Sólo la “vista previa del configurador” */}
        <HeroPreview />
      </section>

      {/* Ejemplos (con mini-comentarios de utilidad) */}
      <ExamplesSection />

      <footer className="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-500 dark:text-neutral-400">
        © {new Date().getFullYear()} Teknovashop · Hecho para crear.
      </footer>
    </main>
  );
}
