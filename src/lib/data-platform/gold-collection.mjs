import { evaluatePriceOperation } from "./financial-price-policy.mjs";
import { GOLD_SOURCE_ID, GOLD_DATASET_ID, normalizeGoldObservation } from "./gold-price-pipeline.mjs";
import { upsertFinancialPrice } from "./financial-price-upsert.mjs";

const SOURCE_SQL = `select id,name,license_status,financial_rights,terms_version,reviewed_at,review_due_at,
  collection_enabled,attribution,source_url from data_sources where id=$1`;

/** One daily observation; persistent audit reservation charges failed external calls to the monthly budget. */
export async function collectGoldObservation(client, provider, { now = new Date(), clock = () => new Date(), dryRun = true } = {}) {
  if (provider.id !== GOLD_SOURCE_ID || provider.datasetId !== GOLD_DATASET_ID) throw new Error("Unregistered Gold provider identity.");
  const date = now.toISOString().slice(0, 10);
  let locked = false;
  let runId;
  try {
    const { rows: [lock] } = await client.query("select pg_try_advisory_lock(hashtext('woori-home:gold-daily')) as acquired");
    if (!lock?.acquired) return { status: "collection-already-running", apiRequests: 0 };
    locked = true;
    const { rows: [source] } = await client.query(SOURCE_SQL, [GOLD_SOURCE_ID]);
    if (!evaluatePriceOperation(source, "collect", now).allowed) throw new Error("Gold collection blocked: source rights or dated evidence are not approved.");
    const { rows: [dataset] } = await client.query("select id from datasets where id=$1 and source_id=$2", [GOLD_DATASET_ID, GOLD_SOURCE_ID]);
    if (!dataset) throw new Error("Gold dataset registration is missing.");
    const { rows: [previous] } = await client.query(`select id from data_collection_runs where dataset_id=$1
      and latest_reference_period=$2 and status in ('success','unchanged') limit 1`, [GOLD_DATASET_ID, date]);
    if (previous) return { status: "already-collected", apiRequests: 0 };
    const { rows: [usage] } = await client.query(`select coalesce(sum((scope->>'apiRequests')::int),0)::int as used
      from data_collection_runs where dataset_id=$1 and started_at >= date_trunc('month',$2::timestamptz)
      and started_at < date_trunc('month',$2::timestamptz)+interval '1 month'`, [GOLD_DATASET_ID, now.toISOString()]);
    if (Number(usage?.used ?? 0) >= 270) throw new Error("Gold monthly request safety budget exhausted.");
    if (dryRun) return { status: "dry-run", plannedRequests: 1, apiRequests: 0, noWrites: true };
    const { rows: [run] } = await client.query(`insert into data_collection_runs
      (dataset_id,started_at,status,latest_reference_period,scope)
      values ($1,$2,'partial',$3,$4::jsonb) returning id`, [GOLD_DATASET_ID, now.toISOString(), date,
      JSON.stringify({ provider: GOLD_SOURCE_ID, apiRequests: 1, kind: "spot-observation", referenceTimezone: "UTC" })]);
    runId = run.id;
    const received = await provider.fetchObservation({ signal: AbortSignal.timeout(15_000) });
    if (received?.sourceId !== GOLD_SOURCE_ID || received.datasetId !== GOLD_DATASET_ID
      || received.assets?.length !== 1 || received.prices?.length !== 1 || received.prices[0].priceKind !== "spot-reference") throw new Error("Gold normalized snapshot identity mismatch.");
    const snapshot = normalizeGoldObservation({ metal: received.assets[0].symbol, currency: received.assets[0].currency,
      unit: received.assets[0].unit === "troy-ounce" ? "troy_ounce" : received.assets[0].unit,
      exchange: received.assets[0].venue, timestamp: Date.parse(received.prices[0].sourceUpdatedAt)/1000,
      price: received.prices[0].close }, {now:clock()});
    if (snapshot.assets[0].sourceAssetId !== received.assets[0].sourceAssetId) throw new Error("Gold source asset identity mismatch.");
    await client.query("begin");
    try {
      const { rows: [current] } = await client.query(SOURCE_SQL + " for share", [GOLD_SOURCE_ID]);
      if (!evaluatePriceOperation(current, "collect", clock()).allowed) throw new Error("Gold rights changed before persistence.");
      const asset = snapshot.assets[0];
      const { rows: [saved] } = await client.query(`insert into financial_assets
        (source_id,source_asset_id,asset_type,symbol,name,venue,currency,unit,timezone,metadata,last_updated_at)
        values ($1,$2,'metal','XAU',$3,$4,$5,$6,'UTC',$7::jsonb,$8)
        on conflict (source_id,source_asset_id) do update set name=excluded.name,metadata=excluded.metadata,
          last_updated_at=excluded.last_updated_at
        where financial_assets.currency=excluded.currency and financial_assets.unit=excluded.unit
          and financial_assets.venue=excluded.venue and financial_assets.asset_type='metal' returning id`,
      [GOLD_SOURCE_ID, asset.sourceAssetId, asset.name, asset.venue, asset.currency, asset.unit, JSON.stringify(asset.metadata), now.toISOString()]);
      if (!saved) throw new Error("Gold asset identity changed; no price was stored.");
      const result = await upsertFinancialPrice(client, { ...snapshot.prices[0], assetId: saved.id, sourceId: GOLD_SOURCE_ID, datasetId: GOLD_DATASET_ID });
      const changed = result.rows.length;
      await client.query(`update data_collection_runs set finished_at=now(),status=$2,record_count=1,
        inserted_count=$3,updated_count=$4,skipped_count=$5,scope=scope || $6::jsonb where id=$1`,
      [runId, changed ? "success" : "unchanged", result.rows[0]?.was_inserted ? 1 : 0,
        changed && !result.rows[0].was_inserted ? 1 : 0, changed ? 0 : 1,
        JSON.stringify({ referenceDate: snapshot.prices[0].referenceDate, observedAt: snapshot.prices[0].sourceUpdatedAt })]);
      await client.query("commit");
      return { status: changed ? "success" : "unchanged", observations: 1, apiRequests: 1, referenceDate: snapshot.prices[0].referenceDate };
    } catch (error) { await client.query("rollback"); throw error; }
  } catch (error) {
    if (runId) await client.query(`update data_collection_runs set finished_at=now(),status='failed',
      error_category='gold-collection-failed',error_message='Collection failed; upstream details withheld.' where id=$1`, [runId]).catch(() => {});
    throw error;
  } finally {
    if (locked) await client.query("select pg_advisory_unlock(hashtext('woori-home:gold-daily'))").catch(() => {});
  }
}
