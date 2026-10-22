import "server-only";
import pg from "pg";

const globalForFinancialDb = globalThis as typeof globalThis & { wooriFinancialReadPool?: pg.Pool };

function createFinancialReadPool() {
  const connectionString = process.env.FINANCIAL_READONLY_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw Object.assign(new Error("Financial read-only database is not configured."), { code: "financial-db-config-missing" });
  let url: URL;
  try { url = new URL(connectionString); } catch { throw Object.assign(new Error("Financial read-only database configuration is invalid."), { code: "financial-db-config-invalid" }); }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)) || !["woori_today_portal", "woori_today_portal_dev"].includes(decodeURIComponent(url.pathname.slice(1)))) {
    throw Object.assign(new Error("Financial read-only database target is not allowed."), { code: "financial-db-target-rejected" });
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (database === "woori_today_portal") {
    const allowedHosts = String(process.env.PRODUCTION_DB_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
    if (!allowedHosts.includes(url.hostname.toLowerCase())) throw Object.assign(new Error("Financial read-only database production host is not allowed."), { code: "financial-db-target-rejected" });
  } else if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname.toLowerCase())) {
    throw Object.assign(new Error("Financial read-only database development host is not allowed."), { code: "financial-db-target-rejected" });
  }
  return new pg.Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    options: "-c default_transaction_read_only=on -c statement_timeout=5000 -c application_name=woori_finance_readonly",
  });
}

export function getFinancialReadOnlyPool() {
  globalForFinancialDb.wooriFinancialReadPool ??= createFinancialReadPool();
  return globalForFinancialDb.wooriFinancialReadPool;
}
