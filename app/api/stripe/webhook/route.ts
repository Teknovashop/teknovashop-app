import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const buf = await req.arrayBuffer();
  const sig = req.headers.get('stripe-signature') || '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return json({ ok: false, error: `Webhook signature failed: ${err.message}` }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const plan = session.metadata?.plan as string | undefined; // 'oneoff' | 'maker' | 'commercial'
    const slug = session.metadata?.slug as string | undefined;

    // Recuperar user_id desde customer_email si no usas Stripe Customer <-> Supabase mapping.
    const email = session.customer_details?.email as string | undefined;
    if (!email) return json({ ok: false, error: 'Sin email en session' }, 200);

    // Busca el usuario por email
    const { data: userRow, error: userErr } = await supabase
      .from('users') // si tu tabla de usuarios es distinta, cámbiala; alternativa: auth.admin.listUsersByEmail
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userErr || !userRow?.id) return json({ ok: false, error: 'Usuario no encontrado' }, 200);

    const user_id = userRow.id as string;

    if (plan === 'oneoff' && slug) {
      await supabase.from('entitlements').insert({
        user_id,
        kind: 'oneoff',
        model_slug: slug,
        stripe_session_id: session.id,
      });
    } else {
      // maker / commercial => acceso global
      await supabase.from('entitlements').insert({
        user_id,
        kind: 'subscription',
        model_slug: null,
        stripe_session_id: session.id,
      });
    }
  }

  return json({ ok: true });
}
