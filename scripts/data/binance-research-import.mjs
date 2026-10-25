import "../db/load-env.mjs";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { BINANCE_RESEARCH_ASSETS, binanceArchiveUrl, finalizedUtcDate, parseBinanceChecksum, parseBinanceDailyCsv, sha256Hex, shiftUtcDate, shiftUtcYears, unzipSingleCsv } from "./binance-research.mjs";

const { Pool } = pg;
import { researchDatabaseUrl } from "./binance-research-db.mjs";
const DATA_ROOT = process.env.BINANCE_RESEARCH_DATA_DIR ?? path.join(process.env.LOCALAPPDATA ?? process.env.USERPROFILE ?? process.cwd(), "WooriCryptoResearch", "archive");

function monthShift(date, amount) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return shifted.toISOString().slice(0, 7);
}
function dateList(startDate, endDate) {
  const dates = [];
  for (let date = startDate; date <= endDate; date = shiftUtcDate(date, 1)) dates.push(date);
  return dates;
}
function archiveFileName(url) { return path.basename(new URL(url).pathname); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function retryDelay(response, attempt) {
  const header=response.headers.get("retry-after");
  if (header) {
    const seconds=Number(header);
    const retryAt=Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now();
    if (Number.isFinite(retryAt)&&retryAt>0) return Math.min(60_000,retryAt);
  }
  return attempt*1000;
}

async function download(url, destination) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let waitMs=attempt*1000;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "woori-home-personal-research/1.0 (Binance Vision archive downloader)" } });
      if (response.status === 404) return { missing: true };
      if (!response.ok || !response.body) { waitMs=retryDelay(response,attempt); throw new Error(`HTTP ${response.status}`); }
      const temporary = `${destination}.part`;
      await pipeline(response.body, createWriteStream(temporary));
      const { size } = await stat(temporary);
      if (!size || size > 100_000_000) throw new Error("Archive size is empty or exceeds the 100 MB safety limit.");
      await rename(temporary, destination);
      return { bytes: size };
    } catch (error) {
      await rm(`${destination}.part`, { force: true });
      if (attempt === 4) throw error;
      await delay(waitMs);
    }
  }
  throw new Error("Download failed after retries.");
}

async function fetchAndVerifyArchive(url) {
  const name = archiveFileName(url);
  const destination = path.join(DATA_ROOT, name);
  await mkdir(DATA_ROOT, { recursive: true });
  let downloaded = false;
  if (!(await stat(destination).catch(() => null))) {
    const result = await download(url, destination);
    if (result.missing) return { missing: true, name };
    downloaded = true;
  }
  const zip = await readFile(destination);
  const checksumUrl = `${url}.CHECKSUM`;
  let checksumText;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const response=await fetch(checksumUrl,{signal:AbortSignal.timeout(15_000),headers:{"User-Agent":"woori-home-personal-research/1.0"}});
      if(response.status===404){if(downloaded)await rm(destination,{force:true});return {missing:true,name,reason:"checksum-unavailable"};}
      if(!response.ok){const waitMs=retryDelay(response,attempt);if(attempt===4)throw new Error(`Checksum request returned HTTP ${response.status}.`);await delay(waitMs);continue;}
      checksumText=await response.text();break;
    }catch(error){if(attempt===4)throw error;await delay(attempt*1000);}
  }
  if(!checksumText)throw new Error("Official checksum file is empty.");
  const expected = parseBinanceChecksum(checksumText, name);
  const actual = sha256Hex(zip);
  if (expected !== actual) {
    await rm(destination, { force: true });
    throw new Error(`SHA-256 mismatch for ${name}.`);
  }
  const { name: csvName, csv } = unzipSingleCsv(zip);
  if (csvName !== name.replace(/\.zip$/, ".csv")) throw new Error(`Unexpected CSV filename in ${name}.`);
  return { archive: zip, csv, name, sha256: actual, bytes: zip.length, url, downloaded };
}

