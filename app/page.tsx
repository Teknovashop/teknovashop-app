"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 shadow-sm bg-white">
        <h1 className="text-xl font-bold">Teknovashop Forge</h1>
        <Link
          href="/forge"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Abrir Configurador
        </Link>
      </header>

      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 px-10 py-16 items-center">
        <div>
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Genera <span className="text-blue-600">STL paramétricos</span> en segundos
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Ajusta parámetros, previsualiza en 3D y descarga tu diseño. 
            Diseñado para makers y empresas.
          </p>
          <Link
            href="/forge"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Empezar ahora
          </Link>
        </div>

        {/* Vista previa del configurador */}
        <div className="rounded-2xl shadow-lg border bg-white p-6 flex items-center justify-center">
          <Image
            src="/preview-configurator.png"
            alt="Vista previa del configurador"
            width={450}
            height={350}
            className="rounded-xl"
          />
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 px-10 mb-16 text-center">
        <div className="p-6 rounded-xl bg-gray-100 shadow-sm">
          <h3 className="font-bold mb-2">Rápido</h3>
          <p className="text-gray-600 text-sm">STL al vuelo, optimizado para impresión.</p>
        </div>
        <div className="p-6 rounded-xl bg-gray-100 shadow-sm">
          <h3 className="font-bold mb-2">Pro</h3>
          <p className="text-gray-600 text-sm">Visor 3D con controles tipo CAD.</p>
        </div>
        <div className="p-6 rounded-xl bg-gray-100 shadow-sm">
          <h3 className="font-bold mb-2">Escalable</h3>
          <p className="text-gray-600 text-sm">Listo para licencias y packs.</p>
        </div>
      </section>

      {/* Ejemplos */}
      <section className="px-10 pb-20">
        <h3 className="text-2xl font-bold mb-6">Ejemplos de piezas</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
          {examples.map((ex, i) => (
            <div key={i} className="rounded-xl overflow-hidden shadow hover:shadow-lg transition">
              <Image
                src={ex.img}
                alt={ex.title}
                width={400}
                height={300}
                className="w-full h-48 object-cover"
              />
              <div className="p-4 bg-white">
                <h4 className="font-semibold">{ex.title}</h4>
                <p className="text-sm text-gray-600">{ex.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const examples = [
  {
    img: "/examples/vesa.png",
    title: "Adaptador VESA",
    desc: "Soporte para monitores con patrón 75/100mm.",
  },
  {
    img: "/examples/cable-tray.png",
    title: "Bandeja de cables",
    desc: "Organiza cables con un diseño paramétrico ajustable.",
  },
  {
    img: "/examples/fan-guard.png",
    title: "Protector de ventilador",
    desc: "Diseño seguro para impresoras 3D y PCs.",
  },
];
