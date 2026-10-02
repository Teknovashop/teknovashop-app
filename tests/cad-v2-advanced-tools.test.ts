import { describe, expect, it } from "vitest";
import type { ForgeV2OperationType } from "@/lib/forge-v2/spec";

describe("advanced CAD tool contract", () => {
  it("uses only operation types already shared with Forge V2", () => {
    const operations: ForgeV2OperationType[] = [
      "hole_pattern",
      "vent_linear",
      "vent_hex",
      "cable_channel",
      "rib",
    ];
    expect(operations).toHaveLength(5);
  });
});
