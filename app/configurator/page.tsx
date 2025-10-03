// app/configurator/page.tsx
export const dynamic = 'force-dynamic';

import STLViewerPro from '@/components/STLViewerPro';
import GenerateForm from '@/components/GenerateForm';

export default function ConfiguratorPage() {
  return (
    <main className="min-h-screen">
      <section className="container mx-auto px-4 max-w-6xl py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Configurador</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow p-3 md:p-4">
            <div className="rounded-xl overflow-hidden min-h-[360px] md:min-h-[440px]">
              <STLViewerPro />
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow p-4 md:p-6">
            <GenerateForm />
          </div>
        </div>
      </section>
    </main>
  );
}
