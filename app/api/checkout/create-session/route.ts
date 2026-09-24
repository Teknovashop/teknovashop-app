import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

import {
  LICENSE_VERSION,
  TERMS_VERSION,
  type CommercePlan,
} from "@/lib/commerce";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });

type DesignRow = {
  id: string;
  user_id: string | null;
  product_slug: string;
  product_name: string;
  product_version: string;
  stl_path: string;
  manifest_path: string;
  sha256: string;
};

type Body = {
  price: CommercePlan;
  design_id?: string | null;
};

const PRICE_ENV: Record<CommercePlan, string | undefined> = {
  oneoff: process.env.STRIPE_PRICE_ONEOFF,
  maker: process.env.STRIPE_PRICE_MAKER,
  commercial: process.env.STRIPE_PRICE_COMMERCIAL,
};

function siteUrlFromReq(req: Request): string {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSite) return envSite.replace(/\/+$/, "");

  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "teknovashop-app.vercel.app";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    if (!STRIPE_SECRET) {
      return json({ ok: false, error: "STRIPE_SECRET_KEY not set" }, 500);
    }

    const body = (await req.json()) as Body;
    const plan = body?.price;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const next =
        plan === "oneoff" && body?.design_id
          ? `/forge?buy=${encodeURIComponent(String(body.design_id))}`
          : "/#precios";
      return json(
        {
          ok: false,
          error: "AUTH_REQUIRED",
          login_url: `/login?next=${encodeURIComponent(next)}`,
        },
        401
      );
    }

    if (!plan || !PRICE_ENV[plan]) {
      return json({ ok: false, error: "PRICE_NOT_CONFIGURED" }, 400);
    }

    const admin = getSupabaseAdmin();
    let design: any = null;

    if (plan === "oneoff") {
      const designId = String(body?.design_id || "").trim();
      if (!designId) {
        return json(
          {
            ok: false,
            error: "DESIGN_REQUIRED",
            detail: "A one-off purchase must reference a generated design_id.",
          },
          400
        );
      }

      const { data, error } = await admin
        .from("designs")
        .select(
          "id,user_id,product_slug,product_name,product_version,stl_path,manifest_path,sha256"
        )
        .eq("id", designId)
        .maybeSingle();

      if (error || !data) {
        return json({ ok: false, error: "DESIGN_NOT_FOUND" }, 404);
      }

      const row = data as unknown as DesignRow;

      if (row.user_id && row.user_id !== user.id) {
        return json({ ok: false, error: "DESIGN_NOT_OWNED" }, 403);
      }

      if (!row.user_id) {
        const { data: claimed, error: claimError } = await admin
          .from("designs")
          .update({ user_id: user.id })
          .eq("id", designId)
          .is("user_id", null)
          .select("id,user_id")
          .maybeSingle();

        if (claimError) {
          return json({ ok: false, error: "DESIGN_CLAIM_FAILED" }, 500);
        }

        // Atomic claim: if another authenticated user claimed this design
        // between our SELECT and UPDATE, no row is returned. Never create a
        // Stripe Checkout Session for a design the current user no longer owns.
        if (!claimed || claimed.user_id !== user.id) {
          return json(
            {
              ok: false,
              error: "DESIGN_CLAIM_CONFLICT",
              detail: "This generated design is already linked to another account.",
            },
            409
          );
        }

        row.user_id = user.id;
      }

      design = row;
    }

    const priceId = PRICE_ENV[plan]!;
    const site = siteUrlFromReq(req);

    const metadata: Record<string, string> = {
      user_id: user.id,
      plan,
      terms_version: TERMS_VERSION,
      license_version: LICENSE_VERSION,
      design_id: design?.id || "",
      product_slug: design?.product_slug || "",
      product_version: design?.product_version || "",
    };

    const mode: "payment" | "subscription" =
      plan === "oneoff" ? "payment" : "subscription";

    const sessionParams: any = {
      mode,
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      success_url:
        plan === "oneoff"
          ? `${site}/forge/success?session_id={CHECKOUT_SESSION_ID}&design_id=${encodeURIComponent(
              design.id
            )}`
          : `${site}/forge/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        plan === "oneoff" && design
          ? `${site}/forge?status=cancel&design_id=${encodeURIComponent(design.id)}`
          : `${site}/#precios`,
      metadata,
    };

    if (mode === "subscription") {
      sessionParams.subscription_data = { metadata };
    } else {
      sessionParams.payment_intent_data = { metadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({ ok: true, url: session.url }, 200);
  } catch (err: any) {
    console.error("checkout:create-session error", err);
    return json(
      { ok: false, error: err?.message ?? "INTERNAL_ERROR" },
      500
    );
  }
}
