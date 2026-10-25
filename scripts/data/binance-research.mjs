import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const BINANCE_RESEARCH_ASSETS = ["BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "TRX", "AVAX", "LINK", "DOT", "LTC", "BCH", "XLM", "ETC", "ATOM", "UNI", "NEAR", "FIL", "APT"];
export const BINANCE_DATA_ROOT = "https://data.binance.vision/data/spot";

export function utcDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error("A valid date is required.");
  return value.toISOString().slice(0, 10);
}

export function finalizedUtcDate(now = new Date()) {
  return utcDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
}

export function shiftUtcDate(date, days) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`Invalid UTC date: ${date}`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return utcDate(parsed);
}

export function shiftUtcYears(date, years) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`Invalid UTC date: ${date}`);
  parsed.setUTCFullYear(parsed.getUTCFullYear() + years);
  return utcDate(parsed);
}

export function binanceArchiveUrl(symbol, period, kind) {
  if (!BINANCE_RESEARCH_ASSETS.includes(symbol) || !/^\d{4}-\d{2}(-\d{2})?$/.test(period) || !["monthly", "daily"].includes(kind)) throw new Error("Invalid Binance Vision archive coordinates.");
  const interval = kind === "monthly" ? period.slice(0, 7) : period;
  const name = `${symbol}USDT-1d-${interval}.zip`;
  return `${BINANCE_DATA_ROOT}/${kind}/klines/${symbol}USDT/1d/${name}`;
}

export function sha256Hex(buffer) { return createHash("sha256").update(buffer).digest("hex"); }

export function parseBinanceChecksum(text, fileName) {
  const match = text.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
  if (!match || match[2].trim() !== fileName) throw new Error("Binance checksum file format or filename is invalid.");
  return match[1].toLowerCase();
}

export function unzipSingleCsv(zip) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (zip.readUInt32LE(i) === eocdSignature) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory record is missing.");
  const entries = zip.readUInt16LE(eocd + 10);
  const centralOffset = zip.readUInt32LE(eocd + 16);
  if (entries !== 1 || zip.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Expected one CSV file in the Binance archive.");
  const method = zip.readUInt16LE(centralOffset + 10);
  const compressedSize = zip.readUInt32LE(centralOffset + 20);
  const nameLength = zip.readUInt16LE(centralOffset + 28);
  const extraLength = zip.readUInt16LE(centralOffset + 30);
  const commentLength = zip.readUInt16LE(centralOffset + 32);
  const localOffset = zip.readUInt32LE(centralOffset + 42);
  const name = zip.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8");
  if (!name.endsWith(".csv") || name.includes("..") || name.includes("/") || name.includes("\\")) throw new Error("Unexpected ZIP member name.");
  if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("ZIP local file header is invalid.");
  const localNameLength = zip.readUInt16LE(localOffset + 26);
  const localExtraLength = zip.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const compressed = zip.subarray(dataStart, dataStart + compressedSize);
  let csv;
  if (method === 0) csv = compressed;
  else if (method === 8) csv = inflateRawSync(compressed);
  else throw new Error(`Unsupported ZIP compression method: ${method}`);
  void extraLength; void commentLength;
  return { name, csv: csv.toString("utf8") };
}

function decimal(value, label, { allowZero = true } = {}) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error(`Invalid ${label} decimal.`);
  const isZero = !/[1-9]/.test(value);
  if (!allowZero && isZero) throw new Error(`Invalid ${label} range.`);
  return value;
}

function compareDecimals(left,right) {
  const [leftWhole,leftFraction=""] = left.split(".");
  const [rightWhole,rightFraction=""] = right.split(".");
  const leftNormalized=leftWhole.replace(/^0+(?=\d)/,"");
  const rightNormalized=rightWhole.replace(/^0+(?=\d)/,"");
  if(leftNormalized.length!==rightNormalized.length)return leftNormalized.length<rightNormalized.length?-1:1;
  if(leftNormalized!==rightNormalized)return leftNormalized<rightNormalized?-1:1;
  const width=Math.max(leftFraction.length,rightFraction.length);
  const a=leftFraction.padEnd(width,"0");const b=rightFraction.padEnd(width,"0");
  return a===b?0:a<b?-1:1;
}

function timestampDate(value) {
  if (!/^\d+$/.test(value)) throw new Error("Invalid candle timestamp.");
  const raw = BigInt(value);
  const millis = raw >= 100_000_000_000_000n ? Number(raw / 1000n) : Number(raw);
  const date = new Date(millis);
  if (!Number.isFinite(date.getTime())) throw new Error("Candle timestamp is out of range.");
  return date;
}

export function parseBinanceDailyCsv(csv, symbol, { startDate = "1970-01-01", endDate = "9999-12-31" } = {}) {
  if (!BINANCE_RESEARCH_ASSETS.includes(symbol)) throw new Error(`Unsupported research symbol: ${symbol}`);
  const lines = csv.trim().split(/\r?\n/);
  const rows = [];
  let previous = "";
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    const columns = line.split(",");
    if (columns.length !== 12) throw new Error(`Malformed Binance kline row ${index + 1}: expected 12 columns.`);
    const openAt = timestampDate(columns[0]);
    const closeAt = timestampDate(columns[6]);
    const date = utcDate(openAt);
    if (openAt.toISOString().slice(11) !== "00:00:00.000Z") throw new Error(`Kline open timestamp is not at the UTC day boundary: ${date}`);
    const expectedClose = openAt.getTime() + 86_400_000 - 1;
    if (closeAt.getTime() !== expectedClose) throw new Error(`Kline close timestamp is not the UTC day boundary: ${date}`);
    if (date <= previous) throw new Error("Binance daily candles are duplicated or not ordered.");
    previous = date;
    if (date < startDate || date > endDate) continue;
    const open = decimal(columns[1], "open", { allowZero: false });
    const high = decimal(columns[2], "high", { allowZero: false });
    const low = decimal(columns[3], "low", { allowZero: false });
    const close = decimal(columns[4], "close", { allowZero: false });
    const volume = decimal(columns[5], "base volume");
    const quoteVolume = decimal(columns[7], "quote volume");
    if (compareDecimals(high,low)<0 || compareDecimals(open,low)<0 || compareDecimals(open,high)>0 || compareDecimals(close,low)<0 || compareDecimals(close,high)>0) throw new Error(`OHLC values are inconsistent for ${date}.`);
    if (!/^\d+$/.test(columns[8])) throw new Error(`Invalid trade count for ${date}.`);
    decimal(columns[9], "taker buy base volume");
    decimal(columns[10], "taker buy quote volume");
    rows.push({ symbol, market: `${symbol}USDT`, quoteCurrency: "USDT", referenceDate: date, open, high, low, close, baseVolume: volume, quoteVolume, tradeCount: columns[8] });
  }
  return rows;
}

export function calculateDailyChange(current, previous) {
  const now = Number(current); const before = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  return ((now - before) / before) * 100;
}
