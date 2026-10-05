import { describe, expect, it } from "vitest";
import {
  CAD_V2_ENCLOSURE_SLUGS,
  isCadV2Enclosure,
} from "@/lib/forge-v2/cad-enclosures";

describe("CAD V2 enclosure pilot", () => {
  it("keeps the enclosure family explicit", () => {
    expect(CAD_V2_ENCLOSURE_SLUGS).toEqual([
      "enclosure-ip65",
      "electronics-box",
    ]);
  });

  it("fails closed outside the enclosure family", () => {
    expect(isCadV2Enclosure("electronics-box")).toBe(true);
    expect(isCadV2Enclosure("vesa-adapter")).toBe(false);
  });
});
