import "../db/load-env.mjs";
import pg from "pg";
import { createCoinrankingProvider } from "../../src/lib/data-platform/providers/coinranking.mjs";
import { upsertCoinrankingDailySnapshot } from "../../src/lib/data-platform/coinranking-daily-persistence.mjs";
import { canCollectCoinrankingDailySnapshots } from "../../src/lib/data-platform/financial-rights.mjs";
import {
  COINRANKING_DATASET_ID,
  COINRANKING_MONTHLY_REQUEST_BUDGET,
  COINRANKING_SOURCE_ID,
  normalizeCoinrankingDailySnapshot,
} from "../../src/lib/data-platform/coinranking-daily.mjs";
import { resolveDatabaseTarget } from "../db/connection-safety.mjs";
import { validateFinancialProductionContext, safeDatabaseErrorCode } from "../db/financial-production-safety.mjs";
import { parseProductionApprovalArgs } from "../db/production-operation.mjs";

function parseArgs(args) {
  let target = null;
  const approvalArgs = [];
  for (const arg of args) {
    const match = arg.match(/^--target=(development|production)$/);
    if (match && !target) { target = match[1]; continue; }
    approvalArgs.push(arg);
  }
  if (!target) throw new Error("Specify --target=development or --target=production.");
  const approval = target === "production"
    ? parseProductionApprovalArgs(approvalArgs, { requireBackup: true })
    : parseProductionApprovalArgs(approvalArgs);
  return { target, ...approval };
}

function utcDate(date) { return date.toISOString().slice(0, 10); }

function safeMessage(error) {
  const status = Number(error?.status);
  if (status === 401 || status === 403) return "Coinranking authentication failed; credentials were not included in the error.";
  if (status === 429) return "Coinranking request limit was reached; reserved calls remain charged against the local budget.";
  if (status >= 400 && status < 600) return `Coinranking returned HTTP ${status}; response details were omitted.`;
  return error instanceof Error ? error.message.slice(0, 1000) : "Coinranking collection failed.";
}

async function assertProductionImporter(client, expectedDatabase) {
  const { rows: [role] } = await client.query(`select current_database() as database_name,current_user as role_name,
    (select rolsuper from pg_roles where rolname=current_user) as superuser,
    (select rolcreatedb from pg_roles where rolname=current_user) as create_database,
    (select rolcreaterole from pg_roles where rolname=current_user) as create_role,
    has_database_privilege(current_user,current_database(),'CREATE') as database_create,
    has_schema_privilege(current_user,'public','CREATE') as schema_create,
    has_schema_privilege(current_user,'public','USAGE') as schema_usage,
    has_table_privilege(current_user,'public.data_sources','SELECT') as source_select,
    has_table_privilege(current_user,'public.datasets','SELECT') as dataset_select,
    has_table_privilege(current_user,'public.data_collection_runs','SELECT') as runs_select,
    has_table_privilege(current_user,'public.data_collection_runs','INSERT') as runs_insert,
    has_table_privilege(current_user,'public.data_collection_runs','UPDATE') as runs_update,
    has_table_privilege(current_user,'public.financial_assets','SELECT') as assets_select,
    has_table_privilege(current_user,'public.financial_assets','INSERT') as assets_insert,
    has_table_privilege(current_user,'public.financial_assets','UPDATE') as assets_update,
    has_table_privilege(current_user,'public.financial_assets','DELETE') as assets_delete,
    has_table_privilege(current_user,'public.financial_daily_prices','SELECT') as prices_select,
    has_table_privilege(current_user,'public.financial_daily_prices','INSERT') as prices_insert,
    has_table_privilege(current_user,'public.financial_daily_prices','UPDATE') as prices_update,
    has_table_privilege(current_user,'public.financial_daily_prices','DELETE') as prices_delete`);
  if (role.database_name !== expectedDatabase || role.role_name !== "woori_portal_import" || role.superuser
    || role.create_database || role.create_role || role.database_create || role.schema_create || !role.schema_usage
    || !role.source_select || !role.dataset_select || !role.runs_select || !role.runs_insert || !role.runs_update) {
    throw new Error("Production collection requires the restricted Portal Import role and catalog access.");
  }
  for (const prefix of ["assets", "prices"]) {
    if (!role[`${prefix}_select`] || !role[`${prefix}_insert`] || !role[`${prefix}_update`] || role[`${prefix}_delete`]) {
      throw new Error(`Production Import privileges on ${prefix} do not match the SELECT/INSERT/UPDATE allowlist.`);
    }
  }
}

