// components/PriceBadges.tsx
'use client';

type Badge = {
  label: string;
  href: string;
  title: string;
};

const links = {
  oneoff:
    process.env.NEXT_PUBLIC_STRIPE_LINK_ONEOFF || '/#precios',
  maker:
    process.env.NEXT_PUBLIC_STRIPE_LINK_MAKER || '/#precios',
  commercial:
    process.env.NEXT_PUBLIC_STRIPE_LINK_COMMERCIAL || '/#precios',
};

export default function PriceBadges() {
  const items: Badge[] = [
    { label: 'Compra única', href: links.oneoff, title: 'Pago por modelo' },
    { label: 'Maker (mensual)', href: links.maker, title: 'Suscripción maker' },
    { label: 'Comercial', href: links.commercial, title: 'Licencia comercial' },
  ].filter(Boolean) as Badge[];

  if (!items.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((b) => (
        <a
          key={b.label}
          href={b.href}
          target={b.href.startsWith('http') ? '_blank' : undefined}
          rel={b.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          title={b.title}
          className="inline-flex items-center rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition"
        >
          {b.label}
        </a>
      ))}
    </div>
  );
}
