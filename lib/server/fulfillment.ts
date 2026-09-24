import type Stripe from "stripe";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/commerce";
import { checkoutIsPaid, isCommercePlan } from "@/lib/commerce-policy";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getStripe } from "@/lib/server/stripe";

const idOf = (value: any): string | null => typeof value === "string" ? value : value?.id || null;

async function saveEntitlement(filters: Record<string, string>, row: Record<string, any>) {
  const db = getSupabaseAdmin();
  async function existing() {
    let query = db.from("entitlements").select("id");
    for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }

  let found = await existing();
  if (!found) {
    const { error } = await db.from("entitlements").insert(row);
    if (!error) return;
    if (error.code !== "23505") throw error;
    found = await existing();
    if (!found) throw error;
  }

  const { error } = await db.from("entitlements").update(row).eq("id", found.id);
  if (error) throw error;
}

export async function syncSubscription(subscriptionId: string, sessionId?: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const md = subscription.metadata;
  if (!md.user_id || (md.plan !== "maker" && md.plan !== "commercial")) return;

  await saveEntitlement({ stripe_subscription_id: subscription.id }, {
    user_id: md.user_id,
    kind: "subscription",
    plan: md.plan,
    design_id: null,
    active: subscription.status === "active" || subscription.status === "trialing",
    starts_at: new Date(subscription.start_date * 1000).toISOString(),
    expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
    stripe_subscription_id: subscription.id,
    stripe_customer_id: idOf(subscription.customer),
    ...(sessionId ? { stripe_checkout_session_id: sessionId } : {}),
    terms_version: md.terms_version || TERMS_VERSION,
    license_version: md.license_version || LICENSE_VERSION,
    updated_at: new Date().toISOString(),
  });
}

export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  if (!checkoutIsPaid(session)) return false;

  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  if (!userId || !isCommercePlan(md.plan)) throw new Error("INVALID_COMMERCE_METADATA");
  if (md.plan === "oneoff" && !md.design_id) throw new Error("DESIGN_REQUIRED");

  const db = getSupabaseAdmin();

  if (md.plan === "oneoff" && session.payment_intent) {
    const payment = await getStripe().paymentIntents.retrieve(idOf(session.payment_intent)!, { expand: ["latest_charge"] });
    const charge = typeof payment.latest_charge === "object" ? payment.latest_charge : null;
    if (payment.status !== "succeeded" || charge?.refunded || charge?.disputed) return false;
  }

  if (md.plan === "oneoff") {
    const { data: design, error } = await db.from("designs").select("user_id").eq("id", md.design_id).maybeSingle();
    if (error || !design || design.user_id !== userId) throw new Error("DESIGN_OWNERSHIP_MISMATCH");
  }

  const { error } = await db.from("orders").upsert({
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: idOf(session.payment_intent),
    stripe_customer_id: idOf(session.customer),
    stripe_subscription_id: idOf(session.subscription),
    mode: session.mode,
    plan: md.plan,
    design_id: md.design_id || null,
    product_slug: md.product_slug || null,
    amount_total: session.amount_total,
    currency: session.currency,
    payment_status: session.payment_status,
    terms_version: md.terms_version || TERMS_VERSION,
    license_version: md.license_version || LICENSE_VERSION,
  }, { onConflict: "stripe_checkout_session_id" });
  if (error) throw error;

  if (md.plan === "oneoff") {
    await saveEntitlement({ user_id: userId, kind: "design", design_id: md.design_id }, {
      user_id: userId,
      kind: "design",
      plan: "oneoff",
      design_id: md.design_id,
      active: true,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: idOf(session.customer),
      starts_at: new Date().toISOString(),
      expires_at: null,
      terms_version: md.terms_version || TERMS_VERSION,
      license_version: md.license_version || LICENSE_VERSION,
      updated_at: new Date().toISOString(),
    });
  } else {
    const subId = idOf(session.subscription);
    if (!subId) throw new Error("SUBSCRIPTION_REQUIRED");
    await syncSubscription(subId, session.id);
  }

  return true;
}

export async function revokeRefundedDesign(paymentIntentId: string) {
  const db = getSupabaseAdmin();
  const { data: orders, error } = await db.from("orders").select("user_id,design_id,plan").eq("stripe_payment_intent_id", paymentIntentId);
  if (error) throw error;

  const update = await db.from("orders").update({ payment_status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
  if (update.error) throw update.error;

  for (const order of orders || []) {
    if (order.plan !== "oneoff" || !order.design_id) continue;
    const remaining = await db.from("orders").select("id").eq("user_id", order.user_id).eq("design_id", order.design_id).in("payment_status", ["paid", "no_payment_required"]).limit(1);
    if (remaining.error) throw remaining.error;
    if (remaining.data?.length) continue;

    const revoke = await db.from("entitlements").update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", order.user_id).eq("kind", "design").eq("design_id", order.design_id);
    if (revoke.error) throw revoke.error;
  }
}