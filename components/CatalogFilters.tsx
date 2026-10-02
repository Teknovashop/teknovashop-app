"use client";

import { useId } from "react";

export default function CatalogFilters({
  value,
  onChange,
  family,
  onFamilyChange,
  families,
}: {
  value: string;
  onChange: (v: string) => void;
  family: string;
  onFamilyChange: (v: string) => void;
  families: string[];
}) {
  const id = useId();

  return (
    <div className="w-full">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px]">
        <div>
          <label
            htmlFor={id}
            className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"
          >
            Buscar modelo
          </label>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id={id}
              type="search"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="VESA, router, cable, dock…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/45 focus:bg-white/10 focus:ring-4 focus:ring-cyan-300/5"
            />
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
            Familia
          </span>
          <select
            value={family}
            onChange={(e) => onFamilyChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b2035] px-3 py-3 text-sm font-bold text-slate-200 outline-none focus:border-cyan-300/45"
          >
            <option value="">Todas las familias</option>
            {families.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
