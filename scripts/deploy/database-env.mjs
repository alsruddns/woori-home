import { parse as parseDotenv } from "dotenv";

export const DATABASE_ROLE_KEYS = ["DATABASE_URL", "DB_IMPORT_URL", "DB_MIGRATION_URL"];

export function parseDatabaseRoleEnv(content) {
  const parsed = parseDotenv(content);
  const roles = Object.fromEntries(DATABASE_ROLE_KEYS.map((key) => [key, parsed[key]]));
  for (const key of DATABASE_ROLE_KEYS) {
    const value = roles[key];
    if (typeof value !== "string" || value.length === 0) throw new Error(`Required database role setting ${key} is missing.`);
    let url;
    try { url = new URL(value); } catch { throw new Error(`Database role setting ${key} is not a valid PostgreSQL URL.`); }
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error(`Database role setting ${key} is not a PostgreSQL URL.`);
  }
  return roles;
}
