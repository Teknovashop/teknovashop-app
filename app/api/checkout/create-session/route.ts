// teknovashop-app/app/api/checkout/create-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";          // ⚠️ importante: Node runtime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type Body = {
  email: string;
  price: "oneoff" | "maker" | "commercial";
  model_kind?: string;
  params?: unknown;
  object_key?: string | null;
};

export async function POST(req: Request) {
  try {
    const { email, price, model_kind, params, object_key }: Body = await req.json();

    if (!email) {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const priceId =
      price === "oneoff"
        ? process.env.STRIPE_PRICE_ONEOFF
        : price === "maker"
        ? process.env.STRIPE_PRICE_MAKER
        : process.env.STRIPE_PRICE_COMMERCIAL;

    if (!priceId) {
      return NextResponse.json({ error: "PRICE_NOT_CONFIGURED" }, { status: 400 });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://teknovashop-app.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: price === "oneoff" ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${site}/forge?status=success`,
      cancel_url: `${site}/forge?status=cancel`,
      metadata: {
        model_kind: String(model_kind ?? ""),
        params: JSON.stringify(params ?? {}),
        object_key: object_key ?? "",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("checkout:create-session error", err);
    return NextResponse.json(
      { error: err?.message ?? "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
