import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL, LEGAL_READY } from "@/lib/legal";

export default function LegalPageShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <header className="border-b border-white/10 bg-[#071321] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-black">Teknovashop <span className="text-cyan-300">Forge</span></Link>
          <Link href="/" className="text-sm font-bold text-slate-300 hover:text-white">← Volver</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="home-eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">{title}</h1>
        <p className="mt-3 text-xs text-slate-500">Versión {LEGAL.version} · 24/09/2026</p>
        {!LEGAL_READY && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Datos identificativos del titular pendientes de configurar. Este estado no debe publicarse como lanzamiento comercial final.
          </div>
        )}
        <article className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,.05)] sm:p-9">
          {children}
        </article>
        <nav className="mt-8 flex flex-wrap gap-4 text-sm font-bold text-blue-600">
          <Link href="/legal">Aviso legal</Link>
          <Link href="/legal/terms">Condiciones</Link>
          <Link href="/legal/privacy">Privacidad</Link>
          <Link href="/legal/refunds">Reembolsos</Link>
          <Link href="/legal/license">Licencia</Link>
        </nav>
      </div>
    </main>
  );
}
