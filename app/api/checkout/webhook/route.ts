// app/api/checkout/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbInsert(table: string, values: any) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type":"application/json", Prefer:"return=minimal" },
    body: JSON.stringify(values),
    cache: "no-store",
  });
  if (!r.ok) console.error("Supabase insert error", table, await r.text());
}

export async function POST(req: Request) {
  const raw = await req.arrayBuffer();
  const sig = req.headers.get("stripe-signature") || "";
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(raw), sig, endpointSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const email = s.customer_details?.email || s.customer_email || "";
      const isSub = s.mode === "subscription";
      const priceId = (s.line_items?.data?.[0]?.price?.id) || "";
      const md = s.metadata || {};
      await sbInsert("orders", {
        session_id: s.id,
        email, model_kind: md.model_kind, params: md.params, object_key: md.object_key || null,
        price_cents: s.amount_total || null, status: "paid",
      });

      const kind =
        isSub && priceId === process.env.STRIPE_PRICE_COMMERCIAL ? "commercial" :
        isSub ? "maker_sub" : "personal";

      await sbInsert("licenses", { email, kind, session_id: s.id, object_key: md.object_key || null });
    }

    if (event.type === "customer.subscription.deleted") {
      // opcional: marcar licencia maker_sub como expirada
    }
  } catch(e:any) {
    console.error("Webhook handler error", e);
  }

  return NextResponse.json({ received: true });
}