async function ensureSchema(pool) {
  await pool.query("REVOKE ALL ON SCHEMA public FROM PUBLIC");
  const schema = await readFile(new URL("./binance-research-schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  const boundedNumeric = await pool.query("SELECT numeric_precision FROM information_schema.columns WHERE table_schema='public' AND table_name='research_crypto_daily' AND column_name IN ('open','high','low','close','base_volume','quote_volume') AND numeric_precision IS NOT NULL");
  if(boundedNumeric.rowCount) await pool.query(`ALTER TABLE research_crypto_daily
      ALTER COLUMN open TYPE numeric USING open::numeric,
      ALTER COLUMN high TYPE numeric USING high::numeric,
      ALTER COLUMN low TYPE numeric USING low::numeric,
      ALTER COLUMN close TYPE numeric USING close::numeric,
      ALTER COLUMN base_volume TYPE numeric USING base_volume::numeric,
      ALTER COLUMN quote_volume TYPE numeric USING quote_volume::numeric`);
}

async function ingestArchive(pool, runId, archive, symbol, startDate, endDate, counters) {
  if (archive.missing) return;
  counters.downloadedFiles += archive.downloaded ? 1 : 0;
  counters.verifiedFiles++;
  const rows = parseBinanceDailyCsv(archive.csv, symbol, { startDate, endDate });
  await pool.query("BEGIN");
  try {
    const fileResult = await pool.query(`INSERT INTO research_source_files (archive_path,sha256,archive_bytes,candle_rows,verified_at)
      VALUES ($1,$2,$3,$4,now()) ON CONFLICT (archive_path) DO UPDATE SET sha256=EXCLUDED.sha256,archive_bytes=EXCLUDED.archive_bytes,candle_rows=EXCLUDED.candle_rows,verified_at=EXCLUDED.verified_at,ingested_at=now() RETURNING id`, [archive.url, archive.sha256, archive.bytes, rows.length]);
    const fileId = fileResult.rows[0].id;
    let changedRows = 0;
    for (let offset = 0; offset < rows.length; offset += 500) {
      const batch = rows.slice(offset, offset + 500);
      const values = [];
      const tuples = batch.map((row, index) => {
        const base = index * 12;
        values.push(row.symbol,row.market,row.quoteCurrency,row.referenceDate,row.open,row.high,row.low,row.close,row.baseVolume,row.quoteVolume,row.tradeCount,fileId);
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12})`;
      });
      const result = await pool.query(`INSERT INTO research_crypto_daily (symbol,market,quote_currency,reference_date,open,high,low,close,base_volume,quote_volume,trade_count,source_file_id) VALUES ${tuples.join(",")}
        ON CONFLICT (exchange,market,reference_date) DO UPDATE SET open=EXCLUDED.open,high=EXCLUDED.high,low=EXCLUDED.low,close=EXCLUDED.close,base_volume=EXCLUDED.base_volume,quote_volume=EXCLUDED.quote_volume,trade_count=EXCLUDED.trade_count,source_file_id=EXCLUDED.source_file_id,collected_at=now()
        WHERE (research_crypto_daily.open,research_crypto_daily.high,research_crypto_daily.low,research_crypto_daily.close,research_crypto_daily.base_volume,research_crypto_daily.quote_volume,research_crypto_daily.trade_count) IS DISTINCT FROM (EXCLUDED.open,EXCLUDED.high,EXCLUDED.low,EXCLUDED.close,EXCLUDED.base_volume,EXCLUDED.quote_volume,EXCLUDED.trade_count) RETURNING 1`, values);
      changedRows += result.rowCount;
    }
    await pool.query("UPDATE research_ingest_runs SET upserted_rows=upserted_rows+$2 WHERE id=$1", [runId, changedRows]);
    await pool.query("COMMIT");
    counters.rows += changedRows;
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function archiveCoordinates(mode, symbol, endDate, startDate) {
  if (mode === "daily") return dateList(startDate, endDate).map((date) => ({ url: binanceArchiveUrl(symbol, date, "daily"), startDate: date, endDate: date }));
  const [year, month] = startDate.split("-").map(Number);
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const firstMonth = periodStart.slice(0, 7);
  const lastMonth = endDate.slice(0, 7);
  const months = [];
  for (let monthId = firstMonth; monthId <= lastMonth; monthId = monthShift(`${monthId}-01`, 1)) months.push(monthId);
  const coordinates = [];
  for (const m of months.filter((item) => item !== lastMonth)) coordinates.push({ url: binanceArchiveUrl(symbol, m, "monthly"), startDate, endDate });
  const dates = dateList(`${lastMonth}-01`, endDate);
  for (const date of dates) coordinates.push({ url: binanceArchiveUrl(symbol, date, "daily"), startDate, endDate });
  return coordinates;
}

async function run(mode) {
  if (!new Set(["daily", "backfill", "status"]).has(mode)) throw new Error("Usage: pnpm research:crypto:<daily|backfill|status>");
  const pool = new Pool({ connectionString: researchDatabaseUrl(), max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, allowExitOnIdle: true, options: "-c statement_timeout=60000 -c application_name=woori_crypto_research" });
  try {
    await ensureSchema(pool);
    if (mode === "status") {
      const result = await pool.query(`SELECT symbol,count(*)::int AS rows,min(reference_date)::text AS start_date,max(reference_date)::text AS end_date FROM research_crypto_daily GROUP BY symbol ORDER BY symbol`);
      console.table(result.rows);
      const run = await pool.query("SELECT id,mode,started_at,finished_at,requested_files,downloaded_files,verified_files,failed_files,upserted_rows FROM research_ingest_runs ORDER BY id DESC LIMIT 5");
      console.table(run.rows);
      return;
    }
    const endDate = mode === "daily" ? finalizedUtcDate() : finalizedUtcDate();
    const startDate = mode === "daily" ? shiftUtcDate(endDate, -6) : shiftUtcYears(endDate, -3);
    const counters = { requestedFiles: 0, downloadedFiles: 0, verifiedFiles: 0, failedFiles: 0, rows: 0 };
    const { rows: [runRow] } = await pool.query("INSERT INTO research_ingest_runs(mode,requested_files) VALUES ($1,0) RETURNING id", [mode]);
    const runId = runRow.id;
    const failures = [];
    const missingFiles = [];
    for (const symbol of BINANCE_RESEARCH_ASSETS) {
      const coordinates = await archiveCoordinates(mode, symbol, endDate, startDate);
      for (const coordinate of coordinates) {
        counters.requestedFiles++;
        try {
          const archive = await fetchAndVerifyArchive(coordinate.url);
          if (archive.missing) missingFiles.push({ symbol, url: coordinate.url, reason: archive.reason ?? "not-published" });
          if (archive.reason === "checksum-unavailable") throw new Error("Archive exists without its official checksum file.");
          await ingestArchive(pool, runId, archive, symbol, coordinate.startDate, coordinate.endDate, counters);
        } catch (error) {
          counters.failedFiles++;
          failures.push({ symbol, url: coordinate.url, error: error instanceof Error ? error.message : "unknown error" });
        } finally { await delay(250); }
      }
      console.log(`${symbol}: processed ${coordinates.length} official archive(s).`);
    }
    await pool.query(`UPDATE research_ingest_runs SET finished_at=now(),requested_files=$2,downloaded_files=$3,verified_files=$4,missing_files=$5,failed_files=$6,upserted_rows=$7,missing_details=$8::jsonb,failure_details=$9::jsonb WHERE id=$1`, [runId,counters.requestedFiles,counters.downloadedFiles,counters.verifiedFiles,missingFiles.length,counters.failedFiles,counters.rows,JSON.stringify(missingFiles.slice(0,1000)),JSON.stringify(failures.slice(0,500))]);
    console.log(JSON.stringify({ mode, endDate, startDate, requestedFiles:counters.requestedFiles, downloadedFiles:counters.downloadedFiles, verifiedFiles:counters.verifiedFiles, missingFiles:missingFiles.length, failedFiles:counters.failedFiles, changedRows:counters.rows, failures:failures.length, archiveDirectory:DATA_ROOT }, null, 2));
    if (failures.length) process.exitCode = 2;
  } finally { await pool.end(); }
}

run(process.argv[2]).catch((error) => { console.error(error instanceof Error ? error.message : "Research ingest failed."); process.exitCode = 1; });
