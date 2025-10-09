import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug') || undefined;

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ ok: true, hasAccess: false, reason: 'anon' });

  // suscripción activa?
  const { data: sub } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .is('model_slug', null)
    .maybeSingle();

  if (sub) return json({ ok: true, hasAccess: true, via: 'subscription' });

  if (!slug) return json({ ok: true, hasAccess: false });

  // compra única del modelo
  const { data: one } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .eq('model_slug', slug)
    .maybeSingle();

  return json({ ok: true, hasAccess: !!one, via: one ? 'oneoff' : undefined });
}
