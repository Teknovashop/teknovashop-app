import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PREMIUM_STUDIO_SLUGS, premiumStudioImage, withPremiumStudio } from "@/lib/catalog-studio-assets";
import { toHubProduct, type CanonicalProduct } from "@/lib/canonical-catalog";

describe("premium catalog rollout", () => {
  it("ships all 54 distinct WebP assets with no missing or unregistered files", () => {
    const directory = join(process.cwd(), "public/images/products/premium-v1");
    expect(PREMIUM_STUDIO_SLUGS).toHaveLength(54);
    expect(new Set(PREMIUM_STUDIO_SLUGS).size).toBe(54);
    expect(readdirSync(directory).sort()).toEqual(PREMIUM_STUDIO_SLUGS.map(slug => `${slug}.webp`).sort());
    const hashes = new Set<string>();
    for (const slug of PREMIUM_STUDIO_SLUGS) {
      const bytes = readFileSync(join(directory, `${slug}.webp`));
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      expect(bytes.length).toBeGreaterThan(10000);
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
    }
    expect(hashes.size).toBe(54);
  });

  it("changes only marketing media, preserving engineering state and CAD contracts", () => {
    const source: CanonicalProduct = {
      slug: "vertical-laptop-dock", name: "Dock", family: "desk", description: "Dock", tips: [],
      marketing_image: "/catalog/studio/engineering/vertical-laptop-dock.webp", visual_source: "studio_asset",
      version: "1.0", stage: "engineering", public: false, builder: "vertical_laptop_dock",
      capabilities: { stl: true }, v2_capabilities: ["preview", "stl"],
      defaults: { width: 160 }, variant: { width: 180 }, min_extents: [100, 40, 20],
    };
    const updated = withPremiumStudio(source);
    expect(updated).toEqual({ ...source, marketing_image: premiumStudioImage(source.slug), visual_source: "studio_asset" });
    expect(source.marketing_image).toContain("/engineering/");
    const hub = toHubProduct(source);
    expect(hub.thumbnail).toBe(premiumStudioImage(source.slug));
    expect(hub.geometryThumbnail).toBe("/api/catalog/thumbnail/vertical-laptop-dock");
    expect(hub.stlPath).toBe(source.slug);
    expect(hub.stage).toBe("engineering");
    expect(hub.public).toBe(false);
    expect(hub.v2Capabilities).toEqual(source.v2_capabilities);
  });

  it("leaves existing studio images and future products unchanged", () => {
    const directory = join(process.cwd(), "public/images/products/professional");
    const existing = readdirSync(directory).filter(file => file.endsWith(".webp"));
    expect(existing).toHaveLength(18);
    for (const file of existing) {
      const slug = file.replace(/\.webp$/, "");
      const source = { slug, marketing_image: `/images/products/professional/${file}`, visual_source: "studio_asset" };
      expect(premiumStudioImage(slug)).toBeUndefined();
      expect(withPremiumStudio(source)).toBe(source);
    }
    const future = { slug: "future-product", marketing_image: null, visual_source: "generated_preview" };
    expect(withPremiumStudio(future)).toBe(future);
  });
});
