import { describe, expect, it } from "vitest";
import {
  forgeV2Capabilities,
  isForgeV2Product,
} from "@/lib/forge-v2/capabilities";
import { toHubProduct, type CanonicalProduct } from "@/lib/canonical-catalog";

describe("Forge V2 canonical catalog architecture", () => {
  it("uses backend existence checks instead of a local 72-product registry", () => {
    expect(isForgeV2Product("future-product-73")).toBe(true);
    expect(forgeV2Capabilities("future-product-73").dimensions).toBe(true);
    expect(forgeV2Capabilities("future-product-73").text).toBe(true);
  });

  it("keeps advanced operations opt-in by geometry family", () => {
    expect(forgeV2Capabilities("vesa-adapter").holes).toBe(true);
    expect(forgeV2Capabilities("cable-tray").vents).toEqual(["linear", "hex"]);
    expect(forgeV2Capabilities("perforated-mount-plate").cutouts).toBe(true);

    expect(forgeV2Capabilities("headset-stand").holes).toBeUndefined();
    expect(forgeV2Capabilities("headset-stand").dimensions).toBe(true);
  });

  it("adapts canonical backend products into the UI without a duplicate registry", () => {
    const canonical: CanonicalProduct = {
      slug: "future-product-73",
      name: "Future Product",
      family: "Maker",
      description: "Canonical product",
      tips: ["Validate"],
      marketing_image: null,
      visual_source: "generated_preview",
      version: "1.0.0-beta.1",
      stage: "engineering",
      public: false,
      builder: "future_product_73",
      capabilities: { text: true },
      v2_capabilities: ["hole"],
      defaults: { width: 100 },
      variant: { width: 120 },
      min_extents: [80, 40, 4],
    };

    const model = toHubProduct(canonical);
    expect(model.slug).toBe("future-product-73");
    expect(model.stage).toBe("engineering");
    expect(model.thumbnail).toContain("/api/catalog/thumbnail/future-product-73");
    expect(model.v2Capabilities).toEqual(["hole"]);
  });
});
