import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FORGE_V2_PILOTS } from "@/lib/forge-v2/capabilities";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function authenticated() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticated();
  if (!user) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);

  const { data, error } = await supabase
    .from("design_drafts")
    .select("id,name,product_slug,engine_version,schema_version,product_version,params,operations,text_ops,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) return json({ ok: false, error: "DRAFTS_UNAVAILABLE" }, 500);
  return json({ ok: true, drafts: data || [] });
}

export async function POST(req: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);

  const body = await req.json().catch(() => null);
  const productSlug = String(body?.product_slug || "").trim().toLowerCase();
  if (!FORGE_V2_PILOTS[productSlug]) {
    return json({ ok: false, error: "PRODUCT_NOT_ENABLED" }, 400);
  }

  const name = String(body?.name || "Diseño sin nombre").trim().slice(0, 100);
  if (!name) return json({ ok: false, error: "NAME_REQUIRED" }, 400);

  const params = body?.params && typeof body.params === "object" && !Array.isArray(body.params)
    ? body.params : {};
  const operations = Array.isArray(body?.operations) ? body.operations.slice(0, 20) : [];
  const textOps = Array.isArray(body?.text_ops) ? body.text_ops.slice(0, 4) : [];

  const { data, error } = await supabase
    .from("design_drafts")
    .insert({
      user_id: user.id,
      name,
      product_slug: productSlug,
      engine_version: "mesh-v2",
      schema_version: 2,
      product_version: String(body?.product_version || "1.0.0-beta.1").slice(0, 80),
      params,
      operations,
      text_ops: textOps,
      updated_at: new Date().toISOString(),
    })
    .select("id,name,product_slug,engine_version,schema_version,product_version,params,operations,text_ops,created_at,updated_at")
    .single();

  if (error) return json({ ok: false, error: "DRAFT_SAVE_FAILED" }, 500);
  return json({ ok: true, draft: data }, 201);
}
