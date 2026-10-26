import {
  boolean,
  check,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type FinancialRightStatus = "confirmed" | "pending" | "restricted" | "denied";
export type FinancialRightsDocument = Record<"apiAccess" | "publicDisplay" | "dbStorage" | "longTermRetention" | "userApi" |
  "csvRedistribution" | "derivedVisualization" | "dailySnapshot" | "adSupportedDisplay" | "competitorPermission", FinancialRightStatus> & {
    commercialUse?: FinancialRightStatus;
    evidence?: Record<string, { url: string; reviewedAt: string; scope: string }>;
  };

export const dataSources = pgTable("data_sources", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  sourceUrl: text("source_url").notNull(),
  licenseStatus: varchar("license_status", { length: 24 }).notNull().default("unknown"),
  licenseName: text("license_name"),
  licenseUrl: text("license_url"),
  financialRights: jsonb("financial_rights").$type<FinancialRightsDocument>().notNull().default({
    apiAccess: "pending", publicDisplay: "pending", dbStorage: "pending", longTermRetention: "pending",
    userApi: "pending", csvRedistribution: "pending", derivedVisualization: "pending", dailySnapshot: "pending",
    adSupportedDisplay: "pending", competitorPermission: "pending",
  }),
  termsVersion: text("terms_version"),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true, mode: "date" }),
  collectionEnabled: boolean("collection_enabled").notNull().default(false),
  attribution: text("attribution"),
  rightsNote: text("rights_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("data_sources_license_status_check", sql`${table.licenseStatus} in ('verified', 'conditional', 'restricted', 'unknown')`),
  check("data_sources_financial_rights_check", sql`jsonb_typeof(${table.financialRights}) = 'object' and ${table.financialRights} ?& array['apiAccess','publicDisplay','dbStorage','longTermRetention','userApi','csvRedistribution','derivedVisualization','dailySnapshot','adSupportedDisplay','competitorPermission'] and ${table.financialRights}->>'apiAccess' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'publicDisplay' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'dbStorage' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'longTermRetention' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'userApi' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'csvRedistribution' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'derivedVisualization' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'dailySnapshot' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'adSupportedDisplay' in ('confirmed','pending','restricted','denied') and ${table.financialRights}->>'competitorPermission' in ('confirmed','pending','restricted','denied')`),
]);

export const datasets = pgTable("datasets", {
  id: varchar("id", { length: 120 }).primaryKey(),
  sourceId: varchar("source_id", { length: 80 }).notNull().references(() => dataSources.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  referencePeriodKind: varchar("reference_period_kind", { length: 24 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [index("datasets_source_id_idx").on(table.sourceId)]);

export const countries = pgTable("countries", {
  iso3: char("iso3", { length: 3 }).primaryKey(),
  iso2: char("iso2", { length: 2 }),
  worldBankCode: varchar("world_bank_code", { length: 12 }),
  localizedNames: jsonb("localized_names").$type<Record<string, string>>().notNull().default({}),
  region: text("region"),
  incomeGroup: text("income_group"),
  isAggregate: boolean("is_aggregate").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("countries_iso2_unique_idx").on(table.iso2)]);

export const indicators = pgTable("indicators", {
  id: varchar("id", { length: 120 }).primaryKey(),
  datasetId: varchar("dataset_id", { length: 120 }).notNull().references(() => datasets.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 160 }).notNull(),
  localizedNames: jsonb("localized_names").$type<Record<string, string>>().notNull().default({}),
  definition: jsonb("definition").$type<Record<string, string>>().notNull().default({}),
  unit: text("unit").notNull(),
  frequency: varchar("frequency", { length: 24 }).notNull(),
  isModeled: boolean("is_modeled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("indicators_dataset_code_unique_idx").on(table.datasetId, table.code),
  index("indicators_dataset_id_idx").on(table.datasetId),
]);

export const observations = pgTable("indicator_observations", {
  indicatorId: varchar("indicator_id", { length: 120 }).notNull().references(() => indicators.id, { onDelete: "restrict" }),
  countryIso3: char("country_iso3", { length: 3 }).notNull().references(() => countries.iso3, { onDelete: "restrict" }),
  referenceYear: integer("reference_year").notNull(),
  value: numeric("value", { precision: 30, scale: 10 }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: "date" }).notNull(),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.indicatorId, table.countryIso3, table.referenceYear], name: "indicator_observations_pk" }),
  index("indicator_observations_country_year_idx").on(table.countryIso3, table.referenceYear),
  index("indicator_observations_indicator_year_idx").on(table.indicatorId, table.referenceYear),
  check("indicator_observations_reference_year_check", sql`${table.referenceYear} between 1800 and 2200`),
]);

