"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MODELS, type ForgeModel } from "@/data/models";
import { normalizeModelSearch } from "@/lib/model-routing";
import CatalogFilters from "@/components/CatalogFilters";

const LEGACY_IMAGE_TUNING: Record<string, string> = {
  "ssd-holder": "scale-[1.18]",
  "raspi-case": "scale-[1.18]",
  "mic-arm-clip": "scale-[1.28]",
  "cable-clip": "scale-[1.16]",
  "wall-hook": "scale-[1.16]",
  "camera-plate": "scale-[1.55]",
  "headset-stand": "scale-[1.2]",
  "go-pro-mount": "scale-[1.2]",
  "hub-holder": "scale-[1.22]",
};

function CubeMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.4 7.7 7.6 4.2 7.6-4.2M12 12v9" />
    </svg>
  );
}

function CatalogImage({ model, priority }: { model: ForgeModel; priority?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="catalog-media relative aspect-[4/3] overflow-hidden bg-[#091827]">
      {!failed ? (
        <Image
          src={model.thumbnail}
          alt={model.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={() => setFailed(true)}
          className={
            "object-cover transition duration-700 group-hover:scale-[1.045] " +
            (LEGACY_IMAGE_TUNING[model.slug] || "")
          }
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_65%_25%,rgba(37,99,235,.32),transparent_30%),linear-gradient(145deg,#071321,#0a2340_55%,#071321)]">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(139,233,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(139,233,255,.14)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative text-center text-cyan-200/70">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-cyan-200/15 bg-white/5 backdrop-blur">
              <CubeMark />
            </div>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/65">
              Preview de producto
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071321]/40 via-transparent to-white/5" />
      <span className="absolute left-3 top-3 rounded-full border border-white/65 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm backdrop-blur">
        Paramétrico
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-cyan-200/20 bg-[#071321]/75 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 backdrop-blur">
        3D validado
      </span>
    </div>
  );
}

export default function CatalogPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = normalizeModelSearch(q);
    if (!t) return MODELS;
    return MODELS.filter(
      (m) =>
        normalizeModelSearch(m.name).includes(t) ||
        normalizeModelSearch(m.slug).includes(t) ||
        normalizeModelSearch(m.description).includes(t)
    );
  }, [q]);

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071321]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-cyan-300">Forge</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 sm:inline-flex"
            >
              Mis compras
            </Link>
            <Link
              href="/forge"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_28px_rgba(37,99,235,.3)] transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Abrir configurador
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#071321] text-white">
        <div className="home-hero-glow absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="home-pill">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                Catálogo paramétrico
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl">
                18 bases técnicas para crear una pieza <span className="home-gradient-text">a tu medida.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Selecciona una geometría real, ajusta solo los parámetros que importan y valida el resultado en una mesa 3D a escala antes de comprar.
              </p>
            </div>
            <div className="min-w-[280px]">
              <CatalogFilters value={q} onChange={setQ} />
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["18", "modelos canónicos"],
              ["mm", "medidas reales"],
              ["SHA-256", "trazabilidad"],
              ["3D", "preview protegido"],
            ].map(([value, label]) => (
              <div key={label} className="bg-[#071321]/85 px-4 py-4 text-center backdrop-blur">
                <div className="font-black text-cyan-200">{value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="home-eyebrow">Colección Forge</p>
            <div className="mt-1 text-sm text-slate-500" role="status" aria-live="polite">
              Mostrando <strong className="text-slate-900">{filtered.length}</strong> de {MODELS.length} modelos
            </div>
          </div>
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-600 shadow-sm hover:border-blue-200 hover:bg-blue-50"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m, index) => (
              <Link
                key={m.id}
                href={"/forge/" + encodeURIComponent(m.slug)}
                className="group overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.065)] transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_28px_80px_rgba(15,23,42,.14)]"
              >
                <CatalogImage model={m} priority={index < 3} />

                <div className="p-5">
                  <h2 className="text-[1.05rem] font-black tracking-tight text-[#07111f]">
                    {m.name}
                  </h2>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">
                    {m.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      listo para configurar
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-black text-blue-600 transition group-hover:translate-x-1">
                      Configurar <span aria-hidden>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <CubeMark />
            </div>
            <h2 className="mt-5 text-lg font-black">No encontramos ese modelo</h2>
            <p className="mt-2 text-sm text-slate-500">
              Prueba con otro nombre, uso o tipo de pieza.
            </p>
          </div>
        )}
      </section>

      <section className="px-5 pb-14 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-[2rem] bg-[#071321] px-7 py-8 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">No necesitas empezar de cero</p>
            <h2 className="mt-2 text-2xl font-black">Elige una base. Hazla tuya.</h2>
            <p className="mt-2 text-sm text-slate-300">Todas las piezas se validan en el mismo configurador 3D.</p>
          </div>
          <Link href="/forge" className="home-primary-btn home-primary-btn-lg shrink-0">
            Abrir Forge →
          </Link>
        </div>
      </section>
    </main>
  );
}
