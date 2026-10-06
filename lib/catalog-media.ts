import type { ForgeModel } from "@/data/models";

const GENERATED_RENDER_VERSION = "studio-v6";

function versionGeneratedRender(src: string) {
  if (!src.startsWith("/api/catalog/thumbnail/")) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${GENERATED_RENDER_VERSION}`;
}

export function marketingImageFor(model: ForgeModel) {
  return versionGeneratedRender(
    model.thumbnail || model.geometryThumbnail || "/hero/hero.jpg"
  );
}

export function technicalImageFor(model: ForgeModel) {
  return versionGeneratedRender(
    model.geometryThumbnail || model.thumbnail || "/hero/hero.jpg"
  );
}

export function hasStudioRender(model: ForgeModel) {
  return Boolean(
    model.thumbnail?.startsWith("/images/") ||
      model.thumbnail?.startsWith("/api/catalog/studio/")
  );
}
