import "../db/load-env.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { assertDatabaseRolesShareTarget, assertProductionOperation, requireDistinctDatabaseRoles } from "../db/production-operation.mjs";
import { IMPORTABLE_INDICATORS, normalizeWorldBankSnapshot } from "./world-bank-import-core.mjs";

const { Pool } = pg;
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const snapshot = JSON.parse(await readFile(resolve(root, "src/data/world-bank.json"), "utf8"));
let target;
try {
  if (process.env.WORLD_BANK_VERIFY_TARGET === "production") {
    const urls = [process.env.DATABASE_URL, process.env.DB_IMPORT_URL, process.env.DB_MIGRATION_URL];
    requireDistinctDatabaseRoles(urls);
    assertDatabaseRolesShareTarget(urls);
    target = assertProductionOperation({ databaseUrl: process.env.DATABASE_URL });
  } else {
    target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database configuration is invalid.");
  process.exit(1);
}
const { observations: jsonRows } = normalizeWorldBankSnapshot(snapshot);
const pool = new Pool({ connectionString: target.url, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10000, allowExitOnIdle: true });
try {
  const result = await pool.query(`select o.indicator_id as indicator, o.country_iso3 as country, o.reference_year as year, o.value::text as value, o.last_updated_at
    from indicator_observations o join indicators i on i.id=o.indicator_id
    where i.dataset_id='world-development-indicators' and o.indicator_id = any($1::text[])
    order by o.indicator_id, o.country_iso3, o.reference_year`, [Object.keys(IMPORTABLE_INDICATORS)]);
  const normalizeStoredDecimal = (value) => {
    if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error("Database returned an invalid numeric value");
    const [integer, fraction] = value.split(".");
    return fraction ? `${integer}.${fraction.replace(/0+$/, "")}`.replace(/\.$/, "") : integer;
  };
  const dbRows = result.rows.map((row) => ({ ...row, year: Number(row.year), value: normalizeStoredDecimal(row.value) }));
  const key = (row) => `${row.indicator}:${row.country}:${row.year}`;
  const jsonByKey = new Map(jsonRows.map((row) => [key(row), row]));
  const dbByKey = new Map(dbRows.map((row) => [key(row), row]));
  const missingInDb = [];
  const extraInDb = [];
  const mismatched = [];
  for (const [id, row] of jsonByKey) {
    const stored = dbByKey.get(id);
    if (!stored) missingInDb.push(id);
    else if (stored.value !== row.value) mismatched.push({ id, json: row.value, db: stored.value });
  }
  for (const id of dbByKey.keys()) if (!jsonByKey.has(id)) extraInDb.push(id);
  const summary = (rows) => ({ countries: new Set(rows.map((row) => row.country)).size, indicators: new Set(rows.map((row) => row.indicator)).size, observations: rows.length });
  console.log("World Bank JSON ↔ PostgreSQL verification report (licensed import scope)");
  console.log(`Database: ${target.database}; scope: ${Object.keys(IMPORTABLE_INDICATORS).join(", ")}`);
  console.log(`JSON scope: ${JSON.stringify(summary(jsonRows))}; DB scope: ${JSON.stringify(summary(dbRows))}`);
  console.log(`Identity/value checks: ${missingInDb.length} missing in DB, ${extraInDb.length} unexpected DB rows, ${mismatched.length} value mismatches.`);
  for (const indicator of Object.keys(IMPORTABLE_INDICATORS)) {
    const left = jsonRows.filter((row) => row.indicator === indicator);
    const right = dbRows.filter((row) => row.indicator === indicator);
    const latestJson = left.reduce((latest, row) => Math.max(latest, row.year), 0);
    const latestDb = right.length ? right.reduce((latest, row) => Math.max(latest, row.year), 0) : null;
    console.log(`  ${indicator}: JSON ${left.length} observations / latest ${latestJson}; DB ${right.length} / latest ${latestDb}; ${right.length === left.length && latestJson === latestDb ? "MATCH" : "DIFFERENCE"}`);
  }
  for (const [indicator, country] of [["SL.UEM.TOTL.ZS", "KOR"], ["EG.ELC.ACCS.ZS", "KOR"], ["EG.ELC.ACCS.ZS", "WLD"]]) {
    const countryRows = jsonRows.filter((item) => item.indicator === indicator && item.country === country);
    const latestYear = countryRows.reduce((latest, item) => Math.max(latest, item.year), 0);
    const row = countryRows.find((item) => item.year === latestYear);
    const stored = row ? dbByKey.get(key(row)) : null;
    console.log(`  Representative ${country} ${indicator}: ${row ? `${row.year} ${row.value}` : "not in JSON"} / DB ${stored ? `${stored.year} ${stored.value}` : "not stored"}`);
  }
  for (const code of ["SP.POP.TOTL", "NY.GDP.MKTP.CD"]) {
    const row = snapshot.observations.filter((item) => item.indicator === code && item.country === "KOR").sort((a, b) => b.year - a.year)[0];
    const stored = row ? dbByKey.get(key({ ...row, value: String(row.value) })) : null;
    console.log(`  Representative KOR ${code}: JSON ${row ? `${row.year} ${row.value}` : "not available"}; DB ${stored ? `${stored.year} ${stored.value}` : "not stored by reviewed allowlist"}.`);
  }
  console.log("Comparison rules: exact country/indicator/year identity and decimal string equality; omitted JSON observations remain omitted; zero and negative values are not treated as missing.");
  if (missingInDb.length || extraInDb.length || mismatched.length) {
    for (const item of missingInDb.slice(0, 10)) console.log(`  MISSING ${item}`);
    for (const item of extraInDb.slice(0, 10)) console.log(`  EXTRA ${item}`);
    for (const item of mismatched.slice(0, 10)) console.log(`  VALUE ${item.id}: JSON=${item.json}, DB=${item.db}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Could not verify World Bank data in ${target.database}: ${error instanceof Error ? error.message : "Unknown database error."}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
