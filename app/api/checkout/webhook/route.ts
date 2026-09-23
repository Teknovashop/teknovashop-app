import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  LICENSE_VERSION,
  TERMS_VERSION,
  type CommercePlan,
} from "@/lib/commerce";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

function asId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function unixToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionIsActive(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}

async function createOrUpdateDesignEntitlement(args: {
  userId: string;
  designId: string;
  sessionId: string;
  customerId: string | null;
  termsVersion: string;
  licenseVersion: string;
}) {
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("entitlements")
    .select("id")
    .eq("user_id", args.userId)
    .eq("kind", "design")
    .eq("design_id", args.designId)
    .maybeSingle();

  const payload = {
    user_id: args.userId,
    kind: "design",
    plan: "oneoff",
    design_id: args.designId,
    model_slug: null,
    active: true,
    starts_at: new Date().toISOString(),
    expires_at: null,
    stripe_customer_id: args.customerId,
    stripe_subscription_id: null,
    stripe_checkout_session_id: args.sessionId,
    terms_version: args.termsVersion,
    license_version: args.licenseVersion,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin
      .from("entitlements")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("entitlements")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createOrUpdateSubscriptionEntitlement(args: {
  userId: string;
  plan: Exclude<CommercePlan, "oneoff">;
  sessionId?: string | null;
  customerId: string | null;
  subscription: Stripe.Subscription;
  termsVersion: string;
  licenseVersion: string;
}) {
  const admin = getSupabaseAdmin();
  const subscriptionId = args.subscription.id;

  const { data: existing } = await admin
    .from("entitlements")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const payload = {
    user_id: args.userId,
    kind: "subscription",
    plan: args.plan,
    design_id: null,
    model_slug: null,
    active: subscriptionIsActive(args.subscription.status),
    starts_at: new Date(
      (args.subscription.start_date || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString(),
    expires_at: unixToIso(args.subscription.current_period_end),
    stripe_customer_id: args.customerId,
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: args.sessionId || null,
    terms_version: args.termsVersion,
    license_version: args.licenseVersion,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await admin
      .from("entitlements")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("entitlements")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function recordOrder(session: Stripe.Checkout.Session) {
  const admin = getSupabaseAdmin();
  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  const plan = md.plan as CommercePlan | undefined;
  if (!userId || !plan) {
    throw new Error("Checkout session is missing user_id or plan metadata");
  }

  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const subscriptionId = asId(session.subscription as any);
  const paymentIntentId = asId(session.payment_intent as any);
  const customerId = asId(session.customer as any);

  const { data, error } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      mode: session.mode,
      plan,
      design_id: md.design_id || null,
      product_slug: md.product_slug || null,
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
      payment_status: session.payment_status ?? null,
      terms_version: md.terms_version || TERMS_VERSION,
      license_version: md.license_version || LICENSE_VERSION,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function processCheckoutCompleted(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  const plan = md.plan as CommercePlan | undefined;

  if (!userId || !plan) {
    throw new Error("Checkout session missing required commerce metadata");
  }

  await recordOrder(session);

  if (plan === "oneoff") {
    if (!md.design_id) {
      throw new Error("One-off checkout completed without design_id");
    }

    await createOrUpdateDesignEntitlement({
      userId,
      designId: md.design_id,
      sessionId: session.id,
      customerId: asId(session.customer as any),
      termsVersion: md.terms_version || TERMS_VERSION,
      licenseVersion: md.license_version || LICENSE_VERSION,
    });
    return;
  }

  const subscriptionId = asId(session.subscription as any);
  if (!subscriptionId) {
    throw new Error("Subscription checkout completed without subscription id");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await createOrUpdateSubscriptionEntitlement({
    userId,
    plan,
    sessionId: session.id,
    customerId: asId(session.customer as any),
    subscription,
    termsVersion: md.terms_version || TERMS_VERSION,
    licenseVersion: md.license_version || LICENSE_VERSION,
  });
}

async function processSubscriptionChange(subscription: Stripe.Subscription) {
  const md = subscription.metadata || {};
  const userId = md.user_id;
  const plan = md.plan as Exclude<CommercePlan, "oneoff"> | undefined;

  if (!userId || !plan || (plan !== "maker" && plan !== "commercial")) {
    return;
  }

  await createOrUpdateSubscriptionEntitlement({
    userId,
    plan,
    customerId: asId(subscription.customer as any),
    subscription,
    termsVersion: md.terms_version || TERMS_VERSION,
    licenseVersion: md.license_version || LICENSE_VERSION,
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new NextResponse("Missing signature or secret", { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature failed:", err?.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: alreadyProcessed } = await admin
    .from("stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (alreadyProcessed?.event_id) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await processSubscriptionChange(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        break;
    }

    const { error: eventError } = await admin.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
    if (eventError) throw eventError;

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error", event.id, event.type, err);
    return NextResponse.json(
      { received: false, error: err?.message || "WEBHOOK_PROCESSING_FAILED" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