export const dataCollectionRuns = pgTable("data_collection_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  datasetId: varchar("dataset_id", { length: 120 }).notNull().references(() => datasets.id, { onDelete: "restrict" }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  status: varchar("status", { length: 16 }).notNull(),
  latestReferencePeriod: varchar("latest_reference_period", { length: 32 }),
  snapshotVersion: varchar("snapshot_version", { length: 80 }),
  checksum: varchar("checksum", { length: 128 }),
  recordCount: integer("record_count"),
  scope: jsonb("scope").$type<Record<string, unknown>>().notNull().default({}),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  errorCategory: varchar("error_category", { length: 80 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("data_collection_runs_dataset_started_idx").on(table.datasetId, table.startedAt),
  check("data_collection_runs_status_check", sql`${table.status} in ('success', 'unchanged', 'failed', 'partial', 'disabled')`),
  check("data_collection_runs_record_count_check", sql`${table.recordCount} is null or ${table.recordCount} >= 0`),
]);

// A shared asset catalog keeps equities, crypto, benchmarks, commodities,
// currencies, and rates in one extensible shape without creating empty tables.
export const financialAssets = pgTable("financial_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: varchar("source_id", { length: 80 }).notNull().references(() => dataSources.id, { onDelete: "restrict" }),
  sourceAssetId: varchar("source_asset_id", { length: 180 }).notNull(),
  assetType: varchar("asset_type", { length: 24 }).notNull(),
  symbol: varchar("symbol", { length: 40 }).notNull(),
  name: text("name").notNull(),
  venue: varchar("venue", { length: 80 }).notNull().default("global"),
  countryCode: char("country_code", { length: 2 }),
  currency: varchar("currency", { length: 8 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  sector: text("sector"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("financial_assets_source_asset_unique_idx").on(table.sourceId, table.sourceAssetId),
  index("financial_assets_natural_key_idx").on(table.assetType, table.symbol, table.venue, table.currency),
  index("financial_assets_type_active_idx").on(table.assetType, table.isActive),
  check("financial_assets_type_check", sql`${table.assetType} in ('stock', 'crypto', 'metal', 'energy', 'agriculture', 'fx', 'rate', 'index')`),
  check("financial_assets_symbol_check", sql`length(trim(${table.symbol})) > 0`),
  check("financial_assets_currency_check", sql`${table.currency} ~ '^[A-Z]{3,8}$'`),
  check("financial_assets_timezone_check", sql`length(trim(${table.timezone})) > 0`),
]);

export const financialDailyPrices = pgTable("financial_daily_prices", {
  assetId: uuid("asset_id").notNull().references(() => financialAssets.id, { onDelete: "restrict" }),
  sourceId: varchar("source_id", { length: 80 }).notNull().references(() => dataSources.id, { onDelete: "restrict" }),
  datasetId: varchar("dataset_id", { length: 120 }).notNull().references(() => datasets.id, { onDelete: "restrict" }),
  referenceDate: varchar("reference_date", { length: 10 }).notNull(),
  referenceTimezone: varchar("reference_timezone", { length: 64 }).notNull(),
  priceKind: varchar("price_kind", { length: 32 }).notNull().default("close"),
  open: numeric("open", { precision: 30, scale: 10 }),
  high: numeric("high", { precision: 30, scale: 10 }),
  low: numeric("low", { precision: 30, scale: 10 }),
  close: numeric("close", { precision: 30, scale: 10 }).notNull(),
  volume: numeric("volume", { precision: 38, scale: 10 }),
  marketCap: numeric("market_cap", { precision: 38, scale: 10 }),
  quoteChangePercent: numeric("quote_change_percent", { precision: 20, scale: 10 }),
  quoteWindow: varchar("quote_window", { length: 16 }),
  isAdjusted: boolean("is_adjusted").notNull().default(false),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.assetId, table.sourceId, table.referenceDate, table.priceKind], name: "financial_daily_prices_pk" }),
  index("financial_daily_prices_date_asset_idx").on(table.referenceDate, table.assetId),
  index("financial_daily_prices_dataset_date_idx").on(table.datasetId, table.referenceDate),
  check("financial_daily_prices_date_check", sql`${table.referenceDate} ~ '^\\d{4}-\\d{2}-\\d{2}$'`),
  check("financial_daily_prices_close_check", sql`${table.close} > 0`),
  check("financial_daily_prices_ohlc_check", sql`(${table.low} is null or ${table.high} is null or ${table.low} <= ${table.high}) and (${table.open} is null or ${table.low} is null or ${table.open} >= ${table.low}) and (${table.open} is null or ${table.high} is null or ${table.open} <= ${table.high}) and (${table.close} >= coalesce(${table.low}, ${table.close})) and (${table.close} <= coalesce(${table.high}, ${table.close}))`),
  check("financial_daily_prices_volume_check", sql`${table.volume} is null or ${table.volume} >= 0`),
  check("financial_daily_prices_market_cap_check", sql`${table.marketCap} is null or ${table.marketCap} >= 0`),
  check("financial_daily_prices_quote_check", sql`${table.quoteWindow} is null or ${table.quoteWindow} in ('24h','session')`),
]);

