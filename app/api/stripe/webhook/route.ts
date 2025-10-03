import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const buf = await req.arrayBuffer();
  try{
    const event = stripe.webhooks.constructEvent(Buffer.from(buf), sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    switch(event.type){
      case 'checkout.session.completed':
        // TODO: activar suscripcion en tu DB
        break;
      case 'customer.subscription.deleted':
        // TODO: desactivar
        break;
    }
    return NextResponse.json({received:true});
  }catch(err:any){
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
export const config = { api: { bodyParser: false } };
