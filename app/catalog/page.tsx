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

const CART_KEY = "teknovashop:cart:v1";

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
  const [cart, setCart] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(saved)
        ? saved.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Persistence is best-effort.
    }
  }, [cart]);

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

  function toggleCart(slug: string) {
    setCart((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    );
  }

  async function shareProduct(model: HubProduct) {
    const url = `${window.location.origin}/forge/${encodeURIComponent(model.slug)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${model.name} | Teknovashop Forge`,
          text: model.description,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Enlace copiado");
        window.setTimeout(() => setShareFeedback(""), 1800);
      }
    } catch {
      // User cancellation is not an error.
    }
  }

  const cartModels = useMemo(
    () => cart.map((slug) => models.find((model) => model.slug === slug)).filter(Boolean) as HubProduct[],
    [cart, models]
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
              Mis diseños
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="ui-pressable rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_28px_rgba(37,99,235,.3)] hover:bg-blue-500"
              aria-label={`Abrir carrito con ${cart.length} productos`}
            >
              Carrito {cart.length ? `· ${cart.length}` : ""}
            </button>
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
          <Link href="/account" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 shadow-sm hover:bg-amber-100">
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
              <article key={model.slug} className="ui-card group overflow-hidden">
                <Link href={"/forge/" + encodeURIComponent(model.slug)} className="block">
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
                  <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-t border-slate-100 pt-4">
                    <Link href={"/forge/" + encodeURIComponent(model.slug)} className="ui-pressable inline-flex items-center justify-center rounded-xl bg-[#071321] px-3 py-2.5 text-xs font-black text-cyan-200 hover:bg-[#0c2039]">
                      Configurar →
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleCart(model.slug)}
                      aria-pressed={cart.includes(model.slug)}
                      aria-label={cart.includes(model.slug) ? "Quitar del carrito" : "Añadir al carrito"}
                      className={
                        "ui-pressable rounded-xl border px-3 py-2.5 text-xs font-black " +
                        (cart.includes(model.slug)
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                      }
                    >
                      {cart.includes(model.slug) ? "✓" : "+"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void shareProduct(model)}
                      aria-label={"Compartir " + model.name}
                      className="ui-pressable rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                    >
                      ↗
                    </button>
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

      {shareFeedback && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#071321] px-4 py-2 text-xs font-black text-white shadow-2xl" role="status">
          {shareFeedback}
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/45 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Carrito">
          <button type="button" className="absolute inset-0" aria-label="Cerrar carrito" onClick={() => setCartOpen(false)} />
          <section className="safe-bottom relative z-10 max-h-[82vh] w-full overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="home-eyebrow">Tu selección</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Carrito</h2>
                <p className="mt-1 text-sm text-slate-500">Se guarda automáticamente en este dispositivo.</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="ui-pressable rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-500">×</button>
            </div>

            <div className="mt-5 space-y-2">
              {cartModels.length ? cartModels.map((model) => (
                <div key={model.slug} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-[#091827]">
                    <Image src={marketingImageFor(model)} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black">{model.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{model.family || "Forge"}</div>
                  </div>
                  <button type="button" onClick={() => toggleCart(model.slug)} className="ui-pressable rounded-lg px-2 py-1 text-xs font-black text-slate-400 hover:bg-slate-100" aria-label={"Quitar " + model.name}>×</button>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  Aún no has añadido ninguna pieza.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setCartOpen(false)} className="ui-pressable rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
                Seguir explorando
              </button>
              <button type="button" disabled className="rounded-xl bg-[#071321] px-4 py-3 text-sm font-black text-white opacity-55" title="Se activará al conectar la pasarela de pagos">
                Checkout · pendiente pagos
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
