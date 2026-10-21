import test from "node:test";
import assert from "node:assert/strict";
import { defaultSnapshotDate, previousCalendarDate } from "../src/lib/snapshot-date.mjs";

test("snapshot fallback starts at yesterday in the selected market timezone", () => {
  assert.equal(defaultSnapshotDate(new Date("2026-10-21T02:00:00Z"), "America/New_York", []), "2026-10-19");
  assert.equal(defaultSnapshotDate(new Date("2026-10-21T02:00:00Z"), "Asia/Seoul", []), "2026-10-20");
});

test("available snapshots fall back to the latest real observation no later than yesterday", () => {
  assert.equal(defaultSnapshotDate(new Date("2026-10-21T12:00:00Z"), "UTC", ["2026-10-17", "2026-10-19", "2026-10-22"]), "2026-10-19");
});

test("calendar date arithmetic handles month and year boundaries", () => {
  assert.equal(previousCalendarDate("2026-01-01"), "2025-12-31");
  assert.equal(previousCalendarDate("2024-03-01"), "2024-02-29");
});
