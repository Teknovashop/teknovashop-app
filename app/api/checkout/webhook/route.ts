import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  LICENSE_VERSION,
  TERMS_VERSION,
  type CommercePlan,
} from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type IdRow = { id: string };
type StripeEventRow = { event_id: string };
type OneoffOrderRow = {
  id: string;
  user_id: string;
  design_id: string | null;
  plan: string;
};

function assertSupabaseServerConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration missing");
  }
}

function restHeaders(extra?: Record<string, string>) {
  assertSupabaseServerConfig();
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function restSelect<T>(
  table: string,
  params: URLSearchParams
): Promise<T[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
    {
      method: "GET",
      headers: restHeaders(),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Supabase SELECT ${table} failed: ${res.status} ${await res.text()}`
    );
  }

  const json = await res.json();
  return Array.isArray(json) ? (json as T[]) : [];
}

async function restInsert(table: string, row: Record<string, any>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Supabase INSERT ${table} failed: ${res.status} ${await res.text()}`
    );
  }
}

async function restUpdate(
  table: string,
  params: URLSearchParams,
  row: Record<string, any>
) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: restHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Supabase UPDATE ${table} failed: ${res.status} ${await res.text()}`
    );
  }
}

function selectOneParams(
  filters: Record<string, string>,
  select = "*"
) {
  const params = new URLSearchParams();
  params.set("select", select);
  params.set("limit", "1");
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  return params;
}

function filterParams(filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  return params;
}

function asId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function unixToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionIsActive(status: string | null | undefined) {
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
  const rows = await restSelect<IdRow>(
    "entitlements",
    selectOneParams(
      {
        user_id: args.userId,
        kind: "design",
        design_id: args.designId,
      },
      "id"
    )
  );

  const existing = rows[0] || null;

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
    await restUpdate(
      "entitlements",
      selectOneParams({ id: existing.id }, "id"),
      payload
    );
    return existing.id;
  }

  const id = crypto.randomUUID();
  await restInsert("entitlements", { id, ...payload });
  return id;
}

async function createOrUpdateSubscriptionEntitlement(args: {
  userId: string;
  plan: Exclude<CommercePlan, "oneoff">;
  sessionId?: string | null;
  customerId: string | null;
  subscription: any;
  termsVersion: string;
  licenseVersion: string;
}) {
  const subscriptionId = String(args.subscription?.id || "");

  const rows = await restSelect<IdRow>(
    "entitlements",
    selectOneParams(
      { stripe_subscription_id: subscriptionId },
      "id"
    )
  );

  const existing = rows[0] || null;

  const payload = {
    user_id: args.userId,
    kind: "subscription",
    plan: args.plan,
    design_id: null,
    model_slug: null,
    active: subscriptionIsActive(args.subscription?.status),
    starts_at: new Date(
      (args.subscription?.start_date || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString(),
    expires_at: unixToIso(args.subscription?.current_period_end),
    stripe_customer_id: args.customerId,
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: args.sessionId || null,
    terms_version: args.termsVersion,
    license_version: args.licenseVersion,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await restUpdate(
      "entitlements",
      selectOneParams({ id: existing.id }, "id"),
      payload
    );
    return existing.id;
  }

  const id = crypto.randomUUID();
  await restInsert("entitlements", { id, ...payload });
  return id;
}

async function recordOrder(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  const plan = md.plan as CommercePlan | undefined;

  if (!userId || !plan) {
    throw new Error("Checkout session is missing user_id or plan metadata");
  }

  const rows = await restSelect<IdRow>(
    "orders",
    selectOneParams(
      { stripe_checkout_session_id: session.id },
      "id"
    )
  );

  const existing = rows[0] || null;
  if (existing?.id) return existing.id;

  const id = crypto.randomUUID();

  await restInsert("orders", {
    id,
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: asId(session.payment_intent as any),
    stripe_customer_id: asId(session.customer as any),
    stripe_subscription_id: asId(session.subscription as any),
    mode: session.mode,
    plan,
    design_id: md.design_id || null,
    product_slug: md.product_slug || null,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
    payment_status: session.payment_status ?? null,
    terms_version: md.terms_version || TERMS_VERSION,
    license_version: md.license_version || LICENSE_VERSION,
  });

  return id;
}

async function setOneoffAccessByPaymentIntent(args: {
  paymentIntentId: string;
  active: boolean;
  paymentStatus: string;
}) {
  const rows = await restSelect<OneoffOrderRow>(
    "orders",
    selectOneParams(
      { stripe_payment_intent_id: args.paymentIntentId },
      "id,user_id,design_id,plan"
    )
  );

  const order = rows[0] || null;
  if (!order || order.plan !== "oneoff" || !order.design_id) {
    return;
  }

  await restUpdate(
    "orders",
    filterParams({ id: order.id }),
    {
      payment_status: args.paymentStatus,
    }
  );

  await restUpdate(
    "entitlements",
    filterParams({
      user_id: order.user_id,
      kind: "design",
      design_id: order.design_id,
    }),
    {
      active: args.active,
      updated_at: new Date().toISOString(),
    }
  );
}

async function paymentIntentFromDispute(dispute: any) {
  const direct = asId(dispute?.payment_intent as any);
  if (direct) return direct;

  const chargeId = asId(dispute?.charge as any);
  if (!chargeId) return null;

  const charge: any = await stripe.charges.retrieve(chargeId);
  return asId(charge?.payment_intent as any);
}

async function processFullRefund(charge: any) {
  if (!charge?.refunded) return;

  const paymentIntentId = asId(charge?.payment_intent as any);
  if (!paymentIntentId) return;

  await setOneoffAccessByPaymentIntent({
    paymentIntentId,
    active: false,
    paymentStatus: "refunded",
  });
}

async function processDisputeCreated(dispute: any) {
  const paymentIntentId = await paymentIntentFromDispute(dispute);
  if (!paymentIntentId) return;

  await setOneoffAccessByPaymentIntent({
    paymentIntentId,
    active: false,
    paymentStatus: "disputed",
  });
}

async function processDisputeClosed(dispute: any) {
  const paymentIntentId = await paymentIntentFromDispute(dispute);
  if (!paymentIntentId) return;

  const chargeId = asId(dispute?.charge as any);
  let fullyRefunded = false;
  if (chargeId) {
    const charge: any = await stripe.charges.retrieve(chargeId);
    fullyRefunded = !!charge?.refunded;
  }

  const restore = dispute?.status === "won" && !fullyRefunded;
  await setOneoffAccessByPaymentIntent({
    paymentIntentId,
    active: restore,
    paymentStatus: restore ? "paid" : "disputed",
  });
}

async function processCheckoutCompleted(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  const plan = md.plan as CommercePlan | undefined;

  if (!userId || !plan) {
    throw new Error("Checkout session missing required commerce metadata");
  }

  await recordOrder(session);

  const paymentAccepted =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!paymentAccepted) {
    // Never grant an entitlement merely because Checkout reached "completed".
    // If asynchronous methods are enabled later, async_payment_succeeded will
    // re-enter this handler with an accepted payment status.
    return;
  }

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

  const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);

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

async function processSubscriptionChange(subscription: any) {
  const md = subscription?.metadata || {};
  const userId = md.user_id;
  const plan = md.plan as Exclude<CommercePlan, "oneoff"> | undefined;

  if (!userId || !plan || (plan !== "maker" && plan !== "commercial")) {
    return;
  }

  await createOrUpdateSubscriptionEntitlement({
    userId,
    plan,
    customerId: asId(subscription?.customer as any),
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

  try {
    const rows = await restSelect<StripeEventRow>(
      "stripe_events",
      selectOneParams({ event_id: event.id }, "event_id")
    );

    if (rows[0]?.event_id) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await processCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "checkout.session.async_payment_failed":
        await recordOrder(event.data.object as Stripe.Checkout.Session);
        break;

      case "charge.refunded":
        await processFullRefund(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.created":
        await processDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case "charge.dispute.closed":
        await processDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await processSubscriptionChange(event.data.object as any);
        break;

      default:
        break;
    }

    await restInsert("stripe_events", {
      event_id: event.id,
      event_type: event.type,
    });

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
  return new NextResponse("Method not allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
