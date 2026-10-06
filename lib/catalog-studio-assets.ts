// Versioned marketing assets. Technical meshes and release stages stay canonical.
export const PREMIUM_STUDIO_SLUGS: readonly string[] = [
  "vertical-laptop-dock",
  "universal-mount-plate",
  "mini-pc-mount",
  "desk-grommet",
  "under-desk-channel",
  "multi-device-dock",
  "webcam-monitor-mount",
  "network-switch-mount",
  "electronics-box",
  "controller-stand",
  "drill-template",
  "drawer-divider",
  "vesa-offset-adapter",
  "under-desk-mount",
  "perforated-mount-plate",
  "circular-pattern-adapter",
  "phone-landscape-stand",
  "smartwatch-stand",
  "cable-comb",
  "charger-retainer",
  "zip-tie-anchor",
  "nvme-caddy",
  "power-supply-mount",
  "cold-shoe-adapter",
  "led-light-mount",
  "audio-interface-mount",
  "battery-card-holder",
  "double-wall-hook",
  "compact-wall-shelf",
  "tool-holder",
  "vesa-shelf-adapter",
  "universal-wall-mount",
  "multipattern-transition-plate",
  "monitor-riser",
  "tablet-angle-stand",
  "microphone-desk-adapter",
  "broom-tool-holder",
  "controller-wall-mount",
  "speaker-wall-mount",
  "wall-cable-clip",
  "light-clamp-block",
  "cutting-guide",
  "parametric-spacer",
  "bit-key-organizer",
  "parametric-lidded-box",
  "stackable-box",
  "modular-tray",
  "desk-organizer",
  "modular-pen-holder",
  "hardware-box",
  "accessory-rack",
  "inset-label",
  "sd-card-organizer",
  "cable-reel",
];

const studioSlugs = new Set(PREMIUM_STUDIO_SLUGS);

export function premiumStudioImage(slug: string): string | undefined {
  return studioSlugs.has(slug)
    ? `/images/products/premium-v1/${slug}.webp`
    : undefined;
}

export function withPremiumStudio<T extends { slug: string; marketing_image: string | null; visual_source: string }>(product: T): T {
  const image = premiumStudioImage(product.slug);
  return image
    ? { ...product, marketing_image: image, visual_source: "studio_asset" }
    : product;
}
