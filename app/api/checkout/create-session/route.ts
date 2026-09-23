// teknovashop-app/app/api/checkout/create-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/commerce";

export const runtime = "nodejs"; // Node runtime

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });

type PriceKey = "oneoff" | "maker" | "commercial";

type DesignRow = {
  id: string;
  user_id: string | null;
  product_slug: string;
  product_version: string;
};

type Body = {
  // Email ahora es OPCIONAL: si no viene, Stripe lo pedirá en Checkout
  email?: string | null;
  price: PriceKey;
  design_id?: string | null;
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

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    await admin.from("designs").select("id").limit(1);

    const body = (await req.json()) as Body;
    let design: DesignRow | null = null;

    if (body.price === "oneoff") {
      const designId = String(body.design_id || "").trim();
      if (!designId) {
        return NextResponse.json(
          { error: "DESIGN_REQUIRED" },
          { status: 400 }
        );
      }

      const { data, error } = await admin
        .from("designs")
        .select("id,user_id,product_slug,product_version")
        .eq("id", designId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          { error: "DESIGN_NOT_FOUND" },
          { status: 404 }
        );
      }

      const row = data as unknown as DesignRow;

      if (row.user_id && row.user_id !== user.id) {
        return NextResponse.json(
          { error: "DESIGN_NOT_OWNED" },
          { status: 403 }
        );
      }

      design = row;
    }

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

    const metadata = {
      user_id: user.id,
      plan: body.price,
      terms_version: TERMS_VERSION,
      license_version: LICENSE_VERSION,
      design_id: design?.id || "",
      product_slug: design?.product_slug || "",
      product_version: design?.product_version || "",
      model_kind: String(body.model_kind ?? ""),
    };

    const session = await stripe.checkout.sessions.create({
      mode: body.price === "oneoff" ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      success_url:
        body.price === "oneoff" && design
          ? `${site}/forge/success?session_id={CHECKOUT_SESSION_ID}&design_id=${encodeURIComponent(design.id)}`
          : `${site}/forge/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/forge?status=cancel`,
      metadata,
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
