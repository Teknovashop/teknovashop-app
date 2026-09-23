"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MODELS } from "@/data/models";
import CatalogFilters from "@/components/CatalogFilters";

export default function CatalogPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return MODELS;
    return MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(t) ||
        m.slug.toLowerCase().includes(t) ||
        m.description.toLowerCase().includes(t)
    );
  }, [q]);

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#07111f]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-blue-600">Forge</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Inicio
            </Link>
            <Link
              href="/forge"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_28px_rgba(37,99,235,.2)] transition hover:bg-blue-700"
            >
              Abrir configurador
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <p className="home-eyebrow">Catálogo canónico</p>
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">
                18 modelos paramétricos reales
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Cada entrada corresponde a una geometría concreta del motor Forge.
                Elige una pieza, abre el configurador y adapta sus parámetros reales.
              </p>
            </div>
            <CatalogFilters value={q} onChange={setQ} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-800">{filtered.length}</strong>{" "}
            de {MODELS.length} modelos
          </span>
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <Link
                key={m.id}
                href={"/forge?model=" + encodeURIComponent(m.slug)}
                className="group overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,.055)] transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_24px_70px_rgba(15,23,42,.11)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#edf3fb]">
                  <Image
                    src={m.thumbnail}
                    alt={m.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.035]"
                  />
                  <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm backdrop-blur">
                    Paramétrico
                  </span>
                </div>

                <div className="p-5">
                  <h2 className="text-base font-black tracking-tight text-[#07111f]">
                    {m.name}
                  </h2>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">
                    {m.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="font-mono text-[10px] text-slate-400">
                      {m.slug}
                    </span>
                    <span className="text-sm font-black text-blue-600 transition group-hover:translate-x-0.5">
                      Configurar →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="font-black">No encontramos ese modelo</h2>
            <p className="mt-2 text-sm text-slate-500">
              Prueba con otro nombre, slug o tipo de pieza.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
