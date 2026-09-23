import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { CommercePlan } from "@/lib/commerce";
import { buildLicenseText } from "@/lib/server/license";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { buildZip } from "@/lib/server/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

function isCurrent(row: any) {
  if (!row?.active) return false;
  if (!row?.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

  const admin = getSupabaseAdmin();

  const { data: design, error: designError } = await admin
    .from("designs")
    .select(
      "id,user_id,product_slug,product_name,product_version,product_stage,stl_path,manifest_path,sha256,generated_at"
    )
    .eq("id", designId)
    .maybeSingle();

  if (designError || !design) {
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

  const { data: rows, error: entitlementError } = await admin
    .from("entitlements")
    .select(
      "id,kind,plan,design_id,active,expires_at,terms_version,license_version"
    )
    .eq("user_id", user.id)
    .eq("active", true);

  if (entitlementError) {
    return NextResponse.json(
      { ok: false, error: entitlementError.message },
      { status: 500 }
    );
  }

  const current = (rows || []).filter(isCurrent);
  const entitlement =
    current.find((x: any) => x.kind === "design" && x.design_id === designId) ||
    current.find((x: any) => x.kind === "subscription");

  if (!entitlement) {
    return NextResponse.json(
      { ok: false, error: "PAYMENT_REQUIRED" },
      { status: 402 }
    );
  }

  if (!design.user_id) {
    const { error: claimError } = await admin
      .from("designs")
      .update({ user_id: user.id })
      .eq("id", designId)
      .is("user_id", null);

    if (claimError) {
      return NextResponse.json(
        { ok: false, error: "DESIGN_CLAIM_FAILED" },
        { status: 500 }
      );
    }
  }

  const stlDownload = await admin.storage.from(BUCKET).download(design.stl_path);
  if (stlDownload.error || !stlDownload.data) {
    return NextResponse.json(
      { ok: false, error: "STL_STORAGE_ERROR" },
      { status: 500 }
    );
  }

  const manifestDownload = await admin.storage
    .from(BUCKET)
    .download(design.manifest_path);
  if (manifestDownload.error || !manifestDownload.data) {
    return NextResponse.json(
      { ok: false, error: "MANIFEST_STORAGE_ERROR" },
      { status: 500 }
    );
  }

  const stl = Buffer.from(await stlDownload.data.arrayBuffer());
  const manifest = Buffer.from(await manifestDownload.data.arrayBuffer());
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
    `Units: millimetres (mm)`,
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
    safeFilePart(design.product_slug || design.product_name) || "teknovashop-design";
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

  await admin.from("download_events").insert({
    user_id: user.id,
    design_id: design.id,
    entitlement_id: entitlement.id,
  });

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${base}-${shortId}.zip"`,
      "content-length": String(zip.length),
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}
