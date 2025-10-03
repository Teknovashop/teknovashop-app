import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try{
    const { priceId } = await req.json();
    if(!priceId) return NextResponse.json({error:'priceId requerido'},{status:400});
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancelled`,
    });
    return NextResponse.json({ url: session.url });
  }catch(e:any){
    return NextResponse.json({error:e.message},{status:500});
  }
}
