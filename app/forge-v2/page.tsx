"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProductStudioPreview from "@/components/ProductStudioPreview";
import { hasStudioRender, marketingImageFor } from "@/lib/catalog-media";
import {
  fetchCanonicalCatalog,
  toHubProduct,
  type HubProduct,
  type ProductStage,
} from "@/lib/canonical-catalog";
import { normalizeModelSearch } from "@/lib/model-routing";

const FAVORITES_KEY = "teknovashop:forge-v2:favorites";

const CAPABILITY_LABELS: Record<string, string> = {
  hole: "Agujeros",
  slots: "Ranuras",
  slot: "Ranuras",
  cutouts: "Cortes",
  cutout_rect: "Cortes",
  cutout_circle: "Cortes",
  vent_linear: "Ventilación",
  vent_hex: "Ventilación",
  wave_ribs: "Ondulación",
  rib: "Refuerzos",
  boss: "Refuerzos",
  vesa_pattern: "Patrones",
  hole_pattern: "Patrones",
  cable_channel: "Canales",
  text_engrave: "Texto",
  text_emboss: "Texto",
};

function labelsFor(model: HubProduct) {
  const labels = Array.from(
    new Set(
      (model.v2Capabilities || [])
        .map((capability) => CAPABILITY_LABELS[capability] || capability)
        .filter(Boolean)
    )
  );
  if (!labels.length) labels.push("Dimensiones", "Texto");
  return labels.slice(0, 4);
}

function stageLabel(stage: ProductStage) {
  if (stage === "production") return "Production";
  if (stage === "visual_qa") return "Visual QA";
  return "Engineering";
}

