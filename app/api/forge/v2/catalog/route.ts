import { NextResponse } from "next/server";
import { withPremiumStudio } from "@/lib/catalog-studio-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const upstream = new URL(`${BACKEND}/catalog/products`);
    for (const key of ["stage", "public_only"]) {
      const value = requestUrl.searchParams.get(key);
      if (value) upstream.searchParams.set(key, value);
    }

    const response = await fetch(upstream.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (response.ok && Array.isArray(data.products)) {
      data.products = data.products.map(withPremiumStudio);
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "FORGE_CATALOG_UNAVAILABLE",
        detail: error?.message || String(error),
      },
      { status: 502 }
    );
  }
}
