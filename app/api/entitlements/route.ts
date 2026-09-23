import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isCurrent(row: any) {
  if (!row?.active) return false;
  if (!row?.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const designId = searchParams.get("design_id") || undefined;

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({
      ok: true,
      authenticated: false,
      hasAccess: false,
      reason: "anon",
    });
  }

  const { data: rows, error } = await supabase
    .from("entitlements")
    .select(
      "id,kind,plan,design_id,active,starts_at,expires_at,terms_version,license_version"
    )
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  const activeRows = (rows || []).filter(isCurrent);
  const subscription = activeRows.find((x: any) => x.kind === "subscription");

  if (subscription) {
    return json({
      ok: true,
      authenticated: true,
      hasAccess: true,
      via: "subscription",
      plan: subscription.plan,
      entitlementId: subscription.id,
      expiresAt: subscription.expires_at,
      termsVersion: subscription.terms_version,
      licenseVersion: subscription.license_version,
    });
  }

  if (!designId) {
    return json({
      ok: true,
      authenticated: true,
      hasAccess: false,
      reason: "no_design",
    });
  }

  const designEntitlement = activeRows.find(
    (x: any) => x.kind === "design" && x.design_id === designId
  );

  return json({
    ok: true,
    authenticated: true,
    hasAccess: !!designEntitlement,
    via: designEntitlement ? "oneoff" : undefined,
    plan: designEntitlement?.plan,
    entitlementId: designEntitlement?.id,
    termsVersion: designEntitlement?.terms_version,
    licenseVersion: designEntitlement?.license_version,
  });
}
