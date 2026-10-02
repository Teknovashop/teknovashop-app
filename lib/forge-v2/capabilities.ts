export type ForgeV2Capability =
  | "dimensions"
  | "text"
  | "holes"
  | "slots"
  | "cutouts"
  | "vents"
  | "waves"
  | "ribs"
  | "mountingPatterns";

export type ForgeV2ProductCapabilities = Partial<
  Record<ForgeV2Capability, boolean | string[]>
>;

export const FORGE_V2_PILOTS: Record<
  string,
  { label: string; engine: "mesh-v2" | "cad-v2"; capabilities: ForgeV2ProductCapabilities }
> = {
  "cable-tray": {
    label: "Bandeja de Cables",
    engine: "mesh-v2",
    capabilities: {
      dimensions: true,
      holes: true,
      slots: true,
      cutouts: true,
      vents: ["linear", "hex"],
      ribs: true,
      text: true,
    },
  },
  "vesa-adapter": {
    label: "Adaptador VESA",
    engine: "mesh-v2",
    capabilities: {
      dimensions: true,
      holes: true,
      slots: true,
      cutouts: true,
      mountingPatterns: ["vesa"],
      text: true,
    },
  },
  "enclosure-ip65": {
    label: "Caja técnica con tapa",
    engine: "mesh-v2",
    capabilities: {
      dimensions: true,
      holes: true,
      slots: true,
      cutouts: true,
      vents: ["linear", "hex"],
      ribs: true,
      text: true,
    },
  },
};

export function forgeV2Capabilities(slug: string) {
  return FORGE_V2_PILOTS[slug]?.capabilities || {};
}
