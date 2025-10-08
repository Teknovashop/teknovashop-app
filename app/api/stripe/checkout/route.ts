// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') ||
  'https://teknovashop-app.vercel.app';

if (!STRIPE_SECRET_KEY) {
  console.warn('[stripe] Falta STRIPE_SECRET_KEY');
}

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
    const quantity: number = Number(body?.quantity || 1);

    if (!STRIPE_SECRET_KEY) {
      return json({ ok: false, error: 'Stripe no configurado' }, 500);
    }

    // Determina el price a partir del plan o permite sobreescribir con 'price'
    let priceId: string | undefined = body?.price;
    if (!priceId) {
      if (!plan) return json({ ok: false, error: 'Falta plan o price' }, 400);
      priceId = PLAN_TO_PRICE[plan];
    }
    if (!priceId) return json({ ok: false, error: 'Price no configurado' }, 400);

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Miramos el tipo de price para elegir mode automáticamente
    const price = await stripe.prices.retrieve(priceId);
    const mode: 'payment' | 'subscription' =
      (price as any).type === 'recurring' ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity }],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#precios`,
      // Puedes añadir metadata si lo necesitas
    });

    return json({ ok: true, url: session.url });
  } catch (err: any) {
    const msg =
      err?.message ||
      err?.error?.message ||
      'No se pudo crear la sesión de pago';
    return json({ ok: false, error: msg }, 500);
  }
}
