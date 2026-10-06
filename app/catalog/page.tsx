"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CatalogFilters from "@/components/CatalogFilters";
import ProductStudioPreview from "@/components/ProductStudioPreview";
import { hasStudioRender, marketingImageFor } from "@/lib/catalog-media";
import {
  fetchCanonicalCatalog,
  toHubProduct,
  type HubProduct,
} from "@/lib/canonical-catalog";
import { normalizeModelSearch } from "@/lib/model-routing";

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

function labelsFor(model: HubProduct) {
  const labels: string[] = [];
  const caps = model.v2Capabilities || [];
  const add = (label: string) => {
    if (!labels.includes(label)) labels.push(label);
  };
  for (const capability of caps) {
    if (capability.includes("hole")) add("Agujeros");
    else if (capability.includes("slot")) add("Ranuras");
    else if (capability.includes("cutout")) add("Cortes");
    else if (capability.includes("vent")) add("Ventilación");
    else if (capability.includes("wave")) add("Ondulación");
    else if (capability.includes("rib") || capability.includes("boss")) add("Refuerzos");
    else if (capability.includes("pattern")) add("Patrones");
    else if (capability.includes("channel")) add("Canales");
  }
  if (!labels.length) labels.push("Dimensiones", "Texto");
  return labels.slice(0, 4);
}

function CatalogImage({ model, priority }: { model: HubProduct; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const studio = hasStudioRender(model);

  return (
    <div className="catalog-media relative aspect-[4/3] overflow-hidden bg-[#091827]">
      {studio && !failed ? (
        <Image
          src={marketingImageFor(model)}
          alt={model.name}
          fill
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={() => setFailed(true)}
          className={
            "object-cover transition duration-700 group-hover:scale-[1.035] " +
            (LEGACY_IMAGE_TUNING[model.slug] || "")
          }
        />
      ) : (
        <ProductStudioPreview slug={model.slug} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071321]/32 via-transparent to-white/5" />
      <span className="absolute left-3 top-3 rounded-full border border-white/65 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm backdrop-blur">
        Paramétrico
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-emerald-200/30 bg-emerald-300/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-950 shadow-sm">
        Production
      </span>
    </div>
  );
}

export default function CatalogPage() {
  const [models, setModels] = useState<HubProduct[]>([]);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCanonicalCatalog("public_only=true")
      .then((data) => {
        if (cancelled) return;
        setModels((data.products || []).map(toHubProduct));
        setCatalogError(false);
      })
      .catch(() => {
        if (!cancelled) setCatalogError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const families = useMemo(
    () =>
      Array.from(
        new Set(models.map((model) => model.family).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "es")),
    [models]
  );

  const filtered = useMemo(() => {
    const t = normalizeModelSearch(q);
    return models.filter((model) => {
      const matchesQuery =
        !t ||
        normalizeModelSearch(model.name).includes(t) ||
        normalizeModelSearch(model.slug).includes(t) ||
        normalizeModelSearch(model.description).includes(t) ||
        normalizeModelSearch(model.family || "").includes(t);
      const matchesFamily = !family || model.family === family;
      return matchesQuery && matchesFamily;
    });
  }, [models, q, family]);

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#07111f]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071321]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-cyan-300">Forge</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/account" className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 sm:inline-flex">
              Mis compras
            </Link>
            <Link href="/forge-v2" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_28px_rgba(37,99,235,.3)] transition hover:-translate-y-0.5 hover:bg-blue-500">
              Abrir Forge V2
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
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Colección Production
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl">
                Solo piezas listas para <span className="home-gradient-text">producto real.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                El catálogo público ya no mezcla prototipos con producto terminado. Cada pieza publicada dispone de geometría validada, Forge y presentación Studio aprobada.
              </p>
            </div>
            <div className="min-w-[280px]">
              <CatalogFilters value={q} onChange={setQ} family={family} onFamilyChange={setFamily} families={families} />
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              [loading ? "—" : String(models.length), "productos production"],
              ["mm", "medidas reales"],
              ["STL", "fabricación validada"],
              ["V2", "configuración trazable"],
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
              Mostrando <strong className="text-slate-900">{loading ? "—" : filtered.length}</strong> de {loading ? "—" : models.length} productos aprobados
            </div>
          </div>
          <Link href="/forge-v2" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 shadow-sm hover:bg-amber-100">
            Ver Engineering Lab →
          </Link>
        </div>

        {catalogError && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            El catálogo canónico no está disponible. No mostramos un catálogo local potencialmente obsoleto.
          </div>
        )}

        {!catalogError && filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((model, index) => (
              <article key={model.slug} className="group overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.065)] transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_28px_80px_rgba(15,23,42,.14)]">
                <Link href={"/forge-v2/" + encodeURIComponent(model.slug)} className="block">
                  <CatalogImage model={model} priority={index < 3} />
                </Link>
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {model.family || "Forge"}
                  </div>
                  <h2 className="text-[1.05rem] font-black tracking-tight text-[#07111f]">{model.name}</h2>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">{model.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {labelsFor(model).map((label) => (
                      <span key={label} className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-800">{label}</span>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                    <Link href={"/forge/" + encodeURIComponent(model.slug)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50">
                      Forge estable
                    </Link>
                    <Link href={"/forge-v2/" + encodeURIComponent(model.slug)} className="inline-flex items-center justify-center rounded-xl bg-[#071321] px-3 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-[#0c2039]">
                      Forge V2 →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : !loading && !catalogError ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <h2 className="text-lg font-black">No encontramos ese producto</h2>
            <p className="mt-2 text-sm text-slate-500">Prueba con otro nombre, uso o familia.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
