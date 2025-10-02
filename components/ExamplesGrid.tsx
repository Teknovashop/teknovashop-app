// components/ExamplesGrid.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { EXAMPLES, ExampleItem, makeThumbCacheKey, encodeParams } from "@/data/examples";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL; // opcional

type CardState = {
  img: string; // url o data-uri
  loading: boolean;
};

async function fetchThumbnail(ex: ExampleItem): Promise<string | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ex.model,
        params: ex.params,
        holes: ex.holes ?? [],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.thumb_url === "string" ? data.thumb_url : null;
  } catch {
    return null;
  }
}

// Miniatura SVG muy ligera (sin depender de backend)
function makeSvgDataUrl(title: string) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400'>
      <defs>
        <linearGradient id='g' x1='0' x2='1'>
          <stop offset='0%' stop-color='#f6f7f9'/><stop offset='100%' stop-color='#eef1f5'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' rx='18' fill='url(#g)' stroke='#e5e7eb'/>
      <g transform='translate(0,0)'>
        <rect x='190' y='120' width='260' height='160' rx='20' fill='#d7dbe1'/>
        <circle cx='240' cy='180' r='8' fill='#aeb4bd'/>
        <circle cx='400' cy='180' r='8' fill='#aeb4bd'/>
        <circle cx='240' cy='220' r='8' fill='#aeb4bd'/>
        <circle cx='400' cy='220' r='8' fill='#aeb4bd'/>
      </g>
      <text x='24' y='36' font-family='Inter,Arial' font-size='18' fill='#6b7280'>${title}</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

export default function ExamplesGrid() {
  const [cards, setCards] = useState<Record<string, CardState>>({});

  const init = useMemo(() => {
    const m: Record<string, CardState> = {};
    for (const ex of EXAMPLES) {
      const key = makeThumbCacheKey(ex);
      const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      m[ex.id] = {
        img: cached ?? ex.thumb ?? makeSvgDataUrl(ex.title),
        loading: !cached && !!API_BASE, // si hay backend, intentaremos generar
      };
    }
    return m;
  }, []);

  useEffect(() => {
    setCards(init);
    // Si hay backend, pedir thumbnails y cachear
    if (!API_BASE) return;
    (async () => {
      const updates: Record<string, CardState> = {};
      for (const ex of EXAMPLES) {
        const key = makeThumbCacheKey(ex);
        const cached = localStorage.getItem(key);
        if (cached) {
          updates[ex.id] = { img: cached, loading: false };
          continue;
        }
        const url = await fetchThumbnail(ex);
        if (url) {
          localStorage.setItem(key, url);
          updates[ex.id] = { img: url, loading: false };
        }
      }
      if (Object.keys(updates).length) {
        setCards((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [init]);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {EXAMPLES.map((ex) => {
        const state = cards[ex.id];
        const href = `/forge?model=${encodeURIComponent(
          ex.model
        )}&params=${encodeURIComponent(encodeParams(ex.params))}&generate=1`;
        return (
          <article
            key={ex.id}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 grid h-48 place-items-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state?.img}
                alt={ex.title}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <h3 className="text-base font-semibold">{ex.title}</h3>
            <p className="mt-1 text-sm text-neutral-600">{ex.desc}</p>
            {ex.tip && <p className="mt-1 text-xs italic text-neutral-500">{ex.tip}</p>}

            <div className="mt-3 flex gap-2">
              <a
                href={href}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Personalizar
              </a>
              <a
                href={href}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
              >
                Ver STL
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
