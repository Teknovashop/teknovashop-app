export const CAD_V2_PRODUCT_SLUGS = [
  "vesa-adapter",
  "camera-plate",
  "qr-plate",
  "universal-mount-plate",
  "vesa-offset-adapter",
  "perforated-mount-plate",
  "drill-template",
] as const;

export type CadV2ProductSlug = (typeof CAD_V2_PRODUCT_SLUGS)[number];

export function isCadV2Product(slug: string): slug is CadV2ProductSlug {
  return (CAD_V2_PRODUCT_SLUGS as readonly string[]).includes(slug);
}