export const financialCompanies = pgTable("financial_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: varchar("source_id", { length: 80 }).notNull().references(() => dataSources.id, { onDelete: "restrict" }),
  providerCompanyId: varchar("provider_company_id", { length: 24 }).notNull(),
  cik: varchar("cik", { length: 10 }).notNull(),
  ticker: varchar("ticker", { length: 12 }).notNull(),
  name: text("name").notNull(),
  exchange: varchar("exchange", { length: 24 }),
  sector: varchar("sector", { length: 32 }).notNull().default("other"),
  sicCode: varchar("sic_code", { length: 4 }),
  industry: text("industry"),
  lastSubmissionAccession: varchar("last_submission_accession", { length: 24 }),
  lastSubmissionFiledDate: char("last_submission_filed_date", { length: 10 }),
  lastSubmissionForm: varchar("last_submission_form", { length: 12 }),
  countryCode: char("country_code", { length: 2 }).notNull().default("US"),
  sourceUrl: text("source_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("financial_companies_source_cik_unique_idx").on(table.sourceId, table.cik),
  uniqueIndex("financial_companies_source_ticker_unique_idx").on(table.sourceId, table.ticker),
  index("financial_companies_ticker_idx").on(table.ticker),
  index("financial_companies_source_sector_ticker_idx").on(table.sourceId, table.sector, table.ticker),
  check("financial_companies_sector_check", sql`${table.sector} in ('information-technology','semiconductors','financials','healthcare','consumer','energy','industrials','communications','utilities','real-estate','other')`),
  check("financial_companies_sic_check", sql`${table.sicCode} is null or ${table.sicCode} ~ '^\\d{4}$'`),
  check("financial_companies_submission_filed_date_check", sql`${table.lastSubmissionFiledDate} is null or ${table.lastSubmissionFiledDate} ~ '^\\d{4}-\\d{2}-\\d{2}$'`),
  check("financial_companies_submission_form_check", sql`${table.lastSubmissionForm} is null or ${table.lastSubmissionForm} in ('10-K','10-Q','10-K/A','10-Q/A')`),
]);

export const financialCompanyFacts = pgTable("financial_company_facts", {
  companyId: uuid("company_id").notNull().references(() => financialCompanies.id, { onDelete: "restrict" }),
  sourceId: varchar("source_id", { length: 80 }).notNull().references(() => dataSources.id, { onDelete: "restrict" }),
  datasetId: varchar("dataset_id", { length: 120 }).notNull().references(() => datasets.id, { onDelete: "restrict" }),
  taxonomy: varchar("taxonomy", { length: 40 }).notNull(),
  concept: varchar("concept", { length: 180 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  value: numeric("value", { precision: 38, scale: 8 }).notNull(),
  periodKey: varchar("period_key", { length: 10 }).notNull(),
  fiscalYear: integer("fiscal_year"),
  fiscalPeriod: varchar("fiscal_period", { length: 8 }),
  startDate: varchar("start_date", { length: 10 }),
  endDate: varchar("end_date", { length: 10 }).notNull(),
  filedDate: varchar("filed_date", { length: 10 }).notNull(),
  form: varchar("form", { length: 12 }).notNull(),
  accessionNumber: varchar("accession_number", { length: 24 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.companyId, table.taxonomy, table.concept, table.unit, table.endDate, table.accessionNumber, table.periodKey], name: "financial_company_facts_pk" }),
  index("financial_company_facts_end_date_idx").on(table.endDate, table.companyId),
  index("financial_company_facts_period_idx").on(table.fiscalYear, table.fiscalPeriod),
  check("financial_company_facts_dates_check", sql`${table.endDate} ~ '^\\d{4}-\\d{2}-\\d{2}$' and ${table.filedDate} ~ '^\\d{4}-\\d{2}-\\d{2}$'`),
]);
