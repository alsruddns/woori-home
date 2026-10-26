import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { parseIntegrationTestTarget } from "../scripts/db/integration-test-safety.mjs";
import { upsertCoinrankingDailySnapshot } from "../src/lib/data-platform/coinranking-daily-persistence.mjs";
import { upsertFinancialPrice } from "../src/lib/data-platform/financial-price-upsert.mjs";
import { normalizeGoldObservation, GOLD_DATASET_ID } from "../src/lib/data-platform/gold-price-pipeline.mjs";
import { readGoldMarket } from "../src/lib/data-platform/gold-db-market.mjs";
import { approvedGoldTestSource } from "./fixtures/gold-source.mjs";
import { registerOpenPriceCatalog, persistOpenPrices } from "../src/lib/data-platform/open-price-persistence.mjs";
import { readOpenPriceMarket } from "../src/lib/data-platform/open-price-market.mjs";

const enabled = process.env.DB_TARGET === "test" && Boolean(process.env.TEST_DATABASE_URL);

test("financial PostgreSQL UPSERT preserves UUIDs, quote-only revisions and Gold native units with rights-gated reads", { skip: !enabled && "requires isolated PostgreSQL 16 integration DB" }, async () => {
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
    const { rows: [asset] } = await client.query("select id from financial_assets where source_id=$1 and source_asset_id=$2", [normalized.sourceId,assets[0].sourceAssetId]);
    const changedQuote={...revised.prices[0],assetId:asset.id,sourceId:normalized.sourceId,datasetId:normalized.datasetId,quoteChangePercent:"3.5"};
    assert.equal((await upsertFinancialPrice(client,changedQuote)).rows.length,1,"a quote-only revision must update without mismatched SQL row lengths");
    assert.equal((await upsertFinancialPrice(client,changedQuote)).rows.length,0,"exact repeat must not create or update a row");
    assert.equal((await upsertFinancialPrice(client,{...changedQuote,fetchedAt:"2026-10-25T01:00:00Z",close:"1"})).rows.length,0,"older data must not overwrite a valid observation");
    const quote=await client.query("select quote_change_percent::text as change from financial_daily_prices where asset_id=$1 and reference_date='2026-10-25' and price_kind='quote-24h'",[asset.id]);
    assert.equal(quote.rows[0].change,"3.5000000000");
    const source=approvedGoldTestSource();
    await client.query(`insert into data_sources (id,name,provider,source_url,license_status,financial_rights,terms_version,reviewed_at,review_due_at,collection_enabled,attribution)
      values ($1,$2,'test',$3,'verified',$4::jsonb,$5,$6,$7,true,$8)`,[source.id,source.name,source.source_url,JSON.stringify(source.financial_rights),source.terms_version,source.reviewed_at,source.review_due_at,source.attribution]);
    await client.query(`insert into datasets (id,source_id,name,category,reference_period_kind,source_url)
      values ($1,$2,'Test gold observations','finance','daily',$3)`,[GOLD_DATASET_ID,source.id,source.source_url]);
    const goldNow=new Date("2026-10-27T02:00:00Z");
    const gold=normalizeGoldObservation({metal:"XAU",currency:"USD",unit:"troy_ounce",exchange:"TEST",price:"3110.34768",timestamp:goldNow.getTime()/1000-60},{now:goldNow});
    const {rows:[goldAsset]}=await client.query(`insert into financial_assets (source_id,source_asset_id,asset_type,symbol,name,venue,currency,unit,timezone)
      values ($1,$2,'metal','XAU','Test Gold','TEST','USD','troy-ounce','UTC') returning id`,[source.id,gold.assets[0].sourceAssetId]);
    const goldRecord={...gold.prices[0],sourceId:source.id,datasetId:GOLD_DATASET_ID,assetId:goldAsset.id};
    assert.equal((await upsertFinancialPrice(client,goldRecord)).rows.length,1);
    assert.equal((await upsertFinancialPrice(client,goldRecord)).rows.length,0);
    const market=await readGoldMarket(client,{now:goldNow});
    assert.equal(market.status,"success");
    assert.equal(market.data[0].price,"3110.3476800000");
    assert.equal(market.data[0].pricePerGram,"100");
    assert.equal(market.data[0].unit,"troy-ounce");
    await client.query(`update data_sources set financial_rights=jsonb_set(financial_rights,'{publicDisplay}','"denied"') where id=$1`,[source.id]);
    assert.equal((await readGoldMarket(client,{now:goldNow})).status,"provider-rights-pending");
    await registerOpenPriceCatalog(client);
    const openNow=new Date('2026-10-27T00:00:00Z');
    const monthly={url:'https://www.worldbank.org/en/research/commodity-markets',checksum:'fixture-only',prices:[{referenceDate:'2026-09-30',price:'4319',observedAt:'2026-10-02T00:00:00Z'}]};
    const openOptions={now:openNow,manageTransaction:false};
    assert.equal((await persistOpenPrices(client,'gold',monthly,openOptions)).inserted,1);
    const replay=await persistOpenPrices(client,'gold',monthly,openOptions);
    assert.equal(replay.inserted,0);assert.equal(replay.updated,0);assert.equal(replay.unchanged,1);
    const monthlyRead=await readOpenPriceMarket(client,'gold',{now:openNow});
    assert.equal(monthlyRead.status,'success');assert.equal(monthlyRead.data[0].price,'4319.0000000000');assert.equal(monthlyRead.priceType,'monthly-average');
    const cryptoOpen={url:'https://alternative.me/crypto/api/',checksum:'fixture-only',data:[{id:'1',symbol:'BTC',name:'Bitcoin',rank:1,price:'80000',volume:'12',marketCap:'13',change:'-1',observedAt:'2026-10-26T22:00:00Z'}]};
    assert.equal((await persistOpenPrices(client,'crypto',cryptoOpen,openOptions)).inserted,1);
    assert.equal((await persistOpenPrices(client,'crypto',cryptoOpen,openOptions)).unchanged,1);
    assert.equal((await readOpenPriceMarket(client,'crypto',{now:openNow})).data[0].symbol,'BTC');
    await client.query(`update data_sources set financial_rights=jsonb_set(financial_rights,'{publicDisplay}','"denied"') where id='alternative-aggregate'`);
    assert.equal((await readOpenPriceMarket(client,'crypto',{now:openNow})).status,'provider-rights-pending');
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});
