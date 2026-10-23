import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  PRODUCTION_ROLE_NAMES,
  quotePgIdentifier,
  validateFinancialProductionContext,
} from "../scripts/db/financial-production-safety.mjs";

const validEnv = {
  DB_TARGET: "production",
  GITHUB_ACTIONS: "true",
  GITHUB_REF: "refs/heads/main",
  PRODUCTION_OPERATION_APPROVAL: "test-approval",
  PRODUCTION_DB_ALLOWED_HOSTS: "postgres",
  DATABASE_URL: "postgres://woori_portal:runtime@postgres:5432/woori_today_portal",
  DB_IMPORT_URL: "postgres://woori_portal_import:import@postgres:5432/woori_today_portal",
  DB_MIGRATION_URL: "postgres://woori_portal_migration:migration@postgres:5432/woori_today_portal",
};

test("production financial context validates role split and refuses to target other refs or hosts", () => {
  assert.equal(validateFinancialProductionContext({ env: validEnv }).DATABASE_URL.database, "woori_today_portal");
  assert.deepEqual(PRODUCTION_ROLE_NAMES, {
    DATABASE_URL: "woori_portal",
    DB_IMPORT_URL: "woori_portal_import",
    DB_MIGRATION_URL: "woori_portal_migration",
  });
  assert.throws(() => validateFinancialProductionContext({ env: { ...validEnv, GITHUB_REF: "refs/heads/develop" } }), /main/);
  assert.throws(() => validateFinancialProductionContext({ env: { ...validEnv, PRODUCTION_DB_ALLOWED_HOSTS: "other-host" } }), /PRODUCTION_DB_ALLOWED_HOSTS/);
  assert.throws(() => validateFinancialProductionContext({ env: { ...validEnv, DB_IMPORT_URL: validEnv.DATABASE_URL } }), /distinct/);
  assert.throws(() => validateFinancialProductionContext({ env: { ...validEnv, DB_MIGRATION_URL: "postgres://root:pw@postgres/woori_today_portal" } }), /woori_portal_migration/);
  assert.throws(() => validateFinancialProductionContext({ env: { ...validEnv, PRODUCTION_OPERATION_APPROVAL: "" } }), /approval/);
});

test("production writes require the protected backup reference for this run", () => {
  assert.throws(() => validateFinancialProductionContext({ env: validEnv, requireBackup: true, backupReference: "backup-20261022" }), /backup/);
  const env = { ...validEnv, PRODUCTION_BACKUP_CONFIRMED: "true", PRODUCTION_BACKUP_REFERENCE: "backup-20261022" };
  assert.equal(validateFinancialProductionContext({ env, requireBackup: true, backupReference: "backup-20261022" }).DB_IMPORT_URL.database, "woori_today_portal");
  assert.throws(() => validateFinancialProductionContext({ env: { ...env, PRODUCTION_BACKUP_REFERENCE: "another-backup" }, requireBackup: true, backupReference: "backup-20261022" }), /backup/);
});

test("Postgres identifier quoting accepts only a simple provisioned role name", () => {
  assert.equal(quotePgIdentifier("woori_portal"), '"woori_portal"');
  assert.throws(() => quotePgIdentifier('role"; DROP TABLE data_sources'), /identifier/);
});

test("SEC production importer is isolated to DB_IMPORT_URL, guarded, transactional and does not touch price tables", async () => {
  const source = await readFile(new URL("../scripts/data/import-sec-company-facts-production.mjs", import.meta.url), "utf8");
  const core = await readFile(new URL("../scripts/data/sec-company-facts-core.mjs", import.meta.url), "utf8");
  assert.match(source, /process\.env\.DB_IMPORT_URL/);
  assert.match(source, /validateFinancialProductionContext\(\{ requireBackup: options\.apply/);
  assert.match(source, /SEC_EDGAR_USER_AGENT/);
  assert.match(source, /begin/);
  assert.match(source, /rollback/);
  assert.match(core, /on conflict \(company_id,taxonomy,concept,unit,end_date,accession_number,period_key\) do update/);
  assert.match(source, /data_collection_runs/);
  assert.match(source, /financial_company_facts/);
  assert.doesNotMatch(source, /financial_daily_prices|financial_assets/);
});

test("scheduled SEC refresh requires preexisting grants and skips privileged grant writes", async () => {
  const workflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  assert.match(workflow, /SCHEDULED_SEC_REFRESH:.*github\.event_name == 'schedule'/);
  assert.match(workflow, /if \[ "\$SCHEDULED_SEC_REFRESH" = "true" \]; then\s+printf '%s\\n' "\$preflight_report" \| jq -e '\.permissionFindings \| length == 0'/);
  assert.match(workflow, /if \[ "\$SCHEDULED_SEC_REFRESH" = "true" \]; then\s+stage="Verify existing restricted SEC Import and Runtime grants"/);
});

test("SEC production status and verification connections are transaction read-only", async () => {
  const source = await readFile(new URL("../scripts/data/financial-sec-production.mjs", import.meta.url), "utf8");
  assert.match(source, /default_transaction_read_only=on/);
  assert.doesNotMatch(source, /\b(?:insert into|update |delete from|create table|grant )/i);
  assert.match(source, /duplicate_groups/);
  assert.match(source, /expectedCompanies/);
});

test("production preflight inspects migration hashes, catalog seeds, World Bank and role grants read-only", async () => {
  const source = await readFile(new URL("../scripts/db/preflight-financial-production.mjs", import.meta.url), "utf8");
  assert.match(source, /default_transaction_read_only=on/);
  assert.match(source, /financial_company_facts/);
  assert.match(source, /data_sources/);
  assert.match(source, /datasets/);
  assert.match(source, /indicator_observations/);
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /PRODUCTION_ROLE_NAMES|validateFinancialProductionContext/);
  assert.match(source, /has_table_privilege/);
});

test("financial production preflight reports missing production access as skipped without connecting", () => {
  const env = { ...process.env, DATABASE_URL: "", DB_IMPORT_URL: "", DB_MIGRATION_URL: "" };
  const result = spawnSync(process.execPath, ["scripts/db/preflight-financial-production.mjs"], { env, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /"status":"skipped"/);
  assert.match(result.stderr, /"databaseConnectionOpened":false/);
  assert.doesNotMatch(result.stderr, /postgres(?:ql)?:\/\//i);
});

test("SEC production import fails closed before network access without protected production settings", () => {
  const env = { ...process.env, DB_TARGET: "", DATABASE_URL: "", DB_IMPORT_URL: "", DB_MIGRATION_URL: "", SEC_EDGAR_USER_AGENT: "" };
  const result = spawnSync(process.execPath, ["scripts/data/import-sec-company-facts-production.mjs", "--dry-run"], { env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /All required|DB_TARGET|approval/i);
  assert.doesNotMatch(result.stdout + result.stderr, /data\.sec\.gov|HTTP 200/);
});
