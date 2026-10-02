"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MODELS } from "@/data/models";
import { marketingImageFor } from "@/lib/catalog-media";
import { normalizeModelSearch } from "@/lib/model-routing";

export default function ForgeV2ProductRail({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");

  const families = useMemo(
    () =>
      Array.from(
        new Set(MODELS.map((model) => model.family).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "es")),
    []
  );

  const products = useMemo(() => {
    const q = normalizeModelSearch(query);
    return MODELS.filter((model) => {
      const text =
        !q ||
        normalizeModelSearch(model.name).includes(q) ||
        normalizeModelSearch(model.family || "").includes(q);
      return text && (!family || model.family === family);
    });
  }, [query, family]);

  return (
    <aside className="hidden max-h-[calc(100vh-132px)] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] 2xl:flex 2xl:flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-300">
          Product navigator
        </div>
        <div className="mt-1 text-sm font-black text-white">72 bases Forge</div>
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
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1.5">
          {products.map((model) => {
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
                  <Image
                    src={marketingImageFor(model)}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div
                    className={
                      "truncate text-[11px] font-black " +
                      (current ? "text-cyan-100" : "text-slate-200")
                    }
                  >
                    {model.name}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-slate-600">
                    {model.family || "Forge"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/forge-v2"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.08]"
        >
          Explorar catálogo V2 <span>↗</span>
        </Link>
      </div>
    </aside>
  );
}
