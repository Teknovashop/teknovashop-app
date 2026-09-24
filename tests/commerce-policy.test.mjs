import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutIsPaid,
  isCurrentEntitlement,
  safeReturnPath,
  selectEntitlement,
} from "../lib/commerce-policy.ts";

test("safeReturnPath keeps navigation internal", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil", "/ok\nbad", "account"]) {
    assert.equal(safeReturnPath(value, "/forge"), "/forge");
  }
  assert.equal(safeReturnPath("/forge?buy=abc#top"), "/forge?buy=abc#top");
});

test("current entitlement requires active time window", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(isCurrentEntitlement({ active: true, starts_at: "2025-01-01T00:00:00Z" }, now), true);
  assert.equal(isCurrentEntitlement({ active: true, starts_at: "2027-01-01T00:00:00Z" }, now), false);
  assert.equal(isCurrentEntitlement({ active: true, expires_at: "2025-01-01T00:00:00Z" }, now), false);
});

test("commercial subscription wins over maker and one-off", () => {
  const rows = [
    { kind: "design", plan: "oneoff", active: true, design_id: "d1" },
    { kind: "subscription", plan: "maker", active: true },
    { kind: "subscription", plan: "commercial", active: true },
  ];
  assert.equal(selectEntitlement(rows, "d1").plan, "commercial");
});

test("checkout paid requires complete and paid-like status", () => {
  assert.equal(checkoutIsPaid({ status: "complete", payment_status: "paid" }), true);
  assert.equal(checkoutIsPaid({ status: "complete", payment_status: "unpaid" }), false);
  assert.equal(checkoutIsPaid({ status: "open", payment_status: "paid" }), false);
});