export async function reserveCoinrankingRun(client, { datasetId, referenceDate, now = new Date() }) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext('woori-home:coinranking-daily-budget'))");
    const duplicate = await client.query(`select id from data_collection_runs where dataset_id=$1 and status in ('success','unchanged')
      and latest_reference_period=$2 limit 1`, [datasetId, referenceDate]);
    if (duplicate.rows.length) {
      await client.query("commit");
      return { duplicate: true, runId: null, usedThisMonth: null };
    }
    const usage = await client.query(`select coalesce(sum((scope->>'apiRequests')::int),0)::int as used
      from data_collection_runs where dataset_id=$1 and started_at >= date_trunc('month',$2::timestamptz)
      and started_at < date_trunc('month',$2::timestamptz)+interval '1 month'`, [datasetId, now.toISOString()]);
    const usedThisMonth = Number(usage.rows[0]?.used ?? 0);
    if (usedThisMonth + 3 > COINRANKING_MONTHLY_REQUEST_BUDGET) {
      await client.query("rollback");
      return { budgetExceeded: true, usedThisMonth, runId: null };
    }
    const inserted = await client.query(`insert into data_collection_runs
      (dataset_id,started_at,status,snapshot_version,latest_reference_period,scope)
      values ($1,$2,'partial',$3,$3,$4::jsonb) returning id`, [datasetId, now.toISOString(), referenceDate,
      JSON.stringify({ provider: "coinranking", apiRequests: 3, reservedApiRequests: 3, currency: "USD", observationType: "daily-observed-aggregate-price", referenceTimezone: "UTC" })]);
    await client.query("commit");
    return { duplicate: false, budgetExceeded: false, usedThisMonth, runId: inserted.rows[0].id };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

let options;
let targets;
try {
  options = parseArgs(process.argv.slice(2));
  if (options.target === "production") {
    targets = validateFinancialProductionContext({ requireBackup: options.apply, backupReference: options.backupReference });
  } else {
    const target = resolveDatabaseTarget({ target: "development", databaseUrl: process.env.DATABASE_URL });
    targets = { DATABASE_URL: target };
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Coinranking collection guard failed.");
  process.exit(1);
}

const connectionString = options.target === "production"
  ? (options.apply ? process.env.DB_IMPORT_URL : process.env.DATABASE_URL)
  : process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000,
  options: `-c ${options.apply ? "default_transaction_read_only=off" : "default_transaction_read_only=on"} -c statement_timeout=30000 -c application_name=woori_coinranking_daily_collection` });

