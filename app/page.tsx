// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// --- Config: aquí defines tu backend Render/Fly/Railway ---
const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"; // ajusta si es distinto

type Example = {
  key: string;
  model: string;
  title: string;
  blurb: string;
  ctaNote: string;
  params: {
    length_mm: number;
    width_mm: number;
    height_mm: number;
    thickness_mm: number;
    fillet_mm?: number;
  };
  holes?: { x_mm: number; y_mm: number; d_mm: number }[];
  thumb?: string | null; // se completa al vuelo
};

// Muestras “profesionales” (puedes ajustar libremente)
const EXAMPLES: Example[] = [
  {
    key: "vesa-100",
    model: "vesa_adapter",
    title: "Placa VESA 100×100",
    blurb: "Universal 120×120×4 mm con patrón VESA 100. Lista para monitores y brazos.",
    ctaNote: "Tip: cambia grosor si el brazo es pesado.",
    params: { length_mm: 120, width_mm: 120, height_mm: 4, thickness_mm: 4, fillet_mm: 2 },
    holes: [
      { x_mm: 10, y_mm: 60, d_mm: 5 },
      { x_mm: 110, y_mm: 60, d_mm: 5 },
      { x_mm: 60, y_mm: 10, d_mm: 5 },
      { x_mm: 60, y_mm: 110, d_mm: 5 },
    ],
  },
  {
    key: "vesa-75",
    model: "vesa_adapter",
    title: "Placa VESA 75×75",
    blurb: "Compacta 100×100×3.5 mm; ideal para pantallas pequeñas o montajes ligeros.",
    ctaNote: "Tip: añade filete 2–3 mm para bordes suaves.",
    params: { length_mm: 100, width_mm: 100, height_mm: 3.5, thickness_mm: 3.5, fillet_mm: 2 },
    holes: [
      { x_mm: 12.5, y_mm: 50, d_mm: 4.2 },
      { x_mm: 87.5, y_mm: 50, d_mm: 4.2 },
      { x_mm: 50, y_mm: 12.5, d_mm: 4.2 },
      { x_mm: 50, y_mm: 87.5, d_mm: 4.2 },
    ],
  },
  {
    key: "tray-220-100-60",
    model: "cable_tray",
    title: "Bandeja de cables 220×100×60",
    blurb: "Canaleta abierta, pared 3 mm. Perfecta para dejar el escritorio limpio.",
    ctaNote: "Tip: usa agujeros Ø4 para tornillos a pared.",
    params: { length_mm: 220, width_mm: 100, height_mm: 60, thickness_mm: 3, fillet_mm: 1.5 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 4 },
      { x_mm: 200, y_mm: 20, d_mm: 4 },
    ],
  },
  {
    key: "router-mount",
    model: "router_mount",
    title: "Soporte Router (pared)",
    blurb: "Base + vertical en L, pared 3 mm. Sencillo, rígido y fácil de imprimir.",
    ctaNote: "Tip: añade 2–3 agujeros en la base para tornillería.",
    params: { length_mm: 160, width_mm: 90, height_mm: 90, thickness_mm: 3, fillet_mm: 1 },
    holes: [
      { x_mm: 20, y_mm: 45, d_mm: 4.5 },
      { x_mm: 140, y_mm: 45, d_mm: 4.5 },
    ],
  },
  {
    key: "camera-base",
    model: "camera_mount",
    title: "Base compacta cámara",
    blurb: "Plataforma minimalista con columna. Para cámaras ligeras o sensores.",
    ctaNote: "Tip: sube el grosor si atornillas un trípode.",
    params: { length_mm: 80, width_mm: 60, height_mm: 40, thickness_mm: 4, fillet_mm: 1.5 },
    holes: [{ x_mm: 40, y_mm: 30, d_mm: 6 }],
  },
  {
    key: "wall-bracket",
    model: "wall_bracket",
    title: "Escuadra mural reforzada",
    blurb: "Placa horizontal + vertical (T=4). Útil para baldas y soportes varios.",
    ctaNote: "Tip: imprime con 5–6 perímetros para máxima rigidez.",
    params: { length_mm: 120, width_mm: 30, height_mm: 80, thickness_mm: 4, fillet_mm: 2 },
    holes: [
      { x_mm: 15, y_mm: 15, d_mm: 4.5 },
      { x_mm: 105, y_mm: 15, d_mm: 4.5 },
    ],
  },
];

