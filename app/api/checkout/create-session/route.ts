// teknovashop-app/app/api/checkout/create-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Node runtime

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });

type PriceKey = "oneoff" | "maker" | "commercial";

type Body = {
  // Email ahora es OPCIONAL: si no viene, Stripe lo pedirá en Checkout
  email?: string | null;
  price: PriceKey;
  model_kind?: string;
  params?: unknown;
  object_key?: string | null;
};

const PRICE_ENV: Record<PriceKey, string | undefined> = {
  oneoff: process.env.STRIPE_PRICE_ONEOFF,
  maker: process.env.STRIPE_PRICE_MAKER,
  commercial: process.env.STRIPE_PRICE_COMMERCIAL,
};

function siteUrlFromReq(req: Request): string {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSite) return envSite.replace(/\/+$/, "");

  // Deducción automática en plataformas como Vercel si no se configuró la anterior
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "teknovashop-app.vercel.app";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    if (!STRIPE_SECRET) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY not set" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Body;

    if (!body?.price) {
      return NextResponse.json({ error: "PRICE_REQUIRED" }, { status: 400 });
    }

    const priceId = PRICE_ENV[body.price];
    if (!priceId) {
      return NextResponse.json(
        { error: "PRICE_NOT_CONFIGURED" },
        { status: 400 }
      );
    }

    const site = siteUrlFromReq(req);

    const session = await stripe.checkout.sessions.create({
      mode: body.price === "oneoff" ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email: body.email || undefined, // opcional; Stripe la pedirá si falta
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      success_url: `${site}/forge?status=success`,
      cancel_url: `${site}/forge?status=cancel`,
      metadata: {
        model_kind: String(body.model_kind ?? ""),
        params: JSON.stringify(body.params ?? {}),
        object_key: String(body.object_key ?? ""),
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
