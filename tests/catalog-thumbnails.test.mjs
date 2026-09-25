import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
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

test("catalog thumbnails use curated professional product artwork", () => {
  const seen = new Set();

  for (const model of MODELS) {
    assert.equal(
      model.thumbnail.includes("/images/products/geometry/"),
      false,
      `${model.slug} still uses a technical geometry thumbnail`
    );
    assert.equal(
      model.thumbnail.includes("/images/products/professional/"),
      false,
      `${model.slug} still uses the rejected temporary artwork`
    );
    assert.equal(seen.has(model.thumbnail), false, `${model.slug} duplicates thumbnail ${model.thumbnail}`);
    seen.add(model.thumbnail);

    const assetPath = path.join(root, "public", model.thumbnail);
    assert.equal(existsSync(assetPath), true, `${model.slug} thumbnail is missing: ${model.thumbnail}`);
    assert.equal(forbiddenAssets.includes(model.thumbnail), false, `${model.slug} uses a known obsolete thumbnail`);
    assert.ok(statSync(assetPath).size > 1_000, `${model.slug} artwork is unexpectedly small`);

    if (model.thumbnail.endsWith(".svg")) {
      const source = readFileSync(assetPath, "utf8");
      assert.match(source, /<svg[\s>]/, `${model.slug} artwork must be valid SVG markup`);
    } else {
      assert.match(model.thumbnail, /\.(?:webp|png|jpe?g)$/i, `${model.slug} uses an unsupported raster format`);
    }
  }

  assert.equal(seen.size, MODELS.length);
});

test("featured homepage templates use real product artwork, never temporary geometry cards", () => {
  const pageSource = readFileSync(path.join(root, "app/page.tsx"), "utf8");

  for (const asset of forbiddenAssets) {
    assert.equal(pageSource.includes(asset), false, `homepage still references obsolete asset ${asset}`);
  }

  assert.equal(pageSource.includes("/images/products/geometry/"), false, "homepage still references technical geometry thumbnails");
  assert.equal(pageSource.includes("/images/products/professional/"), false, "homepage still references rejected temporary artwork");
  assert.match(pageSource, /\/forge\/.*encodeURIComponent\(template\[0\]\)/, "featured cards must route to their canonical Forge product");
});
