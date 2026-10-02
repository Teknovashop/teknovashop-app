import { describe, expect, it } from "vitest";
import type { ForgeV2Operation } from "@/lib/forge-v2/spec";

describe("CAD V2 operation payload contract", () => {
  it("keeps supported operations in the shared V2 operation schema", () => {
    const supported = [
      "hole",
      "slot",
      "cutout_rect",
      "cutout_circle",
      "counterbore",
      "pocket_rect",
      "vesa_pattern",
      "boss",
    ] as const;

    for (const type of supported) {
      const op: ForgeV2Operation = {
        id: "test-" + type,
        type,
        version: 1,
        enabled: true,
        target: { face: "top" },
        placement: { x: 0, y: 0, rotation_deg: 0 },
        params: {},
      };
      expect(op.type).toBe(type);
    }
  });
});
