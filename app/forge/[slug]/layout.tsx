// app/forge/[slug]/layout.tsx
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { MODELS } from '@/data/models'; // <- corregido
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
  // MODELS puede tener estructura propia; forzamos any para no romper tu tipado
  const m = (MODELS as any[]).find((x) => x.slug === slug);

  const titleBase = m?.name || 'Configurador';
  const title = `${titleBase} – ${SITE.name}`;

  const description =
    m?.description ||
    'Configura parámetros, previsualiza en 3D y descarga tu STL listo para imprimir.';

  const canonical = `${SITE.url}/forge/${slug}`;
  const ogImage =
    m?.thumbnail || m?.image || `${SITE.url}/og-default.png`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: SITE.locale as any,
      url: canonical,
      siteName: SITE.name,
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE.twitter || undefined,
      title,
      description,
      images: [ogImage],
    },
    keywords: m
      ? [
          m.name,
          'STL',
          'impresión 3D',
          'paramétrico',
          'accesorios',
          'teknovashop',
        ]
      : undefined,
  };
}

export default function ForgeModelLayout({ children }: Props) {
  return <>{children}</>;
}
