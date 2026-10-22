import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertNoDestructiveMigration, resolveDatabaseTarget } from "../scripts/db/connection-safety.mjs";
import { pendingMigrations } from "../scripts/db/migration-status.mjs";
import { assertDatabaseRolesShareTarget, assertProductionOperation, parseProductionApprovalArgs } from "../scripts/db/production-operation.mjs";
import { assertCommitDigest, assertCommitShaTag, isMainProductionRelease } from "../scripts/deploy/release-guard.mjs";
import { approvedWorldBankDbIndicators, resolveWorldBankDataSource, worldBankIndicatorSource } from "../src/lib/db/world-bank-mode.mjs";
import { parseDatabaseRoleEnv } from "../scripts/deploy/database-env.mjs";
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
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: url }), /PRODUCTION_DB_ALLOWED_HOSTS/);
  assert.deepEqual(resolveDatabaseTarget({ target: "production", databaseUrl: url, allowedProductionHosts: "db.example" }).database, "woori_today_portal");
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: url, allowedProductionHosts: "db.example", requireProductionApproval: true }), /disabled/);
  assert.deepEqual(resolveDatabaseTarget({ target: "production", databaseUrl: url, allowedProductionHosts: "db.example", requireProductionApproval: true, allowProductionMigration: "I_HAVE_APPROVAL" }).database, "woori_today_portal");
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: "postgres://u:p@db.example/woori_today_portal_dev", requireProductionApproval: true, allowProductionMigration: "I_HAVE_APPROVAL" }), /restricted to woori_today_portal/);
  assert.throws(() => resolveDatabaseTarget({ target: "production", databaseUrl: url, allowedProductionHosts: "other.example" }), /PRODUCTION_DB_ALLOWED_HOSTS/);
});

