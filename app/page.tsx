// app/page.tsx
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import HeroVideo from "@/components/HeroVideo";
import Pricing from "@/components/Pricing";
import HomeHeader from "@/components/HomeHeader";
import Reveal from "@/components/Reveal";
import MobileCta from "@/components/MobileCta";

const CONFIGURATOR_HREF = "/forge";
const HERO_VIDEO_SRC =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/hero/hero.mp4";
const HERO_VIDEO_POSTER =
  process.env.NEXT_PUBLIC_HERO_POSTER_URL || "/hero/hero.jpg";

const TEMPLATES = [
  ["vesa-adapter", "Adaptador VESA (2 patrones)", "Adapta dos patrones VESA con medidas reales y perforaciones verificadas.", "Montaje", "/images/products/vesa-adapter.webp"],
  ["cable-tray", "Bandeja de Cables", "Canaliza hubs, fuentes y cableado bajo mesa con una bandeja configurable.", "Escritorio", "/images/products/cable-tray.webp"],
  ["laptop-stand", "Soporte Laptop / Tablet", "Ajusta apoyo, ángulo y dimensiones para tu equipo.", "Ergonomía", "/images/products/laptop-stand.webp"],
  ["phone-stand", "Soporte / Dock Móvil (USB-C)", "Configura un soporte inclinado con paso para cable USB-C.", "Dock", "/images/products/phone-stand.webp"],
  ["router-mount", "Soporte de Router", "Base y respaldo configurables para alojar el router con holgura.", "Red", "/images/products/router-mount.webp"],
  ["enclosure-ip65", "Caja técnica con tapa", "Caja técnica configurable para electrónica y proyectos protegidos.", "Electrónica", "/images/products/enclosure-ip65-pro.svg"],
];

const BENEFITS = [
  ["Parametrización real", "Cada producto expone solo controles con efecto geométrico real."],
  ["Vista 3D a escala", "Reglas, cotas, vistas CAD y medición punto a punto en milímetros."],
  ["Calidad automatizada", "Geometría, volumen y exportación STL pasan por pruebas automáticas."],
  ["Diseños trazables", "Cada generación incorpora design ID, versión y huella SHA-256."],
  ["Licencias claras", "Compra una configuración concreta o trabaja con suscripción."],
  ["De idea a slicer", "Configura, valida y genera sin rehacer cada variante desde cero."],
];

const SOFTWARE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Teknovashop Forge",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://teknovashop-app.vercel.app",
  description:
    "Configurador paramétrico para adaptar medidas reales, validar geometrías en 3D y generar diseños STL trazables listos para imprimir.",
  featureList: [
    "Modelos paramétricos",
    "Previsualización 3D a escala",
    "Cotas y medición",
    "Generación STL",
    "Design ID y manifiesto SHA-256",
  ],
};

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function Cube() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.4 7.7 7.6 4.2 7.6-4.2M12 12v9" />
    </svg>
  );
}

