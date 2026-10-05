import { describe, expect, it } from "vitest";
import {
  CAD_V2_PRODUCT_SLUGS,
  isCadV2Product,
} from "@/lib/forge-v2/cad-products";

describe("CAD V2 product pilot", () => {
  it("keeps the pilot intentionally small and explicit", () => {
    expect(CAD_V2_PRODUCT_SLUGS).toEqual([
      "vesa-adapter",
      "camera-plate",
      "qr-plate",
      "universal-mount-plate",
      "vesa-offset-adapter",
      "perforated-mount-plate",
      "drill-template",
    ]);
  });

  it("fails closed for products outside the pilot", () => {
    expect(isCadV2Product("vesa-adapter")).toBe(true);
    expect(isCadV2Product("router-mount")).toBe(false);
    expect(isCadV2Product("cable-tray")).toBe(false);
  });
});
