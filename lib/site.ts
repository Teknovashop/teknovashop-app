// lib/site.ts
export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Teknovashop Forge',
  url:
    (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') ||
    'https://teknovashop-app.vercel.app',
  twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '', // ej. "@teknovashop"
  locale: 'es-ES',
};