try {
  const client = await pool.connect();
  let source;
  try {
    const identity = await client.query("select current_database() as database_name,current_user as role_name");
    if (identity.rows[0]?.database_name !== targets[options.target === "production" && !options.apply ? "DATABASE_URL" : options.target === "production" ? "DB_IMPORT_URL" : "DATABASE_URL"]?.database) {
      throw new Error("Database identity does not match the approved target.");
    }
    if (options.target === "production" && options.apply) await assertProductionImporter(client, targets.DB_IMPORT_URL.database);
    const result = await client.query(`select id,license_status,financial_rights,terms_version,reviewed_at,review_due_at,collection_enabled,attribution,source_url
      from data_sources where id=$1`, [COINRANKING_SOURCE_ID]);
    source = result.rows[0];
    const { rows: [dataset] } = await client.query("select id,source_id from datasets where id=$1", [COINRANKING_DATASET_ID]);
    if (!source || !dataset || dataset.source_id !== COINRANKING_SOURCE_ID) throw new Error("Coinranking source and dataset migration must be applied before collection.");
    if (!canCollectCoinrankingDailySnapshots(source)) {
      throw new Error("Coinranking collection blocked: current explicit competitor-use, daily-snapshot, API, storage and retention rights are not all confirmed.");
    }
  } finally { client.release(); }

  const now = new Date();
  const referenceDate = utcDate(now);
  const prior = await pool.query(`select id from data_collection_runs where dataset_id=$1 and status in ('success','unchanged')
    and latest_reference_period=$2 limit 1`, [COINRANKING_DATASET_ID, referenceDate]);
  if (prior.rows.length) {
    console.log(JSON.stringify({ result: "already-collected", provider: "coinranking", referenceDate, apiRequests: 0 }));
    process.exit(0);
  }
  const usage = await pool.query(`select coalesce(sum((scope->>'apiRequests')::int),0)::int as used
    from data_collection_runs where dataset_id=$1 and started_at >= date_trunc('month',$2::timestamptz)
    and started_at < date_trunc('month',$2::timestamptz)+interval '1 month'`, [COINRANKING_DATASET_ID, now.toISOString()]);
  const usedThisMonth = Number(usage.rows[0]?.used ?? 0);
  if (usedThisMonth + 3 > COINRANKING_MONTHLY_REQUEST_BUDGET) {
    console.log(JSON.stringify({ result: "monthly-request-budget-exhausted", provider: "coinranking", usedThisMonth, hardStop: 8000, apiRequests: 0 }));
    process.exitCode = 2;
  } else if (options.dryRun) {
    console.log(JSON.stringify({ result: "dry-run", target: options.target, provider: "coinranking", plannedAssets: 300, plannedApiRequests: 3, usedThisMonth, hardStop: 8000, referenceDate, noWrites: true, noExternalRequests: true }));
  } else {
    const auditClient = await pool.connect();
    let reservation;
    try { reservation = await reserveCoinrankingRun(auditClient, { datasetId: COINRANKING_DATASET_ID, referenceDate, now }); }
    finally { auditClient.release(); }
    if (reservation.duplicate) {
      console.log(JSON.stringify({ result: "already-collected", provider: "coinranking", referenceDate, apiRequests: 0 }));
      process.exit(0);
    }
    if (reservation.budgetExceeded) throw new Error("Monthly API request budget was exhausted by another concurrent run.");

    const provider = createCoinrankingProvider();
    try {
      const raw = await provider.fetchTopMarketSnapshot({ limit: 300, signal: AbortSignal.timeout(20000) });
      if (utcDate(new Date(raw.observedAt)) !== referenceDate) throw new Error("Coinranking observation date changed during collection; no prior-day relabeling is allowed.");
      const normalized = normalizeCoinrankingDailySnapshot(raw);
      const writeClient = await pool.connect();
      let counts;
      try {
        await writeClient.query("begin");
        const current = await writeClient.query("select financial_rights,terms_version,reviewed_at,review_due_at,collection_enabled,attribution,source_url,id from data_sources where id=$1 for share", [COINRANKING_SOURCE_ID]);
        if (!canCollectCoinrankingDailySnapshots(current.rows[0])) throw new Error("Coinranking rights changed before database write; snapshot was not stored.");
        counts = await upsertCoinrankingDailySnapshot({ query: (...args) => writeClient.query(...args) }, normalized);
        await writeClient.query(`update data_collection_runs set finished_at=now(),status=$2,scope=scope || $3::jsonb,record_count=$4,
          inserted_count=$5,updated_count=$6,skipped_count=$7,latest_reference_period=$8
          where id=$1`, [reservation.runId, counts.inserted + counts.updated === 0 ? "unchanged" : "success",
          JSON.stringify({ apiRequests: normalized.apiRequests, assetCount: normalized.assets.length, observationCount: normalized.prices.length, currency: normalized.currency, observedAt: normalized.observedAt }),
          counts.count, counts.inserted, counts.updated, counts.unchanged, normalized.referenceDate]);
        await writeClient.query("commit");
      } catch (error) {
        await writeClient.query("rollback").catch(() => {});
        throw error;
      } finally { writeClient.release(); }
      console.log(JSON.stringify({ result: "success", provider: "coinranking", referenceDate, observedAt: normalized.observedAt,
        assets: normalized.assets.length, observations: counts.count, inserted: counts.inserted, updated: counts.updated,
        unchanged: counts.unchanged, apiRequests: normalized.apiRequests, currency: normalized.currency, snapshotType: normalized.snapshotType }));
    } catch (error) {
      const message = safeMessage(error);
      await pool.query(`update data_collection_runs set finished_at=now(),status='failed',scope=scope || $2::jsonb,
        error_category=$3,error_message=$4 where id=$1`, [reservation.runId,
        JSON.stringify({ apiRequests: 3, failure: true }), safeDatabaseErrorCode(error), message]).catch(() => {});
      throw error;
    }
  }
} catch (error) {
  console.error(JSON.stringify({ result: "failed", provider: "coinranking", error: safeDatabaseErrorCode(error), message: error instanceof Error ? error.message : "Collection failed." }));
  process.exitCode = 1;
} finally { await pool.end(); }
