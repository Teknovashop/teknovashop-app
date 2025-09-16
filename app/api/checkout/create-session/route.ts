// app/api/checkout/create-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function POST(req: Request) {
  const { email, model_kind, params, price = "oneoff", object_key } = await req.json();

  const priceMap: Record<string, string> = {
    oneoff: process.env.STRIPE_PRICE_ONEOFF!,
    maker: process.env.STRIPE_PRICE_MAKER!,
    commercial: process.env.STRIPE_PRICE_COMMERCIAL!,
  };
  const priceId = priceMap[price];
  if (!priceId) return NextResponse.json({ error: "Precio no configurado" }, { status: 400 });

  const success = new URL("/forge/success", req.url);
  const cancel  = new URL("/forge", req.url);

  const session = await stripe.checkout.sessions.create({
    mode: price === "oneoff" ? "payment" : "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: success.toString() + "?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: cancel.toString(),
    metadata: {
      model_kind, object_key: object_key || "", params: JSON.stringify(params || {}),
    },
  });

  return NextResponse.json({ id: session.id, url: session.url });
}