test("production DB operations require main Actions context, explicit approval, and backup", () => {
  const env = { DB_TARGET: "production", GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/main", PRODUCTION_OPERATION_APPROVAL: "configured", PRODUCTION_DB_ALLOWED_HOSTS: "db.example", PRODUCTION_BACKUP_CONFIRMED: "true", PRODUCTION_BACKUP_REFERENCE: "backup-20261021" };
  assert.equal(assertProductionOperation({ env, databaseUrl: "postgres://u:p@db.example/woori_today_portal", backupReference: "backup-20261021", requireBackup: true }).database, "woori_today_portal");
  assert.throws(() => assertProductionOperation({ env: { ...env, GITHUB_REF: "refs/heads/develop" }, databaseUrl: "postgres://u:p@db.example/woori_today_portal" }), /restricted/);
  assert.throws(() => assertProductionOperation({ env: { ...env, PRODUCTION_BACKUP_CONFIRMED: "false" }, databaseUrl: "postgres://u:p@db.example/woori_today_portal", backupReference: "backup-20261021", requireBackup: true }), /backup/);
  assert.throws(() => assertProductionOperation({ env: { ...env, PRODUCTION_OPERATION_APPROVAL: "" }, databaseUrl: "postgres://u:p@db.example/woori_today_portal" }), /approval secret/);
  assert.deepEqual(parseProductionApprovalArgs(["--dry-run"]), { apply: false, dryRun: true, backupReference: undefined });
  assert.throws(() => parseProductionApprovalArgs(["--apply"], { requireBackup: true }), /backup-reference/);
  assert.throws(() => parseProductionApprovalArgs(["--apply", "--dry-run"]), /Choose either/);
  assert.doesNotThrow(() => assertDatabaseRolesShareTarget(["postgres://runtime@db.example/woori_today_portal", "postgres://writer@db.example/woori_today_portal"]));
  assert.throws(() => assertDatabaseRolesShareTarget(["postgres://runtime@db.example/woori_today_portal", "postgres://writer@localhost/woori_today_portal"]), /same approved/);
  assert.throws(() => assertDatabaseRolesShareTarget(["postgres://runtime@db.example/woori_today_portal", "postgres://writer@db.example/other_db"]), /same approved/);
});

test("dotenv role URL parsing removes quotes and preserves URL-encoded special password characters", () => {
  const runtime = "postgresql://portal:p%40ss%23%24%26%3D%2B%2F%3A%25%27@postgres:5432/woori_today_portal";
  const importer = "postgresql://importer:imp%40ss%23@postgres:5432/woori_today_portal";
  const migration = "postgresql://migrator:mig%24ss%26@postgres:5432/woori_today_portal";
  const parsed = parseDatabaseRoleEnv(`DATABASE_URL='${runtime}'\nDB_IMPORT_URL="${importer}"\nDB_MIGRATION_URL=${migration}\nPRODUCTION_OPERATION_APPROVAL=must-not-forward\n`);
  assert.deepEqual(parsed, { DATABASE_URL: runtime, DB_IMPORT_URL: importer, DB_MIGRATION_URL: migration });
  assert.throws(() => parseDatabaseRoleEnv("DATABASE_URL='not a URL'\nDB_IMPORT_URL=x\nDB_MIGRATION_URL=x\n"), /valid PostgreSQL URL/);
  assert.throws(() => parseDatabaseRoleEnv("DATABASE_URL=postgres://only/woori_today_portal"), /DB_IMPORT_URL is missing/);
});

test("production publishing and immutable image references are restricted to main", () => {
  assert.equal(isMainProductionRelease({ ref: "refs/heads/main", eventName: "workflow_dispatch" }), true);
  assert.equal(isMainProductionRelease({ ref: "refs/heads/develop", eventName: "workflow_dispatch" }), false);
  assert.equal(isMainProductionRelease({ ref: "refs/heads/release", eventName: "push" }), false);
  assert.equal(assertCommitShaTag("a".repeat(40)), "a".repeat(40));
  assert.throws(() => assertCommitShaTag("abc123"), /40-character/);
  assert.equal(assertCommitDigest(`sha256:${"a".repeat(64)}`), `sha256:${"a".repeat(64)}`);
  assert.throws(() => assertCommitDigest("latest"), /immutable sha256/);
  const guard = fileURLToPath(new URL("../scripts/deploy/release-guard.mjs", import.meta.url));
  const childBaseEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
  const blocked = spawnSync(process.execPath, [guard], { encoding: "utf8", env: { ...childBaseEnv, GITHUB_REF: "refs/heads/develop", GITHUB_EVENT_NAME: "workflow_dispatch" } });
  const accepted = spawnSync(process.execPath, [guard], { encoding: "utf8", env: { ...childBaseEnv, GITHUB_REF: "refs/heads/main", GITHUB_EVENT_NAME: "workflow_dispatch" } });
  assert.equal(blocked.status, 1);
  assert.equal(accepted.status, 0);
});

test("World Bank reads default to JSON and production DB mode requires an approved remote host and flag", () => {
  assert.deepEqual(resolveWorldBankDataSource({}), { source: "json", target: null });
  assert.equal(resolveWorldBankDataSource({ WORLD_BANK_DATA_SOURCE: "db", DB_TARGET: "development", DATABASE_URL: "postgres://dev:pw@localhost/woori_today_portal_dev" }).target.database, "woori_today_portal_dev");
  const production = { WORLD_BANK_DATA_SOURCE: "db", DB_TARGET: "production", WORLD_BANK_DB_PRODUCTION_ENABLED: "true", PRODUCTION_DB_ALLOWED_HOSTS: "postgres", DATABASE_URL: "postgres://runtime:pw@postgres/woori_today_portal" };
  assert.equal(resolveWorldBankDataSource(production).target.database, "woori_today_portal");
  assert.throws(() => resolveWorldBankDataSource({ ...production, WORLD_BANK_DB_PRODUCTION_ENABLED: "false" }), /requires WORLD_BANK_DB_PRODUCTION_ENABLED/);
  assert.throws(() => resolveWorldBankDataSource({ ...production, PRODUCTION_DB_ALLOWED_HOSTS: "other" }), /PRODUCTION_DB_ALLOWED_HOSTS/);
  assert.throws(() => resolveWorldBankDataSource({ WORLD_BANK_DATA_SOURCE: "db", DB_TARGET: "development", DATABASE_URL: "postgres://dev:pw@postgres/woori_today_portal_dev" }), /local PostgreSQL host/);
});

test("only reviewed World Bank indicators use DB while all other indicators keep the JSON source", () => {
  assert.deepEqual(approvedWorldBankDbIndicators, ["SL.UEM.TOTL.ZS", "EG.ELC.ACCS.ZS"]);
  assert.equal(worldBankIndicatorSource("db", "SL.UEM.TOTL.ZS"), "db");
  assert.equal(worldBankIndicatorSource("db", "EG.ELC.ACCS.ZS"), "db");
  for (const indicator of ["SP.POP.TOTL", "NY.GDP.MKTP.CD", "unknown"]) {
    assert.equal(worldBankIndicatorSource("db", indicator), "json");
  }
  assert.equal(worldBankIndicatorSource("json", "SL.UEM.TOTL.ZS"), "json");
});

test("publish workflow is digest-pinned, main guarded, and limited to portal without replacing server env files", async () => {
  const workflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /scripts\/deploy\/release-guard\.mjs/);
  assert.match(workflow, /PORTAL_DIGEST/);
  assert.match(workflow, /--env-file \.env\.moneybook --env-file \.env\.portal/);
  assert.match(workflow, /test -r \.env\.portal/);
  assert.match(workflow, /\[DEPLOY 1\] %s/);
  assert.ok(workflow.includes('stage="Validate release references and server inputs"'));
  for (const stage of ["Validate Compose configuration", "Validate Portal network assignments", "Validate configured Portal image", "Validate Portal runtime database URL source", "Block privileged database variables in Portal runtime", "Verify current Portal and create a database backup", "Validate GHCR image access", "Preserve rollback image", "Deploy Portal image", "Wait for Portal Healthcheck", "HTTP smoke test"]) {
    assert.ok(workflow.includes(stage), `missing deployment stage: ${stage}`);
  }
  assert.match(workflow, /DEPLOY CHECK FAILED/);
  assert.match(workflow, /\[DEPLOY ERROR\] Stage: %s, Exit code: %s/);
  assert.match(workflow, /trap on_exit EXIT/);
  assert.match(workflow, /sort -nr \| sed -n '1p'/);
  assert.doesNotMatch(workflow, /sort -nr \| head/);
  assert.match(workflow, /DEPLOY ROLLBACK ERROR/);
  assert.doesNotMatch(workflow, /^\s*(?:printenv|env)(?:\s|$)/m);
  assert.doesNotMatch(workflow, /^\s*echo\s+.*(?:DATABASE_URL|DB_IMPORT_URL|DB_MIGRATION_URL)/m);
  assert.match(workflow, /up -d --no-deps portal/);
  assert.match(workflow, /\.source == "db" and \.indicator == "unemployment"/);
  assert.match(workflow, /\.source == "json" and \.indicator == "population"/);
  assert.match(workflow, /stale-while-revalidate=86400/);
  assert.match(workflow, /Could not remove the temporary smoke-test body/);
  assert.match(workflow, /rollback_tag/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /PRODUCTION_DB_ALLOWED_HOSTS: \$\{\{ secrets\.PRODUCTION_DB_ALLOWED_HOSTS \}\}/);
  assert.match(workflow, /--mount type=bind,src=\/opt\/services\/compose\/\.env\.portal,dst=\/app\/\.portal\.env,readonly/);
  assert.match(workflow, /\/app\/\.production-approval,readonly/);
  assert.match(workflow, /PRODUCTION_OPERATION_APPROVAL_FILE=\/app\/\.production-approval/);
  assert.doesNotMatch(workflow, /-e PRODUCTION_OPERATION_APPROVAL(?:\s|\\)/);
  assert.match(workflow, /unset PRODUCTION_OPERATION_APPROVAL/);
  assert.doesNotMatch(workflow, /docker run[^\n]*--env-file \.env\.portal/);
  assert.match(workflow, /DB_IMPORT_URL: ""\\n/);
  assert.match(workflow, /DB_MIGRATION_URL: ""\\n/);
  assert.match(workflow, /Non-empty privileged DB keys remain in Portal runtime/);
  assert.ok(workflow.indexOf("db_tools_run scripts/db/preflight-production.mjs") < workflow.indexOf("db_tools_run scripts/db/status-production.mjs"));
  assert.ok(workflow.indexOf("db_tools_run scripts/db/status-production.mjs") < workflow.indexOf("db_tools_run scripts/db/migrate-production.mjs"));
  assert.doesNotMatch(workflow, /docker compose down|compose down/);
  assert.doesNotMatch(workflow, /cp .*\.env\.portal|tee .*\.env\.portal/);
});

