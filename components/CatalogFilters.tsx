// components/CatalogFilters.tsx
'use client';
import { useId } from 'react';

export default function CatalogFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">Buscar</label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar nombre, slug o descripción…"
        className="w-64 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2663EB]"
      />
    </div>
  );
}