import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { BINANCE_RESEARCH_ASSETS, binanceArchiveUrl, calculateDailyChange, finalizedUtcDate, parseBinanceChecksum, parseBinanceDailyCsv, sha256Hex, shiftUtcYears, unzipSingleCsv } from "../scripts/data/binance-research.mjs";
import { researchDatabaseUrl } from "../scripts/data/binance-research-db.mjs";

function zipSingleCsv(name, csv) {
  const file = Buffer.from(csv);
  const compressed = deflateRawSync(file);
  const fileName = Buffer.from(name);
  const local = Buffer.alloc(30 + fileName.length);
  local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(8,8); local.writeUInt16LE(8,10); local.writeUInt16LE(0,12); local.writeUInt32LE(compressed.length,18); local.writeUInt32LE(file.length,22); local.writeUInt16LE(fileName.length,26); fileName.copy(local,30);
  const central = Buffer.alloc(46 + fileName.length);
  central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(8,10); central.writeUInt16LE(8,12); central.writeUInt16LE(0,14); central.writeUInt32LE(compressed.length,20); central.writeUInt32LE(file.length,24); central.writeUInt16LE(fileName.length,28); central.writeUInt32LE(0,42); fileName.copy(central,46);
  const end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(local.length+compressed.length,16);
  return Buffer.concat([local,compressed,central,end]);
}

function csvRow(date, micros = false, overrides = {}) {
  const open = Date.parse(`${date}T00:00:00.000Z`);
  const close = open + 86_400_000 - 1;
  const factor = micros ? 1000 : 1;
  const cells = [String(open*factor),"100","110","90","105","12.25",String(close*factor),"1286.25","321","5","550","0"];
  for (const [index,value] of Object.entries(overrides)) cells[Number(index)]=value;
  return cells.join(",");
}

test("Binance Vision URLs are restricted to the explicit 20-symbol Spot USDT universe", () => {
  assert.equal(BINANCE_RESEARCH_ASSETS.length,20);
  assert.equal(binanceArchiveUrl("BTC","2026-10-24","daily"),"https://data.binance.vision/data/spot/daily/klines/BTCUSDT/1d/BTCUSDT-1d-2026-10-24.zip");
  assert.equal(binanceArchiveUrl("BTC","2024-02","monthly"),"https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1d/BTCUSDT-1d-2024-02.zip");
  assert.throws(()=>binanceArchiveUrl("NOPE","2026-10-24","daily"));
});

test("Binance research period is based on the previous complete UTC day", () => {
  assert.equal(finalizedUtcDate(new Date("2026-10-25T00:00:01Z")),"2026-10-24");
  assert.equal(shiftUtcYears("2024-02-29",-1),"2023-03-01");
});

test("official SHA-256 sidecar parser validates file identity and lowercase digest", () => {
  assert.equal(parseBinanceChecksum(`${"A".repeat(64)}  BTCUSDT-1d-2026-10-24.zip\n`,"BTCUSDT-1d-2026-10-24.zip"),"a".repeat(64));
  assert.throws(()=>parseBinanceChecksum(`${"a".repeat(64)} wrong.zip`,"BTCUSDT-1d-2026-10-24.zip"));
});

test("actual Binance Spot 12-column CSV values parse with both millisecond and microsecond timestamps", () => {
  const rows=parseBinanceDailyCsv([csvRow("2024-12-31"),csvRow("2025-01-01",true)].join("\n"),"BTC");
  assert.deepEqual(rows.map(({referenceDate,open,high,low,close,baseVolume,quoteVolume,tradeCount})=>({referenceDate,open,high,low,close,baseVolume,quoteVolume,tradeCount})),[
    {referenceDate:"2024-12-31",open:"100",high:"110",low:"90",close:"105",baseVolume:"12.25",quoteVolume:"1286.25",tradeCount:"321"},
    {referenceDate:"2025-01-01",open:"100",high:"110",low:"90",close:"105",baseVolume:"12.25",quoteVolume:"1286.25",tradeCount:"321"},
  ]);
});

test("parser rejects invalid OHLC, timestamps, duplicates, and malformed columns", () => {
  assert.throws(()=>parseBinanceDailyCsv(csvRow("2025-01-01",true,{2:"80"}),"BTC"),/OHLC/);
  assert.throws(()=>parseBinanceDailyCsv([csvRow("2025-01-01"),csvRow("2025-01-01")].join("\n"),"BTC"),/duplicated/);
  assert.throws(()=>parseBinanceDailyCsv("1,2,3","BTC"),/12 columns/);
  assert.throws(()=>parseBinanceDailyCsv(csvRow("2025-01-01",true,{0:"1735689600001000"}),"BTC"),/UTC day boundary/);
});

test("OHLC validation preserves decimal precision beyond JavaScript floating-point", () => {
  assert.throws(()=>parseBinanceDailyCsv(csvRow("2025-01-01",true,{1:"1.0000000000000000002",2:"1.0000000000000000001",3:"1.0000000000000000000",4:"1.0000000000000000001"}),"BTC"),/OHLC/);
  assert.equal(parseBinanceDailyCsv(csvRow("2025-01-01",true,{1:"1.0000000000000000001",2:"1.0000000000000000003",3:"1.0000000000000000000",4:"1.0000000000000000002"}),"BTC")[0].close,"1.0000000000000000002");
});

test("downloaded ZIP is checksum-verifiable and contains exactly the expected CSV", () => {
  const fileName="BTCUSDT-1d-2026-10-24.csv";
  const zip=zipSingleCsv(fileName,csvRow("2026-10-24",true));
  assert.equal(unzipSingleCsv(zip).name,fileName);
  assert.equal(parseBinanceDailyCsv(unzipSingleCsv(zip).csv,"BTC").length,1);
  assert.equal(sha256Hex(zip).length,64);
});

test("research database target only accepts the dedicated loopback database and role", () => {
  const base={ BINANCE_RESEARCH_DATABASE_URL:"postgresql://woori_crypto_research_app@127.0.0.1:55432/woori_crypto_research" };
  assert.equal(researchDatabaseUrl(base),base.BINANCE_RESEARCH_DATABASE_URL);
  assert.throws(()=>researchDatabaseUrl({ ...base,BINANCE_RESEARCH_DATABASE_URL:"postgresql://u:p@prod.example/portal" }),/loopback port/);
  assert.throws(()=>researchDatabaseUrl({ ...base,BINANCE_RESEARCH_DATABASE_URL:"postgresql://woori_crypto_research_app@127.0.0.1:5432/woori_crypto_research" }),/port 55432/);
  assert.throws(()=>researchDatabaseUrl({ ...base,DATABASE_URL:base.BINANCE_RESEARCH_DATABASE_URL }),/must not reuse/);
});

test("daily percentage compares adjacent closes without claiming rolling 24-hour change", () => {
  assert.equal(calculateDailyChange("110","100"),10);
  assert.equal(calculateDailyChange("90","100"),-10);
  assert.equal(calculateDailyChange("100","0"),null);
});
