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

test("catalog thumbnails use one professional canonical render per product", () => {
  const seen = new Set();

  for (const model of MODELS) {
    assert.match(
      model.thumbnail,
      /^\/images\/products\/professional\/[a-z0-9-]+\.svg$/,
      `${model.slug} must use a professional canonical render`
    );
    assert.equal(
      model.thumbnail,
      `/images/products/professional/${model.slug}.svg`,
      `${model.slug} render must match its canonical slug`
    );
    assert.equal(seen.has(model.thumbnail), false, `${model.slug} duplicates thumbnail ${model.thumbnail}`);
    seen.add(model.thumbnail);

    const assetPath = path.join(root, "public", model.thumbnail);
    assert.equal(existsSync(assetPath), true, `${model.slug} thumbnail is missing: ${model.thumbnail}`);
    assert.equal(forbiddenAssets.includes(model.thumbnail), false, `${model.slug} uses a known obsolete thumbnail`);

    const source = readFileSync(assetPath, "utf8");
    assert.match(source, /<svg[\s>]/, `${model.slug} thumbnail must be valid SVG markup`);
    assert.ok(source.length > 1_000, `${model.slug} professional render is unexpectedly small`);
  }

  assert.equal(seen.size, MODELS.length);
});

test("featured homepage templates do not reference obsolete catalog art", () => {
  const pageSource = readFileSync(path.join(root, "app/page.tsx"), "utf8");

  for (const asset of forbiddenAssets) {
    assert.equal(pageSource.includes(asset), false, `homepage still references obsolete asset ${asset}`);
  }

  assert.equal(
    pageSource.includes("/images/products/geometry/"),
    false,
    "homepage still references legacy geometry thumbnails"
  );
});
