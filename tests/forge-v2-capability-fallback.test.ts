import { describe, expect, it } from "vitest";
import { MODELS } from "@/data/models";
import { forgeV2Capabilities } from "@/lib/forge-v2/capabilities";

describe("Forge V2 capability fallback", () => {
  it("keeps every model usable if the canonical catalog is temporarily unavailable", () => {
    for (const model of MODELS) {
      const capabilities = forgeV2Capabilities(model.slug);
      expect(capabilities.dimensions).toBe(true);
      expect(capabilities.text).toBe(true);
    }
  });
});
