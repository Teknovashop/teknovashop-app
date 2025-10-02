// app/page.tsx
"use client";

import Link from "next/link";
import ExamplesGrid from "@/components/ExamplesGrid";

export default function HomePage() {
  return (
    <>
      {/* Hero claro con preview estática (solo marco) */}
      <section className="mb-12 grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-extrabold leading-tight">
            Genera <span className="text-blue-600">STL</span> paramétricos en segundos
          </h1>
          <p className="mt-4 max-w-xl text-neutral-600">
            Ajusta parámetros, previsualiza en 3D y descarga. Diseñado para makers y empresas
            que buscan piezas a medida sin perder tiempo.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/forge"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Empezar ahora
            </Link>
            <a
              href="#examples"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-800 hover:bg-neutral-100"
            >
              Ver ejemplos
            </a>
          </div>
        </div>

        {/* “Preview” del configurador (estático pero elegante) */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-6">
          <div className="grid h-72 place-items-center rounded-xl border border-neutral-300 bg-white">
            <div className="h-28 w-44 rounded-xl border-4 border-neutral-200 bg-neutral-100 shadow-inner" />
          </div>
        </div>
      </section>

      <section id="examples" className="scroll-mt-24">
        <h2 className="mb-6 text-2xl font-bold">Ejemplos de piezas</h2>
        <ExamplesGrid />
      </section>
    </>
  );
}
