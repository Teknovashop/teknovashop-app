// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { MODELS } from '@/data/models';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://teknovashop-app.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const items: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/forge`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/catalog`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
  ];
  for (const m of MODELS) {
    items.push({
      url: `${BASE}/forge/${m.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }
  return items;
}