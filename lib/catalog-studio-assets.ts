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