test("publish workflow rollback trap restores only Portal and preserves the original failure code", async (t) => {
  const workflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
  const functionStart = workflow.indexOf("            on_exit() {");
  const functionEnd = workflow.indexOf("            trap on_exit EXIT", functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart, "deployment exit trap must exist");
  const functionSource = workflow.slice(functionStart, functionEnd).split(/\r?\n/).map((line) => line.replace(/^ {12}/, "")).join("\n");
  const bashPath = process.platform === "win32"
    ? `${process.env.ProgramFiles ?? "C:\\Program Files"}\\Git\\bin\\bash.exe`
    : "bash";
  if (process.platform === "win32" && !existsSync(bashPath)) t.skip("Git Bash is unavailable for the rollback trap check");

  const harness = `${functionSource}
tmpdir="$(mktemp -d)"
override="$tmpdir/override.yml"
marker="$tmpdir/rollback-called"
(
  stage="HTTP smoke test"
  deploy_started=1
  rollback_tag="ghcr.io/alsruddns/woori-home:rollback-test"
  approval_file=""
  override="$override"
  compose() { printf 'called' > "$marker"; }
  docker() { printf 'healthy\\n'; }
  : > "$override"
  trap on_exit EXIT
  exit 23
)
status=$?
test "$status" -eq 23
test -s "$marker"
test ! -e "$override"
rm -rf "$tmpdir"
`;
  const result = spawnSync(bashPath, ["-s"], { input: harness, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("destructive SQL is blocked before an unapplied migration runs", () => {
  assert.doesNotThrow(() => assertNoDestructiveMigration("CREATE TABLE metrics (id text primary key)", "create.sql"));
  assert.throws(() => assertNoDestructiveMigration("ALTER TABLE metrics DROP COLUMN value", "drop.sql"), /destructive SQL/);
  assert.throws(() => assertNoDestructiveMigration("TRUNCATE TABLE metrics", "truncate.sql"), /destructive SQL/);
  const periodKeyMigration = "ALTER TABLE \"financial_company_facts\" ADD COLUMN \"period_key\" varchar(10) DEFAULT 'instant' NOT NULL; UPDATE \"financial_company_facts\" SET \"period_key\"=coalesce(\"start_date\",'instant'); ALTER TABLE \"financial_company_facts\" DROP CONSTRAINT \"financial_company_facts_pk\"; ALTER TABLE \"financial_company_facts\" ADD CONSTRAINT \"financial_company_facts_pk\" PRIMARY KEY(\"company_id\",\"period_key\");";
  assert.doesNotThrow(() => assertNoDestructiveMigration(periodKeyMigration, "0005_sec_fact_period_key.sql"));
  assert.throws(() => assertNoDestructiveMigration(`${periodKeyMigration} DROP TABLE metrics`, "0005_sec_fact_period_key.sql"), /destructive SQL/);
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
