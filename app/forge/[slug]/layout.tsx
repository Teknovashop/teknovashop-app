import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { canonicalModelSlug } from "@/lib/model-routing";
import { getCanonicalProduct } from "@/lib/server-canonical-catalog";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = canonicalModelSlug(rawSlug);
  const product = await getCanonicalProduct(slug);

  const title = product?.name || "Configurador paramétrico";
  const description =
    product?.description ||
    "Configura medidas reales, valida la geometría en 3D y genera un diseño trazable listo para fabricar.";
  const canonical = `${SITE.url}/forge/${encodeURIComponent(slug)}`;
  const image = product?.marketing_image
    ? product.marketing_image.startsWith("http")
      ? product.marketing_image
      : `${SITE.url}${product.marketing_image}`
    : `${SITE.url}/hero/hero.jpg`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: Boolean(product?.public), follow: true },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: canonical,
      siteName: SITE.name,
      title,
      description,
      images: [{ url: image, width: 1200, height: 900, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter || undefined,
      title,
      description,
      images: [image],
    },
    keywords: product
      ? [product.name, product.family, "STL", "impresión 3D", "paramétrico", "Teknovashop"]
      : undefined,
  };
}

export default function ForgeModelLayout({ children }: Props) {
  return children;
}
