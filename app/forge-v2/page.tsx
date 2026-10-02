"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MODELS } from "@/data/models";
import { forgeV2Capabilities } from "@/lib/forge-v2/capabilities";
import { marketingImageFor } from "@/lib/catalog-media";
import { normalizeModelSearch } from "@/lib/model-routing";

const FAVORITES_KEY = "teknovashop:forge-v2:favorites";

function labelsFor(slug: string) {
  const caps = forgeV2Capabilities(slug);
  const labels: string[] = [];
  if (caps.holes) labels.push("Agujeros");
  if (caps.slots) labels.push("Ranuras");
  if (caps.cutouts) labels.push("Cortes");
  if (caps.vents) labels.push("Ventilación");
  if (caps.waves) labels.push("Ondulación");
  if (caps.ribs) labels.push("Refuerzos");
  if (caps.mountingPatterns) labels.push("Patrones");
  if (caps.cableChannels) labels.push("Canales");
  if (!labels.length) labels.push("Dimensiones", "Texto");
  return labels.slice(0, 4);
}

export default function ForgeV2Hub() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

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

  const families = useMemo(
    () =>
      Array.from(
        new Set(MODELS.map((model) => model.family).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "es")),
    []
  );

  const filtered = useMemo(() => {
    const q = normalizeModelSearch(query);
    return MODELS.filter((model) => {
      const matchesText =
        !q ||
        normalizeModelSearch(model.name).includes(q) ||
        normalizeModelSearch(model.description).includes(q) ||
        normalizeModelSearch(model.family || "").includes(q);
      const matchesFamily = !family || model.family === family;
      const matchesFavorite = !favoritesOnly || favorites.includes(model.slug);
      return matchesText && matchesFamily && matchesFavorite;
    });
  }, [query, family, favoritesOnly, favorites]);

  const advancedCount = useMemo(
    () =>
      MODELS.filter((model) => {
        const caps = forgeV2Capabilities(model.slug);
        return Boolean(
          caps.holes ||
            caps.slots ||
            caps.cutouts ||
            caps.vents ||
            caps.waves ||
            caps.ribs
        );
      }).length,
    []
  );

  return (
    <main className="min-h-screen bg-[#05101c] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071321]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1540px] items-center justify-between gap-4 px-5">
          <Link href="/" className="font-black tracking-tight">
            Teknovashop <span className="text-cyan-300">Forge V2</span>
          </Link>
          <div className="flex gap-2 text-xs font-bold">
            <Link
              href="/catalog"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-300 transition hover:bg-white/10"
            >
              Catálogo
            </Link>
            <Link
              href="/forge-v2/cad-lab"
              className="rounded-xl bg-cyan-300 px-4 py-2 font-black text-[#04101d] transition hover:bg-cyan-200"
            >
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
                Design workspace
              </div>
              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">
                Elige una base. <span className="text-cyan-300">Construye tu versión.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                72 geometrías paramétricas, edición por operaciones, validación y una ruta CAD B-Rep aislada para funciones avanzadas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                [String(MODELS.length), "bases"],
                [String(advancedCount), "con ops"],
                ["STEP", "CAD export"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
                  <div className="text-lg font-black text-cyan-200">{value}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-9 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
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
              {families.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              className={
                "rounded-xl border px-4 py-3 text-xs font-black transition " +
                (favoritesOnly
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
              }
            >
              ★ Favoritos {favorites.length ? `(${favorites.length})` : ""}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-5 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-400">
            <strong className="text-white">{filtered.length}</strong> productos disponibles
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            V2 Beta · V1 intacto
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((model, index) => {
            const labels = labelsFor(model.slug);
            const favorite = favorites.includes(model.slug);
            return (
              <article
                key={model.slug}
                className="group overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/[0.045] transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.065]"
              >
                <Link href={"/forge-v2/" + model.slug} className="relative block aspect-[16/10] overflow-hidden bg-[#071321]">
                  <Image
                    src={marketingImageFor(model)}
                    alt={model.name}
                    fill
                    priority={index < 3}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.035]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05101c]/65 via-transparent to-transparent" />
                </Link>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300">
                        {model.family || "Forge"}
                      </div>
                      <h2 className="mt-2 text-lg font-black">{model.name}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(model.slug)}
                      aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                      className={
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-lg transition " +
                        (favorite
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                          : "border-white/10 bg-white/5 text-slate-500 hover:text-white")
                      }
                    >
                      {favorite ? "★" : "☆"}
                    </button>
                  </div>

                  <p className="mt-2 min-h-[2.8rem] text-xs leading-5 text-slate-400">
                    {model.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold text-slate-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <Link
                      href={"/forge-v2/" + model.slug}
                      className="inline-flex items-center justify-center rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-[#04101d] transition hover:bg-cyan-200"
                    >
                      Diseñar en V2 →
                    </Link>
                    <Link
                      href={"/forge/" + model.slug}
                      title="Abrir versión estable"
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-black text-slate-300 transition hover:bg-white/10"
                    >
                      V1
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="rounded-3xl border border-dashed border-white/15 py-20 text-center text-sm text-slate-500">
            No hay productos que coincidan con estos filtros.
          </div>
        )}
      </section>
    </main>
  );
}
