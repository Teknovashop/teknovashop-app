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

function assertWebp(bytes, message) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", message);
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", message);
}

test("every catalogue card has a unique geometry-derived thumbnail route", () => {
  assert.equal(MODELS.length, 30);
  const seen = new Set();

  for (const model of MODELS) {
    const expected = `/api/catalog/thumbnail/${model.slug}`;
    assert.equal(model.geometryThumbnail, expected, `${model.slug} geometry preview route is wrong`);
    assert.equal(seen.has(expected), false, `${model.slug} duplicates geometry preview ${expected}`);
    seen.add(expected);
  }

  assert.equal(seen.size, MODELS.length);
});

test("the original 18 professional marketing thumbnails remain valid assets", () => {
  const legacy = MODELS.filter((model) =>
    model.thumbnail.startsWith("/images/products/professional/")
  );

  assert.equal(legacy.length, 18);

  for (const model of legacy) {
    const expected = `/images/products/professional/${model.slug}.webp`;
    assert.equal(model.thumbnail, expected, `${model.slug} marketing image changed unexpectedly`);
    assert.equal(forbiddenAssets.includes(model.thumbnail), false);

    const assetPath = path.join(root, "public", model.thumbnail);
    assert.equal(existsSync(assetPath), true, `${model.slug} thumbnail is missing`);

    const bytes = readFileSync(assetPath);
    assertWebp(bytes, `${model.slug} professional thumbnail must be a valid WebP`);
    assert.ok(bytes.length > 32_000, `${model.slug} thumbnail is unexpectedly small`);
  }
});

test("featured homepage templates do not reference obsolete catalog art", () => {
  const pageSource = readFileSync(path.join(root, "app/page.tsx"), "utf8");
  for (const asset of forbiddenAssets) {
    assert.equal(pageSource.includes(asset), false, `homepage still references obsolete asset ${asset}`);
  }
});
