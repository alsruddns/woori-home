const CONFIGURATION_ERRORS = new Set(["financial-db-config-missing", "financial-db-config-invalid", "financial-db-target-rejected"]);
const CONNECTION_ERRORS = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "ECONNRESET"]);

export function classifyFinancialDatabaseError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (CONFIGURATION_ERRORS.has(code)) return code;
  if (code === "42501") return "financial-db-select-denied";
  if (code === "42P01" || code === "42703") return "financial-db-schema-error";
  if (code.startsWith("08") || CONNECTION_ERRORS.has(code)) return "financial-db-connection-failed";
  return "financial-db-query-failed";
}
