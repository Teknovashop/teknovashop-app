import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MODELS } from "../data/models.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenAssets = [
  "/images/products/ip65-box.webp",
  "/images/products/qr-plate.webp",
  "/images/products/vesa-tray.webp",
];

test("catalog thumbnails use production product assets that exist", () => {
  for (const model of MODELS) {
    assert.match(model.thumbnail, /^\/images\/products\//, `${model.slug} must use a product thumbnail`);

    const assetPath = path.join(root, "public", model.thumbnail);
    assert.equal(existsSync(assetPath), true, `${model.slug} thumbnail is missing: ${model.thumbnail}`);

    assert.equal(
      forbiddenAssets.includes(model.thumbnail),
      false,
      `${model.slug} uses a known broken or obsolete thumbnail`
    );

    if (model.thumbnail.endsWith(".svg")) {
      const source = readFileSync(assetPath, "utf8");
      assert.match(source, /<svg\b/, `${model.slug} SVG thumbnail must be valid SVG markup`);
      assert.match(source, /role="img"|aria-label=/, `${model.slug} SVG thumbnail must expose accessible image metadata`);
      assert.doesNotMatch(source, /href="\/images\/models\//, `${model.slug} SVG thumbnail must not embed legacy model renders`);
    }
  }
});

test("featured homepage templates do not reference obsolete catalog art", () => {
  const pageSource = readFileSync(path.join(root, "app/page.tsx"), "utf8");

  for (const asset of forbiddenAssets) {
    assert.equal(pageSource.includes(asset), false, `homepage still references obsolete asset ${asset}`);
  }
});
