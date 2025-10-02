// /components/ExamplesSection.tsx
"use client";

import { useEffect, useState } from "react";

type ExampleItem = {
  slug: string;
  title: string;
  caption: string;
  stl_url: string | null;
  thumb_url: string | null;
  object_key: string | null;
  error?: string;
};

export default function ExamplesSection() {
  const [items, setItems] = useState<ExampleItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/examples", { cache: "no-store" });
        const data = (await res.json()) as ExampleItem[];
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">
        Ejemplos de piezas
      </h2>

      {!items && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      )}

      {items && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <article
              key={x.slug}
              className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-3 hover:shadow-lg transition"
            >
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                {x.thumb_url ? (
                  <img
                    src={x.thumb_url}
                    alt={x.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
                    Vista previa no disponible
                  </div>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold">{x.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {x.caption}
              </p>

              <div className="mt-3 flex gap-2">
                <a
                  href="/forge"
                  className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Personalizar
                </a>
                {x.stl_url && (
                  <a
                    href={x.stl_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                  >
                    Ver STL
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
