import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { checkoutIsPaid } from "@/lib/commerce-policy";
import { fulfillCheckout } from "@/lib/server/fulfillment";
import { getStripe } from "@/lib/server/stripe";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  const sessionId = new URL(req.url).searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ ok: false, error: "SESSION_REQUIRED" }, { status: 400 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const owner = session.metadata?.user_id || session.client_reference_id;
    if (owner !== user.id) return NextResponse.json({ ok: false, error: "SESSION_NOT_FOUND" }, { status: 404 });
    if (!checkoutIsPaid(session)) return NextResponse.json({ ok: true, ready: false, paid: false });

    await fulfillCheckout(session);
    const { data, error } = await getSupabaseAdmin()
      .from("entitlements")
      .select("*")
      .eq("user_id", user.id)
      .eq("stripe_checkout_session_id", session.id);
    if (error) throw error;

    const entitlement = data?.[0];
    return NextResponse.json({
      ok: true,
      ready: Boolean(entitlement),
      paid: true,
      plan: session.metadata?.plan || entitlement?.plan || null,
      designId: session.metadata?.design_id || entitlement?.design_id || null,
    });
  } catch (error) {
    console.error("checkout:status error", error);
    return NextResponse.json({ ok: false, error: "CHECKOUT_STATUS_UNAVAILABLE" }, { status: 500 });
  }
}