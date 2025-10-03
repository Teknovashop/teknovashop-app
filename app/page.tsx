// app/page.tsx — página principal (hero + ejemplos + precios)
export const dynamic = 'force-dynamic'; // evita que Next intente prerenderizar con envs faltantes

import STLViewer from '@/components/STLViewer';
import GenerateForm from '@/components/GenerateForm';
import ModelGrid from '@/components/ModelGrid';
import Pricing from '@/components/Pricing';

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="rounded-2xl p-4 md:p-6 bg-white/5 border border-white/10">
              {/* Vista previa del configurador */}
              <STLViewer />
            </div>
            <div className="rounded-2xl p-4 md:p-6 bg-white/5 border border-white/10">
              {/* Controles esenciales */}
              <GenerateForm compact />
              <p className="mt-4 text-sm text-black/60 md:text-white/70">
                Consejo: cambia 1–2 parámetros y visualiza el resultado antes de seguir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EJEMPLOS */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Ejemplos de piezas</h2>
          <ModelGrid />
        </div>
      </section>

      {/* PRECIOS */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Precios</h2>
          <Pricing />
        </div>
      </section>
    </main>
  );
}
