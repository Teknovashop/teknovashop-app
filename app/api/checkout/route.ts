import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "LEGACY_ENDPOINT_DISABLED",
      detail: "Use the entitlement-gated Teknovashop Forge commerce flow.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "LEGACY_ENDPOINT_DISABLED",
      detail: "Use /api/checkout/create-session or /api/download/[designId].",
    },
    { status: 410 }
  );
}
