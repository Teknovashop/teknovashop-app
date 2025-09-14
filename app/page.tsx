import ForgeForm from "@/components/ForgeForm";

export const metadata = {
  title: "Teknovashop Forge – Generador de STL",
  description: "Genera piezas paramétricas y descarga el STL directamente desde tu navegador.",
};

export default function Page() {
  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Teknovashop Forge</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount llegan en el siguiente paso.
          </p>
        </header>
        <ForgeForm />
      </div>
    </main>
  );
}
