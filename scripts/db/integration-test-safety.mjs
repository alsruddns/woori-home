export const INTEGRATION_TEST_DATABASE = "woori_today_portal_test";
const allowedHosts = new Set(["localhost", "127.0.0.1", "postgres"]);

export class IntegrationTestSafetyError extends Error {}

export function parseIntegrationTestTarget(value) {
  if (!value) throw new IntegrationTestSafetyError("TEST_DATABASE_URL is required for database integration tests.");
  let url;
  try { url = new URL(value); } catch { throw new IntegrationTestSafetyError("TEST_DATABASE_URL must be a PostgreSQL URL."); }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)
    || database !== INTEGRATION_TEST_DATABASE
    || !allowedHosts.has(url.hostname.toLowerCase())
    || (url.hostname.toLowerCase() === "postgres" && url.port !== "5432")
    || (url.port && (Number(url.port) < 1 || Number(url.port) > 65535))
    || [...url.searchParams.keys()].length > 0
    || url.hash) {
    throw new IntegrationTestSafetyError("Database integration tests are restricted to woori_today_portal_test on local PostgreSQL 16.");
  }
  if (decodeURIComponent(url.username).toLowerCase() !== "woori_test") {
    throw new IntegrationTestSafetyError("Database integration tests require the dedicated woori_test role.");
  }
  return { database, host: url.hostname.toLowerCase(), url: value };
}
