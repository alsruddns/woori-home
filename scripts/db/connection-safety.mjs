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
  if (destructive.test(sql)) {
    throw new Error(`Migration ${filename} contains a destructive SQL statement. Review it and use a separately approved migration process.`);
  }
}
