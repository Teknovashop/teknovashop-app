'use client';

type PlanKey = 'oneoff' | 'maker' | 'commercial';

async function startSubscription(plan: 'maker' | 'commercial') {
  const res = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ price: plan }),
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && json?.login_url) {
    window.location.href = json.login_url;
    return;
  }
  if (!res.ok || !json?.url) throw new Error(json?.error || 'Error');
  window.location.href = json.url as string;
}

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
      if (plan === 'oneoff') {
        window.location.href = slug
          ? `/forge?model=${encodeURIComponent(slug)}`
          : '/forge';
        return;
      }
      await startSubscription(plan);
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
      <Badge
        label="Compra única"
        plan="oneoff"
        title="Configura y compra un diseño concreto"
        slug={slug}
      />
      <Badge label="Maker (mensual)" plan="maker" title="Suscripción maker" slug={slug} />
      <Badge label="Comercial" plan="commercial" title="Licencia comercial" slug={slug} />
    </div>
  );
}
