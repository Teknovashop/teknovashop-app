// components/ModelCard.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_PARAMS } from '@/lib/forge-config';
import PriceBadges from '@/components/PriceBadges';
import type { ForgeModel } from '@/data/models';

function normalizeSlug(slug: string) {
  // backend models usan snake_case; catálogo usa a veces kebab-case
  return slug.replace(/-/g, '_');
}

export default function ModelCard({ m }: { m: ForgeModel }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Pre-chequeo (opcional). Si no tienes /api/entitlements, lo puedes omitir;
  // el gate del backend ya aplica. Mantener mejora UX.
  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`/api/entitlements?slug=${encodeURIComponent(m.slug)}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({} as any));
        setHasAccess(!!j?.hasAccess);
      } catch {
        setHasAccess(false);
      }
    };
    run();
  }, [m.slug]);

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const model = normalizeSlug(m.slug);
      const baseParams = (DEFAULT_PARAMS as any) || {};
      const params = { ...baseParams };

      const res = await fetch('/api/forge/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, params, holes: [], slug: m.slug }), // <- pasa slug
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || 'No se pudo generar el STL');
      }
      const a = document.createElement('a');
      a.href = json.url;
      a.download = `${m.slug}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setError(e?.message || 'Error al descargar');
    } finally {
      setDownloading(false);
    }
  }

  // CTA compra única directa (botón negro cuando no hay acceso)
  const buyOneOff = async () => {
    try {
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'oneoff', slug: m.slug }),
      });
      const j = await r.json();
      if (j?.url) window.location.href = j.url;
      else throw new Error(j?.error || 'No se pudo iniciar el pago');
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar el pago');
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-white shadow-sm hover:shadow-md transition">
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

        {/* Badges de Stripe / Precios (pasa slug para compra única de este modelo) */}
        <PriceBadges slug={m.slug} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/forge/${m.slug}`}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 transition"
          >
            Configurar
          </Link>

          {hasAccess ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center rounded-lg bg-black text-white px-3 py-2 text-sm hover:opacity-90 transition disabled:opacity-60"
            >
              {downloading ? 'Generando…' : 'Descargar STL'}
            </button>
          ) : (
            <button
              onClick={buyOneOff}
              className="inline-flex items-center justify-center rounded-lg bg-black text-white px-3 py-2 text-sm hover:opacity-90 transition"
            >
              Comprar STL
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
