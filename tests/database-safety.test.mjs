import test from "node:test";
import assert from "node:assert/strict";
import { assertNoDestructiveMigration, resolveDatabaseTarget } from "../scripts/db/connection-safety.mjs";
import { pendingMigrations } from "../scripts/db/migration-status.mjs";
import { isCalendarDate, localCalendarDate } from "../src/lib/date-query.mjs";

test("development migrations require the exact local development database", () => {
  assert.deepEqual(resolveDatabaseTarget({
    target: "development",
    databaseUrl: "postgresql://dev:secret@localhost:5432/woori_today_portal_dev",
  }), {
    target: "development",
    database: "woori_today_portal_dev",
    url: "postgresql://dev:secret@localhost:5432/woori_today_portal_dev",
  });
});

test("development refuses production names and non-local hosts", () => {
  assert.throws(() => resolveDatabaseTarget({ target: "development", databaseUrl: "postgres://u:p@localhost/woori_today_portal" }), /restricted to woori_today_portal_dev/);
  assert.throws(() => resolveDatabaseTarget({ target: "development", databaseUrl: "postgres://u:p@db.example/woori_today_portal_dev" }), /local PostgreSQL host/);
});

test("production migration requires explicit target, exact database, and separate approval", () => {
  const url = "postgres://u:p@db.example/woori_today_portal";
  assert.deepEqual(resolveDatabaseTarget({ target: "production", databaseUrl: url }).database, "woori_today_portal");
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: url, requireProductionApproval: true }), /disabled/);
  assert.deepEqual(resolveDatabaseTarget({ target: "production", databaseUrl: url, requireProductionApproval: true, allowProductionMigration: "I_HAVE_APPROVAL" }).database, "woori_today_portal");
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: "postgres://u:p@db.example/woori_today_portal_dev", requireProductionApproval: true, allowProductionMigration: "I_HAVE_APPROVAL" }), /restricted to woori_today_portal/);
});

test("destructive SQL is blocked before an unapplied migration runs", () => {
  assert.doesNotThrow(() => assertNoDestructiveMigration("CREATE TABLE metrics (id text primary key)", "create.sql"));
  assert.throws(() => assertNoDestructiveMigration("ALTER TABLE metrics DROP COLUMN value", "drop.sql"), /destructive SQL/);
  assert.throws(() => assertNoDestructiveMigration("TRUNCATE TABLE metrics", "truncate.sql"), /destructive SQL/);
});

test("migration status compares Drizzle bigint timestamps without reapplying prior versions", () => {
  const entries = [{ when: 1792547153047, tag: "0000_init" }, { when: 1792547153048, tag: "0001_add_column" }];
  assert.deepEqual(pendingMigrations(entries, [{ created_at: "1792547153047" }]), [{ when: 1792547153048, tag: "0001_add_column" }]);
});

test("date query validation rejects impossible dates and preserves local calendar dates", () => {
  assert.equal(isCalendarDate("2026-10-21"), true);
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2026-10-2"), false);
  assert.equal(localCalendarDate(new Date(2026, 9, 21, 0, 15)), "2026-10-21");
});
