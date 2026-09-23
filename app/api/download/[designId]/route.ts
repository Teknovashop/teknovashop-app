import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { designId: string } }
) {
  return NextResponse.json({
    ok: true,
    designId: params.designId,
  });
}
