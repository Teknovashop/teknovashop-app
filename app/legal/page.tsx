import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Aviso legal", robots: { index: false, follow: true } };

export default function LegalNoticePage() {
  return (
    <LegalPageShell title="Aviso legal" eyebrow="Información del titular">
      <div className="space-y-6 text-sm leading-7 text-slate-600">
        <section>
          <h2 className="text-lg font-black text-slate-950">Titular del servicio</h2>
          <p className="mt-2"><strong>Nombre o razón social:</strong> {LEGAL.operator}</p>
          <p><strong>NIF/CIF:</strong> {LEGAL.taxId}</p>
          <p><strong>Domicilio:</strong> {LEGAL.address}</p>
          <p><strong>País:</strong> {LEGAL.country}</p>
          <p><strong>Contacto:</strong> {LEGAL.email}</p>
        </section>
        <section>
          <h2 className="text-lg font-black text-slate-950">Objeto</h2>
          <p className="mt-2">Teknovashop Forge ofrece herramientas web para configurar geometrías paramétricas, previsualizarlas en 3D y adquirir licencias de uso sobre archivos digitales asociados a diseños identificados mediante Design ID.</p>
        </section>
        <section>
          <h2 className="text-lg font-black text-slate-950">Responsabilidad de uso</h2>
          <p className="mt-2">Las piezas generadas deben ser revisadas por el usuario antes de su fabricación. La idoneidad de materiales, parámetros de impresión, fijaciones, cargas, tolerancias y uso final depende del contexto de fabricación.</p>
        </section>
      </div>
    </LegalPageShell>
  );
}
