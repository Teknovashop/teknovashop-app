import type { ForgeModel } from "@/data/models";
import { withPremiumStudio } from "@/lib/catalog-studio-assets";

export type ProductStage = "engineering" | "visual_qa" | "production";

export type CanonicalProduct = {
  slug: string;
  name: string;
  family: string;
  description: string;
  tips: string[];
  marketing_image: string | null;
  visual_source: "studio_asset" | "generated_preview";
  version: string;
  stage: ProductStage;
  public: boolean;
  builder: string;
  capabilities: Record<string, boolean | string[]>;
  v2_capabilities: string[];
  defaults: Record<string, number | string | boolean>;
  variant: Record<string, number | string | boolean>;
  min_extents?: number[] | null;
};

export type CanonicalCatalogResponse = {
  count: number;
  total: number;
  products: CanonicalProduct[];
  stages?: Record<string, number>;
};

export type HubProduct = ForgeModel & {
  stage: ProductStage;
  public: boolean;
  version: string;
  v2Capabilities: string[];
  visualSource: CanonicalProduct["visual_source"];
};

export function toHubProduct(product: CanonicalProduct): HubProduct {
  product = withPremiumStudio(product);
  const thumbnail = product.marketing_image
    ? product.marketing_image.startsWith("/catalog/studio/")
      ? `/api/catalog/studio/${product.slug}`
      : product.marketing_image
    : `/api/catalog/thumbnail/${product.slug}`;

  return {
    id: product.slug,
    name: product.name,
    slug: product.slug,
    thumbnail,
    geometryThumbnail: `/api/catalog/thumbnail/${product.slug}`,
    stlPath: product.slug,
    family: product.family,
    description: product.description,
    tips: product.tips,
    isNew: product.stage !== "production",
    stage: product.stage,
    public: product.public,
    version: product.version,
    v2Capabilities: product.v2_capabilities || [],
    visualSource: product.visual_source,
  };
}

export async function fetchCanonicalCatalog(
  query = ""
): Promise<CanonicalCatalogResponse> {
  const response = await fetch(
    `/api/forge/v2/catalog${query ? `?${query}` : ""}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error("CATALOG_UNAVAILABLE");
  }
  return response.json();
}
