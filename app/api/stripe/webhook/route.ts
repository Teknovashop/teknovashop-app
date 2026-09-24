import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function disabled() {
  return NextResponse.json(
    {
      ok: false,
      error: "LEGACY_ENDPOINT_DISABLED",
      detail: "Use /api/checkout/webhook as the only Stripe webhook endpoint.",
    },
    { status: 410 }
  );
}

export async function GET() {
  return disabled();
}

export async function POST() {
  return disabled();
}
