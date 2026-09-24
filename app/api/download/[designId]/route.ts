import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { selectEntitlement } from "@/lib/commerce-policy";
import { claimDesign } from "@/lib/server/designs";

import type { CommercePlan } from "@/lib/commerce";
import { buildLicenseText } from "@/lib/server/license";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { buildZip } from "@/lib/server/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ designId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const { designId: rawDesignId } = await params;
  const designId = String(rawDesignId || "").trim();
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

  const designRow = design as unknown as DownloadDesignRow;

  if (designRow.user_id && designRow.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "DESIGN_NOT_OWNED" },
      { status: 403 }
    );
  }

  const { data: rows, error: entitlementError } = await admin
    .from("entitlements")
    .select(
      "id,kind,plan,design_id,active,starts_at,expires_at,terms_version,license_version"
    )
    .eq("user_id", user.id)
    .eq("active", true);

  if (entitlementError) {
    return NextResponse.json(
      { ok: false, error: "LICENSE_CHECK_UNAVAILABLE" },
      { status: 500 }
    );
  }

  const entitlement = selectEntitlement(rows || [], designId);

  if (!entitlement) {
    return NextResponse.json(
      { ok: false, error: "PAYMENT_REQUIRED" },
      { status: 402 }
    );
  }

  if (!designRow.user_id) {
    if (!(await claimDesign(admin, designId, user.id))) {
      return NextResponse.json(
        { ok: false, error: "DESIGN_NOT_OWNED" },
        { status: 403 }
      );
    }
  }

  const stlDownload = await admin.storage.from(BUCKET).download(designRow.stl_path);
  if (stlDownload.error || !stlDownload.data) {
    return NextResponse.json(
      { ok: false, error: "STL_STORAGE_ERROR" },
      { status: 500 }
    );
  }

  const manifestDownload = await admin.storage
    .from(BUCKET)
    .download(designRow.manifest_path);
  if (manifestDownload.error || !manifestDownload.data) {
    return NextResponse.json(
      { ok: false, error: "MANIFEST_STORAGE_ERROR" },
      { status: 500 }
    );
  }

  const stl = Buffer.from(await stlDownload.data.arrayBuffer());
  const manifest = Buffer.from(await manifestDownload.data.arrayBuffer());
  if (createHash("sha256").update(stl).digest("hex") !== designRow.sha256) {
    return NextResponse.json(
      { ok: false, error: "ARTIFACT_INTEGRITY_ERROR" },
      { status: 502 }
    );
  }

  let manifestData;
  try {
    manifestData = JSON.parse(manifest.toString("utf8"));
  } catch {
    manifestData = null;
  }
  if (manifestData?.design_id !== designId || manifestData?.artifact?.sha256 !== designRow.sha256) {
    return NextResponse.json(
      { ok: false, error: "MANIFEST_INTEGRITY_ERROR" },
      { status: 502 }
    );
  }
  const plan = entitlement.plan as CommercePlan;

  const license = buildLicenseText({
    plan,
    designId,
    productName: designRow.product_name,
    productVersion: designRow.product_version,
    sha256: designRow.sha256,
  });

  const readme = [
    "TEKNOVASHOP FORGE — DESIGN PACKAGE",
    "",
    `Product: ${designRow.product_name}`,
    `Product version: ${designRow.product_version}`,
    `Product stage: ${designRow.product_stage}`,
    `Design ID: ${designRow.id}`,
    `Generated at: ${designRow.generated_at}`,
    `Units: millimetres (mm)`,
    `STL SHA-256: ${designRow.sha256}`,
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
    safeFilePart(designRow.product_slug || designRow.product_name) || "teknovashop-design";
  const shortId = designRow.id.slice(0, 10);

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
    design_id: designRow.id,
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
}