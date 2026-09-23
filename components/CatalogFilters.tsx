"use client";

import { useId } from "react";

export default function CatalogFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();

  return (
    <div className="w-full lg:w-auto">
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
          placeholder="VESA, router, cable…"
          className="w-full rounded-xl border border-slate-200 bg-[#f8faff] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 lg:w-80"
        />
      </div>
    </div>
  );
}
