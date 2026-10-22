import "server-only";
import pg from "pg";

const globalForFinancialDb = globalThis as typeof globalThis & { wooriFinancialReadPool?: pg.Pool };

function createFinancialReadPool() {
  const connectionString = process.env.FINANCIAL_READONLY_DATABASE_URL;
  if (!connectionString) throw new Error("Financial read-only database is not configured.");
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error("Financial read-only database configuration is invalid."); }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)) || !["woori_today_portal", "woori_today_portal_dev"].includes(decodeURIComponent(url.pathname.slice(1)))) {
    throw new Error("Financial read-only database target is not allowed.");
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
