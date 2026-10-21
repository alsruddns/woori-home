import test from "node:test";
import assert from "node:assert/strict";
import { calculateGoldConversion, calculateMarketChange, isValidMarketDate, validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";

test("financial dates require a real calendar date and preserve UTC daily boundaries", () => {
  assert.equal(isValidMarketDate("2026-10-21"), true);
  assert.equal(isValidMarketDate("2026-02-30"), false);
  assert.equal(isValidMarketDate("2026-10-21T00:00:00Z"), false);
});

test("price validation preserves NUMERIC decimal strings and rejects invalid precision and nonfinite values", () => {
  const row = { assetId: "a", sourceId: "s", datasetId: "d", referenceDate: "2026-10-21", referenceTimezone: "UTC", priceKind: "close", close: "0.0000000001", fetchedAt: "2026-10-21T10:00:00Z" };
  assert.deepEqual(validateMarketPriceRecord(row), { ok: true, record: row });
  assert.equal(validateMarketPriceRecord({ ...row, close: "1.12345678901" }).reason, "precision-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: "Infinity" }).reason, "invalid-close");
  assert.equal(validateMarketPriceRecord({ ...row, close: null }).reason, "missing-close");
  assert.equal(validateMarketPriceRecord({ ...row, volume: "-1" }).reason, "negative-volume");
});

test("daily changes use fixed-point arithmetic, and missing or zero previous closes are not calculated", () => {
  assert.deepEqual(calculateMarketChange("100.0000000001", "100"), { change: "0.0000000001", changePercent: "0.0000000001", direction: "up" });
  assert.deepEqual(calculateMarketChange("90", "100"), { change: "-10", changePercent: "-10", direction: "down" });
  assert.equal(calculateMarketChange("100", "0"), null);
  assert.equal(calculateMarketChange("100", null), null);
});

test("gold conversion requires same-currency source inputs and applies troy-ounce, gram and don units exactly", () => {
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "gram" }), "83591.9410784327");
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "don" }), "313469.7790441226");
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "2000", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-19", targetUnit: "gram" }), null);
  assert.equal(calculateGoldConversion({ usdPerTroyOunce: "0", usdPerKrw: "1300", observedDate: "2026-10-20", fxReferenceDate: "2026-10-20", targetUnit: "gram" }), null);
});
