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
} from "@/lib/canonical-catalog";
import { normalizeModelSearch } from "@/lib/model-routing";

export default function ForgeV2ProductRail({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [products, setProducts] = useState<HubProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCanonicalCatalog()
      .then((data) => {
        if (!cancelled) setProducts((data.products || []).map(toHubProduct));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const families = useMemo(
    () =>
      Array.from(
        new Set(products.map((model) => model.family).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "es")),
    [products]
  );

  const filtered = useMemo(() => {
    const q = normalizeModelSearch(query);
    return products.filter((model) => {
      const text =
        !q ||
        normalizeModelSearch(model.name).includes(q) ||
        normalizeModelSearch(model.family || "").includes(q);
      return text && (!family || model.family === family);
    });
  }, [products, query, family]);

  return (
    <aside className="hidden max-h-[calc(100vh-132px)] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] 2xl:flex 2xl:flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-300">
          Product navigator
        </div>
        <div className="mt-1 text-sm font-black text-white">
          {products.length || "—"} bases canónicas
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar pieza…"
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071321] px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
        />
        <select
          value={family}
          onChange={(event) => setFamily(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#071321] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-cyan-300/40"
        >
          <option value="">Todas las familias</option>
          {families.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1.5">
          {filtered.map((model) => {
            const current = model.slug === currentSlug;
            return (
              <Link
                key={model.slug}
                href={"/forge-v2/" + model.slug}
                className={
                  "flex items-center gap-2.5 rounded-xl border p-2 transition " +
                  (current
                    ? "border-cyan-300/30 bg-cyan-300/10"
                    : "border-transparent hover:border-white/10 hover:bg-white/[0.045]")
                }
              >
                <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-[#071321]">
                  {hasStudioRender(model) ? (
                    <Image src={marketingImageFor(model)} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <ProductStudioPreview slug={model.slug} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={"truncate text-[11px] font-black " + (current ? "text-cyan-100" : "text-slate-200")}>
                    {model.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="truncate text-[9px] uppercase tracking-wide text-slate-600">
                      {model.family || "Forge"}
                    </span>
                    <span className={
                      "rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide " +
                      (model.stage === "production"
                        ? "bg-emerald-300/10 text-emerald-300"
                        : "bg-amber-300/10 text-amber-300")
                    }>
                      {model.stage === "production" ? "Prod" : "Lab"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <Link href="/forge-v2" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.08]">
          Explorar catálogo V2 <span>↗</span>
        </Link>
      </div>
    </aside>
  );
}