function CardSkeleton() {
  return (
    <div className="aspect-[3/2] w-full rounded-xl bg-neutral-200 animate-pulse" />
  );
}

export default function HomePage() {
  const [items, setItems] = useState<Example[]>(EXAMPLES);

  // Genera/obtiene miniaturas automáticamente en cliente
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const updated: Example[] = await Promise.all(
        items.map(async (ex) => {
          if (ex.thumb) return ex;
          try {
            const res = await fetch(`${BACKEND_BASE}/thumbnail`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: ex.model,
                params: ex.params,
                holes: ex.holes || [],
              }),
              // Importantísimo para CORS si tu backend lo exige
              mode: "cors",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return { ...ex, thumb: data.thumb_url as string };
          } catch (e) {
            console.warn("Miniatura fallida para", ex.key, e);
            return ex; // deja el esqueleto
          }
        })
      );
      if (!cancelled) setItems(updated);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* HERO claro, con sólo un placeholder a la derecha */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Genera <span className="text-blue-600">STL</span> paramétricos
            <br /> en segundos
          </h1>
          <p className="mt-4 text-neutral-600 max-w-xl">
            Ajusta parámetros, previsualiza en 3D y descarga. Diseñado para makers y
            empresas que buscan piezas a medida sin perder tiempo.
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
              href="/forge"
            >
              Empezar ahora
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="font-semibold">Rápido</div>
              <div className="text-sm text-neutral-600">
                STL al vuelo, optimizado para impresión.
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="font-semibold">Pro</div>
              <div className="text-sm text-neutral-600">
                Visor 3D con controles tipo CAD.
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="font-semibold">Escalable</div>
              <div className="text-sm text-neutral-600">
                Listo para licencias y packs.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-neutral-100 p-6">
          {/* Sólo el marco de previsualización, sin 3D real aquí */}
          <div className="aspect-[16/9] rounded-xl border bg-white grid place-items-center">
            <div className="w-40 h-28 rounded-xl border-4 border-neutral-300 grid place-items-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID de ejemplos */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold mb-6">Ejemplos de piezas</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {items.map((ex) => (
            <article
              key={ex.key}
              className="rounded-2xl border bg-white overflow-hidden flex flex-col"
            >
              <div className="p-4">
                <div className="aspect-[3/2] w-full rounded-xl border bg-neutral-100 overflow-hidden">
                  {ex.thumb ? (
                    <Image
                      src={ex.thumb}
                      alt={ex.title}
                      width={960}
                      height={640}
                      className="w-full h-full object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      loading="lazy"
                    />
                  ) : (
                    <CardSkeleton />
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 flex-1 flex flex-col">
                <h3 className="font-semibold">{ex.title}</h3>
                <p className="text-sm text-neutral-600 mt-1">{ex.blurb}</p>
                <p className="text-xs text-neutral-500 mt-2 italic">{ex.ctaNote}</p>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={{
                      pathname: "/forge",
                      query: {
                        model: ex.model,
                        params: JSON.stringify(ex.params),
                        holes: JSON.stringify(ex.holes || []),
                      },
                    }}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Personalizar
                  </Link>
                  <Link
                    href={{
                      pathname: "/forge",
                      query: {
                        model: ex.model,
                        params: JSON.stringify(ex.params),
                        holes: JSON.stringify(ex.holes || []),
                        auto: "download",
                      },
                    }}
                    className="inline-flex items-center rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700"
                  >
                    Ver STL
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
