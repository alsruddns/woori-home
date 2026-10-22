export const TEST_DATABASE_HOST = "woori-pg-restore-test";
export const TEST_DATABASE_NAME = "woori_migration_test";

export class MigrationTestSafetyError extends Error {}

export const EXPECTED_MIGRATION_TAGS = [
  "0000_init_data_catalog",
  "0001_worldbank_collection_counts",
  "0002_worldbank_country_metadata",
  "0003_financial_market_data",
  "0004_sec_company_facts",
  "0005_sec_fact_period_key",
];

export const EXPECTED_TABLES = [
  "countries",
  "data_collection_runs",
  "data_sources",
  "datasets",
  "financial_assets",
  "financial_companies",
  "financial_company_facts",
  "financial_daily_prices",
  "indicator_observations",
  "indicators",
];

export const EXPECTED_INDEXES = [
  "countries_iso2_unique_idx",
  "countries_pkey",
  "data_collection_runs_dataset_started_idx",
  "data_collection_runs_pkey",
  "data_sources_pkey",
  "datasets_pkey",
  "datasets_source_id_idx",
  "financial_assets_natural_key_unique_idx",
  "financial_assets_pkey",
  "financial_assets_source_asset_unique_idx",
  "financial_assets_type_active_idx",
  "financial_companies_pkey",
  "financial_companies_source_cik_unique_idx",
  "financial_companies_source_ticker_unique_idx",
  "financial_companies_ticker_idx",
  "financial_company_facts_end_date_idx",
  "financial_company_facts_period_idx",
  "financial_company_facts_pk",
  "financial_daily_prices_date_asset_idx",
  "financial_daily_prices_dataset_date_idx",
  "financial_daily_prices_pk",
  "indicator_observations_country_year_idx",
  "indicator_observations_indicator_year_idx",
  "indicator_observations_pk",
  "indicators_dataset_code_unique_idx",
  "indicators_dataset_id_idx",
  "indicators_pkey",
];

function assertExactNames(actual, expected, label) {
  const sorted = [...actual].sort();
  const wanted = [...expected].sort();
  if (sorted.length !== wanted.length || sorted.some((name, index) => name !== wanted[index])) {
    throw new MigrationTestSafetyError(`Migration test schema does not match the expected ${label} set.`);
  }
}

export function parseMigrationTestTarget(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new MigrationTestSafetyError("Set MIGRATION_TEST_DATABASE_URL for the isolated migration test database.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new MigrationTestSafetyError("MIGRATION_TEST_DATABASE_URL must be a PostgreSQL URL.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:")
    || url.hostname.toLowerCase() !== TEST_DATABASE_HOST
    || url.port !== "5432"
    || database !== TEST_DATABASE_NAME
    || [...url.searchParams.keys()].length > 0
    || url.hash) {
    throw new MigrationTestSafetyError("Migration test access is restricted to woori_migration_test on woori-pg-restore-test:5432.");
  }
  if (!url.username) throw new MigrationTestSafetyError("MIGRATION_TEST_DATABASE_URL must include the test database role.");

  return { database, host: TEST_DATABASE_HOST, url: value };
}

export function classifyMigrationTestState({ publicTables, migrationSchemaExists, migrationTableExists, otherSchemas = [], appliedRows, migrationTimes }) {
  if (!migrationSchemaExists && !migrationTableExists && otherSchemas.length === 0 && publicTables.length === 0 && appliedRows.length === 0) return "fresh";

  const applied = appliedRows.map((row) => Number(row.created_at));
  const uniqueApplied = new Set(applied);
  const expectedTimes = migrationTimes.map(Number);
  if (migrationSchemaExists
    && migrationTableExists
    && otherSchemas.length === 0
    && publicTables.length === EXPECTED_TABLES.length
    && EXPECTED_TABLES.every((table) => publicTables.includes(table))
    && applied.length === EXPECTED_MIGRATION_TAGS.length
    && uniqueApplied.size === EXPECTED_MIGRATION_TAGS.length
    && applied.every((time) => expectedTimes.includes(time))) return "already-migrated";

  throw new MigrationTestSafetyError("Test database is neither empty nor a complete 0000–0003 migration result; refusing to change it.");
}

export function verifyMigrationTestSchema({ appliedRows, migrationTimes, tables, indexes }) {
  const applied = appliedRows.map((row) => Number(row.created_at));
  const expectedTimes = migrationTimes.map(Number);
  if (applied.length !== expectedTimes.length || new Set(applied).size !== expectedTimes.length) {
    throw new MigrationTestSafetyError(`Migration history must contain exactly ${expectedTimes.length} unique applied entries.`);
  }
  assertExactNames(applied, expectedTimes, "migration history");
  assertExactNames(tables, EXPECTED_TABLES, "table");
  assertExactNames(indexes, EXPECTED_INDEXES, "index");
  return { applied: applied.length, pending: 0, tables: tables.length, indexes: indexes.length };
}
