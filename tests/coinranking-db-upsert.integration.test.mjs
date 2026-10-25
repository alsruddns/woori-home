import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { parseIntegrationTestTarget } from "../scripts/db/integration-test-safety.mjs";
import { upsertCoinrankingDailySnapshot } from "../src/lib/data-platform/coinranking-daily-persistence.mjs";

const enabled = process.env.DB_TARGET === "test" && Boolean(process.env.TEST_DATABASE_URL);

test("Coinranking PostgreSQL UPSERT is repeatable and preserves distinct UUID assets with colliding symbols", { skip: !enabled && "requires isolated PostgreSQL 16 integration DB" }, async () => {
  const target = parseIntegrationTestTarget(process.env.TEST_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: target.url, max: 1, options: "-c statement_timeout=10000 -c application_name=woori_coinranking_upsert_test" });
  const client = await pool.connect();
  const observedAt = "2026-10-25T02:00:00.000Z";
  const assets = ["coinranking-fixture-a", "coinranking-fixture-b"].map((sourceAssetId, index) => ({
    sourceAssetId, assetType: "crypto", symbol: "DUP", name: `Fixture ${index}`, venue: "coinranking-aggregate",
    currency: "USD", unit: "aggregate-price", timezone: "UTC", isActive: true,
    metadata: { quoteType: "daily-observed-aggregate-price", quoteWindow: "24h" },
  }));
  const normalized = {
    sourceId: "coinranking-aggregate", datasetId: "coinranking-usd-daily-snapshots", observedAt,
    assets,
    prices: assets.map((asset) => ({ sourceAssetId: asset.sourceAssetId, referenceDate: "2026-10-25", referenceTimezone: "UTC",
      priceKind: "quote-24h", close: "12.5", volume: "20", marketCap: "1000", quoteChangePercent: "2.5", quoteWindow: "24h", fetchedAt: observedAt })),
  };
  try {
    await client.query("begin");
    const first = await upsertCoinrankingDailySnapshot(client, normalized);
    assert.deepEqual(first, { inserted: 2, updated: 0, unchanged: 0, count: 2 });
    const second = await upsertCoinrankingDailySnapshot(client, normalized);
    assert.deepEqual(second, { inserted: 0, updated: 0, unchanged: 2, count: 2 });
    const revised = { ...normalized, observedAt: "2026-10-25T03:00:00.000Z", prices: normalized.prices.map((row) => ({ ...row, close: "12.75", fetchedAt: "2026-10-25T03:00:00.000Z" })) };
    const third = await upsertCoinrankingDailySnapshot(client, revised);
    assert.deepEqual(third, { inserted: 0, updated: 2, unchanged: 0, count: 2 });
    const counts = await client.query(`select count(distinct a.id)::int as assets,count(p.asset_id)::int as observations,
        count(distinct a.symbol)::int as symbols,min(p.close)::text as minimum_price,max(p.close)::text as maximum_price
      from financial_assets a join financial_daily_prices p on p.asset_id=a.id and p.source_id=a.source_id
      where a.source_id='coinranking-aggregate' and a.source_asset_id=any($1::text[]) and p.reference_date='2026-10-25' and p.price_kind='quote-24h'`, [assets.map((asset) => asset.sourceAssetId)]);
    assert.deepEqual(counts.rows[0], { assets: 2, observations: 2, symbols: 1, minimum_price: "12.7500000000", maximum_price: "12.7500000000" });
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});
