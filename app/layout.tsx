// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teknovashop Forge",
  description: "Generador de STL paramétricos en segundos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-50 text-neutral-900">
        {/* NAV PRINCIPAL (único) */}
        <header className="sticky top-0 z-50 backdrop-blur bg-neutral-900/90 text-neutral-100 border-b border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <div className="font-semibold">Teknovashop Forge</div>
            <nav className="flex items-center gap-3">
              <Link
                href="/forge"
                className="inline-flex items-center rounded-md bg-neutral-100 text-neutral-900 px-3 py-1.5 hover:bg-white border border-neutral-300"
              >
                Abrir Configurador
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>

        <footer className="mx-auto max-w-7xl px-4 py-12 text-sm text-neutral-500">
          © {new Date().getFullYear()} Teknovashop · Hecho para crear
        </footer>
      </body>
    </html>
  );
}
