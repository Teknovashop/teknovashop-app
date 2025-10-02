// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teknovashop Forge",
  description: "Genera STL paramétricos en segundos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-50 text-neutral-900">
        {/* Header único */}
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-neutral-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">Teknovashop Forge</Link>
            <Link
              href="/forge"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Abrir Configurador
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>

        <footer className="mt-16 border-t border-neutral-200 py-8 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} Teknovashop · Hecho para crear
        </footer>
      </body>
    </html>
  );
}