export default function ForgeV2Hub() {
  const [products, setProducts] = useState<HubProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [scope, setScope] = useState<"production" | "lab">("production");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCanonicalCatalog()
      .then((data) => {
        if (cancelled) return;
        setProducts((data.products || []).map(toHubProduct));
        setTotal(data.total || data.count || 0);
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

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(value)) setFavorites(value.filter((x) => typeof x === "string"));
    } catch {
      setFavorites([]);
    }
  }, []);

  function toggleFavorite(slug: string) {
    setFavorites((current) => {
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const scoped = useMemo(
    () =>
      scope === "production"
        ? products.filter((product) => product.stage === "production")
        : products,
    [products, scope]
  );

  const families = useMemo(
    () =>
      Array.from(
        new Set(scoped.map((model) => model.family).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "es")),
    [scoped]
  );

  const filtered = useMemo(() => {
    const q = normalizeModelSearch(query);
    return scoped.filter((model) => {
      const matchesText =
        !q ||
        normalizeModelSearch(model.name).includes(q) ||
        normalizeModelSearch(model.description).includes(q) ||
        normalizeModelSearch(model.family || "").includes(q);
      const matchesFamily = !family || model.family === family;
      const matchesFavorite = !favoritesOnly || favorites.includes(model.slug);
      return matchesText && matchesFamily && matchesFavorite;
    });
  }, [scoped, query, family, favoritesOnly, favorites]);

  const productionCount = useMemo(
    () => products.filter((product) => product.stage === "production").length,
    [products]
  );
  const labCount = Math.max(0, products.length - productionCount);
  const advancedCount = useMemo(
    () => products.filter((product) => (product.v2Capabilities || []).length > 0).length,
    [products]
  );

  return (
    <main className="min-h-screen bg-[#05101c] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071321]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1540px] items-center justify-between gap-4 px-5">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-cyan-300">Forge V2</span>
          </Link>
          <div className="flex gap-2 text-xs font-bold">
            <Link href="/catalog" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-300 transition hover:bg-white/10">
              Catálogo
            </Link>
            <Link href="/forge-v2/cad-lab" className="rounded-xl bg-cyan-300 px-4 py-2 font-black text-[#04101d] transition hover:bg-cyan-200">
              CAD Lab
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(37,99,235,.2),transparent_32%)]" />
        <div className="relative mx-auto max-w-[1540px] px-5 py-12 lg:py-16">
          <div className="grid gap-9 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                Canonical product workspace
              </div>
              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">
                Producto serio. <span className="text-cyan-300">Evolución controlada.</span>
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Production muestra únicamente piezas publicables. Lab conserva las geometrías en ingeniería y visual QA sin mezclarlas con el catálogo premium.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                [String(productionCount), "production"],
                [String(labCount), "en Lab"],
                [String(advancedCount), "con ops V2"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                  <div className="text-lg font-black text-cyan-200">{loading ? "—" : value}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setScope("production"); setFamily(""); }}
              className={"rounded-xl px-4 py-2.5 text-xs font-black transition " + (scope === "production" ? "bg-cyan-300 text-[#04101d]" : "border border-white/10 bg-white/5 text-slate-300")}
            >
              Production · {productionCount}
            </button>
            <button
              type="button"
              onClick={() => { setScope("lab"); setFamily(""); }}
              className={"rounded-xl px-4 py-2.5 text-xs font-black transition " + (scope === "lab" ? "bg-amber-300 text-[#241400]" : "border border-white/10 bg-white/5 text-slate-300")}
            >
              Lab · {products.length}
            </button>
          </div>

          <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar soporte, VESA, cable, caja, cámara…"
              className="rounded-xl border border-white/10 bg-[#071321] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
            <select
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#071321] px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-300/40"
            >
              <option value="">Todas las familias</option>
              {families.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              className={"rounded-xl border px-4 py-3 text-xs font-black transition " + (favoritesOnly ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")}
            >
              ★ Favoritos {favorites.length ? `(${favorites.length})` : ""}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-5 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-400">
            <strong className="text-white">{loading ? "—" : filtered.length}</strong> productos · {total || products.length} canónicos
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            {scope === "production" ? "Release aprobada" : "Engineering / Visual QA"}
          </div>
        </div>

        {catalogError && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            El catálogo canónico no está disponible. No se muestran datos locales obsoletos.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((model, index) => {
            const labels = labelsFor(model);
            const favorite = favorites.includes(model.slug);
            const production = model.stage === "production";
            return (
              <article key={model.slug} className="group overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/[0.045] transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.065]">
                <Link href={"/forge-v2/" + model.slug} className="relative block aspect-[4/3] overflow-hidden bg-[#071321]">
                  {hasStudioRender(model) ? (
                    <Image src={marketingImageFor(model)} alt={model.name} fill priority={index < 3} sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" />
                  ) : (
                    <ProductStudioPreview slug={model.slug} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05101c]/65 via-transparent to-transparent" />
                  <span className={"absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] backdrop-blur " + (production ? "border-emerald-300/20 bg-emerald-300/90 text-emerald-950" : "border-amber-300/20 bg-amber-300/90 text-amber-950")}>
                    {stageLabel(model.stage)}
                  </span>
                </Link>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300">{model.family || "Forge"}</div>
                      <h2 className="mt-2 text-lg font-black">{model.name}</h2>
                    </div>
                    <button type="button" onClick={() => toggleFavorite(model.slug)} aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-lg transition " + (favorite ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-white/10 bg-white/5 text-slate-500 hover:text-white")}>
                      {favorite ? "★" : "☆"}
                    </button>
                  </div>

                  <p className="mt-2 min-h-[2.8rem] text-xs leading-5 text-slate-400">{model.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {labels.map((label) => <span key={label} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold text-slate-300">{label}</span>)}
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <Link href={"/forge-v2/" + model.slug} className="inline-flex items-center justify-center rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-[#04101d] transition hover:bg-cyan-200">
                      {production ? "Diseñar en V2 →" : "Abrir en Lab →"}
                    </Link>
                    {production && (
                      <Link href={"/forge/" + model.slug} title="Abrir versión estable" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-black text-slate-300 transition hover:bg-white/10">
                        V1
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !filtered.length && !catalogError && (
          <div className="rounded-3xl border border-dashed border-white/15 py-20 text-center text-sm text-slate-500">
            No hay productos que coincidan con estos filtros.
          </div>
        )}
      </section>
    </main>
  );
}
