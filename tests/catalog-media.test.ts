import { describe, expect, it } from "vitest";
import { MODELS } from "@/data/models";
import {
  hasStudioRender,
  marketingImageFor,
  technicalImageFor,
} from "@/lib/catalog-media";

function model(slug: string) {
  const found = MODELS.find((item) => item.slug === slug);
  if (!found) throw new Error("Missing model " + slug);
  return found;
}

describe("catalog media contract", () => {
  it("keeps the professional studio render on public surfaces when available", () => {
    const vesa = model("vesa-adapter");
    expect(marketingImageFor(vesa)).toBe(
      "/images/products/professional/vesa-adapter.webp"
    );
    expect(hasStudioRender(vesa)).toBe(true);
  });

  it("keeps the exact geometry image separate for technical validation", () => {
    const vesa = model("vesa-adapter");
    expect(technicalImageFor(vesa)).toBe("/api/catalog/thumbnail/vesa-adapter");
  });

  it("falls back to exact generated geometry for new products without studio art yet", () => {
    const dock = model("vertical-laptop-dock");
    expect(marketingImageFor(dock)).toBe("/api/catalog/thumbnail/vertical-laptop-dock");
    expect(hasStudioRender(dock)).toBe(false);
  });
});
