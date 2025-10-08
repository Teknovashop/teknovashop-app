// components/ModelSeo.tsx
'use client';

import { SITE } from '@/lib/site';

type Props = {
  name: string;
  description: string;
  slug: string;
  image?: string;
};

export default function ModelSeo({ name, description, slug, image }: Props) {
  const url = `${SITE.url}/forge/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image ? [image] : undefined,
    url,
    brand: {
      '@type': 'Brand',
      name: SITE.name,
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
