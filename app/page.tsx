// app/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import HeroVideo from '@/components/HeroVideo';
import Pricing from '@/components/Pricing';

const CONFIGURATOR_HREF = '/forge';

const HERO_VIDEO_SRC =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL || '/hero/hero.mp4';
const HERO_VIDEO_POSTER =
  process.env.NEXT_PUBLIC_HERO_POSTER_URL || '/hero/hero.png';

/** Plantillas destacadas (con imagen local en /public/templates/*.webp) */
const TEMPLATES: { slug: string; title: string; desc: string; img: string }[] = [
  { slug: "cable-tray",   title: "Bandeja de Cables",         desc: "Organizador modular bajo mesa", img: "/templates/cable-tray.webp" },
  { slug: "vesa-adapter", title: "Adaptador VESA 75/100→200", desc: "Compatibiliza monitores y soportes", img: "/templates/vesa-adapter.webp" },
  { slug: "laptop-stand", title: "Soporte Laptop / Tablet",   desc: "Ángulo y medidas a medida", img: "/templates/laptop-stand.webp" },
  { slug: "phone-stand",  title: "Dock Móvil (USB-C)",        desc: "Ranura y holgura configurables", img: "/templates/phone-stand.webp" },
  { slug: "vesa-shelf",   title: "Bandeja VESA",              desc: "Para mini-PC / NUC en VESA", img: "/templates/vesa-shelf.webp" },
  { slug: "camera-plate", title: "Placa para Cámara",         desc: "Ranuras y tornillería estándar", img: "/templates/camera-plate.webp" },
];

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-[38rem] bg-gradient-to-b from-[#f4f7fb] to-transparent dark:from-neutral-900/50" />
        </div>

        <div className="relative container mx-auto px-4 max-w-6xl py-6 md:py-10">
          <div className="flex justify-end mb-6">
            <Link
              href={CONFIGURATOR_HREF}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-[#2663EB] hover:bg-[#1f55c8] text-white shadow-md transition"
            >
              Abrir Configurador
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Copy */}
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#0b1526] dark:text-white">
                Diseña accesorios tech <span className="text-[#2663EB]">paramétricos</span> en segundos
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#4a5568] dark:text-neutral-300">
                Define medidas, previsualiza en 3D y descarga un STL optimizado listo para imprimir.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href={CONFIGURATOR_HREF}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-[#2663EB] hover:bg-[#1f55c8] text-white font-medium shadow-lg transition"
                >
                  Crear diseño
                </Link>
                <a
                  href="#templates"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-white hover:bg-[#f6f8fb] text-[#0b1526] dark:bg-neutral-900 dark:text-white border border-[#e6eaf2] dark:border-neutral-800 shadow-sm transition"
                >
                  Ver plantillas
                </a>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Rápido</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">STL al vuelo, watertight y ligero.</p>
                </div>
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Pro</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">Visor 3D con controles tipo CAD.</p>
                </div>
                <div className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
                  <p className="font-semibold text-[#0b1526] dark:text-white">Escalable</p>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">Listo para licencias y packs.</p>
                </div>
              </div>
            </div>

            {/* Vídeo del hero */}
            <div className="flex items-center justify-center">
              <HeroVideo src={HERO_VIDEO_SRC} poster={HERO_VIDEO_POSTER} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* PLANTILLAS DESTACADAS */}
      <section id="templates" className="py-12 bg-neutral-50 dark:bg-neutral-925">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-end justify-between">
            <h2 className="text-xl md:text-2xl font-semibold text-[#0b1526] dark:text-white">Plantillas destacadas</h2>
            <Link href={CONFIGURATOR_HREF} className="text-sm text-[#2663EB] hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((t) => (
              <Link
                key={t.slug}
                href={`/forge?model=${encodeURIComponent(t.slug)}`}
                className="group rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative w-full aspect-[16/10] bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={t.img}
                    alt={t.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-[#0b1526] dark:text-white">{t.title}</h3>
                  <p className="text-sm text-[#6b7280] dark:text-neutral-400">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold text-[#0b1526] dark:text-white">Cómo funciona</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { t: "Configura", d: "Elige plantilla y define medidas." },
              { t: "Genera STL", d: "STL watertight optimizado para slicer." },
              { t: "Imprime", d: "Descarga y manda a tu impresora 3D." },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-[#e6eaf2] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
                <div className="text-3xl font-bold text-[#2663EB]">{i + 1}</div>
                <div className="mt-2 font-semibold text-[#0b1526] dark:text-white">{s.t}</div>
                <div className="text-sm text-[#6b7280] dark:text-neutral-400">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS + CTAs accionables */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-[#0b1526] dark:text-white">Precios</h2>
          <Pricing />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/forge?plan=one-time" className="px-4 py-2 rounded-xl bg-[#0b1526] text-white text-sm">
              Comprar STL suelto
            </Link>
            <Link href="/forge?plan=maker" className="px-4 py-2 rounded-xl border text-sm">
              Suscripción Maker
            </Link>
            <Link href="/forge?plan=commercial" className="px-4 py-2 rounded-xl border text-sm">
              Licencia Comercial
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
