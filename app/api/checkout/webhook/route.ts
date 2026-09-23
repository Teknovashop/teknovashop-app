// teknovashop-app/app/api/checkout/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";          // ⚠️ importante: Node runtime
export const dynamic = "force-dynamic";   // no cache

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

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

  const processedRow = alreadyProcessed as unknown as { event_id: string } | null;
  if (processedRow?.event_id) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Aquí registrarías la licencia/pedido en tu sistema (Supabase o backend en Render).
        // Si prefieres centralizar en tu backend, descomenta este fetch:
        /*
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/webhook/stripe`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-internal-token": process.env.INTERNAL_WEBHOOK_TOKEN || "" },
          body: JSON.stringify(session),
        });
        */

        console.log("✔ checkout.session.completed", {
          id: session.id,
          email: session.customer_details?.email || session.customer_email,
          mode: session.mode,
          metadata: session.metadata,
        });
        break;
      }
      default:
        // otros eventos que no manejamos de momento
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ received: true }, { status: 500 });
  }

  await admin.from("stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

// Opcional: healthcheck
export async function GET() {
  return NextResponse.json({ ok: true });
}
