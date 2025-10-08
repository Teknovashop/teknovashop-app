// app/catalog/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { MODELS } from '@/data/models';
import CatalogFilters from '@/components/CatalogFilters';
import Link from 'next/link';

export default function CatalogPage() {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return MODELS;
    return MODELS.filter(m =>
      m.name.toLowerCase().includes(t) ||
      m.slug.toLowerCase().includes(t) ||
      m.description.toLowerCase().includes(t)
    );
  }, [q]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Catálogo de Modelos</h1>
          <p className="text-sm text-neutral-600">Explora, filtra y entra al configurador con un clic.</p>
        </div>
        <CatalogFilters value={q} onChange={setQ} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(m => (
          <Link
            key={m.id}
            href={`/forge/${m.slug}`}
            className="group overflow-hidden rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="aspect-[4/3] overflow-hidden bg-neutral-50">
              <img
                src={m.thumbnail}
                alt={m.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{m.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{m.description}</p>
              <div className="mt-3 text-sm text-[#2663EB]">Configurar →</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}