import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://teknovashop-app.vercel.app').replace(/\/+$/, '');

type PlanKey = 'oneoff' | 'maker' | 'commercial';
const PLAN_TO_PRICE: Record<PlanKey, string | undefined> = {
  oneoff: process.env.STRIPE_PRICE_ONEOFF,
  maker: process.env.STRIPE_PRICE_MAKER,
  commercial: process.env.STRIPE_PRICE_COMMERCIAL,
};

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const plan: PlanKey | undefined = body?.plan;
    const slug: string | undefined = body?.slug; // <- importante para compra única
    const quantity: number = Number(body?.quantity || 1);

    if (!STRIPE_SECRET_KEY) return json({ ok: false, error: 'Stripe no configurado' }, 500);
    let priceId: string | undefined = body?.price || (plan ? PLAN_TO_PRICE[plan] : undefined);
    if (!priceId) return json({ ok: false, error: 'Price no configurado' }, 400);

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const price = await stripe.prices.retrieve(priceId);
    const mode: 'payment' | 'subscription' =
      (price as any).type === 'recurring' ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity }],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#precios`,
      metadata: {
        plan: plan || '',
        slug: slug || '', // si es compra única, aquí llega el modelo
      },
    });

    return json({ ok: true, url: session.url });
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'No se pudo crear la sesión' }, 500);
  }
}
