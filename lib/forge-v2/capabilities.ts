export type ForgeV2Capability =
  | "dimensions"
  | "text"
  | "holes"
  | "slots"
  | "cutouts"
  | "holePatterns"
  | "cableChannels"
  | "vents"
  | "waves"
  | "ribs"
  | "mountingPatterns";

export type ForgeV2ProductCapabilities = Partial<
  Record<ForgeV2Capability, boolean | string[]>
>;

type ProductProfile = {
  label: string;
  engine: "mesh-v2" | "cad-v2";
  capabilities: ForgeV2ProductCapabilities;
};

const BASE_CAPABILITIES: ForgeV2ProductCapabilities = {
  dimensions: true,
  text: true,
};

const PLATE_CAPABILITIES: ForgeV2ProductCapabilities = {
  ...BASE_CAPABILITIES,
  holes: true,
  slots: true,
  cutouts: true,
  holePatterns: true,
  ribs: true,
  waves: true,
};

const ADVANCED: Record<string, ForgeV2ProductCapabilities> = {
  "cable-tray": {
    ...PLATE_CAPABILITIES,
    cableChannels: true,
    vents: ["linear", "hex"],
  },
  "vesa-adapter": {
    ...PLATE_CAPABILITIES,
    mountingPatterns: ["vesa"],
  },
  "enclosure-ip65": {
    ...PLATE_CAPABILITIES,
    cableChannels: true,
    vents: ["linear", "hex"],
  },
  "electronics-box": {
    ...PLATE_CAPABILITIES,
    cableChannels: true,
    vents: ["linear", "hex"],
  },
  "qr-plate": PLATE_CAPABILITIES,
  "camera-plate": PLATE_CAPABILITIES,
  "perforated-mount-plate": PLATE_CAPABILITIES,
  "drill-template": PLATE_CAPABILITIES,
  "multipattern-transition-plate": PLATE_CAPABILITIES,
  "inset-label": PLATE_CAPABILITIES,
};

/**
 * Legacy compatibility surface. Product existence no longer lives here;
 * /catalog/products is canonical. These entries only describe explicit
 * frontend capability overrides.
 */
export const FORGE_V2_PRODUCTS: Record<string, ProductProfile> = Object.fromEntries(
  Object.entries(ADVANCED).map(([slug, capabilities]) => [
    slug,
    {
      label: slug,
      engine: "mesh-v2" as const,
      capabilities,
    },
  ])
);

export const FORGE_V2_PILOTS = FORGE_V2_PRODUCTS;

export function forgeV2Capabilities(slug: string) {
  return ADVANCED[slug] || BASE_CAPABILITIES;
}

/**
 * Deprecated: backend catalog validates existence. Kept only so old imports
 * fail open to the canonical server check instead of maintaining a local list.
 */
export function isForgeV2Product(slug: string) {
  return Boolean(slug?.trim());
}
