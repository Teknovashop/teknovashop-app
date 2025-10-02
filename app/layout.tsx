// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teknovashop Forge",
  description: "Genera STL paramétricos en segundos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-950 text-neutral-100">
        <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              Teknovashop Forge
            </Link>

            <nav className="flex items-center gap-3">
              {/* Quitado: Estado del backend */}
              {/* Quitado: GitHub */}
              <Link
                href="/forge"
                className="inline-flex items-center rounded-md bg-neutral-200 text-neutral-900 px-3 py-1.5 text-sm font-medium hover:bg-white"
              >
                Abrir Configurador
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-neutral-800 mt-12">
          <div className="container mx-auto px-4 py-6 text-sm text-neutral-400">
            © {new Date().getFullYear()} Teknovashop · Hecho para crear
          </div>
        </footer>
      </body>
    </html>
  );
}
