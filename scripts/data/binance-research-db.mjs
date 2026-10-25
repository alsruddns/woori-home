export const RESEARCH_DATABASE_NAME = "woori_crypto_research";
export const RESEARCH_DATABASE_ROLE = "woori_crypto_research_app";

export function researchDatabaseUrl(env = process.env) {
  const connectionString = env.BINANCE_RESEARCH_DATABASE_URL;
  if (!connectionString) throw new Error("Set BINANCE_RESEARCH_DATABASE_URL to the dedicated local woori_crypto_research database.");
  let url;
  try { url = new URL(connectionString); } catch { throw new Error("BINANCE_RESEARCH_DATABASE_URL must be a valid PostgreSQL URL."); }
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!loopbackHosts.has(url.hostname) || url.port !== "55432" || decodeURIComponent(url.pathname.slice(1)) !== RESEARCH_DATABASE_NAME || decodeURIComponent(url.username) !== RESEARCH_DATABASE_ROLE) {
    throw new Error("Research DB must use loopback port 55432, database woori_crypto_research, and role woori_crypto_research_app.");
  }
  for (const key of ["DATABASE_URL", "DB_IMPORT_URL", "DB_MIGRATION_URL", "FINANCIAL_READONLY_DATABASE_URL"]) {
    if (env[key] && env[key] === connectionString) throw new Error("The Binance research DB URL must not reuse a Portal or production DB credential.");
  }
  return connectionString;
}
