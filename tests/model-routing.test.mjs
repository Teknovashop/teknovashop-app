import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { MODELS } from '../data/models.ts';
import { canonicalModelSlug, normalizeModelSearch } from '../lib/model-routing.ts';

test('existing product links resolve to supported products', () => {
  for (const [legacy, expected] of Object.entries({
    'vesa-tray': 'vesa-shelf', 'ip65-box': 'enclosure-ip65',
    'tablet-stand': 'laptop-stand', 'phone-dock': 'phone-stand',
    'monitor-stand': 'cable-tray', ' VESA_SHELF ': 'vesa-shelf',
  })) {
    assert.equal(canonicalModelSlug(legacy), expected);
    assert.ok(MODELS.some(model => model.slug === expected));
  }
});

test('catalogue has 18 unique canonical models and existing images', () => {
  assert.equal(MODELS.length, 18);
  assert.equal(new Set(MODELS.map(model => model.slug)).size, 18);
  for (const model of MODELS) {
    assert.equal(canonicalModelSlug(model.slug), model.slug);
    assert.ok(existsSync(new URL(`../public${model.thumbnail}`, import.meta.url)));
  }
});

test('Spanish product search accepts accents and surrounding spaces', () => {
  const query = normalizeModelSearch('  camara  ');
  assert.ok(MODELS.filter(model => normalizeModelSearch(model.name).includes(query)).some(model => model.slug === 'camera-plate'));
  assert.equal(normalizeModelSearch('MÓVIL'), 'movil');
});
