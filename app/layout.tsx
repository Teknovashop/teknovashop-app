import "./globals.css";
import type { Metadata, Viewport } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://teknovashop-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Teknovashop Forge | Diseña STL paramétricos en minutos",
    template: "%s | Teknovashop Forge",
  },
  description:
    "Configura accesorios tech con medidas reales, valida la geometría en 3D y genera diseños STL trazables listos para imprimir.",
  keywords: [
    "STL paramétrico",
    "impresión 3D",
    "configurador 3D",
    "modelos paramétricos",
    "diseño para impresión 3D",
    "STL personalizado",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Teknovashop Forge",
    title: "Teknovashop Forge | Diseña STL paramétricos en minutos",
    description:
      "Ajusta medidas, valida en 3D y genera un diseño trazable preparado para tu slicer.",
    images: [
      {
        url: "/hero/hero.jpg",
        width: 1200,
        height: 675,
        alt: "Teknovashop Forge, configurador paramétrico para impresión 3D",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Teknovashop Forge | Diseña STL paramétricos en minutos",
    description:
      "Configura, valida en 3D y genera diseños STL trazables listos para imprimir.",
    images: ["/hero/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#071321",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-white text-[#0b1526]">
        {children}
      </body>
    </html>
  );
}
