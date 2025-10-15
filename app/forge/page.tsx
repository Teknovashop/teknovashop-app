// app/forge/page.tsx
import ForgeForm from "@/components/ForgeForm";
import STLViewerPro from "@/components/STLViewerPro";

export default async function Page() {
  // leer del entorno del servidor
  const paywallPreview = process.env.PAYWALL_PREVIEW === "1";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ForgeForm paywallPreview={paywallPreview} />
        <div className="rounded-2xl border border-neutral-200/70 bg-white/60 p-3 shadow-sm backdrop-blur md:bg-white/40">
          {/* El visor recibe paywall para deshabilitar descarga */}
          <STLViewerPro paywallPreview={paywallPreview} />
        </div>
      </div>
    </main>
  );
}
