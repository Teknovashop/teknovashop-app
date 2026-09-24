import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ ok: false, error: "AUTH_REQUIRED" }, 401);
  }

  const sessionId = new URL(req.url).searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return json({ ok: false, error: "SESSION_REQUIRED" }, 400);
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return json({ ok: false, error: "STRIPE_SECRET_KEY not set" }, 500);
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owner = session.metadata?.user_id || session.client_reference_id;

    if (!owner || owner !== user.id) {
      return json({ ok: false, error: "SESSION_NOT_OWNED" }, 403);
    }

    const plan = session.metadata?.plan || null;
    const designId = session.metadata?.design_id || null;
    const paymentAccepted =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    return json({
      ok: true,
      verified: true,
      complete: session.status === "complete" && paymentAccepted,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      plan,
      designId,
    });
  } catch (err: any) {
    console.error("checkout:session verification error", err);
    return json(
      { ok: false, error: err?.message || "SESSION_VERIFICATION_FAILED" },
      400
    );
  }
}
