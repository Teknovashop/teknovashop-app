import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';        // Stripe SDK requiere Node runtime (no Edge)
export const dynamic = 'force-dynamic'; // evita caching del handler

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const buf = await req.arrayBuffer(); // cuerpo RAW para verificación

  try {
    const event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed':
        // TODO: activar suscripción en tu DB
        break;
      case 'customer.subscription.deleted':
        // TODO: desactivar suscripción
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
