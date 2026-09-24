import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPageShell from "@/components/LegalPageShell";
import { LEGAL_DOCS, type LegalDocumentKey } from "@/lib/legal-docs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  const doc = LEGAL_DOCS[document as LegalDocumentKey];
  if (!doc) return { title: "Documento legal" };
  return { title: doc.title, robots: { index: false, follow: true } };
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  const doc = LEGAL_DOCS[document as LegalDocumentKey];
  if (!doc) notFound();

  return (
    <LegalPageShell title={doc.title} eyebrow={doc.eyebrow}>
      <div className="space-y-7 text-sm leading-7 text-slate-600">
        {doc.sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-2">{body}</p>
          </section>
        ))}
      </div>
    </LegalPageShell>
  );
}
