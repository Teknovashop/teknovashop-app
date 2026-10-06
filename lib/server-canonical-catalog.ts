import "server-only";

import type { CanonicalProduct } from "@/lib/canonical-catalog";
import { withPremiumStudio } from "@/lib/catalog-studio-assets";

const BACKEND = (
  process.env.FORGE_API_URL ||
  process.env.NEXT_PUBLIC_FORGE_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://teknovashop-forge.onrender.com"
).replace(/\/+$/, "");

export async function getCanonicalProduct(
  slug: string
): Promise<CanonicalProduct | null> {
  try {
    const response = await fetch(
      `${BACKEND}/catalog/products/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`CATALOG_${response.status}`);
    return withPremiumStudio(await response.json());
  } catch {
    return null;
  }
}
