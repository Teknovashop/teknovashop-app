// /components/ExamplesGrid.tsx
"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  title: string;
  description: string;
  tip?: string;
  model: string;
  hrefForge: string;
  thumb_url?: string | null;
};

export default function ExamplesGrid() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/examples", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!aborted) setItems(data.items || []);
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Error cargando ejemplos");
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  if (err) {
    return (
      <div className="my-10 text-red-600">
        No se pudieron cargar los ejemplos: {err}
      </div>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-2xl font-semibold mb-6">Ejemplos de piezas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {(items || Array.from({ length: 9 }).map((_, i) => ({ id: `sk-${i}` } as any))).map((it: any) => (
          <article
            key={it.id}
            className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="bg-neutral-50 border-b border-neutral-200">
              <div className="aspect-[16/10] w-full flex items-center justify-center">
                {items ? (
                  it.thumb_url ? (
                    // Usamos <img> para evitar dominios de next/image
                    <img
                      src={it.thumb_url}
                      alt={it.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                      Vista previa no disponible
                    </div>
                  )
                ) : (
                  <div className="animate-pulse w-[92%] h-[84%] rounded-lg bg-neutral-200" />
                )}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium">{it.title || "Cargando…"}</h3>
              <p className="text-sm text-neutral-600 mt-1">
                {it.description || "\u00A0"}
              </p>
              {it.tip && (
                <p className="text-xs text-neutral-500 mt-2">
                  <span className="font-medium">Tip:</span> {it.tip}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <a
                  href={it.hrefForge || "#"}
                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm border border-neutral-300 hover:bg-neutral-50"
                >
                  Personalizar
                </a>
                <a
                  href={it.hrefForge || "#"}
                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Ver STL
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