export default function Page() {
  return (
    <main id="main-content" className="min-h-screen bg-[#f6f8fc] text-[#07111f]">
      <a href="#main-content" className="home-skip-link">
        Saltar al contenido
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />
      <section className="relative overflow-hidden bg-[#071321] text-white">
        <div className="home-hero-glow absolute inset-0 pointer-events-none" />

        <HomeHeader />

        <div className="relative mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="home-pill">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                Diseño paramétrico listo para imprimir
              </div>

              <h1 className="mt-6 text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Diseña accesorios tech paramétricos <span className="home-gradient-text">en minutos.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Ajusta medidas reales, valida la pieza en 3D y genera un diseño trazable preparado para tu slicer. Sin rehacer cada variante desde cero en CAD.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={CONFIGURATOR_HREF} className="home-primary-btn home-primary-btn-lg">
                  Probar configurador <Arrow />
                </Link>
                <a href="#templates" className="home-secondary-btn">Ver plantillas</a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-300">
                {["Sin experiencia CAD obligatoria", "Vista 3D a escala", "STL validado", "Diseño trazable"].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={120} className="relative">
              <div className="absolute -inset-8 rounded-[2.5rem] bg-blue-500/10 blur-3xl" />
              <div className="relative rounded-[1.6rem] border border-white/15 bg-white/5 p-2 shadow-2xl">
                <HeroVideo
                  src={HERO_VIDEO_SRC}
                  poster={HERO_VIDEO_POSTER}
                  className="!rounded-[1.2rem] !border-white/10 !bg-[#081421]"
                />
                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-white/10 bg-[#071321]/80 px-4 py-3 backdrop-blur-xl">
                  <div>
                    <div className="text-xs font-bold">Del parámetro a una pieza real</div>
                    <div className="text-[10px] text-slate-400">Configura · valida · genera</div>
                  </div>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200">DEMO PRODUCTO</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="border-y border-white/10 bg-white/[0.035]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-5 md:grid-cols-4 lg:px-8">
            {[
              ["18", "modelos paramétricos canónicos"],
              ["172", "pruebas automáticas de calidad"],
              ["SHA-256", "trazabilidad por diseño"],
              ["3D", "previsualización antes de comprar"],
            ].map((item) => (
              <div key={item[0]} className="px-4 py-5 text-center">
                <div className="font-black">{item[0]}</div>
                <div className="mt-1 text-[11px] leading-4 text-slate-400">{item[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="home-section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="home-section-head">
            <div>
              <p className="home-eyebrow">Empieza con una base sólida</p>
              <h2 className="home-title">Plantillas destacadas</h2>
              <p className="home-copy">Geometrías útiles con parámetros reales, no simples escalados de un STL.</p>
            </div>
            <Link href="/catalog" className="home-text-link">Ver todas <Arrow /></Link>
          </Reveal>

          <Reveal delay={90}>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((template) => (
              <Link
                key={template[0]}
                href={"/forge?model=" + encodeURIComponent(template[0])}
                className="home-product-card group"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={template[4]}
                    alt={template[1]}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700">
                    {template[3]}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-extrabold">{template[1]}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{template[2]}</p>
                </div>
              </Link>
            ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="how" className="home-section border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="text-center">
            <p className="home-eyebrow">Un flujo corto, una salida profesional</p>
            <h2 className="home-title mx-auto">De una medida a una pieza real</h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              ["01", "Configura", "Elige un producto y ajusta solo los parámetros que tienen sentido para esa geometría."],
              ["02", "Valida en 3D", "Comprueba cotas, escala, orientación y detalles antes de generar el diseño final."],
              ["03", "Genera y fabrica", "Obtén el paquete trazable y llévalo a tu flujo de slicing e impresión 3D."],
            ].map((step) => (
              <div key={step[0]} className="home-feature-card">
                <span className="text-xs font-black tracking-[0.18em] text-blue-500">{step[0]}</span>
                <h3 className="mt-6 text-xl font-black">{step[1]}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step[2]}</p>
              </div>
            ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="quality" className="home-section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <p className="home-eyebrow">No es una biblioteca de archivos</p>
          <h2 className="home-title">Un configurador construido como producto.</h2>
            <p className="home-copy">La diferencia está en que cada diseño sea parametrizable, verificable y repetible.</p>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit[0]} className="home-feature-card">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0c2039] text-cyan-300"><Cube /></div>
                <h3 className="mt-5 font-black">{benefit[0]}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{benefit[1]}</p>
              </div>
            ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="home-section border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="home-eyebrow">Confianza verificable</p>
            <h2 className="home-title">Primero demostramos que funciona.</h2>
            <p className="home-copy">
              Cada modelo entra en catálogo con un contrato de producto, pruebas automáticas y trazabilidad reproducible. La confianza se apoya en lo que podemos verificar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["18 modelos canónicos", "Cada producto corresponde a una geometría concreta y parametrizable."],
              ["172 checks automatizados", "Regresión de geometría, parámetros, exportación y trazabilidad."],
              ["Design ID único", "Cada generación puede identificarse, versionarse y licenciarse."],
              ["Manifiesto reproducible", "Parámetros, versión y SHA-256 acompañan al diseño final."],
            ].map((proof) => (
              <div key={proof[0]} className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5">
                <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">Verificado</div>
                <h3 className="mt-3 font-black">{proof[0]}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{proof[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="home-section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <p className="home-eyebrow">Paga por lo que necesitas</p>
            <h2 className="home-title mx-auto">Un diseño concreto o acceso continuo.</h2>
            <p className="home-copy mx-auto">Compra una configuración específica o trabaja con suscripción según tu ritmo de creación.</p>
          </div>
          <div className="mt-9"><Pricing /></div>
        </div>
      </section>

      <section id="faq" className="home-section border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="home-eyebrow">Lo esencial antes de empezar</p>
            <h2 className="home-title">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {[
              ["¿Necesito saber CAD?", "No. Cada producto expone controles específicos y el visor permite validar el resultado en 3D."],
              ["¿Qué recibo al descargar?", "El flujo comercial está preparado para entregar STL, manifiesto, licencia y README técnico."],
              ["¿Puedo comprar una sola pieza?", "Sí. La compra única se vincula al design ID exacto de la configuración generada."],
              ["¿Las medidas están en milímetros?", "Sí. Configurador, visor, cotas y STL trabajan en milímetros."],
              ["¿Qué diferencia hay con una suscripción?", "La compra única licencia un diseño concreto; la suscripción está pensada para uso recurrente."],
            ].map((faq) => (
              <details key={faq[0]} className="group rounded-2xl border border-slate-200 bg-[#fbfcff]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black">
                  {faq[0]} <span className="text-xl font-light text-blue-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-6 text-slate-500">{faq[1]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#071321] px-8 py-10 text-white shadow-2xl lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Tu siguiente pieza empieza con una medida</p>
            <h2 className="mt-3 text-3xl font-black">Configura algo útil hoy.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Comprueba el resultado en 3D antes de decidir si quieres descargarlo.</p>
          </div>
          <Link href={CONFIGURATOR_HREF} className="home-primary-btn home-primary-btn-lg mt-6 lg:mt-0">
            Probar configurador <Arrow />
          </Link>
        </div>
      </section>

      <MobileCta />

      <footer className="border-t border-slate-200 bg-white pb-20 md:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="font-black">Teknovashop <span className="text-blue-600">Forge</span></div>
            <p className="mt-1 text-sm text-slate-500">Diseña · valida · fabrica</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-600">
            <a href="#templates">Plantillas</a>
            <a href="#pricing">Precios</a>
            <a href="#faq">FAQ</a>
            <Link href="/login?next=/forge">Iniciar sesión</Link>
            <Link href="/legal">Aviso legal</Link>
            <Link href="/legal/terms">Condiciones</Link>
            <Link href="/legal/privacy">Privacidad</Link>
            <Link href="/legal/refunds">Reembolsos</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
