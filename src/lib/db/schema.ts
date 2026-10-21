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

export const dataSources = pgTable("data_sources", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  sourceUrl: text("source_url").notNull(),
  licenseStatus: varchar("license_status", { length: 24 }).notNull().default("unknown"),
  licenseName: text("license_name"),
  licenseUrl: text("license_url"),
  attribution: text("attribution"),
  rightsNote: text("rights_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("data_sources_license_status_check", sql`${table.licenseStatus} in ('verified', 'conditional', 'restricted', 'unknown')`),
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
