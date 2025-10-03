export const dynamic = 'force-dynamic';

import HeroPro from '@/components/HeroPro';
import ModelGrid from '@/components/ModelGrid';
import Pricing from '@/components/Pricing';

export default function Page() {
  return (
    <main className="min-h-screen">
      <HeroPro />

      <section id="ejemplos" className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-[#0b1526]">Ejemplos de piezas</h2>
          <ModelGrid />
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-[#0b1526]">Precios</h2>
          <Pricing />
        </div>
      </section>
    </main>
  );
}
