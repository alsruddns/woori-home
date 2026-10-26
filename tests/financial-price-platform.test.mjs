import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePriceOperation, priceDecimal, goldPricePerGram } from "../src/lib/data-platform/financial-price-policy.mjs";
import { createGoldApiProvider, normalizeGoldObservation, GOLD_SOURCE_ID, GOLD_DATASET_ID } from "../src/lib/data-platform/gold-price-pipeline.mjs";
import { collectGoldObservation } from "../src/lib/data-platform/gold-collection.mjs";
import { readGoldMarket } from "../src/lib/data-platform/gold-db-market.mjs";
import { validateMarketPriceRecord } from "../src/lib/data-platform/financial-market.mjs";
import { approvedGoldTestSource } from "./fixtures/gold-source.mjs";
import { dailyPriceChartSegments } from "../src/lib/data-platform/financial-chart-series.mjs";

const now = new Date("2026-10-27T02:00:00Z");
const raw = { metal: "XAU", currency: "USD", unit: "troy_ounce", price: "4000.1234567891", exchange: "FOREXCOM", timestamp: now.getTime() / 1000 - 60 };

test("price permissions require current review, commercial/storage evidence and independent public scope", () => {
  const source = approvedGoldTestSource();
  assert.equal(evaluatePriceOperation(source,"collect",now).allowed,true);
  assert.equal(evaluatePriceOperation(source,"visualize",now).allowed,true);
  for (const right of ["commercialUse","dbStorage","longTermRetention","dailySnapshot"]) {
    const candidate=structuredClone(source); candidate.financial_rights[right]="pending";
    assert.equal(evaluatePriceOperation(candidate,"collect",now).allowed,false);
  }
  const missing=structuredClone(source); delete missing.financial_rights.evidence.dbStorage;
  assert.equal(evaluatePriceOperation(missing,"collect",now).allowed,false);
  const expired={...source,review_due_at:"2026-10-26T00:00:00Z"};
  assert.equal(evaluatePriceOperation(expired,"publish",now).allowed,false);
  source.financial_rights.publicDisplay="denied";
  assert.equal(evaluatePriceOperation(source,"collect",now).allowed,true);
  assert.equal(evaluatePriceOperation(source,"publish",now).allowed,false);
});

test("gold observations retain native USD/troy-ounce decimals and their actual UTC date, never a previous close", () => {
  const data=normalizeGoldObservation(raw,{now});
  assert.equal(data.prices[0].close,"4000.1234567891");
  assert.equal(data.prices[0].priceKind,"spot-reference");
  assert.equal(data.prices[0].referenceDate,"2026-10-27");
  assert.equal(data.prices[0].sourceUpdatedAt,"2026-10-27T01:59:00.000Z");
  for(const changed of [{currency:"USDT"},{unit:"gram"},{metal:"XAG"},{price:"0"},{timestamp:now.getTime()/1000+120},{timestamp:now.getTime()/1000-8*86400}]) {
    assert.throws(()=>normalizeGoldObservation({...raw,...changed},{now}));
  }
});

test("financial decimals preserve exact large values and reject database overflow rather than silently rounding",()=>{
  assert.equal(priceDecimal("12345678901234567890.1234567891"),"12345678901234567890.1234567891");
  assert.equal(priceDecimal("1.25e-8"),"0.0000000125");
  assert.equal(goldPricePerGram("31.1034768","troy-ounce"),"1");
  for(const value of ["1.00000000001","123456789012345678901","NaN","Infinity"]) assert.throws(()=>priceDecimal(value));
  const record={assetId:"a",sourceId:"s",datasetId:"d",referenceDate:"2026-10-27",referenceTimezone:"UTC",priceKind:"close",fetchedAt:now.toISOString(),close:"10000000000000000000.0000000001",high:"10000000000000000000.0000000000"};
  assert.equal(validateMarketPriceRecord(record).reason,"close-above-high");
});

test("Gold provider keeps credentials server-side and does not expose reflected upstream errors",async()=>{
  let request;
  const provider=createGoldApiProvider({apiKey:"fixture-secret",now:()=>now,fetchImpl:async(url,options)=>{request={url,options};return new Response(JSON.stringify(raw));}});
  assert.equal((await provider.fetchObservation()).prices.length,1);
  assert.equal(request.options.headers["x-access-token"],"fixture-secret");
  assert.equal(request.url.includes("fixture-secret"),false);
  assert.equal(request.options.redirect,"error");
  const denied=createGoldApiProvider({apiKey:"fixture-secret",fetchImpl:async()=>new Response("fixture-secret",{status:429})});
  await assert.rejects(denied.fetchObservation(),e=>e.status===429&&!e.message.includes("fixture-secret"));
});

test("Gold denied rights cause no provider call, price read, or write; a concurrent collector is a no-op",async()=>{
  let calls=0;const sql=[];
  const client={query:async(text)=>{sql.push(text);return text.includes("pg_try")?{rows:[{acquired:true}]}:{rows:[]};}};
  await assert.rejects(collectGoldObservation(client,{id:GOLD_SOURCE_ID,datasetId:GOLD_DATASET_ID,fetchObservation:async()=>{calls++;}},{now,dryRun:false}),/rights/);
  assert.equal(calls,0);assert.equal(sql.some(s=>/insert|update /i.test(s)),false);
  const market=await readGoldMarket({query:async()=>({rows:[]})},{now});
  assert.equal(market.status,"provider-rights-pending");
  assert.deepEqual(await collectGoldObservation({query:async()=>({rows:[{acquired:false}]})},{id:GOLD_SOURCE_ID,datasetId:GOLD_DATASET_ID},{now}),{status:"collection-already-running",apiRequests:0});
});

test("daily charts preserve missing days and never bridge a missing or invalid observation",()=>{
  const points=[{timestamp:"2026-10-20T02:00:00Z",price:"10"},{timestamp:"2026-10-21T02:00:00Z",price:"12"},
    {timestamp:"2026-10-22T02:00:00Z",price:"NaN"},{timestamp:"2026-10-23T02:00:00Z",price:"14"}];
  const segments=dailyPriceChartSegments(points);
  assert.deepEqual(segments.map(segment=>segment.length),[2,1]);
  assert.ok(segments[1][0].startsWith("100,"));
  assert.deepEqual(dailyPriceChartSegments([{timestamp:"bad",price:"1"}]),[]);
});
