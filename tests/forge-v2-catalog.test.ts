import { describe, expect, it } from "vitest";
import { MODELS } from "@/data/models";
import {
  FORGE_V2_PRODUCTS,
  forgeV2Capabilities,
  isForgeV2Product,
} from "@/lib/forge-v2/capabilities";

describe("Forge V2 catalog coverage", () => {
  it("addresses every canonical frontend product", () => {
    expect(MODELS).toHaveLength(72);
    expect(Object.keys(FORGE_V2_PRODUCTS)).toHaveLength(72);

    for (const model of MODELS) {
      expect(isForgeV2Product(model.slug)).toBe(true);
      expect(forgeV2Capabilities(model.slug).dimensions).toBe(true);
      expect(forgeV2Capabilities(model.slug).text).toBe(true);
    }
  });

  it("keeps advanced operations opt-in by geometry family", () => {
    expect(forgeV2Capabilities("vesa-adapter").holes).toBe(true);
    expect(forgeV2Capabilities("cable-tray").vents).toEqual(["linear", "hex"]);
    expect(forgeV2Capabilities("universal-mount-plate").cutouts).toBe(true);

    expect(forgeV2Capabilities("headset-stand").holes).toBeUndefined();
    expect(forgeV2Capabilities("headset-stand").dimensions).toBe(true);
  });
});
