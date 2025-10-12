// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "TeknovaShop",
  description: "Configurador TeknovaShop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        {/* Header */}
        <header className="w-full border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Tu logo puede ser una imagen si quieres */}
              <span className="text-lg font-bold">TeknovaShop</span>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/forge" className="hover:underline">
                Forge
              </Link>
              {/* Mantenemos el enlace pero Pro redirige a /forge (ver archivo de abajo) */}
              <Link href="/forge/pro" className="hover:underline">
                Forge Pro
              </Link>
            </nav>
          </div>
        </header>

        {/* Aquí anclamos la HUD (barra) para que nunca tape el header */}
        <div id="viewer-hud-slot" className="sticky top-0 z-30 w-full border-b bg-white/90 backdrop-blur" />

        {/* Página */}
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
