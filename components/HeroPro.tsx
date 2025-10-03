'use client';

import Link from 'next/link';
import STLViewerPro from '@/components/STLViewerPro';

const CONFIGURATOR_HREF = '/configurator'; // <-- cambia aquí si tu ruta es otra (ej. '/forge')

export default function HeroPro() {
  return (
    <section className="relative overflow-hidden">
      {/* fondo suave */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-[40rem] bg-gradient-to-b from-[#f4f7fb] to-transparent" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8 md:py-12">
        {/* CTA superior alineada a la derecha (como en la captura) */}
        <div className="flex justify-end mb-6">
          <Link
            href={CONFIGURATOR_HREF}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[#2663EB] hover:bg-[#1f55c8] text-white shadow-md transition"
          >
            Abrir Configurador
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Copy + CTA primaria */}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#0b1526]">
              Genera <span className="text-[#2663EB]">STL paramétricos</span> en segundos
            </h1>
            <p className="mt-4 text-base md:text-lg text-[#4a5568]">
              Ajusta parámetros, previsualiza en 3D y descarga tu diseño. Diseñado para makers y empresas.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <Link
                href={CONFIGURATOR_HREF}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-[#2663EB] hover:bg-[#1f55c8] text-white font-medium shadow-lg transition"
              >
                Empezar ahora
              </Link>

              <Link
                href="#ejemplos"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-white hover:bg-[#f6f8fb] text-[#0b1526] border border-[#e6eaf2] shadow-sm transition"
              >
                Ver ejemplos
              </Link>
            </div>

            {/* Píldoras de valor */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#e6eaf2] bg-white px-4 py-3 shadow-sm">
                <p className="font-semibold text-[#0b1526]">Rápido</p>
                <p className="text-sm text-[#6b7280]">STL al vuelo, optimizado para impresión.</p>
              </div>
              <div className="rounded-2xl border border-[#e6eaf2] bg-white px-4 py-3 shadow-sm">
                <p className="font-semibold text-[#0b1526]">Pro</p>
                <p className="text-sm text-[#6b7280]">Visor 3D con controles tipo CAD.</p>
              </div>
              <div className="rounded-2xl border border-[#e6eaf2] bg-white px-4 py-3 shadow-sm">
                <p className="font-semibold text-[#0b1526]">Escalable</p>
                <p className="text-sm text-[#6b7280]">Listo para licencias y packs.</p>
              </div>
            </div>
          </div>

          {/* Preview del configurador */}
          <div className="rounded-3xl bg-white border border-[#e6eaf2] shadow-xl p-3 md:p-4">
            <div className="rounded-2xl overflow-hidden min-h-[340px] md:min-h-[420px]">
              <STLViewerPro />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
