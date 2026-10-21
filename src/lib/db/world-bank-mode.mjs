import { resolveDatabaseTarget } from "../../../scripts/db/connection-safety.mjs";

export function resolveWorldBankDataSource(env = process.env) {
  const source = env.WORLD_BANK_DATA_SOURCE ?? "json";
  if (source !== "json" && source !== "db") throw new Error("WORLD_BANK_DATA_SOURCE must be json or db");
  if (source === "json") return { source, target: null };

  if (env.DB_TARGET === "development") {
    return { source, target: resolveDatabaseTarget({ target: "development", databaseUrl: env.DATABASE_URL }) };
  }
  if (env.DB_TARGET === "production") {
    if (env.WORLD_BANK_DB_PRODUCTION_ENABLED !== "true") throw new Error("World Bank production DB mode requires WORLD_BANK_DB_PRODUCTION_ENABLED=true.");
    return {
      source,
      target: resolveDatabaseTarget({ target: "production", databaseUrl: env.DATABASE_URL, allowedProductionHosts: env.PRODUCTION_DB_ALLOWED_HOSTS }),
    };
  }
  throw new Error("DB mode requires an explicit development or production DB_TARGET.");
}
