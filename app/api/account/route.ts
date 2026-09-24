import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ ok: false, authenticated: false, error: "AUTH_REQUIRED" }, 401);
  }

  const [ordersResult, entitlementsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,plan,mode,design_id,product_slug,amount_total,currency,payment_status,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("entitlements")
      .select(
        "id,kind,plan,design_id,active,starts_at,expires_at,terms_version,license_version,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (ordersResult.error) {
    return json({ ok: false, error: ordersResult.error.message }, 500);
  }
  if (entitlementsResult.error) {
    return json({ ok: false, error: entitlementsResult.error.message }, 500);
  }

  return json({
    ok: true,
    authenticated: true,
    email: user.email || null,
    orders: ordersResult.data || [],
    entitlements: entitlementsResult.data || [],
  });
}
