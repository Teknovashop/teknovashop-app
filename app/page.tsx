// app/page.tsx
import Link from "next/link";
import ExampleThumb from "@/components/ExampleThumb";

const EXAMPLES = [
  { kind: "cable_tray", title: "Bandeja de cables", model: "cable_tray" },
  { kind: "vesa_adapter", title: "Adaptador VESA", model: "vesa_adapter" },
  { kind: "router_mount", title: "Soporte Router", model: "router_mount" },
  { kind: "camera_mount", title: "Soporte Cámara", model: "camera_mount" },
  { kind: "wall_bracket", title: "Escuadra Pared", model: "wall_bracket" },
  { kind: "fan_guard", title: "Rejilla Ventilador", model: "fan_guard" },
  { kind: "desk_hook", title: "Hook de Mesa", model: "desk_hook" },
] as const;

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Genera <span className="text-sky-400">STL paramétricos</span> en segundos
          </h1>
          <p className="text-neutral-300 text-lg">
            Ajusta parámetros, previsualiza en 3D y descarga. Diseñado para makers y empresas.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/forge"
              className="inline-flex items-center rounded-md bg-sky-500 hover:bg-sky-400 text-neutral-950 px-4 py-2 font-medium"
            >
              Empezar ahora
            </Link>
            {/* Quitado: Estado del backend */}
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <FeatureCard title="Rápido" text="STL al vuelo, optimizado para impresión." />
            <FeatureCard title="Pro" text="Visor 3D con controles tipo CAD." />
            <FeatureCard title="Escalable" text="Listo para licencias y packs." />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-[280px] overflow-hidden">
          {/* mock del viewport */}
          <ExampleThumb kind="vesa_adapter" className="w-full h-full" />
        </div>
      </section>

      {/* Ejemplos */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Ejemplos de piezas</h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.model}
              href={`/forge?model=${ex.model}`}
              className="group rounded-xl border border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition-colors overflow-hidden"
            >
              <div className="h-40">
                <ExampleThumb kind={ex.kind as any} className="w-full h-full" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="font-medium">{ex.title}</div>
                <div className="text-xs text-neutral-400 group-hover:text-neutral-300">
                  Configurar →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <div className="font-medium">{title}</div>
      <div className="text-neutral-400">{text}</div>
    </div>
  );
}
