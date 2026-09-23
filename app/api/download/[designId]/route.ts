import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { CommercePlan } from "@/lib/commerce";
import { buildLicenseText } from "@/lib/server/license";
import { buildZip } from "@/lib/server/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

type DownloadDesignRow = {
  id: string;
  user_id: string | null;
  product_slug: string;
  product_name: string;
  product_version: string;
  product_stage: string;
  stl_path: string;
  manifest_path: string;
  sha256: string;
  generated_at: string;
};

type EntitlementRow = {
  id: string;
  kind: "design" | "subscription";
  plan: CommercePlan;
  design_id: string | null;
  active: boolean;
  expires_at: string | null;
  terms_version: string;
  license_version: string;
};

function assertSupabaseServerConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration missing");
  }
}

function restHeaders(extra?: Record<string, string>) {
  assertSupabaseServerConfig();
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function restSelect<T>(
  table: string,
  params: URLSearchParams
): Promise<T[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
    {
      method: "GET",
      headers: restHeaders(),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Supabase SELECT ${table} failed: ${res.status} ${await res.text()}`
    );
  }

  const json = await res.json();
  return Array.isArray(json) ? (json as T[]) : [];
}

async function restInsert(table: string, row: Record<string, any>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Supabase INSERT ${table} failed: ${res.status} ${await res.text()}`
    );
  }
}

async function restUpdate(
  table: string,
  params: URLSearchParams,
  row: Record<string, any>
) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
    {
      method: "PATCH",
      headers: restHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Supabase UPDATE ${table} failed: ${res.status} ${await res.text()}`
    );
  }
}

function eqParams(
  filters: Record<string, string>,
  select = "*",
  limit?: number
) {
  const params = new URLSearchParams();
  params.set("select", select);
  if (limit) params.set("limit", String(limit));
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  return params;
}

function isCurrent(row: EntitlementRow) {
  if (!row.active) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function downloadStorageObject(path: string) {
  assertSupabaseServerConfig();

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${encodeStoragePath(path)}`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Storage download failed: ${res.status} ${await res.text()}`
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function GET(
  _req: Request,
  { params }: { params: { designId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const designId = String(params.designId || "").trim();
  if (!designId) {
    return NextResponse.json(
      { ok: false, error: "DESIGN_REQUIRED" },
      { status: 400 }
    );
  }

  try {
    const designs = await restSelect<DownloadDesignRow>(
      "designs",
      eqParams(
        { id: designId },
        "id,user_id,product_slug,product_name,product_version,product_stage,stl_path,manifest_path,sha256,generated_at",
        1
      )
    );

    const design = designs[0] || null;
    if (!design) {
      return NextResponse.json(
        { ok: false, error: "DESIGN_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (design.user_id && design.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "DESIGN_NOT_OWNED" },
        { status: 403 }
      );
    }

    const entitlements = await restSelect<EntitlementRow>(
      "entitlements",
      eqParams(
        {
          user_id: user.id,
          active: "true",
        },
        "id,kind,plan,design_id,active,expires_at,terms_version,license_version"
      )
    );

    const current = entitlements.filter(isCurrent);
    const entitlement =
      current.find(
        (x) => x.kind === "design" && x.design_id === designId
      ) ||
      current.find((x) => x.kind === "subscription");

    if (!entitlement) {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_REQUIRED" },
        { status: 402 }
      );
    }

    if (!design.user_id) {
      await restUpdate(
        "designs",
        eqParams({ id: designId }, "id"),
        { user_id: user.id }
      );
      design.user_id = user.id;
    }

    const [stl, manifest] = await Promise.all([
      downloadStorageObject(design.stl_path),
      downloadStorageObject(design.manifest_path),
    ]);

    const plan = entitlement.plan as CommercePlan;

    const license = buildLicenseText({
      plan,
      designId,
      productName: design.product_name,
      productVersion: design.product_version,
      sha256: design.sha256,
    });

    const readme = [
      "TEKNOVASHOP FORGE — DESIGN PACKAGE",
      "",
      `Product: ${design.product_name}`,
      `Product version: ${design.product_version}`,
      `Product stage: ${design.product_stage}`,
      `Design ID: ${design.id}`,
      `Generated at: ${design.generated_at}`,
      "Units: millimetres (mm)",
      `STL SHA-256: ${design.sha256}`,
      `License tier: ${plan}`,
      "",
      "PACKAGE CONTENTS",
      "- STL: printable geometry",
      "- design-manifest.json: reproducibility and traceability data",
      "- LICENSE.txt: portable license summary for this download",
      "- README.txt: package overview",
      "",
      "Verify dimensions and slicer settings before manufacturing.",
      "",
    ].join("\n");

    const base =
      safeFilePart(design.product_slug || design.product_name) ||
      "teknovashop-design";
    const shortId = design.id.slice(0, 10);

    const zip = buildZip([
      {
        name: `${base}-${shortId}.stl`,
        data: stl,
      },
      {
        name: "design-manifest.json",
        data: manifest,
      },
      {
        name: "LICENSE.txt",
        data: Buffer.from(license, "utf8"),
      },
      {
        name: "README.txt",
        data: Buffer.from(readme, "utf8"),
      },
    ]);

    await restInsert("download_events", {
      user_id: user.id,
      design_id: design.id,
      entitlement_id: entitlement.id,
    });

    return new Response(new Uint8Array(zip), {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${base}-${shortId}.zip"`,
        "content-length": String(zip.length),
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("licensed download failed", designId, err);
    return NextResponse.json(
      {
        ok: false,
        error: "DOWNLOAD_FAILED",
        detail: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
