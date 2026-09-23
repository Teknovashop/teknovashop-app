// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

function json(body: any, status = 200) {
  return NextResponse.json(body, { status });
}

const n = (v: any): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const x = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(x) ? x : undefined;
};

type Dict = Record<string, any>;

function clampFillet(p: Dict) {
  const candidates = [
    n(p.thickness_mm),
    n(p.height_mm),
    n(p.width_mm),
    n(p.length_mm),
  ].filter((x) => typeof x === "number") as number[];

  const maxR = Math.max(
    0,
    Math.min(...(candidates.length ? candidates : [2])) / 2 - 0.05
  );
  const f = n(p.fillet_mm);
  p.fillet_mm =
    f == null
      ? Math.max(0, Math.min(2, maxR))
      : Math.max(0, Math.min(f, maxR));
}

function traceMeta(data: any) {
  return {
    design_id: data?.design_id,
    product_name: data?.product_name,
    product_version: data?.product_version,
    product_stage: data?.product_stage,
    generated_at: data?.generated_at,
    manifest_path: data?.manifest_path,
    manifest_signed_url: data?.manifest_signed_url,
    sha256: data?.sha256,
  };
}

async function registerDesign(args: {
  req: Request;
  slug: string;
  params: Dict;
  data: any;
}) {
  const designId = String(args.data?.design_id || "").trim();
  const stlPath = String(args.data?.path || args.data?.object_key || "").trim();
  const manifestPath = String(args.data?.manifest_path || "").trim();
  const sha256 = String(args.data?.sha256 || "").trim();

  if (!designId || !stlPath || !manifestPath || sha256.length !== 64) return;

  let userId: string | null = null;
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    userId = null;
  }

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("designs")
    .select("id,user_id")
    .eq("id", designId)
    .maybeSingle();

  if (existing?.user_id && userId && existing.user_id !== userId) {
    return;
  }

  const row = {
    id: designId,
    user_id: existing?.user_id || userId,
    product_slug: args.slug,
    product_name: String(args.data?.product_name || args.slug),
    product_version: String(args.data?.product_version || "unversioned"),
    product_stage: String(args.data?.product_stage || "unversioned"),
    parameters: args.params || {},
    stl_path: stlPath,
    manifest_path: manifestPath,
    sha256,
    generated_at: String(args.data?.generated_at || new Date().toISOString()),
  };

  const { error } = existing?.id
    ? await admin.from("designs").update(row).eq("id", designId)
    : await admin.from("designs").insert(row);

  if (error) {
    console.error("design registration failed", designId, error.message);
  }
}

function messageFrom(x: any): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (typeof x?.detail === "string") return x.detail;
  if (typeof x?.error === "string") return x.error;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const slug: string | undefined = body?.slug || body?.model;
  if (!slug) return json({ ok: false, error: "Missing 'slug'" }, 400);

  const params: Dict = { ...(body?.params || {}) };
  for (const k of Object.keys(params)) {
    const value = n(params[k]);
    if (value != null) params[k] = value;
  }
  clampFillet(params);

  const holes = Array.isArray(body?.holes) ? body.holes : [];
  const text_ops = Array.isArray(body?.text_ops) ? body.text_ops : [];
  const model = slug.replace(/-/g, "_");
  const userId =
    req.headers.get("x-user-id") ||
    (typeof body?.user_id === "string" ? body.user_id : "");

  let r: Response;
  try {
    r = await fetch(`${BACKEND}/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(userId ? { "x-user-id": userId } : {}),
      },
      body: JSON.stringify({
        slug,
        model,
        params,
        holes,
        text_ops,
        user_id: userId || null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: "Forge backend unreachable",
        detail: e?.message || String(e),
        backendUrl: BACKEND,
      },
      502
    );
  }

  const raw = await r.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!r.ok) {
    return json(
      {
        ok: false,
        error: messageFrom(data),
        backendStatus: r.status,
        backendUrl: BACKEND,
      },
      r.status
    );
  }

  await registerDesign({
    req,
    slug,
    params,
    data,
  });

  if (data?.signed_url) {
    return json({
      ok: true,
      url: data.signed_url,
      path: data.path,
      slug: data.slug || slug,
      source: "backend-signed",
      ...traceMeta(data),
    });
  }

  if (data?.stl_url) {
    return json({
      ok: true,
      url: data.stl_url,
      path: data.path,
      slug: data.slug || slug,
      source: "backend-public",
      ...traceMeta(data),
    });
  }

  if (data?.stl_data_url) {
    return json({
      ok: true,
      url: data.stl_data_url,
      slug: data.slug || slug,
      source: "data-url",
      ...traceMeta(data),
    });
  }

  const objectPath: string | undefined = data?.path || data?.object_key;
  if (!objectPath) {
    return json(
      {
        ok: false,
        error: "Backend generated no downloadable STL URL or path",
        backendResponse: data,
      },
      502
    );
  }

  const key = SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) {
    return json(
      {
        ok: false,
        error:
          "Backend returned only a storage path, but Supabase signing is not configured in Vercel",
        objectPath,
      },
      500
    );
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, key);
    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 60 * 5);

    if (signed.error || !signed.data?.signedUrl) {
      return json(
        {
          ok: false,
          error: signed.error?.message || "Failed to sign STL URL",
        },
        500
      );
    }

    return json({
      ok: true,
      url: signed.data.signedUrl,
      object_key: objectPath,
      slug: data.slug || slug,
      source: "signed-in-vercel",
      ...traceMeta(data),
    });
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: "Supabase signing failed",
        detail: e?.message || String(e),
      },
      500
    );
  }
}
