import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Catálogo de modelos",
  alternates: { canonical: "/catalog" },
};

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return children;
}
