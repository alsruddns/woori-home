const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const DEVELOPMENT_DATABASE = "woori_today_portal_dev";
const PRODUCTION_DATABASE = "woori_today_portal";

export function resolveDatabaseTarget({
  target = process.env.DB_TARGET,
  databaseUrl = process.env.DB_MIGRATION_URL ?? (target === "development" ? process.env.DATABASE_URL : undefined),
  allowProductionMigration = process.env.DB_MIGRATION_ALLOW_PRODUCTION,
  requireProductionApproval = false,
  allowedProductionHosts = process.env.PRODUCTION_DB_ALLOWED_HOSTS,
} = {}) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and configure the local development database.");
  if (target !== "development" && target !== "production") {
    throw new Error("DB_TARGET must explicitly be 'development' or 'production'. No database connection was opened.");
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (target === "development") {
    if (database !== DEVELOPMENT_DATABASE) {
      throw new Error(`Development DB access is restricted to ${DEVELOPMENT_DATABASE}; no connection was opened.`);
    }
    if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      throw new Error("Development DB access is restricted to a local PostgreSQL host; no connection was opened.");
    }
  } else {
    if (database !== PRODUCTION_DATABASE) {
      throw new Error(`Production DB access is restricted to ${PRODUCTION_DATABASE}; no connection was opened.`);
    }
    const allowedHosts = String(allowedProductionHosts ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
    if (allowedHosts.length === 0 || !allowedHosts.includes(url.hostname.toLowerCase())) {
      throw new Error("Production DB host is not in PRODUCTION_DB_ALLOWED_HOSTS; no connection was opened.");
    }
    if (requireProductionApproval && allowProductionMigration !== "I_HAVE_APPROVAL") {
      throw new Error("Production migration is disabled. A separately approved operation must set DB_MIGRATION_ALLOW_PRODUCTION=I_HAVE_APPROVAL.");
    }
  }

  return { target, database, url: databaseUrl };
}

export function assertNoDestructiveMigration(sql, filename) {
  const destructive = /\b(?:DROP\s+(?:TABLE|COLUMN|SCHEMA|TYPE|INDEX|CONSTRAINT)|TRUNCATE\b|DELETE\s+FROM\b)/i;
  const primaryKeyReplacement = filename === "0005_sec_fact_period_key.sql"
    && /ALTER\s+TABLE\s+"financial_company_facts"\s+DROP\s+CONSTRAINT\s+"financial_company_facts_pk"/i.test(sql)
    && /ALTER\s+TABLE\s+"financial_company_facts"\s+ADD\s+CONSTRAINT\s+"financial_company_facts_pk"\s+PRIMARY\s+KEY\s*\([^;]*"period_key"\)/i.test(sql)
    && /UPDATE\s+"financial_company_facts"\s+SET\s+"period_key"\s*=\s*coalesce\("start_date",'instant'\)/i.test(sql)
    && !destructive.test(sql.replace(/ALTER\s+TABLE\s+"financial_company_facts"\s+DROP\s+CONSTRAINT\s+"financial_company_facts_pk"/i, ""));
  const financialRightsCheckReplacement = filename === "0007_graceful_cerise.sql"
    && /^\s*ALTER TABLE "data_sources" DROP CONSTRAINT "data_sources_financial_rights_check";--> statement-breakpoint\s*ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_financial_rights_check" CHECK \(jsonb_typeof\("data_sources"\."financial_rights"\) = 'object' and "data_sources"\."financial_rights" \?& array\['apiAccess','publicDisplay','dbStorage','longTermRetention','userApi','csvRedistribution','derivedVisualization'\].*\);\s*$/s.test(sql);
  const financialCurrencyWidening = filename === "0008_acoustic_loki.sql"
    && /^\s*ALTER TABLE "financial_assets" DROP CONSTRAINT "financial_assets_currency_check";--> statement-breakpoint\s*ALTER TABLE "financial_assets" ALTER COLUMN "currency" SET DATA TYPE varchar\(8\) USING btrim\("currency"\)::varchar\(8\);--> statement-breakpoint\s*ALTER TABLE "financial_assets" ADD CONSTRAINT "financial_assets_currency_check" CHECK \("financial_assets"\."currency" ~ '\^\[A-Z\]\{3,8\}\$'\);\s*$/s.test(sql);
  if (destructive.test(sql) && !primaryKeyReplacement && !financialRightsCheckReplacement && !financialCurrencyWidening) {
    throw new Error(`Migration ${filename} contains a destructive SQL statement. Review it and use a separately approved migration process.`);
  }
}
