// app/api/forge/generate/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND = (
  process.env.FORGE_API_URL ||
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
type ExistingDesignRow = {
  id: string;
  user_id: string | null;
};

function serverRestHeaders(extra?: Record<string, string>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration missing");
  }
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function getExistingDesign(designId: string): Promise<ExistingDesignRow | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const params = new URLSearchParams();
  params.set("select", "id,user_id");
  params.set("id", `eq.${designId}`);
  params.set("limit", "1");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/designs?${params.toString()}`,
    {
      method: "GET",
      headers: serverRestHeaders(),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Design lookup failed: ${res.status} ${await res.text()}`
    );
  }

  const rows = await res.json();
  return Array.isArray(rows) && rows.length
    ? (rows[0] as ExistingDesignRow)
    : null;
}

async function saveDesign(
  designId: string,
  row: Record<string, any>,
  exists: boolean
) {
  const params = new URLSearchParams();
  params.set("id", `eq.${designId}`);

  const res = await fetch(
    exists
      ? `${SUPABASE_URL}/rest/v1/designs?${params.toString()}`
      : `${SUPABASE_URL}/rest/v1/designs`,
    {
      method: exists ? "PATCH" : "POST",
      headers: serverRestHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Design save failed: ${res.status} ${await res.text()}`
    );
  }
}

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
    preview_path: data?.preview_path,
    preview_precision_mm: data?.preview_precision_mm,
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

  if (!designId || !stlPath || !manifestPath || sha256.length !== 64) {
    throw new Error("Backend response is missing traceability metadata");
  }

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration missing");
  }

  const existingRow = await getExistingDesign(designId);

  if (existingRow?.user_id && userId && existingRow.user_id !== userId) {
    throw new Error("Design identifier is already linked to another account");
  }

  const row = {
    id: designId,
    user_id: existingRow?.user_id || userId,
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

  await saveDesign(designId, row, !!existingRow?.id);
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

  // Never trust x-user-id or user_id supplied by the browser. If a user is
  // authenticated, derive identity from the signed Supabase session cookie.
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
      signal: AbortSignal.timeout(55000),
    });
  } catch (e: any) {
    const message = e?.message || String(e);
    const timedOut =
      e?.name === "TimeoutError" ||
      e?.name === "AbortError" ||
      /timeout|aborted/i.test(message);

    return json(
      {
        ok: false,
        error: timedOut
          ? "El motor 3D no ha respondido a tiempo"
          : "No se ha podido conectar con el motor 3D",
        code: timedOut ? "FORGE_TIMEOUT" : "FORGE_UNREACHABLE",
        detail: timedOut
          ? "El servicio de generación puede estar arrancando. Vuelve a intentarlo en unos segundos."
          : message,
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

  try {
    await registerDesign({
      req,
      slug,
      params,
      data,
    });
  } catch (e: any) {
    console.error("design registration failed", data?.design_id, e);
    return json(
      {
        ok: false,
        error: "DESIGN_REGISTRATION_FAILED",
        detail:
          "El diseño se ha generado, pero no se ha podido registrar de forma trazable. No se habilita la compra ni la vista previa.",
      },
      503
    );
  }

  if (data?.preview_url) {
    return json({
      ok: true,
      url: data.preview_url,
      preview_url: data.preview_url,
      preview_path: data.preview_path,
      preview_precision_mm: data.preview_precision_mm,
      path: data.path,
      slug: data.slug || slug,
      source: "backend-degraded-preview",
      ...traceMeta(data),
    });
  }

  return json(
    {
      ok: false,
      error: "SAFE_PREVIEW_MISSING",
      detail:
        "The Forge backend did not return a degraded preview. Final manufacturing artifacts are never signed for browser access.",
      backendResponse: {
        ok: data?.ok,
        slug: data?.slug,
        design_id: data?.design_id,
        path: data?.path,
        manifest_path: data?.manifest_path,
      },
    },
    502
  );
}
