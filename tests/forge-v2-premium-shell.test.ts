import { describe, expect, it } from "vitest";
import { MODELS } from "@/data/models";
import { marketingImageFor } from "@/lib/catalog-media";

describe("Forge V2 premium shell data", () => {
  it("has a navigable marketing image for every product", () => {
    expect(MODELS).toHaveLength(72);
    for (const model of MODELS) {
      expect(marketingImageFor(model)).toBeTruthy();
      expect(model.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
