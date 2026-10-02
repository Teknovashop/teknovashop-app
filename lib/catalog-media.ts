import type { ForgeModel } from "@/data/models";

export function marketingImageFor(model: ForgeModel) {
  return model.thumbnail || model.geometryThumbnail || "/hero/hero.jpg";
}

export function technicalImageFor(model: ForgeModel) {
  return model.geometryThumbnail || model.thumbnail || "/hero/hero.jpg";
}

export function hasStudioRender(model: ForgeModel) {
  return Boolean(model.thumbnail?.startsWith("/images/"));
}
