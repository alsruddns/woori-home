import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  classifyMigrationTestState,
  EXPECTED_INDEXES,
  EXPECTED_MIGRATION_TAGS,
  EXPECTED_TABLES,
  parseMigrationTestTarget,
  verifyMigrationTestSchema,
} from "../scripts/db/migration-test-safety.mjs";

const times = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8")).entries.map(({ when }) => when);
const rows = times.map((created_at) => ({ created_at: String(created_at) }));

test("the migration test accepts only its dedicated database and isolated container host", () => {
  assert.deepEqual(parseMigrationTestTarget("postgresql://tester:secret@woori-pg-restore-test:5432/woori_migration_test"), {
    database: "woori_migration_test",
    host: "woori-pg-restore-test",
    url: "postgresql://tester:secret@woori-pg-restore-test:5432/woori_migration_test",
  });
  assert.throws(() => parseMigrationTestTarget(undefined), /MIGRATION_TEST_DATABASE_URL/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@woori-pg-restore-test/woori_today_portal"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@woori-pg-restore-test/woori_today_portal_dev"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@woori-pg-restore-test/moneybook"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@localhost/woori_migration_test"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@other-container/woori_migration_test"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@woori-pg-restore-test/woori_migration_test"), /restricted/);
  assert.throws(() => parseMigrationTestTarget("postgres://u:p@woori-pg-restore-test/woori_migration_test?host=production-db"), /restricted/);
});

test("migration test state permits only an empty first run or the complete expected history", () => {
  assert.equal(classifyMigrationTestState({ publicTables: [], migrationSchemaExists: false, migrationTableExists: false, appliedRows: [], migrationTimes: times }), "fresh");
  assert.equal(classifyMigrationTestState({
    publicTables: EXPECTED_TABLES,
    migrationSchemaExists: true,
    migrationTableExists: true,
    appliedRows: rows,
    migrationTimes: times,
  }), "already-migrated");
  assert.throws(() => classifyMigrationTestState({
    publicTables: ["countries"],
    migrationSchemaExists: false,
    migrationTableExists: false,
    appliedRows: [],
    migrationTimes: times,
  }), /refusing to change/);
  assert.throws(() => classifyMigrationTestState({
    publicTables: [],
    migrationSchemaExists: false,
    migrationTableExists: false,
    otherSchemas: ["unrelated"],
    appliedRows: [],
    migrationTimes: times,
  }), /refusing to change/);
  assert.throws(() => classifyMigrationTestState({
    publicTables: EXPECTED_TABLES,
    migrationSchemaExists: true,
    migrationTableExists: true,
    appliedRows: rows,
    migrationTimes: [1, 2, 3, 4],
  }), /refusing to change/);
});

test("migration schema verification matches the current journal, table, and index sets", () => {
  assert.deepEqual(verifyMigrationTestSchema({
    appliedRows: rows,
    migrationTimes: times,
    tables: EXPECTED_TABLES,
    indexes: EXPECTED_INDEXES,
  }), { applied: times.length, pending: 0, tables: EXPECTED_TABLES.length, indexes: EXPECTED_INDEXES.length });
  assert.throws(() => verifyMigrationTestSchema({ appliedRows: rows.slice(1), migrationTimes: times, tables: EXPECTED_TABLES, indexes: EXPECTED_INDEXES }), /unique applied entries/);
  assert.throws(() => verifyMigrationTestSchema({ appliedRows: rows, migrationTimes: times, tables: EXPECTED_TABLES.slice(1), indexes: EXPECTED_INDEXES }), /expected table set/);
  assert.throws(() => verifyMigrationTestSchema({ appliedRows: rows, migrationTimes: times, tables: EXPECTED_TABLES, indexes: EXPECTED_INDEXES.slice(1) }), /expected index set/);
});

test("test migration command ignores production and development URL variables", () => {
  const script = fileURLToPath(new URL("../scripts/db/migrate-test-database.mjs", import.meta.url));
  const env = { ...process.env };
  delete env.MIGRATION_TEST_DATABASE_URL;
  env.DATABASE_URL = "postgres://secret-marker@production/woori_today_portal";
  env.DB_MIGRATION_URL = "postgres://secret-marker@development/woori_today_portal_dev";
  const result = spawnSync(process.execPath, [script], { encoding: "utf8", env });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set MIGRATION_TEST_DATABASE_URL/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /secret-marker|woori_today_portal_dev|woori_today_portal(?!_)/);
  assert.deepEqual(EXPECTED_MIGRATION_TAGS, [
    "0000_init_data_catalog",
    "0001_worldbank_collection_counts",
    "0002_worldbank_country_metadata",
    "0003_financial_market_data",
    "0004_sec_company_facts",
    "0005_sec_fact_period_key",
    "0006_dear_human_robot",
    "0007_graceful_cerise",
    "0008_acoustic_loki",
    "0009_ambiguous_eddie_brock",
    "0010_melodic_metal_master",
    "0011_rare_trish_tilby",
    "0012_coinranking_asset_identity",
    "0013_coinranking_snapshot_rights",
  ]);
});
