import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MODELS } from "../data/models.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const portfolioSlugs = new Set([
  "cable-tray",
  "camera-plate",
  "go-pro-mount",
  "hub-holder",
  "laptop-stand",
  "mic-arm-clip",
  "phone-stand",
  "router-mount",
  "vesa-shelf",
]);
const forbiddenAssets = [
  "/images/products/ip65-box.webp",
  "/images/products/qr-plate.webp",
  "/images/products/vesa-tray.webp",
];

function assertWebp(bytes, message) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", message);
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", message);
}

test("catalog thumbnails use verified portfolio art or generated geometry renders", () => {
  const seen = new Set();

  for (const model of MODELS) {
    const expected = portfolioSlugs.has(model.slug)
      ? `/images/products/portfolio/${model.slug}.webp`
      : `/images/products/geometry/${model.slug}.png`;

    assert.equal(model.thumbnail, expected, `${model.slug} points at the wrong product thumbnail`);
    assert.equal(seen.has(model.thumbnail), false, `${model.slug} duplicates thumbnail ${model.thumbnail}`);
    seen.add(model.thumbnail);

    const assetPath = path.join(root, "public", model.thumbnail);
    assert.equal(existsSync(assetPath), true, `${model.slug} thumbnail is missing: ${model.thumbnail}`);

    assert.equal(
      forbiddenAssets.includes(model.thumbnail),
      false,
      `${model.slug} uses a known broken or obsolete thumbnail`
    );

    const bytes = readFileSync(assetPath);
    if (portfolioSlugs.has(model.slug)) {
      assertWebp(bytes, `${model.slug} portfolio thumbnail must be a valid WebP`);
    } else {
      assert.equal(bytes.subarray(0, pngSignature.length).equals(pngSignature), true, `${model.slug} thumbnail must be a valid PNG`);
    }
    assert.ok(bytes.length > 32_000, `${model.slug} thumbnail is unexpectedly small`);
  }

  assert.equal(seen.size, MODELS.length);
});

test("featured homepage templates do not reference obsolete catalog art", () => {
  const pageSource = readFileSync(path.join(root, "app/page.tsx"), "utf8");

  for (const asset of forbiddenAssets) {
    assert.equal(pageSource.includes(asset), false, `homepage still references obsolete asset ${asset}`);
  }
});
