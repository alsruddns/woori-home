import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { validateFinancialProductionContext, safeDatabaseErrorCode } from "./financial-production-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const allowPendingSecGrants = process.argv.length === 3 && process.argv[2] === "--allow-pending-sec-grants";
if (process.argv.length > 2 && !allowPendingSecGrants) {
  console.error("Usage: node scripts/db/preflight-financial-production.mjs [--allow-pending-sec-grants]");
  process.exit(2);
}
const expectedSource = {
  id: "sec-edgar-companyfacts",
  name: "SEC EDGAR Company Facts",
  provider: "U.S. Securities and Exchange Commission",
  source_url: "https://data.sec.gov/api/xbrl/companyfacts/",
  license_status: "verified",
  license_name: "SEC EDGAR public filing content reuse",
  license_url: "https://www.sec.gov/about/webmaster-frequently-asked-questions",
  attribution: "Source: U.S. Securities and Exchange Commission (SEC) EDGAR; values are issuer-reported and are not verified or endorsed by SEC.",
  rights_note: "Only SEC-extracted standard US-GAAP company facts from public filings are stored. Third-party exhibits, images, market prices and non-SEC content are excluded.",
};
const expectedDataset = {
  id: "sec-company-facts",
  source_id: expectedSource.id,
  name: "SEC Company Financial Facts",
  category: "financial-fundamentals",
  reference_period_kind: "fiscal-period",
  source_url: "https://www.sec.gov/edgar/sec-api-documentation",
};
const requiredTables = ["countries", "data_collection_runs", "data_sources", "datasets", "financial_assets", "financial_daily_prices", "indicator_observations", "indicators"];
const secTables = ["financial_companies", "financial_company_facts"];
const expectedSecColumns = {
  financial_companies: ["id", "source_id", "provider_company_id", "cik", "ticker", "name", "exchange", "country_code", "source_url", "updated_at"],
  financial_company_facts: ["company_id", "source_id", "dataset_id", "taxonomy", "concept", "unit", "value", "fiscal_year", "fiscal_period", "start_date", "end_date", "filed_date", "form", "accession_number", "source_url", "fetched_at"],
};
const expectedSecIndexes = ["financial_companies_pkey", "financial_companies_source_cik_unique_idx", "financial_companies_source_ticker_unique_idx", "financial_companies_ticker_idx", "financial_company_facts_pk", "financial_company_facts_end_date_idx", "financial_company_facts_period_idx"];
const stablePriceIndexes = ["financial_assets_pkey", "financial_assets_source_asset_unique_idx", "financial_assets_type_active_idx", "financial_daily_prices_pk", "financial_daily_prices_date_asset_idx", "financial_daily_prices_dataset_date_idx"];
const expectedExistingColumns = {
  indicator_observations: ["indicator_id", "country_iso3", "reference_year", "value", "published_at", "last_checked_at", "last_updated_at"],
  countries: ["iso2", "iso3", "localized_names", "region", "income_group", "is_aggregate"],
  indicators: ["id", "dataset_id", "code", "localized_names", "definition", "unit", "frequency", "is_modeled"],
  datasets: ["id", "source_id", "name", "category", "reference_period_kind", "source_url"],
  data_sources: ["id", "name", "provider", "source_url", "license_status", "license_name", "license_url", "attribution", "rights_note", "reviewed_at"],
  data_collection_runs: ["id", "dataset_id", "started_at", "finished_at", "status", "record_count", "scope", "inserted_count", "updated_count", "error_category", "error_message"],
  financial_assets: ["id", "source_id", "source_asset_id", "asset_type", "symbol", "name", "venue", "currency", "unit", "timezone", "metadata", "is_active"],
  financial_daily_prices: ["asset_id", "source_id", "dataset_id", "reference_date", "reference_timezone", "price_kind", "open", "high", "low", "close", "volume", "market_cap", "quote_change_percent", "quote_window", "is_adjusted", "fetched_at"],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameExpectedFields(actual, expected) {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

let targets;
try {
  const missingRoles = ["DATABASE_URL", "DB_IMPORT_URL", "DB_MIGRATION_URL"].filter((key) => !process.env[key]);
  if (missingRoles.length) {
    console.error(JSON.stringify({ status: "skipped", reason: "production-role-configuration-unavailable", missingRoles, checked: false, databaseConnectionOpened: false }));
    process.exit(2);
  }
  targets = validateFinancialProductionContext();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Production preflight configuration is invalid.");
  process.exit(1);
}

const journal = JSON.parse(await readFile(path.join(root, "drizzle/meta/_journal.json"), "utf8"));
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DB_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true, options: "-c default_transaction_read_only=on -c statement_timeout=15000 -c application_name=woori_financial_production_preflight" });
const report = { target: targets.DB_MIGRATION_URL.database, databaseRoles: {}, migrations: {}, tables: {}, indexes: [], catalogConflicts: [], runtimePrivileges: {}, importPrivileges: {}, permissionFindings: [], blockers: [] };

