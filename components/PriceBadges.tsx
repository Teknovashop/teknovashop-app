// components/PriceBadges.tsx
'use client';

type PlanKey = 'oneoff' | 'maker' | 'commercial';

function Badge({
  label,
  plan,
  title,
  slug,
}: {
  label: string;
  plan: PlanKey;
  title: string;
  slug?: string;
}) {
  const onClick = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, slug }), // <- pasamos slug para oneoff
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || 'Error');
      window.location.href = json.url as string;
    } catch (e: any) {
      alert(e?.message || 'No se pudo iniciar el pago');
    }
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition"
    >
      {label}
    </button>
  );
}

export default function PriceBadges({ slug }: { slug?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Badge label="Compra única" plan="oneoff" title="Pago por modelo" slug={slug} />
      <Badge label="Maker (mensual)" plan="maker" title="Suscripción maker" slug={slug} />
      <Badge label="Comercial" plan="commercial" title="Licencia comercial" slug={slug} />
    </div>
  );
}
