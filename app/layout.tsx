// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "TeknovaShop",
  description: "Generador paramétrico de piezas – TeknovaShop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {/* Header fijo para que no tape el contenido */}
        <header className="site-header">
          <div className="container">
            <a href="/" className="brand">TeknovaShop</a>
            <nav className="gap-4 hidden md:flex">
              <a className="navlink" href="/forge">Forge</a>
              <a className="navlink" href="/forge/pro">Forge Pro</a>
            </nav>
          </div>
        </header>

        {/* Espaciador del header fijo */}
        <div className="header-spacer" />

        {/* Contenido de las páginas */}
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