try {
  const identity = await pool.query("select current_database() as database_name, current_user as role_name, current_setting('transaction_read_only') as read_only");
  assert(identity.rows[0]?.database_name === "woori_today_portal", "Migration role connected to an unexpected database.");
  assert(identity.rows[0]?.role_name === "woori_portal_migration", "Migration role identity did not match the configured role.");
  assert(identity.rows[0]?.read_only === "on", "Production preflight migration connection is not read-only.");
  report.databaseRoles.migration = identity.rows[0].role_name;

  const historyExists = await pool.query("select to_regclass('drizzle.__drizzle_migrations') as history_table");
  const appliedResult = historyExists.rows[0]?.history_table
    ? await pool.query("select hash, created_at from drizzle.__drizzle_migrations order by created_at")
    : { rows: [] };
  const applied = appliedResult.rows;
  if (!historyExists.rows[0]?.history_table) report.blockers.push("Drizzle migration history table is missing.");
  let prefixIsValid = applied.length <= journal.entries.length;
  for (let index = 0; index < applied.length; index += 1) {
    const entry = journal.entries[index];
    if (!entry || Number(applied[index].created_at) !== Number(entry.when)) { prefixIsValid = false; break; }
    const sql = await readFile(path.join(root, "drizzle", `${entry.tag}.sql`));
    const expectedHash = createHash("sha256").update(sql).digest("hex");
    if (applied[index].hash !== expectedHash) { prefixIsValid = false; report.blockers.push(`Migration checksum differs for ${entry.tag}.`); }
  }
  report.migrations = { applied: applied.length, expected: journal.entries.length, pending: journal.entries.slice(applied.length).map((entry) => entry.tag), prefixIsValid };
  if (!prefixIsValid) report.blockers.push("Production migration history is not a matching prefix of the checked-in migration journal.");

  const tableResult = await pool.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name");
  const tableNames = new Set(tableResult.rows.map((row) => row.table_name));
  for (const name of [...requiredTables, "financial_assets", "financial_daily_prices"]) {
    report.tables[name] = tableNames.has(name);
    if (!tableNames.has(name)) report.blockers.push(`Required existing table ${name} is missing.`);
  }
  const appliedCount = applied.length;
  const secPresence = secTables.filter((name) => tableNames.has(name));
  if (appliedCount < 5 && secPresence.length) report.blockers.push("SEC tables exist without the corresponding recorded Migration 0004.");
  if (appliedCount >= 5 && secPresence.length !== secTables.length) report.blockers.push("Migration 0004 is recorded but its SEC table set is incomplete.");
  if (appliedCount >= 6 && secPresence.length !== secTables.length) report.blockers.push("Migration 0005 is recorded but SEC tables are missing.");

  const columns = await pool.query(`select table_name,column_name,data_type,udt_name,is_nullable,numeric_precision,numeric_scale,character_maximum_length
    from information_schema.columns where table_schema='public' and table_name = any($1::text[]) order by table_name,ordinal_position`, [[...secTables, ...Object.keys(expectedExistingColumns)]]);
  report.tables.secColumns = columns.rows;
  const columnsByTable = new Map();
  for (const row of columns.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
    columnsByTable.get(row.table_name).add(row.column_name);
  }
  report.schemaDifferences = [];
  for (const [table, expected] of Object.entries(expectedExistingColumns)) {
    const missing = expected.filter((column) => !columnsByTable.get(table)?.has(column));
    if (missing.length) report.schemaDifferences.push({ table, missingColumns: missing });
  }
  if (applied.length >= 5) {
    for (const [table, expected] of Object.entries(expectedSecColumns)) {
      const missing = expected.filter((column) => !columnsByTable.get(table)?.has(column));
      if (missing.length) report.schemaDifferences.push({ table, missingColumns: missing });
    }
  }
  if (applied.length >= 6 && !columnsByTable.get("financial_company_facts")?.has("period_key")) report.schemaDifferences.push({ table: "financial_company_facts", missingColumns: ["period_key"] });
  if (applied.length >= 5) {
    const factValue = columns.rows.find((row) => row.table_name === "financial_company_facts" && row.column_name === "value");
    if (factValue?.data_type !== "numeric" || Number(factValue.numeric_precision) !== 38 || Number(factValue.numeric_scale) !== 8 || factValue.is_nullable !== "NO") report.schemaDifferences.push({ table: "financial_company_facts", column: "value", expected: "NUMERIC(38,8) NOT NULL" });
    const periodKey = columns.rows.find((row) => row.table_name === "financial_company_facts" && row.column_name === "period_key");
    if (applied.length >= 6 && (periodKey?.data_type !== "character varying" || Number(periodKey.character_maximum_length) !== 10 || periodKey.is_nullable !== "NO")) report.schemaDifferences.push({ table: "financial_company_facts", column: "period_key", expected: "VARCHAR(10) NOT NULL" });
  }
  const indexes = await pool.query(`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename = any($1::text[]) order by tablename,indexname`, [[...secTables, "financial_assets", "financial_daily_prices"]]);
  report.indexes = indexes.rows;
  if (applied.length >= 4) {
    const actualPriceIndexes = new Set(indexes.rows.map((row) => row.indexname));
    // Migration 0012 intentionally replaces this unique index so assets sharing
    // a ticker across providers can coexist. Validate the schema expected at
    // the database's current migration point, allowing the migration to apply.
    const naturalKeyIndex = applied.length >= 13
      ? "financial_assets_natural_key_idx"
      : "financial_assets_natural_key_unique_idx";
    const expectedPriceIndexes = [...stablePriceIndexes, naturalKeyIndex];
    const missing = expectedPriceIndexes.filter((name) => !actualPriceIndexes.has(name));
    if (missing.length) report.schemaDifferences.push({ missingIndexes: missing });
  }
  if (applied.length >= 5) {
    const actualIndexes = new Set(indexes.rows.map((row) => row.indexname));
    const missing = expectedSecIndexes.filter((name) => !actualIndexes.has(name));
    if (missing.length) report.schemaDifferences.push({ missingIndexes: missing });
    if (applied.length >= 6) {
      const primaryKey = indexes.rows.find((row) => row.indexname === "financial_company_facts_pk");
      if (!primaryKey?.indexdef.includes("period_key")) report.schemaDifferences.push({ index: "financial_company_facts_pk", expectedKeyIncludes: "period_key" });
    }
    const foreignKeys = await pool.query(`select constraint_row.conname as name,
        source_ns.nspname || '.' || source_table.relname as table_name,
        target_ns.nspname || '.' || target_table.relname as referenced_table,
        constraint_row.confdeltype as delete_action
      from pg_constraint constraint_row
      join pg_class source_table on source_table.oid=constraint_row.conrelid
      join pg_namespace source_ns on source_ns.oid=source_table.relnamespace
      join pg_class target_table on target_table.oid=constraint_row.confrelid
      join pg_namespace target_ns on target_ns.oid=target_table.relnamespace
      where constraint_row.contype='f' and source_ns.nspname='public' and source_table.relname=any($1::text[])
      order by constraint_row.conname`, [["financial_companies", "financial_company_facts"]]);
    const expectedFks = new Map([
      ["financial_companies_source_id_data_sources_id_fk", "public.data_sources"],
      ["financial_company_facts_company_id_financial_companies_id_fk", "public.financial_companies"],
      ["financial_company_facts_source_id_data_sources_id_fk", "public.data_sources"],
      ["financial_company_facts_dataset_id_datasets_id_fk", "public.datasets"],
    ]);
    report.foreignKeys = foreignKeys.rows;
    for (const [name, referencedTable] of expectedFks) {
      const found = foreignKeys.rows.find((row) => row.name === name);
      if (!found || found.referenced_table !== referencedTable || found.delete_action !== "r") report.schemaDifferences.push({ foreignKey: name, expectedReferencedTable: referencedTable, onDelete: "RESTRICT" });
    }
  }
  if (report.schemaDifferences.length) report.blockers.push("Production tables differ from the checked-in World Bank and SEC schema expectations.");

  const sourceResult = await pool.query("select id,name,provider,source_url,license_status,license_name,license_url,attribution,rights_note from data_sources where id=$1", [expectedSource.id]);
  const datasetResult = await pool.query("select id,source_id,name,category,reference_period_kind,source_url from datasets where id=$1", [expectedDataset.id]);
  const sourceMatches = sameExpectedFields(sourceResult.rows[0], expectedSource);
  const datasetMatches = sameExpectedFields(datasetResult.rows[0], expectedDataset);
  report.catalogConflicts = [
    { table: "data_sources", id: expectedSource.id, exists: Boolean(sourceResult.rows[0]), matchesMigrationSeed: sourceMatches },
    { table: "datasets", id: expectedDataset.id, exists: Boolean(datasetResult.rows[0]), matchesMigrationSeed: datasetMatches },
  ];
  if (sourceResult.rows[0] && !sourceMatches) report.blockers.push("SEC data_sources ID exists with fields different from the Migration 0004 seed.");
  if (datasetResult.rows[0] && !datasetMatches) report.blockers.push("SEC datasets ID exists with fields different from the Migration 0004 seed.");

  if (tableNames.has("financial_companies") && tableNames.has("financial_company_facts")) {
    const xomRows = await pool.query(`select c.id::text as id,c.cik,c.ticker,c.name,c.exchange,
        count(f.company_id)::int as facts,
        count(f.company_id) filter(where f.form in ('10-K','10-K/A'))::int as annual_facts,
        count(f.company_id) filter(where f.form in ('10-Q','10-Q/A'))::int as quarterly_facts
      from financial_companies c
      left join financial_company_facts f on f.company_id=c.id and f.source_id=c.source_id
      where c.source_id=$1 and (c.ticker='XOM' or c.cik=any($2::text[]))
      group by c.id,c.cik,c.ticker,c.name,c.exchange order by c.cik,c.ticker`, [expectedSource.id, ["0000034088", "0002115436"]]);
    report.secIdentityDiagnostic = { purpose: "read-only SEC issuer identity conflict diagnosis", rows: xomRows.rows };
  }

  const runtime = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true, options: "-c default_transaction_read_only=on -c statement_timeout=10000 -c application_name=woori_financial_runtime_preflight" });
  const importer = new Pool({ connectionString: process.env.DB_IMPORT_URL, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true, options: "-c default_transaction_read_only=on -c statement_timeout=10000 -c application_name=woori_financial_import_preflight" });
  try {
    const [runtimeIdentity, importIdentity] = await Promise.all([
      runtime.query("select current_database() as database_name,current_user as role_name,current_setting('transaction_read_only') as read_only,(select rolsuper from pg_roles where rolname=current_user) as superuser,(select rolcreatedb from pg_roles where rolname=current_user) as create_database,(select rolcreaterole from pg_roles where rolname=current_user) as create_role,has_database_privilege(current_user,current_database(),'CREATE') as database_create,has_schema_privilege(current_user,'public','CREATE') as schema_create"),
      importer.query("select current_database() as database_name,current_user as role_name,current_setting('transaction_read_only') as read_only,(select rolsuper from pg_roles where rolname=current_user) as superuser,(select rolcreatedb from pg_roles where rolname=current_user) as create_database,(select rolcreaterole from pg_roles where rolname=current_user) as create_role,has_database_privilege(current_user,current_database(),'CREATE') as database_create,has_schema_privilege(current_user,'public','CREATE') as schema_create"),
    ]);
    assert(runtimeIdentity.rows[0]?.database_name === "woori_today_portal" && runtimeIdentity.rows[0]?.role_name === "woori_portal", "Runtime role identity did not match the configured role.");
    assert(importIdentity.rows[0]?.database_name === "woori_today_portal" && importIdentity.rows[0]?.role_name === "woori_portal_import", "Import role identity did not match the configured role.");
    assert(runtimeIdentity.rows[0]?.read_only === "on" && importIdentity.rows[0]?.read_only === "on", "Production privilege preflight connections are not read-only.");
    assert(!runtimeIdentity.rows[0].superuser && !importIdentity.rows[0].superuser, "Runtime and Import roles must not be superusers.");
    for (const [label, role] of [["Runtime", runtimeIdentity.rows[0]], ["Import", importIdentity.rows[0]]]) {
      if (role.create_database || role.create_role || role.database_create || role.schema_create) report.blockers.push(`${label} role has database, role, or schema creation privileges.`);
    }
    if (runtimeIdentity.rows[0].schema_create || runtimeIdentity.rows[0].database_create) report.blockers.push("Runtime role has database or schema CREATE privilege.");
    const schemaUsage = await pool.query(`select has_schema_privilege('woori_portal','public','USAGE') as runtime_usage,
        has_schema_privilege('woori_portal_import','public','USAGE') as import_usage`);
    report.schemaPrivileges = schemaUsage.rows[0];
    if (!schemaUsage.rows[0].runtime_usage || !schemaUsage.rows[0].import_usage) report.permissionFindings.push("Runtime and Import roles need USAGE on the public schema.");
    report.databaseRoles.runtime = runtimeIdentity.rows[0].role_name;
    report.databaseRoles.import = importIdentity.rows[0].role_name;
    const runtimeTableGrants = await runtime.query(`select table_name,
        has_table_privilege(current_user,format('public.%I',table_name),'SELECT') as can_select,
        has_table_privilege(current_user,format('public.%I',table_name),'INSERT') as can_insert,
        has_table_privilege(current_user,format('public.%I',table_name),'UPDATE') as can_update,
        has_table_privilege(current_user,format('public.%I',table_name),'DELETE') as can_delete,
        has_table_privilege(current_user,format('public.%I',table_name),'TRUNCATE') as can_truncate
      from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
    for (const row of runtimeTableGrants.rows) {
      report.runtimePrivileges[row.table_name] = row;
      if (row.can_insert || row.can_update || row.can_delete || row.can_truncate) report.blockers.push(`Runtime role has a write privilege on ${row.table_name}.`);
    }
    for (const table of requiredTables) {
      const row = runtimeTableGrants.rows.find((grant) => grant.table_name === table);
      if (!row?.can_select) report.blockers.push(`Runtime role lacks SELECT on ${table}.`);
    }
    for (const table of secTables) {
      if (tableNames.has(table)) {
        const runtimeGrant = runtimeTableGrants.rows.find((row) => row.table_name === table);
        if (!runtimeGrant?.can_select) report.permissionFindings.push(`Runtime role lacks SELECT on ${table}.`);
        const importCheck = await importer.query(`select has_table_privilege(current_user,$1,'SELECT') as can_select,has_table_privilege(current_user,$1,'INSERT') as can_insert,has_table_privilege(current_user,$1,'UPDATE') as can_update,has_table_privilege(current_user,$1,'DELETE') as can_delete,has_table_privilege(current_user,$1,'TRUNCATE') as can_truncate`, [`public.${table}`]);
        report.importPrivileges[table] = importCheck.rows[0];
        if (!importCheck.rows[0].can_select || !importCheck.rows[0].can_insert || !importCheck.rows[0].can_update) report.permissionFindings.push(`Import role is missing required SEC write grants on ${table}.`);
        if (importCheck.rows[0].can_delete || importCheck.rows[0].can_truncate) report.blockers.push(`Import role has destructive grants on ${table}.`);
      } else {
        report.runtimePrivileges[table] = "not-created-yet";
        report.importPrivileges[table] = "not-created-yet";
      }
    }
    for (const table of ["data_sources", "datasets", "data_collection_runs"]) {
      const privilege = await importer.query(`select has_table_privilege(current_user,$1,'SELECT') as can_select,
          has_table_privilege(current_user,$1,'INSERT') as can_insert,has_table_privilege(current_user,$1,'UPDATE') as can_update,
          has_table_privilege(current_user,$1,'DELETE') as can_delete`, [`public.${table}`]);
      const expectedWrite = table === "data_collection_runs";
      if (!privilege.rows[0].can_select || (expectedWrite && (!privilege.rows[0].can_insert || !privilege.rows[0].can_update))) report.permissionFindings.push(`Import role is missing required read/write grants on ${table}.`);
      if (privilege.rows[0].can_delete) report.blockers.push(`Import role has DELETE on ${table}.`);
    }
  } finally {
    await runtime.end();
    await importer.end();
  }

  const worldBank = await pool.query(`select count(*)::int as observations from indicator_observations`);
  const databaseSize = await pool.query("select pg_database_size(current_database())::text as size_bytes");
  report.worldBank = { tablePresent: true, observations: worldBank.rows[0].observations };
  report.databaseSizeBytes = databaseSize.rows[0].size_bytes;
  report.comparison = { checkedInMigrationCount: journal.entries.length, productionAppliedCount: applied.length, difference: Math.max(0, journal.entries.length - applied.length), method: "production catalog and migration history compared with checked-in migration journal; no development DB connection used" };

  if (!allowPendingSecGrants && report.permissionFindings.length) report.blockers.push("Required Runtime or Import privileges are missing; run the separately approved grant step, then preflight again.");

  if (report.secIdentityDiagnostic) console.error(JSON.stringify(report.secIdentityDiagnostic));
  console.log(JSON.stringify(report, null, 2));
  if (report.blockers.length) process.exitCode = 2;
} catch (error) {
  const code = safeDatabaseErrorCode(error);
  console.error(JSON.stringify({ target: "production", error: code, message: error instanceof Error && !("code" in error) ? error.message : "Read-only production preflight failed.", blockers: report.blockers }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
