export const CAD_V2_ENCLOSURE_SLUGS = [
  "enclosure-ip65",
  "electronics-box",
] as const;

export type CadV2EnclosureSlug = (typeof CAD_V2_ENCLOSURE_SLUGS)[number];

export function isCadV2Enclosure(slug: string): slug is CadV2EnclosureSlug {
  return (CAD_V2_ENCLOSURE_SLUGS as readonly string[]).includes(slug);
}
