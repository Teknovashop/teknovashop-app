// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teknovashop Forge",
  description: "Generador paramétrico de piezas (v1)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-7xl">{children}</main>
      </body>
    </html>
  );
}
