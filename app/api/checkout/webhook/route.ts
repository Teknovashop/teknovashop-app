import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { fulfillCheckout, revokeRefundedDesign, syncSubscription } from "@/lib/server/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "SIGNATURE_REQUIRED" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    const db = getSupabaseAdmin();
    const recorded = await db.from("stripe_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (recorded.error) throw recorded.error;
    if (recorded.data) return NextResponse.json({ received: true, duplicate: true });

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = await getStripe().checkout.sessions.retrieve(event.data.object.id);
        await fulfillCheckout(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const subscription = event.data.object.subscription;
        if (subscription) await syncSubscription(typeof subscription === "string" ? subscription : subscription.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        if (charge.refunded && charge.payment_intent) {
          await revokeRefundedDesign(typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id);
        }
        break;
      }
    }

    const saved = await db.from("stripe_events").upsert({ event_id: event.id, event_type: event.type }, { onConflict: "event_id", ignoreDuplicates: true });
    if (saved.error) throw saved.error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", event.id, event.type, error);
    return NextResponse.json({ received: false, error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}